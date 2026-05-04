/**
 * IK 기반 reachability 분석 — 동작 → 스펙 도출 워크플로우의 데이터 소스.
 *
 * 각 타겟마다:
 *   1. solveIKForTarget로 도달 가능성 시도
 *   2. 실패 시 카테고리 분류:
 *      - OUT_OF_REACH         L1+L2 부족 (거리)
 *      - HEIGHT_BELOW         타겟이 어깨보다 너무 아래 (드물음)
 *      - HEIGHT_ABOVE         타겟이 어깨보다 너무 위 (lift 필요)
 *      - YAW_REQUIRED         타겟이 mount plane 옆에 있어 robot yaw 회전 필요
 *      - PAYLOAD_OVER_EE      엔드이펙터 max payload 초과
 *      - PAYLOAD_OVER_ARM     팔 토크 부족 (현재 reach 거리에서)
 *   3. 각 실패에서 spec delta 계산 — "L1+L2를 X cm 늘려야" 식
 *
 * Phase 1 단순화: torque 분석은 client-statics와 별개. 여기서는 reach만 우선.
 */

import { solveIKForTarget } from '../kinematics/grasp-engine';
import type {
  ManipulatorArmSpec,
  VacuumBaseSpec,
  TargetMarker,
  EndEffectorSpec,
  TargetObjectSpec,
} from '../types/product';

const CM_TO_M = 0.01;

export type IKReachReason =
  | 'OK'
  | 'OUT_OF_REACH'
  | 'HEIGHT_ABOVE'
  | 'YAW_REQUIRED'
  | 'PAYLOAD_OVER_EE';

export interface IKReachResult {
  targetIndex: number;
  ok: boolean;
  reason: IKReachReason;
  reasonText: string;
  /** 타겟 spec name */
  targetName: string;
  /** target world coordinates (m) */
  targetWorld: { x: number; y: number; z: number };
  /** target까지 어깨 평면 거리 (m) */
  distanceM: number;
  /** 현재 spec의 max reach (L1+L2 in m) */
  maxReachM: number;
  /** IK가 반환한 자세 (도달 가능 또는 fully extended toward target) */
  pose: { shoulderPitchDeg: number; elbowDeg: number };
  /** Spec delta — 이 타겟을 통과하려면 어떤 변경이 필요한지 */
  delta: SpecDelta;
}

export interface SpecDelta {
  /** L1+L2 합계가 최소 이만큼 필요 (m) */
  minTotalReachM: number;
  /** 어깨 위치가 최소 이 높이 이상 (m, world Y) */
  minShoulderHeightM: number;
  /** payload가 최소 이만큼 가능해야 (kg) */
  minPayloadKg: number;
  /** robot yaw가 이 방향이어야 mount plane 안에 들어옴 (rad). null = 현재 OK 또는 mount=center 무관 */
  requiredYawRad: number | null;
}

interface AnalyzeInput {
  base: VacuumBaseSpec;
  arm: ManipulatorArmSpec | undefined;
  endEffector: EndEffectorSpec | undefined;
  targets: TargetMarker[];
  targetCatalog: TargetObjectSpec[];
  payloadKg: number;
  robotXCm: number | null;
  robotYCm: number | null;
  robotYawDeg: number;
  roomWidthCm: number;
  roomDepthCm: number;
}

