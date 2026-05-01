/**
 * Statics service · vacuum-arm REQ-4 + REQ-5 helper
 *
 * Worst-case static torque (spec §8 REQ-4):
 *   Pose = arm fully extended horizontally (max moment arm).
 *   Limb mass estimated from a uniform-aluminum tube model:
 *     m_limb_kg = π × r² × L × ρ
 *   where r = stylistic radius (1.8 cm upper, 1.4 cm forearm),
 *         ρ ≈ 2700 kg/m³ for solid aluminum.
 *   This is intentionally rough — we're sizing motors, not building
 *   structurally-correct models. Replaced by real CAD masses in Phase 2.
 *
 * Payload-vs-reach tradeoff: at full reach with shoulder torque budget T*,
 *   max_payload(L1, L2) = (T* - m_uarm*g*L1/2 - m_farm*g*(L1+L2/2)) / (g*(L1+L2))
 *   When T* is the actuator's continuous torque (not peak) we get the
 *   "sustained" payload capability.
 */

import { actuatorService } from '../actuator.service.js';
import type { ManipulatorArmSpec } from './types.js';

const G = 9.81;

const UPPER_ARM_RADIUS_M = 0.018;
const FOREARM_RADIUS_M = 0.014;
const LIMB_DENSITY_KG_M3 = 2700; // aluminum-ish

const CM_TO_M = 0.01;

export function limbMassKg(radiusM: number, lengthCm: number): number {
  const lengthM = lengthCm * CM_TO_M;
  return Math.PI * radiusM * radiusM * lengthM * LIMB_DENSITY_KG_M3;
}

export function shoulderTorqueNm(
  upperArmLengthCm: number,
  forearmLengthCm: number,
  payloadKg: number,
  endEffectorMassKg: number
): number {
  const L1 = upperArmLengthCm * CM_TO_M;
  const L2 = forearmLengthCm * CM_TO_M;
  const mU = limbMassKg(UPPER_ARM_RADIUS_M, upperArmLengthCm);
  const mF = limbMassKg(FOREARM_RADIUS_M, forearmLengthCm);
  // Moment about shoulder, all weights horizontal, lever to each COM:
  return mU * G * (L1 / 2) + mF * G * (L1 + L2 / 2) + (payloadKg + endEffectorMassKg) * G * (L1 + L2);
}

export function elbowTorqueNm(
  forearmLengthCm: number,
  payloadKg: number,
  endEffectorMassKg: number
): number {
  const L2 = forearmLengthCm * CM_TO_M;
  const mF = limbMassKg(FOREARM_RADIUS_M, forearmLengthCm);
  return mF * G * (L2 / 2) + (payloadKg + endEffectorMassKg) * G * L2;
}

export interface JointAnalysis {
  jointName: 'shoulder' | 'elbow';
  requiredPeakTorqueNm: number;
  actuatorPeakTorqueNm: number;
  /** Headroom percent: (actuator - required) / actuator × 100. Negative = over limit. */
  marginPct: number;
  overLimit: boolean;
  actuatorSku: string;
}

export interface ArmStaticsResult {
  armIndex: number;
  joints: JointAnalysis[];
  /** Estimated mass of the arm structure (kg) — limbs only, no actuators. */
  estimatedLimbMassKg: number;
}

export interface PayloadCurvePoint {
  reachCm: number;
  maxPayloadKg: number;
}

/** Per-arm joint torque under given payload + end-effector mass. */
export function evaluateArmStatics(
  arm: ManipulatorArmSpec,
  payloadKg: number,
  endEffectorMassKg: number,
  armIndex = 0
): ArmStaticsResult {
  const sh = actuatorService.getBySku(arm.shoulderActuatorSku);
  const el = actuatorService.getBySku(arm.elbowActuatorSku);
  const reqShoulder = shoulderTorqueNm(
    arm.upperArmLengthCm,
    arm.forearmLengthCm,
    payloadKg,
    endEffectorMassKg
  );
  const reqElbow = elbowTorqueNm(arm.forearmLengthCm, payloadKg, endEffectorMassKg);

  const shoulderPeak = sh?.peakTorqueNm ?? 0;
  const elbowPeak = el?.peakTorqueNm ?? 0;

  const joints: JointAnalysis[] = [
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
        elbowPeak === 0 ? -100 : Number((((elbowPeak - reqElbow) / elbowPeak) * 100).toFixed(1)),
      overLimit: reqElbow > elbowPeak,
      actuatorSku: arm.elbowActuatorSku,
    },
  ];

  return {
    armIndex,
    joints,
    estimatedLimbMassKg: Number(
      (
        limbMassKg(UPPER_ARM_RADIUS_M, arm.upperArmLengthCm) +
        limbMassKg(FOREARM_RADIUS_M, arm.forearmLengthCm)
      ).toFixed(3)
    ),
  };
}

/**
 * Payload ↔ reach tradeoff curve, parameterized by total reach (L1+L2).
 *
 * For each candidate total reach R (cm), keep the L1:L2 ratio fixed at the
 * arm's current ratio, recompute limb masses, and find the max payload such
 * that shoulder torque doesn't exceed the actuator's *continuous* torque
 * (sustained operation, with default 1.0 safety factor).
 *
 * Returns N points spanning 30% .. 130% of the arm's current reach.
 */
export function payloadReachCurve(
  arm: ManipulatorArmSpec,
  endEffectorMassKg: number,
  numPoints = 20
): PayloadCurvePoint[] {
  const sh = actuatorService.getBySku(arm.shoulderActuatorSku);
  if (!sh) return [];
  const Tcont = sh.continuousTorqueNm;

  const totalReachCurrent = arm.upperArmLengthCm + arm.forearmLengthCm;
  const ratio = arm.upperArmLengthCm / totalReachCurrent;
  const rMin = Math.max(30, totalReachCurrent * 0.5); // not below 30 cm total
  const rMax = Math.min(80, totalReachCurrent * 1.5); // not above 80 cm total

  const points: PayloadCurvePoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const R = rMin + ((rMax - rMin) * i) / (numPoints - 1);
    const L1 = R * ratio;
    const L2 = R * (1 - ratio);
    // Solve for payload: shoulderTorque(L1, L2, P, ee) = Tcont
    // shoulderTorque = mU*g*L1/2 + mF*g*(L1+L2/2) + (P+ee)*g*(L1+L2)
    const mU = limbMassKg(UPPER_ARM_RADIUS_M, L1);
    const mF = limbMassKg(FOREARM_RADIUS_M, L2);
    const L1m = L1 * CM_TO_M;
    const L2m = L2 * CM_TO_M;
    const linkMoment = mU * G * (L1m / 2) + mF * G * (L1m + L2m / 2);
    const eePart = endEffectorMassKg * G * (L1m + L2m);
    const remainingNm = Tcont - linkMoment - eePart;
    const payloadCapacityKg = Math.max(0, remainingNm / (G * (L1m + L2m)));
    points.push({
      reachCm: Number(R.toFixed(1)),
      maxPayloadKg: Number(payloadCapacityKg.toFixed(2)),
    });
  }
  return points;
}

class StaticsService {
  evaluateArm = evaluateArmStatics;
  payloadCurve = payloadReachCurve;
}

export const staticsService = new StaticsService();
