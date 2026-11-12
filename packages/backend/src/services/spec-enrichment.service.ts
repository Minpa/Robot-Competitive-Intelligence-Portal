/**
 * SpecEnrichmentService — 로봇 상세 스펙 자동 보강
 *
 * 상세 스펙(body/hand/computing/power)이 비어 있는 로봇을 찾아,
 * 연결된 기사·영상 메타데이터(제목·요약·설명 텍스트)에서 AI로 스펙 수치를
 * 추출해 서브테이블 초안을 채운다.
 *
 * 안전 원칙:
 *  - 이미 값이 있는 필드는 덮어쓰지 않는다 (수동 입력·검증 데이터 보존).
 *  - 근거 텍스트에서 명시적으로 확인된 수치만 채운다 (환각 방지 프롬프트).
 *  - 채운 필드의 출처를 스펙 메타(enrichmentSource)에 남긴다.
 *  - ANTHROPIC_API_KEY 없으면 no-op.
 *
 * 프롬프트 인젝션 방어(PM 결정 Q5): 추출 결과는 스펙 테이블에 바로 쓰지 않고 ci_staging(spec_enrichment, pending)에 적재한다.
 * 관리자가 승인(ci-update 승인 API)하면 applyStagedSpecs 가 기존 규칙(빈 레코드만 생성, 기존 값 미변경)으로 반영한다.
 * 수치는 필드별 물리 범위를 벗어나면 폐기하고, 문자열은 길이·URL·유출 검증을 거친다.
 */

import Anthropic from '@anthropic-ai/sdk';
import { sql, eq, isNull, and, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  humanoidRobots,
  bodySpecs,
  handSpecs,
  computingSpecs,
  powerSpecs,
  articles,
  articleRobotTags,
  ciStaging,
} from '../db/schema.js';
import { LLM_INPUT_LIMITS, buildUserMessage, fitItemsToBudget, sanitizeExternalText, type SanitizeResult } from './llm-input-guard.js';
import { parseJsonStrict, sanitizeObject, type FieldRule, SPEC_RANGES } from './llm-output-guard.js';
import { composeSystemPrompt, JSON_ONLY_NOTICE, NO_URL_NOTICE } from './llm-guard-prompts.js';
import { createRejectCollector, recordInputGuard, recordOutputReject } from './llm-guard-metrics.js';
import { aiUsageService } from './ai-usage.service.js';

const MODEL = process.env.SPEC_ENRICH_MODEL || 'claude-haiku-4-5-20251001';
const POINT = 'spec_enrichment';
/** ci_staging.update_type 값 (varchar(20)) */
export const SPEC_ENRICHMENT_UPDATE_TYPE = 'spec_enrichment';
/** 근거 데이터 블록 직렬화 길이 상한 (기존 evidence 6000자와 동일) */
const EVIDENCE_BUDGET = 6000;

interface EvidenceItem {
  title: string;
  summary: string;
  description: string;
}

const num = (key: keyof typeof SPEC_RANGES): FieldRule => {
  const r = SPEC_RANGES[key] as { min: number; max: number; integer?: boolean };
  return { type: 'number', min: r.min, max: r.max, integer: r.integer };
};

/** 추출 결과 스키마 — 스키마에 없는 키는 버리고, 수치는 물리 범위 밖이면 폐기한다 */
const SPEC_SHAPE: Readonly<Record<string, FieldRule>> = {
  heightCm: num('heightCm'),
  weightKg: num('weightKg'),
  payloadKg: num('payloadKg'),
  dofCount: num('dofCount'),
  maxSpeedMps: num('maxSpeedMps'),
  operationTimeHours: num('operationTimeHours'),
  handType: { type: 'text', max: 50 },
  fingerCount: num('fingerCount'),
  handDof: num('handDof'),
  mainSoc: { type: 'text', max: 100 },
  topsMax: num('topsMax'),
  batteryType: { type: 'text', max: 100 },
  capacityWh: num('capacityWh'),
  chargingMethod: { type: 'enum', allowed: ['fixed', 'swappable', 'both'] },
};

interface ExtractedSpecs {
  heightCm?: number;
  weightKg?: number;
  payloadKg?: number;
  dofCount?: number;
  maxSpeedMps?: number;
  operationTimeHours?: number;
  handType?: string;
  fingerCount?: number;
  handDof?: number;
  mainSoc?: string;
  topsMax?: number;
  batteryType?: string;
  capacityWh?: number;
  chargingMethod?: string;
}

interface EnrichResult {
  robotsScanned: number;
  robotsEnriched: number;
  fieldsFilled: number;
  details: { robot: string; fields: string[] }[];
}

