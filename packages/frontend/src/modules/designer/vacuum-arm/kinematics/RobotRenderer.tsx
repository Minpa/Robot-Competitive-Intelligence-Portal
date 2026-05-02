'use client';

/**
 * RobotRenderer · 트리 → 중첩 R3F group 렌더링
 *
 * 각 link는 그 link의 joint origin offset + joint state rotation/translation
 * 만큼 transform된 <group>으로 렌더링되고, 자식 link들은 그 group의 자식으로
 * 들어간다. R3F scene graph가 부모→자식 transform을 자동 곱해주므로
 * Forward Kinematics는 무료 (수동으로 누적할 필요 없음).
 *
 * Joint angle이 바뀌면 해당 group의 rotation만 업데이트되고, 그 아래 모든
 * 자식(end-effector 포함)이 자동으로 따라감 → 그리퍼 부착 방향 항상 정확.
 */

import { Fragment, useMemo } from 'react';
import * as THREE from 'three';
import type { LinkSpec, JointSpec, JointState, VisualSpec } from './robot-tree';
import { LinkVisual } from './visuals';

interface RobotRendererProps {
  tree: LinkSpec[];
  jointState: JointState;
  /** Optional debug toggles. */
  showFrameTriads?: boolean;
}

interface NodeProps {
  link: LinkSpec;
  childrenMap: Map<string, LinkSpec[]>;
  jointState: JointState;
  showFrameTriads: boolean;
}

/** Joint offset → THREE rotation/position 적용 */
function applyJointOriginToGroupProps(joint: JointSpec): {
  position: [number, number, number];
  rotation: [number, number, number];
} {
  return {
    position: joint.originXyz,
    rotation: joint.originRpy,
  };
}

/** Joint state (각도/이동량) → 추가 transform 적용 (revolute/prismatic) */
function applyJointStateToObject(
  joint: JointSpec,
  state: number,
  obj: THREE.Object3D,
): void {
  if (joint.type === 'revolute' && joint.axis) {
    const axis = new THREE.Vector3(...joint.axis).normalize();
    obj.rotateOnAxis(axis, state);
  } else if (joint.type === 'prismatic' && joint.axis) {
    const axis = new THREE.Vector3(...joint.axis).normalize();
    obj.position.add(axis.multiplyScalar(state));
  }
}

function RobotNode({ link, childrenMap, jointState, showFrameTriads }: NodeProps) {
  const { position, rotation } = applyJointOriginToGroupProps(link.joint);
  const children = childrenMap.get(link.name) ?? [];
  const stateValue = link.joint.jointStateKey ? jointState[link.joint.jointStateKey] ?? 0 : 0;

  // joint state가 있는 경우 (revolute/prismatic), origin transform 위에 추가로 적용.
  // R3F의 ref callback으로 joint state transform을 적용 — origin은 group props,
  // joint state는 ref에서 obj.rotateOnAxis 호출.
  return (
    <group
      position={position}
      rotation={rotation}
      ref={(node) => {
        if (!node) return;
        // Reset to origin pose on every render
        node.position.set(...position);
        node.rotation.set(...rotation);
        // Then apply joint state delta
        if (link.joint.jointStateKey) {
          applyJointStateToObject(link.joint, stateValue, node);
        }
      }}
    >
      {/* Visual for this link */}
      {link.visual ? <LinkVisual visual={link.visual} /> : null}

      {/* Frame triad (debug) */}
      {showFrameTriads ? <FrameTriad size={0.04} /> : null}

      {/* Recurse into children */}
      {children.map((child) => (
        <RobotNode
          key={child.name}
          link={child}
          childrenMap={childrenMap}
          jointState={jointState}
          showFrameTriads={showFrameTriads}
        />
      ))}
    </group>
  );
}

export function RobotRenderer({ tree, jointState, showFrameTriads = false }: RobotRendererProps) {
  // parent → children index 한 번만 계산
  const childrenMap = useMemo(() => {
    const map = new Map<string, LinkSpec[]>();
    for (const link of tree) {
      if (link.parent === null) continue;
      const arr = map.get(link.parent) ?? [];
      arr.push(link);
      map.set(link.parent, arr);
    }
    return map;
  }, [tree]);

  const roots = useMemo(() => tree.filter((l) => l.parent === null), [tree]);

  return (
    <Fragment>
      {roots.map((root) => (
        <RobotNode
          key={root.name}
          link={root}
          childrenMap={childrenMap}
          jointState={jointState}
          showFrameTriads={showFrameTriads}
        />
      ))}
    </Fragment>
  );
}

/* ─── 디버그용 frame triad (xyz 축 = 빨/초/파) ───────────────────────────── */

function FrameTriad({ size = 0.05 }: { size?: number }) {
  return (
    <group>
      {/* X = red */}
      <mesh position={[size / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[size * 0.04, size * 0.04, size, 8]} />
        <meshBasicMaterial color="#ff3030" />
      </mesh>
      {/* Y = green */}
      <mesh position={[0, size / 2, 0]}>
        <cylinderGeometry args={[size * 0.04, size * 0.04, size, 8]} />
        <meshBasicMaterial color="#30ff30" />
      </mesh>
      {/* Z = blue */}
      <mesh position={[0, 0, size / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[size * 0.04, size * 0.04, size, 8]} />
        <meshBasicMaterial color="#3060ff" />
      </mesh>
    </group>
  );
}
