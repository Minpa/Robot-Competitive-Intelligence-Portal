/**
 * 주간 브리프 v2(장문 리포트) 표시용 순수 함수 — 화면 컴포넌트와 정적 HTML 빌더가 함께 쓴다.
 *
 *  - 섹션 가시성·번호·앵커·목차·읽기 시간·차트 기하(좌표/막대 폭)를 여기서 계산한다. 화면과 다운로드 HTML 이 같은 결과를 쓴다.
 *  - 출력에 `undefined` / `null` / `NaN` 문자열이 나오지 않게 모든 포맷터가 값 없음을 빈 문자열로 돌려준다.
 *  - 날짜는 고정 KST 산술(weekly-brief-format) — 프로세스 TZ 와 무관.
 */

import type {
  BriefDomainKey,
  WeeklyBriefCounts,
  WeeklyBriefDeltas,
  WeeklyDomainBlock,
  WeeklyEvidenceCard,
  WeeklyKeyword,
  WeeklyReportEvidence,
  WeeklyReportPayload,
  WeeklyVolumeWeek,
} from '@/types/weekly-brief';
import { POSTER_COLORS, POSTER_TOP_BAR } from '@/lib/weekly-brief-theme';
import { buildStatItems, keywordDeltaText } from '@/lib/weekly-brief-format';

// ───────────────────────── 상수 ─────────────────────────

/** 읽기 시간 = 총 글자 수 ÷ 분당 글자 수 (올림). 튜닝 가능한 상수 */
export const READING_CHARS_PER_MIN = 600;
/** 영상 섹션에 표시할 목표 최소 개수 — 이보다 적으면 "수집 영상이 적어 N건만 표시" 안내 */
export const VIDEOS_TARGET_MIN = 8;

export const REPORT_TOC_ID = 'report-toc';
export const REPORT_TOP_ID = 'report-top';

export type ReportSectionKey = 'glance' | 'domains' | 'companies' | 'videos' | 'papers' | 'news' | 'trends' | 'watch';

/** 섹션 고정 목록 (표시 순서 = 번호 순서). id 는 앵커이자 목차 링크 대상이다 */
export const REPORT_SECTION_DEFS: readonly { key: ReportSectionKey; id: string; title: string; subtitle: string }[] = [
  { key: 'glance', id: 'sec-glance', title: '이번 주 한눈에', subtitle: '이번 주 가장 중요한 변화를 근거와 함께 요약합니다' },
  { key: 'domains', id: 'sec-domains', title: '도메인별 동향', subtitle: '핸드 · 액추에이터 · RFM · 전시 · 양산 5개 축의 수집 동향' },
  { key: 'companies', id: 'sec-companies', title: '회사별 움직임', subtitle: '회사별 수집 건수와 CI(경쟁사 정보) 변경' },
  { key: 'videos', id: 'sec-videos', title: '영상', subtitle: '조회수·분석 기준 상위 영상 · 수집 시점 조회수 · 클릭하면 유튜브 원본' },
  { key: 'papers', id: 'sec-papers', title: '논문', subtitle: 'arXiv 논문 · 도메인 다양성 반영 · 제목 클릭 시 arXiv 원문' },
  { key: 'news', id: 'sec-news', title: '뉴스·기사', subtitle: '출처 다양성을 반영한 기사 · 제목 클릭 시 원문' },
  { key: 'trends', id: 'sec-trends', title: '수치와 키워드 추이', subtitle: '최근 8주 수집량과 이번 주 키워드 증감' },
  { key: 'watch', id: 'sec-watch', title: '다음 주 관찰 포인트', subtitle: '이번 주 데이터에서 근거가 확인되는 추적 항목' },
];

export const DOMAIN_BLOCK_IDS: Record<BriefDomainKey, string> = {
  hand: 'dom-hand',
  actuator: 'dom-actuator',
  rfm: 'dom-rfm',
  expo: 'dom-expo',
  production: 'dom-production',
};

