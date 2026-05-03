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
      // 빈 컵을 식탁 위 (260, 130, 75) 추가 — surfaceHeight 75cm
      { targetObjectId: 201, xCm: 260, yCm: 130, zCm: 75 },
    ],
    extraFurniture: [],
    robotStart: { xCm: 100, yCm: 250, yawDeg: 0 },
    durationSec: 16,
    waypoints: [
      { t: 0, xCm: 100, yCm: 250, yawDeg: 0 },
      // 식탁 옆으로 접근 (식탁이 (300, 100) 부근에 있다고 가정)
      { t: 4, xCm: 220, yCm: 150, yawDeg: 45 },
      // GRAB 후 싱크 위치로 (싱크는 거실 프리셋에 없으므로 가상 위치)
      { t: 10, xCm: 80, yCm: 60, yawDeg: 270 },
    ],
    gestures: [
      // PICKUP으로 자세 잡고 (높은 reach)
      { t: 4, durationSec: 3, type: 'PICKUP' },
      // GRAB (PICKUP과 겹쳐도 PICKUP이 우선)
      { t: 5.5, durationSec: 2, type: 'GRAB' },
      // 싱크 도착 후 RELEASE
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
        description: '실행 중 reach/torque/ZMP 실패 없음',
      },
    ],
  },
];

export function findScenario(id: string): TaskScenario | undefined {
  return TASK_SCENARIOS.find((s) => s.id === id);
}
