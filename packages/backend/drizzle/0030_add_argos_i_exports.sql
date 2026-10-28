-- ARGOS_I 일일 스냅샷 내보내기 (번들 메타 날짜당 1행 + 파일 본문 BYTEA)
-- 런타임 ensureArgosIExportTables() (src/db/argos-i-export.ddl.ts) 와 동일 DDL (어느 쪽이 먼저 만들어도 충돌 없음).
-- drizzle _journal 에는 등록하지 않는다 (0027~0029 와 동일: 수동 migrate 호환용).
CREATE TABLE IF NOT EXISTS argos_i_exports (
  export_date DATE PRIMARY KEY,
  status VARCHAR(10) NOT NULL CHECK (status IN ('ok','partial')),
  schema_version INTEGER NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  as_of TIMESTAMPTZ NOT NULL,
  reason VARCHAR(16) NOT NULL,
  file_count INTEGER NOT NULL,
  total_bytes BIGINT NOT NULL,
  bundle_sha256 CHAR(64) NOT NULL,
  duration_ms INTEGER NOT NULL,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS argos_i_export_files (
  export_date DATE NOT NULL REFERENCES argos_i_exports(export_date) ON DELETE CASCADE,
  path VARCHAR(100) NOT NULL,
  area VARCHAR(40),
  format VARCHAR(8) NOT NULL CHECK (format IN ('md','json')),
  content BYTEA NOT NULL,
  sha256 CHAR(64) NOT NULL,
  byte_size INTEGER NOT NULL,
  record_count INTEGER,
  PRIMARY KEY (export_date, path)
);
