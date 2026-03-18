'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { usePocScores, useRfmScores, usePositioningData, useBarSpecs } from '@/hooks/useHumanoidTrend';
import SectionNav from '@/components/humanoid-trend/SectionNav';
import PocRadarSection from '@/components/humanoid-trend/PocRadarSection';
import RfmOverlayRadar from '@/components/humanoid-trend/RfmOverlayRadar';
import RfmComparisonTable from '@/components/humanoid-trend/RfmComparisonTable';
import RfmBubbleChart from '@/components/humanoid-trend/RfmBubbleChart';
import PocBubbleChart from '@/components/humanoid-trend/PocBubbleChart';
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
  const { data: rfmScores, isLoading: rfmLoading } = useRfmScores();
  const { data: rfmPositioning, isLoading: rfmPosLoading } = usePositioningData('rfm_competitiveness');
  const { data: pocPositioning, isLoading: pocPosLoading } = usePositioningData('poc_positioning');
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
              휴머노이드 로봇 산업 경쟁 인텔리전스 차트 6종
            </p>
          </div>
          <PptDownloadButton />
        </div>

        <ChartSection id="poc-radar" title="1. 산업용 PoC 팩터별 역량 비교" rubricType="poc">
          {pocLoading ? <LoadingSkeleton /> : <PocRadarSection data={pocScores || []} />}
        </ChartSection>

        <ChartSection id="rfm-radar" title="2. RFM 역량 비교" rubricType="rfm">
          {rfmLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <RfmOverlayRadar data={rfmScores || []} />
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">RFM 비교 표 (주요 기업)</h3>
                <RfmComparisonTable />
              </div>
            </>
          )}
        </ChartSection>

        <ChartSection id="rfm-positioning" title="3. RFM 경쟁력 포지셔닝 맵" rubricType="positioning">
          {rfmPosLoading ? <LoadingSkeleton /> : <RfmBubbleChart data={rfmPositioning || []} />}
        </ChartSection>

        <ChartSection id="poc-positioning" title="4. 산업용 PoC 로봇 포지셔닝 맵" rubricType="positioning">
          {pocPosLoading ? <LoadingSkeleton /> : <PocBubbleChart data={pocPositioning || []} />}
        </ChartSection>

        <ChartSection id="soc-ecosystem" title="5. TOPS × SoC 에코시스템 포지셔닝 맵" rubricType="positioning">
          {socPosLoading ? <LoadingSkeleton /> : <SocBubbleChart data={socPositioning || []} />}
        </ChartSection>

        <ChartSection id="spec-comparison" title="6. 산업 배치 핵심 스펙 비교">
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
