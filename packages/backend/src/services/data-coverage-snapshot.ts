/**
 * 데이터 커버리지 — 일일 스냅샷(data_migrations `coverage:YYYY-MM-DD`, KST 날짜) 키/저장 규칙/조회/비교 기준 선택.
 * dataMigrationService 만 사용한다. DDL 없음.
 */

import type { CoverageCompare, CoverageSection, CoverageSnapshotSummary } from '../types/data-coverage.js';
import { flattenForSnapshot } from './data-coverage-aggregate.js';

/** 스케줄러 태스크(매일 06:30 KST — 수집·태깅·트렌드 파이프라인 이후). 크론은 CRON_DATA_COVERAGE_SNAPSHOT 으로 변경 */
export const DATA_COVERAGE_SNAPSHOT_TASK_NAME = 'data-coverage-snapshot';
export const DEFAULT_DATA_COVERAGE_SNAPSHOT_CRON = '30 6 * * *';

export const SNAPSHOT_PREFIX = 'coverage:';
export const AVAILABLE_DATES_MAX = 30;
const LIST_FETCH = 60;
const KST_OFFSET_MS = 9 * 3_600_000;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** KST(UTC+9) 기준 YYYY-MM-DD */
export function kstDate(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function snapshotKey(ymd: string): string {
  return `${SNAPSHOT_PREFIX}${ymd}`;
}

export function dateFromKey(key: string): string | null {
  if (!key.startsWith(SNAPSHOT_PREFIX)) return null;
  const ymd = key.slice(SNAPSHOT_PREFIX.length);
  return isValidYmd(ymd) ? ymd : null;
}

export function isValidYmd(s: string): boolean {
  if (!YMD_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** compareTo 검증: 형식·달력 유효성, 미래(KST 오늘 이후) 불가 */
export function isValidCompareTo(s: unknown, now: Date): s is string {
  return typeof s === 'string' && isValidYmd(s) && s <= kstDate(now);
}

/**
 * 저장 규칙(하루 한 값):
 *  - 당일 스냅샷이 없으면 저장
 *  - 있고 그것이 partial 이며 새 계산이 완전하면 덮어씀
 *  - 그 외에는 당일 첫 값을 유지
 */
export function shouldSaveSnapshot(existing: Pick<CoverageSnapshotSummary, 'partial'> | null, incomingPartial: boolean): boolean {
  if (!existing) return true;
  return existing.partial === true && !incomingPartial;
}

interface MigrationRowLike {
  key: string;
  appliedAt: Date;
  summary: Record<string, unknown>;
}

export interface MigrationStoreLike {
  get(key: string): Promise<MigrationRowLike | null>;
  upsert(key: string, summary: Record<string, unknown>): Promise<void>;
  listRecent(prefix: string | null, limit: number): Promise<MigrationRowLike[]>;
}

function toSummary(row: MigrationRowLike | null): CoverageSnapshotSummary | null {
  const s = row?.summary as Partial<CoverageSnapshotSummary> | undefined;
  if (!row || !s || typeof s.metrics !== 'object' || s.metrics === null) return null;
  return {
    schemaVersion: 1,
    takenAt: typeof s.takenAt === 'string' ? s.takenAt : row.appliedAt.toISOString(),
    partial: s.partial === true,
    metrics: s.metrics as Record<string, number | null>,
    cells: typeof s.cells === 'object' && s.cells !== null ? (s.cells as Record<string, number | null>) : {},
  };
}

/** 스냅샷 저장소. 목록(60초)과 단건(5분)은 짧게 메모해 캐시 적중 요청이 DB 를 두드리지 않게 한다. */
export class SnapshotStore {
  private listMemo: { at: number; dates: string[] } | null = null;
  private getMemo = new Map<string, { at: number; snap: CoverageSnapshotSummary | null }>();

  constructor(
    private readonly store: MigrationStoreLike,
    private readonly nowMs: () => number = () => Date.now(),
    private readonly listTtlMs = 60_000,
    private readonly getTtlMs = 300_000,
  ) {}

  /** 최신순(키 내림차순) 최대 30개 날짜 */
  async availableDates(): Promise<string[]> {
    if (this.listMemo && this.nowMs() - this.listMemo.at < this.listTtlMs) return this.listMemo.dates;
    const rows = await this.store.listRecent(SNAPSHOT_PREFIX, LIST_FETCH);
    const dates = rows
      .map((r) => dateFromKey(r.key))
      .filter((d): d is string => d !== null)
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
      .slice(0, AVAILABLE_DATES_MAX);
    this.listMemo = { at: this.nowMs(), dates };
    return dates;
  }

  async get(ymd: string, opts: { fresh?: boolean } = {}): Promise<CoverageSnapshotSummary | null> {
    const hit = this.getMemo.get(ymd);
    if (!opts.fresh && hit && this.nowMs() - hit.at < this.getTtlMs) return hit.snap;
    const snap = toSummary(await this.store.get(snapshotKey(ymd)));
    this.getMemo.set(ymd, { at: this.nowMs(), snap });
    return snap;
  }

  /** 규칙에 따라 저장한다. 'saved' | 'kept' */
  async saveForDate(ymd: string, sections: readonly CoverageSection[], meta: { takenAt: string; partial: boolean }): Promise<'saved' | 'kept'> {
    const existing = await this.get(ymd, { fresh: true });
    if (!shouldSaveSnapshot(existing, meta.partial)) return 'kept';
    const summary = flattenForSnapshot(sections, meta);
    await this.store.upsert(snapshotKey(ymd), summary as unknown as Record<string, unknown>);
    this.listMemo = null;
    this.getMemo.set(ymd, { at: this.nowMs(), snap: summary });
    return 'saved';
  }

  /**
   * 비교 기준 선택 — compareTo 가 있고 그 날짜 스냅샷이 있으면 그것(ok),
   * 없으면 오늘(KST) 이전의 가장 최근 스냅샷(requested_not_found 또는 ok), 하나도 없으면 no_snapshot.
   */
  async resolveBaseline(requested: string | null, now: Date): Promise<{ compare: CoverageCompare; snapshot: CoverageSnapshotSummary | null }> {
    const dates = await this.availableDates();
    const today = kstDate(now);
    const mk = (baselineDate: string | null, snap: CoverageSnapshotSummary | null, reason: CoverageCompare['reason']) => ({
      compare: { requestedDate: requested, baselineDate, baselineTakenAt: snap?.takenAt ?? null, availableDates: dates, reason },
      snapshot: snap,
    });
    if (requested) {
      const snap = await this.get(requested);
      if (snap) return mk(requested, snap, 'ok');
    }
    const fallbackDate = dates.find((d) => d < today) ?? null;
    const fallback = fallbackDate ? await this.get(fallbackDate) : null;
    if (!fallback) return mk(null, null, 'no_snapshot');
    return mk(fallbackDate, fallback, requested ? 'requested_not_found' : 'ok');
  }
}