export const REPORT_QUIET_LINE = '이번 주 특이사항 없음';
export const REPORT_RULE_SECTION_NOTICE = '이 섹션은 자동 집계 문장입니다';
export const REPORT_WHY_LABEL = '왜 중요한가 (AI 생성)';
export const REPORT_TOP_VIDEO_BADGE = '가장 많이 본 영상';
export const REPORT_AI_NOTICE = 'AI 생성 문장은 서버가 집계한 수치와 근거만을 바탕으로 합니다.';
export const REPORT_UNKNOWN_VERSION_NOTICE = '이 브리프는 더 새로운 형식입니다. 새로고침 후에도 보이지 않으면 관리자에게 문의하세요.';
export const REPORT_VIEWS_NOTE = '조회수는 수집 시점 값입니다';
export const REPORT_LABELS = { toc: '목차', backToTop: '맨 위로', original: '원제', cover: '주간 브리프' } as const;

export const REPORT_EVIDENCE_LABELS: Record<WeeklyReportEvidence['type'], string> = {
  video: '영상',
  paper: '논문',
  article: '기사',
  ci: 'CI',
  keyword: '키워드',
};

/** 도메인 카드/근거 종류 라벨 (카드 type) */
export function cardTypeLabel(t: WeeklyEvidenceCard['type']): string {
  return t === 'video' ? '영상' : t === 'paper' ? '논문' : '기사';
}

// ───────────────────────── 값 도우미 ─────────────────────────

/** 정수·소수 1자리까지 불필요한 0 없이 (NaN/null → '') */
export function formatNumber(v: number | null | undefined, digits = 1): string {
  if (v == null || !Number.isFinite(v)) return '';
  return String(Number(v.toFixed(digits)));
}

/** 천 단위 쉼표 (NaN/null → '') */
export function formatCount(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '';
  return Math.round(v).toLocaleString('en-US');
}

/** 퍼센트포인트 증감: 4.2 → '▲4.2%p', -1.3 → '▼1.3%p', 0 → '±0%p' (null → '') */
export function formatDeltaPp(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '';
  const body = formatNumber(Math.abs(v));
  if (Number(body) === 0) return '±0%p';
  return `${v > 0 ? '▲' : '▼'}${body}%p`;
}

/** 막대 폭(%) — 0~100 으로 클램프한 소수 1자리. max 가 0 이하이거나 값이 비정상이면 0 */
export function barWidth(value: number | null | undefined, max: number | null | undefined): number {
  if (value == null || max == null || !Number.isFinite(value) || !Number.isFinite(max) || max <= 0 || value <= 0) return 0;
  const pct = (value / max) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)) * 10) / 10;
}

/** 한글 제목이 있으면 한글을 주 제목으로, 원제는 작게 아래에. 없으면 원제만 */
export function titlePair(title: string, titleKo: string | null | undefined): { main: string; sub: string } {
  const ko = (titleKo ?? '').trim();
  return ko ? { main: ko, sub: title } : { main: title, sub: '' };
}

// ───────────────────────── 버전 판별 ─────────────────────────

export type ReportVersionKind = 'v1' | 'v2' | 'unknown';

/** payload.schemaVersion → 렌더 방식 (없거나 1 → v1, 2 → v2, 그보다 크면 알 수 없는 형식) */
export function versionKindOf(payload: unknown): ReportVersionKind {
  const v = (payload as { schemaVersion?: unknown } | null | undefined)?.schemaVersion;
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 1;
  return n <= 1 ? 'v1' : n === 2 ? 'v2' : 'unknown';
}

// ───────────────────────── 빈 판정·섹션 계획 ─────────────────────────

/** 이번 주 수집 자료가 하나도 없는지 ("이번 주 수집된 데이터가 부족합니다" 안내 판정) */
export function isReportEmpty(p: WeeklyReportPayload): boolean {
  const c = p.header.counts;
  return (
    c.videosNew + c.articles + c.papers === 0 &&
    p.highlights.length === 0 &&
    p.videos.length === 0 &&
    p.papers.length === 0 &&
    p.articles.length === 0 &&
    p.companies.length === 0
  );
}

export interface PlannedSection {
  key: ReportSectionKey;
  id: string;
  /** 보이는 섹션 기준 순번 '01' … */
  number: string;
  title: string;
  subtitle: string;
  /** 헤더 우측 건수 (없으면 null) */
  countLabel: string | null;
  /** 규칙(자동 집계) 문장만으로 쓰인 섹션이면 안내 문구, 아니면 null */
  notice: string | null;
}

