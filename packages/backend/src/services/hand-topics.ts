/**
 * 핸드 기술 서브토픽 분류 체계 (순수 함수 모듈)
 *
 * - 분류 체계 상수/버전, 분류 프롬프트 빌더, 입력 변환, 응답 파서, 저장값 검증을 둔다.
 * - DB/네트워크 접근 없음. 서비스(hand-topic-classification.service.ts)와 집계(tech-trend-timeline.service.ts)가 공유한다.
 *
 * 법적 안전: 분류 입력은 제목·설명·초록 발췌(500자)·AI 요약·태그뿐이다. articles.content와 자막 전문은 읽지 않는다.
 */

import { decodeHtmlEntities } from './event-video-brief.service.js';
import { toFocusJudgeItem } from './tech-trend-analysis.service.js';
import { stripCiteTags, type ArticleRow } from './tech-trend-report.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// 분류 체계 (버전 1)
// ─────────────────────────────────────────────────────────────────────────────

/** 체계를 바꿀 때 올린다. 올리면 대상 선정 규칙상 자동으로 재분류 대상이 된다. */
export const HAND_TOPIC_VERSION = 1;

export const OFF_TOPIC_ID = 'off_topic';
export const OTHER_TOPIC_ID = 'other';

export interface HandTopicDef {
  id: string;
  label: string;
  shortLabel: string;
  definition: string;
  hint: string;
}

/** 분류 체계 순서 = 동률 정렬과 화면 기본 순서의 기준 */
export const HAND_TOPICS: readonly HandTopicDef[] = [
  {
    id: 'dexterous_hw',
    label: '다지 핸드 하드웨어·자유도',
    shortLabel: '다지 핸드 HW',
    definition: '다지(손가락 여러 개) 핸드의 기구 설계, 관절 배치, 자유도, 손바닥·엄지 구조, 신형 핸드 공개',
    hint: 'multi-finger, anthropomorphic, DoF, thumb, palm, underactuated hand design, 신형 핸드',
  },
  {
    id: 'tactile_force',
    label: '촉각·힘 센싱',
    shortLabel: '촉각·힘 센싱',
    definition: '촉각 센서, 전자피부, 비전 기반 촉각, 힘·토크·접촉·미끄러짐 감지',
    hint: 'tactile, e-skin, GelSight, slip, contact, force/torque, 촉각센서',
  },
  {
    id: 'actuation_transmission',
    label: '텐던·액추에이션·감속',
    shortLabel: '텐던·구동',
    definition:
      '손가락 구동 방식과 전달 기구: 텐던, 링크, 소형 모터, 감속기, 유압·공압·소프트 액추에이터, 인공근육, 백드라이버빌리티',
    hint: 'tendon-driven, linkage, micro motor, reducer, pneumatic, artificial muscle',
  },
  {
    id: 'inhand_learning',
    label: '인핸드 조작 학습(RL/모방)',
    shortLabel: '인핸드 조작 학습',
    definition: '다지 핸드의 인핸드 재배치와 정교 조작을 위한 강화학습·모방학습·정책 학습',
    hint: 'in-hand reorientation, RL, imitation, diffusion policy, dexterous policy',
  },
  {
    id: 'grasp_planning',
    label: '파지 계획·비전 기반 파지',
    shortLabel: '파지 계획',
    definition: '파지 자세 생성·검출, 포인트클라우드·비전 기반 파지, 어포던스, 언어 조건 파지',
    hint: 'grasp synthesis/detection, 6-DoF grasp, affordance, bin picking',
  },
  {
    id: 'teleop_data',
    label: '텔레오퍼레이션·데이터 수집',
    shortLabel: '텔레옵·데이터',
    definition: '글러브·VR·외골격 텔레옵, 모션 리타게팅, 인간 시연 영상에서 로봇 핸드로 전이, 시연 데이터셋',
    hint: 'teleoperation, glove, retargeting, demonstration data, hand pose estimation',
  },
  {
    id: 'gripper_industrial',
    label: '그리퍼·산업용 엔드이펙터',
    shortLabel: '그리퍼·산업용',
    definition: '병렬·진공·소프트·적응형 그리퍼, 산업·물류용 엔드이펙터, 툴 체인저',
    hint: 'parallel gripper, suction, soft gripper, end-effector, logistics picking',
  },
  {
    id: 'sim2real',
    label: '시뮬레이션·Sim2Real',
    shortLabel: '시뮬·Sim2Real',
    definition: '핸드·파지를 위한 시뮬레이터, 도메인 랜덤화, 합성 데이터, sim 벤치마크, 현실 전이',
    hint: 'simulator, domain randomization, sim-to-real, synthetic data',
  },
  {
    id: 'durability_cost',
    label: '내구성·원가·양산',
    shortLabel: '내구·원가·양산',
    definition: '수명·신뢰성 시험, 원가 절감, BOM, 양산, 방수, 유지보수, 공급망',
    hint: 'durability, lifetime, cost, BOM, mass production, reliability',
  },
  {
    id: 'humanoid_integration',
    label: '휴머노이드 통합 데모',
    shortLabel: '휴머노이드 통합',
    definition: '휴머노이드 전신 로봇의 핸드를 활용한 작업·제품 시연(핸드가 시스템의 일부로 등장)',
    hint: 'humanoid demo, whole-body, loco-manipulation, 제품 시연',
  },
  {
    id: OTHER_TOPIC_ID,
    label: '기타 핸드 관련',
    shortLabel: '기타',
    definition: '핸드·그리퍼·엔드이펙터는 실제 주제이나 위 10개에 해당 없음',
    hint: '-',
  },
  {
    id: OFF_TOPIC_ID,
    label: '핸드 무관',
    shortLabel: '핸드 무관',
    definition:
      '핸드·그리퍼·손가락이 실질 주제가 아님: "on the other hand", 핸드·그리퍼·촉각을 쓰지 않는 일반 팔 조작·정책, 보행, 비로봇. 시계열에서 제외하고 건수만 별도 보고.',
    hint: '-',
  },
];

