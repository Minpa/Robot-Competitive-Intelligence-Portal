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
import { buildVacuumArmChain, buildVacuumArmState } from '../../kinematics/vacuum-arm-chain';
import { computeFK, getLinkDistalEnd } from '../../kinematics/chain';

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
  // Generic kinematic chain 기반 FK — vacuum-arm spec을 chain으로 변환 후 FK 실행.
  // form factor가 늘어나도 같은 코드로 처리. 결과는 기존 직접 transform 누적과 동일.
  const product = { name: '', base, arms: [arm] };
  const chain = buildVacuumArmChain({ product });
  const state = buildVacuumArmState({
    product,
    armPose,
    robotXM,
    robotZM,
    robotYawRad,
  });
  const fk = computeFK(chain, state);

  // wrist = forearm link의 distal end. forearm link id는 'arm0_forearm'.
  const wrist = getLinkDistalEnd(fk, chain, 'arm0_forearm');
  return wrist ?? new THREE.Vector3();
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

/* ─── 2-link IK: 타겟 world 위치 → (shoulderPitchDeg, elbowDeg) ──────────
 *
 * 어깨 회전 평면(2D)에서 풀이:
 *   - shoulder 원점에서 target까지 평면거리 d
 *   - L1+L2 ≥ d ≥ |L1−L2| 이면 해 존재
 *   - cos(elbowJoint) = (d² − L1² − L2²) / (2·L1·L2)  → elbow의 "굽힘" 각
 *   - 어깨 각도: target 방향 각 ± atan2 보정
 *
 * 좌표 변환:
 *   target world (m) → robot local (yaw 역회전, robot pos 빼기)
 *   → shoulder local (mount offset · base height · shoulder height 빼기)
 *   → 그 다음 mount의 회전 평면(YZ for center/front, XY for left/right) 안에서 풀이
 *
 * mount=center/front: 평면=YZ, 평면 좌표 (y, z) = (target_local.y, target_local.z)
 *   shoulder=0 → +Y(위), 90 → +Z(앞), 180 → -Y(아래)
 *   shoulder = atan2(planeZ, planeY)  (각도 0 = 위, +90 = 앞)
 *   여기에 IK 보정 (target까지 직선 vs upper arm) 더함
 *
 * mount=left: 평면=XY, 평면 좌표 (y, x) — shoulder axis [0,0,1] 기준
 * mount=right: 평면=XY, 평면 좌표 (y, -x)
 *
 * 현재 FK에서 elbowJoint = elbowRad − π. 즉 elbowDeg=180 → joint=0 (펴짐),
 * elbowDeg=0 → joint=−π (완전 접힘 back). IK 결과 elbowJoint에 +π 해서 elbowDeg.
 * ─────────────────────────────────────────────────────────────────────── */

export interface IKResult {
  shoulderPitchDeg: number;
  elbowDeg: number;
  /** 타겟이 reach 한계 밖이면 true. 그래도 가능한 한 target 방향으로 fully extend. */
  outOfReach: boolean;
}

