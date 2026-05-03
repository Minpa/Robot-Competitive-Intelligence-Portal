'use client';

/**
 * Physics 통합 (@react-three/rapier · WASM 기반).
 *
 * 패턴:
 *   - Room3DViewport의 Canvas 안에서 <PhysicsScene>으로 wrap
 *   - 바닥/벽: 고정 collider (fixed)
 *   - 가구·장애물·타겟: PhysicalDraggableObject — dynamic body, drag로 배치 가능,
 *     로봇이 부딪히면 밀려남
 *   - 로봇 베이스: KinematicRobotBody — kinematic body, store의 robotXCm/yCm을
 *     useFrame으로 따라가며 다른 dynamic body와 collide → 가구 밀어냄
 *
 * 가구는 X/Z 회전 잠금 (안 쓰러짐), Y 회전만 허용 (수평 회전 가능).
 * Drag는 body의 setTranslation으로 즉시 teleport (linvel/angvel zero).
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  Physics,
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
} from '@react-three/rapier';
import { useDesignerVacuumStore } from '../stores/designer-vacuum-store';
import {
  computeWristWorldPosition,
  isGripperClosedAtTime,
  getExplicitTargetAtTime,
} from './grasp-engine';

interface PhysicsSceneProps {
  /** 시각 디버그용 collider wireframe */
  debug?: boolean;
  children: ReactNode;
}

export function PhysicsScene({ debug = false, children }: PhysicsSceneProps) {
  return (
    <Physics gravity={[0, -9.81, 0]} debug={debug} timeStep={1 / 60}>
      {children}
    </Physics>
  );
}

/* ─── Floor: y=0 평면 + 두꺼운 collider (가구가 빠지지 않게) ───────────── */

interface FloorProps {
  widthM: number;
  depthM: number;
}

export function PhysicsFloor({ widthM, depthM }: FloorProps) {
  return (
    <RigidBody type="fixed" colliders={false} position={[0, -0.05, 0]}>
      <CuboidCollider args={[widthM * 2, 0.05, depthM * 2]} friction={0.8} restitution={0} />
    </RigidBody>
  );
}

/* ─── Walls: 방 4면 collider ──────────────────────────────────────────── */

interface WallsProps {
  widthM: number;
  depthM: number;
  heightM?: number;
}

export function PhysicsWalls({ widthM, depthM, heightM = 0.4 }: WallsProps) {
  const wallT = 0.05;
  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[0, heightM / 2, -depthM / 2 - wallT / 2]}>
        <CuboidCollider args={[widthM / 2 + wallT, heightM / 2, wallT / 2]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[0, heightM / 2, depthM / 2 + wallT / 2]}>
        <CuboidCollider args={[widthM / 2 + wallT, heightM / 2, wallT / 2]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[-widthM / 2 - wallT / 2, heightM / 2, 0]}>
        <CuboidCollider args={[wallT / 2, heightM / 2, depthM / 2]} />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} position={[widthM / 2 + wallT / 2, heightM / 2, 0]}>
        <CuboidCollider args={[wallT / 2, heightM / 2, depthM / 2]} />
      </RigidBody>
    </>
  );
}

/* ─── PhysicalDraggableObject ──────────────────────────────────────────────
 * 가구·장애물·타겟용 dynamic body wrapper. 다음을 한 컴포넌트에서 처리:
 *   - dynamic RigidBody (회전 옵션, friction, damping)
 *   - 초기 위치/회전 (props)
 *   - 외부 props 변경 시 body sync (2D 에디터 ↔ 3D)
 *   - drag: pointer events로 body teleport (setTranslation + linvel zero)
 *   - hover/drag 시각 단서 (바닥 ring)
 *
 * sizeM = [width, height, depth] (월드 m). visual children은 body local frame
 * 에서 바닥 (y=0)부터 +Y로 자라난다고 가정 (group offset으로 보정).
 * ─────────────────────────────────────────────────────────────────────────── */

