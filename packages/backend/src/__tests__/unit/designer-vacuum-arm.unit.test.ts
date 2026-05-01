/**
 * ARGOS-Designer · vacuum-arm REQ-1 unit tests
 *
 * Spec §8 REQ-1 acceptance: GET catalog endpoint response schema validation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { endEffectorService } from '../../services/designer/vacuum-arm/index.js';
import { actuatorService } from '../../services/designer/index.js';
import { vacuumArmRoutes } from '../../routes/designer/vacuum-arm/index.js';
import type {
  EndEffectorSpec,
  EndEffectorListResponse,
  EndEffectorType,
} from '../../services/designer/vacuum-arm/index.js';
import type { ActuatorSpec } from '../../services/designer/index.js';

const EXPECTED_END_EFFECTOR_TYPES: readonly EndEffectorType[] = [
  'simple_gripper',
  'suction',
  '2finger',
  '3finger',
];

// ─── service-level: end-effector catalog ──────────────────────────────────

describe('REQ-1 · end-effector service', () => {
  it('lists 4 end-effectors, all isMock', () => {
    const list = endEffectorService.list();
    expect(list).toHaveLength(4);
    for (const e of list) expect(e.isMock).toBe(true);
  });

  it('covers all 4 end-effector types from spec §7.2', () => {
    const types = endEffectorService.list().map((e) => e.type).sort();
    expect(types).toEqual([...EXPECTED_END_EFFECTOR_TYPES].sort());
  });

  it('SKUs are unique', () => {
    const skus = endEffectorService.list().map((e) => e.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it('payload limits match spec §7.2 (gripper=0.3, suction=1.0, 2f=0.8, 3f=1.5)', () => {
    const byType = (t: EndEffectorType) =>
      endEffectorService.list().find((e) => e.type === t)!;
    expect(byType('simple_gripper').maxPayloadKg).toBeCloseTo(0.3, 2);
    expect(byType('suction').maxPayloadKg).toBeCloseTo(1.0, 2);
    expect(byType('2finger').maxPayloadKg).toBeCloseTo(0.8, 2);
    expect(byType('3finger').maxPayloadKg).toBeCloseTo(1.5, 2);
  });

  it('filter by type returns only matching entries', () => {
    const suction = endEffectorService.list({ type: 'suction' });
    expect(suction).toHaveLength(1);
    expect(suction[0].type).toBe('suction');
  });

  it('filter by minPayloadKg drops weaker effectors', () => {
    const heavy = endEffectorService.list({ minPayloadKg: 1.0 });
    // suction (1.0) + 3finger (1.5) — gripper (0.3) and 2f (0.8) excluded
    expect(heavy).toHaveLength(2);
    for (const e of heavy) expect(e.maxPayloadKg).toBeGreaterThanOrEqual(1.0);
  });

  it('getBySku returns the right record', () => {
    const e = endEffectorService.getBySku('EE-MOCK-2FINGER');
    expect(e).toBeDefined();
    expect(e?.type).toBe('2finger');
  });

  it('getBySku returns undefined for unknown sku', () => {
    expect(endEffectorService.getBySku('NOPE')).toBeUndefined();
  });
});

// ─── HTTP-level: routes mounted under /api/designer/vacuum-arm ────────────

describe('REQ-1 · vacuum-arm HTTP routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(vacuumArmRoutes, { prefix: '/api/designer/vacuum-arm' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /actuators returns isMock + actuators array', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/designer/vacuum-arm/actuators' });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { actuators: ActuatorSpec[]; isMock: true; generatedAt: string };
    expect(body.isMock).toBe(true);
    expect(Array.isArray(body.actuators)).toBe(true);
    expect(body.actuators.length).toBeGreaterThan(0);
    expect(body.actuators.every((a) => a.isMock === true)).toBe(true);
  });

  it('GET /actuators?type=Servo filters', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/designer/vacuum-arm/actuators?type=Servo',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { actuators: ActuatorSpec[] };
    for (const a of body.actuators) expect(a.type).toBe('Servo');
  });

  it('GET /actuators/:sku returns single record or 404', async () => {
    const ok = await app.inject({
      method: 'GET',
      url: '/api/designer/vacuum-arm/actuators/' + actuatorService.list()[0].sku,
    });
    expect(ok.statusCode).toBe(200);
    expect((ok.json() as { actuator: ActuatorSpec }).actuator.isMock).toBe(true);

    const missing = await app.inject({
      method: 'GET',
      url: '/api/designer/vacuum-arm/actuators/NOPE-SKU-DOES-NOT-EXIST',
    });
    expect(missing.statusCode).toBe(404);
  });

  it('GET /end-effectors returns 4 end-effectors with isMock=true', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/designer/vacuum-arm/end-effectors',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as EndEffectorListResponse;
    expect(body.isMock).toBe(true);
    expect(body.endEffectors).toHaveLength(4);
    for (const e of body.endEffectors) {
      expect(e.isMock).toBe(true);
      expect(e.sku).toBeTruthy();
      expect(e.maxPayloadKg).toBeGreaterThan(0);
    }
    // generatedAt is a valid ISO 8601 string
    expect(() => new Date(body.generatedAt).toISOString()).not.toThrow();
  });

  it('GET /end-effectors?min_payload=1 filters to suction + 3finger', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/designer/vacuum-arm/end-effectors?min_payload=1',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as EndEffectorListResponse;
    expect(body.endEffectors).toHaveLength(2);
    for (const e of body.endEffectors) expect(e.maxPayloadKg).toBeGreaterThanOrEqual(1);
  });

  it('GET /end-effectors/:sku returns 404 on unknown sku', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/designer/vacuum-arm/end-effectors/NOPE-MOCK-FAKE',
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /end-effectors/:sku returns matching record', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/designer/vacuum-arm/end-effectors/EE-MOCK-SUCTION-CUP',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { endEffector: EndEffectorSpec };
    expect(body.endEffector.type).toBe('suction');
    expect(body.endEffector.maxPayloadKg).toBeCloseTo(1.0, 2);
  });
});
