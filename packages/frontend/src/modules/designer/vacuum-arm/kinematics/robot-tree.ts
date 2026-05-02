/**
 * ARGOS-Designer · Robot Kinematic Tree (URDF-style)
 *
 * 진짜 로봇 시뮬레이터(Gazebo/MuJoCo/Isaac)와 동일한 패턴:
 *   - 로봇은 "links + joints" 트리로 정의됨
 *   - 각 link는 부모 link의 frame에 transform으로 attach
 *   - joint는 두 link 사이의 자유도 (revolute / prismatic / fixed)
 *   - Forward kinematics = 트리를 따라 transform 누적
 *
 * R3F 구현 전략:
 *   - 트리를 nested <group> 구조로 렌더 → R3F scene graph가 FK를 자동 처리
 *   - 즉, joint 각도가 바뀌면 그 link 아래 모든 자식이 자동으로 따라감
 *   - 그리퍼 같은 fixed-joint child는 부모 회전을 자동 상속 → 부착 방향 항상 정확
 *
 * 이 파일은 spec → 트리 변환만 담당. 렌더링은 RobotRenderer.tsx.
 */

import type {
  ManipulatorArmSpec,
  VacuumBaseSpec,
  EndEffectorSpec,
  EndEffectorType,
  ArmMountPosition,
} from '../types/product';

const CM_TO_M = 0.01;
const DEG_TO_RAD = Math.PI / 180;

// ─── Joint types ────────────────────────────────────────────────────────────

export type JointType = 'fixed' | 'revolute' | 'prismatic';

/** Joint connecting parent link to this link.
 *  - originXyz/originRpy: parent frame의 어디에서 child frame이 시작되는지
 *  - axis: revolute의 경우 회전 축, prismatic의 경우 이동 축 (모두 child frame 기준)
 *  - jointStateKey: 이 joint의 상태값(각도/위치)을 jointState map에서 찾는 키
 *    fixed인 경우 undefined (상태값 없음)
 */
export interface JointSpec {
  type: JointType;
  originXyz: [number, number, number];
  originRpy: [number, number, number];
  axis?: [number, number, number];
  limits?: { lower: number; upper: number };
  jointStateKey?: string;
}

// ─── Visual specs ──────────────────────────────────────────────────────────
// 각 link의 visual은 procedural (spec 파라미터로 메시 생성).
// URDF의 mesh asset 대신 우리 spec 기반 절차적 형상.

export type VisualKind =
  | 'vacuumBase'      // 베이스 디스크/사각
  | 'liftColumn'      // 텔레스코핑 칼럼
  | 'pedestal'        // 팔 마운트 작은 디스크
  | 'jointSphere'     // revolute joint visual
  | 'linkCylinder'    // upper arm / forearm 원통
  | 'wristJoint'      // 손목 visual
  | 'endEffector';    // 그리퍼 (type별 분기)

export interface VisualSpec {
  kind: VisualKind;
  /** 자유로운 파라미터 (length, radius 등). VisualKind마다 의미 다름. */
  params: Record<string, number | string>;
  color?: string;
}

// ─── Link spec ─────────────────────────────────────────────────────────────

export interface LinkSpec {
  name: string;
  parent: string | null; // null = root
  joint: JointSpec;
  visual?: VisualSpec;
  /** 충돌 검사용 박스 (Day 3에서 사용). */
  collisionAabbHalf?: [number, number, number];
}

// ─── Joint state ───────────────────────────────────────────────────────────
// jointState[key] = revolute의 경우 각도(라디안), prismatic의 경우 이동량(미터)

export type JointState = Record<string, number>;

// ─── Tree builder: ProductConfig → LinkSpec[] ─────────────────────────────

interface BuildOptions {
  base: VacuumBaseSpec;
  arms: ManipulatorArmSpec[];
  /** end-effector 카탈로그 (sku로 lookup). 없으면 fallback gripper. */
  endEffectors?: EndEffectorSpec[];
  /** arm color override per index. */
  armColors?: string[];
}

const DEFAULT_ARM_COLORS = ['#E63950', '#3a8dde'];

/**
 * Mount 위치 → 베이스 윗면에서의 (x, z) offset.
 * 기존 ManipulatorArm.tsx와 동일 규약.
 */
function computeMountOffset(arm: ManipulatorArmSpec, base: VacuumBaseSpec): { x: number; z: number } {
  const radiusM = (base.diameterOrWidthCm / 2) * CM_TO_M;
  const offset = radiusM * 0.45;
  switch (arm.mountPosition) {
    case 'center': return { x: 0, z: 0 };
    case 'front':  return { x: 0, z: offset };
    case 'left':   return { x: -offset, z: 0 };
    case 'right':  return { x: offset, z: 0 };
  }
}

