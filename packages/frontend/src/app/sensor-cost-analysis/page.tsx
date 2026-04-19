'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { useVisionBomParts, useVisionRobotCosts, useVisionBubbleChart } from '@/hooks/useVisionCost';
import VisionCostBubbleChart from '@/components/sensor-cost/VisionCostBubbleChart';
import BomPartsTable from '@/components/sensor-cost/BomPartsTable';
import RobotCostTable from '@/components/sensor-cost/RobotCostTable';

// KEY INSIGHT 데이터
const KEY_INSIGHTS = [
  {
    company: 'Optimus (Tesla)',
    color: 'text-red-400',
    borderColor: 'border-red-800',
    bgColor: 'bg-red-950/20',
    summary: '저원가+SW 고도화',
    desc: '$340→$800 원가 최소화하면서 P1→P4 달성. 원가 대비 성능 최고 효율.',
  },
  {
    company: 'Atlas (Boston Dynamics)',
    color: 'text-blue-400',
    borderColor: 'border-blue-800',
    bgColor: 'bg-blue-950/20',
    summary: '고원가→양산 시 하락',
    desc: '$1,800→$1,200으로 원가를 내리면서 P5 도달. 2028 P5 도달 시 원가정당화.',
  },
  {
    company: 'Figure',
    color: 'text-purple-400',
    borderColor: 'border-purple-800',
    bgColor: 'bg-purple-950/20',
    summary: '중간 원가+급성장',
    desc: '$880→$1,100으로 소폭 상승하면서 P2.5→P5 달성. 가성비 최적 경로 추구.',
  },
];

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-info-soft/50 rounded w-1/3" />
      <div className="h-80 bg-info-soft/50 rounded" />
    </div>
  );
}

function ChartSection({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="rounded-xl border border-ink-200 bg-white p-4 md:p-6">
        {children}
      </div>
    </section>
  );
}

function SensorCostContent() {
  const { data: bomParts, isLoading: bomLoading } = useVisionBomParts();
  const { data: robotCosts, isLoading: costsLoading } = useVisionRobotCosts();
  const { data: bubbleData, isLoading: bubbleLoading } = useVisionBubbleChart();

  return (
    <div>
      {/* 섹션 탭 */}
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-ink-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'bubble-chart', label: '시계열 버블 차트' },
            { id: 'bom-parts', label: 'BOM 단가 기준표' },
            { id: 'robot-costs', label: '로봇별 원가 내역' },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="px-4 py-3 text-sm text-ink-500 hover:text-ink-900 whitespace-nowrap border-b-2 border-transparent hover:border-blue-500 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
        <PageHeader
          titleKo="비전 센서 원가 분석"
          titleEn="SENSOR COST ANALYSIS"
          description="Atlas / Figure / Optimus 비전 센서+컴퓨트 BOM 추정 원가 × 성능 레벨 시계열 분석"
        />

        {/* KEY INSIGHT 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {KEY_INSIGHTS.map((ins) => (
            <div
              key={ins.company}
              className={`rounded-lg border ${ins.borderColor} ${ins.bgColor} p-4`}
            >
              <div className={`text-sm font-bold ${ins.color} mb-1`}>{ins.company}</div>
              <div className={`text-xs font-semibold ${ins.color} mb-2`}>→ {ins.summary}</div>
              <div className="text-xs text-ink-700 leading-relaxed">{ins.desc}</div>
            </div>
          ))}
        </div>

        {/* 버블 차트 */}
        <ChartSection
          id="bubble-chart"
          title="비전 센서 추정 원가 × 성능 레벨 — 시계열 버블 차트"
          subtitle="원 크기 = 성능 레벨 (P1~P5). 점선 원 = 전망. 모든 가격은 BOM 제조원가 추정치 [D]."
        >
          {bubbleLoading ? (
            <LoadingSkeleton />
          ) : bubbleData?.length ? (
            <VisionCostBubbleChart data={bubbleData} />
          ) : (
            <div className="text-ink-500 text-sm py-8 text-center">데이터 없음</div>
          )}
        </ChartSection>

        {/* 2028 KEY INSIGHT 요약 배너 */}
        <div className="rounded-lg bg-white border border-ink-200 p-4 text-sm">
          <span className="font-bold text-ink-900">KEY INSIGHT &nbsp;</span>
          <span className="text-ink-700">
            Tesla는 $340→$800으로 원가 최소화하면서 P1→P4 달성 (원가 효율 최고).
            Atlas는 $1,800→$1,200으로 원가를 내리면서 P5 도달 (하드웨어 우위).
            Figure는 $880→$1,100으로 소폭 상승하면서 P2.5→P5 달성 — 가성비 최적 경로.
          </span>
          <span className="text-ink-500"> 2028년 3사 모두 P4~P5 수렴하지만 원가 구조는 </span>
          <span className="font-bold text-yellow-400">2배 이상 차이.</span>
        </div>

        {/* BOM 단가 기준표 */}
        <ChartSection
          id="bom-parts"
          title="비전 센서 시스템 추정 가격 산정 로직"
          subtitle="센서 부품별 단가 범위 및 채택 근거"
        >
          {bomLoading ? (
            <LoadingSkeleton />
          ) : bomParts?.length ? (
            <BomPartsTable data={bomParts} />
          ) : (
            <div className="text-ink-500 text-sm py-8 text-center">데이터 없음</div>
          )}
        </ChartSection>

        {/* 로봇별 원가 내역 */}
        <ChartSection
          id="robot-costs"
          title="로봇별 비전 시스템 추정 원가 (센서 + 컴퓨트)"
          subtitle="카메라 / LiDAR-Depth / 컴퓨트 BOM 내역"
        >
          {costsLoading ? (
            <LoadingSkeleton />
          ) : robotCosts?.length ? (
            <RobotCostTable data={robotCosts} />
          ) : (
            <div className="text-ink-500 text-sm py-8 text-center">데이터 없음</div>
          )}
        </ChartSection>
      </div>
    </div>
  );
}

export default function SensorCostAnalysisPage() {
  return (
    <AuthGuard>
      <SensorCostContent />
    </AuthGuard>
  );
}
