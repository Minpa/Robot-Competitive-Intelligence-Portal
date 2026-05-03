/**
 * ARGOS-Designer · vacuum-arm Zustand store (Phase 1 PoC v1.2)
 *
 * Module-scoped UI state. Server state (catalog) lives in React Query —
 * this store only tracks the user's spec input + viewport options.
 */

import { create } from 'zustand';
import type {
  ProductConfig,
  VacuumBaseSpec,
  ManipulatorArmSpec,
  ArmMountPosition,
  RoomConfig,
  RoomPresetSpec,
  ScenarioSpec,
  FurniturePlacement,
  ObstaclePlacement,
  TargetMarker,
  TaskScenario,
  EvalIssue,
  EvalResult,
} from '../types/product';
import { useCandidatesStore } from './candidates-store';

/** Tap into the candidates store from Zustand setters without a hook. */
function logRev(parameterName: string, oldValue: unknown, newValue: unknown) {
  if (oldValue === newValue) return;
  if (
    typeof oldValue === 'object' &&
    typeof newValue === 'object' &&
    JSON.stringify(oldValue) === JSON.stringify(newValue)
  ) {
    return;
  }
  useCandidatesStore.getState().logRevision(parameterName, oldValue, newValue);
}

const DEFAULT_ROOM: RoomConfig = {
  preset: null,
  widthCm: 500,
  depthCm: 400,
  furniture: [],
  obstacles: [],
  targets: [],
};

export type WorkbenchMode = 'product3d' | 'roomEditor' | 'room3d';

// ─── Timeline types (옵션 X: 모션 시퀀스) ─────────────────────────────────────

/** 단일 로봇이 시간 t (초)에 어디 있어야 하는지. 인접 waypoints 사이는 보간.
 *  yawDeg는 optional — 미지정이면 이전 yaw 유지 (rotation lerp 안 함). */
export interface TimelineWaypoint {
  id: string;
  t: number; // seconds
  xCm: number;
  yCm: number;
  yawDeg?: number;
}

export type GestureType =
  | 'IDLE'
  | 'PICKUP'
  | 'WAVE'
  | 'POINT'
  | 'SCAN'
  | 'BOW'
  | 'HANDSHAKE'
  | 'GRAB'      // 타겟 잡기 (targetId 필요)
  | 'RELEASE';  // 잡고 있던 것 놓기 (targetId 불필요)

/** 시간 t에 시작해서 durationSec 동안 지속되는 동작.
 *  GRAB의 경우 targetId가 필요 (어떤 타겟을 잡을지 — TargetMarker.targetObjectId의 해당 인덱스).
 *  RELEASE는 현재 잡고 있는 것을 놓으므로 targetId 불필요. */
export interface TimelineGesture {
  id: string;
  t: number; // start seconds
  durationSec: number;
  type: GestureType;
  /** GRAB일 때만 사용 — room.targets 배열의 인덱스 */
  targetIndex?: number;
}

export interface TimelineState {
  /** 총 길이 (초). */
  duration: number;
  waypoints: TimelineWaypoint[];
  gestures: TimelineGesture[];
  /** 현재 재생 시점 (초). 0 ~ duration. */
  currentTime: number;
  isPlaying: boolean;
  playSpeed: 1 | 2 | 3;
}

const DEFAULT_TIMELINE: TimelineState = {
  duration: 14,
  waypoints: [],
  gestures: [],
  currentTime: 0,
  isPlaying: false,
  playSpeed: 1,
};

let timelineIdCounter = 1;
function makeTimelineId(): string {
  return `tl${Date.now()}_${timelineIdCounter++}`;
}

/**
 * 새 timeline 상태를 받아서, 그 시점의 (robotXCm, robotYCm, robotYawDeg, armPose)를 함께
 * 갱신해 Zustand에 적용할 partial state를 반환.
 *
 * 모든 timeline mutation (waypoint 추가/삭제/편집, 스크럽, 재생 진행)에서 사용 →
 * timeline 변경 시 visual이 즉시 반영됨.
 */
function deriveCurrentFrame(
  partial: { timeline: TimelineState },
): {
  timeline: TimelineState;
  robotXCm?: number;
  robotYCm?: number;
  robotYawDeg?: number;
  armPose?: ArmPose;
} {
  const tl = partial.timeline;
  const pos = positionAtTimeInline(tl.waypoints, tl.currentTime);
  const pose = poseAtTimeInline(tl.gestures, tl.currentTime);
  return {
    timeline: tl,
    ...(pos ? { robotXCm: pos.xCm, robotYCm: pos.yCm } : {}),
    ...(pos && pos.yawDeg !== undefined ? { robotYawDeg: pos.yawDeg } : {}),
    ...(pose ? { armPose: pose } : {}),
  };
}