export function solveIKForTarget(
  base: VacuumBaseSpec,
  arm: ManipulatorArmSpec,
  targetWorld: { x: number; y: number; z: number },
  robotXM: number,
  robotZM: number,
  robotYawRad = 0,
): IKResult {
  const L1 = arm.upperArmLengthCm * CM_TO_M;
  const L2 = arm.forearmLengthCm * CM_TO_M;

  // 1) target → shoulder local frame
  // robot → robot-local: target 좌표에서 robot 위치 뺀 뒤 yaw 역회전
  const dxWorld = targetWorld.x - robotXM;
  const dzWorld = targetWorld.z - robotZM;
  const cy = Math.cos(-robotYawRad);
  const sy = Math.sin(-robotYawRad);
  const localXAfterYaw = dxWorld * cy - dzWorld * sy;
  const localZAfterYaw = dxWorld * sy + dzWorld * cy;
  // pedestal offset 빼기 (mount-dependent)
  const mount = computeMountOffset(arm, base);
  const px = localXAfterYaw - mount.x;
  const pz = localZAfterYaw - mount.z;
  // shoulder origin: pedestal + (0, base.heightCm + arm.shoulderHeightAboveBaseCm, 0)
  const shoulderY = (base.heightCm + arm.shoulderHeightAboveBaseCm) * CM_TO_M;
  const py = targetWorld.y - shoulderY;
  // 이제 target은 shoulder local: (px, py, pz)

  // 2) 회전 평면 좌표 (planeUp=어깨 0° 방향=+Y, planeForward=어깨 90° 방향)
  let planeUp: number;
  let planeForward: number;
  let outOfPlaneDist: number;
  switch (arm.mountPosition) {
    case 'center':
    case 'front':
      // axis=X. plane=YZ. shoulder=0 → +Y, shoulder=90 (CCW around X) → +Z (sin>0)
      // FK: rotate (0,1,0) by shoulderRad around X → (0, cos, sin) = (0, cos, sin)
      // 그래서 +Z = forward(앞). plane forward = pz, plane up = py.
      planeUp = py;
      planeForward = pz;
      outOfPlaneDist = px;
      break;
    case 'left':
      // axis=Z. plane=XY. shoulder=0 → +Y, shoulder=90 (CCW around Z) → -X
      // (0,1,0) rotate by θ around Z → (-sin, cos, 0). 그래서 forward = -X.
      planeUp = py;
      planeForward = -px;
      outOfPlaneDist = pz;
      break;
    case 'right':
      // axis=-Z. (0,1,0) rotate by θ around -Z → (sin, cos, 0). forward = +X.
      planeUp = py;
      planeForward = px;
      outOfPlaneDist = pz;
      break;
  }

  // 3) plane 안에서 2-link IK — 두 branch (elbow-up / elbow-down) 모두 계산 후
  //    elbow 위치가 더 높은 (자기 충돌 적은) branch 선택.
  const d = Math.sqrt(planeUp * planeUp + planeForward * planeForward);
  let outOfReach = false;
  let shoulderPitchDeg: number;
  let elbowDeg: number;

  if (d > L1 + L2) {
    // 닿지 않음 — fully extended toward target
    outOfReach = true;
    shoulderPitchDeg = (Math.atan2(planeForward, planeUp) * 180) / Math.PI;
    elbowDeg = 180; // 펴짐
  } else if (d < Math.abs(L1 - L2)) {
    outOfReach = true;
    shoulderPitchDeg = (Math.atan2(planeForward, planeUp) * 180) / Math.PI;
    elbowDeg = 0; // 완전 접힘
  } else {
    // 일반 해: cosine rule. 두 branch 평가.
    const cosElbowInternal = (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2);
    const elbowInternal = Math.acos(Math.max(-1, Math.min(1, cosElbowInternal)));
    const targetAngle = Math.atan2(planeForward, planeUp);
    const cosAlpha = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));

    // Branch A: 어깨가 (target+alpha) 방향, elbow는 backward fold (joint < 0)
    const shoulderRadA = targetAngle + alpha;
    const elbowJointA = elbowInternal - Math.PI; // 음수
    // Branch B: 어깨가 (target-alpha) 방향, elbow는 forward fold (joint > 0)
    const shoulderRadB = targetAngle - alpha;
    const elbowJointB = Math.PI - elbowInternal; // 양수

    // 각 branch의 elbow world Y 계산 → 더 높은 쪽 선택 (베이스/floor 통과 회피).
    // elbow 위치 (in plane): (sin(shoulderRad)·L1 in planeForward, cos(shoulderRad)·L1 in planeUp)
    const elbowYofShoulder = (sr: number) => Math.cos(sr) * L1; // shoulder local Y (planeUp 기준)
    const elbowYA = elbowYofShoulder(shoulderRadA);
    const elbowYB = elbowYofShoulder(shoulderRadB);

    // 더 높은 elbow를 선택. 동률이면 shoulderRad가 [0, π] 안인 쪽.
    let pickB: boolean;
    if (Math.abs(elbowYA - elbowYB) > 0.001) {
      pickB = elbowYB > elbowYA;
    } else {
      pickB = shoulderRadB >= 0 && shoulderRadB <= Math.PI;
    }
    const shoulderRad = pickB ? shoulderRadB : shoulderRadA;
    const elbowJoint = pickB ? elbowJointB : elbowJointA;

    shoulderPitchDeg = (shoulderRad * 180) / Math.PI;
    elbowDeg = (elbowJoint + Math.PI) * (180 / Math.PI); // [0, 360]
  }

  // 4) 범위 clamp + 평면 외 거리 경고
  const clampedShoulder = Math.max(-30, Math.min(180, shoulderPitchDeg));
  // elbow [0, 270] — forward fold(180+) 허용해 자연스러운 reach
  const clampedElbow = Math.max(0, Math.min(270, elbowDeg));
  if (Math.abs(outOfPlaneDist) > 0.05) {
    outOfReach = true;
  }

  return {
    shoulderPitchDeg: clampedShoulder,
    elbowDeg: clampedElbow,
    outOfReach,
  };
}
