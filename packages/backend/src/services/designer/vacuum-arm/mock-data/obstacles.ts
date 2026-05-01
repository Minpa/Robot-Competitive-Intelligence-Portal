/**
 * Obstacle catalog · v1.2 vacuum-arm mock data (spec §7.4)
 * 4 types covering the realistic obstacle envelope. All isMock=true.
 */

import type { ObstacleSpec } from '../types.js';

export const OBSTACLES: readonly ObstacleSpec[] = Object.freeze([
  { id: 101, type: 'rug', name: '두꺼운 러그', heightCm: 1.5, widthCm: 200, isMock: true },
  { id: 102, type: 'threshold', name: '현관 문턱', heightCm: 2.0, widthCm: 5, isMock: true },
  { id: 103, type: 'cable', name: '전선', heightCm: 0.5, widthCm: 2, isMock: true },
  { id: 104, type: 'toy', name: '장난감', heightCm: 12, widthCm: 15, isMock: true },
]);
