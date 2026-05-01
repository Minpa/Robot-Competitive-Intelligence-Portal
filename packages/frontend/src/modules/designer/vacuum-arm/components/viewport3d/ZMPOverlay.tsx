'use client';

/**
 * ZMPOverlay · REQ-5
 *
 * Renders the base footprint polygon (just above the floor) + the ZMP
 * point + a thin connector line. Color codes:
 *   inside footprint, margin > 5cm   → 초록  (#3acc6f)
 *   inside, margin ≤ 5cm             → 노랑  (#F2A93B)
 *   outside footprint                → 빨강  (#E63950)
 *
 * Coordinates: stability service returns cm in base-center frame (X/Y in
 * the spec; here we use X/Z in scene frame). Floor sits at y=0; we float
 * the polygon by 2mm so it doesn't z-fight with the grid.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { StabilityResult } from '../../types/product';

const CM_TO_M = 0.01;
const FLOOR_Y_M = 0.002;

function statusColor(stab: StabilityResult): string {
  if (!stab.isStable) return '#E63950';
  if (stab.marginToEdgeCm <= 5) return '#F2A93B';
  return '#3acc6f';
}

export function ZMPOverlay({ stability, visible = true }: { stability: StabilityResult; visible?: boolean }) {
  const color = statusColor(stability);

  // Footprint polygon → triangle fan around the centroid for fill.
  const fillGeometry = useMemo(() => {
    const poly = stability.footprintPolygonCm;
    const geom = new BufferGeometry();
    if (poly.length < 3) return geom;
    // Centroid
    let cx = 0;
    let cz = 0;
    for (const [x, z] of poly) {
      cx += x;
      cz += z;
    }
    cx = (cx / poly.length) * CM_TO_M;
    cz = (cz / poly.length) * CM_TO_M;
    const verts: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      verts.push(cx, FLOOR_Y_M, cz);
      verts.push(a[0] * CM_TO_M, FLOOR_Y_M, a[1] * CM_TO_M);
      verts.push(b[0] * CM_TO_M, FLOOR_Y_M, b[1] * CM_TO_M);
    }
    geom.setAttribute('position', new Float32BufferAttribute(verts, 3));
    geom.computeVertexNormals();
    return geom;
  }, [stability.footprintPolygonCm]);

  // Outline points for a Line — visible boundary even when fill is faint.
  const outlinePoints = useMemo(() => {
    const pts: THREE.Vector3[] = stability.footprintPolygonCm.map(
      ([x, z]) => new THREE.Vector3(x * CM_TO_M, FLOOR_Y_M + 0.001, z * CM_TO_M)
    );
    if (pts.length > 0) pts.push(pts[0].clone());
    return pts;
  }, [stability.footprintPolygonCm]);

  if (!visible) return null;

  const zmpX = stability.zmpXCm * CM_TO_M;
  const zmpZ = stability.zmpYCm * CM_TO_M;

  return (
    <group>
      {/* Filled footprint polygon (translucent triangle fan) */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <mesh geometry={fillGeometry as any}>
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Outline */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(outlinePoints.flatMap((v) => [v.x, v.y, v.z])), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} linewidth={2} />
      </line>

      {/* ZMP marker — small floating sphere with vertical drop line */}
      <mesh position={[zmpX, FLOOR_Y_M + 0.01, zmpZ]}>
        <sphereGeometry args={[0.012, 16, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[zmpX, FLOOR_Y_M + 0.005, zmpZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.014, 0.022, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} />
      </mesh>
    </group>
  );
}
