/**
 * 주간 브리프 표시용 순수 함수 — 화면 컴포넌트와 정적 HTML 빌더가 함께 쓴다.
 *
 *  - 날짜는 프로세스 TZ가 아니라 고정 KST(UTC+9) 산술로 포맷한다 (DST 없음, 실행 환경과 무관).
 *  - weekStart 는 문자열로만 다룬다 (검증용 파싱에서만 UTC 산술 사용).
 *  - 외부 링크는 안전 헬퍼(safeVideoHref / safeThumbSrc / safeArticleHref)를 통과한 값만 href/src 로 쓴다.
 */

import type {
  BriefDomainKey,
  WeeklyBriefCounts,
  WeeklyBriefDeltas,
  WeeklyBriefListItem,
  WeeklyBriefPayload,
  WeeklyBriefResponse,
  WeeklyKeyMessage,
  WeeklyKeyword,
} from '@/types/weekly-brief';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// ───────────────────────── 날짜·기간 ─────────────────────────

interface Ymd {
  y: number;
  m: number;
  d: number;
}

function parseYmd(ymd: string | null | undefined): Ymd | null {
  if (!ymd) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

/** 'YYYY-MM-DD' 형식이고 실존하는 날짜이며 월요일이면 true (프로세스 TZ 무관) */
export function isValidWeekStart(s: string | null | undefined): boolean {
  const p = parseYmd(s);
  if (!p) return false;
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() === 1;
}

/** '2026-10-19', '2026-10-25' → '2026-10-19 ~ 10-25' (연이 바뀌면 '2026-12-28 ~ 2027-01-03') */
export function formatPeriod(weekStart: string, weekEnd: string): string {
  const s = parseYmd(weekStart);
  const e = parseYmd(weekEnd);
  if (!s || !e) return [weekStart, weekEnd].filter(Boolean).join(' ~ ');
  const end = s.y === e.y ? `${pad2(e.m)}-${pad2(e.d)}` : weekEnd;
  return `${weekStart} ~ ${end}`;
}

/** h1 2번째 줄·아카이브 행·<title> 에 공통으로 쓰는 중립 표기: '2026-10-19 ~ 10-25 · Week 43' */
export function formatWeekTitle(weekStart: string, weekEnd: string, weekNumber: number): string {
  return `${formatPeriod(weekStart, weekEnd)} · Week ${weekNumber}`;
}

function kstParts(iso: string | null | undefined): { y: number; mo: number; d: number; h: number; mi: number } | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const k = new Date(t + KST_OFFSET_MS);
  return { y: k.getUTCFullYear(), mo: k.getUTCMonth() + 1, d: k.getUTCDate(), h: k.getUTCHours(), mi: k.getUTCMinutes() };
}

/** ISO → KST 'YYYY-MM-DD' (잘못된 값은 '') */
export function formatKstDate(iso: string | null | undefined): string {
  const p = kstParts(iso);
  return p ? `${p.y}-${pad2(p.mo)}-${pad2(p.d)}` : '';
}

/** ISO → KST 'YYYY-MM-DD HH:mm' (잘못된 값은 '') */
export function formatKstDateTime(iso: string | null | undefined): string {
  const p = kstParts(iso);
  return p ? `${p.y}-${pad2(p.mo)}-${pad2(p.d)} ${pad2(p.h)}:${pad2(p.mi)}` : '';
}

/** ISO → KST 'MM-DD' (잘못된 값은 '') */
export function formatKstMonthDay(iso: string | null | undefined): string {
  const p = kstParts(iso);
  return p ? `${pad2(p.mo)}-${pad2(p.d)}` : '';
}

/** 상단 바 우측: '생성 2026-10-26 08:00 KST' */
export function formatGeneratedLabel(iso: string | null | undefined): string {
  const t = formatKstDateTime(iso);
  return t ? `생성 ${t} KST` : '';
}

// ───────────────────────── 숫자 ─────────────────────────

