/**
 * 주간 브리프 v3(임원판) 순수 로직 — 화면 컴포넌트와 다운로드 HTML 이 함께 쓴다.
 *
 *  - 섹션 계획(번호·앵커·목차), 읽기 시간, 빈 상태 판정, 격차 라벨, 스파크라인 좌표, 문구 상수
 *  - 편집 경로 규칙(백엔드 weekly-brief-edit.ts 와 같은 문법)과 클라이언트 측 입력 점검
 *  - 숫자·방향·링크는 서버가 만든 값이며 이 모듈은 표시 형식만 정한다. 새 숫자를 계산하지 않는다.
 */

import { REPORT_TOP_ID } from '@/lib/weekly-brief-report';
import { WEEKLY_WORDING as W, axisExplainKo, movementLabelKo } from '@/types/weekly-brief-wording';
import { formatKstMonthDay } from '@/lib/weekly-brief-format';
import type {
  ExecGapRow,
  ExecLineRole,
  ExecTechSignal,
  GapPosition,
  WeeklyReportEvidence,
  TechDirection,
  WeeklyBriefDraftListItem,
  WeeklyBriefDraftSummary,
  WeeklyBriefEditLimits,
  WeeklyBriefPublishState,
  WeeklyExecutivePayload,
} from '@/types/weekly-brief';

// ───────────────────────── 앵커·문구 ─────────────────────────

/** 맨 위로 링크가 공유 SectionShell 의 REPORT_TOP_ID 를 가리키므로 같은 값을 쓴다 */
export const EXEC_TOP_ID = REPORT_TOP_ID;
export const EXEC_TOC_ID = 'exec-toc';

export const EXEC_SECTION_IDS = {
  conclusions: 'sec-conclusions',
  gap: 'sec-gap',
  tech: 'sec-tech',
  business: 'sec-business',
  questions: 'sec-questions',
  evidence: 'sec-evidence',
} as const;

export type ExecSectionUiKey = keyof typeof EXEC_SECTION_IDS;

export const EXEC_LABELS = {
  cover: '주간 브리프',
  toc: '목차',
  backToTop: '맨 위로',
  original: '원제',
  views: '조회',
} as const;

/** 읽기 시간 계산 상수: 글자 수 ÷ 분당 글자 수(올림). 튜닝은 여기서만 한다 */
export const EXEC_CHARS_PER_MINUTE = 600;

export const EXEC_EMPTY_NOTICE = '이번 주 수집된 데이터가 부족합니다';
export const EXEC_NO_CONCLUSIONS = W.empty.conclusions;
export const EXEC_NO_GAPS = W.empty.gaps;
export const EXEC_NO_SIGNALS = W.empty.tech;
export const EXEC_NO_PAPERS = W.empty.papers;
/** 짧은 배지 문구 */
export const EXEC_OURS_MISSING_BADGE = W.oursMissing.badge;
/** 카드 안 설명 문구 */
export const EXEC_OURS_MISSING_NOTE = W.oursMissing.long;
export const EXEC_PARTIAL_NOTICE = '일부 문장은 규칙 기반으로 생성되었습니다.';
export const EXEC_FOOTER_NOTICE = 'AI 초안을 관리자가 검토·수정해 발행한 브리프입니다. 본 브리프는 공개 메타데이터(제목·썸네일 URL·링크)와 ARGOS 집계값, 문장만 포함하며 원문을 복제하지 않습니다. 숫자·차이의 방향·링크는 모두 서버가 계산한 값입니다.';
export const EXEC_DRAFT_HTML_NOTICE = '미발행 초안입니다. 발행 전 내용입니다';
export const EXEC_WEEK_TREND_NOTE = W.sections.tech.subtitle;
export const EXEC_ACCUMULATING_NOTE = '조달 태세 변화: 누적 중';

export const EXEC_ROLE_LABELS: Record<ExecLineRole, string> = { ...W.roles };

export const EXEC_ACTION_LABELS: Record<string, string> = { ...W.actions };

export const EXEC_QUESTION_KIND_LABELS: Record<string, string> = { ...W.questionKinds };

