-- 액추에이터 조달 태세 · 수요 사례 · 공급사 타깃 시장
-- 런타임 ensureActuatorSourcingTables() (src/db/actuator-sourcing.ddl.ts) 와 동일 DDL (어느 쪽이 먼저 만들어도 충돌 없음).
-- drizzle _journal 에는 등록하지 않는다 (0027 과 동일: 수동 migrate 호환용).
CREATE TABLE IF NOT EXISTS actuator_sourcing (
  robot_id UUID PRIMARY KEY REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  sourcing VARCHAR(24) NOT NULL,
  sells_externally BOOLEAN,
  evidence_grade VARCHAR(8),
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  external_vendors JSONB NOT NULL DEFAULT '[]'::jsonb,
  note_ko TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS actuator_adoptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_key VARCHAR(400) NOT NULL UNIQUE,
  robot_name VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  country VARCHAR(100),
  segment VARCHAR(32) NOT NULL,
  level VARCHAR(16) NOT NULL DEFAULT 'module',
  robot_class VARCHAR(100),
  actuator_vendor VARCHAR(255) NOT NULL,
  actuator_model VARCHAR(255),
  usage_text TEXT,
  evidence_grade VARCHAR(8),
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  note_ko TEXT,
  adopted_year INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS actuator_adoptions_vendor_idx ON actuator_adoptions (actuator_vendor);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS actuator_vendor_markets (
  vendor_key VARCHAR(200) PRIMARY KEY,
  vendor VARCHAR(255) NOT NULL,
  target_markets_ko JSONB NOT NULL DEFAULT '[]'::jsonb,
  segments JSONB,
  grade VARCHAR(8),
  url TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
