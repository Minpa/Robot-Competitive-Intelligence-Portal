/**
 * Reachability + traversability service · vacuum-arm REQ-7
 *
 * Reachability per target (spec §8 REQ-7):
 *   1. baseCanApproach? — robot base must be able to navigate near target
 *      (spec §5.1 — bypass obstacles whose height blocks the base envelope)
 *   2. height OK? — target z within max arm height
 *   3. ZMP OK? — at the target pose, ZMP stays inside footprint
 *   4. payload OK? — actuator + end-effector torque/payload margins
 *
 * Traversability map: % of room floor area the base can reach without
 *   colliding with obstacles. Obstacle is "blocking" if its height > base
 *   ground-clearance threshold (spec §7.4 fixes this at the obstacle's
 *   declared heightCm; our base allows ≤ 1.5 cm by default).
 */

import { actuatorService } from '../actuator.service.js';
import { endEffectorService } from './end-effector.service.js';
import { environmentService } from './environment.service.js';
import { computeStaticZmp } from './stability.service.js';
import {
  shoulderTorqueNm,
  elbowTorqueNm,
} from './statics.service.js';
import type {
  ManipulatorArmSpec,
  VacuumBaseSpec,
  RoomConfig,
  TargetMarker,
  ObstaclePlacement,
} from './types.js';

/** Max obstacle height the base can roll over without lift column. */
const BASE_GROUND_CLEARANCE_CM = 1.5;

export type ReachabilityReason =
  | 'OK'
  | 'BASE_BLOCKED'
  | 'HEIGHT_OUT_OF_REACH'
  | 'HORIZONTAL_OUT_OF_REACH'
  | 'ZMP_LIMIT'
  | 'TORQUE_LIMIT'
  | 'PAYLOAD_LIMIT'
  | 'NO_ARM';

export interface TargetReachabilityResult {
  targetMarkerIndex: number;
  canReach: boolean;
  reason: ReachabilityReason;
  reasonText: string;
  payloadMarginKg: number;
  armUsed: number | null;
}

export interface TraversabilityResult {
  reachableFloorAreaCm2: number;
  blockedObstacleIndices: number[];
  coveragePct: number;
  /** Robot base ground clearance (cm) for current spec. */
  groundClearanceCm: number;
}

/** Pixel-grid coverage estimate. dx/dy in cm. */
function traversabilityGrid(
  base: VacuumBaseSpec,
  room: RoomConfig
): TraversabilityResult {
  const blockedObstacleIndices: number[] = [];
  const liftClearance = base.hasLiftColumn ? 0 : 0; // lift column is for arm height, not base
  const clearance = BASE_GROUND_CLEARANCE_CM + liftClearance;
  const baseRadiusCm = base.diameterOrWidthCm / 2;

  // Identify blocking obstacles
  const blocking: Array<{ idx: number; xCm: number; yCm: number; rCm: number }> = [];
  room.obstacles.forEach((o, i) => {
    const spec = environmentService.getObstacleById(o.obstacleId);
    if (!spec) return;
    if (spec.heightCm > clearance) {
      blockedObstacleIndices.push(i);
      // Treat as a circle of radius widthCm/2 centered on placement
      blocking.push({ idx: i, xCm: o.xCm, yCm: o.yCm, rCm: spec.widthCm / 2 });
    }
  });

  // Sample the floor on a 10cm grid; a cell is reachable if base center
  // can sit there (i.e. distance to every blocking obstacle ≥ baseR + obsR).
  const step = 10; // cm
  const totalArea = room.widthCm * room.depthCm;
  let reachable = 0;
  let total = 0;
  for (let x = step / 2; x < room.widthCm; x += step) {
    for (let y = step / 2; y < room.depthCm; y += step) {
      total++;
      let blockedHere = false;
      // base must fit inside the room
      if (
        x - baseRadiusCm < 0 ||
        x + baseRadiusCm > room.widthCm ||
        y - baseRadiusCm < 0 ||
        y + baseRadiusCm > room.depthCm
      ) {
        // base partially clips wall — count as unreachable
        blockedHere = true;
      } else {
        for (const b of blocking) {
          const d = Math.hypot(x - b.xCm, y - b.yCm);
          if (d < baseRadiusCm + b.rCm) {
            blockedHere = true;
            break;
          }
        }
      }
      if (!blockedHere) reachable++;
    }
  }
  const reachableArea = (reachable / total) * totalArea;
  return {
    reachableFloorAreaCm2: Number(reachableArea.toFixed(0)),
    blockedObstacleIndices,
    coveragePct: total === 0 ? 0 : Number(((reachable / total) * 100).toFixed(1)),
    groundClearanceCm: clearance,
  };
}

