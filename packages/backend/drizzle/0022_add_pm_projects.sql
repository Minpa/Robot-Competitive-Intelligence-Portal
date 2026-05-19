-- ARGOS Projects — 프로젝트·일정 통합 관리 모듈 (spec v2.1).
-- 테이블 프리픽스 pm_. user 참조는 ARGOS users.id (uuid).

CREATE TABLE IF NOT EXISTS "pm_projects" (
	"id" serial PRIMARY KEY,
	"name" varchar(120) NOT NULL,
	"code" varchar(30),
	"description" text,
	"status" varchar(12) DEFAULT 'active' NOT NULL,
	"color" varchar(7),
	"owner_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_memberships" (
	"id" serial PRIMARY KEY,
	"project_id" integer NOT NULL REFERENCES "pm_projects"("id") ON DELETE CASCADE,
	"user_id" uuid NOT NULL,
	"role" varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pm_memberships_proj_user_idx" ON "pm_memberships" ("project_id","user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_boards" (
	"id" serial PRIMARY KEY,
	"project_id" integer NOT NULL REFERENCES "pm_projects"("id") ON DELETE CASCADE,
	"name" varchar(120) NOT NULL,
	"description" text,
	"report_cycle" varchar(12) DEFAULT 'none',
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_groups" (
	"id" serial PRIMARY KEY,
	"board_id" integer NOT NULL REFERENCES "pm_boards"("id") ON DELETE CASCADE,
	"name" varchar(80) NOT NULL,
	"color" varchar(7),
	"order_index" integer DEFAULT 0 NOT NULL,
	"collapsed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_columns" (
	"id" serial PRIMARY KEY,
	"board_id" integer NOT NULL REFERENCES "pm_boards"("id") ON DELETE CASCADE,
	"name" varchar(80) NOT NULL,
	"type" varchar(20) NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"order_index" integer DEFAULT 0 NOT NULL,
	"width" integer DEFAULT 160 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_items" (
	"id" serial PRIMARY KEY,
	"board_id" integer NOT NULL REFERENCES "pm_boards"("id") ON DELETE CASCADE,
	"group_id" integer NOT NULL REFERENCES "pm_groups"("id") ON DELETE CASCADE,
	"parent_item_id" integer,
	"name" varchar(300) NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pm_items_board_idx" ON "pm_items" ("board_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pm_items_group_idx" ON "pm_items" ("group_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pm_items_parent_idx" ON "pm_items" ("parent_item_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_cells" (
	"item_id" integer NOT NULL REFERENCES "pm_items"("id") ON DELETE CASCADE,
	"column_id" integer NOT NULL REFERENCES "pm_columns"("id") ON DELETE CASCADE,
	"value" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	PRIMARY KEY ("item_id","column_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_updates" (
	"id" serial PRIMARY KEY,
	"item_id" integer NOT NULL REFERENCES "pm_items"("id") ON DELETE CASCADE,
	"user_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_views" (
	"id" serial PRIMARY KEY,
	"board_id" integer NOT NULL REFERENCES "pm_boards"("id") ON DELETE CASCADE,
	"name" varchar(80) NOT NULL,
	"type" varchar(12) NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"scope" varchar(10) DEFAULT 'shared' NOT NULL,
	"owner_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pm_activity_log" (
	"id" serial PRIMARY KEY,
	"project_id" integer,
	"board_id" integer,
	"item_id" integer,
	"user_id" uuid,
	"action" varchar(40) NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"diff" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pm_activity_log_proj_idx" ON "pm_activity_log" ("project_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pm_activity_log_board_idx" ON "pm_activity_log" ("board_id");
