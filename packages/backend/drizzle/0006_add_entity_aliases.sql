-- Entity_Alias 테이블 — 다국어 별칭 관리 (REQ-05, 5.49)
CREATE TABLE IF NOT EXISTS entity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  alias_name VARCHAR(300) NOT NULL,
  language VARCHAR(5),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS entity_aliases_entity_idx ON entity_aliases(entity_type, entity_id);
