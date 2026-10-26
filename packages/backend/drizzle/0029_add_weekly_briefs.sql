-- 주간 브리프 (주당 1행, week_start = KST 월요일)
-- 런타임 ensureWeeklyBriefTables() (src/db/weekly-brief.ddl.ts) 와 동일 DDL (어느 쪽이 먼저 만들어도 충돌 없음).
-- drizzle _journal 에는 등록하지 않는다 (0027·0028 과 동일: 수동 migrate 호환용).
CREATE TABLE IF NOT EXISTS weekly_briefs (
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
);
