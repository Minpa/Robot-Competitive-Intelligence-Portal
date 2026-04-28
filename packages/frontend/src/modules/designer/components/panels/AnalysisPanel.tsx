'use client';

import { Camera, Cpu, Gauge, Wrench } from 'lucide-react';
import { TorqueChart } from './TorqueChart';
import { PayloadGauge } from './PayloadGauge';
import { ActuatorRecommendations } from './ActuatorRecommendations';
import type {
  EvaluationResult,
  FormFactorSummary,
  ActuatorRecommendation,
} from '../../types/robot';

interface AnalysisPanelProps {
  formFactor: FormFactorSummary | null;
  evaluation: EvaluationResult | null;
  recommendations: ActuatorRecommendation[];
  isEvaluating: boolean;
  isRecommending: boolean;
}

export function AnalysisPanel({
  formFactor,
  evaluation,
  recommendations,
  isEvaluating,
  isRecommending,
}: AnalysisPanelProps) {
  // Compute warning threshold for torque chart: 1.5× the median torque.
  const sortedTorques = evaluation
    ? [...evaluation.jointTorques].map((t) => t.requiredPeakTorqueNm).sort((a, b) => a - b)
    : [];
  const median = sortedTorques.length
    ? sortedTorques[Math.floor(sortedTorques.length / 2)] ?? 0
    : 0;
  const warningThreshold = median > 0 ? median * 2 : undefined;

  return (
    <div className="space-y-5">
      <Section icon={Cpu} label="Kinematics" subtitle="REQ-3 · DoF">
        <Stat label="총 DoF" value={formFactor ? `${formFactor.totalDof}` : '—'} />
        <Stat
          label="평가 페이로드"
          value={evaluation ? `${evaluation.payloadKg.toFixed(1)} kg` : '—'}
        />
        <Stat
          label="스켈레톤 노드"
          value={formFactor ? `${formFactor.skeleton.length}` : '—'}
        />
      </Section>

      <Section icon={Gauge} label="Statics" subtitle="REQ-3 · 관절별 토크">
        {isEvaluating ? (
          <div className="h-[220px] bg-white/[0.03] border border-white/5 animate-pulse" />
        ) : (
          <TorqueChart
            torques={evaluation?.jointTorques ?? []}
            warningThresholdNm={warningThreshold}
          />
        )}
      </Section>

      <Section icon={Gauge} label="Payload Limit" subtitle="REQ-4 · 한계">
        <PayloadGauge
          payloadKg={evaluation?.payloadKg ?? 0}
          limit={evaluation?.payloadLimit ?? null}
        />
      </Section>

      <Section icon={Camera} label="FoV Coverage" subtitle="REQ-2 · 커버리지">
        {evaluation?.fovCoverage ? (
          <div className="space-y-1">
            <Stat
              label="수평 커버리지"
              value={`${(evaluation.fovCoverage.horizontalCoverageRatio * 100).toFixed(0)} %`}
            />
            <Stat
              label="사각지대 면적"
              value={`${evaluation.fovCoverage.blindSpotAreaM2.toFixed(2)} m²`}
            />
            <Stat label="활성 카메라" value={`${evaluation.fovCoverage.cones.length}`} />
          </div>
        ) : (
          <p className="text-[11px] text-white/40">카메라를 1개 이상 활성화하세요.</p>
        )}
      </Section>

      <Section icon={Wrench} label="Recommendations" subtitle="REQ-5 · 액추에이터">
        <ActuatorRecommendations
          recommendations={recommendations}
          isLoading={isRecommending}
        />
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  label,
  subtitle,
  children,
}: {
  icon: any;
  label: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-gold" strokeWidth={2} />
        <div className="flex flex-col">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-gold">
            {label}
          </span>
          <span className="text-[11px] text-white/55 mt-0.5">{subtitle}</span>
        </div>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#0f0f0f] border border-white/5">
      <span className="text-[11px] text-white/55">{label}</span>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white">{value}</span>
    </div>
  );
}