export const EXEC_EVIDENCE_TYPE_LABELS: Record<string, string> = {
  video: '영상',
  paper: '논문',
  article: '기사',
  ci: 'CI',
  keyword: '키워드',
};

export const EXEC_BUSINESS_CATEGORY_LABELS: Record<string, string> = {
  contract: '계약·공급',
  pricing: '가격',
  mass_production: '양산',
  sourcing: '조달',
  market: '시장',
};

export const EXEC_GAP_POSITION_LABELS: Record<GapPosition, string> = { ...W.positions };

export type GapTone = 'ahead' | 'parity' | 'we' | 'missing';

export function gapTone(row: Pick<ExecGapRow, 'status' | 'position'>): GapTone {
  if (row.status !== 'compared' || !row.position) return 'missing';
  return row.position === 'competitor_ahead' ? 'ahead' : row.position === 'we_ahead' ? 'we' : 'parity';
}

/** 방향 배지 문구 (서버 labelKo 우선) */
export function gapPositionBadge(row: ExecGapRow): string {
  if (row.status !== 'compared') return EXEC_OURS_MISSING_BADGE;
  return row.labelKo?.position ?? (row.position ? EXEC_GAP_POSITION_LABELS[row.position] : '');
}

/** 변화 배지 문구 — position 과 movement 를 함께 보고 정한다. 비교가 불가능하면 빈 문자열 */
export function gapMovementBadge(row: ExecGapRow): string {
  return row.status === 'compared' ? (movementLabelKo(row.position, row.movement) ?? '') : '';
}

export function directionLabel(d: TechDirection): string {
  return d === 'rising' ? '상승' : d === 'falling' ? '하락' : '변화 없음';
}

/** 화살표 + 문구 (색에만 의존하지 않는다) */
export function directionGlyph(d: TechDirection): string {
  return d === 'rising' ? '▲' : d === 'falling' ? '▼' : '–';
}

// ───────────────────────── 섹션 계획 ─────────────────────────

export interface ExecPlannedSection {
  key: ExecSectionUiKey;
  id: string;
  /** 보이는 섹션 기준 순번 '01' … */
  number: string;
  title: string;
  subtitle: string;
  /** 섹션 도입 문장 — 숫자·칩이 무엇을 센 것인지 독자가 알 수 있게 헤더 아래 한 줄로 보인다 */
  intro: string;
  countLabel: string | null;
}

export interface ExecTocItem {
  id: string;
  label: string;
}

/** 표지와 안내만 보여줄 정도로 내용이 없는가 (데이터 전무) */
export function isExecEmpty(p: WeeklyExecutivePayload): boolean {
  const e = p.evidence;
  return (
    p.conclusions.length === 0 &&
    p.gaps.rows.length === 0 &&
    p.gaps.summary.length === 0 &&
    p.tech.signals.length === 0 &&
    p.business.moves.length === 0 &&
    p.business.picture.length === 0 &&
    p.questions.length === 0 &&
    e.videos.length === 0 &&
    e.papers.length === 0 &&
    e.articles.length === 0 &&
    p.meta.warnings.includes('no_data')
  );
}

/**
 * 보이는 섹션과 번호. 결론·격차·기술은 데이터가 없어도 안내 문구와 함께 보인다(전무한 주 제외).
 * 사업·공급망은 사실 칩이나 움직임이 없으면, 질문은 0개면 숨긴다. 부록은 자료가 있을 때만 보인다.
 */
export function planExecSections(p: WeeklyExecutivePayload): ExecPlannedSection[] {
  if (isExecEmpty(p)) return [];
  const e = p.evidence;
  const out: Omit<ExecPlannedSection, 'number'>[] = [];
  const add = (key: ExecSectionUiKey, title: string, subtitle: string, countLabel: string | null) => out.push({ key, id: EXEC_SECTION_IDS[key], title, subtitle, intro: W.sections[key].intro, countLabel });
  const S = W.sections;
  add('conclusions', S.conclusions.title, S.conclusions.subtitle, p.conclusions.length > 0 ? `${p.conclusions.length}개` : null);
  add('gap', S.gap.title, S.gap.subtitle, p.gaps.rows.length > 0 ? `${p.gaps.rows.length}개 항목` : null);
  add('tech', S.tech.title, EXEC_WEEK_TREND_NOTE, p.tech.signals.length > 0 ? `${p.tech.signals.length}개` : null);
  if (p.business.moves.length > 0 || p.business.picture.length > 0) {
    add('business', S.business.title, S.business.subtitle, p.business.moves.length > 0 ? `${p.business.moves.length}개` : null);
  }
  if (p.questions.length > 0) add('questions', S.questions.title, S.questions.subtitle, `${p.questions.length}개`);
  if (e.videos.length + e.papers.length + e.articles.length > 0 || e.collectionLine) {
    add('evidence', S.evidence.title, S.evidence.subtitle, null);
  }
  return out.map((s, i) => ({ ...s, number: String(i + 1).padStart(2, '0') }));
}

