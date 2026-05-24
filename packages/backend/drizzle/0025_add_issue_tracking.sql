-- ARGOS Issue Tracking Module — spec docs/issues/SPEC.md §3.
-- 6 tables + sequence (ARG-001 code) + AI call log.

CREATE SEQUENCE IF NOT EXISTS issue_ticket_seq START 1;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(16) NOT NULL UNIQUE,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL DEFAULT '',
	"priority" varchar(1) NOT NULL,
	"status" varchar(16) NOT NULL DEFAULT 'draft',
	"type" varchar(16) NOT NULL DEFAULT 'task',
	"parent_ticket_id" uuid,
	"reporter_id" uuid NOT NULL,
	"owner_id" uuid,
	"linked_competitor_ids" jsonb DEFAULT '[]'::jsonb,
	"linked_strategy_doc_ids" jsonb DEFAULT '[]'::jsonb,
	"linked_keyword_ids" jsonb DEFAULT '[]'::jsonb,
	"ai_summary" text,
	"ai_suggested_actions" jsonb,
	"ai_enriched_at" timestamp,
	"due_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_tickets_reporter_idx" ON "issue_tickets" ("reporter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_tickets_owner_idx" ON "issue_tickets" ("owner_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_tickets_status_idx" ON "issue_tickets" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_tickets_priority_idx" ON "issue_tickets" ("priority");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_tickets_type_idx" ON "issue_tickets" ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_tickets_parent_idx" ON "issue_tickets" ("parent_ticket_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_tickets_created_idx" ON "issue_tickets" ("created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ticket_id" uuid NOT NULL REFERENCES "issue_tickets"("id") ON DELETE CASCADE,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"mentioned_user_ids" jsonb DEFAULT '[]'::jsonb,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_comments_ticket_idx" ON "issue_comments" ("ticket_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ticket_id" uuid NOT NULL REFERENCES "issue_tickets"("id") ON DELETE CASCADE,
	"actor_id" uuid,
	"action_type" varchar(32) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_activity_ticket_idx" ON "issue_activity" ("ticket_id", "at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ticket_id" uuid REFERENCES "issue_tickets"("id") ON DELETE CASCADE,
	"comment_id" uuid REFERENCES "issue_comments"("id") ON DELETE CASCADE,
	"file_url" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"recipient_id" uuid NOT NULL,
	"ticket_id" uuid REFERENCES "issue_tickets"("id") ON DELETE CASCADE,
	"type" varchar(32) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_notif_recipient_idx" ON "issue_notifications" ("recipient_id", "created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_ticket_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"from_ticket_id" uuid NOT NULL REFERENCES "issue_tickets"("id") ON DELETE CASCADE,
	"to_ticket_id" uuid NOT NULL REFERENCES "issue_tickets"("id") ON DELETE CASCADE,
	"relation" varchar(16) NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "issue_ticket_links_uniq" ON "issue_ticket_links" ("from_ticket_id", "to_ticket_id", "relation");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_ticket_links_from_idx" ON "issue_ticket_links" ("from_ticket_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_ticket_links_to_idx" ON "issue_ticket_links" ("to_ticket_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "issue_ai_call_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"caller_user_id" uuid,
	"endpoint" varchar(64) NOT NULL,
	"model" varchar(64) NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"success" boolean DEFAULT true NOT NULL,
	"error" text,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "issue_ai_call_log_day_idx" ON "issue_ai_call_log" ("at");
