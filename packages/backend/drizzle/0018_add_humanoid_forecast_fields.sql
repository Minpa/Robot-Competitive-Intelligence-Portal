ALTER TABLE "humanoid_robots" ADD COLUMN IF NOT EXISTS "data_type" varchar(20) DEFAULT 'confirmed' NOT NULL;
ALTER TABLE "humanoid_robots" ADD COLUMN IF NOT EXISTS "forecast_rationale" text;
ALTER TABLE "humanoid_robots" ADD COLUMN IF NOT EXISTS "forecast_sources" text;
ALTER TABLE "humanoid_robots" ADD COLUMN IF NOT EXISTS "forecast_confidence" varchar(10);
CREATE INDEX IF NOT EXISTS "humanoid_robots_data_type_idx" ON "humanoid_robots" ("data_type");
