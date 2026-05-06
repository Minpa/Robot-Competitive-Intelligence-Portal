// AUTO-GENERATED. Do not edit by hand.
// Regenerate with: pnpm --filter backend tsx ../../scripts/enrich-cloid-gripper.ts
// Source: scripts/enrich-cloid-gripper.ts (calls Claude Opus to classify required gripper per sub-cell).
//
// Until the script is run, this file is empty and the modal falls back to heuristic keyword extraction.

import type { RequiredGripper } from './data';

export interface GripperRecord {
  generatedAt: string;       // ISO timestamp
  model: string;             // 예: 'claude-opus-4-7'
  cellId: string;            // CloidCoverageCell.id
  lv: 1 | 2 | 3 | 4;
  gripper: RequiredGripper;
}

export const GRIPPER_DATA: GripperRecord[] = [];

export const GRIPPER_INDEX: Record<string, RequiredGripper> = Object.fromEntries(
  GRIPPER_DATA.map((r) => [`${r.cellId}-Lv${r.lv}`, r.gripper]),
);

export function lookupRequiredGripper(
  cellId: string,
  lv: number,
): RequiredGripper | undefined {
  return GRIPPER_INDEX[`${cellId}-Lv${lv}`];
}

export const GRIPPER_GENERATED_META: { generatedAt: string | null; model: string | null; count: number } = {
  generatedAt: GRIPPER_DATA[0]?.generatedAt ?? null,
  model: GRIPPER_DATA[0]?.model ?? null,
  count: GRIPPER_DATA.length,
};