/** 시간 t에 로봇이 어디 있어야 하는지 — 인접 waypoints 사이 lerp (위치 + yaw).
 *  yaw는 angular shortest-path lerp (예: 350° → 10° = 20° 회전, not -340°).
 *  결과 null = waypoint 없음 → 위치 갱신 안 함. */
function positionAtTimeInline(
  waypoints: TimelineWaypoint[],
  t: number,
): { xCm: number; yCm: number; yawDeg?: number } | null {
  if (waypoints.length === 0) return null;
  const single = (w: TimelineWaypoint) => ({ xCm: w.xCm, yCm: w.yCm, yawDeg: w.yawDeg });
  if (waypoints.length === 1) return single(waypoints[0]);
  if (t <= waypoints[0].t) return single(waypoints[0]);
  const last = waypoints[waypoints.length - 1];
  if (t >= last.t) return single(last);
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t || 1;
      const r = (t - a.t) / span;
      const xCm = a.xCm + (b.xCm - a.xCm) * r;
      const yCm = a.yCm + (b.yCm - a.yCm) * r;
      // yaw lerp: 둘 다 정의돼 있을 때만, shortest-path
      let yawDeg: number | undefined;
      if (a.yawDeg !== undefined && b.yawDeg !== undefined) {
        const da = a.yawDeg;
        const db = b.yawDeg;
        let diff = ((db - da + 540) % 360) - 180; // [-180, 180]
        yawDeg = ((da + diff * r) % 360 + 360) % 360;
      } else if (a.yawDeg !== undefined) {
        yawDeg = a.yawDeg;
      } else if (b.yawDeg !== undefined) {
        yawDeg = b.yawDeg;
      }
      return { xCm, yCm, yawDeg };
    }
  }
  return single(last);
}

/** 시간 t에 활성 자세 gesture의 armPose.
 *
 * 우선순위:
 *   1. PICKUP/WAVE/POINT/SCAN/BOW/HANDSHAKE 같은 "자세 전용" gesture가 활성이면 그것
 *   2. 없으면 GRAB/RELEASE의 reach-down 기본 pose (자동 motion)
 *   3. 둘 다 없으면 null (슬라이더/이전 자세 유지)
 *
 * 즉 user가 PICKUP + GRAB 동시에 추가하면 PICKUP 자세를 따름 (manual override).
 * GRAB만 추가하면 GRAB의 reach-down 자동 동작.
 */
function poseAtTimeInline(
  gestures: TimelineGesture[],
  t: number,
): { shoulderPitchDeg: number; elbowDeg: number } | null {
  const allActive = gestures.filter((g) => t >= g.t && t <= g.t + g.durationSec);
  if (allActive.length === 0) return null;

  // 자세 전용 gesture (PICKUP/WAVE 등) 우선
  const poseOnly = allActive.filter((g) => g.type !== 'GRAB' && g.type !== 'RELEASE');
  const usable = poseOnly.length > 0 ? poseOnly : allActive;
  const g = usable[usable.length - 1];
  return interpolateGesturePose(g.type, t - g.t, g.durationSec);
}

/** Gesture별 (shoulderPitchDeg, elbowDeg) keyframes — duration에 비례해 정규화. */
function interpolateGesturePose(
  type: GestureType,
  localT: number,
  durationSec: number,
): { shoulderPitchDeg: number; elbowDeg: number } {
  const profile = GESTURE_PROFILES[type] ?? GESTURE_PROFILES.IDLE;
  const tNorm = durationSec > 0 ? localT / durationSec : 0;
  // Find adjacent keyframes
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    if (tNorm >= a.tNorm && tNorm <= b.tNorm) {
      const span = b.tNorm - a.tNorm || 1;
      const r = (tNorm - a.tNorm) / span;
      return {
        shoulderPitchDeg: a.shoulderPitchDeg + (b.shoulderPitchDeg - a.shoulderPitchDeg) * r,
        elbowDeg: a.elbowDeg + (b.elbowDeg - a.elbowDeg) * r,
      };
    }
  }
  const last = profile[profile.length - 1];
  return { shoulderPitchDeg: last.shoulderPitchDeg, elbowDeg: last.elbowDeg };
}

/** Gesture 정의: tNorm = 0~1 정규화 시간. 각도는 deg. */
interface GestureKeyframeDef {
  tNorm: number;
  shoulderPitchDeg: number;
  elbowDeg: number;
}