/** 시계열에 나오는 토픽 id (10개 + other, 체계 순서) */
export const HAND_TOPIC_IDS_WITH_OTHER: readonly string[] = HAND_TOPICS.filter((t) => t.id !== OFF_TOPIC_ID).map(
  (t) => t.id
);
/** 핵심 10개 서브토픽 id */
export const HAND_CORE_TOPIC_IDS: readonly string[] = HAND_TOPIC_IDS_WITH_OTHER.filter((id) => id !== OTHER_TOPIC_ID);
/** 저장 가능한 모든 id (other + off_topic 포함) */
export const HAND_ALL_TOPIC_IDS: readonly string[] = HAND_TOPICS.map((t) => t.id);

const TOPIC_BY_ID = new Map(HAND_TOPICS.map((t) => [t.id, t] as const));
const VALID_ID_SET = new Set(HAND_ALL_TOPIC_IDS);

export function getHandTopicDef(id: string): HandTopicDef | undefined {
  return TOPIC_BY_ID.get(id);
}

export const MAX_TOPICS_PER_ITEM = 3;
export const ABSTRACT_MAX = 500;
export const TITLE_MAX = 300;

// ─────────────────────────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────────────────────────

export type InputLevel = 'rich' | 'basic';

export interface HandTopicsValue {
  topics: string[];
  primary: string;
  classifiedAt: string;
  version: number;
  inputLevel?: InputLevel;
  model?: string;
}

export interface PaperTopicInput {
  n: number;
  kind: 'paper';
  title: string;
  abstract: string;
}

export interface VideoTopicInput {
  n: number;
  kind: 'video';
  title: string;
  description: string;
  techTags: string[];
  summaryKo: string;
  task: string;
  hardware: string;
  manipulation: string;
}

export type HandTopicInputItem = PaperTopicInput | VideoTopicInput;

