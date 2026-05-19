CREATE TABLE IF NOT EXISTS "pm_dependencies" (
	"id" serial PRIMARY KEY,
	"board_id" integer NOT NULL REFERENCES "pm_boards"("id") ON DELETE CASCADE,
	"predecessor_item_id" integer NOT NULL REFERENCES "pm_items"("id") ON DELETE CASCADE,
	"successor_item_id" integer NOT NULL REFERENCES "pm_items"("id") ON DELETE CASCADE,
	"type" varchar(2) DEFAULT 'FS' NOT NULL,
	"lag_days" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pm_deps_board_idx" ON "pm_dependencies" ("board_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pm_deps_uniq" ON "pm_dependencies" ("predecessor_item_id", "successor_item_id");