function visibleKeys(p: WeeklyReportPayload): ReportSectionKey[] {
  if (isReportEmpty(p)) return [];
  const keys: ReportSectionKey[] = [];
  if (p.highlights.length > 0) keys.push('glance');
  keys.push('domains');
  if (p.companies.length > 0) keys.push('companies');
  if (p.videos.length > 0) keys.push('videos');
  if (p.papers.length > 0) keys.push('papers');
  if (p.articles.length > 0) keys.push('news');
  keys.push('trends');
  if (p.watchPoints.length > 0) keys.push('watch');
  return keys;
}

function countLabelOf(p: WeeklyReportPayload, key: ReportSectionKey): string | null {
  switch (key) {
    case 'glance':
      return `${p.highlights.length}개`;
    case 'domains':
      return `활성 ${p.domains.filter((d) => d.status === 'active').length}/${p.domains.length}`;
    case 'companies':
      return `${p.companies.length}개사`;
    case 'videos':
      return `${p.videos.length}건`;
    case 'papers':
      return `${p.papers.length}편`;
    case 'news':
      return `${p.articles.length}건`;
    case 'watch':
      return `${p.watchPoints.length}개`;
    default:
      return null;
  }
}

function noticeOf(p: WeeklyReportPayload, key: ReportSectionKey): string | null {
  const src = p.meta.sectionSources;
  const map: Partial<Record<ReportSectionKey, keyof typeof src>> = { glance: 'highlights', domains: 'domains', companies: 'companies', trends: 'trends', watch: 'watch' };
  const k = map[key];
  return k && src[k] === 'rule' ? REPORT_RULE_SECTION_NOTICE : null;
}

/** 보이는 섹션만 순서·번호·앵커와 함께 돌려준다. 빈 섹션은 목차와 번호에서 빠진다 */
export function planReportSections(p: WeeklyReportPayload): PlannedSection[] {
  const keys = visibleKeys(p);
  return keys.map((key, i) => {
    const def = REPORT_SECTION_DEFS.find((d) => d.key === key)!;
    const subtitle = key === 'videos' && p.videos.length < VIDEOS_TARGET_MIN ? `이번 주 수집 영상이 적어 ${p.videos.length}건만 표시합니다 · 수집 시점 조회수` : def.subtitle;
    return { key, id: def.id, number: String(i + 1).padStart(2, '0'), title: def.title, subtitle, countLabel: countLabelOf(p, key), notice: noticeOf(p, key) };
  });
}

export interface TocItem {
  id: string;
  label: string;
}

/** 목차 항목 — 보이는 섹션과 정확히 일치한다 (죽은 앵커 없음) */
export function buildToc(sections: readonly PlannedSection[]): TocItem[] {
  return sections.map((s) => ({ id: s.id, label: `${s.number} ${s.title}` }));
}

/** 문서 안에 존재해야 하는 앵커 id 전체 (섹션 + 도메인 블록 + 목차 + 맨 위) */
export function reportAnchorIds(p: WeeklyReportPayload): string[] {
  const sections = planReportSections(p);
  const ids = [REPORT_TOP_ID, ...sections.map((s) => s.id)];
  if (sections.length > 0) ids.push(REPORT_TOC_ID);
  if (sections.some((s) => s.key === 'domains')) ids.push(...p.domains.map((d) => DOMAIN_BLOCK_IDS[d.key]));
  return ids;
}

// ───────────────────────── 글자 수·읽기 시간 ─────────────────────────

function len(s: string | null | undefined): number {
  return s ? Array.from(s).length : 0;
}

/** 화면에 읽을거리로 나오는 글자 수 (제목·서술·파생 요약). 결정적이며 payload 에서만 계산한다 */
export function reportTextChars(p: WeeklyReportPayload): number {
  let n = 0;
  for (const h of p.highlights) n += len(h.headline) + len(h.body);
  for (const d of p.domains) {
    n += d.status === 'active' ? len(d.narrative) : len(REPORT_QUIET_LINE);
    for (const e of d.evidence) n += len(e.titleKo ?? e.title) + len(e.line);
  }
  for (const c of p.companies) {
    n += len(c.blurb);
    for (const i of c.items) n += len(i.titleKo ?? i.title);
    for (const k of c.ciChanges) n += len(k.item) + len(k.after) + len(k.meaning);
  }
  for (const v of p.videos) n += len(v.titleKo ?? v.title) + v.summaryLines.reduce((a, s) => a + len(s), 0);
  for (const x of p.papers) n += len(x.titleKo ?? x.title) + x.summaryLines.reduce((a, s) => a + len(s), 0) + len(x.whyItMatters);
  for (const a of p.articles) n += len(a.titleKo ?? a.title) + a.summaryLines.reduce((acc, s) => acc + len(s), 0);
  n += len(p.trends.keywordNote);
  for (const w of p.watchPoints) n += len(w.title) + len(w.body);
  return n;
}