interface PhysicalDraggableObjectProps {
  initialX: number;
  initialZ: number;
  rotationY: number;
  sizeM: [number, number, number];
  onPositionChange: (worldX: number, worldZ: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** 회전 자유도 (X, Y, Z) — default: Y만 허용 (가구가 안 쓰러짐) */
  enabledRotations?: [boolean, boolean, boolean];
  /** 질량 — 가벼운 타겟(작은 물체)은 작게 (0.3kg), 가구는 크게 (10kg+) */
  massKg?: number;
  children: ReactNode;
}

export function PhysicalDraggableObject({
  initialX,
  initialZ,
  rotationY,
  sizeM,
  onPositionChange,
  onDragStart,
  onDragEnd,
  enabledRotations = [false, true, false],
  massKg = 10,
  children,
}: PhysicalDraggableObjectProps) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  // 외부 위치 변경 (2D 에디터에서 옮김)을 body에 반영. Drag 중이 아닐 때만.
  useEffect(() => {
    if (dragging) return;
    const body = bodyRef.current;
    if (!body) return;
    body.setTranslation({ x: initialX, y: sizeM[1] / 2, z: initialZ }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialX, initialZ]);

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={[initialX, sizeM[1] / 2, initialZ]}
      rotation={[0, rotationY, 0]}
      colliders={false}
      enabledRotations={enabledRotations}
      linearDamping={2.5}
      angularDamping={3.0}
      mass={massKg}
    >
      <CuboidCollider
        args={[sizeM[0] / 2, sizeM[1] / 2, sizeM[2] / 2]}
        friction={0.7}
        restitution={0.0}
      />
      {/* Visual + drag handlers. Body local frame: +Y 위, group offset으로 visual을 바닥에 align */}
      <group
        position={[0, -sizeM[1] / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          setHovered(false);
          if (!dragging) document.body.style.cursor = 'auto';
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.target as Element).setPointerCapture(e.pointerId);
          setDragging(true);
          onDragStart?.();
          document.body.style.cursor = 'grabbing';
        }}
        onPointerUp={(e) => {
          if (!dragging) return;
          try {
            (e.target as Element).releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          setDragging(false);
          onDragEnd?.();
          document.body.style.cursor = hovered ? 'grab' : 'auto';
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          if (!dragging) return;
          const dy = e.ray.direction.y;
          if (Math.abs(dy) < 1e-6) return;
          const t = -e.ray.origin.y / dy;
          if (t <= 0) return;
          const wx = e.ray.origin.x + e.ray.direction.x * t;
          const wz = e.ray.origin.z + e.ray.direction.z * t;
          const body = bodyRef.current;
          if (body) {
            body.setTranslation({ x: wx, y: sizeM[1] / 2, z: wz }, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          }
          onPositionChange(wx, wz);
        }}
      >
        {(hovered || dragging) ? (
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.10, 0.13, 24]} />
            <meshBasicMaterial color={dragging ? '#ffd86b' : '#a8a8a8'} transparent opacity={0.7} />
          </mesh>
        ) : null}
        {children}
      </group>
    </RigidBody>
  );
}

/* ─── KinematicRobotBody ──────────────────────────────────────────────────
 * 로봇 base의 kinematic body. store의 (targetX, targetZ)를 useFrame에서
 * setNextKinematicTranslation으로 적용 → 로봇이 이동하며 dynamic body들
 * (가구)을 자동으로 밀어냄.
 *
 * Drag 처리는 외부 (Room3DViewport)에서 — onPointer events를 children group에
 * 붙여 store position을 갱신하면 자동으로 useFrame이 body 위치 적용.
 * ─────────────────────────────────────────────────────────────────────────── */

interface KinematicRobotBodyProps {
  targetX: number;
  targetZ: number;
  /** Robot yaw 회전 (라디안) — Y축 회전. 0 = +Z 방향. */
  targetYawRad: number;
  diameterM: number;
  heightM: number;
  onDragMove?: (worldX: number, worldZ: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  children: ReactNode;
}

export function KinematicRobotBody({
  targetX,
  targetZ,
  targetYawRad,
  diameterM,
  heightM,
  onDragMove,
  onDragStart,
  onDragEnd,
  children,
}: KinematicRobotBodyProps) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.setNextKinematicTranslation({ x: targetX, y: heightM / 2, z: targetZ });
    // Yaw quaternion (Y축 회전)
    const half = targetYawRad / 2;
    body.setNextKinematicRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) });
  });

  // 초기 위치/회전 동기화
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    body.setTranslation({ x: targetX, y: heightM / 2, z: targetZ }, true);
    const half = targetYawRad / 2;
    body.setRotation({ x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      enabledRotations={[false, true, false]}
    >
      <CuboidCollider args={[diameterM / 2, heightM / 2, diameterM / 2]} friction={0.5} />
      <group
        position={[0, -heightM / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          setHovered(false);
          if (!dragging) document.body.style.cursor = 'auto';
        }}
        onPointerDown={(e) => {
          if (!onDragMove) return;
          e.stopPropagation();
          (e.target as Element).setPointerCapture(e.pointerId);
          setDragging(true);
          onDragStart?.();
          document.body.style.cursor = 'grabbing';
        }}
        onPointerUp={(e) => {
          if (!dragging) return;
          try {
            (e.target as Element).releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          setDragging(false);
          onDragEnd?.();
          document.body.style.cursor = hovered ? 'grab' : 'auto';
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          if (!dragging || !onDragMove) return;
          const dy = e.ray.direction.y;
          if (Math.abs(dy) < 1e-6) return;
          const t = -e.ray.origin.y / dy;
          if (t <= 0) return;
          const wx = e.ray.origin.x + e.ray.direction.x * t;
          const wz = e.ray.origin.z + e.ray.direction.z * t;
          onDragMove(wx, wz);
        }}
      >
        {(hovered || dragging) ? (
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.10, 0.13, 24]} />
            <meshBasicMaterial color={dragging ? '#ffd86b' : '#a8a8a8'} transparent opacity={0.7} />
          </mesh>
        ) : null}
        {children}
      </group>
    </RigidBody>
  );
}