export class SpecEnrichmentService {
  private client: Anthropic | null = null;
  /** deps.client: 테스트용 선택 주입. 생략하면 현재 동작(환경 설정 기반 생성) */
  constructor(deps: { client?: Anthropic | null } = {}) {
    if (deps.client !== undefined) {
      this.client = deps.client;
    } else if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  /** 스펙이 비어 있는(=body_specs 없는) 로봇을 근거 텍스트로 보강 — 결과는 승인 대기열(ci_staging)에 적재한다 */
  async run(limit = 30): Promise<EnrichResult> {
    const result: EnrichResult = { robotsScanned: 0, robotsEnriched: 0, fieldsFilled: 0, details: [] };
    if (!this.client) return result;

    // body_specs 레코드가 아예 없는 로봇 우선 (상세 미확보)
    const targets = await db
      .select({ id: humanoidRobots.id, name: humanoidRobots.name })
      .from(humanoidRobots)
      .leftJoin(bodySpecs, eq(bodySpecs.robotId, humanoidRobots.id))
      .where(isNull(bodySpecs.robotId))
      .limit(limit);

    // 이미 후보가 대기 중이거나 사람이 반려한 로봇은 다시 호출하지 않는다 (LLM 비용·중복 후보 방지)
    const decided = await db
      .select({ payload: ciStaging.payload })
      .from(ciStaging)
      .where(and(eq(ciStaging.updateType, SPEC_ENRICHMENT_UPDATE_TYPE), ne(ciStaging.status, 'applied')));
    const decidedRobotIds = new Set(decided.map((d) => (d.payload as { robotId?: string } | null)?.robotId).filter(Boolean));

    for (const robot of targets) {
      if (decidedRobotIds.has(robot.id)) continue;
      result.robotsScanned++;

      // 근거 텍스트: 이 로봇에 연결된 기사·영상 + 로봇명 언급 기사
      const evidence = await this.collectEvidence(robot.id, robot.name);
      if (evidence.length === 0) continue;

      const specs = await this.extract(robot.name, evidence);
      if (!specs) continue;

      const fields = this.describeFields(specs);
      if (fields.length === 0) continue;

      await db.insert(ciStaging).values({
        updateType: SPEC_ENRICHMENT_UPDATE_TYPE,
        sourceChannel: 'auto',
        status: 'pending',
        payload: { robotId: robot.id, robotName: robot.name, specs, evidenceCount: evidence.length, detectedAt: new Date().toISOString() },
      });
      result.robotsEnriched++;
      result.fieldsFilled += fields.length;
      result.details.push({ robot: robot.name, fields });
    }

    console.log(
      `[SpecEnrich] scanned ${result.robotsScanned}, staged ${result.robotsEnriched}, fields +${result.fieldsFilled}`
    );
    return result;
  }

  /** AI 키(Anthropic)가 설정되어 있는지 */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * 로봇 1건 보강 (ARGOS_I 분석 요청의 단건 진입점). 기존 run() 은 변경하지 않으며 같은 규칙을 따른다:
   * body_specs 가 없는 로봇만, 이미 대기·반려된 후보가 있으면 다시 호출하지 않고, 결과는 ci_staging(pending)에만 적재한다.
   * 스펙 값은 반환하지 않고 필드 이름만 돌려준다 (값은 관리자 승인 후에만 반영된다).
   */
  async enrichRobot(
    robotId: string,
  ): Promise<{ status: 'staged' | 'not_found' | 'not_configured' | 'has_specs' | 'already_decided' | 'no_evidence' | 'no_specs'; fields: string[] }> {
    if (!this.client) return { status: 'not_configured', fields: [] };
    const [robot] = await db.select({ id: humanoidRobots.id, name: humanoidRobots.name }).from(humanoidRobots).where(eq(humanoidRobots.id, robotId)).limit(1);
    if (!robot) return { status: 'not_found', fields: [] };
    const [hasBody] = await db.select({ robotId: bodySpecs.robotId }).from(bodySpecs).where(eq(bodySpecs.robotId, robotId)).limit(1);
    if (hasBody) return { status: 'has_specs', fields: [] };

    const decided = await db
      .select({ payload: ciStaging.payload })
      .from(ciStaging)
      .where(and(eq(ciStaging.updateType, SPEC_ENRICHMENT_UPDATE_TYPE), ne(ciStaging.status, 'applied')));
    if (decided.some((d) => (d.payload as { robotId?: string } | null)?.robotId === robot.id)) return { status: 'already_decided', fields: [] };

    const evidence = await this.collectEvidence(robot.id, robot.name);
    if (evidence.length === 0) return { status: 'no_evidence', fields: [] };
    const specs = await this.extract(robot.name, evidence);
    if (!specs) return { status: 'no_specs', fields: [] };
    const fields = this.describeFields(specs);
    if (fields.length === 0) return { status: 'no_specs', fields: [] };

    await db.insert(ciStaging).values({
      updateType: SPEC_ENRICHMENT_UPDATE_TYPE,
      sourceChannel: 'auto',
      status: 'pending',
      payload: { robotId: robot.id, robotName: robot.name, specs, evidenceCount: evidence.length, detectedAt: new Date().toISOString() },
    });
    return { status: 'staged', fields };
  }

  private async collectEvidence(robotId: string, robotName: string): Promise<EvidenceItem[]> {
    // 1) 연결된 기사·영상
    const linked = await db
      .select({ title: articles.title, summary: articles.summary, meta: articles.extractedMetadata })
      .from(articleRobotTags)
      .innerJoin(articles, eq(articles.id, articleRobotTags.articleId))
      .where(eq(articleRobotTags.robotId, robotId))
      .limit(20);

    // 2) 로봇명이 제목/요약에 등장하는 기사 (링크 안 됐어도)
    const mentioned = await db
      .select({ title: articles.title, summary: articles.summary })
      .from(articles)
      .where(sql`title ILIKE ${'%' + robotName + '%'} OR summary ILIKE ${'%' + robotName + '%'}`)
      .limit(20);

    const raw: Array<{ title: string; summary: string; description: string }> = [];
    for (const a of linked) {
      const desc = (a.meta as any)?.description;
      raw.push({ title: a.title ?? '', summary: a.summary ?? '', description: typeof desc === 'string' ? desc : '' });
    }
    for (const a of mentioned) {
      raw.push({ title: a.title ?? '', summary: a.summary ?? '', description: '' });
    }
    // 항목별 정제(DB 원본 불변) + 중복 제거 + 직렬화 길이 상한
    const guardResults: SanitizeResult[] = [];
    const seen = new Set<string>();
    const items: EvidenceItem[] = [];
    for (const r of raw) {
      const title = sanitizeExternalText(r.title, { maxChars: LLM_INPUT_LIMITS.title });
      const summary = sanitizeExternalText(r.summary, { maxChars: LLM_INPUT_LIMITS.summary });
      const description = sanitizeExternalText(r.description, { maxChars: LLM_INPUT_LIMITS.description });
      guardResults.push(title, summary, description);
      const key = `${title.text}|${summary.text}|${description.text}`;
      if (seen.has(key) || (!title.text && !summary.text && !description.text)) continue;
      seen.add(key);
      items.push({ title: title.text, summary: summary.text, description: description.text });
    }
    recordInputGuard(POINT, guardResults);
    return fitItemsToBudget(items, EVIDENCE_BUDGET).items;
  }

  private async extract(robotName: string, evidence: EvidenceItem[]): Promise<ExtractedSpecs | null> {
    // 로봇명도 외부 유래 텍스트일 수 있으므로 지시문 영역이 아니라 데이터 블록에 둔다
    const robot = sanitizeExternalText(robotName, { maxChars: LLM_INPUT_LIMITS.name });
    recordInputGuard(POINT, [robot]);
    const system = composeSystemPrompt(
      `휴머노이드 로봇의 기사·영상 텍스트를 받는다. 사용자 메시지의 데이터 블록에 robot(로봇명)과 evidence(기사·영상 텍스트 목록)가 있다. 여기서 **명시적으로 언급된** 해당 로봇의 스펙 수치만 추출하라. 텍스트에 없는 값은 절대 추측하지 말고 필드를 생략하라 (환각 금지).

추출 대상 (있는 것만):
- heightCm(키 cm), weightKg(무게 kg), payloadKg(가반하중 kg), dofCount(총 자유도), maxSpeedMps(최고 보행속도 m/s), operationTimeHours(연속 가동 h)
- handType(gripper|multi_finger 등), fingerCount(손가락 수), handDof(손 자유도)
- mainSoc(메인 칩 이름), topsMax(연산 TOPS)
- batteryType(배터리 종류), capacityWh(용량 Wh), chargingMethod(fixed|swappable|both)

${JSON_ONLY_NOTICE} ${NO_URL_NOTICE}
JSON 객체 하나만 응답하라. 확인된 필드만 포함. 없으면 {}:
{"payloadKg":20,"dofCount":28,...}`
    );
    try {
      const response = await this.client!.messages.create({
        model: MODEL,
        max_tokens: 700,
        system,
        messages: [{ role: 'user', content: buildUserMessage('spec_enrichment', { robot: robot.text, evidence }) }],
      });
      aiUsageService
        .logUsage({ provider: 'claude', model: MODEL, webSearch: false, inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0, query: '[spec-enrichment] extract' })
        .catch(() => {});
      const raw = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const parsed = parseJsonStrict(raw, 'object');
      if (!parsed) {
        recordOutputReject(POINT, 'schema');
        return null;
      }
      const collector = createRejectCollector(POINT);
      const clean = sanitizeObject(parsed, SPEC_SHAPE, { systemText: system, onReject: collector.onReject });
      collector.flush();
      if (clean.unknownKeys > 0) recordOutputReject(POINT, 'schema', clean.unknownKeys);
      return clean.value as ExtractedSpecs;
    } catch (err) {
      console.error(`[SpecEnrich] extract failed for ${robotName}:`, (err as Error).message);
      return null;
    }
  }

  /** 추출된 스펙에서 값이 있는 필드 이름 목록 (보고용) */
  private describeFields(s: ExtractedSpecs): string[] {
    return Object.entries(s)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k]) => k);
  }

  /**
   * 승인된 후보를 스펙 테이블에 반영한다 (ci-update 승인 API 가 spec_enrichment 후보에 대해 호출).
   * 저장된 payload 도 신뢰하지 않고 같은 스키마로 다시 검증한 뒤, 기존 규칙대로 빈 레코드만 생성한다.
   */
  async applyStagedSpecs(payload: unknown): Promise<string[]> {
    const p = (payload && typeof payload === 'object' ? payload : {}) as { robotId?: unknown; specs?: unknown };
    if (typeof p.robotId !== 'string' || !p.robotId) throw new Error('spec_enrichment payload has no robotId');
    const [robot] = await db.select({ id: humanoidRobots.id }).from(humanoidRobots).where(eq(humanoidRobots.id, p.robotId)).limit(1);
    if (!robot) throw new Error('Robot not found for spec_enrichment payload');
    const clean = sanitizeObject(p.specs, SPEC_SHAPE).value as ExtractedSpecs;
    return this.applySpecs(robot.id, clean);
  }

  /** 추출값을 서브테이블에 삽입 (없는 레코드만 생성, 기존 값 미변경) */
  private async applySpecs(robotId: string, s: ExtractedSpecs): Promise<string[]> {
    const filled: string[] = [];
    const num = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? String(v) : undefined);

    // body_specs (레코드 자체가 없을 때만 — run()이 그런 로봇만 대상으로 함)
    const bodyVals: Record<string, unknown> = {};
    if (num(s.heightCm)) { bodyVals.heightCm = num(s.heightCm); filled.push('height'); }
    if (num(s.weightKg)) { bodyVals.weightKg = num(s.weightKg); filled.push('weight'); }
    if (num(s.payloadKg)) { bodyVals.payloadKg = num(s.payloadKg); filled.push('payload'); }
    if (typeof s.dofCount === 'number') { bodyVals.dofCount = s.dofCount; filled.push('dof'); }
    if (num(s.maxSpeedMps)) { bodyVals.maxSpeedMps = num(s.maxSpeedMps); filled.push('maxSpeed'); }
    if (num(s.operationTimeHours)) { bodyVals.operationTimeHours = num(s.operationTimeHours); filled.push('operationTime'); }
    if (Object.keys(bodyVals).length > 0) {
      await db.insert(bodySpecs).values({ robotId, ...bodyVals }).onConflictDoNothing();
    }

    // hand_specs
    const handVals: Record<string, unknown> = {};
    if (s.handType) handVals.handType = String(s.handType).slice(0, 50);
    if (typeof s.fingerCount === 'number') handVals.fingerCount = s.fingerCount;
    if (typeof s.handDof === 'number') handVals.handDof = s.handDof;
    if (Object.keys(handVals).length > 0) {
      await db.insert(handSpecs).values({ robotId, ...handVals }).onConflictDoNothing();
      filled.push('hand');
    }

    // computing_specs
    const compVals: Record<string, unknown> = {};
    if (s.mainSoc) compVals.mainSoc = String(s.mainSoc).slice(0, 255);
    if (num(s.topsMax)) compVals.topsMax = num(s.topsMax);
    if (Object.keys(compVals).length > 0) {
      await db.insert(computingSpecs).values({ robotId, ...compVals }).onConflictDoNothing();
      filled.push('computing');
    }

    // power_specs
    const powerVals: Record<string, unknown> = {};
    if (s.batteryType) powerVals.batteryType = String(s.batteryType).slice(0, 100);
    if (num(s.capacityWh)) powerVals.capacityWh = num(s.capacityWh);
    if (s.chargingMethod) powerVals.chargingMethod = String(s.chargingMethod).slice(0, 100);
    if (num(s.operationTimeHours)) powerVals.operationTimeHours = num(s.operationTimeHours);
    if (Object.keys(powerVals).length > 0) {
      await db.insert(powerSpecs).values({ robotId, ...powerVals }).onConflictDoNothing();
      filled.push('power');
    }

    return filled;
  }
}

export const specEnrichmentService = new SpecEnrichmentService();
