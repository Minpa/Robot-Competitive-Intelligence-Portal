/**
 * ActuatorPositionMapService.getMap / invalidate — 캐시 규칙(schemaVersion)과 새 테이블 조회 내성 (DB 모킹)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  cachedRows: [] as unknown[],
  updateCalls: [] as unknown[],
  failFrom: false,
}));

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return {
    ...schema,
    db: {
      select: () => ({
        from: () =>
          h.failFrom
            ? { then: (_resolve: unknown, reject: (e: Error) => void) => reject(new Error('relation "actuator_sourcing" does not exist')) }
            : { where: () => ({ limit: async () => h.cachedRows }) },
      }),
      update: () => ({ set: (v: unknown) => ({ where: async () => { h.updateCalls.push(v); } }) }),
    },
  };
});

import { ActuatorPositionMapService, ACTUATOR_MAP_SCHEMA_VERSION, type ActuatorMapBody } from '../../services/actuator-position-map.service.js';

function body(over: Partial<ActuatorMapBody> = {}): ActuatorMapBody {
  return {
    schemaVersion: ACTUATOR_MAP_SCHEMA_VERSION,
    generatedAt: 'cached',
    difficultyDefault: { L: 40, D: 25, H: 20, S: 15 },
    typeOrder: [],
    robots: [],
    suppliers: [],
    edges: [],
    adoptions: [],
    vendorMarkets: [],
    sourcingStats: {
      robots: 0, inHouse: 0, inHouseSells: 0, external: 0, externalMixed: 0, unknown: 0, unknownPresumed: 0, regraded: 0, derived: 0, componentSourcing: 0,
    },
    segmentOrder: [],
    stats: { robots: 0, complete: 0, incomplete: 0, suppliers: 0, edges: 0, adoptions: 0 },
    ...over,
  };
}

beforeEach(() => {
  h.cachedRows = [];
  h.updateCalls.length = 0;
  h.failFrom = false;
});

describe('getMap cache rules', () => {
  it('serves a fresh cache entry whose schemaVersion is 2', async () => {
    h.cachedRows = [{ cachedAt: new Date(), data: body() }];
    const svc = new ActuatorPositionMapService();
    const compute = vi.spyOn(svc as unknown as { compute: () => Promise<ActuatorMapBody> }, 'compute');
    const r = await svc.getMap();
    expect(r.cached).toBe(true);
    expect(r.generatedAt).toBe('cached');
    expect(compute).not.toHaveBeenCalled();
  });

  it('recomputes when the cached payload has no schemaVersion (old shape)', async () => {
    const { schemaVersion: _omit, ...old } = body();
    void _omit;
    h.cachedRows = [{ cachedAt: new Date(), data: old }];
    const svc = new ActuatorPositionMapService();
    const fresh = body({ generatedAt: 'fresh' });
    const compute = vi.spyOn(svc as unknown as { compute: () => Promise<ActuatorMapBody> }, 'compute').mockResolvedValue(fresh);
    const r = await svc.getMap();
    expect(compute).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ cached: false, generatedAt: 'fresh', schemaVersion: 2 });
  });

  it('recomputes on a different schemaVersion or a stale entry', async () => {
    const svc = new ActuatorPositionMapService();
    const compute = vi.spyOn(svc as unknown as { compute: () => Promise<ActuatorMapBody> }, 'compute').mockResolvedValue(body({ generatedAt: 'fresh' }));
    h.cachedRows = [{ cachedAt: new Date(), data: { ...body(), schemaVersion: 1 } }];
    expect((await svc.getMap()).cached).toBe(false);
    h.cachedRows = [{ cachedAt: new Date(Date.now() - 11 * 60 * 1000), data: body() }];
    expect((await svc.getMap()).cached).toBe(false);
    expect(compute).toHaveBeenCalledTimes(2);
  });
});

describe('invalidate', () => {
  it('expires the cache row (cachedAt = epoch)', async () => {
    await new ActuatorPositionMapService().invalidate();
    expect(h.updateCalls).toHaveLength(1);
    expect((h.updateCalls[0] as { cachedAt: Date }).cachedAt.getTime()).toBe(0);
  });
});

describe('new tables missing', () => {
  it('fetchers swallow query errors and return empty arrays (200 with empty adoptions)', async () => {
    const svc = new ActuatorPositionMapService() as unknown as {
      fetchSourcingRows: () => Promise<unknown[]>;
      fetchAdoptions: () => Promise<unknown[]>;
      fetchVendorMarkets: () => Promise<unknown[]>;
    };
    h.failFrom = true; // 테이블 부재: 쿼리가 reject 된다
    expect(await svc.fetchSourcingRows()).toEqual([]);
    expect(await svc.fetchAdoptions()).toEqual([]);
    expect(await svc.fetchVendorMarkets()).toEqual([]);
  });
});
