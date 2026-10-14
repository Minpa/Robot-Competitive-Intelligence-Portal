/**
 * 핸드 전용 arXiv 검색 — 순수 로직(쿼리 상수/빌더, 월 윈도우, 정밀 필터, 입력 검증)
 *
 * I/O 는 arxiv-hand-collector.service.ts 가 담당한다 (topic-video-relevance.ts 와 같은 분리 방식).
 * 공식 arXiv API(https://export.arxiv.org/api/query)만 대상으로 한다.
 */

import { createHash } from 'crypto';
import { splitArxivId } from './arxiv-atom.js';

export const ARXIV_API_URL = 'https://export.arxiv.org/api/query';

export type HandQueryId = 'q1' | 'q2' | 'q3' | 'q4';

export interface HandQuery {
  id: HandQueryId;
  key: string;
  /** 디코드된 원문 search_query (cat:cs.RO 고정) */
  query: string;
}

/**
 * 쿼리 4개. 모든 쿼리에 cat:cs.RO 를 AND 로 고정해 비로봇 논문 혼입을 서버 단에서 1차 차단한다.
 * 와일드카드(*)는 쓰지 않는다(결정성).
 */
export const HAND_QUERIES: readonly HandQuery[] = [
  {
    id: 'q1',
    key: 'q1-hand-core',
    query:
      'cat:cs.RO AND (abs:"dexterous hand" OR abs:"robot hand" OR abs:"robotic hand" OR abs:"humanoid hand" OR abs:"anthropomorphic hand" OR abs:"multi-fingered" OR abs:"five-fingered" OR abs:"in-hand" OR abs:"dexterous manipulation" OR ti:dexterous)',
  },
  {
    id: 'q2',
    key: 'q2-sensing-actuation',
    query:
      'cat:cs.RO AND (abs:GelSight OR abs:"electronic skin" OR abs:"e-skin" OR abs:"vision-based tactile" OR (abs:tactile AND (abs:hand OR abs:finger OR abs:fingertip)) OR (abs:"tendon-driven" AND (abs:hand OR abs:finger OR abs:gripper)) OR abs:"underactuated hand" OR (abs:hand AND (abs:durability OR abs:"low-cost" OR abs:"low cost")))',
  },
  {
    id: 'q3',
    key: 'q3-grasp-gripper',
    query:
      'cat:cs.RO AND (ti:grasp OR ti:grasping OR abs:"grasp synthesis" OR abs:"grasp planning" OR abs:"grasp generation" OR abs:"grasp detection" OR ti:gripper OR abs:gripper OR abs:"parallel-jaw" OR abs:"soft gripper")',
  },
  {
    id: 'q4',
    key: 'q4-teleop-sim2real-humanoid',
    query:
      'cat:cs.RO AND ((abs:teleoperation AND (abs:hand OR abs:dexterous)) OR abs:"hand retargeting" OR abs:"hand pose" OR abs:"hand tracking" OR abs:"data glove" OR abs:"hand-object" OR (abs:"sim-to-real" AND (abs:hand OR abs:dexterous OR abs:grasp)) OR (abs:humanoid AND (abs:dexterous OR abs:"whole-hand")))',
  },
];

export interface HandSubtopic {
  no: number;
  name: string;
  queryIds: HandQueryId[];
  /** 해당 쿼리 원문에 포함돼야 하는 대표 용어 */
  term: string;
}

/** 서브토픽 10개 → 쿼리 매핑 (테스트로 고정) */
export const HAND_SUBTOPICS: readonly HandSubtopic[] = [
  { no: 1, name: '다지 핸드/덱스터러스', queryIds: ['q1'], term: 'dexterous hand' },
  { no: 2, name: '촉각·힘 센싱(tactile, e-skin, GelSight)', queryIds: ['q2'], term: 'GelSight' },
  { no: 3, name: '텐던/액추에이션', queryIds: ['q2'], term: 'tendon-driven' },
  { no: 4, name: '인핸드 조작', queryIds: ['q1'], term: 'in-hand' },
  { no: 5, name: '파지 계획/grasp synthesis', queryIds: ['q3'], term: 'grasp synthesis' },
  { no: 6, name: '텔레오퍼레이션/리타게팅', queryIds: ['q4'], term: 'teleoperation' },
  { no: 7, name: '그리퍼/엔드이펙터', queryIds: ['q3'], term: 'gripper' },
  { no: 8, name: 'Sim2Real(핸드)', queryIds: ['q4'], term: 'sim-to-real' },
  { no: 9, name: '내구성/원가', queryIds: ['q2'], term: 'durability' },
  { no: 10, name: '휴머노이드 조작', queryIds: ['q4', 'q1'], term: 'humanoid' },
];

