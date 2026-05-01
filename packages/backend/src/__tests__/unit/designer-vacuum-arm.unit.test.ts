/**
 * ARGOS-Designer · vacuum-arm REQ-1 unit tests
 *
 * Spec §8 REQ-1 acceptance: GET catalog endpoint response schema validation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { endEffectorService, kinematicsService } from '../../services/designer/vacuum-arm/index.js';
import { actuatorService } from '../../services/designer/index.js';
import { vacuumArmRoutes } from '../../routes/designer/vacuum-arm/index.js';
import type {
  EndEffectorSpec,
  EndEffectorListResponse,
  EndEffectorType,
  ManipulatorArmSpec,
  VacuumBaseSpec,
} from '../../services/designer/vacuum-arm/index.js';
import type { ActuatorSpec } from '../../services/designer/index.js';

const SAMPLE_BASE: VacuumBaseSpec = {
  shape: 'disc',
  heightCm: 10,
  diameterOrWidthCm: 35,
  weightKg: 4,
  hasLiftColumn: false,
  liftColumnMaxExtensionCm: 0,
};

const SAMPLE_ARM: ManipulatorArmSpec = {
  mountPosition: 'center',
  shoulderHeightAboveBaseCm: 5,
  shoulderActuatorSku: 'TMOTOR-MOCK-AK60-6',
  upperArmLengthCm: 25,
  elbowActuatorSku: 'GENERIC-MOCK-SERVO-M',
  forearmLengthCm: 22,
  wristDof: 1,
  endEffectorSku: 'EE-MOCK-2FINGER',
};

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

// ─── REQ-3: kinematics workspace envelope ─────────────────────────────────

describe('REQ-3 · kinematics envelope', () => {
  it('outer radius = L1 + L2, inner = |L1 - L2|', () => {
    const arm = { ...SAMPLE_ARM, upperArmLengthCm: 30, forearmLengthCm: 20 };
    const env = kinematicsService.computeEnvelope(arm, SAMPLE_BASE);
    expect(env.outerRadiusM).toBeCloseTo(0.5, 4); // 30 + 20 cm = 0.5 m
    expect(env.innerRadiusM).toBeCloseTo(0.1, 4); // |30 - 20| cm = 0.1 m
  });

  it('inner radius = 0 when L1 == L2', () => {
    const arm = { ...SAMPLE_ARM, upperArmLengthCm: 25, forearmLengthCm: 25 };
    const env = kinematicsService.computeEnvelope(arm, SAMPLE_BASE);
    expect(env.innerRadiusM).toBeCloseTo(0, 4);
  });

  it('shoulder origin Y = baseHeight + lift + shoulderHeight', () => {
    const base = { ...SAMPLE_BASE, heightCm: 10, hasLiftColumn: true, liftColumnMaxExtensionCm: 20 };
    const arm = { ...SAMPLE_ARM, shoulderHeightAboveBaseCm: 5 };
    const env = kinematicsService.computeEnvelope(arm, base);
    expect(env.shoulderOriginM[1]).toBeCloseTo(0.35, 4); // (10 + 20 + 5) cm
  });

  it('mount=left puts shoulder at -X, mount=right at +X', () => {
    const base = { ...SAMPLE_BASE, diameterOrWidthCm: 40 }; // r=0.2, offset=0.13
    const left = kinematicsService.computeEnvelope({ ...SAMPLE_ARM, mountPosition: 'left' }, base);
    const right = kinematicsService.computeEnvelope({ ...SAMPLE_ARM, mountPosition: 'right' }, base);
    expect(left.shoulderOriginM[0]).toBeLessThan(0);
    expect(right.shoulderOriginM[0]).toBeGreaterThan(0);
    expect(Math.abs(left.shoulderOriginM[0])).toBeCloseTo(Math.abs(right.shoulderOriginM[0]), 4);
  });

  it('canReach: point at outer radius is reachable, beyond is not (±5%)', () => {
    const env = kinematicsService.computeEnvelope(SAMPLE_ARM, SAMPLE_BASE);
    const [sx, sy, sz] = env.shoulderOriginM;
    // Point exactly on outer shell
    const onShell: [number, number, number] = [sx + env.outerRadiusM, sy, sz];
    expect(kinematicsService.canReach(env, onShell)).toBe(true);
    // Point well beyond
    const far: [number, number, number] = [sx + env.outerRadiusM * 1.5, sy, sz];
    expect(kinematicsService.canReach(env, far)).toBe(false);
  });

  it('maxHeightCm matches spec formula', () => {
    const arm = { ...SAMPLE_ARM, upperArmLengthCm: 25, forearmLengthCm: 22, shoulderHeightAboveBaseCm: 5 };
    const base = { ...SAMPLE_BASE, heightCm: 10, hasLiftColumn: true, liftColumnMaxExtensionCm: 20 };
    const env = kinematicsService.computeEnvelope(arm, base);
    // 10 + 20 + 5 + (25 + 22) = 82
    expect(env.maxHeightCm).toBe(82);
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
