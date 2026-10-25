/**
 * 도메인별 기술 서브토픽 분류 체계 (순수 함수 모듈) — hand / actuator
 *
 * - hand v1 은 hand-topics.ts 의 체계·프롬프트·저장 키(handTopics / handTopicsAttempts)를 그대로 쓴다(하위 호환, 문자 단위 불변).
 * - actuator v1 은 이 파일에서 정의하고 extracted_metadata.domainTopics.actuator / domainTopicsAttempts.actuator 에 저장한다.
 * - 분류 서비스(hand-topic-classification.service.ts)·집계(tech-trend-timeline.service.ts)·해설이 도메인 파라미터로 공유한다.
 *
 * 법적 안전: 분류 입력은 제목·설명·초록 발췌(500자)·AI 요약·태그뿐이다. articles.content와 자막 전문은 읽지 않는다.
 */

import type { ArticleRow } from './tech-trend-report.service.js';
import {
  HAND_TOPICS,
  HAND_TOPIC_VERSION,
  OFF_TOPIC_ID,
  OTHER_TOPIC_ID,
  buildHandTopicPrompt,
  getHandTopics,
  getHandTopicsAttempts,
  normalizeAttempts,
  parseHandTopicBatch,
  parseTopicBatchWith,
  readStoredTopics,
  type HandTopicDef,
  type HandTopicInputItem,
  type HandTopicParsed,
  type HandTopicsValue,
} from './hand-topics.js';

export { OFF_TOPIC_ID, OTHER_TOPIC_ID };

// ─────────────────────────────────────────────────────────────────────────────
// 도메인
// ─────────────────────────────────────────────────────────────────────────────

/** 시계열·서브토픽 분류를 지원하는 도메인 */
export const TIMELINE_DOMAINS = ['hand', 'actuator'] as const;
export type TimelineDomain = (typeof TIMELINE_DOMAINS)[number];

export function isTimelineDomain(d: string): d is TimelineDomain {
  return (TIMELINE_DOMAINS as readonly string[]).includes(d);
}

export type TopicDef = HandTopicDef;

// ─────────────────────────────────────────────────────────────────────────────
// actuator 체계 (버전 1)
// ─────────────────────────────────────────────────────────────────────────────

export const ACTUATOR_TOPIC_VERSION = 1;

