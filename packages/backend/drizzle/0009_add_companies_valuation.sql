-- companies 테이블에 valuation_usd 컬럼 추가 (REQ-07 7.60, REQ-09 9.82)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS valuation_usd DECIMAL(15, 2);