/** 수집 시점 조회수: 950 → '950', 1200 → '1.2K', 480000 → '480K', 1200000 → '1.2M' (null/음수/NaN → '') */
export function formatViews(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) return '';
  if (n < 1000) return String(Math.round(n));
  if (n < 1_000_000) {
    const k = n / 1000;
    const r = k < 10 ? Math.round(k * 10) / 10 : Math.round(k);
    if (r < 1000) return `${r}K`;
  }
  const m = n / 1_000_000;
  const r = m < 10 ? Math.round(m * 10) / 10 : Math.round(m);
  return `${r}M`;
}

function trimNumber(abs: number): string {
  return String(Number(abs.toFixed(1)));
}

/** 전주 대비 증감(%) → '▲12%' / '▼3.5%' / '±0%'. null·NaN 은 '' */
export function formatDeltaPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '';
  const body = trimNumber(Math.abs(v));
  if (Number(body) === 0) return '±0%';
  return `${v > 0 ? '▲' : '▼'}${body}%`;
}

/** 부호 포함 퍼센트: 41 → '+41%', -12 → '-12%', 0 → '0%' (null 은 '') */
export function formatSignedPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '';
  const body = trimNumber(Math.abs(v));
  if (Number(body) === 0) return '0%';
  return `${v > 0 ? '+' : '-'}${body}%`;
}

/** 칩 우측 값: new → 'NEW', 증감률 없음 → '{count}회', 그 외 부호 포함 % */
export function keywordDeltaText(k: Pick<WeeklyKeyword, 'direction' | 'deltaPct' | 'count'>): string {
  if (k.direction === 'new') return 'NEW';
  if (k.deltaPct == null) return `${k.count}회`;
  return formatSignedPct(k.deltaPct);
}

export interface KeywordHero {
  value: string;
  unit: string;
  caption: string;
}

/**
 * 키워드 밴드 대표(keywords[0]) 큰 숫자.
 * 비교 가능(전주 ≥3, deltaPct 있음)하면 증감률, 아니면 이번 주 언급 횟수.
 */
export function keywordHero(k: WeeklyKeyword): KeywordHero {
  if (k.deltaPct != null && k.prevCount >= 3 && k.direction !== 'new') {
    const signed = formatSignedPct(k.deltaPct);
    return { value: signed.replace(/%$/, ''), unit: '%', caption: `지난주 대비 · ${k.prevCount}회 → ${k.count}회` };
  }
  return { value: String(k.count), unit: '회', caption: '이번 주 언급 횟수' };
}

/** 영상 길이(초) → 'm:ss' / 'h:mm:ss' (null·0 이하 → '') */
export function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec <= 0) return '';
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
}

/** 생성 비용: 0.0412 → '$0.04', 0.004 → '<$0.01', 0 → '$0.00' */
export function formatCostUsd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v < 0) return '';
  if (v > 0 && v < 0.005) return '<$0.01';
  return `$${v.toFixed(2)}`;
}

/** 소요 시간(ms) → '12.3초' / '2분 5초' */
export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '';
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}초`;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}분 ${total % 60}초`;
}

// ───────────────────────── 통계 띠 ─────────────────────────

export interface StatItem {
  label: string;
  value: number;
  /** '▲12%' 등 (증감 없으면 '') */
  delta: string;
}

/** 히어로 하단 통계 띠 항목 — "기사 187 (▲12%) · 영상 41 · 분석 29 · CI 변경 6 · 알림 3" (+ 신규 로봇) */
export function buildStatItems(counts: WeeklyBriefCounts, deltas: WeeklyBriefDeltas): StatItem[] {
  const items: StatItem[] = [
    { label: '기사', value: counts.articles, delta: formatDeltaPct(deltas.articles) },
    { label: '논문', value: counts.papers, delta: formatDeltaPct(deltas.papers) },
    { label: '영상', value: counts.videosNew, delta: formatDeltaPct(deltas.videosNew) },
    { label: '분석', value: counts.videosAnalyzed, delta: formatDeltaPct(deltas.videosAnalyzed) },
    { label: 'CI 변경', value: counts.ciUpdates, delta: formatDeltaPct(deltas.ciUpdates) },
    { label: '알림', value: counts.alerts, delta: formatDeltaPct(deltas.alerts) },
  ];
  if (typeof counts.newRobots === 'number') {
    items.push({ label: '신규 로봇', value: counts.newRobots, delta: '' });
  }
  return items;
}

