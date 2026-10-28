/**
 * ARGOS_I 일일 스냅샷 내보내기 계약 타입.
 *
 * 이 파일은 `packages/backend/src/types/argos-i-export.ts` 와 내용이 동일해야 한다
 * (argos-i-export-contract.unit.test.ts 가 주석·공백을 제거한 뒤 비교한다). 한쪽만 수정하지 말 것.
 */

/** 번들 스키마 메이저. 이름 변경·삭제·타입·단위 변경 시에만 올린다 (추가는 올리지 않는다) */
export const ARGOS_I_EXPORT_SCHEMA_VERSION = 1;

export type ArgosIExportReason = 'cron' | 'startup' | 'manual' | 'weekly-brief';
export type ArgosIBundleStatus = 'ok' | 'partial';
export type ArgosIAreaPriority = 'P0' | 'P1' | 'P2';
export type ArgosIAreaStatus = 'ok' | 'empty' | 'failed';
export type ArgosIFileFormat = 'md' | 'json';
export type ArgosIExportPhase = 'idle' | 'waiting_upstream' | 'collecting' | 'building' | 'persisting';
export type ArgosIExportOutcome = 'created' | 'skipped_locked' | 'failed';

/** manifest.json 의 files[] 항목 (manifest.json 자신은 포함하지 않는다) */
export interface ArgosIManifestFile {
  path: string;
  area: string | null;
  format: ArgosIFileFormat;
  sha256: string;
  byteSize: number;
  recordCount: number | null;
}

/** manifest.json 의 areas[] 항목 */
export interface ArgosIManifestArea {
  id: string;
  titleKo: string;
  priority: ArgosIAreaPriority;
  status: ArgosIAreaStatus;
  recordCount: number;
  areaSchemaVersion: number;
  sourceTables: string[];
  files: string[];
}

/** manifest.json 본문 */
export interface ArgosIManifest {
  schemaVersion: number;
  bundleDate: string;
  generatedAt: string;
  asOf: string;
  timezone: 'Asia/Seoul';
  status: ArgosIBundleStatus;
  reason: ArgosIExportReason;
  generator: { name: 'argos'; commit: string | null };
  warnings: string[];
  areas: ArgosIManifestArea[];
  files: ArgosIManifestFile[];
  totals: { fileCount: number; totalBytes: number };
}

/** GET /api/argos-i/manifest 의 번들 요약 (URL 은 상대 경로) */
export interface ArgosIBundleSummary {
  date: string;
  generatedAt: string;
  asOf: string;
  status: ArgosIBundleStatus;
  reason: ArgosIExportReason;
  fileCount: number;
  totalBytes: number;
  bundleSha256: string;
  manifestUrl: string;
  zipUrl: string;
}

/** GET /api/argos-i/manifest 응답 */
export interface ArgosIManifestResponse {
  schemaVersion: number;
  serverTime: string;
  timezone: 'Asia/Seoul';
  retentionDays: number;
  scheduleHint: { generateCronKst: string; recommendedPullAfterKst: string };
  latest: ArgosIBundleSummary | null;
  bundles: ArgosIBundleSummary[];
}

/** 관리자 상태의 마지막 실행 요약 */
export interface ArgosIExportLastRun {
  date: string;
  reason: ArgosIExportReason;
  outcome: ArgosIExportOutcome;
  status: ArgosIBundleStatus | null;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  fileCount: number;
  totalBytes: number;
  warnings: string[];
  error: string | null;
}

/** GET /api/admin/argos-i/export/status 응답 (토큰 값·길이·해시는 포함하지 않는다) */
export interface ArgosIExportRunStatus {
  running: boolean;
  phase: ArgosIExportPhase;
  current: { date: string; reason: ArgosIExportReason; startedAt: string } | null;
  lastRun: ArgosIExportLastRun | null;
  latest: {
    date: string;
    generatedAt: string;
    status: ArgosIBundleStatus;
    fileCount: number;
    totalBytes: number;
    bundleSha256: string;
  } | null;
  bundles: {
    date: string;
    generatedAt: string;
    status: ArgosIBundleStatus;
    reason: ArgosIExportReason;
    fileCount: number;
    totalBytes: number;
  }[];
  config: {
    cron: string;
    schedulerEnabled: boolean;
    startupCatchup: boolean;
    tokenConfigured: boolean;
    retentionDays: number;
    areas: { id: string; priority: ArgosIAreaPriority }[];
  };
}

/** POST /api/admin/argos-i/export/generate 응답 (202) */
export interface ArgosIExportGenerateResponse {
  started: true;
  date: string;
  startedAt: string;
}
