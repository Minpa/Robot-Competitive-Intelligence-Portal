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
 */

import Anthropic from '@anthropic-ai/sdk';
import { sql, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  humanoidRobots,
  bodySpecs,
  handSpecs,
  computingSpecs,
  powerSpecs,
  articles,
  articleRobotTags,
} from '../db/schema.js';

const MODEL = process.env.SPEC_ENRICH_MODEL || 'claude-haiku-4-5-20251001';

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

class SpecEnrichmentService {
  private client: Anthropic | null = null;
  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  /** 스펙이 비어 있는(=body_specs 없는) 로봇을 근거 텍스트로 보강 */
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

    for (const robot of targets) {
      result.robotsScanned++;

      // 근거 텍스트: 이 로봇에 연결된 기사·영상 + 로봇명 언급 기사
      const evidence = await this.collectEvidence(robot.id, robot.name);
      if (!evidence.trim()) continue;

      const specs = await this.extract(robot.name, evidence);
      if (!specs) continue;

      const filled = await this.applySpecs(robot.id, specs);
      if (filled.length > 0) {
        result.robotsEnriched++;
        result.fieldsFilled += filled.length;
        result.details.push({ robot: robot.name, fields: filled });
      }
    }

    console.log(
      `[SpecEnrich] scanned ${result.robotsScanned}, enriched ${result.robotsEnriched}, fields +${result.fieldsFilled}`
    );
    return result;
  }

  private async collectEvidence(robotId: string, robotName: string): Promise<string> {
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

    const chunks: string[] = [];
    for (const a of linked) {
      const desc = (a.meta as any)?.description;
      chunks.push([a.title, a.summary, typeof desc === 'string' ? desc : ''].filter(Boolean).join(' — '));
    }
    for (const a of mentioned) {
      chunks.push([a.title, a.summary].filter(Boolean).join(' — '));
    }
    // 중복 제거 + 길이 제한
    return [...new Set(chunks)].join('\n').slice(0, 6000);
  }

  private async extract(robotName: string, evidence: string): Promise<ExtractedSpecs | null> {
    try {
      const response = await this.client!.messages.create({
        model: MODEL,
        max_tokens: 700,
        messages: [
          {
            role: 'user',
            content: `아래는 휴머노이드 로봇 "${robotName}"에 관한 기사·영상 텍스트다. 여기서 **명시적으로 언급된** 스펙 수치만 추출하라. 텍스트에 없는 값은 절대 추측하지 말고 필드를 생략하라 (환각 금지).

추출 대상 (있는 것만):
- heightCm(키 cm), weightKg(무게 kg), payloadKg(가반하중 kg), dofCount(총 자유도), maxSpeedMps(최고 보행속도 m/s), operationTimeHours(연속 가동 h)
- handType(gripper|multi_finger 등), fingerCount(손가락 수), handDof(손 자유도)
- mainSoc(메인 칩 이름), topsMax(연산 TOPS)
- batteryType(배터리 종류), capacityWh(용량 Wh), chargingMethod(fixed|swappable|both)

텍스트:
${evidence}

JSON 객체 하나만 응답하라. 확인된 필드만 포함. 없으면 {}:
{"payloadKg":20,"dofCount":28,...}`,
          },
        ],
      });
      const raw = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return null;
      const parsed = JSON.parse(m[0]) as ExtractedSpecs;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (err) {
      console.error(`[SpecEnrich] extract failed for ${robotName}:`, (err as Error).message);
      return null;
    }
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
