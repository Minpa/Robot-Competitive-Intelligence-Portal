/**
 * Generic kinematic chain — URDF-style link/joint tree.
 *
 * 형태소(form factor) 무관한 표현. vacuum + arm, humanoid, quadruped,
 * 산업용 6-DOF arm 모두 같은 코드로 처리.
 *
 * 핵심 개념:
 *   - Link: 단단한 신체 segment. origin은 부모 joint의 child 부착점.
 *           Geometry는 link의 +Y 방향으로 length만큼 뻗는다는 가정.
 *   - Joint: 두 link 사이 transform. type=revolute|prismatic|fixed.
 *           Origin은 부모 link 좌표계에서 child link 부착점.
 *           Axis는 joint local frame 기준 회전·직선 축.
 *   - Chain: link/joint 맵 + root link id. 트리 구조 (각 link은 0..N children).
 *   - State: joint id → 현재 값 (rad / m). chain 구조와 분리.
 *   - FK: chain + state → 각 link의 world transform.
 *
 * 일반 IK는 별도 파일 (chain-ik.ts)로 분리 — Jacobian / CCD / FABRIK 등.
 */

import * as THREE from 'three';

export type JointType = 'revolute' | 'prismatic' | 'fixed';

/** Joint 정의 — 부모 link로부터의 transform + 1 DOF 축 (revolute/prismatic). */
export interface Joint {
  id: string;
  type: JointType;
  /** child link id — joint는 정확히 한 child link를 가짐 */
  childLinkId: string;
  /** joint origin in parent link frame: translation + 정적 rotation
   *  (rotation은 quaternion [x, y, z, w] 또는 euler [rx, ry, rz] in radians).
   *  대부분은 translation만으로 충분 — link length만큼 +Y 이동. */
  origin: {
    translation: [number, number, number];
    rotation?: [number, number, number, number]; // quaternion
  };
  /** revolute = 회전축 / prismatic = 이동축 (joint local frame, 단위벡터) */
  axis: [number, number, number];
  /** joint value 범위 (revolute: rad / prismatic: m) */
  limits: { min: number; max: number };
  /** spec catalog에서 actuator/spring sku 참조용 (optional) */
  actuatorSku?: string;
}

/** Link 정의 — 부모 joint(없으면 root)로부터 펼쳐지는 강체. */
export interface Link {
  id: string;
  /** root link은 null. 그 외 부모 joint id 필수. */
  parentJointId: string | null;
  /** geometry — render + 토크/CoM 계산용. +Y 방향으로 length만큼 뻗음.
   *  복잡한 mesh는 별도 visual 시스템에서 처리, 여기는 동역학 단순화 모델. */
  geometry: {
    lengthM: number;
    /** 단면 (사각 가정): widthM × thicknessM. 더 정밀 모델 필요시 mesh + inertia tensor */
    widthM: number;
    thicknessM: number;
  };
  massKg: number;
  /** 자식 joint들 — link 한 개에 여러 joint 붙을 수 있음 (humanoid torso = neck + 양팔 등) */
  childJointIds: string[];
  /** display label (UI 슬라이더 라벨 등) */
  label?: string;
}

/** Chain — link + joint의 트리 구조. */
export interface KinematicChain {
  rootLinkId: string;
  links: Record<string, Link>;
  joints: Record<string, Joint>;
}

/** Chain state — 각 revolute/prismatic joint의 현재 값.
 *  fixed joint는 등록 안 함 (값 없음). */
export interface ChainState {
  /** joint id → 값 (revolute=rad / prismatic=m) */
  jointValues: Record<string, number>;
  /** root link이 world에 놓이는 위치 + 회전 */
  rootPose: {
    translation: [number, number, number];
    /** Y축 회전(yaw) 단순화. 더 일반적이면 quaternion으로 확장. */
    yawRad: number;
  };
}

/** FK 결과 — 각 link의 world transform. */
export interface FKResult {
  /** link id → world matrix (4x4) */
  linkWorldMatrices: Map<string, THREE.Matrix4>;
  /** joint id → world matrix (joint origin in world) */
  jointWorldMatrices: Map<string, THREE.Matrix4>;
}

/* ─── FK ────────────────────────────────────────────────────────────────── */

/**
 * Forward kinematics — chain 트리 traversal로 모든 link의 world transform 계산.
 *
 * 각 link의 world transform은:
 *   parent_link.world * parent_joint.origin * joint.transform(value) * link.local
 *
 * 여기서:
 *   - parent_joint.origin: parent link frame에서 joint 부착점 위치 (정적)
 *   - joint.transform(value): revolute는 axis 주위 회전, prismatic은 axis 따라 이동
 *   - link.local: joint frame에서 link origin (보통 identity — link은 joint 끝에서 시작)
 */
