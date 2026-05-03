/**
 * Grasp engine — 시간 t에 어떤 타겟이 잡혀 있는지 + 손목 world 위치 계산.
 *
 * 시나리오:
 *   - GRAB(t=2, dur=2, target=3) → t=4 시점부터 target #3 attached
 *   - 그 사이 다른 GRAB가 와도 마지막 것이 우선 (직전 attached 자동 release)
 *   - RELEASE(t=8, dur=2) → t=10 시점부터 detached
 *
 * 로봇 손목의 world 위치는 spec + armPose + robot world position에서 FK로 계산.
 * Three.js Matrix4 사용 (kinematic-tree와 동일 transform 누적).
 */

import * as THREE from 'three';
import type { TimelineGesture } from '../stores/designer-vacuum-store';
import type { ManipulatorArmSpec, VacuumBaseSpec, ArmMountPosition } from '../types/product';
import { MOUNT_OFFSET_RATIO } from '../types/product';

const CM_TO_M = 0.01;
const DEG_TO_RAD = Math.PI / 180;

/**
 * 시간 t에 그리퍼가 닫혀(close)있는지. true = 닫힘, false = 열림.
 *
 * Timing:
 *   - GRAB: gesture END에 닫힘 (reach 동작 끝낸 후 잡음)
 *   - RELEASE: gesture START에 열림 (target 즉시 떨어짐, 그 후 팔 retract)
 *
 * 시간 순서대로 transitions를 적용 → 가장 최근 transition 결과.
 * 닫힌 동안에는 GrabController가 반경 내 closest target을 자동 attach.
 */
export function isGripperClosedAtTime(
  gestures: TimelineGesture[],
  t: number,
): boolean {
  let closed = false;
  // gestures는 t 오름차순. transition 시점이 다르므로 effective time을 비교.
  // GRAB의 close transition: t = g.t + g.durationSec
  // RELEASE의 open transition: t = g.t
  // 두 transition 시점 모두 t에 도달했는지 보고, 그 중 가장 늦은 transition이 결과.
  type Transition = { effT: number; close: boolean };
  const trs: Transition[] = [];
  for (const g of gestures) {
    if (g.type === 'GRAB') trs.push({ effT: g.t + g.durationSec, close: true });
    else if (g.type === 'RELEASE') trs.push({ effT: g.t, close: false });
  }
  trs.sort((a, b) => a.effT - b.effT);
  for (const tr of trs) {
    if (tr.effT > t) break;
    closed = tr.close;
  }
  return closed;
}

/**
 * 시간 t에 명시적으로 지정된 target index (GRAB의 targetIndex). 없으면 null.
 * 자동 grab 모드와 별도로, 사용자가 특정 타겟을 강제로 지정한 경우용 (override).
 */
export function getExplicitTargetAtTime(
  gestures: TimelineGesture[],
  t: number,
): number | null {
  let target: number | null = null;
  for (const g of gestures) {
    if (g.t > t) break;
    if (g.type === 'GRAB' && g.targetIndex !== undefined) {
      target = g.targetIndex;
    } else if (g.type === 'RELEASE') {
      target = null;
    }
  }
  return target;
}

/** @deprecated 이전 API — 호환성을 위해 유지. 새 코드는 store.heldTargetIndex 사용. */
export function getHeldTargetAtTime(
  gestures: TimelineGesture[],
  t: number,
): number | null {
  return getExplicitTargetAtTime(gestures, t);
}

/* ─── 손목 World Position FK ─────────────────────────────────────────────── */

function computeMountOffset(
  arm: ManipulatorArmSpec,
  base: VacuumBaseSpec,
): { x: number; z: number } {
  const radiusM = (base.diameterOrWidthCm / 2) * CM_TO_M;
  const offset = radiusM * MOUNT_OFFSET_RATIO;
  switch (arm.mountPosition) {
    case 'center':
      return { x: 0, z: 0 };
    case 'front':
      return { x: 0, z: offset };
    case 'left':
      return { x: -offset, z: 0 };
    case 'right':
      return { x: offset, z: 0 };
  }
}

function shoulderPitchAxis(mount: ArmMountPosition): [number, number, number] {
  switch (mount) {
    case 'center':
    case 'front':
      return [1, 0, 0];
    case 'left':
      return [0, 0, 1];
    case 'right':
      return [0, 0, -1];
  }
}

