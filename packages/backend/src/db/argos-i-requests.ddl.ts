/**
 * ARGOS_I 요청 인터페이스 테이블 DDL.
 *
 * 모든 문장이 `IF NOT EXISTS` 이며 `drizzle/0032_add_argos_i_requests.sql` 과 문장이 동일하다
 * (어느 쪽이 먼저 만들어도 충돌 없음). 정식 생성 경로는 기동 시 `ensureArgosIRequestTables()` (index.ts).
 *
 *  - argos_i_requests         : 통과한 요청만 저장한다. note 는 관리자 목록 전용(종결 7일 후 NULL), 90일 보존
 *  - argos_i_request_rejects  : 거부 통계 — 사유 코드별 일 카운트만 (본문·값·키 이름은 저장하지 않는다)
 *
 * 컬럼명에 token/secret/password/api_key/credential 계열 이름을 쓰지 않는다 (전체 DB 덤프 자동 제외 규칙과 혼동 방지).
 * 두 테이블은 argos-i-full-db-config.ts 의 EXCLUDED_TABLES 로 덤프에서 제외한다.
 */

import { sql } from 'drizzle-orm';
import { db } from './index.js';

export const ARGOS_I_REQUESTS_DDL_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS argos_i_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('add_source','analyze','query','regenerate_brief','watch_register')),
  params JSONB NOT NULL,
  note VARCHAR(200),
  status VARCHAR(16) NOT NULL CHECK (status IN ('queued','needs_approval','running','done','failed','rejected','cancelled','unsupported')),
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  approval_reason VARCHAR(40),
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  result JSONB,
  error_code VARCHAR(40),
  attempts INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  cost_provider VARCHAR(10),
  payload_hash CHAR(64) NOT NULL,
  idempotency_hash CHAR(64),
  requested_by VARCHAR(20) NOT NULL DEFAULT 'argos-i',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
)`,
  `CREATE INDEX IF NOT EXISTS argos_i_requests_status_created_idx ON argos_i_requests (status, created_at)`,
  `CREATE INDEX IF NOT EXISTS argos_i_requests_created_idx ON argos_i_requests (created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS argos_i_requests_idem_uniq ON argos_i_requests (idempotency_hash) WHERE idempotency_hash IS NOT NULL`,
  `CREATE TABLE IF NOT EXISTS argos_i_request_rejects (
  day DATE NOT NULL,
  reason_code VARCHAR(40) NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, reason_code)
)`,
];

/** 트랜잭션(또는 db) 위에서 DDL 실행에 쓰는 최소 인터페이스 */
export interface ArgosIRequestsSqlExecutor {
  execute(query: ReturnType<typeof sql.raw>): PromiseLike<unknown>;
}

export async function runArgosIRequestsDdl(executor: ArgosIRequestsSqlExecutor): Promise<void> {
  for (const stmt of ARGOS_I_REQUESTS_DDL_STATEMENTS) {
    await executor.execute(sql.raw(stmt));
  }
}

/** 기동 시 호출 — 테이블이 없으면 만든다 (멱등). */
export async function ensureArgosIRequestTables(): Promise<void> {
  await runArgosIRequestsDdl(db);
}
