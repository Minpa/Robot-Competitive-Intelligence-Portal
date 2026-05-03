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
    bodyRef.current?.setNextKinematicTranslation({
      x: targetX,
      y: heightM / 2,
      z: targetZ,
    });
  });

  // 초기 위치 동기화
  useEffect(() => {
    bodyRef.current?.setTranslation({ x: targetX, y: heightM / 2, z: targetZ }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      enabledRotations={[false, false, false]}
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