export const ACTUATOR_TOPICS: readonly TopicDef[] = [
  {
    id: 'qdd_direct_drive',
    label: '준직구동·고토크 모터(QDD)',
    shortLabel: 'QDD·직구동',
    definition: '준직구동(QDD)·직구동 액추에이터, 저감속비 고토크 모터, 프로프리오셉티브 액추에이션, 고토크밀도 관절 구동',
    hint: 'quasi-direct-drive, QDD, direct drive, proprioceptive actuator, low gear ratio, high torque density',
  },
  {
    id: 'harmonic_strain_wave',
    label: '하모닉·스트레인웨이브 감속',
    shortLabel: '하모닉',
    definition: '하모닉 드라이브·스트레인 웨이브 기어 기반 관절, 그 백래시·강성·효율·수명 분석과 대체 설계',
    hint: 'harmonic drive, strain wave gear, flexspline, backlash, stiffness',
  },
  {
    id: 'cycloidal_planetary',
    label: '사이클로이드·유성 감속',
    shortLabel: '사이클로·유성',
    definition: '사이클로이드 감속기, 유성 기어·유성 롤러 감속, 복합 기어열 등 기계식 감속 구조 설계·해석',
    hint: 'cycloidal drive, planetary gearbox, planetary roller, gear reducer, transmission ratio',
  },
  {
    id: 'linear_screw',
    label: '리니어·볼/롤러 스크류',
    shortLabel: '리니어·스크류',
    definition: '리니어 액추에이터, 볼 스크류·롤러 스크류·리드 스크류, 선형 구동 기반 관절(무릎·발목·허리 등)',
    hint: 'linear actuator, ball screw, roller screw, lead screw, linear joint',
  },
  {
    id: 'series_elastic_compliance',
    label: 'SEA·가변강성·컴플라이언스',
    shortLabel: 'SEA·가변강성',
    definition: '직렬 탄성 액추에이터(SEA), 가변 강성·가변 임피던스 액추에이터, 컴플라이언트 구동과 안전 상호작용',
    hint: 'series elastic actuator, variable stiffness, variable impedance, compliant actuation',
  },
  {
    id: 'hydraulic_pneumatic_soft',
    label: '유압·공압·소프트 액추에이터',
    shortLabel: '유압·공압·소프트',
    definition: '유압·공압 액추에이터, 소프트 액추에이터, 인공근육(전기활성 고분자·형상기억합금·텐던 기반 근육 등)',
    hint: 'hydraulic, pneumatic, soft actuator, artificial muscle, McKibben, EAP, SMA',
  },
  {
    id: 'motor_design',
    label: '모터 설계·권선·자석·냉각',
    shortLabel: '모터 설계',
    definition: '전동기 자체 설계: 권선·자석·토폴로지(아우터 로터·축방향 자속 등), 열·냉각, 전자기 해석, 토크 리플',
    hint: 'motor design, winding, permanent magnet, axial flux, outer rotor, cooling, torque ripple',
  },
  {
    id: 'sensing_control',
    label: '토크 센싱·드라이버·제어',
    shortLabel: '센싱·제어',
    definition: '관절 토크·전류 센싱, 모터 드라이버·FOC·인코더, 임피던스·토크 제어, 백드라이버빌리티·마찰 보상',
    hint: 'torque sensing, joint torque sensor, FOC, motor driver, encoder, impedance control, backdrivability',
  },
  {
    id: 'integration_modular',
    label: '통합 관절 모듈·배선',
    shortLabel: '관절 모듈',
    definition: '모터·감속기·드라이버·센서를 통합한 관절 모듈, 모듈형 액추에이터 플랫폼, 배선·통신·열 통합, 휴머노이드 적용',
    hint: 'integrated joint module, modular actuator, actuator unit, humanoid joint, cabling, EtherCAT',
  },
  {
    id: 'manufacturing_cost',
    label: '양산·원가·내구',
    shortLabel: '양산·원가·내구',
    definition: '액추에이터 양산·원가 절감·BOM, 내구성·수명·신뢰성 시험, 공급망·부품 표준화',
    hint: 'mass production, cost, BOM, durability, lifetime test, reliability, supply chain',
  },
  {
    id: OTHER_TOPIC_ID,
    label: '기타 액추에이터 관련',
    shortLabel: '기타',
    definition: '액추에이터·관절 구동계·감속기·모터가 실제 주제이나 위 10개에 해당 없음',
    hint: '-',
  },
  {
    id: OFF_TOPIC_ID,
    label: '액추에이터 무관',
    shortLabel: '액추에이터 무관',
    definition:
      '액추에이터·모터·감속기·관절 구동이 실질 주제가 아님: "motor skills"·"sensorimotor" 같은 학습 용어, 행성 탐사(planetary rover), 통신(transmission), 구동계를 다루지 않는 보행·조작 정책, 비로봇. 시계열에서 제외하고 건수만 별도 보고.',
    hint: '-',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 체계 테이블
// ─────────────────────────────────────────────────────────────────────────────

export interface DomainTaxonomy {
  domain: TimelineDomain;
  version: number;
  /** 프롬프트·화면용 도메인 명 (예: 핸드, 액추에이터) */
  labelKo: string;
  /** 리포트 성격 설명 (예: "로봇 핸드 기술") */
  subjectKo: string;
  topics: readonly TopicDef[];
  /** 시계열에 나오는 토픽 id (10개 + other, 체계 순서) */
  idsWithOther: readonly string[];
  /** 핵심 10개 서브토픽 id */
  coreIds: readonly string[];
  /** 저장 가능한 모든 id */
  allIds: readonly string[];
  validIdSet: ReadonlySet<string>;
}

function makeTaxonomy(
  domain: TimelineDomain,
  version: number,
  labelKo: string,
  subjectKo: string,
  topics: readonly TopicDef[]
): DomainTaxonomy {
  const allIds = topics.map((t) => t.id);
  const idsWithOther = allIds.filter((id) => id !== OFF_TOPIC_ID);
  return {
    domain,
    version,
    labelKo,
    subjectKo,
    topics,
    idsWithOther,
    coreIds: idsWithOther.filter((id) => id !== OTHER_TOPIC_ID),
    allIds,
    validIdSet: new Set(allIds),
  };
}

export const DOMAIN_TAXONOMIES: Readonly<Record<TimelineDomain, DomainTaxonomy>> = {
  hand: makeTaxonomy('hand', HAND_TOPIC_VERSION, '핸드', '로봇 핸드', HAND_TOPICS),
  actuator: makeTaxonomy('actuator', ACTUATOR_TOPIC_VERSION, '액추에이터', '로봇 액추에이터(관절 구동계)', ACTUATOR_TOPICS),
};

export function getTaxonomy(domain: TimelineDomain): DomainTaxonomy {
  return DOMAIN_TAXONOMIES[domain];
}

export function getTopicDef(domain: TimelineDomain, id: string): TopicDef | undefined {
  return DOMAIN_TAXONOMIES[domain].topics.find((t) => t.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// 프롬프트
// ─────────────────────────────────────────────────────────────────────────────

/** actuator 분류 프롬프트 — 핸드 프롬프트와 같은 구조에 도메인 라벨·토픽 설명·도메인 고유 규칙을 주입 */
function buildActuatorTopicPrompt(items: HandTopicInputItem[]): string {
  const taxonomy = ACTUATOR_TOPICS.map(
    (t) => `- ${t.id} (${t.label}): ${t.definition}${t.hint !== '-' ? ` / 판정 힌트: ${t.hint}` : ''}`
  ).join('\n');

  return `다음은 로봇 액추에이터(관절 구동계) 기술 리포트에 수집된 논문(arXiv)과 영상의 메타데이터다. 각 항목을 아래 기술 서브토픽으로 분류하라.

서브토픽 (id만 사용):
${taxonomy}

규칙:
- 주어진 텍스트에 명시된 내용만 근거로 삼는다. 추측·외부 지식 금지.
- topics는 1~3개를 id로만 고르고, primary는 그중 핵심 기여(영상은 주 시연 대상) 하나다.
- 액추에이터·모터·감속기·관절 구동계가 실제 주제가 아니면 off_topic을 단독으로 쓴다. 액추에이터 관련이지만 맞는 토픽이 없으면 other를 쓴다.
- 애매하면 off_topic이 아니라 other를 선택한다(오제외 방지).
- "motor skills"·"motor learning"·"sensorimotor" 같은 학습·신경과학 용어, 행성 탐사(planetary rover), 데이터 통신(transmission)은 구동계가 아니므로 off_topic이다.
- 구동계 설계를 다루지 않는 보행·조작 정책 논문과 로봇 완제품 시연 영상은, 영상·초록에서 관절 모듈·모터·감속기·토크 제어가 핵심으로 다뤄질 때만 해당 토픽으로 분류하고 그렇지 않으면 off_topic이다.
- 관절 토크 센싱·임피던스 제어·백드라이버빌리티를 다루는 항목은 제어 논문이라도 액추에이터 범위에 포함하며 sensing_control로 분류한다(off_topic 금지).
- 마크다운과 인용 태그(<cite>) 사용 금지.

[항목 ${items.length}건]
${JSON.stringify(items)}

JSON으로만 응답하라. 다른 텍스트 없이:
{"results":[{"n":1,"primary":"토픽 id","topics":["토픽 id"]}]}`;
}

/** 도메인별 분류 프롬프트 — hand 는 buildHandTopicPrompt 문자열 그대로 */
export function buildDomainTopicPrompt(domain: TimelineDomain, items: HandTopicInputItem[]): string {
  return domain === 'hand' ? buildHandTopicPrompt(items) : buildActuatorTopicPrompt(items);
}

// ─────────────────────────────────────────────────────────────────────────────
// 파서 / 저장값 읽기
// ─────────────────────────────────────────────────────────────────────────────

/** 도메인별 응답 파서 — hand 는 parseHandTopicBatch 그대로, 그 외는 해당 체계의 id 집합으로 같은 규칙 적용 */
export function parseDomainTopicBatch(domain: TimelineDomain, text: string, validN: ReadonlySet<number>): HandTopicParsed[] {
  if (domain === 'hand') return parseHandTopicBatch(text, validN);
  return parseTopicBatchWith(text, validN, DOMAIN_TAXONOMIES[domain].validIdSet);
}

/**
 * 저장된 분류값 읽기 — hand 는 extracted_metadata.handTopics(기존 키), 그 외는 extracted_metadata.domainTopics.{domain}.
 * 구조가 비정상이거나 버전이 다르면 null(미분류/구버전 취급).
 */
export function getDomainTopics(
  domain: TimelineDomain,
  row: Pick<ArticleRow, 'extractedMetadata'>,
  expectedVersion: number = DOMAIN_TAXONOMIES[domain].version
): HandTopicsValue | null {
  if (domain === 'hand') return getHandTopics(row, expectedVersion);
  const bag: unknown = row.extractedMetadata?.domainTopics;
  const v = bag && typeof bag === 'object' && !Array.isArray(bag) ? (bag as Record<string, unknown>)[domain] : undefined;
  return readStoredTopics(v, expectedVersion, DOMAIN_TAXONOMIES[domain].validIdSet);
}

/** 분류 시도 횟수 — hand 는 handTopicsAttempts, 그 외는 domainTopicsAttempts.{domain} */
export function getDomainTopicsAttempts(domain: TimelineDomain, row: Pick<ArticleRow, 'extractedMetadata'>): number {
  if (domain === 'hand') return getHandTopicsAttempts(row);
  const bag: unknown = row.extractedMetadata?.domainTopicsAttempts;
  const v = bag && typeof bag === 'object' && !Array.isArray(bag) ? (bag as Record<string, unknown>)[domain] : undefined;
  return normalizeAttempts(v);
}