/**
 * Mount 위치별 shoulder pitch 회전 축.
 * - center / front: X축 (pitch가 +Y를 +Z 방향으로 기울임 = 앞으로 뻗음)
 * - left:  Z축 정방향 (+Y가 -X 방향으로 = 왼쪽 바깥으로 뻗음)
 * - right: Z축 역방향 (+Y가 +X 방향으로 = 오른쪽 바깥으로 뻗음)
 */
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

export function buildRobotTree(opts: BuildOptions): LinkSpec[] {
  const { base, arms, endEffectors = [], armColors = DEFAULT_ARM_COLORS } = opts;
  const links: LinkSpec[] = [];

  const baseHeightM = base.heightCm * CM_TO_M;
  const baseRadiusM = (base.diameterOrWidthCm / 2) * CM_TO_M;
  const liftMaxM = base.hasLiftColumn ? base.liftColumnMaxExtensionCm * CM_TO_M : 0;

  // ─── base_link (root) ────────────────────────────────────────────────────
  links.push({
    name: 'base_link',
    parent: null,
    joint: { type: 'fixed', originXyz: [0, 0, 0], originRpy: [0, 0, 0] },
    visual: {
      kind: 'vacuumBase',
      params: {
        shape: base.shape,
        diameterM: base.diameterOrWidthCm * CM_TO_M,
        heightM: baseHeightM,
      },
    },
    collisionAabbHalf: [baseRadiusM, baseHeightM / 2, baseRadiusM],
  });

  // ─── lift column (optional) ─────────────────────────────────────────────
  // 베이스 윗면에서 위로 뻗는 prismatic joint
  if (base.hasLiftColumn) {
    links.push({
      name: 'lift_column',
      parent: 'base_link',
      joint: {
        type: 'prismatic',
        axis: [0, 1, 0],
        originXyz: [0, baseHeightM, 0],
        originRpy: [0, 0, 0],
        limits: { lower: 0, upper: liftMaxM },
        jointStateKey: 'lift_column',
      },
      visual: {
        kind: 'liftColumn',
        params: { maxExtensionM: liftMaxM, baseRadiusM: baseRadiusM * 0.35 },
      },
    });
  }

  // ─── 각 팔: pedestal → shoulder → upper_arm → elbow → forearm → wrist → end_effector ──
  for (let i = 0; i < arms.length; i++) {
    const arm = arms[i];
    const armPrefix = `arm${i}_`;
    const armParent = base.hasLiftColumn ? 'lift_column' : 'base_link';
    const armColor = armColors[i] ?? armColors[0];

    const mount = computeMountOffset(arm, base);
    const shoulderUpM = arm.shoulderHeightAboveBaseCm * CM_TO_M;
    // 베이스 윗면에서 pedestal까지의 Y offset
    const pedestalY = base.hasLiftColumn ? 0 : baseHeightM;

    const L1 = arm.upperArmLengthCm * CM_TO_M;
    const L2 = arm.forearmLengthCm * CM_TO_M;

    const ee = endEffectors.find((e) => e.sku === arm.endEffectorSku);
    const eeType: EndEffectorType = ee?.type ?? 'simple_gripper';
    // tipScale은 기존 ManipulatorArm 규약 유지 (페이로드 비례)
    const tipScale = ee ? Math.min(0.05, 0.025 + ee.maxPayloadKg * 0.012) : 0.032;

    // pedestal — 팔 마운트 (fixed)
    links.push({
      name: armPrefix + 'pedestal',
      parent: armParent,
      joint: {
        type: 'fixed',
        originXyz: [mount.x, pedestalY, mount.z],
        originRpy: [0, 0, 0],
      },
      visual: { kind: 'pedestal', params: { radiusM: 0.045, heightM: 0.012 } },
    });

    // shoulder — revolute joint (pitch). pedestal 위에 위치, jointStateKey로 각도 제어.
    links.push({
      name: armPrefix + 'shoulder',
      parent: armPrefix + 'pedestal',
      joint: {
        type: 'revolute',
        axis: shoulderPitchAxis(arm.mountPosition),
        originXyz: [0, shoulderUpM + 0.012 /* pedestal height */, 0],
        originRpy: [0, 0, 0],
        limits: { lower: -10 * DEG_TO_RAD, upper: 110 * DEG_TO_RAD },
        jointStateKey: armPrefix + 'shoulderPitch',
      },
      visual: {
        kind: 'jointSphere',
        params: { radiusM: 0.032 },
        color: armColor,
      },
    });

    // upper_arm — fixed link, +Y 방향으로 L1 만큼 extend
    // 부모(shoulder)의 회전이 그대로 적용 → upper arm이 shoulder pitch에 따라 기움
    links.push({
      name: armPrefix + 'upper_arm',
      parent: armPrefix + 'shoulder',
      joint: { type: 'fixed', originXyz: [0, 0, 0], originRpy: [0, 0, 0] },
      visual: {
        kind: 'linkCylinder',
        params: { radiusM: 0.024, lengthM: L1 },
        color: armColor,
      },
    });

    // elbow — revolute joint, upper_arm 끝에 위치 (+Y로 L1 떨어진 곳)
    links.push({
      name: armPrefix + 'elbow',
      parent: armPrefix + 'upper_arm',
      joint: {
        type: 'revolute',
        axis: shoulderPitchAxis(arm.mountPosition), // 같은 축 (어깨와 평행)
        originXyz: [0, L1, 0],
        originRpy: [0, 0, 0],
        limits: { lower: 0, upper: 180 * DEG_TO_RAD },
        jointStateKey: armPrefix + 'elbowPitch',
      },
      visual: {
        kind: 'jointSphere',
        params: { radiusM: 0.027 },
        color: armColor,
      },
    });

    // forearm — fixed link, +Y 방향으로 L2 만큼 extend
    links.push({
      name: armPrefix + 'forearm',
      parent: armPrefix + 'elbow',
      joint: { type: 'fixed', originXyz: [0, 0, 0], originRpy: [0, 0, 0] },
      visual: {
        kind: 'linkCylinder',
        params: { radiusM: 0.020, lengthM: L2 },
        color: armColor,
      },
    });

    // wrist — fixed (Day 1은 wrist DOF 0으로 시작, Day 2에서 wristDof 갯수만큼 revolute joint 추가)
    links.push({
      name: armPrefix + 'wrist',
      parent: armPrefix + 'forearm',
      joint: { type: 'fixed', originXyz: [0, L2, 0], originRpy: [0, 0, 0] },
      visual: { kind: 'wristJoint', params: { radiusM: 0.022 } },
    });

    // end_effector — fixed-joint child of wrist.
    // 부모(wrist) frame이 forearm 끝의 +Y 방향을 가리킴 → 그리퍼는 항상 forearm 연장선으로 부착됨.
    // 이게 URDF 스타일의 핵심: 자세와 무관하게 그리퍼 부착 방향이 일정.
    links.push({
      name: armPrefix + 'end_effector',
      parent: armPrefix + 'wrist',
      joint: { type: 'fixed', originXyz: [0, 0, 0], originRpy: [0, 0, 0] },
      visual: {
        kind: 'endEffector',
        params: {
          eeType: eeType,
          tipScale: tipScale,
          wristDof: arm.wristDof,
        },
        color: armColor,
      },
    });
  }

  return links;
}