/** 읽기 시간(분) = 총 글자 수 ÷ 600 올림. 읽을거리가 없으면(데이터 전무) 0 */
export function estimateReadingMinutes(p: WeeklyReportPayload): number {
  if (isReportEmpty(p)) return 0;
  const chars = reportTextChars(p);
  return chars <= 0 ? 0 : Math.ceil(chars / READING_CHARS_PER_MIN);
}

export function formatReadingTime(minutes: number): string {
  return minutes > 0 ? `읽는 시간 약 ${minutes}분` : '';
}

// ───────────────────────── 커버 수치 카드 ─────────────────────────

export interface CoverStat {
  label: string;
  value: string;
  /** '▲12%' 같은 기호 포함 증감 (없으면 '') */
  delta: string;
  /** 스크린리더/표시용 문구: '전주 대비 ▲12%' 또는 '전주 대비 없음' */
  deltaPhrase: string;
}

const COVER_ORDER = ['영상', '기사', '논문', '분석', 'CI 변경', '알림'] as const;
const COVER_LABELS: Record<(typeof COVER_ORDER)[number], string> = { 영상: '영상', 기사: '기사', 논문: '논문', 분석: '분석 영상', 'CI 변경': 'CI 변경', 알림: '알림' };

/** 커버 수치 카드: 영상 · 기사 · 논문 · 분석 영상 · CI 변경 · 알림 (건수와 전주 대비, 기호와 문구 병기) */
export function buildCoverStats(counts: WeeklyBriefCounts, deltas: WeeklyBriefDeltas): CoverStat[] {
  const items = buildStatItems(counts, deltas);
  return COVER_ORDER.map((k) => {
    const it = items.find((i) => i.label === k);
    const delta = it?.delta ?? '';
    return { label: COVER_LABELS[k], value: formatCount(it?.value ?? 0), delta, deltaPhrase: delta ? `전주 대비 ${delta}` : '전주 대비 없음' };
  });
}

// ───────────────────────── 도메인·회사 도우미 ─────────────────────────

/** 도메인 블록 수치 줄: '영상 9건 · 논문 6건 · 점유율 14.4% · 지난주 12% (▲2.4%p)' */
export function domainFigureLine(d: WeeklyDomainBlock): string {
  const f = d.figures;
  const second = f.secondKind === 'paper' ? '논문' : '기사';
  const parts = [`영상 ${formatCount(f.videos)}건`, `${second} ${formatCount(f.second)}건`, `점유율 ${formatNumber(f.sharePct)}%`];
  if (f.prevSharePct != null) {
    const delta = formatDeltaPp(f.deltaPp);
    parts.push(`지난주 ${formatNumber(f.prevSharePct)}%${delta ? ` (${delta})` : ''}`);
  }
  return parts.join(' · ');
}

/** quiet 도메인의 수집 건수 줄 */
export function quietCountLine(d: WeeklyDomainBlock): string {
  const second = d.figures.secondKind === 'paper' ? '논문' : '기사';
  return `수집 ${formatCount(d.figures.total)}건 (영상 ${formatCount(d.figures.videos)} · ${second} ${formatCount(d.figures.second)})`;
}

/** 회사 카드 건수 줄: '이번 주 20건 (영상 6 · 기사 14) · 지난주 8건 (▲150%)' */
export function companyCountLine(c: { counts: { total: number; videos: number; articles: number; prevTotal: number; deltaPct: number | null } }): string {
  const k = c.counts;
  const delta = k.deltaPct == null ? '' : k.deltaPct > 0 ? ` (▲${formatNumber(k.deltaPct)}%)` : k.deltaPct < 0 ? ` (▼${formatNumber(Math.abs(k.deltaPct))}%)` : ' (±0%)';
  const base = k.total > 0 ? `이번 주 ${formatCount(k.total)}건 (영상 ${formatCount(k.videos)} · 기사 ${formatCount(k.articles)})` : '이번 주 수집 없음';
  return `${base} · 지난주 ${formatCount(k.prevTotal)}건${delta}`;
}

