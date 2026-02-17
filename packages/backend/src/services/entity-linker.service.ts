/**
 * EntityLinkerService - 파싱된 엔티티를 DB와 fuzzy 매칭
 * 
 * Levenshtein distance 기반 유사도 계산
 * 타입별 독립 매칭 (company→companies, product→humanoidRobots, component→components)
 * 후보 최대 5개, score >= 0.8 자동 추천
 */

import { db, companies, humanoidRobots, components, keywords } from '../db/index.js';
import type { ParsedEntity } from './article-parser.service.js';

export interface LinkCandidate {
  entityId: string;
  entityName: string;
  entityType: string;
  similarityScore: number;
  isAutoRecommended: boolean;
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
const AUTO_RECOMMEND_THRESHOLD = 0.8;

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
   * 타입별 fuzzy 매칭
   */
  private async fuzzyMatch(name: string, type: string): Promise<LinkCandidate[]> {
    const normalizedName = name.toLowerCase().trim();
    let rows: { id: string; name: string }[] = [];

    try {
      switch (type) {
        case 'company':
          rows = await db.select({ id: companies.id, name: companies.name }).from(companies);
          break;
        case 'product':
          rows = await db.select({ id: humanoidRobots.id, name: humanoidRobots.name }).from(humanoidRobots);
          break;
        case 'component':
          rows = await db.select({ id: components.id, name: components.name }).from(components);
          break;
        case 'keyword':
          rows = (await db.select({ id: keywords.id, name: keywords.term }).from(keywords)) as any;
          break;
        default:
          return [];
      }
    } catch (error) {
      console.error(`[EntityLinker] DB query failed for type ${type}`, error);
      return [];
    }

    // 유사도 계산 및 정렬
    const scored = rows
      .map(row => ({
        entityId: row.id,
        entityName: row.name,
        entityType: type,
        similarityScore: this.calculateSimilarity(normalizedName, row.name.toLowerCase()),
        isAutoRecommended: false,
      }))
      .filter(c => c.similarityScore > 0.3)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, MAX_CANDIDATES);

    // 자동 추천 표시
    scored.forEach(c => {
      c.isAutoRecommended = c.similarityScore >= AUTO_RECOMMEND_THRESHOLD;
    });

    return scored;
  }

  /**
   * Levenshtein distance 기반 유사도 (0.0~1.0)
   */
  calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    // 포함 관계 보너스
    if (a.includes(b) || b.includes(a)) {
      const shorter = Math.min(a.length, b.length);
      const longer = Math.max(a.length, b.length);
      return 0.7 + (shorter / longer) * 0.3;
    }

    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i]![j] = Math.min(
          (matrix[i - 1]?.[j] ?? 0) + 1,
          (matrix[i]?.[j - 1] ?? 0) + 1,
          (matrix[i - 1]?.[j - 1] ?? 0) + cost
        );
      }
    }

    const maxLen = Math.max(a.length, b.length);
    const distance = matrix[a.length]?.[b.length] ?? maxLen;
    return Math.round((1 - distance / maxLen) * 100) / 100;
  }
}

export const entityLinkerService = new EntityLinkerService();
