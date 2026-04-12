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
import { PageHeader, ArgosCard } from '@/components/layout/PageHeader';

function ChartSection({
  id,
  index,
  title,
  titleEn,
  rubricType,
  children,
}: {
  id: string;
  index: number;
  title: string;
  titleEn?: string;
  rubricType?: 'poc' | 'rfm' | 'positioning';
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="argos-module-label mb-1.5">
            CHART · 0{index}
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-extrabold text-argos-ink tracking-tight">{title}</h2>
            {titleEn && (
              <span className="text-[13px] font-semibold text-argos-faint uppercase tracking-wide">
                / {titleEn}
              </span>
            )}
          </div>
        </div>
        {rubricType && <RubricPanel type={rubricType} />}
      </div>
      <ArgosCard className="p-6">
        {children}
      </ArgosCard>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-argos-bgAlt rounded w-1/3" />
      <div className="h-64 bg-argos-bgAlt rounded" />
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
    <div className="min-h-screen">
      <SectionNav />

      <div className="max-w-[1400px] mx-auto space-y-10">
        <PageHeader
          module="INTELLIGENCE MODULE V4.2"
          titleKo="경쟁비교"
          titleEn="COMPETITIVE COMPARISON"
          description="휴머노이드 로봇 산업의 경쟁 지형과 스펙 패리티 벤치마크를 6종 차트로 제공합니다."
          actions={<PptDownloadButton />}
        />

        <ChartSection id="poc-radar" index={1} title="산업용 PoC 팩터별 역량 비교" titleEn="PoC Factor Radar" rubricType="poc">
          {pocLoading ? <LoadingSkeleton /> : <PocRadarSection data={pocScores || []} />}
        </ChartSection>

        <ChartSection id="rfm-radar" index={2} title="RFM 역량 비교" titleEn="RFM Capability Overlay" rubricType="rfm">
          {rfmLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <RfmOverlayRadar data={rfmScores || []} />
              <div className="mt-8 pt-6 border-t border-argos-borderSoft">
                <h3 className="text-[13px] font-bold text-argos-ink mb-3 tracking-tight">
                  RFM 비교 표 <span className="text-argos-faint font-semibold">/ Comparison Matrix</span>
                </h3>
                <RfmComparisonTable />
              </div>
            </>
          )}
        </ChartSection>

        <ChartSection id="rfm-positioning" index={3} title="RFM 경쟁력 포지셔닝 맵" titleEn="RFM Positioning" rubricType="positioning">
          {rfmPosLoading ? <LoadingSkeleton /> : <RfmBubbleChart data={rfmPositioning || []} />}
        </ChartSection>

        <ChartSection id="poc-positioning" index={4} title="산업용 PoC 로봇 포지셔닝 맵" titleEn="PoC Positioning" rubricType="positioning">
          {pocPosLoading ? <LoadingSkeleton /> : <PocBubbleChart data={pocPositioning || []} />}
        </ChartSection>

        <ChartSection id="soc-ecosystem" index={5} title="TOPS × SoC 에코시스템 포지셔닝 맵" titleEn="SoC Ecosystem">
          {socPosLoading ? <LoadingSkeleton /> : <SocBubbleChart data={socPositioning || []} />}
        </ChartSection>

        <ChartSection id="spec-comparison" index={6} title="산업 배치 핵심 스펙 비교" titleEn="Spec Benchmarks">
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