export interface HandTopicParsed {
  n: number;
  primary: string;
  topics: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 입력 변환 (content/자막 전문은 읽지 않는다)
// ─────────────────────────────────────────────────────────────────────────────

export function isVideoRow(row: ArticleRow): boolean {
  return row.productType === 'video';
}

function hasGemini(row: ArticleRow): boolean {
  const g = row.extractedMetadata?.geminiAnalysis;
  return typeof g === 'object' && g !== null;
}

export function toPaperTopicInput(row: ArticleRow, n: number): PaperTopicInput {
  const abstract = (typeof row.summary === 'string' ? row.summary : '').trim().slice(0, ABSTRACT_MAX);
  return {
    n,
    kind: 'paper',
    title: decodeHtmlEntities(row.title ?? '').slice(0, TITLE_MAX),
    abstract,
  };
}

export function toVideoTopicInput(row: ArticleRow, n: number): VideoTopicInput {
  // 필드별 캡(description 300, summaryKo 400, task/hardware/manipulation 200)은 toFocusJudgeItem이 적용
  const base = toFocusJudgeItem(row);
  const rawTags: unknown = row.extractedMetadata?.aiTags?.techTags;
  const techTags = Array.isArray(rawTags)
    ? (rawTags as unknown[])
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .slice(0, 4)
        .map((t) => t.slice(0, 40))
    : [];
  return {
    n,
    kind: 'video',
    title: base.title.slice(0, TITLE_MAX),
    description: base.description,
    techTags,
    summaryKo: base.summaryKo,
    task: base.task,
    hardware: base.hardware,
    manipulation: base.manipulation,
  };
}

/** 행 → 분류 입력 + inputLevel (영상: Gemini 분석 유무, 논문: 초록 유무) */
export function toTopicInput(row: ArticleRow, n: number): { input: HandTopicInputItem; inputLevel: InputLevel } {
  if (isVideoRow(row)) {
    return { input: toVideoTopicInput(row, n), inputLevel: hasGemini(row) ? 'rich' : 'basic' };
  }
  const input = toPaperTopicInput(row, n);
  return { input, inputLevel: input.abstract.length > 0 ? 'rich' : 'basic' };
}

// ─────────────────────────────────────────────────────────────────────────────
// 프롬프트
// ─────────────────────────────────────────────────────────────────────────────

export function buildHandTopicPrompt(items: HandTopicInputItem[]): string {
  const taxonomy = HAND_TOPICS.map(
    (t) => `- ${t.id} (${t.label}): ${t.definition}${t.hint !== '-' ? ` / 판정 힌트: ${t.hint}` : ''}`
  ).join('\n');

  return `다음은 로봇 핸드 기술 리포트에 수집된 논문(arXiv)과 영상의 메타데이터다. 각 항목을 아래 기술 서브토픽으로 분류하라.

서브토픽 (id만 사용):
${taxonomy}

규칙:
- 주어진 텍스트에 명시된 내용만 근거로 삼는다. 추측·외부 지식 금지.
- topics는 1~3개를 id로만 고르고, primary는 그중 핵심 기여(영상은 주 시연 대상) 하나다.
- 핸드·그리퍼가 실제 주제가 아니면 off_topic을 단독으로 쓴다. 핸드 관련이지만 맞는 토픽이 없으면 other를 쓴다.
- 애매하면 off_topic이 아니라 other를 선택한다(오제외 방지).
- 핸드·그리퍼·촉각을 방법의 일부로 쓰지 않는 일반 팔 조작·범용 정책(VLA 등)은 off_topic이다.
- 촉각(tactile) 센싱을 다루는 항목은 일반 팔 조작·범용 정책 논문이라도 핸드 범위에 포함하며 tactile_force로 분류한다(off_topic 금지).
- 마크다운과 인용 태그(<cite>) 사용 금지.

[항목 ${items.length}건]
${JSON.stringify(items)}

JSON으로만 응답하라. 다른 텍스트 없이:
{"results":[{"n":1,"primary":"토픽 id","topics":["토픽 id"]}]}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 파서
// ─────────────────────────────────────────────────────────────────────────────

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normId(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const id = v.trim().toLowerCase();
  return VALID_ID_SET.has(id) ? id : null;
}

function normN(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isInteger(n) ? n : null;
}

/**
 * Haiku 분류 응답 파싱.
 * - 순수 JSON / 코드펜스 / 앞뒤 설명문이 섞인 응답에서 {...} 또는 [...]를 복원한다.
 * - 입력에 없는 n, 중복 n(첫 건 유지), 알 수 없는 토픽 id는 버린다.
 * - 유효 토픽이 하나도 없는 항목은 버린다(미분류로 남음). 전체가 깨지면 빈 배열.
 */
export function parseHandTopicBatch(text: string, validN: ReadonlySet<number>): HandTopicParsed[] {
  const cleaned = stripCiteTags(text);
  let parsed: unknown = tryParseJson(cleaned.trim());
  if (!parsed || typeof parsed !== 'object') {
    parsed = null;
    // 먼저 나오는 여는 괄호 쪽부터 시도 (최상위 배열 안의 객체를 객체로 오인하지 않도록)
    const objFirst = cleaned.indexOf('{') !== -1 && (cleaned.indexOf('[') === -1 || cleaned.indexOf('{') < cleaned.indexOf('['));
    const patterns = objFirst ? [/\{[\s\S]*\}/, /\[[\s\S]*\]/] : [/\[[\s\S]*\]/, /\{[\s\S]*\}/];
    for (const re of patterns) {
      const m = cleaned.match(re);
      const v = m ? tryParseJson(m[0]) : null;
      if (v && typeof v === 'object') {
        parsed = v;
        break;
      }
    }
  }
  if (!parsed || typeof parsed !== 'object') return [];

  const list: unknown = Array.isArray(parsed) ? parsed : (parsed as Record<string, unknown>).results;
  if (!Array.isArray(list)) return [];

  const seen = new Set<number>();
  const out: HandTopicParsed[] = [];
  for (const item of list as unknown[]) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const n = normN(r.n);
    if (n === null || !validN.has(n) || seen.has(n)) continue;

    let topics: string[] = [];
    for (const t of Array.isArray(r.topics) ? (r.topics as unknown[]) : []) {
      const id = normId(t);
      if (id && !topics.includes(id)) topics.push(id);
    }
    topics = topics.slice(0, MAX_TOPICS_PER_ITEM);

    const primaryId = normId(r.primary);
    let primary: string;
    if (primaryId) {
      if (!topics.includes(primaryId)) topics = [primaryId, ...topics].slice(0, MAX_TOPICS_PER_ITEM);
      primary = primaryId;
    } else if (topics.length > 0) {
      primary = topics[0] as string;
    } else {
      continue; // 유효 토픽 없음 → 미분류로 둔다
    }

    if (primary === OFF_TOPIC_ID || topics.includes(OFF_TOPIC_ID)) {
      topics = [OFF_TOPIC_ID];
      primary = OFF_TOPIC_ID;
    }

    seen.add(n);
    out.push({ n, primary, topics });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 저장값 읽기/검증
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 저장된 handTopics를 검증해 반환한다. 구조가 비정상이거나 버전이 expectedVersion과 다르면 null(미분류/구버전 취급).
 */
export function getHandTopics(
  row: Pick<ArticleRow, 'extractedMetadata'>,
  expectedVersion: number = HAND_TOPIC_VERSION
): HandTopicsValue | null {
  const v: unknown = row.extractedMetadata?.handTopics;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (o.version !== expectedVersion) return null;
  if (!Array.isArray(o.topics) || o.topics.length < 1 || o.topics.length > MAX_TOPICS_PER_ITEM) return null;
  const topics = o.topics as unknown[];
  if (!topics.every((t): t is string => typeof t === 'string' && VALID_ID_SET.has(t))) return null;
  if (new Set(topics).size !== topics.length) return null;
  if (typeof o.primary !== 'string' || !topics.includes(o.primary)) return null;
  if (topics.includes(OFF_TOPIC_ID) && topics.length !== 1) return null;
  if (typeof o.classifiedAt !== 'string') return null;
  return {
    topics: topics as string[],
    primary: o.primary,
    classifiedAt: o.classifiedAt,
    version: o.version as number,
    inputLevel: o.inputLevel === 'rich' || o.inputLevel === 'basic' ? o.inputLevel : undefined,
    model: typeof o.model === 'string' ? o.model : undefined,
  };
}

/** 분류 시도 횟수 (없거나 비정상이면 0) */
export function getHandTopicsAttempts(row: Pick<ArticleRow, 'extractedMetadata'>): number {
  const n = Number(row.extractedMetadata?.handTopicsAttempts ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
