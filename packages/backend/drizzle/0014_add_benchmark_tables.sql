-- Perfect Robot Benchmark tables
CREATE TABLE IF NOT EXISTS ci_benchmark_axes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(50) UNIQUE NOT NULL,
  icon        VARCHAR(10),
  label       VARCHAR(100) NOT NULL,
  description TEXT,
  perfect_def TEXT,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ci_benchmark_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id   UUID NOT NULL REFERENCES ci_competitors(id) ON DELETE CASCADE,
  axis_key        VARCHAR(50) NOT NULL,
  current_score   INTEGER NOT NULL DEFAULT 0,
  target_score    INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(competitor_id, axis_key)
);

CREATE INDEX IF NOT EXISTS ci_benchmark_scores_competitor_idx ON ci_benchmark_scores(competitor_id);
