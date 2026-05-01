'use client';

/**
 * WorkspaceMesh · REQ-3
 *
 * Renders the reachable region for each arm as a translucent spherical
 * shell (outer sphere − inner sphere) anchored at the shoulder joint.
 *
 * Two arms get distinct colors to match their tip accents.
 *
 * Spec §8 REQ-3:
 *   - 어깨 기준 sphere (L1+L2) - sphere(|L1-L2|) 영역
 *   - 팔 2개면 두 영역 모두 표시 (색상 구분)
 *   - 사양 변경 시 메쉬 자동 갱신 (debounce 200ms — Workbench 단계에서 처리)
 *   - 메쉬 투명도 토글 가능 (here)
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { ManipulatorArmSpec, VacuumBaseSpec } from '../../types/product';

const CM_TO_M = 0.01;

const ARM_COLORS = ['#E63950', '#3a8dde'] as const;

interface WorkspaceMeshProps {
  arms: ManipulatorArmSpec[];
  base: VacuumBaseSpec;
  visible?: boolean;
  /** 0..1, default 0.12. */
  opacity?: number;
}

function shoulderOriginM(arm: ManipulatorArmSpec, base: VacuumBaseSpec): [number, number, number] {
  const baseHeightM = base.heightCm * CM_TO_M;
  const liftM = base.hasLiftColumn ? base.liftColumnMaxExtensionCm * CM_TO_M : 0;
  const shoulderUpM = arm.shoulderHeightAboveBaseCm * CM_TO_M;
  const baseRadiusM = (base.diameterOrWidthCm / 2) * CM_TO_M;
  const offset = baseRadiusM * 0.65;
  const y = baseHeightM + liftM + shoulderUpM;
  switch (arm.mountPosition) {
    case 'center':
      return [0, y, 0];
    case 'front':
      return [0, y, offset];
    case 'left':
      return [-offset, y, 0];
    case 'right':
      return [offset, y, 0];
    default:
      return [0, y, 0];
  }
}

export function WorkspaceMesh({ arms, base, visible = true, opacity = 0.12 }: WorkspaceMeshProps) {
  // Memoize geometry so dragging unrelated state doesn't churn allocations.
  const shells = useMemo(() => {
    return arms.map((arm, i) => {
      const L1 = arm.upperArmLengthCm * CM_TO_M;
      const L2 = arm.forearmLengthCm * CM_TO_M;
      const outer = L1 + L2;
      const inner = Math.abs(L1 - L2);
      return {
        origin: shoulderOriginM(arm, base),
        outer,
        inner,
        color: ARM_COLORS[i] ?? '#E63950',
      };
    });
  }, [arms, base]);

  if (!visible) return null;

  return (
    <group>
      {shells.map((shell, i) => (
        <group key={i} position={shell.origin}>
          {/* Outer reachable sphere — translucent shell surface */}
          <mesh>
            <sphereGeometry args={[shell.outer, 48, 32]} />
            <meshBasicMaterial
              color={shell.color}
              transparent
              opacity={opacity}
              side={THREE.BackSide}
              depthWrite={false}
            />
          </mesh>
          {/* Inner non-reachable cavity — slightly stronger to show 'hole' */}
          {shell.inner > 0.01 ? (
            <mesh>
              <sphereGeometry args={[shell.inner, 32, 24]} />
              <meshBasicMaterial
                color="#0a0a0a"
                transparent
                opacity={Math.min(0.45, opacity * 3)}
                side={THREE.FrontSide}
                depthWrite={false}
              />
            </mesh>
          ) : null}
          {/* Wireframe accent on the outer sphere — equator + meridians for depth cue */}
          <mesh>
            <sphereGeometry args={[shell.outer, 24, 16]} />
            <meshBasicMaterial color={shell.color} wireframe transparent opacity={opacity * 0.8} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