/** 회사 카드에 붙지 않은 CI 갱신 건수 ("그 외 CI 갱신 n건") */
export function otherCiUpdates(p: Pick<WeeklyReportPayload, 'ciSummary' | 'companies'>): number {
  const shown = p.companies.reduce((n, c) => n + c.ciChanges.length, 0);
  return Math.max(0, (p.ciSummary?.updates ?? 0) - shown);
}

// ───────────────────────── 추이 차트 모델 ─────────────────────────

export function weekTotal(w: Pick<WeeklyVolumeWeek, 'videos' | 'articles' | 'papers'>): number {
  return (w.videos || 0) + (w.articles || 0) + (w.papers || 0);
}

/** 'YYYY-MM-DD' → 'MM-DD' (형식이 아니면 '') */
export function weekLabel(weekStart: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(weekStart);
  return m ? `${m[1]}-${m[2]}` : '';
}

/** 데이터가 있는 주(합계 > 0)가 2주 이상이어야 차트를 그린다 */
export function hasTrendChart(weeks: readonly WeeklyVolumeWeek[]): boolean {
  return weeks.filter((w) => weekTotal(w) > 0).length >= 2;
}

export interface SparkPoint {
  x: number;
  y: number;
  week: string;
  total: number;
}

export interface SparkModel {
  width: number;
  height: number;
  points: SparkPoint[];
  /** SVG polyline points 속성 값 — 좌표는 소수 1자리 */
  polyline: string;
  max: number;
  last: SparkPoint;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 주별 총량 스파크라인 기하. 차트를 그릴 수 없으면(2주 미만) null */
export function sparklineModel(weeks: readonly WeeklyVolumeWeek[], size: { width?: number; height?: number; pad?: number } = {}): SparkModel | null {
  if (!hasTrendChart(weeks)) return null;
  const width = size.width ?? 640;
  const height = size.height ?? 96;
  const pad = size.pad ?? 8;
  const totals = weeks.map(weekTotal);
  const max = Math.max(...totals);
  const n = weeks.length;
  const points: SparkPoint[] = weeks.map((w, i) => {
    const x = n === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (n - 1);
    const y = max <= 0 ? height - pad : pad + (height - 2 * pad) * (1 - (totals[i] ?? 0) / max);
    return { x: r1(x), y: r1(y), week: weekLabel(w.weekStart), total: totals[i] ?? 0 };
  });
  return { width, height, points, polyline: points.map((p) => `${p.x},${p.y}`).join(' '), max, last: points[points.length - 1]! };
}

export interface BarRow {
  label: string;
  /** 표시 값 (예: '412') */
  value: string;
  /** 막대 폭 % (0~100, 소수 1자리) */
  pct: number;
  /** 보조 문구 (예: '▲12%') */
  note: string;
  /** 이번 주 행 강조 */
  current?: boolean;
}

/** 8주 수집량 막대 행 (오래된 주부터) */
export function volumeBarRows(weeks: readonly WeeklyVolumeWeek[], currentWeekStart: string): BarRow[] {
  const max = Math.max(0, ...weeks.map(weekTotal));
  return weeks.map((w) => ({
    label: weekLabel(w.weekStart),
    value: formatCount(weekTotal(w)),
    pct: barWidth(weekTotal(w), max),
    note: `영상 ${formatCount(w.videos)} · 기사 ${formatCount(w.articles)} · 논문 ${formatCount(w.papers)}`,
    current: w.weekStart === currentWeekStart,
  }));
}

export interface CompareRow {
  label: string;
  cur: number;
  prev: number;
  curPct: number;
  prevPct: number;
  /** '▲12%' / 'NEW' / '' */
  delta: string;
}

/** 이번 주 vs 지난주 건수 비교 (추이 데이터의 마지막 두 주). 지난주 값이 없으면 빈 배열 */
export function compareRows(weeks: readonly WeeklyVolumeWeek[], currentWeekStart: string): CompareRow[] {
  const cur = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];
  if (!cur || !prev || cur.weekStart !== currentWeekStart) return [];
  const defs: { label: string; key: 'videos' | 'articles' | 'papers' }[] = [
    { label: '영상', key: 'videos' },
    { label: '기사', key: 'articles' },
    { label: '논문', key: 'papers' },
  ];
  return defs.map(({ label, key }) => {
    const c = cur[key] || 0;
    const pv = prev[key] || 0;
    const max = Math.max(c, pv);
    const delta = pv > 0 ? (c === pv ? '±0%' : `${c > pv ? '▲' : '▼'}${formatNumber(Math.abs(((c - pv) / pv) * 100))}%`) : c > 0 ? 'NEW' : '';
    return { label, cur: c, prev: pv, curPct: barWidth(c, max), prevPct: barWidth(pv, max), delta };
  });
}

