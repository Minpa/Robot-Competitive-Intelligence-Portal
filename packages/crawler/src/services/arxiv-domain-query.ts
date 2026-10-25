/**
 * 도메인별 arXiv 검색 정의 — 순수 로직(쿼리 상수, 서브토픽 매핑, 정밀 필터, 도메인 입력 검증)
 *
 * hand 는 arxiv-hand-query.ts 의 Q1~Q4·정밀 필터를 그대로 재사용하고(문자 단위 불변),
 * actuator 는 이 파일에서 같은 형식(cat:cs.RO AND (...))으로 정의한다.
 * I/O 는 arxiv-hand-collector.service.ts 의 ArxivTopicCollector 가 도메인 파라미터로 담당한다.
 */

import { HAND_QUERIES, HAND_SUBTOPICS, isRelevantHandPaper, type HandPaperInput, type HandQuery } from './arxiv-hand-query.js';

export type ArxivTopicDomain = 'hand' | 'actuator';
export const ARXIV_TOPIC_DOMAINS: readonly ArxivTopicDomain[] = ['hand', 'actuator'];

export type DomainQueryId = 'q1' | 'q2' | 'q3' | 'q4';

/** HandQuery 와 동일 형태 (id/key/query) — 도메인 공용 */
export type DomainQuery = HandQuery;

export interface DomainSubtopic {
  no: number;
  name: string;
  queryIds: DomainQueryId[];
  /** 해당 쿼리 원문에 포함돼야 하는 대표 용어 */
  term: string;
}

// ------------------------------------------------------------------
// actuator 쿼리 4개 (cat:cs.RO 고정, 와일드카드 없음)
// ------------------------------------------------------------------

export const ACTUATOR_QUERIES: readonly DomainQuery[] = [
  {
    id: 'q1',
    key: 'q1-actuator-humanoid-legged',
    query:
      'cat:cs.RO AND ((abs:actuator OR abs:actuators OR abs:"joint module" OR abs:"actuation unit") AND (abs:humanoid OR abs:legged OR abs:quadruped OR abs:biped OR abs:exoskeleton OR abs:"robot arm" OR abs:manipulator))',
  },
  {
    id: 'q2',
    key: 'q2-qdd-proprioceptive-backdrivable',
    query:
      'cat:cs.RO AND (abs:"quasi-direct-drive" OR abs:"quasi direct drive" OR abs:"quasi-direct drive" OR abs:"proprioceptive actuator" OR abs:"proprioceptive actuation" OR abs:backdrivable OR abs:backdrivability OR abs:"torque density" OR abs:"high-torque" OR (abs:"direct-drive" AND abs:actuator))',
  },
  {
    id: 'q3',
    key: 'q3-harmonic-cycloidal-planetary',
    query:
      'cat:cs.RO AND (abs:"harmonic drive" OR abs:"strain wave" OR abs:cycloidal OR abs:"cycloid drive" OR abs:"gear reducer" OR abs:"speed reducer" OR (abs:planetary AND (abs:gear OR abs:gearbox OR abs:reducer OR abs:actuator OR abs:joint)) OR (abs:transmission AND (abs:actuator OR abs:"robot joint" OR abs:gearbox)))',
  },
  {
    id: 'q4',
    key: 'q4-sea-vsa-linear-screw',
    query:
      'cat:cs.RO AND (abs:"series elastic" OR abs:"variable stiffness actuator" OR abs:"variable impedance actuator" OR abs:"linear actuator" OR abs:"roller screw" OR abs:"ball screw" OR abs:"hydraulic actuator" OR abs:"pneumatic actuator" OR abs:"soft actuator" OR abs:"artificial muscle")',
  },
];

/** actuator 서브토픽 10개 → 쿼리 매핑 (백엔드 domain-topics.ts 의 actuator v1 체계와 순서 일치) */
export const ACTUATOR_SUBTOPICS: readonly DomainSubtopic[] = [
  { no: 1, name: '준직구동·고토크 모터(QDD)', queryIds: ['q2'], term: 'quasi-direct-drive' },
  { no: 2, name: '하모닉·스트레인웨이브', queryIds: ['q3'], term: 'harmonic drive' },
  { no: 3, name: '사이클로이드·유성 감속', queryIds: ['q3'], term: 'cycloidal' },
  { no: 4, name: '리니어·볼/롤러 스크류', queryIds: ['q4'], term: 'roller screw' },
  { no: 5, name: 'SEA·가변강성', queryIds: ['q4'], term: 'series elastic' },
  { no: 6, name: '유압·공압·소프트', queryIds: ['q4'], term: 'hydraulic actuator' },
  { no: 7, name: '모터 설계·토크 밀도', queryIds: ['q2'], term: 'torque density' },
  { no: 8, name: '토크 센싱·제어(백드라이버빌리티)', queryIds: ['q2'], term: 'backdrivab' },
  { no: 9, name: '통합 관절 모듈', queryIds: ['q1'], term: 'joint module' },
  { no: 10, name: '휴머노이드·레그드 적용', queryIds: ['q1'], term: 'humanoid' },
];

export const ARXIV_DOMAIN_QUERIES: Readonly<Record<ArxivTopicDomain, readonly DomainQuery[]>> = {
  hand: HAND_QUERIES,
  actuator: ACTUATOR_QUERIES,
};

