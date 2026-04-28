/**
 * Form-factor mock data · Phase 1 PoC
 *
 * ⚠️ Spec §10 guardrail: every entry MUST have isMock:true.
 * NO real LG part numbers, NO real CLOiD specs.
 *
 * Skeleton structure: simplified primitive shapes (box/cylinder/sphere) with
 * meter-scale dimensions. Coordinate convention: +Y is up, +X is right,
 * +Z is forward (toward viewer).
 */

import type { FormFactorSummary, SkeletonNode } from '../types.js';

// ─── helpers ──────────────────────────────────────────────────────────────

const cylinder = (
  id: string,
  radius: number,
  height: number,
  position: [number, number, number],
  rotation?: [number, number, number],
  label?: string
): SkeletonNode => ({
  id,
  shape: 'cylinder',
  size: [radius, height, 0],
  position,
  rotation,
  label,
});

const box = (
  id: string,
  size: [number, number, number],
  position: [number, number, number],
  rotation?: [number, number, number],
  label?: string
): SkeletonNode => ({
  id,
  shape: 'box',
  size,
  position,
  rotation,
  label,
});

const sphere = (
  id: string,
  radius: number,
  position: [number, number, number],
  label?: string
): SkeletonNode => ({
  id,
  shape: 'sphere',
  size: [radius, 0, 0],
  position,
  label,
});

// ─── biped (humanoid, ~1.65 m, 28 DoF) ────────────────────────────────────

const bipedSkeleton: SkeletonNode[] = [
  // torso
  box('pelvis', [0.32, 0.16, 0.22], [0, 0.92, 0], undefined, 'Pelvis'),
  box('torso', [0.36, 0.42, 0.24], [0, 1.22, 0], undefined, 'Torso'),
  sphere('neck', 0.06, [0, 1.48, 0], 'Neck'),
  sphere('head', 0.13, [0, 1.62, 0], 'Head'),

  // arms (R)
  sphere('shoulder_R', 0.07, [-0.22, 1.42, 0], 'Shoulder R'),
  cylinder('upper_arm_R', 0.045, 0.28, [-0.22, 1.26, 0], undefined, 'Upper arm R'),
  sphere('elbow_R', 0.05, [-0.22, 1.1, 0], 'Elbow R'),
  cylinder('forearm_R', 0.04, 0.26, [-0.22, 0.96, 0], undefined, 'Forearm R'),
  box('hand_R', [0.07, 0.14, 0.04], [-0.22, 0.78, 0], undefined, 'Hand R'),

  // arms (L)
  sphere('shoulder_L', 0.07, [0.22, 1.42, 0], 'Shoulder L'),
  cylinder('upper_arm_L', 0.045, 0.28, [0.22, 1.26, 0], undefined, 'Upper arm L'),
  sphere('elbow_L', 0.05, [0.22, 1.1, 0], 'Elbow L'),
  cylinder('forearm_L', 0.04, 0.26, [0.22, 0.96, 0], undefined, 'Forearm L'),
  box('hand_L', [0.07, 0.14, 0.04], [0.22, 0.78, 0], undefined, 'Hand L'),

  // legs (R)
  sphere('hip_R', 0.07, [-0.1, 0.84, 0], 'Hip R'),
  cylinder('thigh_R', 0.055, 0.42, [-0.1, 0.6, 0], undefined, 'Thigh R'),
  sphere('knee_R', 0.06, [-0.1, 0.38, 0], 'Knee R'),
  cylinder('shin_R', 0.05, 0.4, [-0.1, 0.18, 0], undefined, 'Shin R'),
  box('foot_R', [0.1, 0.04, 0.22], [-0.1, 0.0, 0.04], undefined, 'Foot R'),

  // legs (L)
  sphere('hip_L', 0.07, [0.1, 0.84, 0], 'Hip L'),
  cylinder('thigh_L', 0.055, 0.42, [0.1, 0.6, 0], undefined, 'Thigh L'),
  sphere('knee_L', 0.06, [0.1, 0.38, 0], 'Knee L'),
  cylinder('shin_L', 0.05, 0.4, [0.1, 0.18, 0], undefined, 'Shin L'),
  box('foot_L', [0.1, 0.04, 0.22], [0.1, 0.0, 0.04], undefined, 'Foot L'),
];

// ─── quadruped (4 leg × 3 joint = 12 DoF, ~0.6 m height) ──────────────────

const quadrupedSkeleton: SkeletonNode[] = [
  box('body', [0.6, 0.18, 0.32], [0, 0.46, 0], undefined, 'Body'),
  sphere('head', 0.08, [0, 0.52, 0.22], 'Head'),

  // 4 legs at corners — front-left, front-right, back-left, back-right
  ...['FL', 'FR', 'BL', 'BR'].flatMap((corner): SkeletonNode[] => {
    const x = corner[1] === 'L' ? 0.22 : -0.22;
    const z = corner[0] === 'F' ? 0.18 : -0.18;
    return [
      sphere(`hip_${corner}`, 0.05, [x, 0.4, z], `Hip ${corner}`),
      cylinder(`upper_leg_${corner}`, 0.035, 0.22, [x, 0.27, z], undefined, `Upper leg ${corner}`),
      sphere(`knee_${corner}`, 0.04, [x, 0.16, z], `Knee ${corner}`),
      cylinder(`lower_leg_${corner}`, 0.03, 0.18, [x, 0.07, z], undefined, `Lower leg ${corner}`),
      box(`foot_${corner}`, [0.06, 0.02, 0.06], [x, 0.0, z], undefined, `Foot ${corner}`),
    ];
  }),
];

// ─── wheeled (differential-drive base, 2 wheels) ──────────────────────────