const GESTURE_PROFILES: Record<GestureType, GestureKeyframeDef[]> = {
  IDLE: [{ tNorm: 0, shoulderPitchDeg: 25, elbowDeg: 110 }],
  PICKUP: [
    { tNorm: 0.0, shoulderPitchDeg: 25, elbowDeg: 110 },
    { tNorm: 0.4, shoulderPitchDeg: 90, elbowDeg: 180 }, // reach forward
    { tNorm: 0.7, shoulderPitchDeg: 90, elbowDeg: 180 }, // hold
    { tNorm: 1.0, shoulderPitchDeg: 25, elbowDeg: 110 }, // return
  ],
  WAVE: [
    { tNorm: 0.0, shoulderPitchDeg: 25, elbowDeg: 110 },
    { tNorm: 0.15, shoulderPitchDeg: -10, elbowDeg: 60 }, // raise + bend
    { tNorm: 0.85, shoulderPitchDeg: -10, elbowDeg: 60 },
    { tNorm: 1.0, shoulderPitchDeg: 25, elbowDeg: 110 },
  ],
  POINT: [
    { tNorm: 0.0, shoulderPitchDeg: 25, elbowDeg: 110 },
    { tNorm: 0.3, shoulderPitchDeg: 60, elbowDeg: 175 }, // extend toward target
    { tNorm: 0.8, shoulderPitchDeg: 60, elbowDeg: 175 },
    { tNorm: 1.0, shoulderPitchDeg: 25, elbowDeg: 110 },
  ],
  SCAN: [
    { tNorm: 0.0, shoulderPitchDeg: 25, elbowDeg: 110 },
    { tNorm: 1.0, shoulderPitchDeg: 25, elbowDeg: 110 }, // SCAN은 head 회전이 주 — 우리 모델엔 없음
  ],
  BOW: [
    { tNorm: 0.0, shoulderPitchDeg: 25, elbowDeg: 110 },
    { tNorm: 0.3, shoulderPitchDeg: 45, elbowDeg: 110 }, // 살짝 숙임 (proxy)
    { tNorm: 0.7, shoulderPitchDeg: 45, elbowDeg: 110 },
    { tNorm: 1.0, shoulderPitchDeg: 25, elbowDeg: 110 },
  ],
  HANDSHAKE: [
    { tNorm: 0.0, shoulderPitchDeg: 25, elbowDeg: 110 },
    { tNorm: 0.25, shoulderPitchDeg: 70, elbowDeg: 130 }, // reach forward, slight bend
    { tNorm: 0.40, shoulderPitchDeg: 70, elbowDeg: 145 }, // shake up
    { tNorm: 0.55, shoulderPitchDeg: 70, elbowDeg: 115 }, // shake down
    { tNorm: 0.70, shoulderPitchDeg: 70, elbowDeg: 145 }, // shake up
    { tNorm: 0.85, shoulderPitchDeg: 70, elbowDeg: 130 },
    { tNorm: 1.0, shoulderPitchDeg: 25, elbowDeg: 110 },
  ],
  // GRAB: rest → reach-down (앞-아래로 뻗어 floor reach) → hold.
  // 그리퍼는 gesture END 시점에 닫힘 → reach 동작 끝난 후 잡음.
  // PICKUP 같은 자세 gesture가 동시에 활성이면 그게 우선 (poseAtTimeInline 분기).
  GRAB: [
    { tNorm: 0.0, shoulderPitchDeg: 25, elbowDeg: 110 }, // rest
    { tNorm: 0.6, shoulderPitchDeg: 110, elbowDeg: 165 }, // reach down toward floor
    { tNorm: 1.0, shoulderPitchDeg: 110, elbowDeg: 165 }, // hold (gripper closes at end)
  ],
  // RELEASE: hold pose → 살짝 retract → rest. 그리퍼는 gesture START 시점에 열림.
  RELEASE: [
    { tNorm: 0.0, shoulderPitchDeg: 110, elbowDeg: 165 }, // hold (gripper opens here, target falls)
    { tNorm: 0.4, shoulderPitchDeg: 100, elbowDeg: 160 }, // slight retract
    { tNorm: 1.0, shoulderPitchDeg: 25, elbowDeg: 110 }, // rest
  ],
};

/** Pose for the 3D rendering only — does not affect engineering analysis. */
export interface ArmPose {
  shoulderPitchDeg: number; // 0 = vertical up, 90 = horizontal forward
  elbowDeg: number;         // 180 = straight, 0 = fully folded back
}

export const DEFAULT_POSE: ArmPose = {
  shoulderPitchDeg: 25,
  elbowDeg: 110,
};

export const POSE_PRESETS: Record<string, ArmPose> = {
  folded:    { shoulderPitchDeg: 25, elbowDeg: 110 },
  upright:   { shoulderPitchDeg: 0,  elbowDeg: 180 },
  worstCase: { shoulderPitchDeg: 90, elbowDeg: 180 }, // 수평 뻗음 — 분석 자세
  reach:     { shoulderPitchDeg: 60, elbowDeg: 150 },
};

const DEFAULT_BASE: VacuumBaseSpec = {
  shape: 'disc',
  heightCm: 10, // ~ LG 로보킹 envelope
  diameterOrWidthCm: 35,
  weightKg: 4.0,
  hasLiftColumn: false,
  liftColumnMaxExtensionCm: 0,
};

