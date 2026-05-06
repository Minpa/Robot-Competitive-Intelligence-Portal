-- Task 2: LG 휴머노이드 스펙 (humanoid_models)
-- Task 3: EE 카테고리·요구사항·다운로드 이력 (ee_categories / cell_ee_requirements / report_downloads)

CREATE TABLE IF NOT EXISTS "humanoid_models" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"model_name" varchar(100) NOT NULL UNIQUE,
	"code_name" varchar(100),
	"form_factor" varchar(50) NOT NULL,
	"is_potential" boolean NOT NULL DEFAULT false,
	"release_phase" varchar(50),
	"release_target_date" date,
	"basic_info" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"physical" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"locomotion" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"manipulation" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"perception" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"ai_compute" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"safety" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"commercial" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"ee_options" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"custom_fields" jsonb NOT NULL DEFAULT '{}'::jsonb,
	"notes" text,
	"created_by" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "humanoid_models_form_factor_check"
		CHECK ("form_factor" IN ('Wheel', 'Biped', 'Quadruped', 'Other')),
	CONSTRAINT "humanoid_models_release_phase_check"
		CHECK ("release_phase" IS NULL OR "release_phase" IN ('시제품', 'Pilot', '양산 중', '조사 중', '미정'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "humanoid_models_form_factor_idx" ON "humanoid_models" ("form_factor");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "humanoid_models_is_potential_idx" ON "humanoid_models" ("is_potential");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "humanoid_models_release_date_idx" ON "humanoid_models" ("release_target_date");
--> statement-breakpoint
-- updated_at 자동 갱신 트리거 (이미 다른 테이블이 같은 함수를 쓰면 재사용)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS update_humanoid_models_updated_at ON "humanoid_models";
--> statement-breakpoint
CREATE TRIGGER update_humanoid_models_updated_at
	BEFORE UPDATE ON "humanoid_models"
	FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ee_categories" (
	"code" varchar(20) PRIMARY KEY,
	"name_ko" varchar(50) NOT NULL,
	"description" text,
	"benchmark_examples" text,
	"display_order" integer NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cell_ee_requirements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"task_idx" integer NOT NULL,
	"industry_idx" integer NOT NULL,
	"lv" integer NOT NULL,
	"tier1_codes" text[] NOT NULL DEFAULT '{}',
	"tier2_codes" text[] NOT NULL DEFAULT '{}',
	"tier3_codes" text[] NOT NULL DEFAULT '{}',
	"rationale" text,
	"benchmark_ee" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cell_ee_req_cell_lookup_idx"
	ON "cell_ee_requirements" ("task_idx", "industry_idx", "lv");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_downloads" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"report_type" varchar(50) NOT NULL,
	"humanoid_models_snapshot" jsonb,
	"user_id" varchar(100),
	"filename" varchar(200) NOT NULL,
	"file_size_bytes" integer,
	"build_time_ms" integer,
	"downloaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_downloads_report_type_idx" ON "report_downloads" ("report_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "report_downloads_downloaded_at_idx" ON "report_downloads" ("downloaded_at");
