import { eq, desc, asc, and, or, ilike, sql, count, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { regulations, regulatoryUpdates, complianceChecklist, regulatorySources } from '../db/schema.js';

class ComplianceService {
  // ==================== Regulations ====================

  async getRegulations(filters?: {
    category?: string;
    region?: string;
    status?: string;
    lgImpact?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: any[] = [];

    if (filters?.category) conditions.push(eq(regulations.category, filters.category));
    if (filters?.region) conditions.push(eq(regulations.region, filters.region));
    if (filters?.status) conditions.push(eq(regulations.status, filters.status));
    if (filters?.lgImpact) conditions.push(eq(regulations.lgImpact, filters.lgImpact));
    if (filters?.search) {
      conditions.push(
        or(
          ilike(regulations.title, `%${filters.search}%`),
          ilike(regulations.titleKo, `%${filters.search}%`),
          ilike(regulations.summary, `%${filters.search}%`)
        )
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db.select().from(regulations)
        .where(where)
        .orderBy(desc(regulations.updatedAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0),
      db.select({ count: count() }).from(regulations).where(where),
    ]);

    return { items, total: totalResult[0]?.count || 0 };
  }

  async getRegulationById(id: string) {
    const [reg] = await db.select().from(regulations).where(eq(regulations.id, id));
    if (!reg) return null;

    const updates = await db.select().from(regulatoryUpdates)
      .where(eq(regulatoryUpdates.regulationId, id))
      .orderBy(desc(regulatoryUpdates.publishedAt));

    const checklist = await db.select().from(complianceChecklist)
      .where(eq(complianceChecklist.regulationId, id))
      .orderBy(asc(complianceChecklist.sortOrder));

    return { ...reg, updates, checklist };
  }

  async createRegulation(data: typeof regulations.$inferInsert) {
    const [created] = await db.insert(regulations).values(data).returning();
    return created;
  }

  async updateRegulation(id: string, data: Partial<typeof regulations.$inferInsert>) {
    const [updated] = await db.update(regulations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(regulations.id, id))
      .returning();
    return updated;
  }

  async deleteRegulation(id: string) {
    await db.delete(regulations).where(eq(regulations.id, id));
  }

  // ==================== Updates Feed ====================

  async getUpdates(filters?: {
    category?: string;
    region?: string;
    lgImpact?: string;
    isRead?: boolean;
    updateType?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: any[] = [];

    if (filters?.category) conditions.push(eq(regulatoryUpdates.category, filters.category));
    if (filters?.region) conditions.push(eq(regulatoryUpdates.region, filters.region));
    if (filters?.lgImpact) conditions.push(eq(regulatoryUpdates.lgImpact, filters.lgImpact));
    if (filters?.isRead !== undefined) conditions.push(eq(regulatoryUpdates.isRead, filters.isRead));
    if (filters?.updateType) conditions.push(eq(regulatoryUpdates.updateType, filters.updateType));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult, unreadResult] = await Promise.all([
      db.select().from(regulatoryUpdates)
        .where(where)
        .orderBy(desc(regulatoryUpdates.detectedAt))
        .limit(filters?.limit || 30)
        .offset(filters?.offset || 0),
      db.select({ count: count() }).from(regulatoryUpdates).where(where),
      db.select({ count: count() }).from(regulatoryUpdates).where(eq(regulatoryUpdates.isRead, false)),
    ]);

    return { items, total: totalResult[0]?.count || 0, unread: unreadResult[0]?.count || 0 };
  }

  async createUpdate(data: typeof regulatoryUpdates.$inferInsert) {
    const [created] = await db.insert(regulatoryUpdates).values(data).returning();
    return created;
  }

  async markUpdatesRead(ids: string[]) {
    await db.update(regulatoryUpdates)
      .set({ isRead: true })
      .where(inArray(regulatoryUpdates.id, ids));
  }

  async markAllUpdatesRead() {
    await db.update(regulatoryUpdates)
      .set({ isRead: true })
      .where(eq(regulatoryUpdates.isRead, false));
  }

  // ==================== Checklist ====================

  async getChecklist(filters?: {
    category?: string;
    region?: string;
    status?: string;
    priority?: string;
  }) {
    const conditions: any[] = [];

    if (filters?.category) conditions.push(eq(complianceChecklist.category, filters.category));
    if (filters?.region) conditions.push(eq(complianceChecklist.region, filters.region));
    if (filters?.status) conditions.push(eq(complianceChecklist.status, filters.status));
    if (filters?.priority) conditions.push(eq(complianceChecklist.priority, filters.priority));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await db.select().from(complianceChecklist)
      .where(where)
      .orderBy(asc(complianceChecklist.sortOrder), asc(complianceChecklist.category));

    return items;
  }

  async createChecklistItem(data: typeof complianceChecklist.$inferInsert) {
    const [created] = await db.insert(complianceChecklist).values(data).returning();
    return created;
  }

  async updateChecklistItem(id: string, data: Partial<typeof complianceChecklist.$inferInsert>) {
    const [updated] = await db.update(complianceChecklist)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(complianceChecklist.id, id))
      .returning();
    return updated;
  }

  async deleteChecklistItem(id: string) {
    await db.delete(complianceChecklist).where(eq(complianceChecklist.id, id));
  }

  async getChecklistStats() {
    const stats = await db.select({
      category: complianceChecklist.category,
      region: complianceChecklist.region,
      status: complianceChecklist.status,
      priority: complianceChecklist.priority,
      count: count(),
    })
    .from(complianceChecklist)
    .groupBy(complianceChecklist.category, complianceChecklist.region, complianceChecklist.status, complianceChecklist.priority);

    return stats;
  }

  // ==================== Dashboard ====================

  async getDashboardData() {
    const [
      regByCategory,
      regByRegion,
      updatesByMonth,
      checklistByStatus,
      criticalItems,
      recentUpdates,
      unreadCount,
    ] = await Promise.all([
      // Regulations count by category
      db.select({
        category: regulations.category,
        count: count(),
      }).from(regulations).where(eq(regulations.status, 'active')).groupBy(regulations.category),

      // Regulations count by region
      db.select({
        region: regulations.region,
        count: count(),
      }).from(regulations).where(eq(regulations.status, 'active')).groupBy(regulations.region),

      // Updates in last 6 months
      db.select({
        count: count(),
      }).from(regulatoryUpdates)
        .where(sql`${regulatoryUpdates.detectedAt} > NOW() - INTERVAL '6 months'`),

      // Checklist by status
      db.select({
        status: complianceChecklist.status,
        count: count(),
      }).from(complianceChecklist).groupBy(complianceChecklist.status),

      // Critical/high impact items not completed
      db.select().from(complianceChecklist)
        .where(and(
          inArray(complianceChecklist.priority, ['critical', 'high']),
          sql`${complianceChecklist.status} != 'completed'`
        ))
        .orderBy(asc(complianceChecklist.sortOrder))
        .limit(10),

      // Recent updates
      db.select().from(regulatoryUpdates)
        .orderBy(desc(regulatoryUpdates.detectedAt))
        .limit(5),

      // Unread updates count
      db.select({ count: count() }).from(regulatoryUpdates)
        .where(eq(regulatoryUpdates.isRead, false)),
    ]);

    return {
      summary: {
        totalRegulations: regByCategory.reduce((sum, r) => sum + Number(r.count), 0),
        regulationsByCategory: regByCategory,
        regulationsByRegion: regByRegion,
        recentUpdatesCount: updatesByMonth[0]?.count || 0,
        unreadUpdates: unreadCount[0]?.count || 0,
      },
      checklist: {
        byStatus: checklistByStatus,
        criticalItems,
        completionRate: (() => {
          const total = checklistByStatus.reduce((sum, s) => sum + Number(s.count), 0);
          const completed = checklistByStatus.find(s => s.status === 'completed');
          return total > 0 ? Math.round((Number(completed?.count || 0) / total) * 100) : 0;
        })(),
      },
      recentUpdates,
    };
  }

  // ==================== Sources ====================

  async getSources() {
    return db.select().from(regulatorySources).orderBy(asc(regulatorySources.name));
  }

  async createSource(data: typeof regulatorySources.$inferInsert) {
    const [created] = await db.insert(regulatorySources).values(data).returning();
    return created;
  }

  async updateSource(id: string, data: Partial<typeof regulatorySources.$inferInsert>) {
    const [updated] = await db.update(regulatorySources)
      .set(data)
      .where(eq(regulatorySources.id, id))
      .returning();
    return updated;
  }

  async deleteSource(id: string) {
    await db.delete(regulatorySources).where(eq(regulatorySources.id, id));
  }
}

export const complianceService = new ComplianceService();
