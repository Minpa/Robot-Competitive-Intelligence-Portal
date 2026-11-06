/**
 * 데이터 커버리지 카드 표시용 순수 함수 — 숫자/비율/금액/KST 시각 포맷, 변화량 문구와 톤, 상태 라벨.
 * 시각은 프로세스 TZ 와 무관하게 고정 KST(UTC+9) 산술로 포맷한다. 이모지 없음.
 */

import type {
  CoverageCellValue,
  CoverageCompare,
  CoverageKind,
  CoverageMetric,
  CoverageReason,
  CoverageSection,
  CoverageTable,
  DataCoverageResponse,
} from '@/types/data-coverage';
import { formatKst } from '@/lib/argos-i-export-view';

export { formatKst };

export type DeltaTone = 'better' | 'worse' | 'neutral' | 'none';

/** 숫자 kind 판정 — 백엔드의 스냅샷 비교 대상과 같은 집합 */
export const isNumericKind = (k: CoverageKind): boolean => k === 'count' || k === 'ratio' || k === 'usd' || k === 'hours';

export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '-';
  return Math.round(n * 100) / 100 === Math.round(n) ? Math.round(n).toLocaleString('ko-KR') : n.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

/** 0~1 → 소수 1자리 % */
export function formatRatio(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-';
  return `${(v * 100).toFixed(1)}%`;
}

