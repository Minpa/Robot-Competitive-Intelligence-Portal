/**
 * 주간 브리프 기간 계산 — 순수 함수, 프로세스 TZ 무관.
 *
 * KST 는 UTC+9 고정 산술을 쓴다 (DST 없음). 모든 날짜는 'YYYY-MM-DD' 문자열로만 다루고
 * Date 는 UTC 인스턴트 표현에만 쓴다. week_start 를 로컬 Date 로 파싱하지 않는다.
 */

export const KST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
/** 브리프 발행 시각: 월요일 08:00 KST */
export const WEEKLY_BRIEF_PUBLISH_HOUR_KST = 8;

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface WeekRange {
  /** 월요일 'YYYY-MM-DD' (KST) */
  weekStart: string;
  /** 일요일 'YYYY-MM-DD' (KST) */
  weekEnd: string;
  /** 월 00:00:00.000 KST 의 UTC 인스턴트 */
  startUtc: Date;
  /** 다음 월 00:00:00.000 KST (배타적 상한) */
  endUtcExclusive: Date;
  /** 일 23:59:59.999 KST */
  periodEndInclusive: Date;
}

/** 'YYYY-MM-DD' 의 유효성(실존하는 날짜)까지 검사하고 UTC 자정 epoch ms 로 돌려준다. 잘못되면 null. */
function ymdToUtcMs(ymd: string): number | null {
  const m = YMD_RE.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return ms;
}

function utcMsToYmd(ms: number): string {
  const d = new Date(ms);
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const da = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

export function isValidYmd(ymd: string): boolean {
  return ymdToUtcMs(ymd) !== null;
}

/** UTC 인스턴트 → KST 달력 날짜 'YYYY-MM-DD' */
export function kstYmd(d: Date): string {
  return utcMsToYmd(d.getTime() + KST_OFFSET_MS);
}

export function addDaysYmd(ymd: string, n: number): string {
  const ms = ymdToUtcMs(ymd);
  if (ms === null) throw new Error(`invalid_ymd`);
  return utcMsToYmd(ms + n * DAY_MS);
}

export function isMondayYmd(ymd: string): boolean {
  const ms = ymdToUtcMs(ymd);
  if (ms === null) return false;
  return new Date(ms).getUTCDay() === 1;
}

/** 해당 날짜가 속한 주의 월요일 */
export function mondayOfYmd(ymd: string): string {
  const ms = ymdToUtcMs(ymd);
  if (ms === null) throw new Error('invalid_ymd');
  const dow = new Date(ms).getUTCDay(); // 0=일
  const back = (dow + 6) % 7;
  return utcMsToYmd(ms - back * DAY_MS);
}

export function getWeekRange(weekStart: string): WeekRange {
  const ms = ymdToUtcMs(weekStart);
  if (ms === null) throw new Error('invalid_week_start');
  const startUtc = new Date(ms - KST_OFFSET_MS);
  const endUtcExclusive = new Date(startUtc.getTime() + WEEK_MS);
  return {
    weekStart,
    weekEnd: addDaysYmd(weekStart, 6),
    startUtc,
    endUtcExclusive,
    periodEndInclusive: new Date(endUtcExclusive.getTime() - 1),
  };
}

export function isoWeekInfo(ymd: string): { isoYear: number; weekNumber: number } {
  const ms = ymdToUtcMs(ymd);
  if (ms === null) throw new Error('invalid_ymd');
  const d = new Date(ms);
  const dow = d.getUTCDay() || 7; // 월=1 … 일=7
  // 해당 주의 목요일이 속한 해가 ISO 연도
  const thursday = new Date(ms + (4 - dow) * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const jan1 = Date.UTC(isoYear, 0, 1);
  const weekNumber = Math.floor((thursday.getTime() - jan1) / DAY_MS / 7) + 1;
  return { isoYear, weekNumber };
}

/**
 * now 시점에 "완료된" 가장 최근 주(월~일 KST)의 월요일.
 * KST 월요일 00:00:00 이 되는 순간 직전 주가 완료된다.
 */
export function lastCompletedWeekStart(now: Date): string {
  const today = kstYmd(now);
  return addDaysYmd(mondayOfYmd(today), -7);
}

/** 주가 완료(일요일 23:59:59.999 KST 이후)되었는지 */
export function isWeekComplete(weekStart: string, now: Date): boolean {
  return getWeekRange(weekStart).endUtcExclusive.getTime() <= now.getTime();
}

/** 이번 주 월요일 08:00 KST 의 UTC 인스턴트 (크론 발행 시각) */
export function thisWeekPublishAt(now: Date): Date {
  const monday = mondayOfYmd(kstYmd(now));
  const ms = ymdToUtcMs(monday)!;
  return new Date(ms - KST_OFFSET_MS + WEEKLY_BRIEF_PUBLISH_HOUR_KST * 3_600_000);
}
