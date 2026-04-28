/**
 * Statics service · REQ-3 + REQ-4
 *
 * Worst-case static torque calculation:
 *   τ_joint = Σ (m_descendant · g · leverArm) + payload · g · leverArmEnd
 *
 * Phase 1 simplifications:
 *   - All descendants share the joint's pivot as torque axis (treated as one
 *     horizontal axis perpendicular to gravity).
 *   - Link mass is approximated from skeleton primitive volume × steel-equiv
 *     density (treating steel rough avg of 1500 kg/m³ for hollow links). This
 *     is intentionally loose — Phase 2 will use real BOM data.
 *   - Payload acts at the end-effector (or chain-tip if none).
 *
 * Validated by unit test: simple 2-link arm gives torques within ±5% of hand
 * calculation (REQ-3 acceptance criterion).
 */

import type {
  FormFactorSummary,
  JointTorqueResult,
  PayloadLimitResult,
  SkeletonNode,
} from './types.js';
import { kinematicsService } from './kinematics.service.js';

const G = 9.81;
const EFFECTIVE_DENSITY_KG_M3 = 1500;

/** Approximate mass of a primitive (kg). */
function primitiveMass(node: SkeletonNode): number {
  const [a, b, c] = node.size;
  let volume = 0;
  if (node.shape === 'box') {
    volume = a * b * c;
  } else if (node.shape === 'cylinder') {
    volume = Math.PI * a * a * b;
  } else {
    volume = (4 / 3) * Math.PI * a * a * a;
  }
  return Math.max(0.05, volume * EFFECTIVE_DENSITY_KG_M3);
}

/** Apply per-link length scale (multiplier) to relevant primitive dimensions. */
function applyLengthScale(node: SkeletonNode, scale: number): SkeletonNode {
  if (scale === 1) return node;
  let size = node.size;
  // For boxes and cylinders, scale the "long axis" — Phase 1 approximation.
  if (node.shape === 'box') {
    size = [node.size[0], node.size[1] * scale, node.size[2]];
  } else if (node.shape === 'cylinder') {
    size = [node.size[0], node.size[1] * scale, 0];
  }
  return { ...node, size };
}

class StaticsService {
  /**
   * Compute joint torques for a given form factor + scaling + payload.
   */
  computeJointTorques(
    formFactor: FormFactorSummary,
    payloadKg: number,
    linkLengthScale: Record<string, number> = {}
  ): JointTorqueResult[] {
    const nodeMap = new Map<string, SkeletonNode>(
      formFactor.skeleton.map((n) => [n.id, applyLengthScale(n, linkLengthScale[n.id] ?? 1)])
    );

    const joints = kinematicsService.inferJoints(formFactor);
    const results: JointTorqueResult[] = [];

    for (const joint of joints) {
      let momentLinkSum = 0;
      let maxLeverArm = 0;
      for (const descId of joint.descendantIds) {
        const descNode = nodeMap.get(descId);
        if (!descNode) continue;
        const lever = kinematicsService.leverArmM(joint.pivot, descNode.position);
        const m = primitiveMass(descNode);
        momentLinkSum += m * G * lever;
        if (lever > maxLeverArm) maxLeverArm = lever;
      }

      // Payload moment at end-effector (if any)
      let payloadMoment = 0;
      let endLever = 0;
      if (joint.endEffectorId) {
        const endNode = nodeMap.get(joint.endEffectorId);
        if (endNode) {
          endLever = kinematicsService.leverArmM(joint.pivot, endNode.position);
          payloadMoment = payloadKg * G * endLever;
        }
      }

      results.push({
        jointId: joint.id,
        requiredPeakTorqueNm: Number((momentLinkSum + payloadMoment).toFixed(2)),
        leverArmM: Number(Math.max(maxLeverArm, endLever).toFixed(3)),
        segment: joint.segment,
      });
    }

    return results;
  }

  /**
   * REQ-4: sweep payload from 0 upward in 0.1 kg steps until any joint exceeds
   * its torque budget × safety factor. Budget defaults to current torque at
   * 0 kg payload × 1.5 (a placeholder ceiling — Phase 2 will use the matched
   * actuator's peak torque).
   */
  computePayloadLimit(
    formFactor: FormFactorSummary,
    linkLengthScale: Record<string, number> = {},
    safetyFactor = 1.3
  ): PayloadLimitResult {
    // Establish a per-joint torque budget: 1.5 × torque at 0 kg.
    const baseTorques = this.computeJointTorques(formFactor, 0, linkLengthScale);
    const budgets = new Map<string, number>(
      baseTorques.map((t) => [t.jointId, Math.max(t.requiredPeakTorqueNm * 1.5, 5)])
    );

    let payload = 0;
    const STEP = 0.1;
    const MAX = 50;

    while (payload <= MAX) {
      const torques = this.computeJointTorques(formFactor, payload, linkLengthScale);
      for (const t of torques) {
        const budget = budgets.get(t.jointId) ?? Infinity;
        if (t.requiredPeakTorqueNm * safetyFactor > budget) {
          return {
            payloadLimitKg: Number((payload - STEP).toFixed(1)),
            limitingJointId: t.jointId,
            limitingTorqueNm: Number(t.requiredPeakTorqueNm.toFixed(2)),
            safetyFactor,
          };
        }
      }
      payload += STEP;
    }

    return {
      payloadLimitKg: MAX,
      limitingJointId: 'none',
      limitingTorqueNm: 0,
      safetyFactor,
    };
  }
}

export const staticsService = new StaticsService();
