/**
 * 데이터 커버리지 — 순수 집계 함수 모음. DB 접근, AI 호출, 환경변수 읽기 금지.
 * 후속 중복 병합 작업이 normalizeArticleUrl / extractArxivId 를 그대로 재사용한다.
 */

import type { CoverageMetric, CoverageSection, CoverageSnapshotSummary, CoverageTable } from '../types/data-coverage.js';

// ── 소스군 ──

export const SOURCE_GROUPS = ['youtube', 'arxiv', 'github', 'sec_edgar', 'patent', 'other'] as const;
export type SourceGroup = (typeof SOURCE_GROUPS)[number];

/** SQL 의 `source LIKE 'YouTube%'` 와 같은 판정(대소문자 구분, 대시 문자 종류와 무관) */
export function classifySource(source: string | null | undefined): SourceGroup {
  const s = source ?? '';
  if (s.startsWith('YouTube')) return 'youtube';
  if (s === 'arxiv') return 'arxiv';
  if (s === 'github') return 'github';
  if (s === 'sec_edgar') return 'sec_edgar';
  if (s === 'patent') return 'patent';
  return 'other';
}

/** `YouTube — <채널명>` 에서 채널명을 꺼낸다(대시 종류 무관) */
export function channelFromSource(source: string): string {
  return source.replace(/^YouTube\s*[—–-]?\s*/, '').trim();
}

// ── 수집량 접기(Q-A1) ──

export interface Qa1Row {
  source: string;
  productType: string | null;
  language: string | null;
  channel: string | null;
  thirdParty: string | null;
  total: number;
  c7: number;
  c30: number;
  c90: number;
  lastCollectedAt: string | null;
  companyNull: number;
  publishedNull: number;
  entityTitle: number;
  koTitle: number;
  cjkTitle: number;
  /** arxiv 한정 */
  arxivSummary: number;
  arxivSummary30: number;
  /** 뉴스성 기사(영상·arxiv·github·sec·특허·YouTube 제외) */
  newsTotal: number;
  newsKeyPoints: number;
  news30Total: number;
  news30KeyPoints: number;
  /** arxiv 한정 도메인 판정/서브토픽 */
  focusHand: FocusCounts;
  focusActuator: FocusCounts;
  handTopics: number;
  actuatorTopics: number;
}

export interface FocusCounts {
  judged: number;
  primary: number;
  secondary: number;
  none: number;
}

export const emptyFocus = (): FocusCounts => ({ judged: 0, primary: 0, secondary: 0, none: 0 });

export interface GroupIngest {
  total: number;
  c7: number;
  c30: number;
  c90: number;
  lastCollectedAt: string | null;
}

export interface ChannelIngest {
  channel: string;
  official: number;
  thirdParty: number;
  total: number;
  c7: number;
  c30: number;
  c90: number;
  lastCollectedAt: string | null;
}

export interface IngestFold {
  total: number;
  byGroup: Record<SourceGroup, GroupIngest>;
  byProductType: Map<string, { total: number; c7: number; c30: number }>;
  byChannel: ChannelIngest[];
}

