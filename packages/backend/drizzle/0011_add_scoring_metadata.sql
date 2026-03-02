-- poc_scores, rfm_scores 테이블에 metadata JSONB 컬럼 추가

ALTER TABLE poc_scores ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE rfm_scores ADD COLUMN metadata JSONB DEFAULT '{}';