export function analyzeIKReachability(input: AnalyzeInput): IKReachResult[] {
  const {
    base,
    arm,
    endEffector,
    targets,
    targetCatalog,
    payloadKg,
    robotXCm,
    robotYCm,
    robotYawDeg,
    roomWidthCm,
    roomDepthCm,
  } = input;

  if (!arm) return [];

  const halfW = roomWidthCm / 2;
  const halfD = roomDepthCm / 2;
  const robotXM = ((robotXCm ?? halfW) - halfW) * CM_TO_M;
  const robotZM = ((robotYCm ?? halfD) - halfD) * CM_TO_M;
  const yawRad = (robotYawDeg * Math.PI) / 180;

  const L1 = arm.upperArmLengthCm * CM_TO_M;
  const L2 = arm.forearmLengthCm * CM_TO_M;
  const maxReachM = L1 + L2;

  const shoulderHeightM =
    (base.heightCm + arm.shoulderHeightAboveBaseCm) * CM_TO_M +
    (base.hasLiftColumn ? base.liftColumnMaxExtensionCm * CM_TO_M : 0);

  return targets.map((t, i) => {
    const tWorld = {
      x: (t.xCm - halfW) * CM_TO_M,
      y: Math.max(t.zCm, 0.5) * CM_TO_M,
      z: (t.yCm - halfD) * CM_TO_M,
    };

    const ik = solveIKForTarget(base, arm, tWorld, robotXM, robotZM, yawRad);

    // 어깨에서 타겟까지 직선 거리 (3D)
    const dx = tWorld.x - robotXM;
    const dy = tWorld.y - shoulderHeightM;
    const dz = tWorld.z - robotZM;
    const distanceM = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const spec = targetCatalog.find((c) => c.id === t.targetObjectId);
    const targetName = spec?.name ?? `타겟 ${i + 1}`;

    // EE payload 검사 (independent of reach)
    const eeMaxKg = endEffector?.maxPayloadKg ?? 1.0;
    const targetWeightKg = spec?.weightKg ?? 0;
    const requiredPayloadKg = Math.max(targetWeightKg, payloadKg);
    const eeOver = requiredPayloadKg > eeMaxKg;

    // 분류:
    //   - eeOver → PAYLOAD_OVER_EE (reach 가능해도 못 잡음)
    //   - !ik.outOfReach → OK
    //   - ik.outOfReach + 거리 d > L1+L2 → OUT_OF_REACH (reach 부족)
    //   - ik.outOfReach + height 차이 ≥ maxReachM → HEIGHT_ABOVE (어깨 너무 낮음)
    //   - ik.outOfReach + 평면 외 거리 큼 → YAW_REQUIRED
    let reason: IKReachReason = 'OK';
    let reasonText = '';
    const ok = !ik.outOfReach && !eeOver;

    if (eeOver) {
      reason = 'PAYLOAD_OVER_EE';
      reasonText = `EE max payload ${eeMaxKg.toFixed(1)}kg < 필요 ${requiredPayloadKg.toFixed(2)}kg`;
    } else if (ik.outOfReach) {
      // 평면 외 거리(out-of-plane)이 큰지 vs 단순 거리 부족인지 구분
      // 현재 IK는 평면 외 5cm 초과만 outOfReach 플래그로 표시 — 둘 다일 수도 있음
      const heightAbove = tWorld.y - shoulderHeightM;
      if (distanceM > maxReachM + 0.005) {
        reason = 'OUT_OF_REACH';
        reasonText = `어깨에서 ${(distanceM * 100).toFixed(0)}cm 떨어짐, 팔 reach ${(
          maxReachM * 100
        ).toFixed(0)}cm 부족`;
      } else if (heightAbove > maxReachM) {
        reason = 'HEIGHT_ABOVE';
        reasonText = `타겟 높이 ${(tWorld.y * 100).toFixed(
          0,
        )}cm — 어깨(${(shoulderHeightM * 100).toFixed(0)}cm)에서 reach ${(maxReachM * 100).toFixed(
          0,
        )}cm 위까지만 가능`;
      } else {
        reason = 'YAW_REQUIRED';
        reasonText = '타겟이 mount plane 옆에 있음 — robot yaw 회전 필요';
      }
    } else {
      reasonText = '도달 가능';
    }

    // Spec delta 계산
    const requiredYawRad = computeRequiredYaw(arm.mountPosition, dx, dz, yawRad);
    const minTotalReachM = ok ? maxReachM : Math.max(maxReachM, distanceM + 0.02);
    const minShoulderHeightM =
      reason === 'HEIGHT_ABOVE'
        ? Math.max(shoulderHeightM, tWorld.y - maxReachM * 0.85)
        : shoulderHeightM;
    const minPayloadKg = Math.max(eeMaxKg, requiredPayloadKg);

    return {
      targetIndex: i,
      ok,
      reason,
      reasonText,
      targetName,
      targetWorld: tWorld,
      distanceM,
      maxReachM,
      pose: { shoulderPitchDeg: ik.shoulderPitchDeg, elbowDeg: ik.elbowDeg },
      delta: {
        minTotalReachM,
        minShoulderHeightM,
        minPayloadKg,
        requiredYawRad,
      },
    };
  });
}

