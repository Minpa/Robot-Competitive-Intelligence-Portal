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
} from '../types/product';

const DEFAULT_ROOM: RoomConfig = {
  preset: null,
  widthCm: 500,
  depthCm: 400,
  furniture: [],
  obstacles: [],
  targets: [],
};

export type WorkbenchMode = 'product3d' | 'roomEditor';

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

const INITIAL_PRODUCT: ProductConfig = {
  name: '후보 A',
  base: DEFAULT_BASE,
  arms: [],
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

  setBaseShape: (shape) =>
    set((s) => ({ product: { ...s.product, base: { ...s.product.base, shape } } })),

  setBaseHeightCm: (cm) =>
    set((s) => ({
      product: { ...s.product, base: { ...s.product.base, heightCm: clamp(cm, 8, 30) } },
    })),

  setBaseDiameterOrWidthCm: (cm) =>
    set((s) => ({
      product: {
        ...s.product,
        base: { ...s.product.base, diameterOrWidthCm: clamp(cm, 25, 40) },
      },
    })),

  setBaseWeightKg: (kg) =>
    set((s) => ({
      product: { ...s.product, base: { ...s.product.base, weightKg: clamp(kg, 3, 8) } },
    })),

  setHasLiftColumn: (yes) =>
    set((s) => ({
      product: {
        ...s.product,
        base: {
          ...s.product.base,
          hasLiftColumn: yes,
          liftColumnMaxExtensionCm: yes ? Math.max(s.product.base.liftColumnMaxExtensionCm, 1) : 0,
        },
      },
    })),

  setLiftColumnMaxExtensionCm: (cm) =>
    set((s) => ({
      product: {
        ...s.product,
        base: { ...s.product.base, liftColumnMaxExtensionCm: clamp(cm, 0, 30) },
      },
    })),

  setArmCount: (n) =>
    set((s) => {
      const current = s.product.arms;
      if (n === 0) return { product: { ...s.product, arms: [] } };
      if (n === 1) {
        return {
          product: { ...s.product, arms: [current[0] ?? { ...DEFAULT_ARM_LEFT, mountPosition: 'center' }] },
        };
      }
      // n === 2
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
      const next = [...s.product.arms];
      next[index] = { ...next[index], ...patch };
      // clamp lengths to [15, 40] cm and DOF to [0, 3] (spec §4.2)
      if (patch.upperArmLengthCm !== undefined)
        next[index].upperArmLengthCm = clamp(patch.upperArmLengthCm, 15, 40);
      if (patch.forearmLengthCm !== undefined)
        next[index].forearmLengthCm = clamp(patch.forearmLengthCm, 15, 40);
      if (patch.shoulderHeightAboveBaseCm !== undefined)
        next[index].shoulderHeightAboveBaseCm = clamp(patch.shoulderHeightAboveBaseCm, 0, 20);
      if (patch.wristDof !== undefined)
        next[index].wristDof = Math.max(0, Math.min(3, Math.round(patch.wristDof)));
      return { product: { ...s.product, arms: next } };
    }),

  setArmMount: (index, mount) =>
    set((s) => {
      if (!s.product.arms[index]) return s;
      const next = [...s.product.arms];
      next[index] = { ...next[index], mountPosition: mount };
      return { product: { ...s.product, arms: next } };
    }),

  setProductName: (name) => set((s) => ({ product: { ...s.product, name } })),

  setPayloadKg: (kg) => set({ payloadKg: clamp(kg, 0, 5) }),

  toggleAutoRotate: () => set((s) => ({ viewportAutoRotate: !s.viewportAutoRotate })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleWorkspaceMesh: () => set((s) => ({ showWorkspaceMesh: !s.showWorkspaceMesh })),
  toggleZmp: () => set((s) => ({ showZmp: !s.showZmp })),
  setMode: (m) => set({ mode: m }),

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

  reset: () =>
    set({
      product: INITIAL_PRODUCT,
      room: DEFAULT_ROOM,
      payloadKg: 0.2,
      mode: 'product3d',
      viewportAutoRotate: false,
      showLabels: false,
      showWorkspaceMesh: true,
      showZmp: true,
    }),
}));
