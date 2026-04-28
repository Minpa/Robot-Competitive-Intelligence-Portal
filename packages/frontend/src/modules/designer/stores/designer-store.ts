/**
 * ARGOS-Designer · module-local Zustand store
 *
 * Module-scoped UI state. Server state (catalog, evaluations) lives in
 * React Query — this store only tracks user selections and viewport options.
 */

import { create } from 'zustand';
import type { CameraMount, CameraPosition, FormFactorId } from '../types/robot.js';

const DEFAULT_SENSOR_BY_POSITION: Record<CameraPosition, string> = {
  head: 'REALSENSE-MOCK-D435',
  chest: 'STEREO-MOCK-ZED2',
  arm_left: 'TOF-MOCK-IRS2381C',
  arm_right: 'TOF-MOCK-IRS2381C',
};

interface DesignerState {
  // selection
  selectedFormFactorId: FormFactorId | null;
  // REQ-2
  cameras: CameraMount[];
  // REQ-3 / REQ-4
  payloadKg: number;
  // viewport options
  viewportAutoRotate: boolean;
  showLabels: boolean;
  showFovCones: boolean;

  setSelectedFormFactor: (id: FormFactorId) => void;
  toggleCameraPosition: (position: CameraPosition) => void;
  setCameraSensor: (position: CameraPosition, sensorSku: string) => void;
  setPayloadKg: (kg: number) => void;
  toggleAutoRotate: () => void;
  toggleLabels: () => void;
  toggleFovCones: () => void;
  reset: () => void;
}

const INITIAL: Pick<
  DesignerState,
  | 'selectedFormFactorId'
  | 'cameras'
  | 'payloadKg'
  | 'viewportAutoRotate'
  | 'showLabels'
  | 'showFovCones'
> = {
  selectedFormFactorId: null,
  cameras: [{ position: 'head', sensorSku: DEFAULT_SENSOR_BY_POSITION.head }],
  payloadKg: 5,
  viewportAutoRotate: false,
  showLabels: false,
  showFovCones: true,
};

export const useDesignerStore = create<DesignerState>((set) => ({
  ...INITIAL,

  setSelectedFormFactor: (id) => set({ selectedFormFactorId: id }),

  toggleCameraPosition: (position) =>
    set((s) => {
      const has = s.cameras.find((c) => c.position === position);
      if (has) {
        return { cameras: s.cameras.filter((c) => c.position !== position) };
      }
      return {
        cameras: [
          ...s.cameras,
          { position, sensorSku: DEFAULT_SENSOR_BY_POSITION[position] },
        ],
      };
    }),

  setCameraSensor: (position, sensorSku) =>
    set((s) => ({
      cameras: s.cameras.map((c) => (c.position === position ? { ...c, sensorSku } : c)),
    })),

  setPayloadKg: (kg) => set({ payloadKg: Math.max(0, Math.min(50, kg)) }),

  toggleAutoRotate: () => set((s) => ({ viewportAutoRotate: !s.viewportAutoRotate })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleFovCones: () => set((s) => ({ showFovCones: !s.showFovCones })),

  reset: () => set(INITIAL),
}));
