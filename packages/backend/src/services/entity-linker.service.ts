/**
 * EntityLinkerService - 파싱된 엔티티를 DB와 fuzzy 매칭
 * 
 * pg_trgm similarity() 기반 유사도 계산 (GIN 인덱스 활용)
 * 타입별 독립 매칭 (company→companies, product→humanoidRobots, component→components, keyword→keywords)
 * Entity_Alias 테이블도 함께 검색하여 다국어 별칭 매칭 지원
 * 후보 최대 5개, score >= 0.7 자동 추천
 */

import { db, companies, humanoidRobots, components, keywords } from '../db/index.js';
import { sql } from 'drizzle-orm';
import type { ParsedEntity } from './article-parser.service.js';

export interface LinkCandidate {
  entityId: string;
  entityName: string;
  entityType: string;
  similarityScore: number;
  isAutoRecommended: boolean;
  matchedVia: 'direct' | 'alias';
  aliasName?: string;
}

export interface LinkResult {
  candidates: Record<string, LinkCandidate[]>;
  unmatched: ParsedEntity[];
}

export interface LinkConfirmation {
  links: { parsedName: string; linkedEntityId: string }[];
  newEntities: { name: string; type: string; metadata?: Record<string, unknown> }[];
}

const MAX_CANDIDATES = 5;
const AUTO_RECOMMEND_THRESHOLD = 0.7;
const MIN_CANDIDATE_THRESHOLD = 0.4;

export class EntityLinkerService {
  /**
   * 파싱된 엔티티 목록에 대해 DB 후보 검색
   */
  async findCandidates(entities: ParsedEntity[]): Promise<LinkResult> {
    const candidates: Record<string, LinkCandidate[]> = {};
    const unmatched: ParsedEntity[] = [];

    for (const entity of entities) {
      const matches = await this.fuzzyMatch(entity.name, entity.type);
      if (matches.length > 0) {
        candidates[entity.name] = matches;
      } else {
        unmatched.push(entity);
      }
    }

    return { candidates, unmatched };
  }

  /**
   * 링킹 확정 처리 (기존 엔티티 연결 + 신규 생성)
   */
  async confirmLinks(confirmation: LinkConfirmation): Promise<{ linkedCount: number; createdCount: number }> {
    let createdCount = 0;

    for (const newEntity of confirmation.newEntities) {
      try {
        switch (newEntity.type) {
          case 'company':
            await db.insert(companies).values({
              name: newEntity.name,
              country: (newEntity.metadata?.country as string) || 'Unknown',
              category: (newEntity.metadata?.category as string) || 'Other',
            });
            createdCount++;
            break;
          case 'component':
            await db.insert(components).values({
              name: newEntity.name,
              type: (newEntity.metadata?.componentType as string) || 'other',
            });
            createdCount++;
            break;
          case 'keyword':
            await db.insert(keywords).values({
              term: newEntity.name,
              language: (newEntity.metadata?.language as string) || 'en',
              category: (newEntity.metadata?.category as string) || null,
            });
            createdCount++;
            break;
        }
      } catch (error) {
        console.error(`[EntityLinker] Failed to create entity: ${newEntity.name}`, error);
      }
    }

    return {
      linkedCount: confirmation.links.length,
      createdCount,
    };
  }

  /**
   * 타입별 pg_trgm fuzzy 매칭 — 직접 테이블 + Entity_Alias 테이블 동시 검색
   * Public API: entityType은 'company' | 'product' | 'component' | 'keyword'
   */
  async fuzzyMatch(name: string, type: string): Promise<LinkCandidate[]> {
    const query = name.trim();
    if (!query) return [];

    try {
      // 1) 직접 매칭: 해당 타입의 테이블에서 pg_trgm similarity() 검색
      const directResults = await this.directMatch(query, type);

      // 2) 별칭 매칭: entity_aliases 테이블에서 pg_trgm similarity() 검색
      const aliasEntityType = this.mapTypeToAliasEntityType(type);
      const aliasResults = aliasEntityType
        ? await this.aliasMatch(query, aliasEntityType)
        : [];

      // 3) 결과 병합: 동일 entityId는 높은 similarity 유지
      const merged = this.mergeResults(directResults, aliasResults, type);

      return merged;
    } catch (error) {
      console.error(`[EntityLinker] pg_trgm query failed for type ${type}`, error);
      return [];
    }
  }

