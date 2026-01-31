-- Add category column to articles table
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "category" varchar(50) DEFAULT 'other';