/** $1,234.56 (음수는 -$1,234.56) */
export function formatUsd(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-';
  const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? '-' : ''}$${abs}`;
}

export function formatHours(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-';
  return `${v.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}시간`;
}

export const REASON_LABELS: Record<Exclude<CoverageReason, null>, string> = {
  timeout: '시간 초과',
  query_failed: '조회 오류',
  dependency_failed: '의존 지표 실패',
  no_data: '데이터 없음',
  not_logged: '미기록',
  too_large: '대상이 너무 큼',
};

export function reasonLabel(reason: CoverageReason | string | null | undefined): string {
  if (!reason) return '';
  return (REASON_LABELS as Record<string, string>)[reason] ?? String(reason);
}

export const SECTION_STATUS_LABELS: Record<CoverageSection['status'], string> = {
  ok: '정상',
  partial: '일부 실패',
  failed: '실패',
  na: '해당 없음',
};

export type StatusTone = 'ok' | 'warn' | 'error' | 'none';

export const sectionStatusTone = (s: CoverageSection['status']): StatusTone => (s === 'ok' ? 'ok' : s === 'partial' ? 'warn' : s === 'failed' ? 'error' : 'none');

/** 지표 값 문자열. 실패/해당 없음은 숫자 0 이 아니라 라벨을 돌려준다 */
export function formatMetricValue(m: Pick<CoverageMetric, 'kind' | 'value' | 'status' | 'reason'>): string {
  if (m.status === 'failed') return '측정 실패';
  if (m.status === 'na') return m.reason === 'not_logged' ? '미기록' : '해당 없음';
  return formatByKind(m.value, m.kind);
}

export function formatByKind(value: CoverageCellValue | undefined, kind: CoverageKind): string {
  if (value === null || value === undefined) return '-';
  switch (kind) {
    case 'count':
      return typeof value === 'number' ? formatCount(value) : String(value);
    case 'ratio':
      return typeof value === 'number' ? formatRatio(value) : String(value);
    case 'usd':
      return typeof value === 'number' ? formatUsd(value) : String(value);
    case 'hours':
      return typeof value === 'number' ? formatHours(value) : String(value);
    case 'datetime':
      return typeof value === 'string' ? formatKst(value) : String(value);
    case 'bool':
      return value === true ? '예' : value === false ? '아니오' : String(value);
    default:
      return String(value);
  }
}

/** 비율 지표의 "분자 / 분모" 보조 문구. 비율이 아니거나 값이 없으면 빈 문자열 */
export function formatRatioDetail(m: Pick<CoverageMetric, 'kind' | 'numerator' | 'denominator' | 'status'>): string {
  if (m.status !== 'ok' || m.kind !== 'ratio' || m.numerator === null || m.denominator === null) return '';
  return `${formatCount(m.numerator)} / ${formatCount(m.denominator)}`;
}

/** 분모가 있는 count 지표(예: 자동 생성 회사 / 전체)의 보조 문구 */
export function formatDenominator(m: Pick<CoverageMetric, 'kind' | 'denominator' | 'status'>): string {
  if (m.status !== 'ok' || m.kind === 'ratio' || m.denominator === null) return '';
  return `전체 ${formatCount(m.denominator)}`;
}

const UNIT: Record<CoverageKind, string> = { count: '건', ratio: '%p', usd: '', hours: '시간', datetime: '', bool: '', text: '' };

/**
 * 변화 문구. null(기준 없음) 은 "-", 0 은 "변화 없음", 그 외 ▲/▼ + 부호 + 단위.
 * ratio 의 delta 는 서버가 퍼센트포인트로 준다. 색은 goodDirection 에 따른 개선/악화/중립이며 기호와 문구를 함께 쓴다.
 */
export function describeDelta(kind: CoverageKind, delta: number | null | undefined, good: CoverageMetric['goodDirection'] = 'neutral'): { text: string; arrow: '▲' | '▼' | ''; tone: DeltaTone; label: string } {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return { text: '-', arrow: '', tone: 'none', label: '비교 기준 없음' };
  const rounded = kind === 'ratio' ? Math.round(delta * 10) / 10 : kind === 'usd' ? Math.round(delta * 100) / 100 : Math.round(delta * 100) / 100;
  if (rounded === 0) return { text: '변화 없음', arrow: '', tone: 'neutral', label: '변화 없음' };
  const up = rounded > 0;
  const sign = up ? '+' : '-';
  const abs = Math.abs(rounded);
  let body: string;
  if (kind === 'usd') body = `${sign}${formatUsd(abs)}`;
  else if (kind === 'ratio') body = `${sign}${abs.toFixed(1)}${UNIT.ratio}`;
  else if (kind === 'hours') body = `${sign}${formatCount(abs)}${UNIT.hours}`;
  else body = `${sign}${formatCount(abs)}${UNIT.count}`;
  const tone: DeltaTone = good === 'neutral' ? 'neutral' : (good === 'up') === up ? 'better' : 'worse';
  const label = tone === 'better' ? '개선' : tone === 'worse' ? '악화' : up ? '증가' : '감소';
  return { text: `${up ? '▲' : '▼'} ${body}`, arrow: up ? '▲' : '▼', tone, label };
}

export const DELTA_TONE_CLASS: Record<DeltaTone, string> = {
  better: 'text-pos',
  worse: 'text-neg',
  neutral: 'text-ink-500',
  none: 'text-ink-400',
};

export const SEVERITY_BADGE_CLASS: Record<CoverageMetric['severity'], string> = {
  ok: '',
  warn: 'bg-warn-soft text-warn',
  error: 'bg-neg-soft text-neg',
};

export const SEVERITY_LABELS: Record<CoverageMetric['severity'], string> = { ok: '', warn: '주의', error: '경고' };

export function countFailed(section: Pick<CoverageSection, 'metrics' | 'tables'>): number {
  return section.metrics.filter((m) => m.status === 'failed').length + section.tables.filter((t) => t.status === 'failed').length;
}

/** 캐시 배지 문구: 방금 계산 / N분 전 계산 / N초 전 계산 */
export function cacheAgeLabel(cache: DataCoverageResponse['cache']): string {
  if (cache.ageSec < 5) return '방금 계산';
  if (cache.ageSec < 60) return `${cache.ageSec}초 전 계산`;
  return `${Math.floor(cache.ageSec / 60)}분 전 계산`;
}

export const STALE_LABEL = '이전 캐시 표시 중';
export const PARTIAL_LABEL = '일부 측정 실패';

export function retryMessage(sec: number | null | undefined): string {
  const n = typeof sec === 'number' && Number.isFinite(sec) && sec > 0 ? Math.ceil(sec) : 30;
  return `${n}초 후 다시 시도하세요`;
}

/** 비교 기준 select 의 한 줄 요약 */
export function compareSummary(c: CoverageCompare): string {
  if (c.reason === 'no_snapshot') return '비교할 스냅샷이 아직 없습니다';
  const base = c.baselineDate ? `${c.baselineDate} 스냅샷 대비` : '';
  if (c.reason === 'requested_not_found') return `선택한 ${c.requestedDate ?? ''} 스냅샷이 없어 ${base || '직전 스냅샷 대비'}`.trim();
  return base;
}

export const ROW_LABELS: Record<string, string> = {
  youtube: 'YouTube', arxiv: 'arXiv', github: 'GitHub', sec_edgar: 'SEC EDGAR', patent: '특허', other: '기타',
  videoTagging: '영상 태깅', paperSummary: '논문 요약', geminiVideo: 'Gemini 영상 분석',
  domainMismatch: '도메인 불일치', noTags: '태그 없음', tooOld: '기간 초과',
  unsourced: '조달 정보 없음', in_house_confirmed: '자체 개발(확정)', in_house_presumed: '자체 개발(추정)', external: '외부 조달', mixed: '혼합', unknown: '확인 불가',
  legal: '레거시 수집(arXiv·GitHub·SEC·특허)', arxivHand: 'arXiv 핸드', arxivActuator: 'arXiv 액추에이터', eventSearch: '이벤트 검색', topicSearch: '주제 검색',
  claude: 'Claude', gemini: 'Gemini', chatgpt: 'ChatGPT',
  pending: '대기', running: '실행 중', completed: '완료', failed: '실패',
};

export function rowLabel(key: string): string {
  return ROW_LABELS[key] ?? key;
}

/** 표 셀 문자열 */
export function formatCell(value: CoverageCellValue | undefined, kind: CoverageKind): string {
  return formatByKind(value, kind);
}

export function tableNote(t: Pick<CoverageTable, 'truncated' | 'totalRows' | 'rows' | 'status' | 'reason'>): string {
  if (t.status === 'failed') return `측정 실패 (${reasonLabel(t.reason) || '조회 오류'})`;
  if (t.status === 'na') return t.reason === 'no_data' ? '데이터 없음' : '해당 없음';
  if (t.truncated) return `상위 ${t.rows.length}행만 표시 (전체 ${formatCount(t.totalRows)}행)`;
  return '';
}

/** 접기 기본값: 데스크톱은 모두 펼침, 좁은 화면은 첫 구역만 */
export function defaultSectionOpen(index: number, isDesktop: boolean): boolean {
  return isDesktop || index === 0;
}
