-- Data Generator Jobs — async batch job tracking for AI data collection
CREATE TABLE IF NOT EXISTS data_generator_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  provider VARCHAR(20) NOT NULL,
  web_search BOOLEAN NOT NULL DEFAULT FALSE,
  total_topics INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  current_topic_index INTEGER,
  current_topic_label TEXT,
  current_step VARCHAR(40),
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS data_generator_jobs_status_idx ON data_generator_jobs(status);
CREATE INDEX IF NOT EXISTS data_generator_jobs_created_at_idx ON data_generator_jobs(created_at DESC);
