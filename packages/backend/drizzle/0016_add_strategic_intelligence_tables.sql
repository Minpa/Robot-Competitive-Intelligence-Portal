-- Data Audit Reports
CREATE TABLE IF NOT EXISTS data_audit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES pipeline_runs(id) ON DELETE SET NULL,
  report_data JSONB NOT NULL,
  total_robots INTEGER NOT NULL,
  average_completeness DECIMAL(5,2) NOT NULL,
  critical_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS data_audit_reports_created_at_idx ON data_audit_reports(created_at);

--> statement-breakpoint

-- Strategic Briefings
CREATE TABLE IF NOT EXISTS strategic_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lg_robot_id UUID NOT NULL REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  briefing_data JSONB NOT NULL,
  trigger_type VARCHAR(20) NOT NULL DEFAULT 'manual',
  ai_model VARCHAR(100),
  ai_cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS strategic_briefings_robot_idx ON strategic_briefings(lg_robot_id);
CREATE INDEX IF NOT EXISTS strategic_briefings_created_at_idx ON strategic_briefings(created_at);
