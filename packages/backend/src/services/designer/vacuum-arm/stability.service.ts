/**
 * Stability service · vacuum-arm REQ-5 (ZMP)
 *
 * Static-case ZMP (zero moment point):
 *   The vertical projection of the system's center of mass onto the floor.
 *   For a STATIC robot to remain upright, this point must lie inside the
 *   support polygon (the convex hull of base contact points / footprint).
 *
 * Worst-case pose: arms fully extended horizontally (matches statics REQ-4).
 *
 * Mass model — sums:
 *   1. base center                  → COM at (0, 0)
 *   2. each arm's shoulder actuator → COM at shoulder_xz
 *   3. each arm's upper-arm + elbow actuator → COM at midpoint of L1 along outward
 *   4. each arm's forearm + end-effector + payload → COM at L1 + L2/2 along outward
 *
 * For Phase 1 we approximate the height as 0 since ZMP is the floor projection.
 */

import { actuatorService } from '../actuator.service.js';
import { endEffectorService } from './end-effector.service.js';
import { limbMassKg } from './statics.service.js';
import type { ManipulatorArmSpec, VacuumBaseSpec } from './types.js';

const CM_TO_M = 0.01;

const UPPER_ARM_RADIUS_M = 0.018;
const FOREARM_RADIUS_M = 0.014;

/** Convert base shape + size to a list of footprint vertices (m) on y=0. */
export function footprintPolygon(base: VacuumBaseSpec): Array<[number, number]> {
  const r = (base.diameterOrWidthCm / 2) * CM_TO_M;
  if (base.shape === 'square') {
    return [
      [-r, -r],
      [r, -r],
      [r, r],
      [-r, r],
    ];
  }
  // disc / tall_cylinder: approximate the circle with a 32-vertex polygon
  const n = 32;
  const verts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    verts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return verts;
}

/** Mount XZ offset (m) — mirrors viewport + kinematics. */
function mountOffsetM(arm: ManipulatorArmSpec, base: VacuumBaseSpec): [number, number] {
  const baseRadiusM = (base.diameterOrWidthCm / 2) * CM_TO_M;
  const offset = baseRadiusM * 0.65;
  switch (arm.mountPosition) {
    case 'center':
      return [0, 0];
    case 'front':
      return [0, offset];
    case 'left':
      return [-offset, 0];
    case 'right':
      return [offset, 0];
    default:
      return [0, 0];
  }
}

/** Outward unit vector in XZ plane (worst-case extension). */
function outwardXZ(arm: ManipulatorArmSpec): [number, number] {
  switch (arm.mountPosition) {
    case 'center':
    case 'front':
      return [0, 1];
    case 'left':
      return [-1, 0];
    case 'right':
      return [1, 0];
    default:
      return [0, 1];
  }
}

export interface StabilityResult {
  /** ZMP location in base-center frame (cm). */
  zmpXCm: number;
  zmpYCm: number;
  /** Footprint vertices (cm). */
  footprintPolygonCm: Array<[number, number]>;
  /** True iff ZMP lies inside footprint. */
  isStable: boolean;
  /** Distance to nearest footprint edge (cm). Negative if outside. */
  marginToEdgeCm: number;
}

/**
 * Compute static ZMP at worst-case pose for the given product + payload.
 *
 * Returns (x, z) in centimeters relative to base center (matching the
 * footprint polygon's coordinate system).
 */
