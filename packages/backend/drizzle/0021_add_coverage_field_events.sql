-- CLOiD W/B 커버리지 sub-cell 현장 확인 / PoC / 배포 진행 이벤트 로그.
-- subcellKey = `${cell.id}-lv${lv}`. 가장 최근 event 가 sub-cell 의 현재 status.

CREATE TABLE IF NOT EXISTS "coverage_field_events" (
	"id" serial PRIMARY KEY,
	"subcell_key" varchar(120) NOT NULL,
	"cell_id" varchar(100) NOT NULL,
	"lv" integer NOT NULL,
	"event_date" date NOT NULL,
	"kind" varchar(32) NOT NULL,
	"status" varchar(32) NOT NULL,
	"site" varchar(200),
	"source" varchar(300),
	"note" text,
	"next_step" text,
	"priority_rank" integer,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coverage_field_events_kind_check"
		CHECK ("kind" IN ('visit', 'poc-planned', 'poc-active', 'poc-milestone', 'deployed', 'note')),
	CONSTRAINT "coverage_field_events_status_check"
		CHECK ("status" IN ('observed', 'poc-planned', 'poc-active', 'deployed')),
	CONSTRAINT "coverage_field_events_lv_check"
		CHECK ("lv" >= 1 AND "lv" <= 4)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coverage_field_events_subcell_idx" ON "coverage_field_events" ("subcell_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coverage_field_events_cell_idx" ON "coverage_field_events" ("cell_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coverage_field_events_date_idx" ON "coverage_field_events" ("event_date");
--> statement-breakpoint
DROP TRIGGER IF EXISTS update_coverage_field_events_updated_at ON "coverage_field_events";
--> statement-breakpoint
CREATE TRIGGER update_coverage_field_events_updated_at
	BEFORE UPDATE ON "coverage_field_events"
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();
