-- ARGOS_I 요청 인터페이스 (ARGOS_I → ARGOS 요청 큐 + 사내 정보 거부 통계)
-- 런타임 ensureArgosIRequestTables() (src/db/argos-i-requests.ddl.ts) 와 동일 DDL (어느 쪽이 먼저 만들어도 충돌 없음).
-- drizzle _journal 에는 등록하지 않는다 (0027~0031 과 동일: 수동 migrate 호환용).
-- ARGOS_I 전체 DB 덤프 제외 테이블 (note 는 사내 담당자가 쓴 자유 텍스트, 거부 통계는 운영 정보).
-- argos_i_request_rejects 는 사유 코드별 카운트만 가진다 (거부된 본문·값·키 이름은 어디에도 저장하지 않는다).
CREATE TABLE IF NOT EXISTS argos_i_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL CHECK (type IN ('add_source','analyze','query','regenerate_brief','watch_register')),
  params JSONB NOT NULL,
  note VARCHAR(200),
  status VARCHAR(16) NOT NULL CHECK (status IN ('queued','needs_approval','running','done','failed','rejected','cancelled','unsupported')),
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  approval_reason VARCHAR(40),
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  result JSONB,
  error_code VARCHAR(40),
  attempts INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  cost_provider VARCHAR(10),
  payload_hash CHAR(64) NOT NULL,
  idempotency_hash CHAR(64),
  requested_by VARCHAR(20) NOT NULL DEFAULT 'argos-i',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS argos_i_requests_status_created_idx ON argos_i_requests (status, created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS argos_i_requests_created_idx ON argos_i_requests (created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS argos_i_requests_idem_uniq ON argos_i_requests (idempotency_hash) WHERE idempotency_hash IS NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS argos_i_request_rejects (
  day DATE NOT NULL,
  reason_code VARCHAR(40) NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, reason_code)
);
