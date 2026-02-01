-- Add product_type column to articles table
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "product_type" varchar(50) DEFAULT 'none';