/* ─── GrabbableTarget ─────────────────────────────────────────────────────
 * 타겟 wrapper. PhysicalDraggableObject와 비슷하지만 추가로:
 *   - useFrame에서 store의 timeline.currentTime + gestures를 읽어 자기가 잡혔는지 검사
 *   - 잡혀 있으면 매 프레임 손목 위치로 setTranslation (gravity 무시 효과)
 *   - 자유 상태면 dynamic body로 정상 동작 (중력 + 충돌)
 *
 * targetIndex = room.targets 배열에서의 인덱스.
 * ─────────────────────────────────────────────────────────────────────────── */

interface GrabbableTargetProps {
  targetIndex: number;
  initialX: number;
  initialZ: number;
  rotationY: number;
  sizeM: [number, number, number];
  massKg: number;
  /** 방 좌표(cm) → 월드(m) 변환에 필요 */
  halfWCm: number;
  halfDCm: number;
  onPositionChange: (worldX: number, worldZ: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  children: ReactNode;
}

export function GrabbableTarget({
  targetIndex,
  initialX,
  initialZ,
  rotationY,
  sizeM,
  massKg,
  halfWCm,
  halfDCm,
  onPositionChange,
  onDragStart,
  onDragEnd,
  children,
}: GrabbableTargetProps) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isHeldVisual, setIsHeldVisual] = useState(false);

  // 외부 위치 변경(드래그/2D 에디터)을 body에 반영
  useEffect(() => {
    if (dragging) return;
    const body = bodyRef.current;
    if (!body) return;
    body.setTranslation({ x: initialX, y: sizeM[1] / 2, z: initialZ }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialX, initialZ]);

  // 매 프레임: store.heldTargetIndex가 자기와 같으면 손목 위치로 이동.
  // 잡힘 판단은 별도 GrabController가 담당 (proximity-based auto + explicit override).
  useFrame(() => {
    const body = bodyRef.current;
    if (!body) return;
    const state = useDesignerVacuumStore.getState();
    const beingHeld = state.heldTargetIndex === targetIndex;

    if (beingHeld !== isHeldVisual) setIsHeldVisual(beingHeld);
    if (!beingHeld) return;

    const arm = state.product.arms[0];
    if (!arm) return;

    const robotXM = ((state.robotXCm ?? halfWCm) - halfWCm) * 0.01;
    const robotZM = ((state.robotYCm ?? halfDCm) - halfDCm) * 0.01;
    const robotYawRad = (state.robotYawDeg * Math.PI) / 180;
    const gripPos = computeWristWorldPosition(
      state.product.base,
      arm,
      state.armPose,
      robotXM,
      robotZM,
      robotYawRad,
    );
    body.setTranslation({ x: gripPos.x, y: gripPos.y, z: gripPos.z }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={[initialX, sizeM[1] / 2, initialZ]}
      rotation={[0, rotationY, 0]}
      colliders={false}
      enabledRotations={[true, true, true]}
      linearDamping={2.5}
      angularDamping={3.0}
      mass={Math.max(0.05, massKg)}
    >
      <CuboidCollider
        args={[sizeM[0] / 2, sizeM[1] / 2, sizeM[2] / 2]}
        friction={0.7}
        restitution={0.2}
      />
      <group
        position={[0, -sizeM[1] / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          setHovered(false);
          if (!dragging) document.body.style.cursor = 'auto';
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          (e.target as Element).setPointerCapture(e.pointerId);
          setDragging(true);
          onDragStart?.();
          document.body.style.cursor = 'grabbing';
        }}
        onPointerUp={(e) => {
          if (!dragging) return;
          try {
            (e.target as Element).releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          setDragging(false);
          onDragEnd?.();
          document.body.style.cursor = hovered ? 'grab' : 'auto';
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          const dy = e.ray.direction.y;
          if (Math.abs(dy) < 1e-6) return;
          const t = -e.ray.origin.y / dy;
          if (t <= 0) return;
          const wx = e.ray.origin.x + e.ray.direction.x * t;
          const wz = e.ray.origin.z + e.ray.direction.z * t;
          const body = bodyRef.current;
          if (body) {
            body.setTranslation({ x: wx, y: sizeM[1] / 2, z: wz }, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          }
          onPositionChange(wx, wz);
        }}
      >
        {(hovered || dragging || isHeldVisual) ? (
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08, 0.11, 24]} />
            <meshBasicMaterial
              color={isHeldVisual ? '#ffd86b' : '#a8a8a8'}
              transparent
              opacity={0.85}
            />
          </mesh>
        ) : null}
        {children}
      </group>
    </RigidBody>
  );
}

/* ─── GrabController ──────────────────────────────────────────────────────
 * 매 프레임 다음을 처리:
 *   1. 명시적 GRAB(targetIndex 지정)이 있으면 그것을 사용 (override).
 *   2. 아니면 그리퍼 closed 상태에서 반경 GRIP_RADIUS_M 이내 closest target 자동 attach.
 *   3. 그리퍼 open 상태이거나 잡고 있던 게 RELEASE_RADIUS_M보다 멀어지면 detach.
 *
 * Physics scene 안의 Canvas 자식으로 mount되어야 함 (useFrame 사용).
 * ─────────────────────────────────────────────────────────────────────────── */

const GRIP_RADIUS_M = 0.18; // 18cm — 그리퍼 닫혔을 때 잡을 수 있는 거리
const RELEASE_RADIUS_M = 0.30; // 30cm — 잡고 있다가 이 거리 넘으면 자동 detach

interface GrabControllerProps {
  /** 방 좌표(cm) → 월드(m) 변환에 필요 */
  halfWCm: number;
  halfDCm: number;
}

export function GrabController({ halfWCm, halfDCm }: GrabControllerProps) {
  useFrame(() => {
    const state = useDesignerVacuumStore.getState();
    const arm = state.product.arms[0];
    if (!arm) {
      if (state.heldTargetIndex !== null) state.setHeldTargetIndex(null);
      return;
    }

    // Gripper 위치 (FK)
    const robotXM = ((state.robotXCm ?? halfWCm) - halfWCm) * 0.01;
    const robotZM = ((state.robotYCm ?? halfDCm) - halfDCm) * 0.01;
    const robotYawRad = (state.robotYawDeg * Math.PI) / 180;
    const gripPos = computeWristWorldPosition(
      state.product.base,
      arm,
      state.armPose,
      robotXM,
      robotZM,
      robotYawRad,
    );

    // Gripper 상태 (timeline 기반)
    const closed = isGripperClosedAtTime(state.timeline.gestures, state.timeline.currentTime);
    const explicit = getExplicitTargetAtTime(state.timeline.gestures, state.timeline.currentTime);

    if (!closed) {
      // Open → 무엇도 잡지 않음
      if (state.heldTargetIndex !== null) state.setHeldTargetIndex(null);
      return;
    }

    // 명시적 target 지정이 있으면 우선
    if (explicit !== null) {
      if (state.heldTargetIndex !== explicit) state.setHeldTargetIndex(explicit);
      return;
    }

    // 자동 모드: 현재 잡고 있는 게 있으면 release 거리 안인지 확인
    const targets = state.room.targets;
    if (state.heldTargetIndex !== null) {
      const t = targets[state.heldTargetIndex];
      if (!t) {
        state.setHeldTargetIndex(null);
        return;
      }
      const tWX = (t.xCm - halfWCm) * 0.01;
      const tWZ = (t.yCm - halfDCm) * 0.01;
      // 잡혀있는 동안에는 GrabbableTarget이 위치를 손목으로 끌어당기므로 항상 가까움.
      // 하지만 실제 body 위치 대신 spec 위치를 쓰면 의미가 없음.
      // 단순화: 한 번 잡으면 RELEASE 전까진 유지 (closed인 동안).
      // (proximity check는 잡기 전에만 적용)
      void tWX; void tWZ; void RELEASE_RADIUS_M;
      return;
    }

    // 자동 모드: closest target in range를 찾음
    let closestIdx: number | null = null;
    let closestDistSq = GRIP_RADIUS_M * GRIP_RADIUS_M;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const tWX = (t.xCm - halfWCm) * 0.01;
      const tWZ = (t.yCm - halfDCm) * 0.01;
      const tWY = Math.max(t.zCm, 0.5) * 0.01;
      const dx = gripPos.x - tWX;
      const dy = gripPos.y - tWY;
      const dz = gripPos.z - tWZ;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestIdx = i;
      }
    }
    if (closestIdx !== null) {
      state.setHeldTargetIndex(closestIdx);
    }
  });

  return null;
}
