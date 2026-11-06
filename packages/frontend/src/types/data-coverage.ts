/**
 * 데이터 커버리지 현황 — GET /api/admin/data-coverage 응답 타입.
 * 프론트(packages/frontend/src/types/data-coverage.ts)와 주석·공백을 제외하고 동일해야 한다(계약 테스트).
 */

export type CoverageSectionId = 'ingest' | 'collectRun' | 'analysis' | 'aiCost' | 'specs' | 'quality' | 'crawlTargets';

export type CoverageKind = 'count' | 'ratio' | 'usd' | 'datetime' | 'hours' | 'bool' | 'text';

export type CoverageReason = 'timeout' | 'query_failed' | 'dependency_failed' | 'no_data' | 'not_logged' | 'too_large' | null;

export type CoverageCellValue = number | string | boolean | null;

export interface CoverageMetric {
  id: string;
  label: string;
  kind: CoverageKind;
  value: number | string | boolean | null;
  numerator: number | null;
  denominator: number | null;
  status: 'ok' | 'failed' | 'na';
  reason: CoverageReason;
  errorMessage: string | null;
  baseline: number | null;
  delta: number | null;
  goodDirection: 'up' | 'down' | 'neutral';
  severity: 'ok' | 'warn' | 'error';
  note: string | null;
}

export interface CoverageTableColumn {
  key: string;
  label: string;
  kind: CoverageKind;
}

export interface CoverageTableRow {
  key: string;
  cells: Record<string, CoverageCellValue>;
  delta?: Record<string, number | null>;
}

export interface CoverageTable {
  id: string;
  label: string;
  columns: CoverageTableColumn[];
  rows: CoverageTableRow[];
  totalRows: number;
  truncated: boolean;
  diffable: boolean;
  status: 'ok' | 'failed' | 'na';
  reason: CoverageReason;
}

export interface CoverageSection {
  id: CoverageSectionId;
  titleKo: string;
  status: 'ok' | 'partial' | 'failed' | 'na';
  reason: string | null;
  metrics: CoverageMetric[];
  tables: CoverageTable[];
  notes: string[];
}

export interface CoverageCompare {
  requestedDate: string | null;
  baselineDate: string | null;
  baselineTakenAt: string | null;
  availableDates: string[];
  reason: 'ok' | 'no_snapshot' | 'requested_not_found';
}

export interface DataCoverageResponse {
  schemaVersion: 1;
  generatedAt: string;
  cache: { hit: boolean; stale: boolean; ageSec: number; ttlSec: number };
  partial: boolean;
  compare: CoverageCompare;
  sections: CoverageSection[];
}

/** 스냅샷(data_migrations `coverage:YYYY-MM-DD`)의 summary */
export interface CoverageSnapshotSummary {
  schemaVersion: 1;
  takenAt: string;
  partial: boolean;
  metrics: Record<string, number | null>;
  cells: Record<string, number | null>;
}
