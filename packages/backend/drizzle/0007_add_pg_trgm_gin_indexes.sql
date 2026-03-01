-- pg_trgm 확장 활성화 (REQ-05, 5.43, 5.49)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Entity_Alias GIN 인덱스 (trigram fuzzy 매칭용)
CREATE INDEX IF NOT EXISTS entity_aliases_alias_gin ON entity_aliases USING gin (alias_name gin_trgm_ops);

-- 기존 테이블에 GIN 인덱스 추가 (fuzzy 검색 성능 최적화)
CREATE INDEX IF NOT EXISTS companies_name_gin ON companies USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS humanoid_robots_name_gin ON humanoid_robots USING gin (name gin_trgm_ops);