/** 아카이브 행의 건수 요약 한 줄 (증감 없음) */
export function formatCountsSummary(counts: WeeklyBriefCounts): string {
  return buildStatItems(counts, { articles: null, papers: null, videosNew: null, videosAnalyzed: null, ciUpdates: null, alerts: null })
    .map((i) => `${i.label} ${i.value}`)
    .join(' · ');
}

export const DOMAIN_LABELS: Record<BriefDomainKey, string> = {
  hand: '핸드',
  actuator: '액추에이터',
  rfm: 'RFM',
  expo: '전시',
  production: '양산',
};

export function domainLabel(d: BriefDomainKey | null | undefined): string {
  return d && Object.prototype.hasOwnProperty.call(DOMAIN_LABELS, d) ? DOMAIN_LABELS[d] : '';
}

// ───────────────────────── 안전 링크 ─────────────────────────

const MAX_URL_LENGTH = 2000;
const VIDEO_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'youtu.be']);
const THUMB_HOSTS = new Set(['i.ytimg.com']);
const PAPER_HOSTS = new Set(['arxiv.org']);

function parseHttps(url: string | null | undefined): URL | null {
  if (!url || typeof url !== 'string') return null;
  if (url.length > MAX_URL_LENGTH) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  if (u.username || u.password) return null; // 자격증명(user:pass@) 거부
  return u;
}

/** https + 유튜브 호스트(youtube.com / www.youtube.com / youtu.be)만 통과. 불합격은 '' */
export function safeVideoHref(url: string | null | undefined): string {
  const u = parseHttps(url);
  if (!u || u.port) return '';
  if (!VIDEO_HOSTS.has(u.hostname.toLowerCase())) return '';
  const out = u.toString();
  return out.length > MAX_URL_LENGTH ? '' : out;
}

/** https + i.ytimg.com 만 통과. 불합격은 '' */
export function safeThumbSrc(url: string | null | undefined): string {
  const u = parseHttps(url);
  if (!u || u.port) return '';
  if (!THUMB_HOSTS.has(u.hostname.toLowerCase())) return '';
  const out = u.toString();
  return out.length > MAX_URL_LENGTH ? '' : out;
}

/** https 만 통과(호스트 무제한). 자격증명·길이 2000 초과는 거부. 불합격은 '' */
export function safeArticleHref(url: string | null | undefined): string {
  const u = parseHttps(url);
  if (!u) return '';
  const out = u.toString();
  return out.length > MAX_URL_LENGTH ? '' : out;
}

/** https + arxiv.org 만 통과(safeArticleHref 규칙 + 호스트 검사, 포트 거부). 불합격은 '' */
export function safePaperHref(url: string | null | undefined): string {
  const u = parseHttps(url);
  if (!u || u.port) return '';
  if (!PAPER_HOSTS.has(u.hostname.toLowerCase())) return '';
  const out = u.toString();
  return out.length > MAX_URL_LENGTH ? '' : out;
}

/** 근거 항목 종류별 안전 링크 (keyword 는 항상 '') */
export function safeEvidenceHref(type: 'video' | 'article' | 'ci' | 'keyword', url: string | null | undefined): string {
  if (type === 'video') return safeVideoHref(url);
  if (type === 'keyword') return '';
  return safeArticleHref(url);
}

// ───────────────────────── 기타 ─────────────────────────

/** 영구 링크: ${origin}/share/weekly/${weekStart} (현재 URL 이 아님) */
export function weeklyBriefPermalink(origin: string, weekStart: string): string {
  return `${origin.replace(/\/+$/, '')}/share/weekly/${weekStart}`;
}

/** 다운로드 파일명: ARGOS_WeeklyBrief_{weekStart}_W{N}.html */
export function weeklyBriefFileNameOf(weekStart: string, weekNumber: number): string {
  return `ARGOS_WeeklyBrief_${weekStart}_W${weekNumber}.html`;
}