const DEFAULT_ARM_LEFT: ManipulatorArmSpec = {
  mountPosition: 'left',
  shoulderHeightAboveBaseCm: 5,
  shoulderActuatorSku: 'TMOTOR-MOCK-AK60-6',
  upperArmLengthCm: 25,
  elbowActuatorSku: 'GENERIC-MOCK-SERVO-M',
  forearmLengthCm: 22,
  wristDof: 1,
  endEffectorSku: 'EE-MOCK-2FINGER',
};

const DEFAULT_ARM_RIGHT: ManipulatorArmSpec = {
  ...DEFAULT_ARM_LEFT,
  mountPosition: 'right',
};

// 기본 1개 팔 (LG 로보킹 + FlexiArm Riser 형태)
const DEFAULT_ARM_CENTER: ManipulatorArmSpec = {
  ...DEFAULT_ARM_LEFT,
  mountPosition: 'center',
};

const INITIAL_PRODUCT: ProductConfig = {
  name: '후보 A',
  base: DEFAULT_BASE,
  arms: [DEFAULT_ARM_CENTER],
};

interface DesignerVacuumState {
  product: ProductConfig;
  /** Environment (room) configuration. REQ-6. */
  room: RoomConfig;

  /** Payload weight at end-effector (kg). REQ-4. */
  payloadKg: number;

  /** Center pane mode: 3D viewport or 2D room editor. REQ-6. */
  mode: WorkbenchMode;

  // viewport options
  viewportAutoRotate: boolean;
  showLabels: boolean;
  showWorkspaceMesh: boolean;
  showZmp: boolean;

  /** Visual pose of the rendered arm (does not affect analysis). */
  armPose: ArmPose;

  /** 로봇 위치 (방 좌표 cm). null = 방 중앙(기본). 방 3D 모드에서 드래그 가능.
   *  좌표계: 2D 룸 에디터와 동일 (xCm/yCm = 방 좌상단부터 +오른쪽/+아래) */
  robotXCm: number | null;
  robotYCm: number | null;
  /** 로봇 yaw 회전 (도). 0 = 기본 방향(+Z 바라봄). +값 = 반시계 회전 (위에서 봤을 때). */
  robotYawDeg: number;

  /** 현재 그리퍼에 잡혀있는 타겟의 room.targets 인덱스. null = 아무것도 안 잡힘.
   *  GrabController가 매 프레임 갱신 (gripper 상태 + 반경 내 closest target). */
  heldTargetIndex: number | null;

  /** 모션 타임라인 — 시간 진행에 따라 로봇이 자동으로 이동·동작 (옵션 X). */
  timeline: TimelineState;

  // ─── Task scenarios + 평가 (Path A) ──────────────────────────────────────
  /** 현재 로드된 시나리오 ID. null = 시나리오 모드 아님 (수동 timeline 편집). */
  activeScenarioId: string | null;
  /** 마지막 재생 결과. 다음 재생 시작 시 reset. */
  evalResult: EvalResult | null;
  /** 재생 중 누적되는 이슈 (재생 끝나면 evalResult로 finalize). */
  evalIssuesInProgress: EvalIssue[];

  // base mutators (REQ-1)
  setBaseShape: (shape: VacuumBaseSpec['shape']) => void;
  setBaseHeightCm: (cm: number) => void;
  setBaseDiameterOrWidthCm: (cm: number) => void;
  setBaseWeightKg: (kg: number) => void;
  setHasLiftColumn: (yes: boolean) => void;
  setLiftColumnMaxExtensionCm: (cm: number) => void;

  // arm mutators (REQ-2)
  setArmCount: (n: 0 | 1 | 2) => void;
  updateArm: (index: number, patch: Partial<ManipulatorArmSpec>) => void;
  setArmMount: (index: number, mount: ArmMountPosition) => void;

  // payload (REQ-4)
  setPayloadKg: (kg: number) => void;

  // viewport mutators
  toggleAutoRotate: () => void;
  toggleLabels: () => void;
  toggleWorkspaceMesh: () => void;
  toggleZmp: () => void;
  setMode: (m: WorkbenchMode) => void;

  // arm pose (visual only)
  setArmPose: (pose: Partial<ArmPose>) => void;
  applyPosePreset: (presetId: keyof typeof POSE_PRESETS) => void;