  /**
   * 직접 테이블에서 pg_trgm similarity() 매칭
   */
  private async directMatch(query: string, type: string): Promise<LinkCandidate[]> {
    let results: { id: string; name: string; sim: number }[] = [];

    switch (type) {
      case 'company':
        results = await db.execute(sql`
          SELECT id, name, similarity(name, ${query}) as sim
          FROM companies
          WHERE similarity(name, ${query}) >= ${MIN_CANDIDATE_THRESHOLD}
          ORDER BY sim DESC
          LIMIT ${MAX_CANDIDATES}
        `) as any;
        break;
      case 'product':
        results = await db.execute(sql`
          SELECT id, name, similarity(name, ${query}) as sim
          FROM humanoid_robots
          WHERE similarity(name, ${query}) >= ${MIN_CANDIDATE_THRESHOLD}
          ORDER BY sim DESC
          LIMIT ${MAX_CANDIDATES}
        `) as any;
        break;
      case 'component':
        results = await db.execute(sql`
          SELECT id, name, similarity(name, ${query}) as sim
          FROM components
          WHERE similarity(name, ${query}) >= ${MIN_CANDIDATE_THRESHOLD}
          ORDER BY sim DESC
          LIMIT ${MAX_CANDIDATES}
        `) as any;
        break;
      case 'keyword':
        results = await db.execute(sql`
          SELECT id, term as name, similarity(term, ${query}) as sim
          FROM keywords
          WHERE similarity(term, ${query}) >= ${MIN_CANDIDATE_THRESHOLD}
          ORDER BY sim DESC
          LIMIT ${MAX_CANDIDATES}
        `) as any;
        break;
      default:
        return [];
    }

    // drizzle execute returns { rows: [...] } in node-postgres mode
    const rows = Array.isArray(results) ? results : (results as any).rows ?? [];

    return rows.map((row: any) => ({
      entityId: row.id,
      entityName: row.name,
      entityType: type,
      similarityScore: parseFloat(row.sim),
      isAutoRecommended: parseFloat(row.sim) >= AUTO_RECOMMEND_THRESHOLD,
      matchedVia: 'direct' as const,
    }));
  }

  /**
   * Entity_Alias 테이블에서 pg_trgm similarity() 매칭
   */
  private async aliasMatch(query: string, aliasEntityType: string): Promise<LinkCandidate[]> {
    const results = await db.execute(sql`
      SELECT entity_id, entity_type, alias_name, similarity(alias_name, ${query}) as sim
      FROM entity_aliases
      WHERE entity_type = ${aliasEntityType}
        AND similarity(alias_name, ${query}) >= ${MIN_CANDIDATE_THRESHOLD}
      ORDER BY sim DESC
      LIMIT ${MAX_CANDIDATES}
    `);

    const rows = Array.isArray(results) ? results : (results as any).rows ?? [];

    // 별칭 매칭 결과에 대해 원본 엔티티 이름을 조회
    const candidates: LinkCandidate[] = [];
    for (const row of rows as any[]) {
      const entityName = await this.resolveEntityName(row.entity_id, row.entity_type);
      candidates.push({
        entityId: row.entity_id,
        entityName: entityName || row.alias_name,
        entityType: this.mapAliasEntityTypeToType(row.entity_type),
        similarityScore: parseFloat(row.sim),
        isAutoRecommended: parseFloat(row.sim) >= AUTO_RECOMMEND_THRESHOLD,
        matchedVia: 'alias' as const,
        aliasName: row.alias_name,
      });
    }

    return candidates;
  }

  /**
   * 엔티티 ID로 원본 이름 조회
   */
  private async resolveEntityName(entityId: string, entityType: string): Promise<string | null> {
    try {
      let result: any[];
      switch (entityType) {
        case 'company':
          result = await db.select({ name: companies.name }).from(companies).where(sql`id = ${entityId}`).limit(1);
          return result[0]?.name ?? null;
        case 'robot':
          result = await db.select({ name: humanoidRobots.name }).from(humanoidRobots).where(sql`id = ${entityId}`).limit(1);
          return result[0]?.name ?? null;
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * 직접 매칭 + 별칭 매칭 결과 병합 (동일 entityId는 높은 similarity 유지)
   */
  private mergeResults(
    directResults: LinkCandidate[],
    aliasResults: LinkCandidate[],
    _type: string,
  ): LinkCandidate[] {
    const map = new Map<string, LinkCandidate>();

    // 직접 매칭 결과 먼저 추가
    for (const candidate of directResults) {
      map.set(candidate.entityId, candidate);
    }

    // 별칭 매칭 결과 병합 (더 높은 similarity만 대체)
    for (const candidate of aliasResults) {
      const existing = map.get(candidate.entityId);
      if (!existing || candidate.similarityScore > existing.similarityScore) {
        map.set(candidate.entityId, candidate);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, MAX_CANDIDATES);
  }

  /**
   * ParsedEntity type → entity_aliases.entity_type 매핑
   * entity_aliases는 'company' | 'robot'만 지원
   */
  private mapTypeToAliasEntityType(type: string): string | null {
    switch (type) {
      case 'company': return 'company';
      case 'product': return 'robot';
      default: return null; // component, keyword는 별칭 테이블 미지원
    }
  }

  /**
   * entity_aliases.entity_type → ParsedEntity type 역매핑
   */
  private mapAliasEntityTypeToType(aliasEntityType: string): string {
    switch (aliasEntityType) {
      case 'company': return 'company';
      case 'robot': return 'product';
      default: return aliasEntityType;
    }
  }
}

export const entityLinkerService = new EntityLinkerService();