export interface KeywordRow {
  term: string;
  count: string;
  prevCount: string;
  /** '+41%' / '-12%' / 'NEW' / '12회' */
  deltaText: string;
  /** 방향 기호: ▲ ▼ NEW ― */
  symbol: string;
  pct: number;
  direction: WeeklyKeyword['direction'];
}

const DIRECTION_SYMBOL: Record<WeeklyKeyword['direction'], string> = { up: '▲', down: '▼', new: 'NEW', flat: '―' };

/** 키워드 표 행 (용어, 이번 주, 지난주, 증감, 방향 막대) */
export function keywordRows(keywords: readonly WeeklyKeyword[]): KeywordRow[] {
  const max = Math.max(0, ...keywords.map((k) => k.count));
  return keywords.map((k) => ({
    term: k.term,
    count: formatCount(k.count),
    prevCount: formatCount(k.prevCount),
    deltaText: keywordDeltaText(k),
    symbol: DIRECTION_SYMBOL[k.direction] ?? '―',
    pct: barWidth(k.count, max),
    direction: k.direction,
  }));
}

/** 키워드 표는 3개 이상일 때만 보인다 */
export function hasKeywordTable(p: Pick<WeeklyReportPayload, 'trends'>): boolean {
  return p.trends.keywords.length >= 3;
}

// ───────────────────────── 대비 (글자색 × 배경) ─────────────────────────

/** WCAG 상대 휘도 대비 (#RRGGBB) */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string): number => {
    const h = hex.replace('#', '');
    const [r, g, bl] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
    const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(bl!);
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const BG = { poster: POSTER_COLORS.base, band: POSTER_COLORS.band, pill: POSTER_COLORS.pill, card: POSTER_COLORS.card, topBar: POSTER_TOP_BAR } as const;
const FG = { fg: POSTER_COLORS.fg, fg2: POSTER_COLORS.fg2, fg3: POSTER_COLORS.fg3 } as const;

/**
 * 리포트가 실제로 쓰는 글자색 × 배경 조합. 모든 조합이 4.5:1 이상이어야 한다(테스트가 검사).
 *  - 본문·제목: fg. 보조: fg2 (poster/band/card 위에서만 — pill 위는 fg).
 *  - fg3 는 poster 배경과 상단 바 위 메타에만 쓴다. band/card/pill 위에는 쓰지 않는다.
 */
export const REPORT_CONTRAST_PAIRS: readonly { use: string; fg: keyof typeof FG; bg: keyof typeof BG }[] = [
  { use: '본문·제목 (포스터 면)', fg: 'fg', bg: 'poster' },
  { use: '보조 문구 (포스터 면)', fg: 'fg2', bg: 'poster' },
  { use: '메타 문구 (포스터 면)', fg: 'fg3', bg: 'poster' },
  { use: '섹션 헤더 제목 (밴드)', fg: 'fg', bg: 'band' },
  { use: '섹션 헤더 부제·건수 (밴드)', fg: 'fg2', bg: 'band' },
  { use: '카드 본문·제목', fg: 'fg', bg: 'card' },
  { use: '카드 보조 문구', fg: 'fg2', bg: 'card' },
  { use: '배지·칩 글자', fg: 'fg', bg: 'pill' },
  { use: '상단 바 로고', fg: 'fg', bg: 'topBar' },
  { use: '상단 바 메타', fg: 'fg3', bg: 'topBar' },
];

export function reportContrastTable(): { use: string; fg: string; bg: string; ratio: number }[] {
  return REPORT_CONTRAST_PAIRS.map((p) => ({ use: p.use, fg: FG[p.fg], bg: BG[p.bg], ratio: Math.round(contrastRatio(FG[p.fg], BG[p.bg]) * 100) / 100 }));
}