export function computeFK(chain: KinematicChain, state: ChainState): FKResult {
  const linkWorldMatrices = new Map<string, THREE.Matrix4>();
  const jointWorldMatrices = new Map<string, THREE.Matrix4>();

  // root link world transform
  const rootMat = new THREE.Matrix4();
  rootMat.makeTranslation(...state.rootPose.translation);
  if (state.rootPose.yawRad !== 0) {
    const rotMat = new THREE.Matrix4().makeRotationY(state.rootPose.yawRad);
    rootMat.multiply(rotMat);
  }
  linkWorldMatrices.set(chain.rootLinkId, rootMat);

  // BFS traversal
  const queue: string[] = [chain.rootLinkId];
  while (queue.length > 0) {
    const linkId = queue.shift()!;
    const link = chain.links[linkId];
    if (!link) continue;
    const linkWorld = linkWorldMatrices.get(linkId);
    if (!linkWorld) continue;

    for (const jointId of link.childJointIds) {
      const joint = chain.joints[jointId];
      if (!joint) continue;

      // joint origin in parent link frame
      const jointOriginLocal = new THREE.Matrix4();
      jointOriginLocal.makeTranslation(
        joint.origin.translation[0],
        joint.origin.translation[1],
        joint.origin.translation[2],
      );
      if (joint.origin.rotation) {
        const q = new THREE.Quaternion(
          joint.origin.rotation[0],
          joint.origin.rotation[1],
          joint.origin.rotation[2],
          joint.origin.rotation[3],
        );
        const rotMat = new THREE.Matrix4().makeRotationFromQuaternion(q);
        jointOriginLocal.multiply(rotMat);
      }

      // joint origin world
      const jointWorld = new THREE.Matrix4().multiplyMatrices(linkWorld, jointOriginLocal);
      jointWorldMatrices.set(jointId, jointWorld);

      // joint transform (DOF)
      const jointDOFMat = computeJointTransform(joint, state.jointValues[jointId] ?? 0);

      // child link world = joint world * joint DOF
      const childWorld = new THREE.Matrix4().multiplyMatrices(jointWorld, jointDOFMat);
      linkWorldMatrices.set(joint.childLinkId, childWorld);

      queue.push(joint.childLinkId);
    }
  }

  return { linkWorldMatrices, jointWorldMatrices };
}

/** Joint type별 transform — value(rad/m) → 4x4 matrix. */
function computeJointTransform(joint: Joint, value: number): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  if (joint.type === 'fixed') {
    return m; // identity
  }
  const axis = new THREE.Vector3(joint.axis[0], joint.axis[1], joint.axis[2]).normalize();
  if (joint.type === 'revolute') {
    m.makeRotationAxis(axis, value);
  } else {
    // prismatic
    m.makeTranslation(axis.x * value, axis.y * value, axis.z * value);
  }
  return m;
}

/* ─── 편의 함수 ─────────────────────────────────────────────────────────── */

/** Link의 distal end (link이 +Y로 lengthM만큼 뻗는 가정) world position. */
export function getLinkDistalEnd(
  fkResult: FKResult,
  chain: KinematicChain,
  linkId: string,
): THREE.Vector3 | null {
  const link = chain.links[linkId];
  if (!link) return null;
  const m = fkResult.linkWorldMatrices.get(linkId);
  if (!m) return null;
  const distalLocal = new THREE.Vector3(0, link.geometry.lengthM, 0);
  return distalLocal.applyMatrix4(m);
}

/** Link 중심점 (CoM 단순 추정 — geometric center) world position. */
export function getLinkCenter(
  fkResult: FKResult,
  chain: KinematicChain,
  linkId: string,
): THREE.Vector3 | null {
  const link = chain.links[linkId];
  if (!link) return null;
  const m = fkResult.linkWorldMatrices.get(linkId);
  if (!m) return null;
  const centerLocal = new THREE.Vector3(0, link.geometry.lengthM / 2, 0);
  return centerLocal.applyMatrix4(m);
}

/** Chain 전체 무게 중심 (각 link mass · center 가중평균). */
export function computeChainCoM(
  fkResult: FKResult,
  chain: KinematicChain,
): { position: THREE.Vector3; totalMassKg: number } {
  const accum = new THREE.Vector3();
  let totalMass = 0;
  for (const linkId of Object.keys(chain.links)) {
    const link = chain.links[linkId];
    const center = getLinkCenter(fkResult, chain, linkId);
    if (!center) continue;
    accum.add(center.multiplyScalar(link.massKg));
    totalMass += link.massKg;
  }
  if (totalMass > 0) accum.divideScalar(totalMass);
  return { position: accum, totalMassKg: totalMass };
}

/** Chain의 leaf link들 (child joint 없는 link = end-effector 후보). */
export function getLeafLinkIds(chain: KinematicChain): string[] {
  return Object.values(chain.links)
    .filter((l) => l.childJointIds.length === 0)
    .map((l) => l.id);
}
