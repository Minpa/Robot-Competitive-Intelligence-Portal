-- 주간 브리프 v3(임원판) 발행 전 초안·편집본 (주당 1행, week_start = KST 월요일)
-- 런타임 ensureWeeklyBriefTables() (src/db/weekly-brief.ddl.ts) 와 동일 DDL (어느 쪽이 먼저 만들어도 충돌 없음).
-- drizzle _journal 에는 등록하지 않는다 (0027~0030 과 동일: 수동 migrate 호환용).
-- ARGOS_I 전체 DB 덤프 제외 테이블 (미발행 초안·편집자 식별자).
CREATE TABLE IF NOT EXISTS weekly_brief_drafts (
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
);