export function buildExecToc(sections: readonly ExecPlannedSection[]): ExecTocItem[] {
  return sections.map((s) => ({ id: s.id, label: s.title }));
}

// ───────────────────────── 읽기 시간 ─────────────────────────

const len = (s: string | null | undefined): number => (s ? Array.from(s).length : 0);

/** 본문 서술 글자 수(결론·격차·기술·사업·질문·논문 시사점) */
export function execNarrativeChars(p: WeeklyExecutivePayload): number {
  let n = 0;
  for (const c of p.conclusions) n += len(c.headline) + c.lines.reduce((a, l) => a + len(l.text), 0);
  n += p.gaps.summary.reduce((a, s) => a + len(s), 0);
  for (const g of p.gaps.rows) n += g.lines.reduce((a, s) => a + len(s), 0);
  for (const s of p.tech.signals) n += s.lines.reduce((a, x) => a + len(x), 0);
  for (const m of p.business.moves) n += m.lines.reduce((a, x) => a + len(x), 0);
  for (const q of p.questions) n += len(q.text) + q.rationale.reduce((a, x) => a + len(x), 0);
  for (const x of p.evidence.papers) n += len(x.implication);
  return n;
}

/** 읽는 시간(분) = 본문 글자 수 ÷ 600, 올림, 최소 1 */
export function estimateExecReadingMinutes(p: WeeklyExecutivePayload): number {
  return Math.max(1, Math.ceil(execNarrativeChars(p) / EXEC_CHARS_PER_MINUTE));
}

export function formatExecReadingTime(minutes: number): string {
  return `읽는 시간 약 ${Math.max(1, Math.round(minutes))}분`;
}

// ───────────────────────── 스파크라인 ─────────────────────────

