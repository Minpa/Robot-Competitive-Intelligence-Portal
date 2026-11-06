/**
 * 주간 브리프 테이블 DDL.
 *
 * `CREATE TABLE IF NOT EXISTS` 이며 `drizzle/0029_add_weekly_briefs.sql` 과 문장이 동일하다
 * (어느 쪽이 먼저 만들어도 충돌 없음). 정식 생성 경로는 기동 시 `ensureWeeklyBriefTables()` (index.ts).
 *
 *  - weekly_briefs : 주당 1행 (week_start = KST 월요일). 시각 컬럼은 KST 구간 경계의 모호함을 없애려고 TIMESTAMPTZ.
 *  - weekly_brief_drafts : (v3 임원판) 발행 전 초안·편집본. `drizzle/0031_add_weekly_brief_drafts.sql` 과 문장이 동일하다.
 *    미발행 초안과 편집자 식별자가 있어 ARGOS_I 전체 DB 덤프에서 제외한다(argos-i-full-db-config EXCLUDED_TABLES).
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

export const WEEKLY_BRIEF_DRAFTS_DDL_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS weekly_brief_drafts (
  week_start DATE PRIMARY KEY,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('ok','partial')),
  ai_payload JSONB NOT NULL,
  edits JSONB NOT NULL DEFAULT '{}'::jsonb,
  edit_rev INTEGER NOT NULL DEFAULT 0,
  edited_by VARCHAR(100),
  edited_at TIMESTAMPTZ,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  publish_state VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (publish_state IN ('draft','published')),
  published_at TIMESTAMPTZ,
  published_by VARCHAR(100),
  published_rev INTEGER,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  model VARCHAR(100),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
];

/** 트랜잭션(또는 db) 위에서 DDL 실행에 쓰는 최소 인터페이스 */
export interface WeeklyBriefSqlExecutor {
  execute(query: ReturnType<typeof sql.raw>): PromiseLike<unknown>;
}

export async function runWeeklyBriefDdl(executor: WeeklyBriefSqlExecutor): Promise<void> {
  for (const stmt of [...WEEKLY_BRIEF_DDL_STATEMENTS, ...WEEKLY_BRIEF_DRAFTS_DDL_STATEMENTS]) {
    await executor.execute(sql.raw(stmt));
  }
}

/** 기동 시 호출 — 테이블이 없으면 만든다 (멱등). */
export async function ensureWeeklyBriefTables(): Promise<void> {
  await runWeeklyBriefDdl(db);
}
