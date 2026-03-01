/**
 * EntityAliasService — Entity_Alias 테이블 CRUD 및 pg_trgm 기반 fuzzy 매칭
 *
 * pg_trgm similarity() SQL 기반 매칭:
 *   - threshold ≥ 0.4: 후보 포함
 *   - threshold ≥ 0.7: 자동 매칭 (isAutoMatch)
 *
 * Requirements: 5.43, 5.49
 */

import { eq, and, sql } from 'drizzle-orm';
import { db, entityAliases } from '../db/index.js';

export interface EntityAlias {
  aliasId: string;
  entityType: 'company' | 'robot';
  entityId: string;
  aliasName: string;
  language: string | null;
}

export interface FuzzyMatchResult {
  entityId: string;
  entityType: 'company' | 'robot';
  matchedAlias: string;
  similarity: number;
  isAutoMatch: boolean;
  isCandidate: boolean;
}

const SIMILARITY_THRESHOLD = 0.4;
const AUTO_MATCH_THRESHOLD = 0.7;

export class EntityAliasService {
  /**
   * pg_trgm similarity() 기반 fuzzy 매칭
   * entity_aliases 테이블에서 query와 유사한 별칭을 검색합니다.
   */
  async fuzzyMatch(
    query: string,
    entityType?: 'company' | 'robot',
  ): Promise<FuzzyMatchResult[]> {
    const similarityExpr = sql<number>`similarity(${entityAliases.aliasName}, ${query})`;

    const conditions = [
      sql`similarity(${entityAliases.aliasName}, ${query}) >= ${SIMILARITY_THRESHOLD}`,
    ];

    if (entityType) {
      conditions.push(sql`${entityAliases.entityType} = ${entityType}`);
    }

    const rows = await db
      .select({
        entityId: entityAliases.entityId,
        entityType: entityAliases.entityType,
        matchedAlias: entityAliases.aliasName,
        similarity: similarityExpr,
      })
      .from(entityAliases)
      .where(and(...conditions))
      .orderBy(sql`similarity(${entityAliases.aliasName}, ${query}) DESC`);

    return rows.map((row) => ({
      entityId: row.entityId,
      entityType: row.entityType as 'company' | 'robot',
      matchedAlias: row.matchedAlias,
      similarity: Number(row.similarity),
      isAutoMatch: Number(row.similarity) >= AUTO_MATCH_THRESHOLD,
      isCandidate: Number(row.similarity) >= SIMILARITY_THRESHOLD,
    }));
  }

  /**
   * 별칭 생성
   */
  async createAlias(
    alias: Omit<EntityAlias, 'aliasId'>,
  ): Promise<EntityAlias> {
    const [inserted] = await db
      .insert(entityAliases)
      .values({
        entityType: alias.entityType,
        entityId: alias.entityId,
        aliasName: alias.aliasName,
        language: alias.language,
      })
      .returning();

    return {
      aliasId: inserted!.id,
      entityType: inserted!.entityType as 'company' | 'robot',
      entityId: inserted!.entityId,
      aliasName: inserted!.aliasName,
      language: inserted!.language,
    };
  }

  /**
   * 엔티티별 별칭 조회
   */
  async getAliasesByEntity(
    entityType: string,
    entityId: string,
  ): Promise<EntityAlias[]> {
    const rows = await db
      .select()
      .from(entityAliases)
      .where(
        and(
          eq(entityAliases.entityType, entityType),
          eq(entityAliases.entityId, entityId),
        ),
      );

    return rows.map((row) => ({
      aliasId: row.id,
      entityType: row.entityType as 'company' | 'robot',
      entityId: row.entityId,
      aliasName: row.aliasName,
      language: row.language,
    }));
  }

  /**
   * 별칭 삭제
   */
  async deleteAlias(aliasId: string): Promise<void> {
    await db.delete(entityAliases).where(eq(entityAliases.id, aliasId));
  }

  /**
   * 벌크 별칭 등록 (시드 데이터용)
   * @returns 등록된 별칭 수
   */
  async bulkCreateAliases(
    aliases: Omit<EntityAlias, 'aliasId'>[],
  ): Promise<number> {
    if (aliases.length === 0) return 0;

    const values = aliases.map((a) => ({
      entityType: a.entityType,
      entityId: a.entityId,
      aliasName: a.aliasName,
      language: a.language,
    }));

    const inserted = await db
      .insert(entityAliases)
      .values(values)
      .returning();

    return inserted.length;
  }
}

export const entityAliasService = new EntityAliasService();