  // room mutators (REQ-6)
  setRoomSize: (widthCm: number, depthCm: number) => void;
  loadRoomPreset: (preset: RoomPresetSpec) => void;
  loadScenario: (scenario: ScenarioSpec, presetByPreset: RoomPresetSpec | null) => void;
  resetRoom: () => void;
  addFurniture: (placement: FurniturePlacement) => void;
  updateFurniture: (idx: number, patch: Partial<FurniturePlacement>) => void;
  removeFurniture: (idx: number) => void;
  addObstacle: (placement: ObstaclePlacement) => void;
  updateObstacle: (idx: number, patch: Partial<ObstaclePlacement>) => void;
  removeObstacle: (idx: number) => void;
  addTarget: (target: TargetMarker) => void;
  updateTarget: (idx: number, patch: Partial<TargetMarker>) => void;
  removeTarget: (idx: number) => void;

  setRobotPosition: (xCm: number | null, yCm: number | null) => void;
  setRobotYawDeg: (deg: number) => void;
  setHeldTargetIndex: (idx: number | null) => void;

  // ─── Scenarios + 평가 ──────────────────────────────────────────────────
  /** 시나리오 로드 — 룸 프리셋 + 추가 타겟/가구 + 로봇 시작 + timeline + 성공조건 */
  loadTaskScenario: (scenario: TaskScenario, roomPreset: RoomPresetSpec | null) => void;
  /** 평가 시작 (재생 시작 시 호출) */
  startEval: () => void;
  /** 평가 중 이슈 추가 */
  addEvalIssue: (issue: EvalIssue) => void;
  /** 평가 종료 (재생 끝/중단 시 호출, evalResult finalize) */
  finalizeEval: (currentTimeSec: number, specSummary: string) => void;
  /** 평가 결과 클리어 */
  clearEvalResult: () => void;

  // ─── Timeline (옵션 X: 모션 시퀀스) ───────────────────────────────────────
  addWaypoint: (waypoint: Omit<TimelineWaypoint, 'id'>) => void;
  updateWaypoint: (id: string, patch: Partial<Omit<TimelineWaypoint, 'id'>>) => void;
  removeWaypoint: (id: string) => void;
  addGestureKeyframe: (gesture: Omit<TimelineGesture, 'id'>) => void;
  updateGestureKeyframe: (id: string, patch: Partial<Omit<TimelineGesture, 'id'>>) => void;
  removeGestureKeyframe: (id: string) => void;
  setTimelineDuration: (seconds: number) => void;
  setTimelineCurrentTime: (seconds: number) => void;
  setTimelinePlaying: (playing: boolean) => void;
  setTimelinePlaySpeed: (speed: 1 | 2 | 3) => void;
  /** Playback hook이 매 프레임 호출 — currentTime 진행 + 파생 상태 (robotXCm, armPose) 갱신. */
  advanceTimeline: (deltaSec: number) => void;
  resetTimeline: () => void;

