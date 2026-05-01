/**
 * Kinematics service · vacuum-arm REQ-3
 *
 * Workspace approximation (spec §5.1):
 *   The 2-link arm (L1, L2) with all-revolute shoulder reaches points within
 *   the spherical shell:
 *     inner radius  r_min = |L1 - L2|
 *     outer radius  r_max = L1 + L2
 *
 *   Maximum vertical reach above ground = baseHeight + lift + shoulderHeight + (L1+L2)
 *   Maximum horizontal reach from base center = (L1+L2) - baseRadius/2 (rough)
 */

import type { ManipulatorArmSpec, VacuumBaseSpec } from './types.js';

export interface WorkspaceEnvelope {
  /** Shoulder joint origin in world coordinates [x, y, z] (m). */
  shoulderOriginM: [number, number, number];
  /** Inner reachable radius (m). 0 if L1 ≈ L2. */
  innerRadiusM: number;
  /** Outer reachable radius (m). */
  outerRadiusM: number;
  /** Total reach (L1 + L2) in cm — spec-friendly metric. */
  totalReachCm: number;
  /** Max height above ground (cm) the end-effector can reach. */
  maxHeightCm: number;
  /** Max horizontal distance from base center (cm). */
  maxHorizontalReachCm: number;
}

const CM_TO_M = 0.01;

/** Mount XZ offset (m) relative to base center. Mirrors the viewport. */
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

class KinematicsService {
  computeEnvelope(arm: ManipulatorArmSpec, base: VacuumBaseSpec): WorkspaceEnvelope {
    const baseHeightM = base.heightCm * CM_TO_M;
    const liftM = base.hasLiftColumn ? base.liftColumnMaxExtensionCm * CM_TO_M : 0;
    const shoulderUpM = arm.shoulderHeightAboveBaseCm * CM_TO_M;
    const [mx, mz] = mountOffsetM(arm, base);
    const shoulderY = baseHeightM + liftM + shoulderUpM;

    const L1 = arm.upperArmLengthCm * CM_TO_M;
    const L2 = arm.forearmLengthCm * CM_TO_M;
    const r_max = L1 + L2;
    const r_min = Math.abs(L1 - L2);

    const maxHeightCm =
      base.heightCm + (base.hasLiftColumn ? base.liftColumnMaxExtensionCm : 0) +
      arm.shoulderHeightAboveBaseCm +
      (arm.upperArmLengthCm + arm.forearmLengthCm);
    const maxHorizontalReachCm =
      (arm.upperArmLengthCm + arm.forearmLengthCm) - base.diameterOrWidthCm / 2;

    return {
      shoulderOriginM: [mx, shoulderY, mz],
      innerRadiusM: r_min,
      outerRadiusM: r_max,
      totalReachCm: arm.upperArmLengthCm + arm.forearmLengthCm,
      maxHeightCm,
      maxHorizontalReachCm,
    };
  }

  /**
   * Predicate: can the end-effector reach the world-space point [xM, yM, zM]?
   * REQ-3 simplifies to "is the point inside the spherical shell?"
   *
   * Future REQs (collision avoidance, joint limits) will tighten this.
   */
  canReach(envelope: WorkspaceEnvelope, target: [number, number, number]): boolean {
    const [sx, sy, sz] = envelope.shoulderOriginM;
    const [tx, ty, tz] = target;
    const dx = tx - sx;
    const dy = ty - sy;
    const dz = tz - sz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return d >= envelope.innerRadiusM - 1e-6 && d <= envelope.outerRadiusM + 1e-6;
  }
}

export const kinematicsService = new KinematicsService();
