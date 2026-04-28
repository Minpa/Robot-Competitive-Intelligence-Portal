CREATE TABLE IF NOT EXISTS "cloid_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(50) DEFAULT 'user',
	"thumbnail_url" varchar(500),
	"data" jsonb NOT NULL,
	"created_by" varchar(100) DEFAULT 'anonymous',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cloid_scenarios_category_idx" ON "cloid_scenarios" ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cloid_scenarios_name_idx" ON "cloid_scenarios" ("name");
