/**
 * Client-side statics + ZMP — mirror of backend statics/stability service.
 *
 * 백엔드 의존을 끊기 위해 frontend에서 직접 계산. 슬라이더 입력에 즉시 반응.
 * 액추에이터 카탈로그는 backend listActuators API에서 가져온 결과를 입력으로 받음.
 */

import type {
  ActuatorSpec,
  ManipulatorArmSpec,
  VacuumBaseSpec,
  ArmAnalysisResult,
  StabilityResult,
  PayloadCurvePoint,
} from '../types/product';

const G = 9.81;
const UPPER_ARM_RADIUS_M = 0.018;
const FOREARM_RADIUS_M = 0.014;
const LIMB_DENSITY_KG_M3 = 2700; // aluminum-ish
const CM_TO_M = 0.01;

function limbMassKg(radiusM: number, lengthCm: number): number {
  const lengthM = lengthCm * CM_TO_M;
  return Math.PI * radiusM * radiusM * lengthM * LIMB_DENSITY_KG_M3;
}

function shoulderTorqueNm(L1cm: number, L2cm: number, payloadKg: number, eeKg: number): number {
  const L1 = L1cm * CM_TO_M;
  const L2 = L2cm * CM_TO_M;
  const mU = limbMassKg(UPPER_ARM_RADIUS_M, L1cm);
  const mF = limbMassKg(FOREARM_RADIUS_M, L2cm);
  return mU * G * (L1 / 2) + mF * G * (L1 + L2 / 2) + (payloadKg + eeKg) * G * (L1 + L2);
}

function elbowTorqueNm(L2cm: number, payloadKg: number, eeKg: number): number {
  const L2 = L2cm * CM_TO_M;
  const mF = limbMassKg(FOREARM_RADIUS_M, L2cm);
  return mF * G * (L2 / 2) + (payloadKg + eeKg) * G * L2;
}

function payloadReachCurve(
  arm: ManipulatorArmSpec,
  shoulderActuator: ActuatorSpec | undefined,
  eeKg: number,
  numPoints = 20,
): PayloadCurvePoint[] {
  if (!shoulderActuator) return [];
  const Tcont = shoulderActuator.continuousTorqueNm;
  const totalReach = arm.upperArmLengthCm + arm.forearmLengthCm;
  const ratio = arm.upperArmLengthCm / totalReach;
  const rMin = Math.max(30, totalReach * 0.5);
  const rMax = Math.min(80, totalReach * 1.5);

  const points: PayloadCurvePoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const R = rMin + ((rMax - rMin) * i) / (numPoints - 1);
    const L1 = R * ratio;
    const L2 = R * (1 - ratio);
    const mU = limbMassKg(UPPER_ARM_RADIUS_M, L1);
    const mF = limbMassKg(FOREARM_RADIUS_M, L2);
    const L1m = L1 * CM_TO_M;
    const L2m = L2 * CM_TO_M;
    const linkMoment = mU * G * (L1m / 2) + mF * G * (L1m + L2m / 2);
    const eePart = eeKg * G * (L1m + L2m);
    const remainingNm = Tcont - linkMoment - eePart;
    const payloadCapacityKg = Math.max(0, remainingNm / (G * (L1m + L2m)));
    points.push({
      reachCm: Number(R.toFixed(1)),
      maxPayloadKg: Number(payloadCapacityKg.toFixed(2)),
    });
  }
  return points;
}