// ------------------------------------------------------------------
// 쿼리/URL 빌더
// ------------------------------------------------------------------

export interface ArxivDateRange {
  start: Date;
  end: Date;
}

/** UTC 기준 YYYYMMDDHHMM (12자리, 분 해상도) */
export function formatArxivDate(d: Date): string {
  const iso = d.toISOString(); // 2026-03-01T00:00:00.000Z
  return iso.slice(0, 16).replace(/[-T:]/g, '');
}

/** `(<Qn>)` 또는 날짜 범위가 있으면 `(<Qn>) AND submittedDate:[a TO b]` */
export function buildSearchQuery(query: string, range?: ArxivDateRange): string {
  const base = `(${query})`;
  if (!range) return base;
  return `${base} AND submittedDate:[${formatArxivDate(range.start)} TO ${formatArxivDate(range.end)}]`;
}

export interface ArxivUrlOptions {
  query: string;
  start?: number;
  maxResults?: number;
  sortOrder?: 'ascending' | 'descending';
  range?: ArxivDateRange;
}

export function buildArxivUrl(opts: ArxivUrlOptions): string {
  const searchQuery = buildSearchQuery(opts.query, opts.range);
  const start = opts.start ?? 0;
  const maxResults = opts.maxResults ?? 100;
  const order = opts.sortOrder ?? 'descending';
  return (
    `${ARXIV_API_URL}?search_query=${encodeURIComponent(searchQuery)}` +
    `&start=${start}&max_results=${maxResults}&sortBy=submittedDate&sortOrder=${order}`
  );
}

// ------------------------------------------------------------------
// 월 윈도우 (UTC 달력월)
// ------------------------------------------------------------------

