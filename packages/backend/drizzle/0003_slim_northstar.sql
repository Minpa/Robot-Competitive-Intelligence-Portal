CREATE TABLE IF NOT EXISTS "allowed_emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"added_by" uuid,
	"note" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "allowed_emails_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"environment_type" varchar(50),
	"task_type" varchar(50),
	"task_description" text,
	"deployment_status" varchar(50),
	"demo_event" varchar(255),
	"demo_date" date,
	"video_url" varchar(500),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_applications" (
	"article_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_companies" (
	"article_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_components" (
	"article_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_robot_tags" (
	"article_id" uuid NOT NULL,
	"robot_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "body_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"height_cm" numeric(6, 2),
	"weight_kg" numeric(6, 2),
	"payload_kg" numeric(6, 2),
	"dof_count" integer,
	"max_speed_mps" numeric(4, 2),
	"operation_time_hours" numeric(4, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "body_specs_robot_id_unique" UNIQUE("robot_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"vendor" varchar(255),
	"specifications" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "computing_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"main_soc" varchar(255),
	"tops_min" numeric(8, 2),
	"tops_max" numeric(8, 2),
	"architecture_type" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "computing_specs_robot_id_unique" UNIQUE("robot_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hand_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"hand_type" varchar(50),
	"finger_count" integer,
	"hand_dof" integer,
	"grip_force_n" numeric(6, 2),
	"is_interchangeable" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hand_specs_robot_id_unique" UNIQUE("robot_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "humanoid_robots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"announcement_year" integer,
	"status" varchar(50) DEFAULT 'development',
	"purpose" varchar(50),
	"locomotion_type" varchar(50),
	"hand_type" varchar(50),
	"commercialization_stage" varchar(50),
	"region" varchar(50),
	"image_url" varchar(500),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(50) DEFAULT 'running' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"total_duration_ms" integer,
	"triggered_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pipeline_step_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_name" varchar(100) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"input_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"error_message" text,
	"error_stack" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "power_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"battery_type" varchar(100),
	"capacity_wh" numeric(8, 2),
	"operation_time_hours" numeric(4, 2),
	"charging_method" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "power_specs_robot_id_unique" UNIQUE("robot_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "robot_components" (
	"robot_id" uuid NOT NULL,
	"component_id" uuid NOT NULL,
	"usage_location" varchar(100),
	"quantity" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sensor_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"cameras" jsonb,
	"depth_sensor" varchar(255),
	"lidar" varchar(255),
	"imu" varchar(255),
	"force_torque" varchar(255),
	"touch_sensors" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sensor_specs_robot_id_unique" UNIQUE("robot_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "talent_trends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"total_headcount" integer,
	"humanoid_team_size" integer,
	"job_posting_count" integer,
	"recorded_at" timestamp,
	"source" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workforce_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"total_headcount_min" integer,
	"total_headcount_max" integer,
	"humanoid_team_size" integer,
	"job_distribution" jsonb,
	"recorded_at" timestamp,
	"source" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workforce_data_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "submitted_by" uuid;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "category" varchar(50) DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "product_type" varchar(50) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "extracted_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "logo_url" varchar(500);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "founding_year" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "main_business" varchar(255);--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "arms" integer;--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "hands" varchar(50);--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "mobility" varchar(50);--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "height_cm" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "dynamic_specs" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "allowed_emails_email_idx" ON "allowed_emails" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_cases_robot_idx" ON "application_cases" ("robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_cases_environment_idx" ON "application_cases" ("environment_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_cases_task_idx" ON "application_cases" ("task_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "article_applications_pk" ON "article_applications" ("article_id","application_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "article_companies_pk" ON "article_companies" ("article_id","company_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "article_components_pk" ON "article_components" ("article_id","component_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "article_robot_tags_pk" ON "article_robot_tags" ("article_id","robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "components_type_idx" ON "components" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "components_vendor_idx" ON "components" ("vendor");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "humanoid_robots_company_idx" ON "humanoid_robots" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "humanoid_robots_purpose_idx" ON "humanoid_robots" ("purpose");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "humanoid_robots_locomotion_idx" ON "humanoid_robots" ("locomotion_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "humanoid_robots_hand_type_idx" ON "humanoid_robots" ("hand_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "humanoid_robots_stage_idx" ON "humanoid_robots" ("commercialization_stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "humanoid_robots_region_idx" ON "humanoid_robots" ("region");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pipeline_step_logs_run_idx" ON "pipeline_step_logs" ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "robot_components_pk" ON "robot_components" ("robot_id","component_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "talent_trends_company_year_idx" ON "talent_trends" ("company_id","year");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "allowed_emails" ADD CONSTRAINT "allowed_emails_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_cases" ADD CONSTRAINT "application_cases_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_applications" ADD CONSTRAINT "article_applications_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_applications" ADD CONSTRAINT "article_applications_application_id_application_cases_id_fk" FOREIGN KEY ("application_id") REFERENCES "application_cases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_companies" ADD CONSTRAINT "article_companies_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_companies" ADD CONSTRAINT "article_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_components" ADD CONSTRAINT "article_components_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_components" ADD CONSTRAINT "article_components_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_robot_tags" ADD CONSTRAINT "article_robot_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_robot_tags" ADD CONSTRAINT "article_robot_tags_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "body_specs" ADD CONSTRAINT "body_specs_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "computing_specs" ADD CONSTRAINT "computing_specs_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hand_specs" ADD CONSTRAINT "hand_specs_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "humanoid_robots" ADD CONSTRAINT "humanoid_robots_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_runs" ADD CONSTRAINT "pipeline_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pipeline_step_logs" ADD CONSTRAINT "pipeline_step_logs_run_id_pipeline_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "power_specs" ADD CONSTRAINT "power_specs_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "robot_components" ADD CONSTRAINT "robot_components_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "robot_components" ADD CONSTRAINT "robot_components_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "components"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sensor_specs" ADD CONSTRAINT "sensor_specs_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "talent_trends" ADD CONSTRAINT "talent_trends_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workforce_data" ADD CONSTRAINT "workforce_data_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
