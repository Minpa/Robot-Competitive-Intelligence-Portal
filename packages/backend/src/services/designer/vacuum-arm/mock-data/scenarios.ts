/**
 * Scenario presets · v1.2 vacuum-arm mock data (spec §7.7)
 * 5 scenarios: A bottom cleanup, B sofa retrieval, C dining table cup, D dual-arm
 *              dining cleanup, E sink dishwasher unload.
 *
 * Each scenario builds on a room preset and adds task-specific targets.
 */

import type { ScenarioSpec } from '../types.js';

export const SCENARIOS: readonly ScenarioSpec[] = Object.freeze([
  {
    id: 'A',
    name: 'A. 바닥 정리',
    description: '거실 바닥의 양말·장난감 자동차 회수',
    presetRoomId: 'living_room',
    furniture: [],
    obstacles: [
      { obstacleId: 104, xCm: 350, yCm: 150, rotationDeg: 0 }, // toy
      { obstacleId: 104, xCm: 380, yCm: 220, rotationDeg: 30 }, // another toy
    ],
    targets: [
      { targetObjectId: 206, onFurnitureIndex: null, xCm: 320, yCm: 180, zCm: 0 }, // sock
      { targetObjectId: 206, onFurnitureIndex: null, xCm: 360, yCm: 200, zCm: 0 }, // sock
      { targetObjectId: 208, onFurnitureIndex: null, xCm: 350, yCm: 150, zCm: 0 }, // toy car
    ],
    isMock: true,
  },
  {
    id: 'B',
    name: 'B. 소파 위 회수',
    description: '소파 좌석면 위의 리모컨·휴대폰 회수',
    presetRoomId: 'living_room',
    furniture: [],
    obstacles: [],
    targets: [
      { targetObjectId: 202, onFurnitureIndex: 0, xCm: 220, yCm: 60, zCm: 45 }, // remote on sofa
      { targetObjectId: 204, onFurnitureIndex: 0, xCm: 280, yCm: 60, zCm: 45 }, // phone on sofa
    ],
    isMock: true,
  },
  {
    id: 'C',
    name: 'C. 식탁 위 컵 회수',
    description: '식탁 윗면 컵 2개 회수 (75 cm 높이)',
    presetRoomId: 'living_room',
    furniture: [],
    obstacles: [],
    targets: [
      { targetObjectId: 201, onFurnitureIndex: 1, xCm: 130, yCm: 250, zCm: 75 }, // cup on dining table
      { targetObjectId: 201, onFurnitureIndex: 1, xCm: 170, yCm: 250, zCm: 75 },
    ],
    isMock: true,
  },
  {
    id: 'D',
    name: 'D. 식탁 정리 (양손)',
    description: '주방 식탁 위 접시 4개·컵 4개 회수 — 팔 2개 시나리오',
    presetRoomId: 'kitchen',
    furniture: [],
    obstacles: [],
    targets: [
      { targetObjectId: 203, onFurnitureIndex: 1, xCm: 160, yCm: 175, zCm: 75 },
      { targetObjectId: 203, onFurnitureIndex: 1, xCm: 240, yCm: 175, zCm: 75 },
      { targetObjectId: 203, onFurnitureIndex: 1, xCm: 160, yCm: 225, zCm: 75 },
      { targetObjectId: 203, onFurnitureIndex: 1, xCm: 240, yCm: 225, zCm: 75 },
      { targetObjectId: 201, onFurnitureIndex: 1, xCm: 180, yCm: 200, zCm: 75 },
      { targetObjectId: 201, onFurnitureIndex: 1, xCm: 220, yCm: 200, zCm: 75 },
      { targetObjectId: 201, onFurnitureIndex: 1, xCm: 195, yCm: 175, zCm: 75 },
      { targetObjectId: 201, onFurnitureIndex: 1, xCm: 205, yCm: 225, zCm: 75 },
    ],
    isMock: true,
  },
  {
    id: 'E',
    name: 'E. 싱크대 식기 정리',
    description: '싱크대 윗면 (90 cm) 접시 회수 — 리프트 컬럼/긴 팔 필수',
    presetRoomId: 'kitchen',
    furniture: [],
    obstacles: [],
    targets: [
      { targetObjectId: 203, onFurnitureIndex: 0, xCm: 150, yCm: 30, zCm: 90 },
      { targetObjectId: 203, onFurnitureIndex: 0, xCm: 250, yCm: 30, zCm: 90 },
    ],
    isMock: true,
  },
]);
