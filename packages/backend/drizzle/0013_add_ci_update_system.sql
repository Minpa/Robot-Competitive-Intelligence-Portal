-- v1.6 CI 업데이트 시스템 테이블
-- CI Competitors, Layers, Categories, Items, Values, Monitor Alerts,
-- Value History, Freshness, Staging

-- CI Competitors — 경쟁 로봇
CREATE TABLE IF NOT EXISTS "ci_competitors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(50) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "manufacturer" varchar(255) NOT NULL,
  "country" varchar(100),
  "stage" varchar(50) DEFAULT 'development',
  "image_url" varchar(500),
  "sort_order" integer DEFAULT 0,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- CI Layers — 비교 레이어
CREATE TABLE IF NOT EXISTS "ci_layers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" varchar(30) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "icon" varchar(10),
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- CI Categories — 레이어 내 카테고리
CREATE TABLE IF NOT EXISTS "ci_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "layer_id" uuid NOT NULL REFERENCES "ci_layers"("id") ON DELETE CASCADE,
  "name" varchar(200) NOT NULL,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ci_categories_layer_idx" ON "ci_categories" ("layer_id");

-- CI Items — 카테고리 내 비교 항목
CREATE TABLE IF NOT EXISTS "ci_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "ci_categories"("id") ON DELETE CASCADE,
  "name" varchar(200) NOT NULL,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "ci_items_category_idx" ON "ci_items" ("category_id");

-- CI Values — 경쟁사 × 항목별 값
CREATE TABLE IF NOT EXISTS "ci_values" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "competitor_id" uuid NOT NULL REFERENCES "ci_competitors"("id") ON DELETE CASCADE,
  "item_id" uuid NOT NULL REFERENCES "ci_items"("id") ON DELETE CASCADE,
  "value" text,
  "confidence" varchar(1) DEFAULT 'D',
  "source" text,
  "source_url" varchar(1000),
  "source_date" date,
  "last_verified" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ci_values_competitor_item_uniq" ON "ci_values" ("competitor_id", "item_id");
CREATE INDEX IF NOT EXISTS "ci_values_competitor_idx" ON "ci_values" ("competitor_id");
CREATE INDEX IF NOT EXISTS "ci_values_item_idx" ON "ci_values" ("item_id");

-- CI Monitor Alerts — 자동 수집 알림
CREATE TABLE IF NOT EXISTS "ci_monitor_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source_name" varchar(200),
  "source_url" text,
  "headline" text NOT NULL,
  "summary" text,
  "competitor_id" uuid REFERENCES "ci_competitors"("id") ON DELETE SET NULL,
  "layer_id" uuid REFERENCES "ci_layers"("id") ON DELETE SET NULL,
  "detected_at" timestamp DEFAULT now() NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "applied_to" uuid REFERENCES "ci_values"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp,
  "reviewed_by" varchar(100)
);
CREATE INDEX IF NOT EXISTS "ci_monitor_alerts_status_idx" ON "ci_monitor_alerts" ("status");
CREATE INDEX IF NOT EXISTS "ci_monitor_alerts_competitor_idx" ON "ci_monitor_alerts" ("competitor_id");
CREATE INDEX IF NOT EXISTS "ci_monitor_alerts_detected_at_idx" ON "ci_monitor_alerts" ("detected_at");

-- CI Value History — 값 변경 이력
CREATE TABLE IF NOT EXISTS "ci_value_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "value_id" uuid NOT NULL REFERENCES "ci_values"("id") ON DELETE CASCADE,
  "old_value" text,
  "new_value" text,
  "old_confidence" varchar(1),
  "new_confidence" varchar(1),
  "change_source" varchar(20) NOT NULL,
  "change_reason" text,
  "changed_at" timestamp DEFAULT now() NOT NULL,
  "changed_by" varchar(100)
);
CREATE INDEX IF NOT EXISTS "ci_value_history_value_idx" ON "ci_value_history" ("value_id");
CREATE INDEX IF NOT EXISTS "ci_value_history_changed_at_idx" ON "ci_value_history" ("changed_at");

-- CI Freshness — 데이터 신선도 추적
CREATE TABLE IF NOT EXISTS "ci_freshness" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "layer_id" uuid NOT NULL REFERENCES "ci_layers"("id") ON DELETE CASCADE,
  "competitor_id" uuid NOT NULL REFERENCES "ci_competitors"("id") ON DELETE CASCADE,
  "last_verified" timestamp,
  "next_review" timestamp,
  "tier" integer DEFAULT 2 NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ci_freshness_layer_competitor_uniq" ON "ci_freshness" ("layer_id", "competitor_id");

-- CI Staging — 스테이징 (검증 대기)
CREATE TABLE IF NOT EXISTS "ci_staging" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "update_type" varchar(20) NOT NULL,
  "payload" jsonb NOT NULL,
  "source_channel" varchar(20) NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "reviewed_at" timestamp,
  "reviewed_by" varchar(100),
  "applied_at" timestamp
);
CREATE INDEX IF NOT EXISTS "ci_staging_status_idx" ON "ci_staging" ("status");
CREATE INDEX IF NOT EXISTS "ci_staging_created_at_idx" ON "ci_staging" ("created_at");
