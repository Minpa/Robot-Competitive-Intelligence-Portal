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
import { Panel, SectionHeader, Kicker } from '@/components/ui';

function ChartSection({
  id,
  index,
  kicker,
  title,
  rubricType,
  children,
}: {
  id: string;
  index: number;
  kicker: string;
  title: string;
  rubricType?: 'poc' | 'rfm' | 'positioning';
  children: React.ReactNode;
}) {
  const numeral = `0${index}`;
  return (
    <section id={id} className="scroll-mt-24">
      <Panel
        headerRight={rubricType ? <RubricPanel type={rubricType} /> : undefined}
      >
        <div className="-mt-2 mb-4 flex items-center gap-3">
          <span className="font-mono text-[11px] font-medium text-gold tracking-[0.2em]">
            {numeral}
          </span>
          <Kicker>{kicker}</Kicker>
        </div>
        <h3 className="font-serif text-[20px] font-semibold text-ink-900 tracking-tight leading-tight mb-5">
          {title}
        </h3>
        {children}
      </Panel>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-ink-100 w-1/3" />
      <div className="h-64 bg-ink-100" />
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
    <div className="min-h-screen bg-paper">
      <SectionNav />

      <div className="max-w-[1400px] mx-auto px-2 py-8 space-y-8">
        <SectionHeader
          number="§ INTELLIGENCE · V4.2"
          kicker="Competitive Comparison"
          title="경쟁비교"
          subtitle="휴머노이드 로봇 산업의 경쟁 지형과 스펙 패리티 벤치마크를 6종 차트로 제공합니다."
          right={<PptDownloadButton />}
        />

        <ChartSection id="poc-radar" index={1} kicker="PoC Factor Radar" title="산업용 PoC 팩터별 역량 비교" rubricType="poc">
          {pocLoading ? <LoadingSkeleton /> : <PocRadarSection data={pocScores || []} />}
        </ChartSection>

        <ChartSection id="rfm-radar" index={2} kicker="RFM Capability Overlay" title="RFM 역량 비교" rubricType="rfm">
          {rfmLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <RfmOverlayRadar data={rfmScores || []} />
              <div className="mt-8 pt-6 border-t border-ink-200">
                <div className="mb-3">
                  <Kicker>Comparison Matrix</Kicker>
                  <h4 className="font-serif text-[15px] font-semibold text-ink-900 mt-1">
                    RFM 비교 표
                  </h4>
                </div>
                <RfmComparisonTable />
              </div>
            </>
          )}
        </ChartSection>

        <ChartSection id="rfm-positioning" index={3} kicker="RFM Positioning" title="RFM 경쟁력 포지셔닝 맵" rubricType="positioning">
          {rfmPosLoading ? <LoadingSkeleton /> : <RfmBubbleChart data={rfmPositioning || []} />}
        </ChartSection>

        <ChartSection id="poc-positioning" index={4} kicker="PoC Positioning" title="산업용 PoC 로봇 포지셔닝 맵" rubricType="positioning">
          {pocPosLoading ? <LoadingSkeleton /> : <PocBubbleChart data={pocPositioning || []} />}
        </ChartSection>

        <ChartSection id="soc-ecosystem" index={5} kicker="SoC Ecosystem" title="TOPS × SoC 에코시스템 포지셔닝 맵">
          {socPosLoading ? <LoadingSkeleton /> : <SocBubbleChart data={socPositioning || []} />}
        </ChartSection>

        <ChartSection id="spec-comparison" index={6} kicker="Spec Benchmarks" title="산업 배치 핵심 스펙 비교">
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
