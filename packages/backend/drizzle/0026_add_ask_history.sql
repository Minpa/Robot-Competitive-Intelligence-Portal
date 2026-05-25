-- ARGOS Issue Tracking — Ask 질의 이력 (사용자별)
CREATE TABLE IF NOT EXISTS "issue_ask_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"intent" varchar(16),
	"confidence" integer,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"auto_created_ticket_code" varchar(16),
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_ask_history_user_idx" ON "issue_ask_history" ("user_id", "at");
