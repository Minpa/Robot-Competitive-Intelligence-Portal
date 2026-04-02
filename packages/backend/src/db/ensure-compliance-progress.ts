/**
 * Startup migration: ensure compliance_progress_logs table and new columns exist.
 */
import { sql } from 'drizzle-orm';
import { db } from './index.js';

export async function ensureComplianceProgressSchema() {
  try {
    // Add new columns to compliance_checklist if not present
    await db.execute(sql`
      ALTER TABLE compliance_checklist
        ADD COLUMN IF NOT EXISTS industrial_reg_comparison TEXT,
        ADD COLUMN IF NOT EXISTS industrial_reg_why_different TEXT,
        ADD COLUMN IF NOT EXISTS industrial_reg_approach TEXT,
        ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0
    `);

    // Create progress logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliance_progress_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        checklist_item_id UUID NOT NULL REFERENCES compliance_checklist(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        progress_pct_before INTEGER,
        progress_pct_after INTEGER,
        status_before VARCHAR(30),
        status_after VARCHAR(30),
        author VARCHAR(100) DEFAULT 'system',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS compliance_progress_logs_checklist_item_idx
        ON compliance_progress_logs (checklist_item_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS compliance_progress_logs_created_at_idx
        ON compliance_progress_logs (created_at)
    `);

    console.log('[startup] Compliance progress schema ensured');
  } catch (err) {
    console.error('[startup] Compliance progress schema migration failed (non-fatal):', err);
  }
}
