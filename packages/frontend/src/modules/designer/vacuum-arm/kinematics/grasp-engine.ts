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
 * 시간 t에 잡혀 있는 타겟 인덱스. 없으면 null.
 *
 * 규칙:
 *   - GRAB이 시작되는 시점부터 holding 상태 (즉시 attach — 시각적으로 GRAB 자세
 *     중 잡고 있음 표현). 정확히는 gesture START.
 *   - RELEASE이 시작되는 시점부터 released (즉시 detach — RELEASE 자세 중 떨어짐).
 *   - 가장 최근 이벤트가 우선.
 */
export function getHeldTargetAtTime(
  gestures: TimelineGesture[],
  t: number,
): number | null {
  let held: number | null = null;
  // gestures는 store에서 t 오름차순 정렬됨
  for (const g of gestures) {
    if (g.t > t) break;
    if (g.type === 'GRAB' && g.targetIndex !== undefined) {
      held = g.targetIndex;
    } else if (g.type === 'RELEASE') {
      held = null;
    }
  }
  return held;
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
