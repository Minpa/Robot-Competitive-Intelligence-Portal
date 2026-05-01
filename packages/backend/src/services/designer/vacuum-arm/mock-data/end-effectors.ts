/**
 * End-effector catalog · v1.2 vacuum-arm mock data (spec §7.2)
 * 4 entries — matches spec exactly. All vendors mock-only.
 */

import type { EndEffectorSpec } from '../types.js';

export const END_EFFECTORS: readonly EndEffectorSpec[] = Object.freeze([
  {
    sku: 'EE-MOCK-SIMPLE-GRIPPER',
    name: 'SimpleGripper-Mock',
    type: 'simple_gripper',
    weightG: 220,
    maxPayloadKg: 0.3,
    gripWidthMmMin: 5,
    gripWidthMmMax: 80,
    isMock: true,
  },
  {
    sku: 'EE-MOCK-SUCTION-CUP',
    name: 'SuctionCup-Mock',
    type: 'suction',
    weightG: 180,
    maxPayloadKg: 1.0,
    // suction has no jaw — gripWidth* omitted
    isMock: true,
  },
  {
    sku: 'EE-MOCK-2FINGER',
    name: 'TwoFinger-Mock',
    type: '2finger',
    weightG: 380,
    maxPayloadKg: 0.8,
    gripWidthMmMin: 0,
    gripWidthMmMax: 110,
    isMock: true,
  },
  {
    sku: 'EE-MOCK-3FINGER',
    name: 'ThreeFinger-Mock',
    type: '3finger',
    weightG: 620,
    maxPayloadKg: 1.5,
    gripWidthMmMin: 0,
    gripWidthMmMax: 130,
    isMock: true,
  },
]);
