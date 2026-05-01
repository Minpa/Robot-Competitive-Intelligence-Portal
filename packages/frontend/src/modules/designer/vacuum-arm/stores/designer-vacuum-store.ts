/**
 * ARGOS-Designer · vacuum-arm Zustand store (Phase 1 PoC v1.2)
 *
 * Module-scoped UI state. Server state (catalog) lives in React Query —
 * this store only tracks the user's spec input + viewport options.
 */

import { create } from 'zustand';
import type { ProductConfig, VacuumBaseSpec, ManipulatorArmSpec } from '../types/product';

const DEFAULT_BASE: VacuumBaseSpec = {
  shape: 'disc',
  heightCm: 10, // ~ LG 로보킹 envelope
  diameterOrWidthCm: 35,
  weightKg: 4.0,
  hasLiftColumn: false,
  liftColumnMaxExtensionCm: 0,
};

const INITIAL_PRODUCT: ProductConfig = {
  name: '후보 A',
  base: DEFAULT_BASE,
  arms: [],
};

interface DesignerVacuumState {
  product: ProductConfig;

  // viewport options
  viewportAutoRotate: boolean;
  showLabels: boolean;

  // base mutators (REQ-1)
  setBaseShape: (shape: VacuumBaseSpec['shape']) => void;
  setBaseHeightCm: (cm: number) => void;
  setBaseDiameterOrWidthCm: (cm: number) => void;
  setBaseWeightKg: (kg: number) => void;
  setHasLiftColumn: (yes: boolean) => void;
  setLiftColumnMaxExtensionCm: (cm: number) => void;

  // arm mutators (placeholder for REQ-2)
  setArms: (arms: ManipulatorArmSpec[]) => void;

  // viewport mutators
  toggleAutoRotate: () => void;
  toggleLabels: () => void;

  setProductName: (name: string) => void;
  reset: () => void;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const useDesignerVacuumStore = create<DesignerVacuumState>((set) => ({
  product: INITIAL_PRODUCT,
  viewportAutoRotate: false,
  showLabels: false,

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

  setArms: (arms) =>
    set((s) => ({ product: { ...s.product, arms: arms.slice(0, 2) } })),

  setProductName: (name) => set((s) => ({ product: { ...s.product, name } })),

  toggleAutoRotate: () => set((s) => ({ viewportAutoRotate: !s.viewportAutoRotate })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),

  reset: () => set({ product: INITIAL_PRODUCT, viewportAutoRotate: false, showLabels: false }),
}));
