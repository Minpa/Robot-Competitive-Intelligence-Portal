'use client';

import { Html } from '@react-three/drei';
import type { SkeletonNode } from '../../types/robot';

const DEFAULT_COLOR = '#B8892B';
const HIGHLIGHT_COLOR = '#E63950';

interface SkeletonRendererProps {
  nodes: SkeletonNode[];
  showLabels?: boolean;
  highlightId?: string | null;
}

export function SkeletonRenderer({ nodes, showLabels = false, highlightId = null }: SkeletonRendererProps) {
  return (
    <group>
      {nodes.map((node) => {
        const color = node.id === highlightId ? HIGHLIGHT_COLOR : node.color ?? DEFAULT_COLOR;
        return (
          <group key={node.id} position={node.position} rotation={node.rotation ?? [0, 0, 0]}>
            <Primitive shape={node.shape} size={node.size} color={color} />
            {showLabels && node.label ? (
              <Html
                distanceFactor={6}
                position={[0, (node.size[1] ?? 0) / 2 + 0.06, 0]}
                center
                style={{ pointerEvents: 'none' }}
              >
                <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.18em] text-white/85 bg-black/60 border border-white/15 whitespace-nowrap">
                  {node.label}
                </span>
              </Html>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function Primitive({
  shape,
  size,
  color,
}: {
  shape: SkeletonNode['shape'];
  size: SkeletonNode['size'];
  color: string;
}) {
  if (shape === 'box') {
    return (
      <mesh castShadow receiveShadow>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <meshStandardMaterial color={color} metalness={0.15} roughness={0.55} />
      </mesh>
    );
  }
  if (shape === 'cylinder') {
    const [radius, height] = size;
    return (
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 24]} />
        <meshStandardMaterial color={color} metalness={0.18} roughness={0.5} />
      </mesh>
    );
  }
  // sphere
  const [radius] = size;
  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[radius, 24, 16]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.45} />
    </mesh>
  );
}
