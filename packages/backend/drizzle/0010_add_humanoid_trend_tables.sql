-- 휴머노이드 동향 대시보드 테이블 (poc_scores, rfm_scores, positioning_data)

-- PoC Scores — 산업용 PoC 팩터별 역량 점수
CREATE TABLE IF NOT EXISTS poc_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  payload_score INTEGER NOT NULL,
  operation_time_score INTEGER NOT NULL,
  finger_dof_score INTEGER NOT NULL,
  form_factor_score INTEGER NOT NULL,
  poc_deployment_score INTEGER NOT NULL,
  cost_efficiency_score INTEGER NOT NULL,
  evaluated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS poc_scores_robot_idx ON poc_scores(robot_id);

-- RFM Scores — Robot Foundation Model 역량 점수
CREATE TABLE IF NOT EXISTS rfm_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_id UUID NOT NULL REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  rfm_model_name VARCHAR(255) NOT NULL,
  generality_score INTEGER NOT NULL,
  real_world_data_score INTEGER NOT NULL,
  edge_inference_score INTEGER NOT NULL,
  multi_robot_collab_score INTEGER NOT NULL,
  open_source_score INTEGER NOT NULL,
  commercial_maturity_score INTEGER NOT NULL,
  evaluated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS rfm_scores_robot_idx ON rfm_scores(robot_id);

-- Positioning Data — 버블 차트용 포지셔닝 데이터
CREATE TABLE IF NOT EXISTS positioning_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_type VARCHAR(50) NOT NULL,
  robot_id UUID REFERENCES humanoid_robots(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL,
  x_value DECIMAL(10, 4) NOT NULL,
  y_value DECIMAL(10, 4) NOT NULL,
  bubble_size DECIMAL(10, 4) NOT NULL,
  color_group VARCHAR(50),
  metadata JSONB,
  evaluated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS positioning_data_robot_idx ON positioning_data(robot_id);
CREATE INDEX IF NOT EXISTS positioning_data_chart_type_idx ON positioning_data(chart_type);
