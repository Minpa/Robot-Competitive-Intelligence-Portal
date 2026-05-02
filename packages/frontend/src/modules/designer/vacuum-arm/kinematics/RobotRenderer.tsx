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
import type { LinkSpec, JointSpec, JointState } from './robot-tree';
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

/**
 * Origin transform + joint state → 단일 (position, quaternion) 쌍.
 * R3F group props로 직접 전달 (ref callback 사용 안 함 — 그래야 R3F가
 * 안정적으로 자식 transform 갱신).
 *
 * URDF 컨벤션: child_frame = origin_translate × origin_rotate × joint_rotate(state)
 *   - revolute: rotate around axis by state
 *   - prismatic: translate along axis by state
 *   - fixed: 그냥 origin
 */
function computeJointTransform(
  joint: JointSpec,
  state: number,
): { position: [number, number, number]; quaternion: [number, number, number, number] } {
  const pos = new THREE.Vector3(...joint.originXyz);
  const quat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(joint.originRpy[0], joint.originRpy[1], joint.originRpy[2], 'XYZ'),
  );

  if (joint.type === 'revolute' && joint.axis) {
    const axis = new THREE.Vector3(joint.axis[0], joint.axis[1], joint.axis[2]).normalize();
    const stateQuat = new THREE.Quaternion().setFromAxisAngle(axis, state);
    quat.multiply(stateQuat); // origin × joint_state (오른쪽 곱 = local frame에서 적용)
  } else if (joint.type === 'prismatic' && joint.axis) {
    const axis = new THREE.Vector3(joint.axis[0], joint.axis[1], joint.axis[2]).normalize();
    // Translate in CHILD frame (after origin rotation)
    const localTranslate = axis.multiplyScalar(state).applyQuaternion(quat);
    pos.add(localTranslate);
  }

  return {
    position: [pos.x, pos.y, pos.z],
    quaternion: [quat.x, quat.y, quat.z, quat.w],
  };
}

function RobotNode({ link, childrenMap, jointState, showFrameTriads }: NodeProps) {
  const stateValue = link.joint.jointStateKey ? jointState[link.joint.jointStateKey] ?? 0 : 0;
  const children = childrenMap.get(link.name) ?? [];

  // Memoize transform (link spec rarely changes; jointState changes on slider drag)
  const { position, quaternion } = useMemo(
    () => computeJointTransform(link.joint, stateValue),
    [link.joint, stateValue],
  );

  return (
    <group position={position} quaternion={quaternion}>
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
