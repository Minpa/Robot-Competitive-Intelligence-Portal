import { eq, desc, and, ilike, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { regulatoryDocuments } from '../db/schema.js';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'regulatory-docs');

class RegulatoryDocumentService {
  getUploadDir() {
    return UPLOADS_DIR;
  }

  async listDocuments(filters?: {
    category?: string;
    region?: string;
    search?: string;
    regulationId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: any[] = [];
    if (filters?.category) conditions.push(eq(regulatoryDocuments.category, filters.category));
    if (filters?.region) conditions.push(eq(regulatoryDocuments.region, filters.region));
    if (filters?.regulationId) conditions.push(eq(regulatoryDocuments.regulationId, filters.regulationId));
    if (filters?.search) {
      conditions.push(ilike(regulatoryDocuments.title, `%${filters.search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db.select().from(regulatoryDocuments)
        .where(where)
        .orderBy(desc(regulatoryDocuments.updatedAt))
        .limit(filters?.limit || 50)
        .offset(filters?.offset || 0),
      db.select({ count: count() }).from(regulatoryDocuments).where(where),
    ]);

    return { items, total: totalResult[0]?.count || 0 };
  }

  async getDocument(id: string) {
    const [doc] = await db.select().from(regulatoryDocuments)
      .where(eq(regulatoryDocuments.id, id));
    return doc || null;
  }

  async uploadDocument(data: {
    title: string;
    description?: string;
    filename: string;
    buffer: Buffer;
    mimeType: string;
    category?: string;
    region?: string;
    regulationId?: string;
    tags?: string[];
  }) {
    // Store file
    const ext = path.extname(data.filename);
    const storedFilename = `${randomUUID()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, storedFilename);

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, data.buffer);

    const [doc] = await db.insert(regulatoryDocuments).values({
      title: data.title,
      description: data.description,
      filename: data.filename,
      storedFilename,
      mimeType: data.mimeType,
      fileSize: data.buffer.length,
      category: data.category,
      region: data.region,
      regulationId: data.regulationId,
      tags: data.tags || [],
    }).returning();

    return doc;
  }

  async updateDocument(id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    region?: string;
    regulationId?: string;
    tags?: string[];
    linkedChecklistItems?: { checklistItemId: string; pages?: string; note?: string }[];
  }) {
    const [updated] = await db.update(regulatoryDocuments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(regulatoryDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: string) {
    const [doc] = await db.select().from(regulatoryDocuments)
      .where(eq(regulatoryDocuments.id, id));
    if (doc) {
      // Delete file
      const filePath = path.join(UPLOADS_DIR, doc.storedFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await db.delete(regulatoryDocuments).where(eq(regulatoryDocuments.id, id));
    }
  }

  getFilePath(storedFilename: string): string | null {
    const filePath = path.join(UPLOADS_DIR, storedFilename);
    return fs.existsSync(filePath) ? filePath : null;
  }

  async linkChecklistItem(docId: string, checklistItemId: string, pages?: string, note?: string) {
    const [doc] = await db.select().from(regulatoryDocuments)
      .where(eq(regulatoryDocuments.id, docId));
    if (!doc) return null;

    const links = (doc.linkedChecklistItems || []) as { checklistItemId: string; pages?: string; note?: string }[];
    const existing = links.findIndex(l => l.checklistItemId === checklistItemId);
    if (existing >= 0) {
      links[existing] = { checklistItemId, pages, note };
    } else {
      links.push({ checklistItemId, pages, note });
    }

    const [updated] = await db.update(regulatoryDocuments)
      .set({ linkedChecklistItems: links, updatedAt: new Date() })
      .where(eq(regulatoryDocuments.id, docId))
      .returning();
    return updated;
  }

  async unlinkChecklistItem(docId: string, checklistItemId: string) {
    const [doc] = await db.select().from(regulatoryDocuments)
      .where(eq(regulatoryDocuments.id, docId));
    if (!doc) return null;

    const links = ((doc.linkedChecklistItems || []) as { checklistItemId: string }[])
      .filter(l => l.checklistItemId !== checklistItemId);

    const [updated] = await db.update(regulatoryDocuments)
      .set({ linkedChecklistItems: links, updatedAt: new Date() })
      .where(eq(regulatoryDocuments.id, docId))
      .returning();
    return updated;
  }

  async getDocumentsForChecklistItem(checklistItemId: string) {
    const all = await db.select().from(regulatoryDocuments)
      .orderBy(desc(regulatoryDocuments.updatedAt));

    return all.filter(doc => {
      const links = (doc.linkedChecklistItems || []) as { checklistItemId: string; pages?: string; note?: string }[];
      return links.some(l => l.checklistItemId === checklistItemId);
    }).map(doc => {
      const links = (doc.linkedChecklistItems || []) as { checklistItemId: string; pages?: string; note?: string }[];
      const link = links.find(l => l.checklistItemId === checklistItemId);
      return { ...doc, linkedPages: link?.pages, linkedNote: link?.note };
    });
  }
}

export const regulatoryDocumentService = new RegulatoryDocumentService();
