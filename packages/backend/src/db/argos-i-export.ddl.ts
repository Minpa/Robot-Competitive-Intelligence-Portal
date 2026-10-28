/**
 * ARGOS_I 일일 스냅샷 내보내기 테이블 DDL.
 *
 * 두 테이블 모두 `CREATE TABLE IF NOT EXISTS` 이며 `drizzle/0030_add_argos_i_exports.sql` 과 문장이 동일하다
 * (어느 쪽이 먼저 만들어도 충돌 없음). 정식 생성 경로는 기동 시 `ensureArgosIExportTables()` (index.ts).
 *
 *  - argos_i_exports      : 번들 메타, 날짜(KST)당 1행
 *  - argos_i_export_files : 번들 파일 본문(BYTEA). sha256 / byte_size 를 바이트 단위로 정확히 맞추려고 text 가 아닌 bytea 로 둔다.
 *                           번들 행 삭제 시 ON DELETE CASCADE (30일 보존 삭제)
 */

import { sql } from 'drizzle-orm';
import { db } from './index.js';

export const ARGOS_I_EXPORT_DDL_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS argos_i_exports (
  export_date DATE PRIMARY KEY,
  status VARCHAR(10) NOT NULL CHECK (status IN ('ok','partial')),
  schema_version INTEGER NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  as_of TIMESTAMPTZ NOT NULL,
  reason VARCHAR(16) NOT NULL,
  file_count INTEGER NOT NULL,
  total_bytes BIGINT NOT NULL,
  bundle_sha256 CHAR(64) NOT NULL,
  duration_ms INTEGER NOT NULL,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
)`,
  `CREATE TABLE IF NOT EXISTS argos_i_export_files (
  export_date DATE NOT NULL REFERENCES argos_i_exports(export_date) ON DELETE CASCADE,
  path VARCHAR(100) NOT NULL,
  area VARCHAR(40),
  format VARCHAR(8) NOT NULL CHECK (format IN ('md','json')),
  content BYTEA NOT NULL,
  sha256 CHAR(64) NOT NULL,
  byte_size INTEGER NOT NULL,
  record_count INTEGER,
  PRIMARY KEY (export_date, path)
)`,
];

/** 트랜잭션(또는 db) 위에서 DDL 실행에 쓰는 최소 인터페이스 */
export interface ArgosIExportSqlExecutor {
  execute(query: ReturnType<typeof sql.raw>): PromiseLike<unknown>;
}

export async function runArgosIExportDdl(executor: ArgosIExportSqlExecutor): Promise<void> {
  for (const stmt of ARGOS_I_EXPORT_DDL_STATEMENTS) {
    await executor.execute(sql.raw(stmt));
  }
}

/** 기동 시 호출 — 테이블이 없으면 만든다 (멱등). */
export async function ensureArgosIExportTables(): Promise<void> {
  await runArgosIExportDdl(db);
}
