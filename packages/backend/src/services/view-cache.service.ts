/**
 * ViewCacheService — 뷰별 캐시 TTL 관리 서비스
 *
 * 인메모리 캐시 우선, TTL 만료 시 stale 데이터 + isStale 플래그 반환.
 * 서버 재시작 시 view_cache 테이블에서 warm-up.
 *
 * Requirements: 11.101~11.109
 */

import { db, viewCache } from '../db/index.js';
import { eq, sql } from 'drizzle-orm';

export interface ViewCacheConfig {
  ttlMs: number;
  staleBadge: boolean;
  fallbackType: 'cache' | 'hide' | 'empty_retry' | 'error_message';
}

export interface CacheEntry<T> {
  data: T;
  cachedAt: Date;
  ttlMs: number;
}

export interface CacheResult<T> {
  data: T;
  isStale: boolean;
  cachedAt: Date | null;
}

export const VIEW_CACHE_CONFIGS: Record<string, ViewCacheConfig> = {
  'kpi-overview':            { ttlMs: 3_600_000,   staleBadge: true,  fallbackType: 'cache' },
  'segment-heatmap':         { ttlMs: 86_400_000,  staleBadge: true,  fallbackType: 'cache' },
  'market-forecast':         { ttlMs: 604_800_000, staleBadge: true,  fallbackType: 'cache' },
  'regional-share':          { ttlMs: 604_800_000, staleBadge: true,  fallbackType: 'cache' },
  'workforce-comparison':    { ttlMs: 86_400_000,  staleBadge: true,  fallbackType: 'cache' },
  'highlights':              { ttlMs: 3_600_000,   staleBadge: false, fallbackType: 'hide' },
  'timeline-trend':          { ttlMs: 21_600_000,  staleBadge: true,  fallbackType: 'cache' },
  'talent-product-scatter':  { ttlMs: 86_400_000,  staleBadge: true,  fallbackType: 'cache' },
  'segment-drawer':          { ttlMs: 0,           staleBadge: false, fallbackType: 'error_message' },
  'player-expansion':        { ttlMs: 86_400_000,  staleBadge: true,  fallbackType: 'cache' },
  'technology-radar':        { ttlMs: 86_400_000,  staleBadge: true,  fallbackType: 'cache' },
  'investment-flow':         { ttlMs: 86_400_000,  staleBadge: true,  fallbackType: 'cache' },
  'insight-hub':             { ttlMs: 21_600_000,  staleBadge: true,  fallbackType: 'cache' },
  'top-events':              { ttlMs: 3_600_000,   staleBadge: true,  fallbackType: 'cache' },
};

export class ViewCacheService {
  private memoryCache = new Map<string, CacheEntry<unknown>>();

  /**
   * 캐시 조회 또는 계산.
   *
   * 1. 인메모리 캐시에 fresh 데이터 → { data, isStale: false }
   * 2. 인메모리 캐시에 stale 데이터 → compute 시도
   *    a. compute 성공 → 갱신 후 { data, isStale: false }
   *    b. compute 실패 + fallbackType='cache' → { stale data, isStale: true }
   * 3. 캐시 없음 → compute 시도, 실패 시 throw
   */
  async getOrCompute<T>(
    viewName: string,
    computeFn: () => Promise<T>,
  ): Promise<CacheResult<T>> {
    const config = VIEW_CACHE_CONFIGS[viewName];
    const entry = this.memoryCache.get(viewName) as CacheEntry<T> | undefined;

    // TTL 0 means no caching — always compute fresh
    if (config && config.ttlMs === 0) {
      const data = await computeFn();
      return { data, isStale: false, cachedAt: null };
    }

    if (entry) {
      const age = Date.now() - entry.cachedAt.getTime();
      const ttl = config?.ttlMs ?? entry.ttlMs;

      // Fresh cache hit
      if (age < ttl) {
        return { data: entry.data, isStale: false, cachedAt: entry.cachedAt };
      }

      // Stale — try to recompute
      try {
        const freshData = await computeFn();
        const now = new Date();
        this.setMemoryCache(viewName, freshData, ttl);
        this.persist(viewName, freshData, ttl).catch(() => {});
        return { data: freshData, isStale: false, cachedAt: now };
      } catch {
        // Compute failed — return stale data if fallback allows
        const fallback = config?.fallbackType ?? 'cache';
        if (fallback === 'cache') {
          return { data: entry.data, isStale: true, cachedAt: entry.cachedAt };
        }
        throw new Error(`Cache compute failed for view "${viewName}" and fallback is "${fallback}"`);
      }
    }

    // No cache at all — must compute
    const data = await computeFn();
    const ttl = config?.ttlMs ?? 3_600_000;
    const now = new Date();
    this.setMemoryCache(viewName, data, ttl);
    this.persist(viewName, data, ttl).catch(() => {});
    return { data, isStale: false, cachedAt: now };
  }

  /**
   * 특정 뷰 캐시 무효화
   */
  async invalidate(viewName: string): Promise<void> {
    this.memoryCache.delete(viewName);
    try {
      await db.delete(viewCache).where(eq(viewCache.viewName, viewName));
    } catch {
      // DB 삭제 실패는 무시 — 인메모리 캐시는 이미 제거됨
    }
  }

  /**
   * 전체 캐시 무효화
   */
  async invalidateAll(): Promise<void> {
    this.memoryCache.clear();
    try {
      await db.delete(viewCache);
    } catch {
      // DB 삭제 실패는 무시
    }
  }

  /**
   * 서버 재시작 시 view_cache 테이블에서 인메모리 캐시 warm-up
   */
  async warmUp(): Promise<void> {
    try {
      const rows = await db.select().from(viewCache);
      for (const row of rows) {
        this.memoryCache.set(row.viewName, {
          data: row.data,
          cachedAt: row.cachedAt,
          ttlMs: row.ttlMs,
        });
      }
    } catch {
      // warm-up 실패는 무시 — 캐시 미스로 처리됨
    }
  }

  /**
   * view_cache 테이블에 upsert (INSERT ON CONFLICT UPDATE)
   */
  private async persist<T>(viewName: string, data: T, ttlMs: number): Promise<void> {
    await db
      .insert(viewCache)
      .values({
        viewName,
        data: data as any,
        cachedAt: new Date(),
        ttlMs,
      })
      .onConflictDoUpdate({
        target: viewCache.viewName,
        set: {
          data: sql`excluded.data`,
          cachedAt: sql`excluded.cached_at`,
          ttlMs: sql`excluded.ttl_ms`,
        },
      });
  }

  private setMemoryCache<T>(viewName: string, data: T, ttlMs: number): void {
    this.memoryCache.set(viewName, {
      data,
      cachedAt: new Date(),
      ttlMs,
    });
  }
}

export const viewCacheService = new ViewCacheService();
