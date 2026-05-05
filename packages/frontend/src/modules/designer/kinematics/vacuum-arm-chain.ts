/**
 * Vacuum + arm form factor → generic kinematic chain 변환.
 *
 * vacuum-arm spec (ProductConfig: base + arms[])을 generic Chain + ChainState로
 * 변환. 구조:
 *
 *   base (root)
 *    └── pedestal (mount offset)        — fixed joint
 *         └── shoulderPivot              — revolute (pitch axis, mount-dependent)
 *              └── upperArm              — fixed (after rotation)
 *                   └── elbowPivot       — revolute (same pitch axis as shoulder)
 *                        └── forearm     — fixed
 *                             └── wrist  — fixed (or revolute if wristDof active)
 *                                  └── ee — fixed (gripper geometry)
 *
 * 팔이 1~2개면 base에 child joint가 1~2개 (pedestal × N).
 *
 * shoulder/elbow의 pitch axis는 mount에 따라 다름:
 *   center/front: X 축 (pitch around horizontal X = arm rotates in YZ plane)
 *   left:         Z 축
 *   right:        -Z 축
 */

import type {
  ProductConfig,
  VacuumBaseSpec,
  ManipulatorArmSpec,
  ArmMountPosition,
  ActuatorSpec,
  EndEffectorSpec,
} from '../vacuum-arm/types/product';
import { MOUNT_OFFSET_RATIO } from '../vacuum-arm/types/product';
import type { KinematicChain, ChainState, Joint, Link } from './chain';

const CM_TO_M = 0.01;
const DEG_TO_RAD = Math.PI / 180;

interface BuildChainInput {
  product: ProductConfig;
  /** spec catalog — actuator/EE 무게 lookup */
  actuators?: ActuatorSpec[];
  endEffectors?: EndEffectorSpec[];
}

/** Vacuum + arm spec → generic chain. arm.length가 1~2개일 때 모두 처리. */
export function buildVacuumArmChain(input: BuildChainInput): KinematicChain {
  const { product, actuators = [], endEffectors = [] } = input;
  const links: Record<string, Link> = {};
  const joints: Record<string, Joint> = {};

  // root: base
  const baseHM = product.base.heightCm * CM_TO_M;
  const baseDM = product.base.diameterOrWidthCm * CM_TO_M;
  links['base'] = {
    id: 'base',
    parentJointId: null,
    geometry: { lengthM: baseHM, widthM: baseDM, thicknessM: baseDM },
    massKg: product.base.weightKg,
    childJointIds: [],
    label: '베이스',
  };

  // 각 팔에 대해 chain extension
  product.arms.forEach((arm, armIdx) => {
    addArmToChain(armIdx, arm, product.base, links, joints, actuators, endEffectors);
  });

  return { rootLinkId: 'base', links, joints };
}

