/**
 * Furniture catalog · v1.2 vacuum-arm mock data (spec §7.3)
 * 5 base types × 1~2 size variants. All isMock=true.
 */

import type { FurnitureSpec } from '../types.js';

export const FURNITURE: readonly FurnitureSpec[] = Object.freeze([
  // sofa
  { id: 1, type: 'sofa', name: '3인용 소파', widthCm: 220, depthCm: 90, surfaceHeightCm: 45, weightKg: 60, isMock: true },
  { id: 2, type: 'sofa', name: '2인용 소파', widthCm: 160, depthCm: 88, surfaceHeightCm: 45, weightKg: 45, isMock: true },
  // dining table
  { id: 3, type: 'dining_table', name: '4인 식탁', widthCm: 140, depthCm: 80, surfaceHeightCm: 75, weightKg: 28, isMock: true },
  { id: 4, type: 'dining_table', name: '6인 식탁', widthCm: 180, depthCm: 90, surfaceHeightCm: 75, weightKg: 38, isMock: true },
  // sink counter
  { id: 5, type: 'sink_counter', name: '주방 카운터', widthCm: 240, depthCm: 60, surfaceHeightCm: 90, weightKg: 0, isMock: true },
  // desk
  { id: 6, type: 'desk', name: '책상', widthCm: 140, depthCm: 70, surfaceHeightCm: 73, weightKg: 22, isMock: true },
  // chair
  { id: 7, type: 'chair', name: '식탁 의자', widthCm: 45, depthCm: 50, surfaceHeightCm: 45, weightKg: 5, isMock: true },
  { id: 8, type: 'chair', name: '책상 의자', widthCm: 55, depthCm: 55, surfaceHeightCm: 45, weightKg: 9, isMock: true },
]);