export interface SparklineModel {
  points: string;
  last: { x: number; y: number };
  first: { x: number; y: number };
  min: number;
  max: number;
  width: number;
  height: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** 8개 점 시리즈 → SVG polyline 좌표 (소수 1자리, 단색 도형용). 값이 없으면 null */
export function sparklineModel(series: readonly number[], width = 120, height = 32, pad = 3): SparklineModel | null {
  const vals = series.filter((v) => Number.isFinite(v));
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const pts = vals.map((v, i) => ({ x: r1(pad + (innerW * i) / (vals.length - 1)), y: r1(span === 0 ? pad + innerH / 2 : pad + innerH - ((v - min) / span) * innerH) }));
  return { points: pts.map((p) => `${p.x},${p.y}`).join(' '), last: pts[pts.length - 1]!, first: pts[0]!, min: r1(min), max: r1(max), width, height };
}

/** 스파크라인 접근성 설명 (시각 정보를 글로 대체) */
export function sparklineAlt(label: string, series: readonly number[], isCount: boolean): string {
  const vals = series.filter((v) => Number.isFinite(v));
  if (vals.length === 0) return `${label} 추이`;
  const unit = isCount ? '건' : '%';
  return `${label} 8주 추이: ${vals.map((v) => `${v}${unit}`).join(', ')}`;
}

/** 스파크라인 캡션 — 무엇의 8주 추이인지 */
export function sparklineCaption(label: string, isCount: boolean): string {
  return isCount ? `'${label}' 변경 건수 · 최근 8주` : `주간 자료 중 '${label}' 비율(%) · 최근 8주`;
}

/** 스파크라인 축 숫자 — 최솟값·최댓값·최근값 */
export function sparklineAxisText(series: readonly number[], isCount: boolean): string {
  const vals = series.filter((v) => Number.isFinite(v));
  if (vals.length === 0) return '';
  const unit = isCount ? '건' : '%';
  const r = (n: number) => String(Math.round(n * 10) / 10);
  return `최저 ${r(Math.min(...vals))}${unit} · 최고 ${r(Math.max(...vals))}${unit} · 최근 ${r(vals[vals.length - 1]!)}${unit}`;
}

/** 기술 흐름 카드의 "최근 4주 대 그 앞 4주" 한 줄 */
export function techShareLine(s: Pick<ExecTechSignal, 'kind' | 'recent' | 'prior' | 'relChangePct' | 'label'>): string {
  if (s.recent === null || s.prior === null) return '';
  const unit = s.kind === 'procurement' ? '건' : '%';
  const rel = s.relChangePct !== null ? ` (상대 ${s.relChangePct >= 0 ? '+' : ''}${s.relChangePct}%)` : '';
  const what = s.kind === 'procurement' ? '변경 건수' : '자료 비율';
  return `${what}: 최근 4주 ${s.recent}${unit} · 그 앞 4주 ${s.prior}${unit}${rel}`;
}

/** 기술 흐름 주제 설명 — 서버 explain 이 없는 이전 초안은 일반 문장 */
export function techExplainText(s: Pick<ExecTechSignal, 'kind' | 'label'> & { explain?: string }): string {
  if (s.explain) return s.explain;
  return s.kind === 'procurement' ? '이 주제는 CI(경쟁사 정보) 변경 이력에서 관절 모듈 조달 방식이 외부 조달 쪽으로 바뀐 건수를 뜻합니다.' : `이 주제는 '${s.label}'와 관련된 영상·논문·기사를 뜻합니다.`;
}

/** 사업 동향 분류 설명 */
export function businessCategoryExplain(category: string): string {
  return (W.businessCategories as Record<string, string>)[category] ?? '';
}

// ───────────────────────── 근거 표시 ─────────────────────────

/** 근거 칩의 출처 문구 — CI 신뢰도 등급 코드(A~F)는 쓰지 않고 D·F 만 "추정치"로 밝힌다 */
export function evidenceSourceLabel(e: Pick<WeeklyReportEvidence, 'type' | 'label'>): string {
  const label = e.label ?? '';
  const m = /^신뢰도\s*([A-F])$/.exec(label.trim());
  if (m) return m[1] === 'D' || m[1] === 'F' ? '추정치' : '';
  return label;
}

/** 근거 보조 줄: 출처(채널) · 월-일 */
export function evidenceMetaParts(e: Pick<WeeklyReportEvidence, 'type' | 'label' | 'channel' | 'publishedAt'>): string[] {
  const src = e.type === 'video' && e.channel ? e.channel : evidenceSourceLabel(e);
  const date = e.publishedAt ? formatKstMonthDay(e.publishedAt) : '';
  return [src, date].filter(Boolean);
}

// ───────────────────────── 편집 경로·점검 ─────────────────────────

export const editPath = {
  conclusionHeadline: (id: string) => `conclusions.${id}.headline`,
  conclusionLine: (id: string, i: number) => `conclusions.${id}.lines.${i}`,
  gapSummary: (i: number) => `gaps.summary.${i}`,
  gapRowLine: (id: string, i: number) => `gaps.rows.${id}.lines.${i}`,
  techLine: (id: string, i: number) => `tech.signals.${id}.lines.${i}`,
  businessLine: (id: string, i: number) => `business.moves.${id}.lines.${i}`,
  questionText: (id: string) => `questions.${id}.text`,
  questionRationale: (id: string, i: number) => `questions.${id}.rationale.${i}`,
  paperImplication: (id: string) => `evidence.papers.${id}.implication`,
} as const;

export const DEFAULT_EDIT_LIMITS: WeeklyBriefEditLimits = { sentence: 200, headline: 50, question: 200, implication: 100 };
export const EDIT_SUMMARY_LIMIT = 220;

/** 경로별 글자 수 상한 (서버 limits 와 같은 규칙) */
export function editLimitFor(path: string, limits: WeeklyBriefEditLimits = DEFAULT_EDIT_LIMITS): number {
  if (path.endsWith('.headline')) return limits.headline;
  if (path.endsWith('.implication')) return limits.implication;
  if (/^questions\.[^.]+\.text$/.test(path)) return limits.question;
  if (path.startsWith('gaps.summary.')) return EDIT_SUMMARY_LIMIT;
  return limits.sentence;
}

/** AI 원문(payload)에서 경로가 가리키는 텍스트. 없으면 undefined (백엔드 baseTextAt 과 같은 문법) */
export function execBaseTextAt(ai: WeeklyExecutivePayload, path: string): string | undefined {
  const t = path.split('.');
  const idx = (s: string | undefined) => (s !== undefined && /^\d{1,3}$/.test(s) ? Number(s) : -1);
  const [a, b, c, d, e] = t;
  if (a === 'conclusions' && c === 'headline' && t.length === 3) return ai.conclusions.find((x) => x.id === b)?.headline;
  if (a === 'conclusions' && c === 'lines' && t.length === 4) return ai.conclusions.find((x) => x.id === b)?.lines[idx(d)]?.text;
  if (a === 'gaps' && b === 'summary' && t.length === 3) return ai.gaps.summary[idx(c)];
  if (a === 'gaps' && b === 'rows' && d === 'lines' && t.length === 5) return ai.gaps.rows.find((x) => x.id === c)?.lines[idx(e)];
  if (a === 'tech' && b === 'signals' && d === 'lines' && t.length === 5) return ai.tech.signals.find((x) => x.id === c)?.lines[idx(e)];
  if (a === 'business' && b === 'moves' && d === 'lines' && t.length === 5) return ai.business.moves.find((x) => x.id === c)?.lines[idx(e)];
  if (a === 'questions' && c === 'text' && t.length === 3) return ai.questions.find((x) => x.id === b)?.text;
  if (a === 'questions' && c === 'rationale' && t.length === 4) return ai.questions.find((x) => x.id === b)?.rationale[idx(d)];
  if (a === 'evidence' && b === 'papers' && d === 'implication' && t.length === 4) return ai.evidence.papers.find((x) => x.id === c)?.implication;
  return undefined;
}

/** 입력 즉시 보여주는 점검 메시지 (서버 거부 규칙과 같음). 문제가 없으면 null */
export function clientEditProblem(text: string, limit: number): string | null {
  if (text.trim().length === 0) return '빈 문장은 저장할 수 없습니다. 되돌리려면 "AI 초안으로 되돌리기"를 누르세요';
  if (/[\r\n]/.test(text)) return '줄바꿈은 쓸 수 없습니다';
  if (text.includes('<')) return '"<" 문자는 쓸 수 없습니다';
  if (/http/i.test(text) || /www\./i.test(text)) return '링크(URL)는 쓸 수 없습니다';
  if (text.includes('**') || text.includes('`') || text.includes('#')) return '마크다운 기호(**, `, #)는 쓸 수 없습니다';
  if (Array.from(text).length > limit) return `${limit}자를 넘었습니다`;
  return null;
}

export const EDIT_WARNING_LABELS: Record<string, string> = {
  ending: '합니다체가 아닌 문장이 있습니다 (제안 줄·확인 사항은 제안형 말끝 ~볼 필요가 있을 것 같습니다 등이 아닌 문장, 그 밖의 줄은 제안형 말끝을 쓴 문장 포함)',
  banned: '금칙어(전망·예상 등)가 있습니다',
  number: '서버가 계산하지 않은 숫자가 있습니다',
  direction: '차이의 방향과 어긋나는 표현이 있습니다',
  collection: '수집 건수 문구가 있습니다',
  request: '요구·질문 표현입니다. 확인 제안 형태로 바꿔 주세요',
  no_target: '확인할 대상(이름·수치)이 문장에 없습니다',
};

// ───────────────────────── 상태 배지·배너 ─────────────────────────

export type PublishBadgeTone = 'draft' | 'pending' | 'published';

export function publishBadge(a: { publishState: WeeklyBriefPublishState; hasUnpublishedChanges: boolean }): { label: string; tone: PublishBadgeTone } {
  if (a.publishState === 'draft') return { label: '미발행(초안)', tone: 'draft' };
  return a.hasUnpublishedChanges ? { label: '발행됨 · 수정 사항 미반영', tone: 'pending' } : { label: '발행됨', tone: 'published' };
}

export const DRAFT_STALE_DAYS = 7;

/** 관리자 상단 배너 — 발행 대기 건수와 가장 오래된 주. 없으면 null */
export function draftBannerModel(summary: Pick<WeeklyBriefDraftSummary, 'pending' | 'oldestWeekStart' | 'oldestAgeDays'> | null | undefined): { text: string; stale: boolean } | null {
  if (!summary || summary.pending <= 0 || !summary.oldestWeekStart) return null;
  const days = summary.oldestAgeDays ?? 0;
  return {
    text: `발행 대기 중인 브리프가 ${summary.pending}건 있습니다(가장 오래된 것: ${summary.oldestWeekStart}, ${days}일 경과)`,
    stale: days >= DRAFT_STALE_DAYS,
  };
}

// ───────────────────────── 격차 표시 ─────────────────────────

/** 차이 값 표시 (단위 포함). 서버가 계산한 abs 를 형식만 바꾼다 */
export function formatGapDiff(row: Pick<ExecGapRow, 'axisKey' | 'unit' | 'diff'>, withPct = true): string {
  if (!row.diff) return '';
  const abs = row.diff.abs;
  const n = Number.isInteger(abs) ? String(abs) : String(Math.round(abs * 10) / 10);
  const pct = row.diff.pct === null || !withPct ? '' : ` (${row.diff.pct}%)`;
  if (row.axisKey === 'price') return `$${abs.toLocaleString('en-US')}${pct}`;
  if (row.axisKey.startsWith('bench_')) return `${n}점${pct}`;
  return `${n}${row.unit ? ` ${row.unit}` : ''}${pct}`;
}

/** 경쟁사 이름 + 로봇 이름 */
export function gapWho(row: Pick<ExecGapRow, 'competitor'>): string {
  const { name, robotName } = row.competitor;
  return robotName && robotName !== name ? `${name} ${robotName}` : name;
}

/** 한글 받침에 따른 주격 조사 (영문·숫자로 끝나면 "가") */
export function subjectParticle(name: string): string {
  const last = Array.from(name.trim()).pop() ?? '';
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 === 0 ? '가' : '이';
  return '가';
}

/**
 * 차이 카드의 비교 한 줄 — 제품명·단위·차이·방향 라벨을 한 줄에 쓴다. 축 키·등급 코드는 쓰지 않는다(D·F 값만 "추정치").
 * 예: "BrainCo Revo 3: 21 DoF · 우리 CLOiD: 12 DoF → BrainCo가 9 DoF 앞서 있음(차이가 더 벌어지는 중)"
 */
export function gapCompareLine(row: ExecGapRow): { text: string; missing: boolean } {
  const est = row.competitorValue.grade === 'D' || row.competitorValue.grade === 'F' ? '(추정치)' : '';
  const left = `${gapWho(row)}: ${row.competitorValue.display}${est}`;
  if (row.status !== 'compared' || !row.ourValue || !row.position) {
    return { text: `${left} · 우리 ${row.axisLabel}: 수치 미등록 → 우리 수치가 등록되면 비교할 수 있습니다`, missing: true };
  }
  const right = `우리${row.ourRef ? ` ${row.ourRef}` : ''}: ${row.ourValue.display}`;
  const diff = formatGapDiff(row, false);
  const company = row.competitor.name;
  const lower = row.higherIsBetter === false;
  const amount = diff ? `${diff} ` : '';
  let verdict: string;
  if (row.position === 'parity') verdict = '비슷한 수준';
  else if (row.position === 'competitor_ahead') verdict = `${company}${subjectParticle(company)} ${amount}${lower ? '더 낮아 ' : ''}앞서 있음`;
  else verdict = `우리가 ${amount}${lower ? '더 낮아 ' : ''}앞서 있음`;
  const move = gapMovementBadge(row);
  return { text: `${left} · ${right} → ${verdict}${move ? `(${move})` : ''}`, missing: false };
}

/** 차이 카드 축 설명 한 줄 */
export function gapAxisExplain(row: Pick<ExecGapRow, 'axisKey' | 'axisLabel' | 'unit'>): string | null {
  return axisExplainKo(row.axisKey, row.axisLabel, row.unit);
}

/** 차이 카드 제목 줄 사실 문장 — 서버 headline, 이전 초안은 같은 형태로 만든다 */
export function gapHeadline(row: ExecGapRow): string {
  if (row.headline) return row.headline;
  return `이번 주 새로 확인된 ${gapWho(row)}의 ${row.axisLabel} 수치는 ${row.competitorValue.display}입니다.`;
}

/** 우리 수치 등록·미등록 안내 한 줄 (coverage) */
export function coverageLine(c: { registered: readonly string[]; missing: readonly string[]; asOf: string | null }): string {
  const reg = c.registered.length > 0 ? `ARGOS에 등록된 우리 수치: ${c.registered.join(', ')}` : 'ARGOS에 등록된 우리 수치 없음';
  const miss = c.missing.length > 0 ? `아직 없는 수치: ${c.missing.join(', ')} (등록하면 비교할 수 있습니다)` : '아직 없는 수치 없음';
  return `${reg} / ${miss}${c.asOf ? ` · 기준일 ${c.asOf}` : ''}`;
}

/** 'YYYY-MM-DD' (월) → 일요일 'YYYY-MM-DD' (UTC 산술, 프로세스 TZ 무관) */
export function weekEndOf(weekStart: string): string {
  const [y, m, d] = weekStart.split('-').map(Number);
  const t = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1) + 6 * 86_400_000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** 월요일 'YYYY-MM-DD' 의 ISO 주차 번호 */
export function isoWeekNumberOf(weekStart: string): number {
  const [y, m, d] = weekStart.split('-').map(Number);
  const date = new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** 초안 목록 → 배너 요약 (발행 대기 = 미발행 초안 또는 발행 후 수정 사항 미반영) */
export function summarizeDrafts(items: readonly Pick<WeeklyBriefDraftListItem, 'weekStart' | 'hasUnpublishedChanges' | 'ageHours'>[]): WeeklyBriefDraftSummary {
  const pending = items.filter((d) => d.hasUnpublishedChanges).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const oldest = pending[0];
  return { pending: pending.length, oldestWeekStart: oldest?.weekStart ?? null, oldestAgeDays: oldest ? Math.floor(oldest.ageHours / 24) : null };
}

/**
 * 관리자가 볼 작업본 주차 — 주차를 지정했으면 그 주에 초안이 있을 때만, 최신 화면이면 가장 최신 초안이 발행본보다 같거나 새로울 때.
 * null 이면 발행본을 그대로 본다.
 */
export function pickAdminWeek(weekStart: string | undefined, drafts: readonly Pick<WeeklyBriefDraftListItem, 'weekStart'>[], publishedLatestWeek: string | null | undefined): string | null {
  if (weekStart) return drafts.some((d) => d.weekStart === weekStart) ? weekStart : null;
  const newest = [...drafts].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  if (!newest) return null;
  return !publishedLatestWeek || newest.weekStart >= publishedLatestWeek ? newest.weekStart : null;
}

/** 발행 확인 다이얼로그 문구 */
export function publishConfirmModel(a: { changedCount: number; warnings: readonly { path: string; codes: readonly string[] }[]; missingAxes: number }): { title: string; lines: string[]; warnings: string[] } {
  const lines = [`변경한 문장 ${a.changedCount}개를 포함해 지금 발행합니다. 발행하면 일반 사용자와 ARGOS_I 에 공개됩니다.`];
  if (a.missingAxes > 0) lines.push(`우리 쪽 수치가 아직 없는 항목이 ${a.missingAxes}개 있습니다. 해당 항목은 비교하지 않고 "${EXEC_OURS_MISSING_BADGE}"으로 표시됩니다.`);
  const warnings = a.warnings.flatMap((w) => w.codes.map((c) => `${EDIT_WARNING_LABELS[c] ?? c} (${w.path})`));
  return { title: '이 브리프를 발행할까요?', lines, warnings };
}
