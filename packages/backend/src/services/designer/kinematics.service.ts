/**
 * Kinematics service · REQ-3
 *
 * Phase 1 simplifications:
 *   - We don't have an explicit joint tree in the mock data — instead each
 *     skeleton node has a position. We classify nodes by id pattern and
 *     compute lever arms from the worst-case static pose (arms horizontal,
 *     legs straight) using horizontal distance to the joint pivot.
 *   - DoF is taken from the form factor's totalDof field.
 *   - The result is intentionally rough (±5% per spec REQ-3 acceptance).
 */

import type {
  FormFactorSummary,
  JointTorqueResult,
  SkeletonNode,
} from './types.js';

type Segment = JointTorqueResult['segment'];

interface JointDescriptor {
  id: string;
  segment: Segment;
  /** Skeleton node ids that hang off this joint (used for moment summation). */
  descendantIds: string[];
  /** Anchor position of the joint pivot. */
  pivot: [number, number, number];
  /** End-effector node id (where payload acts). */
  endEffectorId: string | null;
}

// ─── joint inference per form factor ──────────────────────────────────────

function inferJoints(formFactor: FormFactorSummary): JointDescriptor[] {
  const map = new Map<string, SkeletonNode>(formFactor.skeleton.map((n) => [n.id, n]));
  const has = (id: string) => map.has(id);
  const pos = (id: string) => map.get(id)!.position;

  const joints: JointDescriptor[] = [];

  // ── biped ──
  if (formFactor.id === 'biped') {
    for (const side of ['R', 'L'] as const) {
      // arm chain: shoulder → elbow → wrist
      joints.push({
        id: `shoulder_${side}`,
        segment: 'arm',
        descendantIds: [`upper_arm_${side}`, `elbow_${side}`, `forearm_${side}`, `hand_${side}`],
        pivot: pos(`shoulder_${side}`),
        endEffectorId: `hand_${side}`,
      });
      joints.push({
        id: `elbow_${side}`,
        segment: 'arm',
        descendantIds: [`forearm_${side}`, `hand_${side}`],
        pivot: pos(`elbow_${side}`),
        endEffectorId: `hand_${side}`,
      });
      // leg chain: hip → knee → ankle
      joints.push({
        id: `hip_${side}`,
        segment: 'leg',
        descendantIds: [`thigh_${side}`, `knee_${side}`, `shin_${side}`, `foot_${side}`],
        pivot: pos(`hip_${side}`),
        endEffectorId: `foot_${side}`,
      });
      joints.push({
        id: `knee_${side}`,
        segment: 'leg',
        descendantIds: [`shin_${side}`, `foot_${side}`],
        pivot: pos(`knee_${side}`),
        endEffectorId: `foot_${side}`,
      });
    }
    return joints;
  }

  // ── quadruped ──
  if (formFactor.id === 'quadruped') {
    for (const corner of ['FL', 'FR', 'BL', 'BR'] as const) {
      joints.push({
        id: `hip_${corner}`,
        segment: 'leg',
        descendantIds: [
          `upper_leg_${corner}`,
          `knee_${corner}`,
          `lower_leg_${corner}`,
          `foot_${corner}`,
        ],
        pivot: pos(`hip_${corner}`),
        endEffectorId: `foot_${corner}`,
      });
      joints.push({
        id: `knee_${corner}`,
        segment: 'leg',
        descendantIds: [`lower_leg_${corner}`, `foot_${corner}`],
        pivot: pos(`knee_${corner}`),
        endEffectorId: `foot_${corner}`,
      });
    }
    return joints;
  }

  // ── cobot_arm / mobile_manipulator (treat arm chain) ──
  if (formFactor.id === 'cobot_arm' || formFactor.id === 'mobile_manipulator') {
    const chainPrefix = formFactor.id === 'mobile_manipulator' ? 'arm_' : '';
    const baseId = formFactor.id === 'mobile_manipulator' ? 'arm_base' : 'base';
    const chain = ['shoulder', 'upper_link', 'elbow', 'forearm', 'wrist1', 'wrist2', 'flange']
      .map((n) => `${chainPrefix}${n}`)
      .filter(has);
    // sequential joints (one per joint-like node)
    const jointNodes = ['shoulder', 'elbow', 'wrist1', 'wrist'].map((n) => `${chainPrefix}${n}`).filter(has);
    for (const jId of jointNodes) {
      const idx = chain.indexOf(jId);
      const descendants = chain.slice(idx + 1);
      const endEffector = chain[chain.length - 1];
      joints.push({
        id: jId,
        segment: 'arm',
        descendantIds: descendants,
        pivot: pos(jId),
        endEffectorId: endEffector ?? null,
      });
    }
    // Always include the base joint (J1)
    if (has(baseId)) {
      joints.push({
        id: baseId,
        segment: 'arm_base',
        descendantIds: chain,
        pivot: pos(baseId),
        endEffectorId: chain[chain.length - 1] ?? null,
      });
    }
    return joints;
  }

  // ── wheeled (no rotational joints, just wheels) ──
  if (formFactor.id === 'wheeled') {
    if (has('wheel_L')) {
      joints.push({
        id: 'wheel_L',
        segment: 'wheel',
        descendantIds: [],
        pivot: pos('wheel_L'),
        endEffectorId: null,
      });
    }
    if (has('wheel_R')) {
      joints.push({
        id: 'wheel_R',
        segment: 'wheel',
        descendantIds: [],
        pivot: pos('wheel_R'),
        endEffectorId: null,
      });
    }
    return joints;
  }

  return joints;
}

// ─── public API ───────────────────────────────────────────────────────────

class KinematicsService {
  inferJoints(formFactor: FormFactorSummary): JointDescriptor[] {
    return inferJoints(formFactor);
  }

  /**
   * Worst-case lever arm: 3D Euclidean distance from joint pivot to target.
   *
   * Rationale: the spec asks for the "fully extended" pose (arms horizontal,
   * legs straight) where every chain segment counts as a horizontal lever
   * about the joint. The 3D distance between pivot and a descendant in the
   * neutral mock pose equals the chain length under that extension, which is
   * the lever arm we want.
   */
  leverArmM(pivot: [number, number, number], target: [number, number, number]): number {
    const dx = target[0] - pivot[0];
    const dy = target[1] - pivot[1];
    const dz = target[2] - pivot[2];
    return Math.hypot(dx, dy, dz);
  }
}

export const kinematicsService = new KinematicsService();
export type { JointDescriptor };
