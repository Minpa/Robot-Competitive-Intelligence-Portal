/**
 * 액추에이터 조달 태세·수요 사례·공급사 타깃 시장 테이블 DDL.
 *
 * 세 테이블 모두 `CREATE ... IF NOT EXISTS` 이며, `drizzle/0028_add_actuator_sourcing.sql` 과 문장이 동일하다
 * (어느 쪽이 먼저 만들어도 충돌 없음). 정식 생성 경로는 런타임 `ensureActuatorSourcingTables()`
 * (index.ts 기동 시, 그리고 apply-actuator-data-update.ts 의 트랜잭션 시작 직후).
 *
 *  - actuator_sourcing        : 로봇당 1행 (humanoid_robots FK) — 조달 태세 재판정 결과
 *  - actuator_adoptions       : 외부 액추에이터 공개 채택 사례 (파일 전체가 진실, case_key 로 업서트)
 *  - actuator_vendor_markets  : 공급사 공개 타깃 시장 (vendor_key 로 업서트)
 */

import { sql } from 'drizzle-orm';
import { db } from './index.js';

export const ACTUATOR_SOURCING_DDL_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS actuator_sourcing (
  robot_id UUID PRIMARY KEY REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  sourcing VARCHAR(24) NOT NULL,
  sells_externally BOOLEAN,
  evidence_grade VARCHAR(8),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  external_vendors JSONB NOT NULL DEFAULT '[]'::jsonb,
  note_ko TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`,
  `CREATE TABLE IF NOT EXISTS actuator_adoptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_key VARCHAR(400) NOT NULL UNIQUE,
  robot_name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  country VARCHAR(100),
  segment VARCHAR(32) NOT NULL,
  level VARCHAR(16) NOT NULL DEFAULT 'module',
  robot_class VARCHAR(100),
  actuator_vendor VARCHAR(255) NOT NULL,
  actuator_model VARCHAR(255),
  usage_text TEXT,
  evidence_grade VARCHAR(8),
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  note_ko TEXT,
  adopted_year INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`,
  `CREATE INDEX IF NOT EXISTS actuator_adoptions_vendor_idx ON actuator_adoptions (actuator_vendor)`,
  `CREATE TABLE IF NOT EXISTS actuator_vendor_markets (
  vendor_key VARCHAR(200) PRIMARY KEY,
  vendor VARCHAR(255) NOT NULL,
  target_markets_ko JSONB NOT NULL DEFAULT '[]'::jsonb,
  segments JSONB,
  grade VARCHAR(8),
  url TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)`,
];

/** 트랜잭션(또는 db) 위에서 DDL 실행에 쓰는 최소 인터페이스 */
export interface SqlExecutor {
  execute(query: ReturnType<typeof sql.raw>): PromiseLike<unknown>;
}

/** 주어진 실행자(트랜잭션 포함)에서 DDL 문장을 순서대로 실행한다. */
export async function runActuatorSourcingDdl(executor: SqlExecutor): Promise<void> {
  for (const stmt of ACTUATOR_SOURCING_DDL_STATEMENTS) {
    await executor.execute(sql.raw(stmt));
  }
}

/** 기동 시 호출 — 테이블이 없으면 만든다 (멱등). */
export async function ensureActuatorSourcingTables(): Promise<void> {
  await runActuatorSourcingDdl(db);
}
