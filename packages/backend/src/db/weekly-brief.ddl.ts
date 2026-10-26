/**
 * 주간 브리프 테이블 DDL.
 *
 * `CREATE TABLE IF NOT EXISTS` 이며 `drizzle/0029_add_weekly_briefs.sql` 과 문장이 동일하다
 * (어느 쪽이 먼저 만들어도 충돌 없음). 정식 생성 경로는 기동 시 `ensureWeeklyBriefTables()` (index.ts).
 *
 *  - weekly_briefs : 주당 1행 (week_start = KST 월요일). 시각 컬럼은 KST 구간 경계의 모호함을 없애려고 TIMESTAMPTZ.
 */

import { sql } from 'drizzle-orm';
import { db } from './index.js';

export const WEEKLY_BRIEF_DDL_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS weekly_briefs (
  week_start DATE PRIMARY KEY,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(10) NOT NULL CHECK (status IN ('ok','partial','failed')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  model VARCHAR(100),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  error TEXT
)`,
];

/** 트랜잭션(또는 db) 위에서 DDL 실행에 쓰는 최소 인터페이스 */
export interface WeeklyBriefSqlExecutor {
  execute(query: ReturnType<typeof sql.raw>): PromiseLike<unknown>;
}

export async function runWeeklyBriefDdl(executor: WeeklyBriefSqlExecutor): Promise<void> {
  for (const stmt of WEEKLY_BRIEF_DDL_STATEMENTS) {
    await executor.execute(sql.raw(stmt));
  }
}

/** 기동 시 호출 — 테이블이 없으면 만든다 (멱등). */
export async function ensureWeeklyBriefTables(): Promise<void> {
  await runWeeklyBriefDdl(db);
}
