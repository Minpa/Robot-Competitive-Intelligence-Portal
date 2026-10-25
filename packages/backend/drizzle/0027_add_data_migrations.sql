-- 데이터 적용/작업 완료 마커 (actuator-update:<sha12>, pipeline:last, arxiv-backfill:actuator:12m)
-- 런타임 dataMigrationService.ensureTable() 과 동일한 DDL (어느 쪽이 먼저 만들어도 충돌 없음)
CREATE TABLE IF NOT EXISTS "data_migrations" (
	"key" varchar(200) PRIMARY KEY,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL
);