/** 문자열을 최대 길이로 줄임(말줄임표 포함). 길이 이하면 그대로 */
export function clipText(s: string, max: number): string {
  const chars = Array.from(s);
  return chars.length <= max ? s : `${chars.slice(0, Math.max(0, max - 1)).join('')}…`;
}

// ───────────────────────── 포스터 구성 계획 (화면·HTML 공유) ─────────────────────────


export interface KeyMessagePlan {
  /** 행 A 좌측: keyMessages[0] 이 stat 일 때만. 아니면 null (TopVideoBox 전폭) */
  lead: WeeklyKeyMessage | null;
  /** 이후 메시지: stat → 가운데 정렬 stmt, cause_effect → 인과형 행 */
  rest: WeeklyKeyMessage[];
}

export function planKeyMessages(keyMessages: WeeklyKeyMessage[]): KeyMessagePlan {
  const first = keyMessages[0];
  if (first && first.kind === 'stat') return { lead: first, rest: keyMessages.slice(1) };
  return { lead: null, rest: keyMessages };
}

/** 모든 본문 섹션이 비었는지 ("이번 주 수집된 데이터가 부족합니다" 안내 판정) */
export function isPosterEmpty(
  p: Pick<WeeklyBriefPayload, 'keyMessages' | 'topVideo' | 'ciChanges' | 'keywords' | 'videos' | 'articles'> &
    Partial<Pick<WeeklyBriefPayload, 'papers'>>
): boolean {
  return (
    p.keyMessages.length === 0 &&
    !p.topVideo &&
    p.ciChanges.length === 0 &&
    p.keywords.length === 0 &&
    p.videos.length === 0 &&
    (p.papers?.length ?? 0) === 0 &&
    p.articles.length === 0
  );
}

// ───────────────────────── 구 payload 호환 ─────────────────────────

/** papers 도입(§14) 이전에 저장된 counts/deltas — papers 없음 → counts.papers=0, deltas.papers=null */
export function normalizeCounts<T extends Partial<Pick<WeeklyBriefCounts, 'papers'>>>(counts: T): T & Pick<WeeklyBriefCounts, 'papers'> {
  return { ...counts, papers: typeof counts.papers === 'number' ? counts.papers : 0 };
}

/**
 * 서버 응답 정규화 — papers 도입 이전 payload(papers/counts.papers/deltas.papers 없음)를
 * papers=[]·counts.papers=0·deltas.papers=null 로 채운다. 입력은 변경하지 않는다.
 */
export function normalizeWeeklyBrief(brief: WeeklyBriefResponse): WeeklyBriefResponse {
  const p = brief.payload;
  const h = p.header;
  return {
    ...brief,
    payload: {
      ...p,
      header: {
        ...h,
        counts: normalizeCounts(h.counts),
        deltas: { ...h.deltas, papers: typeof h.deltas.papers === 'number' ? h.deltas.papers : null },
      },
      papers: Array.isArray(p.papers) ? p.papers : [],
    },
  };
}

export function normalizeWeeklyBriefListItem(item: WeeklyBriefListItem): WeeklyBriefListItem {
  return { ...item, counts: normalizeCounts(item.counts) };
}

export const EVIDENCE_TYPE_LABELS: Record<'video' | 'article' | 'ci' | 'keyword', string> = {
  video: '영상',
  article: '기사',
  ci: 'CI',
  keyword: '키워드',
};

/** 논문 밴드 제목·부제 (화면·정적 HTML 공유) */
export const PAPERS_BAND_TITLE = '이번 주 논문';
export function papersBandSubtitle(n: number): string {
  return `arXiv 상위 ${n} · 도메인 다양성 반영 · 제목 클릭 시 arXiv 원문`;
}

export const POSTER_FOOTER_NOTICE =
  '본 브리프는 공개 메타데이터(제목·썸네일 URL·링크)와 ARGOS 집계값, AI 생성 문장만 포함하며 원문을 복제하지 않습니다. 큰 숫자는 모두 DB 집계에서 산출됩니다. 조회수는 수집 시점 값입니다.';
export const POSTER_PARTIAL_NOTICE = '일부 문장은 규칙 기반으로 생성되었습니다.';
export const POSTER_EMPTY_NOTICE = '이번 주 수집된 데이터가 부족합니다';