function laterOf(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

export function foldIngestRows(rows: readonly Qa1Row[]): IngestFold {
  const byGroup = Object.fromEntries(
    SOURCE_GROUPS.map((g) => [g, { total: 0, c7: 0, c30: 0, c90: 0, lastCollectedAt: null } as GroupIngest]),
  ) as Record<SourceGroup, GroupIngest>;
  const byProductType = new Map<string, { total: number; c7: number; c30: number }>();
  const channels = new Map<string, ChannelIngest>();
  let total = 0;
  for (const r of rows) {
    total += r.total;
    const g = byGroup[classifySource(r.source)];
    g.total += r.total;
    g.c7 += r.c7;
    g.c30 += r.c30;
    g.c90 += r.c90;
    g.lastCollectedAt = laterOf(g.lastCollectedAt, r.lastCollectedAt);

    const pt = r.productType ?? '(null)';
    const p = byProductType.get(pt) ?? { total: 0, c7: 0, c30: 0 };
    p.total += r.total;
    p.c7 += r.c7;
    p.c30 += r.c30;
    byProductType.set(pt, p);

    if (classifySource(r.source) === 'youtube') {
      const name = (r.channel && r.channel.trim()) || channelFromSource(r.source);
      const c =
        channels.get(name) ?? { channel: name, official: 0, thirdParty: 0, total: 0, c7: 0, c30: 0, c90: 0, lastCollectedAt: null };
      c.total += r.total;
      if (r.thirdParty === 'true') c.thirdParty += r.total;
      else c.official += r.total;
      c.c7 += r.c7;
      c.c30 += r.c30;
      c.c90 += r.c90;
      c.lastCollectedAt = laterOf(c.lastCollectedAt, r.lastCollectedAt);
      channels.set(name, c);
    }
  }
  return { total, byGroup, byProductType, byChannel: [...channels.values()] };
}

/** 30일 건수 내림차순, 같으면 전체 내림차순, 같으면 이름순 */
export function sortChannels(channels: readonly ChannelIngest[]): ChannelIngest[] {
  return [...channels].sort((a, b) => b.c30 - a.c30 || b.total - a.total || a.channel.localeCompare(b.channel));
}

/**
 * 최근 90일 0건 채널: 기대 집합 = (수집 실행 요약의 공식 설정 채널) ∪ (DB 의 비-제3자 채널 중 전체>0).
 * 이름 비교는 대소문자·앞뒤 공백을 무시한다.
 */
export function findZeroChannels90d(
  dbChannels: readonly ChannelIngest[],
  configuredOfficial: readonly string[] | null,
): { name: string; total: number; lastCollectedAt: string | null }[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const byKey = new Map<string, ChannelIngest>();
  for (const c of dbChannels) byKey.set(norm(c.channel), c);
  const expected = new Map<string, string>();
  for (const name of configuredOfficial ?? []) if (name.trim()) expected.set(norm(name), name.trim());
  for (const c of dbChannels) if (c.official > 0 && c.total > 0) expected.set(norm(c.channel), c.channel);
  const out: { name: string; total: number; lastCollectedAt: string | null }[] = [];
  for (const [key, name] of expected) {
    const c = byKey.get(key);
    if (!c || c.c90 === 0) out.push({ name, total: c?.total ?? 0, lastCollectedAt: c?.lastCollectedAt ?? null });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ── 중복 탐지(Q-A6) ──

export interface UrlNormalization {
  key: string;
  parsable: boolean;
}

/**
 * 정규화 규칙(v1): 스킴·호스트 소문자, 쿼리의 utm_* 와 fbclid 제거(비면 `?` 제거), 경로 끝 슬래시 제거(`/` 뿐이면 빈 경로).
 * 경로 대소문자, 프래그먼트, 파라미터 순서, `www.`, http/https 차이는 정규화하지 않는다.
 * 파싱 실패 시 btrim 한 원문을 키로 쓴다.
 */
export function normalizeArticleUrl(url: string | null | undefined): UrlNormalization {
  const raw = (url ?? '').trim();
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { key: raw, parsable: false };
  }
  const kept = u.search
    .replace(/^\?/, '')
    .split('&')
    .filter((part) => {
      if (part === '') return false;
      const name = (part.split('=')[0] ?? '').toLowerCase();
      return !(name.startsWith('utm_') || name === 'fbclid');
    });
  let path = u.pathname.replace(/\/+$/, '');
  if (path === '/') path = '';
  const query = kept.length > 0 ? `?${kept.join('&')}` : '';
  return { key: `${u.protocol}//${u.host}${path}${query}${u.hash}`, parsable: true };
}

const ARXIV_NEW = String.raw`\d{4}\.\d{4,5}`;
const ARXIV_OLD = String.raw`[a-z-]+(?:\.[A-Z]{2})?/\d{7}`;
const ARXIV_URL_RE = new RegExp(`arxiv\\.org/(?:abs|pdf)/((?:${ARXIV_NEW}|${ARXIV_OLD})(?:v\\d+)?)(?:\\.pdf)?(?=$|[/?#\\s])`, 'i');

/** base arXiv ID(버전 접미 제거). 메타 값 우선, 없으면 URL 에서 추출, 실패하면 null */
export function extractArxivId(metaId: string | null | undefined, url: string | null | undefined): string | null {
  const m = (metaId ?? '').trim().replace(/^arxiv:/i, '');
  if (m) return m.replace(/v\d+$/, '');
  const hit = ARXIV_URL_RE.exec(url ?? '');
  if (!hit || !hit[1]) return null;
  return hit[1].replace(/v\d+$/, '');
}

export interface DupRow {
  id: string;
  source: string;
  url: string;
  arxivId: string | null;
  videoId: string | null;
}

export type DupKind = 'urlNorm' | 'arxivId' | 'videoId';

export interface DupKindResult {
  groups: number;
  rowsInGroups: number;
  redundantRows: number;
}

export interface DupSample {
  kind: DupKind;
  key: string;
  size: number;
  ids: string[];
}

export interface DupResult {
  rowsScanned: number;
  urlNorm: DupKindResult;
  arxivId: DupKindResult;
  videoId: DupKindResult;
  unparsableUrl: number;
  samples: DupSample[];
}

export const DUP_MAX_ROWS_DEFAULT = 200_000;
export const DUP_SAMPLES_PER_KIND = 5;
const DUP_SAMPLE_IDS = 3;
const DUP_KEY_MAX = 200;

interface Bucket {
  size: number;
  ids: string[];
}

/** 행을 하나씩 받아 세 종류 중복을 독립 계산한다. 행 수가 상한을 넘으면 add() 가 false 를 돌려준다. */
export function createDuplicateDetector(opts: { maxRows?: number } = {}) {
  const maxRows = opts.maxRows ?? DUP_MAX_ROWS_DEFAULT;
  const maps: Record<DupKind, Map<string, Bucket>> = { urlNorm: new Map(), arxivId: new Map(), videoId: new Map() };
  let rows = 0;
  let unparsable = 0;
  let tooLarge = false;

  const push = (kind: DupKind, key: string, id: string) => {
    const map = maps[kind];
    const b = map.get(key);
    if (b) {
      b.size++;
      if (b.ids.length < DUP_SAMPLE_IDS) b.ids.push(id);
    } else {
      map.set(key, { size: 1, ids: [id] });
    }
  };

  return {
    add(row: DupRow): boolean {
      if (tooLarge) return false;
      if (rows >= maxRows) {
        tooLarge = true;
        return false;
      }
      rows++;
      const n = normalizeArticleUrl(row.url);
      if (!n.parsable) unparsable++;
      if (n.key) push('urlNorm', n.key, row.id);
      const aid = extractArxivId(row.arxivId, row.url);
      if (aid) push('arxivId', aid, row.id);
      const vid = (row.videoId ?? '').trim();
      if (vid) push('videoId', vid, row.id);
      return true;
    },
    get tooLarge() {
      return tooLarge;
    },
    get rowsScanned() {
      return rows;
    },
    finish(): DupResult {
      const summarize = (kind: DupKind): DupKindResult => {
        let groups = 0;
        let rowsIn = 0;
        for (const b of maps[kind].values()) {
          if (b.size > 1) {
            groups++;
            rowsIn += b.size;
          }
        }
        return { groups, rowsInGroups: rowsIn, redundantRows: rowsIn - groups };
      };
      const samples: DupSample[] = [];
      for (const kind of ['urlNorm', 'arxivId', 'videoId'] as const) {
        const dups = [...maps[kind].entries()].filter(([, b]) => b.size > 1);
        dups.sort((a, b) => b[1].size - a[1].size || (a[0] < b[0] ? -1 : 1));
        for (const [key, b] of dups.slice(0, DUP_SAMPLES_PER_KIND)) {
          samples.push({ kind, key: key.slice(0, DUP_KEY_MAX), size: b.size, ids: [...b.ids] });
        }
      }
      return {
        rowsScanned: rows,
        urlNorm: summarize('urlNorm'),
        arxivId: summarize('arxivId'),
        videoId: summarize('videoId'),
        unparsableUrl: unparsable,
        samples,
      };
    },
  };
}

export type DetectDuplicatesResult = { status: 'ok'; result: DupResult } | { status: 'too_large'; rowsScanned: number };

export function detectDuplicates(rows: Iterable<DupRow>, opts: { maxRows?: number } = {}): DetectDuplicatesResult {
  const d = createDuplicateDetector(opts);
  for (const r of rows) {
    if (!d.add(r)) return { status: 'too_large', rowsScanned: d.rowsScanned };
  }
  return { status: 'ok', result: d.finish() };
}

// ── 비율·소진·월말 예상·태그 ──

export interface RatioResult {
  value: number | null;
  numerator: number | null;
  denominator: number | null;
  /** 분모가 0 이하이거나 null 이면 true — 0% 로 표시하지 않는다 */
  na: boolean;
}

export function computeRatio(numerator: number | null | undefined, denominator: number | null | undefined): RatioResult {
  if (numerator == null || denominator == null || !Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return { value: null, numerator: numerator ?? null, denominator: denominator ?? null, na: true };
  }
  return { value: numerator / denominator, numerator, denominator, na: false };
}

export type BacklogEta = { kind: 'empty'; days: 0 } | { kind: 'days'; days: number } | { kind: 'impossible'; days: null };

/** 소진일수 = ceil(백로그 / (일일 상한 − 일평균 유입)). 상한 ≤ 유입이면 소진 불가 */
export function computeBacklogEta(backlog: number, dailyLimit: number, inflowPerDay: number): BacklogEta {
  if (backlog <= 0) return { kind: 'empty', days: 0 };
  const net = dailyLimit - inflowPerDay;
  if (!(net > 0)) return { kind: 'impossible', days: null };
  return { kind: 'days', days: Math.ceil(backlog / net) };
}

export const BACKLOG_IMPOSSIBLE_TEXT = '소진 불가(유입 ≥ 처리 상한)';

/** 월 경과일 기준 선형 추정. 월 1일(경과 1일 미만)은 na. 월 경계는 서버 로컬 기준(주간 브리프 예산 가드와 동일) */
export function projectMonthEnd(usedUsd: number, now: Date): { na: true } | { na: false; value: number } {
  if (now.getDate() === 1) return { na: true };
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const elapsedDays = (now.getTime() - first.getTime()) / 86_400_000;
  if (!(elapsedDays >= 1)) return { na: true };
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { na: false, value: (usedUsd / elapsedDays) * daysInMonth };
}

export const UNTAGGED = '(untagged)';

/** `[tag] ...` 접두 태그. 없으면 `(untagged)` (SQL 의 substring(query from '^\[([^\]]+)\]') 과 동일) */
export function extractUsageTag(query: string | null | undefined): string {
  const m = /^\[([^\]]+)\]/.exec(query ?? '');
  return m && m[1] ? m[1] : UNTAGGED;
}

// ── 경고 규칙 ──

export type Severity = 'ok' | 'warn' | 'error';

export const WARN_USED_PCT = 0.8;
export const ERROR_USED_PCT = 1.0;
export const WARN_RUN_AGE_HOURS = 36;
export const WARN_AUDIT_AGE_DAYS = 14;

export function severityForUsedPct(ratio: number | null): Severity {
  if (ratio == null) return 'ok';
  if (ratio >= ERROR_USED_PCT) return 'error';
  if (ratio >= WARN_USED_PCT) return 'warn';
  return 'ok';
}
export const severityForProjected = (projected: number | null, limit: number): Severity => (projected != null && projected > limit ? 'warn' : 'ok');
export const severityForRunAge = (hours: number | null): Severity => (hours != null && hours > WARN_RUN_AGE_HOURS ? 'warn' : 'ok');
export const severityForAtLeastOne = (n: number | null): Severity => (n != null && n >= 1 ? 'warn' : 'ok');
export const severityForAuditAge = (days: number | null): Severity => (days != null && days > WARN_AUDIT_AGE_DAYS ? 'warn' : 'ok');

// ── 오류 문자열 정리 ──

const SECRET_PATTERNS: [RegExp, string][] = [
  [/\b[a-z][a-z0-9+.-]*:\/\/[^\s'")]+/gi, '[url]'],
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [masked]'],
  [/\b(?:key|token|apikey|api_key|secret|password|pwd)\s*[=:]\s*[^\s&'",;]+/gi, '[masked]'],
  [/\bsk-[A-Za-z0-9_-]{8,}/g, '[masked]'],
  [/\bAIza[A-Za-z0-9_-]{10,}/g, '[masked]'],
  [/\b(?:ghp|gho|github_pat)_[A-Za-z0-9_]{10,}/g, '[masked]'],
];

/** 줄바꿈·스택 제거, 비밀 패턴 마스킹, 최대 길이로 자름 */
export function sanitizeErrorMessage(input: unknown, max = 120): string {
  let s = input instanceof Error ? input.message : typeof input === 'string' ? input : String(input ?? '');
  s = (s.split('\n')[0] ?? '').replace(/\s+at\s+\S+\s*\(.*$/, '');
  for (const [re, rep] of SECRET_PATTERNS) s = s.replace(re, rep);
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ── 섹션 상태 ──

export function buildSectionStatus(
  metrics: readonly Pick<CoverageMetric, 'status'>[],
  tables: readonly Pick<CoverageTable, 'status'>[],
): CoverageSection['status'] {
  const all = [...metrics.map((m) => m.status), ...tables.map((t) => t.status)];
  if (all.length === 0) return 'na';
  const ok = all.filter((s) => s === 'ok').length;
  const failed = all.filter((s) => s === 'failed').length;
  if (failed === 0) return ok === 0 ? 'na' : 'ok';
  return failed === all.length ? 'failed' : 'partial';
}

// ── 스냅샷 평탄화·비교 ──

export const SNAPSHOT_MAX_BYTES = 25_000;
const NUMERIC_KINDS = new Set(['count', 'ratio', 'usd', 'hours']);

export const isNumericKind = (k: string): boolean => NUMERIC_KINDS.has(k);

export function cellKey(tableId: string, rowKey: string, colKey: string): string {
  return `${tableId}:${rowKey}:${colKey}`;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function flattenForSnapshot(
  sections: readonly CoverageSection[],
  meta: { takenAt: string; partial: boolean },
  maxBytes = SNAPSHOT_MAX_BYTES,
): CoverageSnapshotSummary {
  const metrics: Record<string, number | null> = {};
  const cells: Record<string, number | null> = {};
  for (const s of sections) {
    for (const m of s.metrics) {
      if (!isNumericKind(m.kind)) continue;
      metrics[m.id] = m.status === 'ok' && typeof m.value === 'number' ? round6(m.value) : null;
    }
    for (const t of s.tables) {
      if (!t.diffable || t.status !== 'ok') continue;
      const numericCols = t.columns.filter((c) => isNumericKind(c.kind));
      for (const r of t.rows) {
        for (const c of numericCols) {
          const v = r.cells[c.key];
          cells[cellKey(t.id, r.key, c.key)] = typeof v === 'number' ? round6(v) : null;
        }
      }
    }
  }
  const snap: CoverageSnapshotSummary = { schemaVersion: 1, takenAt: meta.takenAt, partial: meta.partial, metrics, cells };
  // 크기 상한: 초과하면 셀을 뒤에서부터 덜어낸다(지표는 유지)
  if (Buffer.byteLength(JSON.stringify(snap), 'utf8') > maxBytes) {
    const keys = Object.keys(cells);
    for (let i = keys.length - 1; i >= 0 && Buffer.byteLength(JSON.stringify(snap), 'utf8') > maxBytes; i--) {
      delete cells[keys[i] as string];
    }
  }
  return snap;
}

export function deltaOf(kind: string, current: number | null, baseline: number | null): number | null {
  if (current == null || baseline == null || !Number.isFinite(current) || !Number.isFinite(baseline)) return null;
  const d = kind === 'ratio' ? (current - baseline) * 100 : current - baseline;
  return round6(d);
}

/**
 * 현재값에 비교 기준(스냅샷)을 병합한다 — count/usd/hours 는 차이, ratio 는 퍼센트포인트 차이.
 * 기준이 없으면(null) 모든 baseline/delta 를 null 로 둔다. 입력은 변경하지 않는다.
 */
export function applyBaselineDelta(sections: readonly CoverageSection[], snapshot: CoverageSnapshotSummary | null): CoverageSection[] {
  return sections.map((s) => ({
    ...s,
    metrics: s.metrics.map((m) => {
      if (!snapshot || !isNumericKind(m.kind)) return { ...m, baseline: null, delta: null };
      const base = snapshot.metrics[m.id];
      const baseline = typeof base === 'number' ? base : null;
      const cur = m.status === 'ok' && typeof m.value === 'number' ? m.value : null;
      return { ...m, baseline, delta: deltaOf(m.kind, cur, baseline) };
    }),
    tables: s.tables.map((t) => {
      if (!t.diffable || !snapshot || t.status !== 'ok') {
        return { ...t, rows: t.rows.map(({ delta: _d, ...r }) => r) };
      }
      const numericCols = t.columns.filter((c) => isNumericKind(c.kind));
      return {
        ...t,
        rows: t.rows.map((r) => {
          const delta: Record<string, number | null> = {};
          for (const c of numericCols) {
            const cur = r.cells[c.key];
            const b = snapshot.cells[cellKey(t.id, r.key, c.key)];
            delta[c.key] = deltaOf(c.kind, typeof cur === 'number' ? cur : null, typeof b === 'number' ? b : null);
          }
          return { ...r, delta };
        }),
      };
    }),
  }));
}
