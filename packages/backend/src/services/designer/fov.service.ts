/**
 * FoV service · REQ-2
 *
 * Given a form factor + camera mounts, compute FoV cone parameters and a
 * simplified coverage estimate. Pure function — no DB. Results are intended
 * for the viewport overlay (cone geometry + blind-spot mesh).
 *
 * Coordinate convention matches form-factor mock data:
 *   +Y up, +X right, +Z forward.
 *
 * Phase 1 simplifications:
 *   - Each camera looks "forward" (+Z) by default; arm cameras look outward.
 *   - blindSpotAreaM2 estimated as the area in a 1m radius disk on the floor
 *     not covered by any cone's projection (cheap stub).
 */

import type {
  CameraMount,
  CameraPosition,
  FovCone,
  FovCoverage,
  FormFactorSummary,
} from './types.js';
import { sensorService } from './sensor.service.js';

const DEG = Math.PI / 180;

/**
 * Map a logical camera position to a skeleton anchor + outward direction.
 * Falls back to a sensible default if the form factor lacks the part.
 */
function anchorFor(
  position: CameraPosition,
  formFactor: FormFactorSummary
): { origin: [number, number, number]; direction: [number, number, number] } {
  const findNode = (id: string) => formFactor.skeleton.find((n) => n.id === id);

  switch (position) {
    case 'head': {
      const head = findNode('head') ?? findNode('neck');
      if (head) {
        return {
          origin: [head.position[0], head.position[1], head.position[2] + 0.08],
          direction: [0, 0, 1],
        };
      }
      // wheeled / cobot fallback — top of column
      return { origin: [0, formFactor.heightM, 0.05], direction: [0, 0, 1] };
    }
    case 'chest': {
      const torso = findNode('torso') ?? findNode('body') ?? findNode('panel');
      if (torso) {
        return {
          origin: [torso.position[0], torso.position[1], torso.position[2] + 0.12],
          direction: [0, -0.15, 1],
        };
      }
      return { origin: [0, formFactor.heightM * 0.6, 0.1], direction: [0, -0.15, 1] };
    }
    case 'arm_left': {
      const hand = findNode('hand_L') ?? findNode('flange') ?? findNode('forearm_L');
      if (hand) {
        return {
          origin: [hand.position[0] + 0.04, hand.position[1], hand.position[2] + 0.06],
          direction: [0.3, -0.2, 0.9],
        };
      }
      return { origin: [0.2, formFactor.heightM * 0.5, 0.05], direction: [0.3, -0.2, 0.9] };
    }
    case 'arm_right': {
      const hand = findNode('hand_R') ?? findNode('forearm_R');
      if (hand) {
        return {
          origin: [hand.position[0] - 0.04, hand.position[1], hand.position[2] + 0.06],
          direction: [-0.3, -0.2, 0.9],
        };
      }
      return { origin: [-0.2, formFactor.heightM * 0.5, 0.05], direction: [-0.3, -0.2, 0.9] };
    }
  }
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

class FovService {
  /**
   * Build cone descriptors for the given camera mounts.
   * Mounts referencing unknown sensor SKUs are silently skipped.
   */
  buildCones(formFactor: FormFactorSummary, cameras: CameraMount[]): FovCone[] {
    const cones: FovCone[] = [];
    for (const cam of cameras) {
      const sensor = sensorService.getBySku(cam.sensorSku);
      if (!sensor) continue;
      const { origin, direction } = anchorFor(cam.position, formFactor);
      cones.push({
        position: cam.position,
        origin,
        direction: normalize(direction),
        halfAngleHorizontalRad: (sensor.fovHorizontalDeg / 2) * DEG,
        halfAngleVerticalRad: (sensor.fovVerticalDeg / 2) * DEG,
        rangeMinM: sensor.rangeMinM,
        rangeMaxM: sensor.rangeMaxM,
        sensorSku: sensor.sku,
      });
    }
    return cones;
  }

  /**
   * Cheap horizontal coverage estimate at 1m radius. Treats each cone's
   * horizontal projection on the floor as an arc and sums the union.
   */
  computeCoverage(cones: FovCone[]): FovCoverage {
    if (cones.length === 0) {
      return {
        cones: [],
        horizontalCoverageRatio: 0,
        blindSpotAreaM2: Math.PI * 1 * 1, // entire 1m disk is blind
      };
    }

    const TWO_PI = Math.PI * 2;

    // Special case: any cone whose horizontal FoV ≥ 360° (panoramic LiDAR)
    // immediately covers the full circle.
    if (cones.some((c) => c.halfAngleHorizontalRad >= Math.PI - 1e-6)) {
      return {
        cones,
        horizontalCoverageRatio: 1,
        blindSpotAreaM2: 0,
      };
    }

    // Project each cone to a horizontal arc [yawCenter - half, yawCenter + half] in radians.
    const arcs: Array<[number, number]> = cones.map((c) => {
      const yaw = Math.atan2(c.direction[0], c.direction[2]); // rotation around Y from +Z
      const half = c.halfAngleHorizontalRad;
      return [yaw - half, yaw + half];
    });

    // Normalize arcs into [0, 2π) and split if they cross the seam.
    const segments: Array<[number, number]> = [];
    for (const [lo, hi] of arcs) {
      let nlo = ((lo % TWO_PI) + TWO_PI) % TWO_PI;
      let nhi = ((hi % TWO_PI) + TWO_PI) % TWO_PI;
      if (nhi < nlo) {
        segments.push([nlo, TWO_PI]);
        segments.push([0, nhi]);
      } else {
        segments.push([nlo, nhi]);
      }
    }

    // Sort + merge overlapping segments.
    segments.sort((a, b) => a[0] - b[0]);
    const merged: Array<[number, number]> = [];
    for (const seg of segments) {
      const last = merged[merged.length - 1];
      if (!last || seg[0] > last[1]) {
        merged.push([seg[0], seg[1]]);
      } else {
        last[1] = Math.max(last[1], seg[1]);
      }
    }

    const totalCovered = merged.reduce((s, [a, b]) => s + (b - a), 0);
    const ratio = Math.min(1, totalCovered / TWO_PI);

    // Blind spot ground area inside a 1m radius disk = (1 - ratio) * π·1²
    const blindSpotAreaM2 = (1 - ratio) * Math.PI;

    return {
      cones,
      horizontalCoverageRatio: Number(ratio.toFixed(3)),
      blindSpotAreaM2: Number(blindSpotAreaM2.toFixed(3)),
    };
  }
}

export const fovService = new FovService();