export function computeStaticZmp(
  base: VacuumBaseSpec,
  arms: ManipulatorArmSpec[],
  payloadKg: number
): StabilityResult {
  const masses: number[] = [];
  /** XZ positions in meters. */
  const positions: Array<[number, number]> = [];

  // 1. base
  masses.push(base.weightKg);
  positions.push([0, 0]);

  for (const arm of arms) {
    const ee = endEffectorService.getBySku(arm.endEffectorSku);
    const eeMassKg = ee ? ee.weightG / 1000 : 0;
    const shAct = actuatorService.getBySku(arm.shoulderActuatorSku);
    const elAct = actuatorService.getBySku(arm.elbowActuatorSku);
    const shMassKg = shAct ? shAct.weightG / 1000 : 0;
    const elMassKg = elAct ? elAct.weightG / 1000 : 0;

    const [mx, mz] = mountOffsetM(arm, base);
    const [ox, oz] = outwardXZ(arm);
    const L1m = arm.upperArmLengthCm * CM_TO_M;
    const L2m = arm.forearmLengthCm * CM_TO_M;

    const shoulderXZ: [number, number] = [mx, mz];
    const elbowXZ: [number, number] = [mx + ox * L1m, mz + oz * L1m];
    const tipXZ: [number, number] = [mx + ox * (L1m + L2m), mz + oz * (L1m + L2m)];

    // 2. shoulder actuator at shoulder
    masses.push(shMassKg);
    positions.push(shoulderXZ);

    // 3. upper-arm midpoint + elbow actuator at elbow
    masses.push(limbMassKg(UPPER_ARM_RADIUS_M, arm.upperArmLengthCm));
    positions.push([(shoulderXZ[0] + elbowXZ[0]) / 2, (shoulderXZ[1] + elbowXZ[1]) / 2]);
    masses.push(elMassKg);
    positions.push(elbowXZ);

    // 4. forearm midpoint + end-effector + payload at tip
    masses.push(limbMassKg(FOREARM_RADIUS_M, arm.forearmLengthCm));
    positions.push([(elbowXZ[0] + tipXZ[0]) / 2, (elbowXZ[1] + tipXZ[1]) / 2]);
    masses.push(eeMassKg + payloadKg);
    positions.push(tipXZ);
  }

  const totalM = masses.reduce((a, b) => a + b, 0);
  if (totalM <= 0) {
    return {
      zmpXCm: 0,
      zmpYCm: 0,
      footprintPolygonCm: footprintPolygon(base).map(
        ([x, y]) => [x / CM_TO_M, y / CM_TO_M] as [number, number]
      ),
      isStable: true,
      marginToEdgeCm: 0,
    };
  }

  let zmpX = 0;
  let zmpZ = 0;
  for (let i = 0; i < masses.length; i++) {
    const m = masses[i] as number;
    const pos = positions[i] as [number, number];
    zmpX += m * pos[0];
    zmpZ += m * pos[1];
  }
  zmpX /= totalM;
  zmpZ /= totalM;

  const footM = footprintPolygon(base);
  const insidePoly = pointInPolygon([zmpX, zmpZ], footM);
  const distM = distanceToPolygonEdge([zmpX, zmpZ], footM);
  const signedDistM = insidePoly ? distM : -distM;

  return {
    zmpXCm: Number((zmpX / CM_TO_M).toFixed(2)),
    zmpYCm: Number((zmpZ / CM_TO_M).toFixed(2)),
    footprintPolygonCm: footM.map(
      ([x, y]) =>
        [
          Number((x / CM_TO_M).toFixed(2)),
          Number((y / CM_TO_M).toFixed(2)),
        ] as [number, number]
    ),
    isStable: insidePoly,
    marginToEdgeCm: Number((signedDistM / CM_TO_M).toFixed(2)),
  };
}

// ─── Polygon helpers (no Shapely; inline geometry) ─────────────────────────

/** Even-odd rule point-in-polygon. */
function pointInPolygon(p: [number, number], poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i] as [number, number];
    const pj = poly[j] as [number, number];
    const xi = pi[0];
    const yi = pi[1];
    const xj = pj[0];
    const yj = pj[1];
    const intersect =
      yi > p[1] !== yj > p[1] &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Min distance from point to any polygon edge. Always non-negative. */
function distanceToPolygonEdge(p: [number, number], poly: Array<[number, number]>): number {
  let min = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j] as [number, number];
    const b = poly[i] as [number, number];
    const d = pointToSegment(p, a, b);
    if (d < min) min = d;
  }
  return min;
}

function pointToSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ex = p[0] - a[0];
    const ey = p[1] - a[1];
    return Math.sqrt(ex * ex + ey * ey);
  }
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = a[0] + t * dx;
  const projY = a[1] + t * dy;
  const ex = p[0] - projX;
  const ey = p[1] - projY;
  return Math.sqrt(ex * ex + ey * ey);
}

class StabilityService {
  computeZmp = computeStaticZmp;
  footprintPolygon = footprintPolygon;
  pointInPolygon = pointInPolygon;
  distanceToPolygonEdge = distanceToPolygonEdge;
}

export const stabilityService = new StabilityService();