// ─── Default joint state (rest pose) ────────────────────────────────────────

export function defaultJointState(tree: LinkSpec[]): JointState {
  const state: JointState = {};
  for (const link of tree) {
    if (link.joint.jointStateKey) {
      state[link.joint.jointStateKey] = 0;
    }
  }
  return state;
}

/**
 * Apply armPose (DesignerVacuumStore의 시각 제어) → joint state.
 * 향후 IK가 제어할 때는 이 함수 대신 IK 결과를 직접 jointState에 씀.
 */
export function armPoseToJointState(
  tree: LinkSpec[],
  armPose: { shoulderPitchDeg: number; elbowDeg: number },
): JointState {
  const state = defaultJointState(tree);
  const shoulderRad = armPose.shoulderPitchDeg * DEG_TO_RAD;
  // 기존 코드 규약: elbowDeg=180 = 곧게 펴짐, 110 = 접힘
  // URDF revolute joint state: 0 = 곧게 펴짐(부모 +Y와 정렬), +값 = 접힘
  // 변환: jointState = π - elbowRad
  const elbowRad = armPose.elbowDeg * DEG_TO_RAD;
  const elbowJointVal = Math.PI - elbowRad;
  for (const link of tree) {
    const key = link.joint.jointStateKey;
    if (!key) continue;
    if (key.endsWith('shoulderPitch')) state[key] = shoulderRad;
    else if (key.endsWith('elbowPitch')) state[key] = elbowJointVal;
  }
  return state;
}
