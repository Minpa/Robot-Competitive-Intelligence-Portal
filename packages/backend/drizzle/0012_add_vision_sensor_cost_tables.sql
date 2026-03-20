-- vision_sensor_bom_parts: 센서/컴퓨트 부품 단가 기준표
CREATE TABLE IF NOT EXISTS "vision_sensor_bom_parts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "part_name" varchar(255) NOT NULL,
  "part_type" varchar(50) NOT NULL,
  "unit_price_min" integer NOT NULL,
  "unit_price_max" integer NOT NULL,
  "unit_price_mid" integer NOT NULL,
  "price_unit" varchar(30) NOT NULL DEFAULT 'ea',
  "source_basis" varchar(500),
  "source_reliability" varchar(10) NOT NULL DEFAULT 'D',
  "example_robot" varchar(255),
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- vision_sensor_robot_costs: 로봇별 비전 시스템 원가 타임라인
CREATE TABLE IF NOT EXISTS "vision_sensor_robot_costs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "robot_id" uuid REFERENCES "humanoid_robots"("id") ON DELETE SET NULL,
  "robot_label" varchar(255) NOT NULL,
  "company_name" varchar(100) NOT NULL,
  "release_year" integer NOT NULL,
  "is_forecast" boolean NOT NULL DEFAULT false,
  "camera_desc" varchar(300),
  "camera_cost_usd" integer NOT NULL DEFAULT 0,
  "lidar_depth_desc" varchar(300),
  "lidar_depth_cost_usd" integer NOT NULL DEFAULT 0,
  "compute_desc" varchar(300),
  "compute_cost_usd" integer NOT NULL DEFAULT 0,
  "total_cost_usd" integer NOT NULL,
  "performance_level" numeric(3,1) NOT NULL,
  "performance_note" varchar(300),
  "reliability_grade" varchar(10) NOT NULL DEFAULT 'D',
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "vision_robot_costs_company_idx" ON "vision_sensor_robot_costs" ("company_name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vision_robot_costs_year_idx" ON "vision_sensor_robot_costs" ("release_year");