/**
 * 타겟 방향이 mount plane 안에 들어오는 robot yaw를 계산.
 *
 * mount=center  → 어떤 yaw든 OK (return null)
 * mount=front   → 타겟이 robot 정면(+Z local)에 있어야 → yaw = atan2(dx, dz)
 * mount=left    → 타겟이 robot 좌측(-X local)에 있어야 → yaw = atan2(dx, dz) + π/2
 * mount=right   → 타겟이 robot 우측(+X local)에 있어야 → yaw = atan2(dx, dz) - π/2
 *
 * 현재 yaw와의 차이가 작으면 (5° 이내) null 반환.
 */
function computeRequiredYaw(
  mount: ManipulatorArmSpec['mountPosition'],
  dxWorld: number,
  dzWorld: number,
  currentYaw: number,
): number | null {
  if (mount === 'center') return null;

  const targetAngleWorld = Math.atan2(dxWorld, dzWorld); // 0 = +Z 방향
  let offset = 0;
  switch (mount) {
    case 'front':
      offset = 0;
      break;
    case 'left':
      offset = Math.PI / 2;
      break;
    case 'right':
      offset = -Math.PI / 2;
      break;
  }
  const requiredYaw = targetAngleWorld + offset;
  // 현재 yaw와 5° 이내면 OK
  let diff = requiredYaw - currentYaw;
  diff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI; // [-π, π]
  if (Math.abs(diff) < (5 * Math.PI) / 180) return null;
  return ((requiredYaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/**
 * 여러 IKReachResult를 모아 최소 요구 스펙을 도출.
 * Phase A의 Derived Spec Card 데이터.
 */
export interface DerivedSpec {
  minTotalReachCm: number;
  minShoulderHeightCm: number;
  minPayloadKg: number;
  /** mount이 center 외이고, 타겟마다 다른 yaw가 필요하면 mount=center 권장 */
  recommendCenterMount: boolean;
  /** 분석 대상 타겟 수 / 통과 수 */
  totalTargets: number;
  passedTargets: number;
  /** 실패 분류별 카운트 */
  failureCounts: Record<IKReachReason, number>;
}

export function deriveSpecFromResults(results: IKReachResult[]): DerivedSpec {
  const failureCounts: Record<IKReachReason, number> = {
    OK: 0,
    OUT_OF_REACH: 0,
    HEIGHT_ABOVE: 0,
    YAW_REQUIRED: 0,
    PAYLOAD_OVER_EE: 0,
  };

  let minReach = 0;
  let minShoulder = 0;
  let minPayload = 0;
  let yawRequiredCount = 0;
  let passed = 0;

  for (const r of results) {
    failureCounts[r.reason] = (failureCounts[r.reason] ?? 0) + 1;
    if (r.ok) passed++;
    if (r.delta.minTotalReachM > minReach) minReach = r.delta.minTotalReachM;
    if (r.delta.minShoulderHeightM > minShoulder) minShoulder = r.delta.minShoulderHeightM;
    if (r.delta.minPayloadKg > minPayload) minPayload = r.delta.minPayloadKg;
    if (r.reason === 'YAW_REQUIRED') yawRequiredCount++;
  }

  return {
    minTotalReachCm: minReach * 100,
    minShoulderHeightCm: minShoulder * 100,
    minPayloadKg: minPayload,
    recommendCenterMount: yawRequiredCount >= 2,
    totalTargets: results.length,
    passedTargets: passed,
    failureCounts,
  };
}
