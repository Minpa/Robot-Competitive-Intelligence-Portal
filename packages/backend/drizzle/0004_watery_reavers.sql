CREATE TABLE IF NOT EXISTS "ai_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(20) NOT NULL,
	"model" varchar(100) NOT NULL,
	"web_search" boolean DEFAULT false NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"query" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"market_size_billion_usd" numeric(10, 2),
	"cagr_percent" numeric(6, 2),
	"som_billion_usd" numeric(10, 2),
	"key_tasks" jsonb,
	"entry_barriers" jsonb,
	"lg_existing_business" numeric(3, 2),
	"lg_readiness" numeric(3, 2),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "application_domains_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "competitive_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) DEFAULT 'info',
	"title" varchar(500) NOT NULL,
	"summary" text,
	"trigger_data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_by" uuid,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "domain_robot_fit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_id" uuid NOT NULL,
	"robot_id" uuid NOT NULL,
	"fit_score" numeric(3, 2),
	"fit_details" jsonb,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entity_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"alias_name" varchar(300) NOT NULL,
	"language" varchar(5),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"evaluated_by" uuid,
	"tech_score" integer NOT NULL,
	"quality_score" integer NOT NULL,
	"cost_score" integer NOT NULL,
	"delivery_score" integer NOT NULL,
	"support_score" integer NOT NULL,
	"overall_score" numeric(4, 2),
	"comments" text,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_robot_adoptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"robot_id" uuid NOT NULL,
	"adoption_status" varchar(50) DEFAULT 'evaluating' NOT NULL,
	"adopted_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"sub_category" varchar(100),
	"country" varchar(100),
	"description" text,
	"logo_url" varchar(500),
	"website_url" varchar(500),
	"tech_capability" integer,
	"lg_compatibility" integer,
	"market_share" numeric(5, 4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poc_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"payload_score" integer NOT NULL,
	"operation_time_score" integer NOT NULL,
	"finger_dof_score" integer NOT NULL,
	"form_factor_score" integer NOT NULL,
	"poc_deployment_score" integer NOT NULL,
	"cost_efficiency_score" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "positioning_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chart_type" varchar(50) NOT NULL,
	"robot_id" uuid,
	"label" varchar(255) NOT NULL,
	"x_value" numeric(10, 4) NOT NULL,
	"y_value" numeric(10, 4) NOT NULL,
	"bubble_size" numeric(10, 4) NOT NULL,
	"color_group" varchar(50),
	"metadata" jsonb,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rfm_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"rfm_model_name" varchar(255) NOT NULL,
	"generality_score" integer NOT NULL,
	"real_world_data_score" integer NOT NULL,
	"edge_inference_score" integer NOT NULL,
	"multi_robot_collab_score" integer NOT NULL,
	"open_source_score" integer NOT NULL,
	"commercial_maturity_score" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"evaluated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "score_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"snapshot_month" varchar(7) NOT NULL,
	"poc_scores" jsonb,
	"rfm_scores" jsonb,
	"combined_score" numeric(6, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spec_change_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"robot_id" uuid NOT NULL,
	"changed_by" uuid,
	"field_name" varchar(255) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategic_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"metric_type" varchar(100) NOT NULL,
	"target_value" numeric(10, 2) NOT NULL,
	"current_value" numeric(10, 2),
	"deadline" date,
	"status" varchar(50) DEFAULT 'on_track',
	"required_actions" jsonb,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "view_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"view_name" varchar(100) NOT NULL,
	"data" jsonb NOT NULL,
	"cached_at" timestamp DEFAULT now() NOT NULL,
	"ttl_ms" integer NOT NULL,
	CONSTRAINT "view_cache_view_name_unique" UNIQUE("view_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatif_scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_by" uuid,
	"base_robot_id" uuid,
	"parameter_overrides" jsonb NOT NULL,
	"calculated_scores" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "valuation_usd" numeric(15, 2);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_logs_provider_idx" ON "ai_usage_logs" ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_logs_created_at_idx" ON "ai_usage_logs" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "application_domains_name_idx" ON "application_domains" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitive_alerts_robot_idx" ON "competitive_alerts" ("robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitive_alerts_type_idx" ON "competitive_alerts" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitive_alerts_is_read_idx" ON "competitive_alerts" ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "competitive_alerts_created_at_idx" ON "competitive_alerts" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "domain_robot_fit_domain_robot_uniq" ON "domain_robot_fit" ("domain_id","robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_robot_fit_domain_idx" ON "domain_robot_fit" ("domain_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_robot_fit_robot_idx" ON "domain_robot_fit" ("robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "entity_aliases_entity_idx" ON "entity_aliases" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_evaluations_partner_idx" ON "partner_evaluations" ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_evaluations_evaluated_by_idx" ON "partner_evaluations" ("evaluated_by");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partner_robot_adoptions_partner_robot_uniq" ON "partner_robot_adoptions" ("partner_id","robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_robot_adoptions_partner_idx" ON "partner_robot_adoptions" ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partner_robot_adoptions_robot_idx" ON "partner_robot_adoptions" ("robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partners_category_idx" ON "partners" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partners_sub_category_idx" ON "partners" ("sub_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partners_country_idx" ON "partners" ("country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "poc_scores_robot_idx" ON "poc_scores" ("robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positioning_data_robot_idx" ON "positioning_data" ("robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "positioning_data_chart_type_idx" ON "positioning_data" ("chart_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rfm_scores_robot_idx" ON "rfm_scores" ("robot_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "score_history_robot_month_uniq" ON "score_history" ("robot_id","snapshot_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_history_robot_idx" ON "score_history" ("robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "score_history_snapshot_month_idx" ON "score_history" ("snapshot_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spec_change_logs_robot_idx" ON "spec_change_logs" ("robot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spec_change_logs_changed_by_idx" ON "spec_change_logs" ("changed_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spec_change_logs_changed_at_idx" ON "spec_change_logs" ("changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "strategic_goals_metric_type_idx" ON "strategic_goals" ("metric_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "strategic_goals_status_idx" ON "strategic_goals" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "strategic_goals_created_by_idx" ON "strategic_goals" ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "view_cache_view_name_idx" ON "view_cache" ("view_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatif_scenarios_created_by_idx" ON "whatif_scenarios" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatif_scenarios_base_robot_idx" ON "whatif_scenarios" ("base_robot_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitive_alerts" ADD CONSTRAINT "competitive_alerts_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "competitive_alerts" ADD CONSTRAINT "competitive_alerts_read_by_users_id_fk" FOREIGN KEY ("read_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "domain_robot_fit" ADD CONSTRAINT "domain_robot_fit_domain_id_application_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "application_domains"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "domain_robot_fit" ADD CONSTRAINT "domain_robot_fit_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_evaluations" ADD CONSTRAINT "partner_evaluations_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_evaluations" ADD CONSTRAINT "partner_evaluations_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_robot_adoptions" ADD CONSTRAINT "partner_robot_adoptions_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partner_robot_adoptions" ADD CONSTRAINT "partner_robot_adoptions_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "poc_scores" ADD CONSTRAINT "poc_scores_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "positioning_data" ADD CONSTRAINT "positioning_data_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rfm_scores" ADD CONSTRAINT "rfm_scores_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "score_history" ADD CONSTRAINT "score_history_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spec_change_logs" ADD CONSTRAINT "spec_change_logs_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("robot_id") REFERENCES "humanoid_robots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spec_change_logs" ADD CONSTRAINT "spec_change_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strategic_goals" ADD CONSTRAINT "strategic_goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatif_scenarios" ADD CONSTRAINT "whatif_scenarios_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatif_scenarios" ADD CONSTRAINT "whatif_scenarios_base_robot_id_humanoid_robots_id_fk" FOREIGN KEY ("base_robot_id") REFERENCES "humanoid_robots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
