'use client';

/**
 * EngineeringAnalysisPanel · REQ-4
 *
 * Light theme per ARGOS-UX-Spec (2026-05-04).
 *
 * Layout:
 *   - KPI 카드 그리드 (38px mono headline + 13px sans muted label)
 *   - StabilityCard with PASS/WARN/FAIL chip (spec §6.1)
 *   - 관절 토크 bar chart (peak 막대만 risk 색상 + 굵게, axis 13px mono muted)
 *   - 페이로드 ↔ 리치 line chart (peak point 강조)
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

const ACCENT = '#D4A22F';
const RISK = '#D63F6F';
const PASS = '#3F8C6E';
const INK = '#1A1A1A';
const MUTED = '#6B6B6B';
const RULE = '#E2DED4';

const ARM_COLORS = [INK, '#3a8dde'];

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
      <div className="space-y-5">
        <SectionLabel>Engineering Analysis · REQ-4</SectionLabel>
        <p className="text-[15px] text-designer-muted leading-relaxed">
          팔을 1개 이상 추가해야 토크·페이로드 분석이 표시됩니다.
        </p>

        <div className="grid grid-cols-1 gap-3">
          <KpiCard
            label="베이스 풋프린트"
            value={baseFootprintLabel(base.shape, base.diameterOrWidthCm)}
            unit=""
          />
          <KpiCard
            label="총 높이"
            value={(base.heightCm + (base.hasLiftColumn ? base.liftColumnMaxExtensionCm : 0)).toFixed(1)}
            unit="cm"
          />
          <KpiCard label="베이스 무게" value={base.weightKg.toFixed(1)} unit="kg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <SectionLabel>Engineering Analysis · REQ-4</SectionLabel>
        {isLoading ? (
          <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-accent">
            ▸ analyzing
          </span>
        ) : null}
      </div>

      {isError ? (
        <div className="border-l-4 border-designer-risk bg-designer-card pl-3 py-2">
          <p className="text-[15px] text-designer-risk">분석 실패: {errorMessage}</p>
        </div>
      ) : null}

      {stability ? <StabilityCard stability={stability} /> : null}

      {analysis.map((armResult, i) => (
        <ArmAnalysisCard
          key={i}
          arm={arms[armResult.armIndex]}
          result={armResult}
          color={ARM_COLORS[i] ?? INK}
          payloadKg={payloadKg}
        />
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
      {children}
    </span>
  );
}

/* KPI 카드 — spec §6.1: 라벨 13px sans muted / 수치 38px mono ink + 단위 muted */
function KpiCard({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: string;
  unit: string;
  status?: { label: string; color: string };
}) {
  return (
    <div className="border border-designer-rule bg-designer-card p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-designer-muted">{label}</span>
        {status ? <StatusChip label={status.label} color={status.color} /> : null}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-[38px] font-semibold leading-none tabular-nums text-designer-ink">
          {value}
        </span>
        {unit ? (
          <span className="font-mono text-[20px] tabular-nums text-designer-muted">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 border font-mono text-[13px] font-semibold uppercase tracking-[0.14em]"
      style={{ borderColor: color, color }}
    >
      <span className="block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function StabilityCard({ stability }: { stability: StabilityResult }) {
  const status = stabilityStatus(stability);
  return (
    <div className="space-y-3">
      <SectionLabel>ZMP · 전복 안정성</SectionLabel>
      <div className="grid grid-cols-1 gap-3">
        <KpiCard
          label="모서리 마진"
          value={`${stability.marginToEdgeCm > 0 ? '+' : ''}${stability.marginToEdgeCm.toFixed(1)}`}
          unit="cm"
          status={status}
        />
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="ZMP X" value={stability.zmpXCm.toFixed(1)} unit="cm" />
          <KpiCard label="ZMP Z" value={stability.zmpYCm.toFixed(1)} unit="cm" />
        </div>
      </div>
      <p className="text-[15px] text-designer-muted leading-relaxed">
        worst-case 자세(팔 수평 뻗음)에서 무게중심 floor projection이 베이스 풋프린트 안에 있어야 안정. 음수 마진 = 전복 위험.
      </p>
    </div>
  );
}

function stabilityStatus(s: StabilityResult): { label: string; color: string } {
  if (!s.isStable) return { label: 'FAIL', color: RISK };
  if (s.marginToEdgeCm <= 5) return { label: 'WARN', color: ACCENT };
  return { label: 'PASS', color: PASS };
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
    <div className="border border-designer-rule bg-designer-card p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <SectionLabel>
          ARM {result.armIndex + 1} · {arm.mountPosition.toUpperCase()}
        </SectionLabel>
        <span className="font-mono text-[15px] tabular-nums text-designer-ink">
          리치 {totalReach.toFixed(0)} <span className="text-designer-muted">cm</span>
        </span>
      </div>

      {/* Over-limit warning */}
      {result.statics.joints.some((j) => j.overLimit) ? (
        <div className="border-l-4 border-designer-risk bg-designer-surface-2 pl-3 py-2">
          <p className="text-[15px] text-designer-risk leading-snug">
            <span className="font-mono font-semibold mr-1">⚠ FAIL</span>
            액추에이터 토크 한계 초과 — payload {payloadKg.toFixed(1)}kg 기준 자세 유지 불가
          </p>
        </div>
      ) : null}

      {/* End-effector payload constraint */}
      {result.endEffectorPayloadOverLimit ? (
        <div className="border-l-4 border-designer-accent bg-designer-surface-2 pl-3 py-2">
          <p className="text-[15px] text-designer-ink leading-snug">
            <span className="font-mono font-semibold mr-1" style={{ color: ACCENT }}>⚠ WARN</span>
            엔드이펙터 max payload {result.endEffectorMaxPayloadKg.toFixed(1)}kg &lt; {payloadKg.toFixed(1)}kg
          </p>
        </div>
      ) : null}

      {/* Joint margin KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {result.statics.joints.map((j) => (
          <KpiCard
            key={j.jointName}
            label={j.jointName === 'shoulder' ? '어깨 마진' : '팔꿈치 마진'}
            value={`${j.marginPct >= 0 ? '+' : ''}${j.marginPct.toFixed(0)}`}
            unit="%"
            status={
              j.overLimit
                ? { label: 'FAIL', color: RISK }
                : j.marginPct < 20
                  ? { label: 'WARN', color: ACCENT }
                  : { label: 'PASS', color: PASS }
            }
          />
        ))}
      </div>

      {/* Joint torque bar chart */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <SectionLabel>관절 토크 (요구 vs PEAK)</SectionLabel>
          <span className="font-mono text-[13px] text-designer-muted">N·m</span>
        </div>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={torqueData} margin={{ top: 10, right: 8, bottom: 4, left: -8 }}>
              <XAxis
                dataKey="joint"
                tick={{ fill: MUTED, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: RULE }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: MUTED, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: `1px solid ${RULE}`,
                  fontSize: 13,
                  color: INK,
                }}
                labelStyle={{ color: INK }}
              />
              <Bar dataKey="actuator" name="액추에이터 peak" fill={RULE} />
              <Bar dataKey="required" name="요구 토크">
                {torqueData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.overLimit ? RISK : color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payload ↔ reach curve */}
      {result.payloadCurve.length > 0 ? (
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <SectionLabel>페이로드 ↔ 리치</SectionLabel>
            <span className="font-mono text-[13px] text-designer-muted">kg / cm</span>
          </div>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.payloadCurve} margin={{ top: 10, right: 8, bottom: 4, left: -8 }}>
                <XAxis
                  dataKey="reachCm"
                  tick={{ fill: MUTED, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={{ stroke: RULE }}
                  tickLine={false}
                  unit="cm"
                />
                <YAxis
                  tick={{ fill: MUTED, fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}
                  axisLine={false}
                  tickLine={false}
                  unit="kg"
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: `1px solid ${RULE}`,
                    fontSize: 13,
                    color: INK,
                  }}
                  formatter={(v: number) => [v.toFixed(2) + ' kg', '최대 페이로드']}
                  labelFormatter={(l: number) => `리치 ${l.toFixed(0)} cm`}
                />
                <ReferenceLine
                  x={totalReach}
                  stroke={ACCENT}
                  strokeDasharray="3 3"
                  label={{ value: '현재', position: 'top', fill: ACCENT, fontSize: 11 }}
                />
                <Line type="monotone" dataKey="maxPayloadKg" stroke={color} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function baseFootprintLabel(shape: string, diameterOrWidth: number): string {
  if (shape === 'square') return `${diameterOrWidth.toFixed(0)}×${diameterOrWidth.toFixed(0)}`;
  return `Ø${diameterOrWidth.toFixed(0)}`;
}
