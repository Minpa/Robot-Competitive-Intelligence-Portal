'use client';

import { useState } from 'react';
import {
  Server, Database, Bot, Cpu, BarChart3, Filter, Layers, Zap,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { cn } from '@/lib/utils';

type NodeId = 'edge' | 'platform' | 'training' | 'rfm';

interface NodeDef {
  id: NodeId;
  title: string;
  subtitle: string;
  badge?: string;
  icon: any;
  color: string; // ring color
  bg: string;
  bullets: string[];
  detail: string[];
}

const NODES: Record<NodeId, NodeDef> = {
  edge: {
    id: 'edge', title: '양재 Edge 서버', subtitle: 'Edge Pre-processing',
    icon: Server, color: 'ring-rose-400', bg: 'bg-rose-50',
    bullets: ['Data Buffering', 'Filtering', 'Compression', 'Event-based Sampling'],
    detail: [
      '로봇 센서 raw 데이터를 그대로 클라우드로 보내면 대역폭·비용이 폭증',
      'Edge 서버가 1차 전처리 — 불필요 프레임 제거, 압축, 이벤트 단위 샘플링',
      '전처리 후에만 Data Platform 으로 업스트림',
    ],
  },
  platform: {
    id: 'platform', title: '데이터 플랫폼', subtitle: 'LG전자 × LG CNS',
    badge: 'LG CNS', icon: Database, color: 'ring-sky-400', bg: 'bg-sky-50',
    bullets: ['데이터 수집', '데이터 정제', 'GPU 활용 학습', 'RFM 도출'],
    detail: [
      '데이터 수집 → 정제 → 저장 → 관리까지 통합 대응',
      'GPU 인프라 기반 학습 파이프라인 (LG CNS 운영)',
      '정제·큐레이션된 학습 데이터를 RFM 으로 전달',
    ],
  },
  training: {
    id: 'training', title: '데이터 학습 (현장)', subtitle: 'On-robot Data Collection',
    icon: Bot, color: 'ring-amber-400', bg: 'bg-amber-50',
    bullets: ['CLOiD 및 신규 폼팩터 로봇', 'N 대 로봇 fleet', '카메라·LiDAR·ToF 실시간 수집', 'Teleoperation'],
    detail: [
      'CLOiD 및 신규 폼팩터 로봇으로 현장 데이터 학습',
      '로봇 센서 (카메라·LiDAR·ToF) 로부터 실시간 데이터 수집',
      'Teleoperation 으로 시연 데이터 확보',
    ],
  },
  rfm: {
    id: 'rfm', title: 'RFM', subtitle: 'Robotics Foundation Model',
    badge: 'NVIDIA Thor', icon: Cpu, color: 'ring-violet-400', bg: 'bg-violet-50',
    bullets: ['World Model', 'VLM', 'VLA', 'Model Evaluation (Isaac Sim)'],
    detail: [
      '다양한 버티컬·영역의 학습 데이터 기반 RFM 성능 개선 및 모델 고도화',
      'World Model / VLM / VLA 통합 학습',
      'Simulator (Isaac Sim) 기반 검증 — 통과한 모델만 SOTA 로 Fleet 배포',
    ],
  },
};

interface ArrowDef {
  id: string;
  from: NodeId;
  to: NodeId;
  label: string;
  /** 화살표 라벨에 들어갈 보조 설명 */
  sub?: string;
  /** SVG path d 속성 */
  d: string;
  /** 라벨 위치 (x,y) */
  labelPos: { x: number; y: number };
  /** 강조 색 */
  stroke: string;
}

/* SVG viewBox 1000x680 기준 좌표
 * 2x2 그리드 카드 위치 (대략):
 *   edge:     50,40   ~ 480,290   (좌상)
 *   platform: 520,40  ~ 950,290   (우상)
 *   training: 50,390  ~ 480,640   (좌하)
 *   rfm:      520,390 ~ 950,640   (우하)
 */
const ARROWS: ArrowDef[] = [
  { // 1. Data 수집 — 데이터학습(좌하) → Edge(좌상), 좌측 수직 위
    id: 'a1', from: 'training', to: 'edge', label: '1. Data 수집',
    d: 'M 260 385 L 260 295',
    labelPos: { x: 275, y: 345 },
    stroke: '#ef4444',
  },
  { // 2. Data 전송 — Edge(좌상) → Platform(우상), 상단 수평 우
    id: 'a2', from: 'edge', to: 'platform', label: '2. Data 전송',
    sub: 'Edge 전처리 후',
    d: 'M 485 165 L 515 165',
    labelPos: { x: 500, y: 145 },
    stroke: '#dc2626',
  },
  { // 3. Data 전송 — Platform(우상) → RFM(우하), 우측 수직 아래
    id: 'a3', from: 'platform', to: 'rfm', label: '3. Data 전송',
    sub: '정제·큐레이션 학습데이터',
    d: 'M 735 295 L 735 385',
    labelPos: { x: 750, y: 345 },
    stroke: '#dc2626',
  },
  { // 4. Model 전송 — RFM(우하) → 데이터학습(좌하), 하단 수평 좌 (SOTA)
    id: 'a4', from: 'rfm', to: 'training', label: '4. Model 전송 (SOTA)',
    sub: '검증 완료 모델 Fleet 배포',
    d: 'M 515 555 L 485 555',
    labelPos: { x: 500, y: 580 },
    stroke: '#8b5cf6',
  },
  { // 5. Feedback — 데이터학습(좌하) → Platform(우상), 대각선
    id: 'a5', from: 'training', to: 'platform', label: '5. Feedback',
    sub: '실환경 성능 로그 · Edge Case 재수집',
    d: 'M 480 460 C 600 430, 650 350, 720 295',
    labelPos: { x: 580, y: 405 },
    stroke: '#0ea5e9',
  },
];

function isArrowRelated(arrow: ArrowDef, hovered: NodeId | null): boolean {
  if (!hovered) return false;
  return arrow.from === hovered || arrow.to === hovered;
}

function NodeCard({
  node, hovered, onHover,
}: { node: NodeDef; hovered: NodeId | null; onHover: (id: NodeId | null) => void }) {
  const isActive = hovered === node.id;
  const isDimmed = hovered !== null && !isActive;
  const Icon = node.icon;
  return (
    <div
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      className={cn(
        'relative border-2 rounded-xl p-5 transition-all duration-300 cursor-pointer',
        'bg-white',
        isActive ? `${node.color} ring-4 shadow-xl scale-[1.02] z-20` : 'ring-0 ring-transparent border-slate-200',
        isDimmed && 'opacity-50 grayscale-[0.3]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2.5 rounded-lg shrink-0', node.bg)}>
          <Icon className={cn('w-5 h-5', isActive ? 'text-slate-900' : 'text-slate-700')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-slate-900">{node.title}</h3>
            {node.badge && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-900 text-white rounded">
                {node.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{node.subtitle}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {node.bullets.map((b) => (
          <li key={b} className="text-xs text-slate-700 flex items-start gap-1.5">
            <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataFactoryContent() {
  const [hovered, setHovered] = useState<NodeId | null>(null);
  const activeNode = hovered ? NODES[hovered] : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* keyframes for animated dashed arrows */}
      <style>{`
        @keyframes dashflow {
          to { stroke-dashoffset: -24; }
        }
        @keyframes pulseScale {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.08); }
        }
        .arrow-base { stroke-dasharray: 8 6; stroke-linecap: round; fill: none; }
        .arrow-anim { animation: dashflow 1.2s linear infinite; }
        .arrow-anim-fast { animation: dashflow 0.5s linear infinite; }
      `}</style>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-mono text-amber-600 uppercase tracking-[0.2em]">
              Data Factory · 6. LG 데이터 팩토리 운영
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">Data Pipeline 시각화</h1>
            <p className="text-sm text-slate-600 mt-1">
              현장 로봇 → Edge → 데이터 플랫폼 → RFM → SOTA 배포 까지의 데이터 흐름.
              <span className="ml-1 text-slate-500">노드에 마우스를 올리면 관련 흐름이 강조됩니다.</span>
            </p>
          </div>
          <span className="text-[10px] font-medium px-2 py-1 bg-yellow-100 border border-yellow-300 text-yellow-900 rounded">
            LGE Internal Use Only
          </span>
        </div>

        {/* Pipeline diagram */}
        <div className="relative bg-white border border-slate-200 rounded-xl p-8">
          {/* SVG overlay — viewBox 좌표계로 카드 사이 화살표 배치 */}
          <div className="relative" style={{ minHeight: 680 }}>
            <svg
              viewBox="0 0 1000 680"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {ARROWS.map((a) => (
                  <marker key={`m-${a.id}`} id={`arrow-${a.id}`}
                    viewBox="0 0 10 10" refX="9" refY="5"
                    markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={a.stroke} />
                  </marker>
                ))}
              </defs>
              {ARROWS.map((a) => {
                const related = isArrowRelated(a, hovered);
                const dim = hovered !== null && !related;
                return (
                  <g key={a.id} opacity={dim ? 0.18 : 1} style={{ transition: 'opacity 250ms' }}>
                    {/* 배경 두꺼운 회색 라인 (안 보이지만 hover 영역) */}
                    <path d={a.d}
                      className="arrow-base"
                      stroke={a.stroke}
                      strokeWidth={related ? 3.5 : 2.2}
                      style={{ transition: 'stroke-width 250ms' }}
                      markerEnd={`url(#arrow-${a.id})`}
                      pathLength={1}
                    />
                    {/* 흐름 애니메이션 라인 (덮어쓰기) */}
                    <path d={a.d}
                      className={cn('arrow-base', related ? 'arrow-anim-fast' : 'arrow-anim')}
                      stroke={a.stroke}
                      strokeWidth={related ? 3.5 : 2.2}
                      style={{ transition: 'stroke-width 250ms' }}
                      opacity={related ? 1 : 0.55}
                    />
                    {/* 라벨 */}
                    <g transform={`translate(${a.labelPos.x},${a.labelPos.y})`}>
                      <rect
                        x={-3} y={-12} rx={3} ry={3}
                        width={a.label.length * 7.2 + 6} height={a.sub ? 30 : 16}
                        fill="white" stroke={related ? a.stroke : '#cbd5e1'}
                        strokeWidth={related ? 1.5 : 1}
                        opacity={0.95}
                      />
                      <text x={0} y={0} fontSize={11} fontWeight={600}
                        fill={a.stroke}>
                        {a.label}
                      </text>
                      {a.sub && (
                        <text x={0} y={14} fontSize={9}
                          fill="#475569">
                          {a.sub}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </svg>

            {/* 2x2 grid of cards — 절대 위치로 SVG 좌표계와 정렬 */}
            <div className="relative grid grid-cols-2 grid-rows-2 gap-x-[140px] gap-y-[80px]">
              <NodeCard node={NODES.edge} hovered={hovered} onHover={setHovered} />
              <NodeCard node={NODES.platform} hovered={hovered} onHover={setHovered} />
              <NodeCard node={NODES.training} hovered={hovered} onHover={setHovered} />
              <NodeCard node={NODES.rfm} hovered={hovered} onHover={setHovered} />
            </div>
          </div>

          {/* Active node detail */}
          {activeNode && (
            <div className="mt-6 p-4 bg-slate-900 text-slate-100 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <activeNode.icon className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold">{activeNode.title}</h3>
                <span className="text-[10px] text-slate-400">— {activeNode.subtitle}</span>
              </div>
              <ul className="space-y-1">
                {activeNode.detail.map((d, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-amber-400 shrink-0">→</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!activeNode && (
            <div className="mt-6 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500">
              위의 4개 노드 중 하나에 마우스를 올리면 해당 단계의 상세 설명과 관련 데이터 흐름이 강조됩니다.
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-rose-600" />
              <h4 className="text-sm font-semibold text-slate-900">Edge 전처리의 가치</h4>
            </div>
            <p className="text-xs text-slate-600">
              로봇 N 대 × 다중 센서 raw stream 을 그대로 보내면 클라우드 비용 폭증.
              Edge 단계에서 필터링·압축·이벤트 샘플링으로 1차 정제.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <h4 className="text-sm font-semibold text-slate-900">LG전자 × LG CNS 협업</h4>
            </div>
            <p className="text-xs text-slate-600">
              데이터 플랫폼·학습 파이프라인·GPU 인프라는 LG CNS 가 구축·운영.
              LG 전자는 도메인 데이터·모델 평가에 집중.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <h4 className="text-sm font-semibold text-slate-900">폐루프 (Closed Loop)</h4>
            </div>
            <p className="text-xs text-slate-600">
              SOTA (Software Over The Air) 배포 후 현장 성능 로그와 Edge Case 를
              다시 플랫폼으로 피드백 → 지속 개선 사이클.
            </p>
          </div>
        </div>

        {/* Mini KPI strip */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: BarChart3, k: '데이터 흐름 단계', v: '5단계', c: 'text-rose-600' },
            { icon: Server, k: 'Edge 처리', v: '버퍼링/압축/샘플링', c: 'text-sky-600' },
            { icon: Database, k: '플랫폼 운영', v: 'LG CNS', c: 'text-violet-600' },
            { icon: Cpu, k: '모델 런타임', v: 'NVIDIA Thor', c: 'text-emerald-600' },
          ].map((m) => {
            const Ic = m.icon;
            return (
              <div key={m.k} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                <Ic className={cn('w-4 h-4', m.c)} />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{m.k}</div>
                  <div className="text-sm font-semibold text-slate-900">{m.v}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DataFactoryPage() {
  return (
    <AuthGuard>
      <DataFactoryContent />
    </AuthGuard>
  );
}
