'use client';

import type { GripperKey } from './data';

// 15개 카테고리별 SVG 일러스트 — GripperInfoModal 스타일을 확장.
// 외부 이미지 의존 없이 모든 카테고리를 안정적으로 시각화.

interface Props {
  gripperKey: GripperKey;
  className?: string;
}

export function GripperIllustration({ gripperKey, className = '' }: Props) {
  const Svg = ILLUSTRATIONS[gripperKey];
  return (
    <div className={`w-full h-full flex items-center justify-center bg-[#FAFAF8] ${className}`}>
      <Svg />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 공통 빌딩 블록

const SHAFT = '#888780';
const BODY = '#5F5E5A';
const FINGER = '#3B6D11';
const OBJECT_FILL = '#EAF3DE';
const OBJECT_STROKE = '#3B6D11';
const ACCENT = '#B26A1A';

function ParallelGripper({ x = 90, y = 30, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x - 16 * scale}, ${y}) scale(${scale})`}>
      <rect x={0} y={0} width={32} height={20} rx={3} fill={BODY} />
      <rect x={3} y={20} width={9} height={26} rx={1} fill={FINGER} />
      <rect x={20} y={20} width={9} height={26} rx={1} fill={FINGER} />
    </g>
  );
}

function MultiFingerHand({ x = 90, y = 30, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <circle cx={0} cy={6} r={11} fill={BODY} />
      <rect x={-22} y={2} width={6} height={22} rx={2} fill={FINGER} transform="rotate(-15)" />
      <rect x={-9} y={10} width={6} height={24} rx={2} fill={FINGER} />
      <rect x={3} y={10} width={6} height={24} rx={2} fill={FINGER} />
      <rect x={16} y={2} width={6} height={22} rx={2} fill={FINGER} transform="rotate(15)" />
    </g>
  );
}

function VacuumCup({ x = 90, y = 50, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <rect x={-18} y={0} width={36} height={6} rx={2} fill={BODY} />
      <path d={`M -12 6 L -12 18 Q -12 22 -8 22 L -8 18`} stroke={FINGER} strokeWidth={2} fill="none" />
      <ellipse cx={-10} cy={22} rx={5} ry={2.5} fill={FINGER} opacity={0.7} />
      <path d={`M 12 6 L 12 18 Q 12 22 8 22 L 8 18`} stroke={FINGER} strokeWidth={2} fill="none" />
      <ellipse cx={10} cy={22} rx={5} ry={2.5} fill={FINGER} opacity={0.7} />
    </g>
  );
}

function PalmCamera({ cx, cy, r = 5 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#1f6f8b" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#0a2533" />
      <circle cx={cx + r * 0.25} cy={cy - r * 0.35} r={r * 0.18} fill="#fff" opacity={0.9} />
    </g>
  );
}

function FtSensor({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <rect x={cx - 11} y={cy - 4} width={22} height={8} rx={2} fill="#7d2e3a" />
      <text
        x={cx}
        y={cy + 2.5}
        textAnchor="middle"
        fontSize={6.5}
        fill="#fff"
        fontFamily="ui-monospace,monospace"
        fontWeight={600}
      >
        F/T
      </text>
    </g>
  );
}

function ArmShaft({ x = 90, y = 0, h = 30 }: { x?: number; y?: number; h?: number }) {
  return <rect x={x - 8} y={y} width={16} height={h} rx={2} fill={SHAFT} />;
}

// ─────────────────────────────────────────────────────────────────
// 1. 평행 그리퍼

function ParallelOnly() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={28} />
      <ParallelGripper x={90} y={34} />
      <rect x={82} y={50} width={16} height={28} rx={2} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
    </svg>
  );
}

// 2. 평행 + 손바닥 카메라
function ParallelCamera() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={28} />
      <ParallelGripper x={90} y={34} />
      <PalmCamera cx={90} cy={47} r={5} />
      <rect x={82} y={56} width={16} height={22} rx={2} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
    </svg>
  );
}

// 3. Multi-그리퍼 (교체식)
function MultiToolChanger() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={20} />
      {/* Tool changer base */}
      <rect x={70} y={26} width={40} height={10} rx={3} fill={ACCENT} />
      <line x1={75} y1={31} x2={105} y2={31} stroke="#fff" strokeWidth={1} strokeDasharray="3 2" />
      {/* Tool 1: parallel — left-mounted */}
      <g transform="translate(38, 50)">
        <rect x={-12} y={0} width={24} height={12} rx={2} fill={BODY} />
        <rect x={-9} y={12} width={6} height={16} rx={1} fill={FINGER} />
        <rect x={3} y={12} width={6} height={16} rx={1} fill={FINGER} />
      </g>
      {/* Tool 2: vacuum — right-mounted */}
      <g transform="translate(142, 50)">
        <rect x={-12} y={0} width={24} height={5} rx={2} fill={BODY} />
        <path d="M -7 5 L -7 14 Q -7 17 -4 17 L -4 14" stroke={FINGER} strokeWidth={1.5} fill="none" />
        <ellipse cx={-5.5} cy={17} rx={3.5} ry={1.8} fill={FINGER} opacity={0.7} />
        <path d="M 7 5 L 7 14 Q 7 17 4 17 L 4 14" stroke={FINGER} strokeWidth={1.5} fill="none" />
        <ellipse cx={5.5} cy={17} rx={3.5} ry={1.8} fill={FINGER} opacity={0.7} />
      </g>
      {/* Active tool (parallel) */}
      <ParallelGripper x={90} y={36} scale={0.85} />
      {/* Swap arrows */}
      <path d="M 60 30 L 50 30" stroke={ACCENT} strokeWidth={1.2} strokeDasharray="2 2" />
      <path d="M 120 30 L 130 30" stroke={ACCENT} strokeWidth={1.2} strokeDasharray="2 2" />
    </svg>
  );
}

// 4. Multi + 손바닥 카메라
function MultiToolChangerCamera() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={20} />
      <rect x={70} y={26} width={40} height={10} rx={3} fill={ACCENT} />
      <line x1={75} y1={31} x2={105} y2={31} stroke="#fff" strokeWidth={1} strokeDasharray="3 2" />
      {/* Active parallel tool */}
      <ParallelGripper x={90} y={36} scale={0.85} />
      <PalmCamera cx={90} cy={48} r={4.5} />
      {/* Spare tools */}
      <g transform="translate(38, 50)">
        <rect x={-10} y={0} width={20} height={10} rx={2} fill={BODY} />
        <rect x={-7} y={10} width={5} height={14} rx={1} fill={FINGER} />
        <rect x={2} y={10} width={5} height={14} rx={1} fill={FINGER} />
      </g>
      <g transform="translate(142, 50)">
        <rect x={-10} y={0} width={20} height={5} rx={2} fill={BODY} />
        <path d="M -5 5 L -5 13 Q -5 16 -3 16 L -3 13" stroke={FINGER} strokeWidth={1.5} fill="none" />
        <ellipse cx={-4} cy={16} rx={3} ry={1.5} fill={FINGER} opacity={0.7} />
      </g>
    </svg>
  );
}

// 5. Soft 그리퍼
function SoftGripper() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={28} />
      <rect x={68} y={34} width={44} height={10} rx={3} fill={BODY} />
      <path d="M 72 44 Q 68 60 72 76 Q 74 84 80 86" stroke={FINGER} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.75} />
      <path d="M 84 44 Q 82 62 84 78 Q 85 84 88 86" stroke={FINGER} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.75} />
      <path d="M 96 44 Q 98 62 96 78 Q 95 84 92 86" stroke={FINGER} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.75} />
      <path d="M 108 44 Q 112 60 108 76 Q 106 84 100 86" stroke={FINGER} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.75} />
      <ellipse cx={90} cy={90} rx={14} ry={9} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
    </svg>
  );
}

// 6. 흡착·진공 그리퍼
function VacuumGripper() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={28} />
      <VacuumCup x={90} y={34} scale={1.2} />
      <line x1={78} y1={34} x2={78} y2={28} stroke="#B8B6AE" strokeWidth={1} strokeDasharray="2 2" />
      <line x1={102} y1={34} x2={102} y2={28} stroke="#B8B6AE" strokeWidth={1} strokeDasharray="2 2" />
      <rect x={60} y={66} width={60} height={20} rx={2} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
    </svg>
  );
}

// 7. 양손 협조 그리퍼 — 두 팔이 양쪽에서 Tote를 같이 잡음
function BimanualOnly() {
  return (
    <svg width="220" height="160" viewBox="0 0 200 130" fill="none">
      {/* Left arm */}
      <rect x={20} y={6} width={14} height={20} rx={2} fill={SHAFT} />
      <rect x={14} y={26} width={26} height={10} rx={2} fill={BODY} />
      {/* Right arm */}
      <rect x={166} y={6} width={14} height={20} rx={2} fill={SHAFT} />
      <rect x={160} y={26} width={26} height={10} rx={2} fill={BODY} />
      {/* Fingers gripping */}
      <rect x={36} y={36} width={6} height={26} rx={1} fill={FINGER} />
      <rect x={158} y={36} width={6} height={26} rx={1} fill={FINGER} />
      {/* Tote */}
      <rect x={42} y={42} width={116} height={50} rx={3} fill={OBJECT_FILL} stroke={OBJECT_STROKE} strokeWidth={1.2} />
      <rect x={84} y={36} width={32} height={6} rx={2} fill="none" stroke={OBJECT_STROKE} strokeWidth={1.2} />
      <text x={100} y={73} textAnchor="middle" fontSize={9} fill={OBJECT_STROKE} fontFamily="ui-monospace,monospace">TOTE</text>
    </svg>
  );
}

// 8. 양손 협조 + F/T
function BimanualFt() {
  return (
    <svg width="220" height="160" viewBox="0 0 200 130" fill="none">
      <rect x={20} y={6} width={14} height={16} rx={2} fill={SHAFT} />
      <FtSensor cx={27} cy={26} />
      <rect x={14} y={32} width={26} height={10} rx={2} fill={BODY} />

      <rect x={166} y={6} width={14} height={16} rx={2} fill={SHAFT} />
      <FtSensor cx={173} cy={26} />
      <rect x={160} y={32} width={26} height={10} rx={2} fill={BODY} />

      <rect x={36} y={42} width={6} height={26} rx={1} fill={FINGER} />
      <rect x={158} y={42} width={6} height={26} rx={1} fill={FINGER} />
      <rect x={42} y={48} width={116} height={44} rx={3} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
      <text x={100} y={75} textAnchor="middle" fontSize={9} fill={OBJECT_STROKE} fontFamily="ui-monospace,monospace">CABLE</text>
    </svg>
  );
}

// 9. 양손 협조 + 손바닥 카메라
function BimanualCamera() {
  return (
    <svg width="220" height="160" viewBox="0 0 200 130" fill="none">
      <rect x={20} y={6} width={14} height={20} rx={2} fill={SHAFT} />
      <rect x={14} y={26} width={26} height={10} rx={2} fill={BODY} />
      <PalmCamera cx={27} cy={31} r={3.5} />
      <rect x={36} y={36} width={6} height={26} rx={1} fill={FINGER} />

      <rect x={166} y={6} width={14} height={20} rx={2} fill={SHAFT} />
      <rect x={160} y={26} width={26} height={10} rx={2} fill={BODY} />
      <PalmCamera cx={173} cy={31} r={3.5} />
      <rect x={158} y={36} width={6} height={26} rx={1} fill={FINGER} />

      <rect x={42} y={42} width={116} height={50} rx={3} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
      <text x={100} y={73} textAnchor="middle" fontSize={9} fill={OBJECT_STROKE} fontFamily="ui-monospace,monospace">TOTE+POSE</text>
    </svg>
  );
}

// 10. 양손 협조 + 흡착·진공
function BimanualVacuum() {
  return (
    <svg width="220" height="160" viewBox="0 0 200 130" fill="none">
      {/* Left bimanual hand on box */}
      <rect x={20} y={6} width={14} height={20} rx={2} fill={SHAFT} />
      <rect x={14} y={26} width={26} height={10} rx={2} fill={BODY} />
      <rect x={36} y={36} width={6} height={26} rx={1} fill={FINGER} />

      {/* Right vacuum arm */}
      <rect x={166} y={6} width={14} height={20} rx={2} fill={SHAFT} />
      <rect x={155} y={26} width={26} height={6} rx={2} fill={BODY} />
      <path d="M 162 32 L 162 44 Q 162 48 166 48 L 166 44" stroke={FINGER} strokeWidth={2} fill="none" />
      <ellipse cx={164} cy={48} rx={4} ry={2} fill={FINGER} opacity={0.7} />
      <path d="M 178 32 L 178 44 Q 178 48 174 48 L 174 44" stroke={FINGER} strokeWidth={2} fill="none" />
      <ellipse cx={176} cy={48} rx={4} ry={2} fill={FINGER} opacity={0.7} />

      {/* Box being closed */}
      <rect x={42} y={50} width={108} height={42} rx={2} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
      {/* Tape strip on top being applied */}
      <rect x={130} y={44} width={20} height={6} rx={1} fill="#B26A1A" opacity={0.7} />
    </svg>
  );
}

// 11. F/T 정밀 그리퍼 (단일 손목)
function FtPrecision() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={20} />
      <FtSensor cx={90} cy={30} />
      <ParallelGripper x={90} y={38} />
      {/* Cable being routed */}
      <path d="M 60 70 Q 90 60 120 80 Q 130 88 100 92" stroke="#B26A1A" strokeWidth={3} fill="none" strokeLinecap="round" />
      <rect x={82} y={54} width={16} height={16} rx={2} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
    </svg>
  );
}

// 12. 토크 드라이버·임팩트
function TorqueDriver() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={20} />
      {/* Driver body */}
      <rect x={75} y={26} width={30} height={26} rx={4} fill={BODY} />
      <rect x={80} y={30} width={20} height={6} rx={1} fill={ACCENT} />
      <text x={90} y={47} textAnchor="middle" fontSize={7} fill="#fff" fontFamily="ui-monospace,monospace">TORQUE</text>
      {/* Bit shaft */}
      <rect x={87} y={52} width={6} height={28} rx={1} fill="#888780" />
      {/* Bit head */}
      <polygon points="84,80 96,80 90,90" fill="#5F5E5A" />
      {/* Screw target */}
      <circle cx={90} cy={102} r={6} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
      <line x1={86} y1={102} x2={94} y2={102} stroke={OBJECT_STROKE} strokeWidth={1.5} />
      <line x1={90} y1={98} x2={90} y2={106} stroke={OBJECT_STROKE} strokeWidth={1.5} />
      {/* Rotation arrow */}
      <path d="M 108 88 A 8 8 0 0 1 108 96" stroke={ACCENT} strokeWidth={1.5} fill="none" markerEnd="url(#arrR)" />
    </svg>
  );
}

// 13. 토크 드라이버 + 협소 손목 7+ DoF
function TorqueDriver7Dof() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={4} h={14} />
      {/* 7-DoF wrist segments */}
      <rect x={84} y={18} width={12} height={8} rx={2} fill="#888780" />
      <circle cx={90} cy={28} r={4} fill={ACCENT} />
      <rect x={84} y={30} width={12} height={8} rx={2} fill="#888780" transform="rotate(20 90 34)" />
      <circle cx={90} cy={42} r={4} fill={ACCENT} />
      <rect x={84} y={44} width={12} height={8} rx={2} fill="#888780" transform="rotate(-15 90 48)" />
      {/* Driver body */}
      <rect x={75} y={54} width={30} height={20} rx={4} fill={BODY} />
      <text x={90} y={67} textAnchor="middle" fontSize={6.5} fill="#fff" fontFamily="ui-monospace,monospace">TORQUE</text>
      {/* Bit */}
      <rect x={87} y={74} width={6} height={20} rx={1} fill="#888780" />
      <polygon points="84,94 96,94 90,102" fill="#5F5E5A" />
      <circle cx={90} cy={112} r={5} fill={OBJECT_FILL} stroke={OBJECT_STROKE} />
      {/* Narrow slot indication */}
      <rect x={50} y={50} width={20} height={70} rx={2} fill="none" stroke="#B8B6AE" strokeDasharray="2 2" />
      <rect x={110} y={50} width={20} height={70} rx={2} fill="none" stroke="#B8B6AE" strokeDasharray="2 2" />
      <text x={60} y={48} textAnchor="middle" fontSize={6} fill="#B8B6AE" fontFamily="ui-monospace,monospace">SLOT</text>
    </svg>
  );
}

// 14. 용접 토치 / 도장 노즐
function WeldingTorch() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={20} />
      {/* Torch body */}
      <rect x={78} y={26} width={24} height={20} rx={3} fill={BODY} />
      <text x={90} y={39} textAnchor="middle" fontSize={7} fill="#fff" fontFamily="ui-monospace,monospace">WELD</text>
      {/* Cable */}
      <path d="M 102 30 Q 130 30 130 50" stroke="#5F5E5A" strokeWidth={3} fill="none" />
      {/* Torch neck */}
      <rect x={86} y={46} width={8} height={20} rx={1} fill="#888780" transform="rotate(15 90 56)" />
      {/* Nozzle */}
      <polygon points="84,68 96,68 92,82 88,82" fill="#5F5E5A" />
      {/* Arc / spark */}
      <g>
        <circle cx={90} cy={88} r={4} fill="#FFD24F" />
        <circle cx={90} cy={88} r={2} fill="#fff" />
        <line x1={90} y1={82} x2={88} y2={78} stroke="#FFD24F" strokeWidth={1.3} />
        <line x1={90} y1={82} x2={92} y2={78} stroke="#FFD24F" strokeWidth={1.3} />
        <line x1={94} y1={86} x2={98} y2={84} stroke="#FFD24F" strokeWidth={1.3} />
        <line x1={86} y1={86} x2={82} y2={84} stroke="#FFD24F" strokeWidth={1.3} />
      </g>
      {/* Workpiece (steel plates) */}
      <rect x={50} y={94} width={36} height={10} fill="#888780" />
      <rect x={94} y={94} width={36} height={10} fill="#888780" />
      <rect x={86} y={94} width={8} height={2} fill="#FFD24F" />
    </svg>
  );
}

// 15. 커스텀 (산업 전용)
function CustomGripper() {
  return (
    <svg width="220" height="160" viewBox="0 0 180 130" fill="none">
      <ArmShaft x={90} y={6} h={20} />
      {/* Asymmetric / slim base */}
      <path d="M 70 26 L 110 26 L 100 38 L 80 38 Z" fill={BODY} />
      {/* Asymmetric reach finger (long single side) */}
      <rect x={74} y={38} width={6} height={50} rx={1} fill={FINGER} />
      <rect x={70} y={84} width={20} height={8} rx={1} fill={FINGER} />
      {/* Custom probe / nest on opposite side */}
      <rect x={100} y={38} width={6} height={20} rx={1} fill={FINGER} />
      <circle cx={103} cy={62} r={5} fill={ACCENT} />
      <text x={103} y={65} textAnchor="middle" fontSize={6.5} fill="#fff" fontFamily="ui-monospace,monospace">NDE</text>
      {/* Narrow rack representation */}
      <rect x={40} y={70} width={18} height={50} fill="none" stroke="#B8B6AE" strokeDasharray="2 2" />
      <text x={49} y={82} textAnchor="middle" fontSize={6} fill="#B8B6AE" fontFamily="ui-monospace,monospace">RACK</text>
      {/* Custom badge */}
      <rect x={130} y={26} width={36} height={14} rx={3} fill={ACCENT} />
      <text x={148} y={36} textAnchor="middle" fontSize={8} fill="#fff" fontFamily="ui-monospace,monospace">CUSTOM</text>
    </svg>
  );
}

const ILLUSTRATIONS: Record<GripperKey, () => JSX.Element> = {
  parallel: ParallelOnly,
  'parallel-camera': ParallelCamera,
  multi: MultiToolChanger,
  'multi-camera': MultiToolChangerCamera,
  soft: SoftGripper,
  vacuum: VacuumGripper,
  bimanual: BimanualOnly,
  'bimanual-ft': BimanualFt,
  'bimanual-camera': BimanualCamera,
  'bimanual-vacuum': BimanualVacuum,
  'ft-precision': FtPrecision,
  'torque-driver': TorqueDriver,
  'torque-driver-7dof': TorqueDriver7Dof,
  'welding-torch': WeldingTorch,
  custom: CustomGripper,
};