/**
 * 손목 (gripper attachment point) world 위치.
 * robot-tree의 transform 누적과 동일한 결과 — JS에서 직접 계산.
 *
 * 체인: base(robot world + yaw) → pedestal(mount offset, base top) → shoulder(stem +
 * height, pitch rotation) → upper arm(L1) → elbow(pitch rotation) → forearm(L2)
 * → wrist(여기 = end-effector attach point)
 *
 * robotYawRad: 로봇 base의 Y축 yaw 회전. mount offset과 모든 child link가 회전 따라감.
 */
export function computeWristWorldPosition(
  base: VacuumBaseSpec,
  arm: ManipulatorArmSpec,
  armPose: { shoulderPitchDeg: number; elbowDeg: number },
  robotXM: number,
  robotZM: number,
  robotYawRad = 0,
): THREE.Vector3 {
  const m = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();

  // base_link world: robot 위치 (로봇 베이스 바닥) + yaw 회전
  m.makeTranslation(robotXM, 0, robotZM);
  if (robotYawRad !== 0) {
    tmp.makeRotationY(robotYawRad);
    m.multiply(tmp);
  }

  // pedestal: 베이스 윗면(높이) + mount offset (robot local frame)
  const mount = computeMountOffset(arm, base);
  tmp.makeTranslation(mount.x, base.heightCm * CM_TO_M, mount.z);
  m.multiply(tmp);

  // shoulder origin: 페데스탈 위 shoulderUpM 만큼
  tmp.makeTranslation(0, arm.shoulderHeightAboveBaseCm * CM_TO_M, 0);
  m.multiply(tmp);

  // shoulder rotation
  const shoulderAxisArr = shoulderPitchAxis(arm.mountPosition);
  const shoulderRad = armPose.shoulderPitchDeg * DEG_TO_RAD;
  const axisVec = new THREE.Vector3(shoulderAxisArr[0], shoulderAxisArr[1], shoulderAxisArr[2]);
  tmp.makeRotationAxis(axisVec, shoulderRad);
  m.multiply(tmp);

  // upper arm: +Y 방향으로 L1
  const L1 = arm.upperArmLengthCm * CM_TO_M;
  tmp.makeTranslation(0, L1, 0);
  m.multiply(tmp);

  // elbow rotation (관절 state = elbowRad - π, 음수가 자연스러운 접힘)
  const elbowRad = armPose.elbowDeg * DEG_TO_RAD;
  const elbowJoint = elbowRad - Math.PI;
  tmp.makeRotationAxis(axisVec, elbowJoint);
  m.multiply(tmp);

  // forearm: +Y 방향으로 L2 → 끝이 wrist
  const L2 = arm.forearmLengthCm * CM_TO_M;
  tmp.makeTranslation(0, L2, 0);
  m.multiply(tmp);

  const wristPos = new THREE.Vector3();
  wristPos.setFromMatrixPosition(m);
  return wristPos;
}

/**
 * Gripper grip point — 손목보다 약간 더 끝 (그리퍼 본체 + 파지면 바깥).
 * tipScale은 보통 0.06m. 그리퍼는 손목으로부터 +Y(local) 방향으로 ~tipScale*1.4
 * 만큼 extend. forearm 방향이 곧 그리퍼 방향.
 *
 * 단순화: 손목 + (forearm 끝 → 손목 방향 정규화) * gripOffset.
 * 하지만 forearm이 +Y 방향이라 wrist position과 forearm 끝이 같은 점이 됨.
 * 정확히 하려면 한 단계 더 — forearm rotation까지 누적 후 +tipScale*1.4 in Y.
 *
 * 여기선 단순화: 손목 위치 그대로 사용 (Phase II PoC). 시각적으로 그리퍼와
 * 약간 어긋나도 grasp 인식은 잘 됨.
 */
export function computeGripWorldPosition(
  base: VacuumBaseSpec,
  arm: ManipulatorArmSpec,
  armPose: { shoulderPitchDeg: number; elbowDeg: number },
  robotXM: number,
  robotZM: number,
  robotYawRad = 0,
): THREE.Vector3 {
  return computeWristWorldPosition(base, arm, armPose, robotXM, robotZM, robotYawRad);
}