/** Find a candidate base position from which an arm can reach the target. */
function findBaseApproach(
  base: VacuumBaseSpec,
  arm: ManipulatorArmSpec,
  target: TargetMarker,
  room: RoomConfig,
  blockedObstacles: ObstaclePlacement[]
): { x: number; y: number; reachable: boolean; reasonHint: string } {
  // Try a ring of base positions at distance armReach from target, clamp to
  // room walls and check obstacle overlap. We use the largest reach that
  // still keeps shoulder-to-target inside the spherical shell.
  const totalReachCm = arm.upperArmLengthCm + arm.forearmLengthCm;
  const baseRadiusCm = base.diameterOrWidthCm / 2;
  const innerCm = Math.abs(arm.upperArmLengthCm - arm.forearmLengthCm);

  // Sample the ring at 24 candidate angles
  const samples = 24;
  const minDist = innerCm + 5; // a bit of slack
  const maxDist = totalReachCm - baseRadiusCm * 0.2;
  for (const dist of [maxDist * 0.95, maxDist * 0.85, (maxDist + minDist) / 2]) {
    if (dist <= 0) continue;
    for (let i = 0; i < samples; i++) {
      const a = (i / samples) * 2 * Math.PI;
      const bx = target.xCm + Math.cos(a) * dist;
      const by = target.yCm + Math.sin(a) * dist;
      // Check inside room
      if (
        bx - baseRadiusCm < 0 ||
        bx + baseRadiusCm > room.widthCm ||
        by - baseRadiusCm < 0 ||
        by + baseRadiusCm > room.depthCm
      ) {
        continue;
      }
      // Check obstacle clearance
      let blocked = false;
      for (const o of blockedObstacles) {
        const spec = environmentService.getObstacleById(o.obstacleId);
        if (!spec) continue;
        const d = Math.hypot(bx - o.xCm, by - o.yCm);
        if (d < baseRadiusCm + spec.widthCm / 2) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return { x: bx, y: by, reachable: true, reasonHint: 'OK' };
    }
  }
  return { x: target.xCm, y: target.yCm, reachable: false, reasonHint: '베이스 통과 불가' };
}

export interface EvaluateTargetsArgs {
  base: VacuumBaseSpec;
  arms: ManipulatorArmSpec[];
  room: RoomConfig;
  payloadKg: number;
}

export function evaluateTargets({ base, arms, room, payloadKg }: EvaluateTargetsArgs): {
  targets: TargetReachabilityResult[];
  traversability: TraversabilityResult;
} {
  const traversability = traversabilityGrid(base, room);
  const blockedObstacles = traversability.blockedObstacleIndices.map((i) => room.obstacles[i] as ObstaclePlacement);

  const targets: TargetReachabilityResult[] = room.targets.map((t, idx) => {
    if (arms.length === 0) {
      return {
        targetMarkerIndex: idx,
        canReach: false,
        reason: 'NO_ARM',
        reasonText: '팔이 없음',
        payloadMarginKg: 0,
        armUsed: null,
      };
    }
    // Choose the first arm whose envelope can reach the target height; for
    // simplicity here we evaluate the longest-reach arm first.
    const ranked = arms
      .map((a, i) => ({ arm: a, idx: i, reach: a.upperArmLengthCm + a.forearmLengthCm }))
      .sort((a, b) => b.reach - a.reach);

    for (const candidate of ranked) {
      const arm = candidate.arm;

      // 1. height check — does target z fit within max height envelope?
      const maxHeightCm =
        base.heightCm +
        (base.hasLiftColumn ? base.liftColumnMaxExtensionCm : 0) +
        arm.shoulderHeightAboveBaseCm +
        (arm.upperArmLengthCm + arm.forearmLengthCm);
      if (t.zCm > maxHeightCm) {
        continue; // try next arm
      }

      // 2. base approach — can we even park near the target?
      const approach = findBaseApproach(base, arm, t, room, blockedObstacles);
      if (!approach.reachable) {
        return {
          targetMarkerIndex: idx,
          canReach: false,
          reason: 'BASE_BLOCKED',
          reasonText: '베이스 통과 불가',
          payloadMarginKg: 0,
          armUsed: candidate.idx,
        };
      }

      // 3. torque/payload — at full reach, does the actuator hold?
      const ee = endEffectorService.getBySku(arm.endEffectorSku);
      const eeMassKg = ee ? ee.weightG / 1000 : 0;
      const targetWeight = environmentService.getTargetObjectById(t.targetObjectId)?.weightKg ?? payloadKg;
      const shoulderReq = shoulderTorqueNm(arm.upperArmLengthCm, arm.forearmLengthCm, targetWeight, eeMassKg);
      const elbowReq = elbowTorqueNm(arm.forearmLengthCm, targetWeight, eeMassKg);
      const shAct = actuatorService.getBySku(arm.shoulderActuatorSku);
      const elAct = actuatorService.getBySku(arm.elbowActuatorSku);
      const shoulderPeak = shAct?.peakTorqueNm ?? 0;
      const elbowPeak = elAct?.peakTorqueNm ?? 0;

      if (shoulderReq > shoulderPeak || elbowReq > elbowPeak) {
        // Maybe payload exceeds end-effector capability rather than torque
        if (ee && targetWeight > ee.maxPayloadKg) {
          return {
            targetMarkerIndex: idx,
            canReach: false,
            reason: 'PAYLOAD_LIMIT',
            reasonText: `엔드이펙터 max payload ${ee.maxPayloadKg.toFixed(1)}kg < ${targetWeight.toFixed(1)}kg`,
            payloadMarginKg: ee.maxPayloadKg - targetWeight,
            armUsed: candidate.idx,
          };
        }
        return {
          targetMarkerIndex: idx,
          canReach: false,
          reason: 'TORQUE_LIMIT',
          reasonText: `토크 한계 (어깨 ${shoulderReq.toFixed(1)}/${shoulderPeak.toFixed(0)}Nm)`,
          payloadMarginKg: 0,
          armUsed: candidate.idx,
        };
      }

      // 4. ZMP — recompute with payload at target weight
      const zmp = computeStaticZmp(base, [arm], targetWeight);
      if (!zmp.isStable) {
        return {
          targetMarkerIndex: idx,
          canReach: false,
          reason: 'ZMP_LIMIT',
          reasonText: `ZMP 한계 (마진 ${zmp.marginToEdgeCm.toFixed(1)}cm)`,
          payloadMarginKg: 0,
          armUsed: candidate.idx,
        };
      }

      // success
      const payloadMarginKg = ee ? ee.maxPayloadKg - targetWeight : 0;
      return {
        targetMarkerIndex: idx,
        canReach: true,
        reason: 'OK',
        reasonText: 'OK',
        payloadMarginKg: Number(payloadMarginKg.toFixed(2)),
        armUsed: candidate.idx,
      };
    }

    // No arm could reach the height
    return {
      targetMarkerIndex: idx,
      canReach: false,
      reason: 'HEIGHT_OUT_OF_REACH',
      reasonText: '리치 부족 (모든 팔)',
      payloadMarginKg: 0,
      armUsed: null,
    };
  });

  return { targets, traversability };
}

class ReachabilityService {
  evaluate = evaluateTargets;
  traversability = traversabilityGrid;
}

export const reachabilityService = new ReachabilityService();