export interface ArxivWindow {
  label: string;
  start: Date;
  end: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function monthLabel(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function dayLabel(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 시작 = (현재 UTC 월 첫날 0시) − months 개월, 끝 = 현재 시각. 달력월 단위, 시간 오름차순.
 * 마지막(진행 중) 월의 end 는 now. 각 월 end 는 다음 월 1일 0000.
 * months=12 → 12개 완료월 + 진행 중 월 = 13개 윈도우. (now 가 월 초 정각이면 진행 중 월은 비어 12개)
 */
export function buildMonthWindows(months: number, now: Date): ArxivWindow[] {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const out: ArxivWindow[] = [];
  for (let i = months; i >= 0; i--) {
    const start = new Date(Date.UTC(y, m - i, 1));
    const end = i === 0 ? new Date(now.getTime()) : new Date(Date.UTC(y, m - i + 1, 1));
    if (end.getTime() <= start.getTime()) continue;
    out.push({ label: monthLabel(start), start, end });
  }
  return out;
}

/**
 * 윈도우를 UTC 일 경계에서 반으로 분할한다. 최소 단위 1일 — 더 못 쪼개면 null.
 * (월 → 반월 → … → 일)
 */
export function bisectWindow(w: ArxivWindow): [ArxivWindow, ArxivWindow] | null {
  const days = Math.ceil((w.end.getTime() - w.start.getTime()) / DAY_MS);
  if (days <= 1) return null;
  const mid = new Date(w.start.getTime() + Math.floor(days / 2) * DAY_MS);
  if (mid.getTime() >= w.end.getTime()) return null;
  return [
    { label: `${dayLabel(w.start)}~${dayLabel(mid)}`, start: w.start, end: mid },
    { label: `${dayLabel(mid)}~${dayLabel(w.end)}`, start: mid, end: w.end },
  ];
}

// ------------------------------------------------------------------
// 정밀 필터
// ------------------------------------------------------------------

/** 비로봇 관용구 — 매칭 전에 제거한다 (순서 중요: hand-in-hand 를 먼저) */
const IDIOM_STRIP_PATTERNS: RegExp[] = [
  /\bhand[-\s]in[-\s]hand\b/gi,
  /\bon\s+the\s+other\s+hand\b/gi,
  /\bon\s+the\s+one\s+hand\b/gi,
  /\bon\s+one\s+hand\b/gi,
  /\bby\s+hand\b/gi,
  /\bsecond[-\s]hand\b/gi,
  /\bhand[-\s]?held\b/gi,
  /\bhand[-\s](?:crafted|engineered|designed|tuned|labeled|labelled|annotated|picked|written|made|coded)\b/gi,
  /\bfingerprint(?:s|ing)?\b/gi,
];

/** 리포트 paperRegex 와의 차이는 복수형 hands 뿐 */
const HAND_KEYWORD_RE = /\bhands?\b|gripper|finger|tactile|dexter|grasp|manipulat|in-hand/i;

export interface HandPaperInput {
  title: string;
  abstract?: string | null;
  categories: string[];
}

export function isRelevantHandPaper(input: HandPaperInput): boolean {
  if (!input.categories.includes('cs.RO')) return false;
  let text = `${input.title} ${input.abstract ?? ''}`;
  for (const re of IDIOM_STRIP_PATTERNS) text = text.replace(re, ' ');
  return HAND_KEYWORD_RE.test(text);
}

// ------------------------------------------------------------------
// ID / 해시
// ------------------------------------------------------------------

/**
 * URL 또는 <id> 에서 버전 제거한 base arXiv ID 추출.
 * http/https, 신형/구형(cs/0501001v1) 모두 처리. abs URL 이 아니면 null.
 */
export function extractBaseArxivId(urlOrId: string): string | null {
  return splitArxivId(urlOrId)?.arxivId ?? null;
}

/** 기존 규칙과 동일: md5(<id> 원문) */
export function contentHashForArxivId(idRaw: string): string {
  return createHash('md5').update(idRaw).digest('hex');
}

// ------------------------------------------------------------------
// 백필 입력 검증 (엔드포인트용 순수 함수)
// ------------------------------------------------------------------

export const BACKFILL_DEFAULT_MONTHS = 12;
export const BACKFILL_MAX_MONTHS = 24;

export type BackfillOptionsResult =
  | { ok: true; months: number; dryRun: boolean }
  | { ok: false; error: string };

export function parseBackfillOptions(body: unknown): BackfillOptionsResult {
  if (body === null || body === undefined) return { ok: true, months: BACKFILL_DEFAULT_MONTHS, dryRun: false };
  if (typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body must be an object' };
  const { months, dryRun } = body as { months?: unknown; dryRun?: unknown };

  let m = BACKFILL_DEFAULT_MONTHS;
  if (months !== undefined) {
    if (typeof months !== 'number' || !Number.isInteger(months) || months < 1 || months > BACKFILL_MAX_MONTHS) {
      return { ok: false, error: `months must be an integer between 1 and ${BACKFILL_MAX_MONTHS}` };
    }
    m = months;
  }
  let d = false;
  if (dryRun !== undefined) {
    if (typeof dryRun !== 'boolean') return { ok: false, error: 'dryRun must be a boolean' };
    d = dryRun;
  }
  return { ok: true, months: m, dryRun: d };
}

/** 단순 추정: 요청 수 = 윈도우 × 4쿼리 × 2.5페이지, 소요 = 요청 × 6초 */
export function estimateBackfill(windows: number): { estimatedRequests: number; estimatedMinutes: number } {
  const estimatedRequests = Math.round(windows * HAND_QUERIES.length * 2.5);
  return { estimatedRequests, estimatedMinutes: Math.ceil((estimatedRequests * 6) / 60) };
}
