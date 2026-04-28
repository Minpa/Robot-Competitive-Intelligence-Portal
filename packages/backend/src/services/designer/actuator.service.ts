/**
 * Actuator catalog + matching · REQ-5
 *
 * Recommendation algorithm:
 *   - Filter by peak_torque ≥ required × safety (1.3 default).
 *   - Sort by weight ascending (lightest viable choice first).
 *   - Return top N (default 3).
 */

import { ACTUATORS } from './mock-data/actuators.js';
import type { ActuatorSpec, ActuatorRecommendation, JointTorqueResult } from './types.js';

const DEFAULT_SAFETY = 1.3;

class ActuatorService {
  list(filter?: { type?: ActuatorSpec['type']; minTorque?: number; maxWeight?: number }): ActuatorSpec[] {
    return ACTUATORS.filter((a) => {
      if (filter?.type && a.type !== filter.type) return false;
      if (filter?.minTorque !== undefined && a.peakTorqueNm < filter.minTorque) return false;
      if (filter?.maxWeight !== undefined && a.weightG > filter.maxWeight) return false;
      return true;
    }) as ActuatorSpec[];
  }

  getBySku(sku: string): ActuatorSpec | undefined {
    return ACTUATORS.find((a) => a.sku === sku);
  }

  /** REQ-5 main recommendation entry point. */
  recommendForJoints(
    jointTorques: JointTorqueResult[],
    options: { safetyFactor?: number; topN?: number } = {}
  ): ActuatorRecommendation[] {
    const safety = options.safetyFactor ?? DEFAULT_SAFETY;
    const topN = options.topN ?? 3;

    return jointTorques.map((j) => {
      const required = j.requiredPeakTorqueNm * safety;
      const candidates = (ACTUATORS as ActuatorSpec[])
        .filter((a) => a.peakTorqueNm >= required)
        .sort((a, b) => a.weightG - b.weightG)
        .slice(0, topN)
        .map((actuator) => ({
          actuator,
          headroomRatio: Number((actuator.peakTorqueNm / Math.max(j.requiredPeakTorqueNm, 0.01)).toFixed(2)),
        }));
      return {
        jointId: j.jointId,
        requiredPeakTorqueNm: j.requiredPeakTorqueNm,
        candidates,
      };
    });
  }
}

export const actuatorService = new ActuatorService();
