-- View_Cache 테이블 — 뷰별 캐시 영속화 (REQ-11, 11.101~11.109)
CREATE TABLE IF NOT EXISTS view_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  view_name VARCHAR(100) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  cached_at TIMESTAMP DEFAULT NOW() NOT NULL,
  ttl_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS view_cache_view_name_idx ON view_cache(view_name);
