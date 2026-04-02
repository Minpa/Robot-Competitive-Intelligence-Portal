/**
 * Startup migration: ensure regulatory_documents table exists.
 */
import { sql } from 'drizzle-orm';
import { db } from './index.js';
import fs from 'fs';
import path from 'path';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'regulatory-docs');

export async function ensureRegulatoryDocumentsSchema() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS regulatory_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        regulation_id UUID REFERENCES regulations(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT,
        filename VARCHAR(500) NOT NULL,
        stored_filename VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER,
        category VARCHAR(50),
        region VARCHAR(50),
        tags JSONB DEFAULT '[]'::jsonb,
        linked_checklist_items JSONB DEFAULT '[]'::jsonb,
        uploaded_by VARCHAR(100) DEFAULT 'system',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS regulatory_documents_regulation_idx
        ON regulatory_documents (regulation_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS regulatory_documents_category_idx
        ON regulatory_documents (category)
    `);

    // Ensure uploads directory exists
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    console.log('[startup] Regulatory documents schema ensured');
  } catch (err) {
    console.error('[startup] Regulatory documents schema migration failed (non-fatal):', err);
  }
}
