-- ARGOS Projects — 자동화 (Phase 3 REQ-21 MVP) + 보고 스냅샷 (§10.3).

CREATE TABLE IF NOT EXISTS "pm_automations" (
	"id" serial PRIMARY KEY,
	"board_id" integer NOT NULL REFERENCES "pm_boards"("id") ON DELETE CASCADE,
	"name" varchar(120) NOT NULL,
	"trigger" jsonb DEFAULT '{}'::jsonb,
	"actions" jsonb DEFAULT '[]'::jsonb,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pm_automations_board_idx" ON "pm_automations" ("board_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_snapshots" (
	"id" serial PRIMARY KEY,
	"board_id" integer NOT NULL REFERENCES "pm_boards"("id") ON DELETE CASCADE,
	"name" varchar(120),
	"taken_at" timestamp DEFAULT now() NOT NULL,
	"taken_by" uuid,
	"payload" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pm_snapshots_board_idx" ON "pm_snapshots" ("board_id");
