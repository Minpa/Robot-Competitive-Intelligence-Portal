/**
 * Target object catalog · v1.2 vacuum-arm mock data (spec §7.5)
 * 8 entries. All isMock=true.
 */

import type { TargetObjectSpec } from '../types.js';

export const TARGET_OBJECTS: readonly TargetObjectSpec[] = Object.freeze([
  { id: 201, name: '빈 컵', weightKg: 0.2, gripWidthMm: 70, isMock: true },
  { id: 202, name: '리모컨', weightKg: 0.15, gripWidthMm: 50, isMock: true },
  { id: 203, name: '빈 접시', weightKg: 0.4, gripWidthMm: 200, isMock: true },
  { id: 204, name: '휴대폰', weightKg: 0.2, gripWidthMm: 75, isMock: true },
  { id: 205, name: '책', weightKg: 0.5, gripWidthMm: 30, isMock: true },
  { id: 206, name: '양말', weightKg: 0.05, isMock: true },
  { id: 207, name: '페트병', weightKg: 0.5, gripWidthMm: 65, isMock: true },
  { id: 208, name: '장난감 자동차', weightKg: 0.3, gripWidthMm: 80, isMock: true },
]);