export const ARXIV_DOMAIN_SUBTOPICS: Readonly<Record<ArxivTopicDomain, readonly DomainSubtopic[]>> = {
  hand: HAND_SUBTOPICS,
  actuator: ACTUATOR_SUBTOPICS,
};

// ------------------------------------------------------------------
// actuator 정밀 필터
// ------------------------------------------------------------------

/**
 * 비구동계 관용구 — 매칭 전에 제거한다.
 * motor skills/learning/control(학습·신경과학), sensorimotor, 행성 탐사(planetary rover), 통신 transmission 등.
 */
const ACTUATOR_IDIOM_STRIP_PATTERNS: RegExp[] = [
  /\bmotor[-\s](?:skills?|learning|imagery|cortex|babbling|primitives?|commands?|programs?|neurons?|behaviou?rs?|planning|intention)\b/gi,
  /\b(?:sensori|psycho|visuo|oculo|neuro)motor\b/gi,
  /\bmotor (?:control )?polic(?:y|ies)\b/gi,
  /\bplanetary (?:rover|exploration|surface|bod(?:y|ies)|science|missions?|landers?|terrain)s?\b/gi,
  /\b(?:data|wireless|signal|video|image|power|information|message|packet|radio|optical) transmission\b/gi,
  /\btransmission (?:lines?|delays?|rates?|latenc(?:y|ies)|errors?|power|protocols?|channels?)\b/gi,
  /\bdisease transmission\b/gi,
  /\bstepper motor\b/gi,
];

/**
 * actuator 키워드 — 리포트 paperRegex(actuator|\bmotor\b|gearbox|harmonic drive|transmission|joint torque|quasi.direct|
 * proprioceptive|series elastic)를 포함하는 상위집합. 복수형 motors, 감속·스크류·강성 가변 용어를 추가한다.
 */
const ACTUATOR_KEYWORD_RE =
  /actuator|actuation|\bmotors?\b|gearbox|gear ?reducer|speed reducer|harmonic drive|strain.wave|cycloid|planetary gear|planetary reducer|transmission|joint torque|quasi.direct|\bqdd\b|direct.drive|proprioceptive|series elastic|variable stiffness|variable impedance|backdriv|roller screw|ball screw|torque density|joint module|artificial muscle/i;

export type DomainPaperInput = HandPaperInput;

export function isRelevantActuatorPaper(input: DomainPaperInput): boolean {
  if (!input.categories.includes('cs.RO')) return false;
  let text = `${input.title} ${input.abstract ?? ''}`;
  for (const re of ACTUATOR_IDIOM_STRIP_PATTERNS) text = text.replace(re, ' ');
  return ACTUATOR_KEYWORD_RE.test(text);
}

/** 도메인별 정밀 필터 — hand 는 기존 isRelevantHandPaper 그대로 */
export function isRelevantDomainPaper(domain: ArxivTopicDomain, input: DomainPaperInput): boolean {
  return domain === 'hand' ? isRelevantHandPaper(input) : isRelevantActuatorPaper(input);
}

// ------------------------------------------------------------------
// 도메인별 저장 메타 키 / 로그 태그
// ------------------------------------------------------------------

/** extracted_metadata 에 기록하는 "이 도메인 수집기가 마지막으로 본 시각" 키 — hand 는 기존 handCollectedAt */
export function collectedAtKey(domain: ArxivTopicDomain): string {
  return `${domain}CollectedAt`;
}

/** extracted_metadata.collector 값 — hand 는 기존 'arxiv-hand' */
export function collectorName(domain: ArxivTopicDomain): string {
  return `arxiv-${domain}`;
}

/** 콘솔 로그 태그 — hand 는 기존 [ArxivHand], actuator 는 [ArxivActuator] */
export function logTag(domain: ArxivTopicDomain): string {
  return `Arxiv${domain.charAt(0).toUpperCase()}${domain.slice(1)}`;
}

// ------------------------------------------------------------------
// 엔드포인트 입력 검증 (순수 함수)
// ------------------------------------------------------------------

export type DomainParseResult = { ok: true; domain: ArxivTopicDomain } | { ok: false; error: string };

/** body/query 의 domain 값 검증 — 문자열이 아니거나 목록 밖이면 오류 */
export function parseArxivDomain(raw: unknown): DomainParseResult {
  if (typeof raw === 'string' && (ARXIV_TOPIC_DOMAINS as readonly string[]).includes(raw)) {
    return { ok: true, domain: raw as ArxivTopicDomain };
  }
  return { ok: false, error: `domain must be one of: ${ARXIV_TOPIC_DOMAINS.join(', ')}` };
}

/** 단순 추정: 요청 수 = 윈도우 × 쿼리 수 × 2.5페이지, 소요 = 요청 × 6초 (hand 4쿼리일 때 estimateBackfill 과 동일) */
export function estimateDomainBackfill(
  windows: number,
  queryCount: number
): { estimatedRequests: number; estimatedMinutes: number } {
  const estimatedRequests = Math.round(windows * queryCount * 2.5);
  return { estimatedRequests, estimatedMinutes: Math.ceil((estimatedRequests * 6) / 60) };
}