const wheeledSkeleton: SkeletonNode[] = [
  cylinder('base', 0.28, 0.16, [0, 0.18, 0], undefined, 'Base'),
  box('column', [0.16, 0.6, 0.16], [0, 0.56, 0], undefined, 'Column'),
  box('panel', [0.32, 0.22, 0.04], [0, 0.92, 0.08], undefined, 'Display panel'),
  // wheels — Three.js cylinder default axis is Y; rotate Z by π/2 to make wheels roll on XZ plane
  cylinder('wheel_L', 0.1, 0.04, [0.3, 0.1, 0], [0, 0, Math.PI / 2], 'Wheel L'),
  cylinder('wheel_R', 0.1, 0.04, [-0.3, 0.1, 0], [0, 0, Math.PI / 2], 'Wheel R'),
  sphere('caster_F', 0.04, [0, 0.04, 0.22], 'Caster F'),
  sphere('caster_B', 0.04, [0, 0.04, -0.22], 'Caster B'),
];

// ─── cobot_arm (6-DoF arm, ~0.7 m reach) ──────────────────────────────────

const cobotArmSkeleton: SkeletonNode[] = [
  cylinder('base', 0.09, 0.12, [0, 0.06, 0], undefined, 'Base'),
  cylinder('shoulder', 0.07, 0.14, [0, 0.2, 0], undefined, 'J1 Shoulder'),
  cylinder('upper_link', 0.055, 0.32, [0, 0.4, 0], undefined, 'L2'),
  cylinder('elbow', 0.06, 0.1, [0, 0.6, 0], undefined, 'J3 Elbow'),
  cylinder('forearm', 0.045, 0.28, [0, 0.78, 0], undefined, 'L4'),
  cylinder('wrist1', 0.04, 0.06, [0, 0.96, 0], undefined, 'J5'),
  cylinder('wrist2', 0.035, 0.06, [0, 1.04, 0], undefined, 'J6'),
  box('flange', [0.06, 0.02, 0.06], [0, 1.09, 0], undefined, 'Tool flange'),
];

// ─── mobile_manipulator (wheeled base + cobot arm on top) ─────────────────

const mobileManipulatorSkeleton: SkeletonNode[] = [
  // wheeled base
  cylinder('base', 0.32, 0.18, [0, 0.18, 0], undefined, 'Base'),
  cylinder('wheel_L', 0.11, 0.05, [0.34, 0.11, 0], [0, 0, Math.PI / 2], 'Wheel L'),
  cylinder('wheel_R', 0.11, 0.05, [-0.34, 0.11, 0], [0, 0, Math.PI / 2], 'Wheel R'),
  sphere('caster_F', 0.04, [0, 0.04, 0.26], 'Caster F'),
  sphere('caster_B', 0.04, [0, 0.04, -0.26], 'Caster B'),
  // arm column (mounted on top of base)
  cylinder('arm_base', 0.09, 0.12, [0, 0.34, 0], undefined, 'Arm base'),
  cylinder('shoulder', 0.07, 0.14, [0, 0.48, 0], undefined, 'J1'),
  cylinder('upper_link', 0.055, 0.3, [0, 0.66, 0], undefined, 'L2'),
  cylinder('elbow', 0.06, 0.1, [0, 0.85, 0], undefined, 'J3'),
  cylinder('forearm', 0.045, 0.26, [0, 1.02, 0], undefined, 'L4'),
  cylinder('wrist', 0.04, 0.08, [0, 1.18, 0], undefined, 'J5/J6'),
  box('flange', [0.06, 0.02, 0.06], [0, 1.24, 0], undefined, 'Tool flange'),
];

// ─── exported catalog ─────────────────────────────────────────────────────

export const FORM_FACTORS: readonly FormFactorSummary[] = Object.freeze([
  {
    id: 'biped',
    name: 'Bipedal Humanoid',
    nameKo: '이족 휴머노이드',
    description: '두 다리·두 팔·머리. CLOiD-Demo / Atlas-Mock / Optimus-Mock 프리셋의 베이스.',
    heightM: 1.65,
    totalDof: 28,
    defaultPayloadKg: 5,
    isMock: true,
    skeleton: bipedSkeleton,
  },
  {
    id: 'quadruped',
    name: 'Quadruped',
    nameKo: '사족 보행',
    description: '4족 × 3관절(고관절·무릎·발목 등가). 안정성·페이로드 전략 검토용.',
    heightM: 0.6,
    totalDof: 12,
    defaultPayloadKg: 10,
    isMock: true,
    skeleton: quadrupedSkeleton,
  },
  {
    id: 'wheeled',
    name: 'Wheeled Base',
    nameKo: '바퀴형 모바일 베이스',
    description: '차동 구동 베이스 + 디스플레이 컬럼. 서비스·안내 로봇 컨셉.',
    heightM: 1.05,
    totalDof: 0,
    defaultPayloadKg: 15,
    isMock: true,
    skeleton: wheeledSkeleton,
  },
  {
    id: 'cobot_arm',
    name: 'Collaborative Arm',
    nameKo: '협동 매니퓰레이터',
    description: '6-DoF 산업/협동 팔. 단일 워크셀에서의 픽앤플레이스 컨셉 검토.',
    heightM: 1.1,
    totalDof: 6,
    defaultPayloadKg: 5,
    isMock: true,
    skeleton: cobotArmSkeleton,
  },
  {
    id: 'mobile_manipulator',
    name: 'Mobile Manipulator',
    nameKo: '이동형 매니퓰레이터',
    description: '바퀴형 베이스 위에 6-DoF 팔. 매장·창고 운반 시나리오.',
    heightM: 1.3,
    totalDof: 6,
    defaultPayloadKg: 8,
    isMock: true,
    skeleton: mobileManipulatorSkeleton,
  },
]);