  setProductName: (name: string) => void;
  reset: () => void;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const useDesignerVacuumStore = create<DesignerVacuumState>((set) => ({
  product: INITIAL_PRODUCT,
  room: DEFAULT_ROOM,
  payloadKg: 0.2,
  mode: 'product3d',
  viewportAutoRotate: false,
  showLabels: false,
  showWorkspaceMesh: true,
  showZmp: true,
  armPose: { ...DEFAULT_POSE },
  robotXCm: null,
  robotYCm: null,
  robotYawDeg: 0,
  heldTargetIndex: null,
  timeline: { ...DEFAULT_TIMELINE },
  activeScenarioId: null,
  evalResult: null,
  evalIssuesInProgress: [],

  setBaseShape: (shape) =>
    set((s) => {
      logRev('base.shape', s.product.base.shape, shape);
      return { product: { ...s.product, base: { ...s.product.base, shape } } };
    }),

  setBaseHeightCm: (cm) =>
    set((s) => {
      const v = clamp(cm, 8, 30);
      logRev('base.heightCm', s.product.base.heightCm, v);
      return {
        product: { ...s.product, base: { ...s.product.base, heightCm: v } },
      };
    }),

  setBaseDiameterOrWidthCm: (cm) =>
    set((s) => {
      const v = clamp(cm, 25, 40);
      logRev('base.diameterOrWidthCm', s.product.base.diameterOrWidthCm, v);
      return {
        product: {
          ...s.product,
          base: { ...s.product.base, diameterOrWidthCm: v },
        },
      };
    }),

  setBaseWeightKg: (kg) =>
    set((s) => {
      const v = clamp(kg, 3, 8);
      logRev('base.weightKg', s.product.base.weightKg, v);
      return { product: { ...s.product, base: { ...s.product.base, weightKg: v } } };
    }),

  setHasLiftColumn: (yes) =>
    set((s) => {
      logRev('base.hasLiftColumn', s.product.base.hasLiftColumn, yes);
      return {
        product: {
          ...s.product,
          base: {
            ...s.product.base,
            hasLiftColumn: yes,
            liftColumnMaxExtensionCm: yes ? Math.max(s.product.base.liftColumnMaxExtensionCm, 1) : 0,
          },
        },
      };
    }),

  setLiftColumnMaxExtensionCm: (cm) =>
    set((s) => {
      const v = clamp(cm, 0, 30);
      logRev('base.liftColumnMaxExtensionCm', s.product.base.liftColumnMaxExtensionCm, v);
      return {
        product: {
          ...s.product,
          base: { ...s.product.base, liftColumnMaxExtensionCm: v },
        },
      };
    }),

  setArmCount: (n) =>
    set((s) => {
      const current = s.product.arms;
      logRev('product.armCount', current.length, n);
      if (n === 0) return { product: { ...s.product, arms: [] } };
      if (n === 1) {
        return {
          product: { ...s.product, arms: [current[0] ?? { ...DEFAULT_ARM_LEFT, mountPosition: 'center' }] },
        };
      }
      return {
        product: {
          ...s.product,
          arms: [current[0] ?? DEFAULT_ARM_LEFT, current[1] ?? DEFAULT_ARM_RIGHT],
        },
      };
    }),

  updateArm: (index, patch) =>
    set((s) => {
      if (!s.product.arms[index]) return s;
      const before = s.product.arms[index];
      const next = [...s.product.arms];
      next[index] = { ...before, ...patch };
      if (patch.upperArmLengthCm !== undefined)
        next[index].upperArmLengthCm = clamp(patch.upperArmLengthCm, 15, 40);
      if (patch.forearmLengthCm !== undefined)
        next[index].forearmLengthCm = clamp(patch.forearmLengthCm, 15, 40);
      if (patch.shoulderHeightAboveBaseCm !== undefined)
        next[index].shoulderHeightAboveBaseCm = clamp(patch.shoulderHeightAboveBaseCm, 0, 20);
      if (patch.wristDof !== undefined)
        next[index].wristDof = Math.max(0, Math.min(3, Math.round(patch.wristDof)));
      // Log only the changed keys
      for (const k of Object.keys(patch) as Array<keyof typeof patch>) {
        logRev(
          `arm[${index}].${k}`,
          (before as unknown as Record<string, unknown>)[k],
          (next[index] as unknown as Record<string, unknown>)[k]
        );
      }
      return { product: { ...s.product, arms: next } };
    }),

  setArmMount: (index, mount) =>
    set((s) => {
      if (!s.product.arms[index]) return s;
      logRev(`arm[${index}].mountPosition`, s.product.arms[index].mountPosition, mount);
      const next = [...s.product.arms];
      next[index] = { ...next[index], mountPosition: mount };
      return { product: { ...s.product, arms: next } };
    }),

  setProductName: (name) => set((s) => ({ product: { ...s.product, name } })),

  setPayloadKg: (kg) =>
    set((s) => {
      const v = clamp(kg, 0, 5);
      logRev('payloadKg', s.payloadKg, v);
      return { payloadKg: v };
    }),

  toggleAutoRotate: () => set((s) => ({ viewportAutoRotate: !s.viewportAutoRotate })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleWorkspaceMesh: () => set((s) => ({ showWorkspaceMesh: !s.showWorkspaceMesh })),
  toggleZmp: () => set((s) => ({ showZmp: !s.showZmp })),
  setMode: (m) => set({ mode: m }),

  setArmPose: (pose) =>
    set((s) => ({
      armPose: {
        shoulderPitchDeg: clamp(
          pose.shoulderPitchDeg ?? s.armPose.shoulderPitchDeg,
          -30,
          180,
        ),
        elbowDeg: clamp(pose.elbowDeg ?? s.armPose.elbowDeg, 0, 180),
      },
    })),
  applyPosePreset: (presetId) =>
    set(() => ({
      armPose: { ...POSE_PRESETS[presetId] },
    })),

  // ─── room (REQ-6) ────────────────────────────────────────────────────────
  setRoomSize: (widthCm, depthCm) =>
    set((s) => ({
      room: {
        ...s.room,
        widthCm: clamp(widthCm, 200, 1000),
        depthCm: clamp(depthCm, 200, 1000),
      },
    })),
  loadRoomPreset: (preset) =>
    set({
      room: {
        preset: preset.id,
        widthCm: preset.widthCm,
        depthCm: preset.depthCm,
        furniture: [...preset.furniture],
        obstacles: [...preset.obstacles],
        targets: [...preset.targets],
      },
    }),
  loadScenario: (scenario, presetSpec) => {
    const baseFurniture = presetSpec?.furniture ?? [];
    const baseObstacles = presetSpec?.obstacles ?? [];
    set({
      room: {
        preset: scenario.presetRoomId,
        widthCm: presetSpec?.widthCm ?? 500,
        depthCm: presetSpec?.depthCm ?? 400,
        furniture: [...baseFurniture, ...scenario.furniture],
        obstacles: [...baseObstacles, ...scenario.obstacles],
        targets: [...scenario.targets],
      },
    });
  },
  resetRoom: () => set({ room: DEFAULT_ROOM }),
  addFurniture: (placement) =>
    set((s) => ({ room: { ...s.room, furniture: [...s.room.furniture, placement] } })),
  updateFurniture: (idx, patch) =>
    set((s) => {
      if (!s.room.furniture[idx]) return s;
      const next = [...s.room.furniture];
      next[idx] = { ...next[idx], ...patch };
      return { room: { ...s.room, furniture: next } };
    }),
  removeFurniture: (idx) =>
    set((s) => ({ room: { ...s.room, furniture: s.room.furniture.filter((_, i) => i !== idx) } })),
  addObstacle: (placement) =>
    set((s) => ({ room: { ...s.room, obstacles: [...s.room.obstacles, placement] } })),
  updateObstacle: (idx, patch) =>
    set((s) => {
      if (!s.room.obstacles[idx]) return s;
      const next = [...s.room.obstacles];
      next[idx] = { ...next[idx], ...patch };
      return { room: { ...s.room, obstacles: next } };
    }),
  removeObstacle: (idx) =>
    set((s) => ({ room: { ...s.room, obstacles: s.room.obstacles.filter((_, i) => i !== idx) } })),
  addTarget: (target) =>
    set((s) => ({ room: { ...s.room, targets: [...s.room.targets, target] } })),
  updateTarget: (idx, patch) =>
    set((s) => {
      if (!s.room.targets[idx]) return s;
      const next = [...s.room.targets];
      next[idx] = { ...next[idx], ...patch };
      return { room: { ...s.room, targets: next } };
    }),
  removeTarget: (idx) =>
    set((s) => ({ room: { ...s.room, targets: s.room.targets.filter((_, i) => i !== idx) } })),

  setRobotPosition: (xCm, yCm) => set({ robotXCm: xCm, robotYCm: yCm }),
  setRobotYawDeg: (deg) => set({ robotYawDeg: ((deg % 360) + 360) % 360 }),
  setHeldTargetIndex: (idx) => set({ heldTargetIndex: idx }),

  // ─── Scenarios + 평가 actions ───────────────────────────────────────────
  loadTaskScenario: (scenario, preset) =>
    set((s) => {
      // 1. 룸 = preset (있으면) 그 위에 시나리오의 추가 가구/타겟 더하기
      const baseFurniture = preset?.furniture ?? [];
      const baseObstacles = preset?.obstacles ?? [];
      const basePresetTargets = preset?.targets ?? [];
      const newRoom: RoomConfig = {
        preset: preset?.id ?? null,
        widthCm: preset?.widthCm ?? 500,
        depthCm: preset?.depthCm ?? 400,
        furniture: [
          ...baseFurniture,
          ...scenario.extraFurniture.map((f) => ({
            furnitureId: f.furnitureId,
            xCm: f.xCm,
            yCm: f.yCm,
            rotationDeg: f.rotationDeg,
          })),
        ],
        obstacles: [...baseObstacles],
        targets: [
          ...basePresetTargets,
          ...scenario.extraTargets.map((t) => ({
            targetObjectId: t.targetObjectId,
            onFurnitureIndex: null,
            xCm: t.xCm,
            yCm: t.yCm,
            zCm: t.zCm,
          })),
        ],
      };

      // 2. Timeline 교체 (waypoints/gestures 새 ID 부여)
      const newWaypoints = scenario.waypoints.map((w) => ({
        ...w,
        id: makeTimelineId(),
      }));
      const newGestures = scenario.gestures.map((g) => ({
        ...g,
        id: makeTimelineId(),
      }));

      const newTimeline: TimelineState = {
        duration: scenario.durationSec,
        waypoints: newWaypoints.sort((a, b) => a.t - b.t),
        gestures: newGestures.sort((a, b) => a.t - b.t),
        currentTime: 0,
        isPlaying: false,
        playSpeed: 1,
      };

      // 3. 로봇 시작 위치/회전
      return {
        room: newRoom,
        timeline: newTimeline,
        robotXCm: scenario.robotStart.xCm,
        robotYCm: scenario.robotStart.yCm,
        robotYawDeg: scenario.robotStart.yawDeg,
        activeScenarioId: scenario.id,
        heldTargetIndex: null,
        evalResult: null,
        evalIssuesInProgress: [],
        // armPose는 default로
        armPose: { ...DEFAULT_POSE },
      };
    }),

  startEval: () => set({ evalIssuesInProgress: [], evalResult: null }),

  addEvalIssue: (issue) =>
    set((s) => ({ evalIssuesInProgress: [...s.evalIssuesInProgress, issue] })),

  finalizeEval: (currentTimeSec, specSummary) =>
    set((s) => {
      if (!s.activeScenarioId) {
        return { evalIssuesInProgress: [] };
      }
      // import scenario inline to avoid circular dep
      const failureCount = s.evalIssuesInProgress.filter((i) => i.severity === 'fail').length;
      const passed = failureCount === 0;
      return {
        evalResult: {
          scenarioId: s.activeScenarioId,
          scenarioName: s.activeScenarioId, // UI에서 lookup
          passed,
          passedCriteriaCount: passed ? 1 : 0,
          totalCriteriaCount: 1,
          issues: [...s.evalIssuesInProgress],
          durationSec: currentTimeSec,
          specSummary,
          ranAt: new Date().toISOString(),
        },
        evalIssuesInProgress: [],
      };
    }),

  clearEvalResult: () => set({ evalResult: null, evalIssuesInProgress: [] }),

  // ─── Timeline actions ───────────────────────────────────────────────────
  // 모든 mutation은 deriveCurrentFrame로 visual 즉시 반영 (waypoint 추가/편집/스크럽 시
  // 로봇 위치·자세가 새 timeline 상태에 맞춰 갱신됨).
  addWaypoint: (wp) =>
    set((s) => {
      const newWaypoints = [...s.timeline.waypoints, { ...wp, id: makeTimelineId() }].sort(
        (a, b) => a.t - b.t,
      );
      return deriveCurrentFrame({
        timeline: { ...s.timeline, waypoints: newWaypoints },
      });
    }),
  updateWaypoint: (id, patch) =>
    set((s) => {
      const newWaypoints = s.timeline.waypoints
        .map((w) => (w.id === id ? { ...w, ...patch } : w))
        .sort((a, b) => a.t - b.t);
      return deriveCurrentFrame({
        timeline: { ...s.timeline, waypoints: newWaypoints },
      });
    }),
  removeWaypoint: (id) =>
    set((s) =>
      deriveCurrentFrame({
        timeline: { ...s.timeline, waypoints: s.timeline.waypoints.filter((w) => w.id !== id) },
      }),
    ),
  addGestureKeyframe: (g) =>
    set((s) => {
      const newGestures = [...s.timeline.gestures, { ...g, id: makeTimelineId() }].sort(
        (a, b) => a.t - b.t,
      );
      return deriveCurrentFrame({
        timeline: { ...s.timeline, gestures: newGestures },
      });
    }),
  updateGestureKeyframe: (id, patch) =>
    set((s) => {
      const newGestures = s.timeline.gestures
        .map((g) => (g.id === id ? { ...g, ...patch } : g))
        .sort((a, b) => a.t - b.t);
      return deriveCurrentFrame({
        timeline: { ...s.timeline, gestures: newGestures },
      });
    }),
  removeGestureKeyframe: (id) =>
    set((s) =>
      deriveCurrentFrame({
        timeline: { ...s.timeline, gestures: s.timeline.gestures.filter((g) => g.id !== id) },
      }),
    ),
  setTimelineDuration: (sec) =>
    set((s) => ({ timeline: { ...s.timeline, duration: clamp(sec, 1, 300) } })),
  setTimelineCurrentTime: (sec) =>
    set((s) =>
      deriveCurrentFrame({
        timeline: { ...s.timeline, currentTime: clamp(sec, 0, s.timeline.duration) },
      }),
    ),
  setTimelinePlaying: (playing) =>
    set((s) => ({ timeline: { ...s.timeline, isPlaying: playing } })),
  setTimelinePlaySpeed: (sp) => set((s) => ({ timeline: { ...s.timeline, playSpeed: sp } })),
  advanceTimeline: (deltaSec) =>
    set((s) => {
      const tl = s.timeline;
      let nextT = tl.currentTime + deltaSec * tl.playSpeed;
      if (nextT >= tl.duration) {
        nextT = nextT % tl.duration; // loop
      }
      return deriveCurrentFrame({
        timeline: { ...tl, currentTime: nextT },
      });
    }),
  resetTimeline: () =>
    set((s) =>
      deriveCurrentFrame({
        timeline: { ...DEFAULT_TIMELINE, duration: s.timeline.duration },
      }),
    ),

  reset: () =>
    set({
      product: { ...INITIAL_PRODUCT, arms: [DEFAULT_ARM_CENTER] },
      room: DEFAULT_ROOM,
      payloadKg: 0.2,
      mode: 'product3d',
      viewportAutoRotate: false,
      showLabels: false,
      showWorkspaceMesh: true,
      showZmp: true,
      armPose: { ...DEFAULT_POSE },
      robotXCm: null,
      robotYCm: null,
      robotYawDeg: 0,
      heldTargetIndex: null,
      timeline: { ...DEFAULT_TIMELINE },
      activeScenarioId: null,
      evalResult: null,
      evalIssuesInProgress: [],
    }),
}));