export function computeArmStatics(
  arm: ManipulatorArmSpec,
  payloadKg: number,
  eeKg: number,
  armIndex: number,
  actuators: ActuatorSpec[],
): ArmAnalysisResult {
  const sh = actuators.find((a) => a.sku === arm.shoulderActuatorSku);
  const el = actuators.find((a) => a.sku === arm.elbowActuatorSku);

  const reqShoulder = shoulderTorqueNm(arm.upperArmLengthCm, arm.forearmLengthCm, payloadKg, eeKg);
  const reqElbow = elbowTorqueNm(arm.forearmLengthCm, payloadKg, eeKg);
  const shoulderPeak = sh?.peakTorqueNm ?? 0;
  const elbowPeak = el?.peakTorqueNm ?? 0;

  const totalReachCm = arm.upperArmLengthCm + arm.forearmLengthCm;
  return {
    armIndex,
    envelope: {
      shoulderOriginM: [0, arm.shoulderHeightAboveBaseCm * CM_TO_M, 0],
      innerRadiusM: Math.abs(arm.upperArmLengthCm - arm.forearmLengthCm) * CM_TO_M,
      outerRadiusM: totalReachCm * CM_TO_M,
      totalReachCm,
      maxHeightCm: arm.shoulderHeightAboveBaseCm + totalReachCm,
      maxHorizontalReachCm: totalReachCm,
    },
    statics: {
      armIndex,
      estimatedLimbMassKg: Number(
        (
          limbMassKg(UPPER_ARM_RADIUS_M, arm.upperArmLengthCm) +
          limbMassKg(FOREARM_RADIUS_M, arm.forearmLengthCm)
        ).toFixed(3),
      ),
      joints: [
        {
          jointName: 'shoulder',
          requiredPeakTorqueNm: Number(reqShoulder.toFixed(2)),
          actuatorPeakTorqueNm: shoulderPeak,
          marginPct:
            shoulderPeak === 0
              ? -100
              : Number((((shoulderPeak - reqShoulder) / shoulderPeak) * 100).toFixed(1)),
          overLimit: reqShoulder > shoulderPeak,
          actuatorSku: arm.shoulderActuatorSku,
        },
        {
          jointName: 'elbow',
          requiredPeakTorqueNm: Number(reqElbow.toFixed(2)),
          actuatorPeakTorqueNm: elbowPeak,
          marginPct:
            elbowPeak === 0
              ? -100
              : Number((((elbowPeak - reqElbow) / elbowPeak) * 100).toFixed(1)),
          overLimit: reqElbow > elbowPeak,
          actuatorSku: arm.elbowActuatorSku,
        },
      ],
    },
    payloadCurve: payloadReachCurve(arm, sh, eeKg),
    endEffector: null, // populated by EE catalog elsewhere if needed
    endEffectorPayloadOverLimit: false,
    endEffectorMaxPayloadKg: Infinity,
  };
}

export function computeStability(
  base: VacuumBaseSpec,
  arms: ManipulatorArmSpec[],
  payloadKg: number,
  eeKgByArm: number[] = [],
): StabilityResult {
  // Worst-case: all arms extended horizontally outward from their mount.
  // Compute COM in xz-plane (y up, base footprint on xz).
  const baseRadiusCm = base.diameterOrWidthCm / 2;
  let totalMass = base.weightKg;
  let mx = 0;
  let mz = 0;

  arms.forEach((arm, i) => {
    const eeKg = eeKgByArm[i] ?? 0.05;
    const L1 = arm.upperArmLengthCm;
    const L2 = arm.forearmLengthCm;
    const mU = limbMassKg(UPPER_ARM_RADIUS_M, L1);
    const mF = limbMassKg(FOREARM_RADIUS_M, L2);
    const totalArm = mU + mF + payloadKg + eeKg;

    // Mount offset on base (cm)
    let mountX = 0;
    let mountZ = 0;
    const offsetCm = baseRadiusCm * 0.45;
    let dirX = 0;
    let dirZ = 1;
    switch (arm.mountPosition) {
      case 'front': mountZ = offsetCm; break;
      case 'left':  mountX = -offsetCm; dirX = -1; dirZ = 0; break;
      case 'right': mountX = offsetCm;  dirX = 1;  dirZ = 0; break;
    }

    // COM offset in cm: limbs centered along outward direction
    const upperCom = L1 / 2;
    const forearmCom = L1 + L2 / 2;
    const tipCom = L1 + L2;

    const comX =
      mountX +
      dirX * (mU * upperCom + mF * forearmCom + (payloadKg + eeKg) * tipCom) / totalArm;
    const comZ =
      mountZ +
      dirZ * (mU * upperCom + mF * forearmCom + (payloadKg + eeKg) * tipCom) / totalArm;

    mx += comX * totalArm;
    mz += comZ * totalArm;
    totalMass += totalArm;
  });

  const zmpXCm = mx / totalMass;
  const zmpZCm = mz / totalMass;

  const distFromCenter = Math.sqrt(zmpXCm * zmpXCm + zmpZCm * zmpZCm);
  const marginToEdgeCm = baseRadiusCm - distFromCenter;
  const isStable = marginToEdgeCm > 0;

  // Approximate footprint as 24-vertex polygon for disc, or 4 corners for square.
  const polygon: Array<[number, number]> = [];
  if (base.shape === 'square') {
    const halfW = baseRadiusCm;
    polygon.push([-halfW, -halfW], [halfW, -halfW], [halfW, halfW], [-halfW, halfW]);
  } else {
    const N = 24;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      polygon.push([
        Number((Math.cos(t) * baseRadiusCm).toFixed(2)),
        Number((Math.sin(t) * baseRadiusCm).toFixed(2)),
      ]);
    }
  }

  return {
    zmpXCm: Number(zmpXCm.toFixed(2)),
    zmpYCm: Number(zmpZCm.toFixed(2)),
    footprintPolygonCm: polygon,
    marginToEdgeCm: Number(marginToEdgeCm.toFixed(2)),
    isStable,
  };
}
