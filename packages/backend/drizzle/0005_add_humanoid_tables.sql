-- 휴머노이드 로봇 테이블
CREATE TABLE IF NOT EXISTS humanoid_robots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  announcement_year INTEGER,
  status VARCHAR(50) DEFAULT 'development',
  purpose VARCHAR(50),
  locomotion_type VARCHAR(50),
  hand_type VARCHAR(50),
  commercialization_stage VARCHAR(50),
  region VARCHAR(50),
  image_url VARCHAR(500),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS humanoid_robots_company_idx ON humanoid_robots(company_id);
CREATE INDEX IF NOT EXISTS humanoid_robots_purpose_idx ON humanoid_robots(purpose);
CREATE INDEX IF NOT EXISTS humanoid_robots_locomotion_idx ON humanoid_robots(locomotion_type);
CREATE INDEX IF NOT EXISTS humanoid_robots_hand_type_idx ON humanoid_robots(hand_type);
CREATE INDEX IF NOT EXISTS humanoid_robots_stage_idx ON humanoid_robots(commercialization_stage);
CREATE INDEX IF NOT EXISTS humanoid_robots_region_idx ON humanoid_robots(region);

-- Body Spec 테이블
CREATE TABLE IF NOT EXISTS body_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL UNIQUE REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  height_cm DECIMAL(6, 2),
  weight_kg DECIMAL(6, 2),
  payload_kg DECIMAL(6, 2),
  dof_count INTEGER,
  max_speed_mps DECIMAL(4, 2),
  operation_time_hours DECIMAL(4, 2),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Hand Spec 테이블
CREATE TABLE IF NOT EXISTS hand_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL UNIQUE REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  hand_type VARCHAR(50),
  finger_count INTEGER,
  hand_dof INTEGER,
  grip_force_n DECIMAL(6, 2),
  is_interchangeable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Computing Spec 테이블
CREATE TABLE IF NOT EXISTS computing_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL UNIQUE REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  main_soc VARCHAR(255),
  tops_min DECIMAL(8, 2),
  tops_max DECIMAL(8, 2),
  architecture_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Sensor Spec 테이블
CREATE TABLE IF NOT EXISTS sensor_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL UNIQUE REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  cameras JSONB,
  depth_sensor VARCHAR(255),
  lidar VARCHAR(255),
  imu VARCHAR(255),
  force_torque VARCHAR(255),
  touch_sensors JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Power Spec 테이블
CREATE TABLE IF NOT EXISTS power_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL UNIQUE REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  battery_type VARCHAR(100),
  capacity_wh DECIMAL(8, 2),
  operation_time_hours DECIMAL(4, 2),
  charging_method VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Workforce Data 테이블
CREATE TABLE IF NOT EXISTS workforce_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  total_headcount_min INTEGER,
  total_headcount_max INTEGER,
  humanoid_team_size INTEGER,
  job_distribution JSONB,
  recorded_at TIMESTAMP,
  source VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Talent Trends 테이블
CREATE TABLE IF NOT EXISTS talent_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_headcount INTEGER,
  humanoid_team_size INTEGER,
  job_posting_count INTEGER,
  recorded_at TIMESTAMP,
  source VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS talent_trends_company_year_idx ON talent_trends(company_id, year);

-- Components 테이블
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  vendor VARCHAR(255),
  specifications JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS components_type_idx ON components(type);
CREATE INDEX IF NOT EXISTS components_vendor_idx ON components(vendor);

-- Robot Components 연결 테이블
CREATE TABLE IF NOT EXISTS robot_components (
  robot_id UUID NOT NULL REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  usage_location VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (robot_id, component_id)
);

-- Application Cases 테이블
CREATE TABLE IF NOT EXISTS application_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  environment_type VARCHAR(50),
  task_type VARCHAR(50),
  task_description TEXT,
  deployment_status VARCHAR(50),
  demo_event VARCHAR(255),
  demo_date DATE,
  video_url VARCHAR(500),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS application_cases_robot_idx ON application_cases(robot_id);
CREATE INDEX IF NOT EXISTS application_cases_environment_idx ON application_cases(environment_type);
CREATE INDEX IF NOT EXISTS application_cases_task_idx ON application_cases(task_type);

-- Article Robot Tags 연결 테이블
CREATE TABLE IF NOT EXISTS article_robot_tags (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  robot_id UUID NOT NULL REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (article_id, robot_id)
);

-- Companies 테이블에 추가 필드 (logo_url, city, founding_year, main_business)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founding_year INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS main_business VARCHAR(255);

-- Articles 테이블에 submitted_by 필드 추가
ALTER TABLE articles ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id) ON DELETE SET NULL;
