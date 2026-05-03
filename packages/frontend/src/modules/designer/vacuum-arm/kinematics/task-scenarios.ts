/**
 * Task scenarios — 가사업무 시나리오 라이브러리.
 *
 * 각 시나리오는 product planning에서 "이 spec으로 이 가사업무가 가능?" 검증용.
 * 룸 프리셋 + 추가 타겟 + 로봇 시작 + 타임라인 + 성공조건을 묶음.
 *
 * 카탈로그 ID 참조:
 *   - Furniture: 1=3인 소파, 2=2인 소파, 3=4인 식탁, 5=주방 카운터, 6=책상, 7=식탁 의자
 *   - Targets: 201=빈 컵, 202=리모컨, 203=빈 접시, 204=휴대폰, 205=책, 206=양말,
 *              207=페트병, 208=장난감 자동차
 *   - Room presets: 'living_room', 'kitchen', 'bedroom'
 *
 * 좌표는 cm (방 좌상단 기준 +오른쪽/+아래).
 */

import type { TaskScenario } from '../types/product';

export const TASK_SCENARIOS: TaskScenario[] = [
  // ─── 시나리오 1: 거실 양말 줍기 ────────────────────────────────────────
  {
    id: 'scn_living_sock_to_washer',
    name: '거실 양말 → 세탁 위치',
    description:
      '거실 바닥에 떨어진 양말을 집어 세탁 위치(주방 코너)로 옮기는 시나리오. ' +
      '바닥 reach + 작은 물체 grasp + 중거리 navigation 검증.',
    category: '청소',
    basePresetId: 'living_room',
    extraTargets: [
      // 양말을 거실 중앙 (250, 200) 바닥에 추가 (zCm=0)
      { targetObjectId: 206, xCm: 250, yCm: 200, zCm: 0 },
    ],
    extraFurniture: [],
    robotStart: { xCm: 100, yCm: 100, yawDeg: 0 },
    durationSec: 14,
    waypoints: [
      { t: 0, xCm: 100, yCm: 100, yawDeg: 0 },
      // 양말 옆으로 접근
      { t: 4, xCm: 220, yCm: 200, yawDeg: 90 },
      // GRAB 후 세탁 위치로
      { t: 9, xCm: 80, yCm: 80, yawDeg: 270 },
    ],
    gestures: [
      // 양말 옆에 도착했을 때 GRAB (자동 reach + close)
      { t: 4, durationSec: 2, type: 'GRAB' },
      // 세탁 위치 도착 후 RELEASE
      { t: 11, durationSec: 2, type: 'RELEASE' },
    ],
    successCriteria: [
      {
        kind: 'targetNearPosition',
        description: '양말이 세탁 위치 (80, 80) 반경 50cm 안에 있어야 함',
        targetIndex: 0, // 시나리오에서 추가한 첫 번째 타겟
        positionCm: { xCm: 80, yCm: 80 },
        radiusCm: 50,
      },
      {
        kind: 'noFailures',
        description: '실행 중 reach/torque/ZMP 실패 없음',
      },
    ],
  },

  // ─── 시나리오 2: 식탁 컵 → 싱크 ────────────────────────────────────────
  {
    id: 'scn_table_cup_to_sink',
    name: '식탁 컵 → 싱크 카운터',
    description:
      '식탁 위 빈 컵을 집어 싱크 카운터로 옮기는 시나리오. ' +
      '중간 높이 reach (75cm) + 200g 페이로드 + 가구 사이 navigation 검증.',
    category: '정리정돈',
    basePresetId: 'living_room',
    extraTargets: [
      { targetObjectId: 201, xCm: 260, yCm: 130, zCm: 75 },
    ],
    extraFurniture: [],
    robotStart: { xCm: 100, yCm: 250, yawDeg: 0 },
    durationSec: 16,
    waypoints: [
      { t: 0, xCm: 100, yCm: 250, yawDeg: 0 },
      { t: 4, xCm: 220, yCm: 150, yawDeg: 45 },
      { t: 10, xCm: 80, yCm: 60, yawDeg: 270 },
    ],
    gestures: [
      { t: 4, durationSec: 4, type: 'PICKUP' },
      { t: 5.5, durationSec: 2, type: 'GRAB' },
      { t: 12, durationSec: 2, type: 'RELEASE' },
    ],
    successCriteria: [
      {
        kind: 'targetNearPosition',
        description: '컵이 싱크 위치 (80, 60) 반경 60cm 안에 있어야 함',
        targetIndex: 0,
        positionCm: { xCm: 80, yCm: 60 },
        radiusCm: 60,
      },
      {
        kind: 'noFailures',
        description: '실행 중 reach/torque/ZMP/충돌 실패 없음',
      },
    ],
  },

  // ─── 시나리오 3: 거실 리모컨 → 소파 ───────────────────────────────────
  {
    id: 'scn_remote_to_sofa',
    name: '바닥 리모컨 → 소파 위',
    description:
      '바닥에 떨어진 리모컨을 집어 소파 위로 올려놓는 시나리오. ' +
      '바닥 reach + 중간 높이 release (45cm) + 짧은 거리 navigation.',
    category: '정리정돈',
    basePresetId: 'living_room',
    extraTargets: [
      { targetObjectId: 202, xCm: 200, yCm: 250, zCm: 0 }, // 리모컨 바닥
    ],
    extraFurniture: [],
    robotStart: { xCm: 130, yCm: 250, yawDeg: 0 },
    durationSec: 12,
    waypoints: [
      { t: 0, xCm: 130, yCm: 250, yawDeg: 0 },
      { t: 3, xCm: 175, yCm: 250, yawDeg: 0 },
      { t: 8, xCm: 175, yCm: 200, yawDeg: 180 }, // 소파 옆 (거실 preset 기준)
    ],
    gestures: [
      { t: 3, durationSec: 2, type: 'GRAB' }, // 자동 reach down
      { t: 9, durationSec: 2, type: 'RELEASE' },
    ],
    successCriteria: [
      {
        kind: 'targetNearPosition',
        description: '리모컨이 소파 위치 (175, 200) 반경 40cm 안에 있어야 함',
        targetIndex: 0,
        positionCm: { xCm: 175, yCm: 200 },
        radiusCm: 40,
      },
      { kind: 'noFailures', description: '충돌 없이 완수' },
    ],
  },

  // ─── 시나리오 4: 식탁 접시 → 싱크 (무거운 페이로드) ──────────────────
  {
    id: 'scn_plate_to_sink',
    name: '식탁 접시 → 싱크 (400g)',
    description:
      '식탁 위 빈 접시(400g)를 싱크로 옮김. ' +
      '중간 높이 reach + 토크 증가 (페이로드 0.4kg → 어깨 토크 한계 검증) + navigation.',
    category: '정리정돈',
    basePresetId: 'living_room',
    extraTargets: [
      { targetObjectId: 203, xCm: 260, yCm: 130, zCm: 75 }, // 빈 접시
    ],
    extraFurniture: [],
    robotStart: { xCm: 100, yCm: 250, yawDeg: 0 },
    durationSec: 16,
    waypoints: [
      { t: 0, xCm: 100, yCm: 250, yawDeg: 0 },
      { t: 4, xCm: 220, yCm: 150, yawDeg: 45 },
      { t: 10, xCm: 80, yCm: 60, yawDeg: 270 },
    ],
    gestures: [
      { t: 4, durationSec: 4, type: 'PICKUP' },
      { t: 5.5, durationSec: 2, type: 'GRAB' },
      { t: 12, durationSec: 2, type: 'RELEASE' },
    ],
    successCriteria: [
      {
        kind: 'targetNearPosition',
        description: '접시가 싱크 위치 반경 60cm 안에 있어야 함',
        targetIndex: 0,
        positionCm: { xCm: 80, yCm: 60 },
        radiusCm: 60,
      },
      { kind: 'noFailures', description: '토크 한계 + ZMP 안정성 유지' },
    ],
  },

  // ─── 시나리오 5: 책장 책 → 책상 (높은 reach + lift column 필요) ────
  {
    id: 'scn_book_high_reach',
    name: '책 정리 (높이 120cm reach)',
    description:
      '높이 120cm에 있는 책을 책상으로 옮기는 시나리오. ' +
      '높은 reach 필요 → lift column 검증 (default L1+L2=47cm로는 불가).',
    category: '정리정돈',
    basePresetId: 'living_room',
    extraTargets: [
      { targetObjectId: 205, xCm: 250, yCm: 80, zCm: 120 }, // 책장 위 책
    ],
    extraFurniture: [],
    robotStart: { xCm: 150, yCm: 200, yawDeg: 0 },
    durationSec: 16,
    waypoints: [
      { t: 0, xCm: 150, yCm: 200, yawDeg: 0 },
      { t: 4, xCm: 230, yCm: 130, yawDeg: 0 },
      { t: 10, xCm: 200, yCm: 200, yawDeg: 90 },
    ],
    gestures: [
      { t: 4, durationSec: 4, type: 'PICKUP' },
      { t: 5.5, durationSec: 2, type: 'GRAB' },
      { t: 12, durationSec: 2, type: 'RELEASE' },
    ],
    successCriteria: [
      {
        kind: 'targetNearPosition',
        description: '책이 책상 위치 (200, 200) 반경 50cm 안에 있어야 함',
        targetIndex: 0,
        positionCm: { xCm: 200, yCm: 200 },
        radiusCm: 50,
      },
      { kind: 'noFailures', description: 'reach + 토크 통과' },
    ],
  },

  // ─── 시나리오 6: 양말 여러 개 빠르게 (작은 물체 반복) ──────────────
  {
    id: 'scn_multiple_socks',
    name: '양말 3개 연속 → 세탁 위치',
    description:
      '거실 바닥의 양말 3개를 차례로 집어 세탁 위치로 모으는 시나리오. ' +
      '반복 grasp + navigation 효율 검증.',
    category: '청소',
    basePresetId: 'living_room',
    extraTargets: [
      { targetObjectId: 206, xCm: 220, yCm: 200, zCm: 0 },
      { targetObjectId: 206, xCm: 280, yCm: 230, zCm: 0 },
      { targetObjectId: 206, xCm: 200, yCm: 300, zCm: 0 },
    ],
    extraFurniture: [],
    robotStart: { xCm: 100, yCm: 100, yawDeg: 0 },
    durationSec: 24,
    waypoints: [
      { t: 0, xCm: 100, yCm: 100, yawDeg: 0 },
      { t: 3, xCm: 200, yCm: 200, yawDeg: 90 },
      { t: 7, xCm: 80, yCm: 80, yawDeg: 270 },
      { t: 11, xCm: 250, yCm: 230, yawDeg: 90 },
      { t: 15, xCm: 80, yCm: 80, yawDeg: 270 },
      { t: 19, xCm: 180, yCm: 300, yawDeg: 90 },
    ],
    gestures: [
      { t: 3, durationSec: 2, type: 'GRAB' },
      { t: 7, durationSec: 1, type: 'RELEASE' },
      { t: 11, durationSec: 2, type: 'GRAB' },
      { t: 15, durationSec: 1, type: 'RELEASE' },
      { t: 19, durationSec: 2, type: 'GRAB' },
      { t: 23, durationSec: 1, type: 'RELEASE' },
    ],
    successCriteria: [
      {
        kind: 'targetNearPosition',
        description: '양말 #1이 세탁 위치 반경 80cm 안',
        targetIndex: 0,
        positionCm: { xCm: 80, yCm: 80 },
        radiusCm: 80,
      },
      {
        kind: 'targetNearPosition',
        description: '양말 #2가 세탁 위치 반경 80cm 안',
        targetIndex: 1,
        positionCm: { xCm: 80, yCm: 80 },
        radiusCm: 80,
      },
      { kind: 'noFailures', description: '실패 없음' },
    ],
  },

  // ─── 시나리오 7: 페트병 → 휴지통 ──────────────────────────────────
  {
    id: 'scn_bottle_to_trash',
    name: '페트병 → 휴지통',
    description:
      '바닥의 페트병(500g)을 집어 휴지통으로 버리는 시나리오. ' +
      '바닥 grasp + 무거운 페이로드(500g, 토크 ↑) + 짧은 navigation.',
    category: '청소',
    basePresetId: 'living_room',
    extraTargets: [
      { targetObjectId: 207, xCm: 230, yCm: 280, zCm: 0 },
    ],
    extraFurniture: [],
    robotStart: { xCm: 130, yCm: 280, yawDeg: 0 },
    durationSec: 12,
    waypoints: [
      { t: 0, xCm: 130, yCm: 280, yawDeg: 0 },
      { t: 3, xCm: 200, yCm: 280, yawDeg: 0 },
      { t: 8, xCm: 60, yCm: 350, yawDeg: 270 }, // 휴지통 가상 위치
    ],
    gestures: [
      { t: 3, durationSec: 2, type: 'GRAB' },
      { t: 9, durationSec: 2, type: 'RELEASE' },
    ],
    successCriteria: [
      {
        kind: 'targetNearPosition',
        description: '페트병이 휴지통 위치 (60, 350) 반경 50cm 안',
        targetIndex: 0,
        positionCm: { xCm: 60, yCm: 350 },
        radiusCm: 50,
      },
      { kind: 'noFailures', description: '토크 한계 통과' },
    ],
  },

  // ─── 시나리오 8: 휴대폰 → 충전 위치 ──────────────────────────────
  {
    id: 'scn_phone_to_charging',
    name: '휴대폰 → 충전 위치 (식탁)',
    description:
      '소파 위 휴대폰을 집어 식탁 위 충전 위치로 옮김. ' +
      '중간 높이 두 곳 (45cm 소파 → 75cm 식탁) + 정확한 release 위치.',
    category: '서빙',
    basePresetId: 'living_room',
    extraTargets: [
      { targetObjectId: 204, xCm: 175, yCm: 200, zCm: 45 }, // 소파 위
    ],
    extraFurniture: [],
    robotStart: { xCm: 150, yCm: 250, yawDeg: 0 },
    durationSec: 16,
    waypoints: [
      { t: 0, xCm: 150, yCm: 250, yawDeg: 0 },
      { t: 3, xCm: 175, yCm: 230, yawDeg: 180 },
      { t: 9, xCm: 220, yCm: 150, yawDeg: 45 },
    ],
    gestures: [
      { t: 3, durationSec: 3, type: 'PICKUP' }, // 소파 위 reach
      { t: 4, durationSec: 2, type: 'GRAB' },
      { t: 9, durationSec: 3, type: 'PICKUP' }, // 식탁 위 reach
      { t: 11, durationSec: 2, type: 'RELEASE' },
    ],
    successCriteria: [
      {
        kind: 'targetNearPosition',
        description: '휴대폰이 식탁 충전 위치 반경 50cm 안',
        targetIndex: 0,
        positionCm: { xCm: 220, yCm: 150 },
        radiusCm: 50,
      },
      { kind: 'noFailures', description: '실패 없음' },
    ],
  },
];

export function findScenario(id: string): TaskScenario | undefined {
  return TASK_SCENARIOS.find((s) => s.id === id);
}