function addArmToChain(
  armIdx: number,
  arm: ManipulatorArmSpec,
  base: VacuumBaseSpec,
  links: Record<string, Link>,
  joints: Record<string, Joint>,
  actuators: ActuatorSpec[],
  endEffectors: EndEffectorSpec[],
): void {
  const baseRadiusM = (base.diameterOrWidthCm / 2) * CM_TO_M;
  const mountOffsetM = baseRadiusM * MOUNT_OFFSET_RATIO;
  const baseHeightM = base.heightCm * CM_TO_M;
  // Note: lift column은 현재 grasp-engine FK에서 미사용 — 기존 동작 보존을 위해 동일 처리.
  // 향후 lift column dynamic을 모델링하면 여기에 lift 추가.
  const shoulderHM = arm.shoulderHeightAboveBaseCm * CM_TO_M;

  // mount offset in robot local frame (base center is origin, base top is +Y baseHeightM)
  const mountX = arm.mountPosition === 'left' ? -mountOffsetM
    : arm.mountPosition === 'right' ? mountOffsetM : 0;
  const mountZ = arm.mountPosition === 'front' ? mountOffsetM : 0;

  const pedestalLinkId = `arm${armIdx}_pedestal`;
  const upperArmLinkId = `arm${armIdx}_upperArm`;
  const forearmLinkId = `arm${armIdx}_forearm`;
  const eeLinkId = `arm${armIdx}_ee`;

  // base → pedestal: fixed joint at mount offset (+ base top + lift + shoulder height)
  // pedestal link 자체는 매우 짧음 (어깨 회전 pivot용 link). 길이는 0에 가까움.
  const baseToPedestalJointId = `arm${armIdx}_baseToPedestal`;
  joints[baseToPedestalJointId] = {
    id: baseToPedestalJointId,
    type: 'fixed',
    childLinkId: pedestalLinkId,
    origin: {
      translation: [mountX, baseHeightM + shoulderHM, mountZ],
    },
    axis: [0, 1, 0],
    limits: { min: 0, max: 0 },
  };
  links[pedestalLinkId] = {
    id: pedestalLinkId,
    parentJointId: baseToPedestalJointId,
    geometry: { lengthM: 0.001, widthM: 0.04, thicknessM: 0.04 }, // 0 length pivot
    massKg: 0.05,
    childJointIds: [],
    label: `팔${armIdx + 1} 페데스탈`,
  };
  links['base'].childJointIds.push(baseToPedestalJointId);

  // pedestal → upperArm: revolute joint (shoulder pitch). Axis depends on mount.
  const shoulderActuator = actuators.find((a) => a.sku === arm.shoulderActuatorSku);
  const shoulderJointId = `arm${armIdx}_shoulderPitch`;
  joints[shoulderJointId] = {
    id: shoulderJointId,
    type: 'revolute',
    childLinkId: upperArmLinkId,
    origin: { translation: [0, 0, 0] }, // joint at pedestal end (basically same as pedestal link origin)
    axis: shoulderPitchAxis(arm.mountPosition),
    limits: { min: -30 * DEG_TO_RAD, max: 180 * DEG_TO_RAD },
    actuatorSku: arm.shoulderActuatorSku,
  };
  links[pedestalLinkId].childJointIds.push(shoulderJointId);

  // upperArm link: +Y로 L1 만큼 뻗음
  const L1M = arm.upperArmLengthCm * CM_TO_M;
  links[upperArmLinkId] = {
    id: upperArmLinkId,
    parentJointId: shoulderJointId,
    geometry: { lengthM: L1M, widthM: 0.05, thicknessM: 0.05 },
    massKg: estimateLinkMass(L1M, shoulderActuator),
    childJointIds: [],
    label: `팔${armIdx + 1} 상완 (L1)`,
  };

  // upperArm → forearm: revolute joint (elbow). Same axis as shoulder pitch.
  const elbowActuator = actuators.find((a) => a.sku === arm.elbowActuatorSku);
  const elbowJointId = `arm${armIdx}_elbowPitch`;
  joints[elbowJointId] = {
    id: elbowJointId,
    type: 'revolute',
    childLinkId: forearmLinkId,
    // joint origin at upperArm distal end (+Y by L1)
    origin: { translation: [0, L1M, 0] },
    axis: shoulderPitchAxis(arm.mountPosition), // 동일 축 — planar 2-link
    limits: { min: 0, max: 270 * DEG_TO_RAD },
    actuatorSku: arm.elbowActuatorSku,
  };
  links[upperArmLinkId].childJointIds.push(elbowJointId);

  // forearm link: +Y로 L2 만큼 뻗음
  const L2M = arm.forearmLengthCm * CM_TO_M;
  links[forearmLinkId] = {
    id: forearmLinkId,
    parentJointId: elbowJointId,
    geometry: { lengthM: L2M, widthM: 0.045, thicknessM: 0.045 },
    massKg: estimateLinkMass(L2M, elbowActuator),
    childJointIds: [],
    label: `팔${armIdx + 1} 전완 (L2)`,
  };

  // forearm → ee: fixed (no wrist DOF for now — wristDof는 향후 revolute로)
  const ee = endEffectors.find((e) => e.sku === arm.endEffectorSku);
  const eeMassKg = ee ? ee.weightG / 1000 : 0.05;
  const forearmToEEJointId = `arm${armIdx}_wrist`;
  joints[forearmToEEJointId] = {
    id: forearmToEEJointId,
    type: 'fixed',
    childLinkId: eeLinkId,
    origin: { translation: [0, L2M, 0] }, // forearm distal end
    axis: [0, 1, 0],
    limits: { min: 0, max: 0 },
  };
  links[forearmLinkId].childJointIds.push(forearmToEEJointId);

  links[eeLinkId] = {
    id: eeLinkId,
    parentJointId: forearmToEEJointId,
    geometry: { lengthM: 0.06, widthM: 0.04, thicknessM: 0.04 }, // gripper rough size
    massKg: eeMassKg,
    childJointIds: [],
    label: `팔${armIdx + 1} 엔드이펙터`,
  };
}

/** Mount 위치에 따른 어깨 pitch 축 — 기존 grasp-engine과 동일. */
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

/** Link mass 단순 추정 — actuator 무게 + alu link 비례. */
function estimateLinkMass(lengthM: number, actuator: ActuatorSpec | undefined): number {
  const actuatorKg = actuator ? actuator.weightG / 1000 : 0.2;
  // 5mm wall aluminum tube approx 1.2 kg/m
  const linkKg = lengthM * 1.2;
  return actuatorKg + linkKg;
}

/* ─── Chain state from spec + pose ─────────────────────────────────────── */

interface BuildStateInput {
  product: ProductConfig;
  armPose: { shoulderPitchDeg: number; elbowDeg: number };
  /** robot world position + yaw */
  robotXM: number;
  robotZM: number;
  robotYawRad: number;
}

/**
 * 현재 spec + pose를 ChainState로 변환.
 * 모든 팔의 shoulder/elbow joint 값을 동일 armPose로 채움 (현재 single armPose 모델).
 * 추후 팔별 독립 pose가 필요하면 ChainState 확장.
 */
export function buildVacuumArmState(input: BuildStateInput): ChainState {
  const { product, armPose, robotXM, robotZM, robotYawRad } = input;
  const jointValues: Record<string, number> = {};

  product.arms.forEach((arm, armIdx) => {
    // FK 기존 코드 convention: shoulderPitchDeg 그대로 회전, elbowJoint = elbowRad - π
    jointValues[`arm${armIdx}_shoulderPitch`] = armPose.shoulderPitchDeg * DEG_TO_RAD;
    jointValues[`arm${armIdx}_elbowPitch`] = armPose.elbowDeg * DEG_TO_RAD - Math.PI;
    void arm; // suppress unused
  });

  return {
    jointValues,
    rootPose: {
      translation: [robotXM, 0, robotZM],
      yawRad: robotYawRad,
    },
  };
}
