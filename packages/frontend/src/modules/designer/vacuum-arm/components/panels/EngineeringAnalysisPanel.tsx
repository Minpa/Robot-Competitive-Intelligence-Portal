'use client';

/**
 * EngineeringAnalysisPanel · REQ-4
 *
 * Right-side panel rendering the analyze response:
 *   - Per-arm joint torque bar chart (shoulder + elbow)
 *   - Payload ↔ reach tradeoff line chart
 *   - Joint over-limit highlighted in red
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LineChart,
  Line,
} from 'recharts';
import type {
  ArmAnalysisResult,
  VacuumBaseSpec,
  ManipulatorArmSpec,
  StabilityResult,
} from '../../types/product';

const ARM_COLORS = ['#E63950', '#3a8dde'];

interface EngineeringAnalysisPanelProps {
  base: VacuumBaseSpec;
  arms: ManipulatorArmSpec[];
  analysis: ArmAnalysisResult[];
  stability: StabilityResult | null;
  payloadKg: number;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

export function EngineeringAnalysisPanel({
  base,
  arms,
  analysis,
  stability,
  payloadKg,
  isLoading,
  isError,
  errorMessage,
}: EngineeringAnalysisPanelProps) {
  if (arms.length === 0) {
    return (
      <div className="space-y-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
          Engineering Analysis · REQ-4
        </span>
        <p className="text-[11px] text-white/55 leading-relaxed">
          팔을 1개 이상 추가해야 토크·페이로드 분석이 표시됩니다.
        </p>

        <div className="mt-5 space-y-2">
          <Stat label="베이스 풋프린트" value={baseFootprintLabel(base.shape, base.diameterOrWidthCm)} />
          <Stat
            label="총 높이"
            value={`${(base.heightCm + (base.hasLiftColumn ? base.liftColumnMaxExtensionCm : 0)).toFixed(1)} cm`}
          />
          <Stat label="베이스 무게" value={`${base.weightKg.toFixed(1)} kg`} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
          Engineering Analysis · REQ-4
        </span>
        {isLoading ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold/75">
            ▸ analyzing
          </span>
        ) : null}
      </div>

      {isError ? (
        <p className="text-[11px] text-[#E63950]">분석 실패: {errorMessage}</p>
      ) : null}

      {stability ? <StabilityCard stability={stability} /> : null}

      {analysis.map((armResult, i) => (
        <ArmAnalysisCard
          key={i}
          arm={arms[armResult.armIndex]}
          result={armResult}
          color={ARM_COLORS[i] ?? '#E63950'}
          payloadKg={payloadKg}
        />
      ))}
    </div>
  );
}

function StabilityCard({ stability }: { stability: StabilityResult }) {
  const status = stabilityStatus(stability);
  const color = status.color;
  return (
    <div className="border-l-2 pl-3 space-y-2" style={{ borderColor: color }}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white">
          ZMP · 전복 안정성
        </span>
        <span
          className="font-mono text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 border"
          style={{ color, borderColor: color }}
        >
          {status.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <Stat label="ZMP X" value={`${stability.zmpXCm.toFixed(1)} cm`} />
        <Stat label="ZMP Z" value={`${stability.zmpYCm.toFixed(1)} cm`} />
        <Stat
          label="모서리 마진"
          value={`${stability.marginToEdgeCm > 0 ? '+' : ''}${stability.marginToEdgeCm.toFixed(1)} cm`}
        />
      </div>
      <p className="text-[11px] text-white/50 leading-snug">
        worst-case 자세(팔 수평 뻗음)에서 무게중심 floor projection이 베이스 풋프린트 안에 있어야 안정. 음수 마진 = 전복 위험.
      </p>
    </div>
  );
}

function stabilityStatus(s: StabilityResult): { label: string; color: string } {
  if (!s.isStable) return { label: '전복 위험', color: '#E63950' };
  if (s.marginToEdgeCm <= 5) return { label: '주의 (마진 ≤ 5cm)', color: '#F2A93B' };
  return { label: '안정', color: '#3acc6f' };
}

function ArmAnalysisCard({
  arm,
  result,
  color,
  payloadKg,
}: {
  arm: ManipulatorArmSpec;
  result: ArmAnalysisResult;
  color: string;
  payloadKg: number;
}) {
  const torqueData = useMemo(
    () =>
      result.statics.joints.map((j) => ({
        joint: j.jointName === 'shoulder' ? '어깨' : '팔꿈치',
        required: j.requiredPeakTorqueNm,
        actuator: j.actuatorPeakTorqueNm,
        overLimit: j.overLimit,
      })),
    [result]
  );

  const totalReach = arm.upperArmLengthCm + arm.forearmLengthCm;

  return (
    <div className="border-l-2 pl-3 space-y-3" style={{ borderColor: color }}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white">
          팔 {result.armIndex + 1} · {arm.mountPosition}
        </span>
        <span className="font-mono text-[9px] tabular-nums text-white/55">
          리치 {totalReach.toFixed(0)} cm
        </span>
      </div>

      {/* Over-limit warning */}
      {result.statics.joints.some((j) => j.overLimit) ? (
        <div className="border border-[#E63950]/50 bg-[#2a1a0d] px-2 py-1.5">
          <p className="text-[11px] text-[#E63950] leading-snug">
            ⚠ 액추에이터 토크 한계 초과 — payload {payloadKg.toFixed(1)}kg 기준 자세 유지 불가
          </p>
        </div>
      ) : null}

      {/* End-effector payload constraint */}
      {result.endEffectorPayloadOverLimit ? (
        <div className="border border-[#F2A93B]/50 bg-[#2a1a0d] px-2 py-1.5">
          <p className="text-[11px] text-[#F2A93B] leading-snug">
            ⚠ 엔드이펙터 max payload {result.endEffectorMaxPayloadKg.toFixed(1)}kg &lt; {payloadKg.toFixed(1)}kg
          </p>
        </div>
      ) : null}

      {/* Joint torque bar chart */}
      <div>
        <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-white/60 mb-1">
          관절 토크 (요구 vs 액추에이터 peak)
        </span>
        <div className="h-[110px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={torqueData} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <XAxis dataKey="joint" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} unit="Nm" />
              <Tooltip
                contentStyle={{
                  background: '#0a0a0a',
                  border: '1px solid rgba(255,255,255,0.15)',
                  fontSize: 11,
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.85)' }}
              />
              <Bar dataKey="actuator" name="액추에이터 peak" fill="rgba(255,255,255,0.18)" />
              <Bar dataKey="required" name="요구 토크">
                {torqueData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.overLimit ? '#E63950' : color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* margin labels */}
        <div className="mt-1 grid grid-cols-2 gap-1 font-mono text-[10.5px] tabular-nums">
          {result.statics.joints.map((j) => (
            <div key={j.jointName} className="border border-white/10 px-1.5 py-1">
              <span className="text-white/50">{j.jointName === 'shoulder' ? '어깨' : '팔꿈치'}</span>
              <span className={['ml-1', j.overLimit ? 'text-[#E63950]' : 'text-white/85'].join(' ')}>
                {j.marginPct >= 0 ? '+' : ''}{j.marginPct.toFixed(0)}%
              </span>
              <span className="ml-1 text-white/35">
                ({j.requiredPeakTorqueNm.toFixed(1)} / {j.actuatorPeakTorqueNm.toFixed(0)} Nm)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Payload ↔ reach curve */}
      {result.payloadCurve.length > 0 ? (
        <div>
          <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-white/60 mb-1">
            페이로드 ↔ 리치 트레이드오프 (어깨 continuous torque 기준)
          </span>
          <div className="h-[110px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.payloadCurve} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <XAxis
                  dataKey="reachCm"
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  unit="cm"
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  unit="kg"
                />
                <Tooltip
                  contentStyle={{
                    background: '#0a0a0a',
                    border: '1px solid rgba(255,255,255,0.15)',
                    fontSize: 11,
                  }}
                  formatter={(v: number) => [v.toFixed(2) + ' kg', '최대 페이로드']}
                  labelFormatter={(l: number) => `리치 ${l.toFixed(0)} cm`}
                />
                <ReferenceLine x={totalReach} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 4" label={{ value: '현재', position: 'top', fill: 'rgba(255,255,255,0.55)', fontSize: 9 }} />
                <Line type="monotone" dataKey="maxPayloadKg" stroke={color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/5 pb-1.5">
      <span className="text-[11.5px] text-white/60">{label}</span>
      <span className="font-mono text-[11.5px] tabular-nums text-white text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function baseFootprintLabel(shape: string, diameterOrWidth: number): string {
  if (shape === 'square') return `${diameterOrWidth.toFixed(0)} × ${diameterOrWidth.toFixed(0)} cm`;
  return `Ø ${diameterOrWidth.toFixed(0)} cm`;
}
