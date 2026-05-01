/**
 * Room preset catalog · v1.2 vacuum-arm mock data (spec §7.6)
 * 3 presets: living_room, kitchen, bedroom.
 */

import type { RoomPresetSpec } from '../types.js';

export const ROOM_PRESETS: readonly RoomPresetSpec[] = Object.freeze([
  {
    id: 'living_room',
    name: '거실',
    widthCm: 500,
    depthCm: 400,
    description: '소파 + 식탁 + 의자 + 러그',
    furniture: [
      // sofa against the back wall
      { furnitureId: 1, xCm: 250, yCm: 60, rotationDeg: 0 },
      // dining table center-left
      { furnitureId: 3, xCm: 150, yCm: 250, rotationDeg: 0 },
      // chair next to dining table
      { furnitureId: 7, xCm: 220, yCm: 250, rotationDeg: 0 },
    ],
    obstacles: [
      // rug in front of sofa
      { obstacleId: 101, xCm: 250, yCm: 200, rotationDeg: 0 },
    ],
    targets: [],
    isMock: true,
  },
  {
    id: 'kitchen',
    name: '주방',
    widthCm: 400,
    depthCm: 300,
    description: '싱크대 + 식탁 + 의자 4개 + 문턱',
    furniture: [
      // sink along back wall
      { furnitureId: 5, xCm: 200, yCm: 30, rotationDeg: 0 },
      // dining table center
      { furnitureId: 4, xCm: 200, yCm: 200, rotationDeg: 0 },
      // 4 chairs around table
      { furnitureId: 7, xCm: 110, yCm: 200, rotationDeg: 90 },
      { furnitureId: 7, xCm: 290, yCm: 200, rotationDeg: 270 },
      { furnitureId: 7, xCm: 200, yCm: 130, rotationDeg: 180 },
      { furnitureId: 7, xCm: 200, yCm: 270, rotationDeg: 0 },
    ],
    obstacles: [
      { obstacleId: 102, xCm: 200, yCm: 290, rotationDeg: 0 }, // threshold near door
    ],
    targets: [],
    isMock: true,
  },
  {
    id: 'bedroom',
    name: '침실',
    widthCm: 400,
    depthCm: 350,
    description: '책상 + 의자 + 러그',
    furniture: [
      { furnitureId: 6, xCm: 200, yCm: 50, rotationDeg: 0 },
      { furnitureId: 8, xCm: 200, yCm: 110, rotationDeg: 0 },
    ],
    obstacles: [{ obstacleId: 101, xCm: 200, yCm: 250, rotationDeg: 0 }],
    targets: [],
    isMock: true,
  },
]);
