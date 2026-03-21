import {
  db,
  ciCompetitors,
  ciLayers,
  ciCategories,
  ciItems,
  ciValues,
  ciValueHistory,
  ciFreshness,
  ciStaging,
  ciMonitorAlerts,
} from '../db/index.js';
import { eq, desc, and, asc, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Types
// ============================================

interface CiMatrixValue {
  id: string;
  value: string | null;
  confidence: string | null;
  source: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
  lastVerified: Date | null;
  updatedAt: Date;
}

interface CiMatrixItem {
  id: string;
  name: string;
  sortOrder: number | null;
  values: Record<string, CiMatrixValue>; // keyed by competitorId
}

interface CiMatrixCategory {
  id: string;
  name: string;
  sortOrder: number | null;
  items: CiMatrixItem[];
}

interface CiMatrixLayer {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number | null;
  categories: CiMatrixCategory[];
}

export interface CiMatrixData {
  competitors: (typeof ciCompetitors.$inferSelect)[];
  layers: CiMatrixLayer[];
}

export interface FreshnessSummary {
  id: string;
  layerId: string;
  competitorId: string;
  lastVerified: Date | null;
  nextReview: Date | null;
  tier: number;
}

// ============================================
// Service
// ============================================

class CiUpdateService {
  // === Dashboard Data ===

  /**
   * Get full CI matrix data: layers -> categories -> items -> values per competitor
   */
  async getFullMatrix(): Promise<CiMatrixData> {
    // Fetch competitors (active only), ordered by sortOrder
    const competitors = await db
      .select()
      .from(ciCompetitors)
      .where(eq(ciCompetitors.isActive, true))
      .orderBy(asc(ciCompetitors.sortOrder));

    // Fetch all layers ordered by sortOrder
    const layers = await db
      .select()
      .from(ciLayers)
      .orderBy(asc(ciLayers.sortOrder));

    // Fetch all categories ordered by sortOrder
    const categories = await db
      .select()
      .from(ciCategories)
      .orderBy(asc(ciCategories.sortOrder));

    // Fetch all items ordered by sortOrder
    const items = await db
      .select()
      .from(ciItems)
      .orderBy(asc(ciItems.sortOrder));

    // Fetch all values
    const values = await db
      .select()
      .from(ciValues);

    // Index values by itemId -> competitorId
    const valuesMap = new Map<string, Map<string, CiMatrixValue>>();
    for (const v of values) {
      if (!valuesMap.has(v.itemId)) {
        valuesMap.set(v.itemId, new Map());
      }
      valuesMap.get(v.itemId)!.set(v.competitorId, {
        id: v.id,
        value: v.value,
        confidence: v.confidence,
        source: v.source,
        sourceUrl: v.sourceUrl,
        sourceDate: v.sourceDate,
        lastVerified: v.lastVerified,
        updatedAt: v.updatedAt,
      });
    }

    // Index items by categoryId
    const itemsByCategory = new Map<string, CiMatrixItem[]>();
    for (const item of items) {
      if (!itemsByCategory.has(item.categoryId)) {
        itemsByCategory.set(item.categoryId, []);
      }
      const itemValues: Record<string, CiMatrixValue> = {};
      const itemValuesMap = valuesMap.get(item.id);
      if (itemValuesMap) {
        for (const [compId, val] of itemValuesMap) {
          itemValues[compId] = val;
        }
      }
      itemsByCategory.get(item.categoryId)!.push({
        id: item.id,
        name: item.name,
        sortOrder: item.sortOrder,
        values: itemValues,
      });
    }

    // Index categories by layerId
    const categoriesByLayer = new Map<string, CiMatrixCategory[]>();
    for (const cat of categories) {
      if (!categoriesByLayer.has(cat.layerId)) {
        categoriesByLayer.set(cat.layerId, []);
      }
      categoriesByLayer.get(cat.layerId)!.push({
        id: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
        items: itemsByCategory.get(cat.id) || [],
      });
    }

    // Assemble layers
    const matrixLayers: CiMatrixLayer[] = layers.map((layer) => ({
      id: layer.id,
      slug: layer.slug,
      name: layer.name,
      icon: layer.icon,
      sortOrder: layer.sortOrder,
      categories: categoriesByLayer.get(layer.id) || [],
    }));

    return {
      competitors,
      layers: matrixLayers,
    };
  }

  /**
   * Get all competitors
   */
  async getCompetitors(): Promise<(typeof ciCompetitors.$inferSelect)[]> {
    return db
      .select()
      .from(ciCompetitors)
      .orderBy(asc(ciCompetitors.sortOrder));
  }

  // === Value CRUD ===

  /**
   * Update a single CI value (inline edit)
   */
  async updateValue(
    valueId: string,
    data: {
      value?: string;
      confidence?: string;
      source?: string;
      sourceUrl?: string;
      sourceDate?: string;
    },
    changedBy: string,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // 1) Get old value
      const [oldRow] = await tx
        .select()
        .from(ciValues)
        .where(eq(ciValues.id, valueId));

      if (!oldRow) {
        throw new Error(`CI value not found: ${valueId}`);
      }

      // 2) Update ci_values
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.value !== undefined) updateData.value = data.value;
      if (data.confidence !== undefined) updateData.confidence = data.confidence;
      if (data.source !== undefined) updateData.source = data.source;
      if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl;
      if (data.sourceDate !== undefined) updateData.sourceDate = data.sourceDate;

      await tx
        .update(ciValues)
        .set(updateData)
        .where(eq(ciValues.id, valueId));

      // 3) Insert into ci_value_history
      await tx.insert(ciValueHistory).values({
        valueId,
        oldValue: oldRow.value,
        newValue: data.value ?? oldRow.value,
        oldConfidence: oldRow.confidence,
        newConfidence: data.confidence ?? oldRow.confidence,
        changeSource: 'manual',
        changeReason: null,
        changedBy,
      });

      // 4) Update freshness lastVerified for the corresponding layer/competitor
      // Find the item to get its category -> layer
      const [item] = await tx
        .select()
        .from(ciItems)
        .where(eq(ciItems.id, oldRow.itemId));

      if (item) {
        const [category] = await tx
          .select()
          .from(ciCategories)
          .where(eq(ciCategories.id, item.categoryId));

        if (category) {
          await tx
            .update(ciFreshness)
            .set({ lastVerified: new Date() })
            .where(
              and(
                eq(ciFreshness.layerId, category.layerId),
                eq(ciFreshness.competitorId, oldRow.competitorId),
              ),
            );
        }
      }
    });
  }

  /**
   * Create or upsert a CI value
   */
  async upsertValue(
    competitorId: string,
    itemId: string,
    data: {
      value: string;
      confidence: string;
      source?: string;
      sourceUrl?: string;
      sourceDate?: string;
    },
    changedBy: string,
  ): Promise<void> {
    // Check if value already exists
    const [existing] = await db
      .select()
      .from(ciValues)
      .where(
        and(
          eq(ciValues.competitorId, competitorId),
          eq(ciValues.itemId, itemId),
        ),
      );

    if (existing) {
      // Update existing
      await this.updateValue(existing.id, data, changedBy);
    } else {
      // Insert new
      await db.insert(ciValues).values({
        competitorId,
        itemId,
        value: data.value,
        confidence: data.confidence,
        source: data.source ?? null,
        sourceUrl: data.sourceUrl ?? null,
        sourceDate: data.sourceDate ?? null,
        lastVerified: new Date(),
      });
    }
  }

  // === Competitor CRUD ===

  /**
   * Add new competitor (creates empty values for all items)
   */
  async addCompetitor(data: {
    slug: string;
    name: string;
    manufacturer: string;
    country?: string;
    stage?: string;
  }): Promise<typeof ciCompetitors.$inferSelect> {
    const rows = await db
      .insert(ciCompetitors)
      .values({
        slug: data.slug,
        name: data.name,
        manufacturer: data.manufacturer,
        country: data.country ?? null,
        stage: data.stage ?? 'development',
      })
      .returning();

    const competitor = rows[0]!;

    // Get all items
    const allItems = await db.select().from(ciItems);

    // Insert empty ci_values for each item
    if (allItems.length > 0) {
      await db.insert(ciValues).values(
        allItems.map((item) => ({
          competitorId: competitor.id,
          itemId: item.id,
          value: null,
          confidence: 'F',
        })),
      );
    }

    // Get all layers and insert ci_freshness for each
    const allLayers = await db.select().from(ciLayers);
    if (allLayers.length > 0) {
      await db.insert(ciFreshness).values(
        allLayers.map((layer) => ({
          layerId: layer.id,
          competitorId: competitor.id,
          tier: 2,
        })),
      );
    }

    return competitor;
  }

  // === Freshness ===

  /**
   * Get freshness summary per layer x competitor
   */
  async getFreshnessSummary(): Promise<FreshnessSummary[]> {
    const rows = await db
      .select()
      .from(ciFreshness);

    return rows.map((row) => ({
      id: row.id,
      layerId: row.layerId,
      competitorId: row.competitorId,
      lastVerified: row.lastVerified,
      nextReview: row.nextReview,
      tier: row.tier,
    }));
  }

  /**
   * Mark layer x competitor as verified
   */
  async markVerified(layerId: string, competitorId: string): Promise<void> {
    await db
      .update(ciFreshness)
      .set({ lastVerified: new Date() })
      .where(
        and(
          eq(ciFreshness.layerId, layerId),
          eq(ciFreshness.competitorId, competitorId),
        ),
      );
  }

  // === Value History ===

  /**
   * Get history for a specific value
   */
  async getValueHistory(valueId: string): Promise<(typeof ciValueHistory.$inferSelect)[]> {
    return db
      .select()
      .from(ciValueHistory)
      .where(eq(ciValueHistory.valueId, valueId))
      .orderBy(desc(ciValueHistory.changedAt));
  }

  // === Staging ===

  /**
   * Create staged update
   */
  async createStagedUpdate(data: {
    updateType: string;
    payload: any;
    sourceChannel: string;
  }): Promise<void> {
    await db.insert(ciStaging).values({
      updateType: data.updateType,
      payload: data.payload,
      sourceChannel: data.sourceChannel,
    });
  }

  /**
   * Get pending staged updates
   */
  async getPendingStagedUpdates(): Promise<(typeof ciStaging.$inferSelect)[]> {
    return db
      .select()
      .from(ciStaging)
      .where(eq(ciStaging.status, 'pending'))
      .orderBy(desc(ciStaging.createdAt));
  }

  /**
   * Approve staged update (apply it)
   */
  async approveStagedUpdate(stagingId: string, reviewedBy: string): Promise<void> {
    const [staging] = await db
      .select()
      .from(ciStaging)
      .where(eq(ciStaging.id, stagingId));

    if (!staging) {
      throw new Error(`Staging record not found: ${stagingId}`);
    }

    if (staging.status !== 'pending') {
      throw new Error(`Staging record is not pending: ${stagingId}`);
    }

    const payload = staging.payload as any;

    if (staging.updateType === 'value_update') {
      // Apply each value update in the payload
      const updates = Array.isArray(payload) ? payload : payload.updates || [];
      for (const update of updates) {
        await this.upsertValue(
          update.competitorId,
          update.itemId,
          {
            value: update.value,
            confidence: update.confidence || 'D',
            source: update.source,
            sourceUrl: update.sourceUrl,
            sourceDate: update.sourceDate,
          },
          reviewedBy,
        );
      }
    }

    // Update staging status
    await db
      .update(ciStaging)
      .set({
        status: 'applied',
        reviewedBy,
        reviewedAt: new Date(),
        appliedAt: new Date(),
      })
      .where(eq(ciStaging.id, stagingId));
  }

  /**
   * Dismiss staged update
   */
  async dismissStagedUpdate(stagingId: string, reviewedBy: string): Promise<void> {
    await db
      .update(ciStaging)
      .set({
        status: 'dismissed',
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(ciStaging.id, stagingId));
  }

  // === Monitor Alerts ===

  /**
   * Get monitor alerts with optional status filtering
   */
  async getMonitorAlerts(status?: string): Promise<(typeof ciMonitorAlerts.$inferSelect)[]> {
    const query = db
      .select()
      .from(ciMonitorAlerts)
      .orderBy(desc(ciMonitorAlerts.detectedAt));

    if (status) {
      return query.where(eq(ciMonitorAlerts.status, status));
    }

    return query;
  }

  /**
   * Create monitor alert
   */
  async createMonitorAlert(data: {
    sourceName: string;
    sourceUrl: string;
    headline: string;
    summary?: string;
    competitorId?: string;
    layerId?: string;
  }): Promise<void> {
    await db.insert(ciMonitorAlerts).values({
      sourceName: data.sourceName,
      sourceUrl: data.sourceUrl,
      headline: data.headline,
      summary: data.summary ?? null,
      competitorId: data.competitorId ?? null,
      layerId: data.layerId ?? null,
    });
  }

  /**
   * Review alert (mark as reviewed/applied/dismissed)
   */
  async reviewAlert(alertId: string, status: string, reviewedBy: string): Promise<void> {
    await db
      .update(ciMonitorAlerts)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(ciMonitorAlerts.id, alertId));
  }

  // === Ensure tables exist ===

  /**
   * Read the migration SQL file and execute it to ensure CI tables exist
   */
  async ensureTables(): Promise<void> {
    try {
      const migrationPath = path.resolve(
        import.meta.url ? new URL(import.meta.url).pathname : __dirname,
        '../../../drizzle/0013_add_ci_update_system.sql',
      );
      const migrationSql = fs.readFileSync(migrationPath, 'utf-8');
      await db.execute(sql.raw(migrationSql));
      console.log('[CiUpdateService] CI tables ensured via migration SQL.');
    } catch (err) {
      console.warn('[CiUpdateService] Could not run migration file, attempting inline CREATE TABLE IF NOT EXISTS...', err);
      // Fallback: inline SQL for critical tables
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS ci_competitors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          manufacturer VARCHAR(255) NOT NULL,
          country VARCHAR(100),
          stage VARCHAR(50) DEFAULT 'development',
          image_url VARCHAR(500),
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ci_layers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(30) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          icon VARCHAR(10),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ci_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          layer_id UUID NOT NULL REFERENCES ci_layers(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ci_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_id UUID NOT NULL REFERENCES ci_categories(id) ON DELETE CASCADE,
          name VARCHAR(200) NOT NULL,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ci_values (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          competitor_id UUID NOT NULL REFERENCES ci_competitors(id) ON DELETE CASCADE,
          item_id UUID NOT NULL REFERENCES ci_items(id) ON DELETE CASCADE,
          value TEXT,
          confidence VARCHAR(1) DEFAULT 'D',
          source TEXT,
          source_url VARCHAR(1000),
          source_date DATE,
          last_verified TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(competitor_id, item_id)
        );
        CREATE TABLE IF NOT EXISTS ci_monitor_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source_name VARCHAR(200),
          source_url TEXT,
          headline TEXT NOT NULL,
          summary TEXT,
          competitor_id UUID REFERENCES ci_competitors(id) ON DELETE SET NULL,
          layer_id UUID REFERENCES ci_layers(id) ON DELETE SET NULL,
          detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          applied_to UUID REFERENCES ci_values(id) ON DELETE SET NULL,
          reviewed_at TIMESTAMP,
          reviewed_by VARCHAR(100)
        );
        CREATE TABLE IF NOT EXISTS ci_value_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          value_id UUID NOT NULL REFERENCES ci_values(id) ON DELETE CASCADE,
          old_value TEXT,
          new_value TEXT,
          old_confidence VARCHAR(1),
          new_confidence VARCHAR(1),
          change_source VARCHAR(20) NOT NULL,
          change_reason TEXT,
          changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
          changed_by VARCHAR(100)
        );
        CREATE TABLE IF NOT EXISTS ci_freshness (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          layer_id UUID NOT NULL REFERENCES ci_layers(id) ON DELETE CASCADE,
          competitor_id UUID NOT NULL REFERENCES ci_competitors(id) ON DELETE CASCADE,
          last_verified TIMESTAMP,
          next_review TIMESTAMP,
          tier INTEGER NOT NULL DEFAULT 2,
          UNIQUE(layer_id, competitor_id)
        );
        CREATE TABLE IF NOT EXISTS ci_staging (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          update_type VARCHAR(20) NOT NULL,
          payload JSONB NOT NULL,
          source_channel VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          reviewed_at TIMESTAMP,
          reviewed_by VARCHAR(100),
          applied_at TIMESTAMP
        );
      `));
      console.log('[CiUpdateService] CI tables ensured via inline SQL.');
    }
  }
}

export const ciUpdateService = new CiUpdateService();
