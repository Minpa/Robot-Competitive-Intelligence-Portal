import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, articles } from '../db/index.js';

export interface ContentMetadata {
  sourceUrl: string;
  collectedAt: Date;
  contentType: string;
}

export interface DeduplicationResult {
  isDuplicate: boolean;
  existingId?: string;
  contentHash: string;
}

export class DeduplicationService {
  /**
   * Generate SHA-256 hash for content deduplication
   * Property 1: Content Hash Consistency - same content always produces same hash
   */
  generateContentHash(content: string): string {
    // Normalize content: trim whitespace, normalize line endings
    const normalizedContent = content.trim().replace(/\r\n/g, '\n');
    return createHash('sha256').update(normalizedContent, 'utf8').digest('hex');
  }

  /**
   * Check if content already exists in database
   * Property 2: Duplicate Detection Prevents Storage
   */
  async isDuplicate(contentHash: string): Promise<boolean> {
    const [existing] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.contentHash, contentHash))
      .limit(1);

    return !!existing;
  }

  /**
   * Get existing article by content hash
   */
  async getByContentHash(contentHash: string): Promise<{ id: string } | null> {
    const [existing] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.contentHash, contentHash))
      .limit(1);

    return existing || null;
  }

  /**
   * Check content and return deduplication result
   */
  async checkContent(content: string): Promise<DeduplicationResult> {
    const contentHash = this.generateContentHash(content);
    const existing = await this.getByContentHash(contentHash);

    return {
      isDuplicate: !!existing,
      existingId: existing?.id,
      contentHash,
    };
  }

  /**
   * Log duplicate detection for monitoring
   */
  logDuplicateDetection(contentHash: string, sourceUrl: string): void {
    console.log(`[Dedup] Duplicate detected - hash: ${contentHash.substring(0, 16)}..., source: ${sourceUrl}`);
  }
}

export const deduplicationService = new DeduplicationService();
