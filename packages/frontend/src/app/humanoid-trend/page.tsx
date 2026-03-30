'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { usePocScores, usePositioningData, useBarSpecs } from '@/hooks/useHumanoidTrend';
import SectionNav from '@/components/humanoid-trend/SectionNav';
import PocRadarSection from '@/components/humanoid-trend/PocRadarSection';
import SocBubbleChart from '@/components/humanoid-trend/SocBubbleChart';
import SpecBarCharts from '@/components/humanoid-trend/SpecBarCharts';
import AdminDataPanel from '@/components/humanoid-trend/AdminDataPanel';
import PptDownloadButton from '@/components/humanoid-trend/PptDownloadButton';
import RubricPanel from '@/components/humanoid-trend/RubricPanel';
import ScoreBadge from '@/components/humanoid-trend/ScoreBadge';

function ChartSection({ id, title, rubricType, children }: { id: string; title: string; rubricType?: 'poc' | 'rfm' | 'positioning'; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-16">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-slate-200">{title}</h2>
        {rubricType && <RubricPanel type={rubricType} />}
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
        {children}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-700 rounded w-1/3" />
      <div className="h-64 bg-slate-700 rounded" />
    </div>
  );
}

function HumanoidTrendContent() {
  const { data: pocScores, isLoading: pocLoading } = usePocScores();
  const { data: socPositioning, isLoading: socPosLoading } = usePositioningData('soc_ecosystem');
  const { data: barSpecs, isLoading: barLoading } = useBarSpecs();

  return (
    <div className="min-h-screen bg-slate-950">
      <SectionNav />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-200">휴머노이드 동향</h1>
            <p className="text-sm text-slate-400 mt-1">
              휴머노이드 로봇 산업 경쟁 인텔리전스
            </p>
          </div>
          <PptDownloadButton />
        </div>

        <ChartSection id="poc-radar" title="1. 산업용 PoC 팩터별 역량 비교" rubricType="poc">
          {pocLoading ? <LoadingSkeleton /> : <PocRadarSection data={pocScores || []} />}
        </ChartSection>

        <ChartSection id="soc-ecosystem" title="2. TOPS × SoC 에코시스템 포지셔닝 맵" rubricType="positioning">
          {socPosLoading ? <LoadingSkeleton /> : <SocBubbleChart data={socPositioning || []} />}
        </ChartSection>

        <ChartSection id="spec-comparison" title="3. 산업 배치 핵심 스펙 비교">
          {barLoading ? <LoadingSkeleton /> : <SpecBarCharts data={barSpecs || []} />}
        </ChartSection>
      </div>

      <AdminDataPanel />
    </div>
  );
}

export default function HumanoidTrendPage() {
  return (
    <AuthGuard>
      <HumanoidTrendContent />
    </AuthGuard>
  );
}
