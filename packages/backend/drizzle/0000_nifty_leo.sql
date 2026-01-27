CREATE TABLE IF NOT EXISTS "article_keywords" (
	"article_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"frequency" integer DEFAULT 1,
	"tfidf_score" numeric(10, 6)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"company_id" uuid,
	"title" varchar(500) NOT NULL,
	"source" varchar(255) NOT NULL,
	"url" varchar(1000) NOT NULL,
	"published_at" timestamp,
	"summary" text,
	"content" text,
	"language" varchar(10) DEFAULT 'en',
	"content_hash" varchar(64) NOT NULL,
	"collected_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100),
	"entity_id" uuid,
	"changes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"country" varchar(100) NOT NULL,
	"category" varchar(100) NOT NULL,
	"homepage_url" varchar(500),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crawl_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid,
	"url" varchar(1000) NOT NULL,
	"error_type" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crawl_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_id" uuid,
	"status" varchar(50) DEFAULT 'pending',
	"started_at" timestamp,
	"completed_at" timestamp,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"duplicate_count" integer DEFAULT 0,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crawl_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar(255) NOT NULL,
	"urls" jsonb DEFAULT '[]'::jsonb,
	"patterns" jsonb DEFAULT '[]'::jsonb,
	"cron_expression" varchar(100) DEFAULT '0 0 * * 0',
	"rate_limit" jsonb,
	"enabled" boolean DEFAULT true,
	"last_crawled" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "keyword_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"keyword_id" uuid NOT NULL,
	"period_type" varchar(20) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"delta" integer DEFAULT 0,
	"delta_percent" numeric(10, 2),
	"related_company_id" uuid,
	"related_product_id" uuid,
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "keywords" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" varchar(255) NOT NULL,
	"language" varchar(10) DEFAULT 'en',
	"category" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_keywords" (
	"product_id" uuid NOT NULL,
	"keyword_id" uuid NOT NULL,
	"relevance_score" numeric(5, 4)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"dof" integer,
	"payload_kg" numeric(10, 2),
	"speed_mps" numeric(10, 2),
	"battery_minutes" integer,
	"sensors" jsonb,
	"control_architecture" varchar(255),
	"os" varchar(100),
	"sdk" varchar(100),
	"price_min" numeric(15, 2),
	"price_max" numeric(15, 2),
	"price_currency" varchar(10) DEFAULT 'USD',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_specs_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"series" varchar(100),
	"type" varchar(50) NOT NULL,
	"release_date" date,
	"target_market" varchar(255),
	"status" varchar(50) DEFAULT 'announced',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'viewer',
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "article_keywords_pk" ON "article_keywords" ("article_id","keyword_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "articles_content_hash_idx" ON "articles" ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_company_idx" ON "articles" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_product_idx" ON "articles" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_published_at_idx" ON "articles" ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_language_idx" ON "articles" ("language");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_idx" ON "audit_logs" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_name_idx" ON "companies" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "companies_country_idx" ON "companies" ("country");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_errors_job_idx" ON "crawl_errors" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_errors_occurred_at_idx" ON "crawl_errors" ("occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_jobs_target_idx" ON "crawl_jobs" ("target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crawl_jobs_status_idx" ON "crawl_jobs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keyword_stats_keyword_period_idx" ON "keyword_stats" ("keyword_id","period_type","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "keywords_term_language_idx" ON "keywords" ("term","language");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_keywords_pk" ON "product_keywords" ("product_id","keyword_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_company_idx" ON "products" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_type_idx" ON "products" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_release_date_idx" ON "products" ("release_date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_keywords" ADD CONSTRAINT "article_keywords_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_keywords" ADD CONSTRAINT "article_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_errors" ADD CONSTRAINT "crawl_errors_job_id_crawl_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "crawl_jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_target_id_crawl_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "crawl_targets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "keyword_stats" ADD CONSTRAINT "keyword_stats_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "keyword_stats" ADD CONSTRAINT "keyword_stats_related_company_id_companies_id_fk" FOREIGN KEY ("related_company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "keyword_stats" ADD CONSTRAINT "keyword_stats_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_keywords" ADD CONSTRAINT "product_keywords_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_keywords" ADD CONSTRAINT "product_keywords_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "keywords"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
