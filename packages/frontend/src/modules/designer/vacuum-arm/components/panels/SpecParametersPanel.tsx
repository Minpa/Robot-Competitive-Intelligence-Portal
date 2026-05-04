'use client';

/**
 * SpecParametersPanel · REQ-1 (베이스 5변수) + REQ-2 (팔 0/1/2개 + 9변수)
 *
 * Light theme per ARGOS-UX-Spec (2026-05-04). 4-tier hierarchy:
 *   1. section label  — mono 13px uppercase tracked, muted
 *   2. field name     — 17px sans, ink
 *   3. value          — 17px mono, ink (활성일 때만 굵게)
 *   4. help text      — 15px sans, muted
 *
 * 활성 슬라이더(드래그·포커스 중)에만 accent yellow. 그 외는 ink-2/rule.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import { designerVacuumApi } from '../../api/designer-vacuum-api';
import { BASE_BOUNDS } from '../../types/product';
import type { BaseShape } from '../../types/product';
import { ArmSpecSection } from './ArmSpecSection';

const SHAPE_OPTIONS: Array<{ value: BaseShape; label: string; hint: string }> = [
  { value: 'disc', label: '디스크', hint: '원형 (LG 로보킹 형태)' },
  { value: 'square', label: '사각', hint: '직사각 베이스' },
  { value: 'tall_cylinder', label: '톨 실린더', hint: '높이가 직경보다 큰 형태' },
];

const ARM_COUNT_OPTIONS: Array<{ value: 0 | 1 | 2; label: string }> = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
];

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = true, badge, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-designer-rule first:border-t-0 pt-6 first:pt-0 mt-6 first:mt-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between pb-4 text-left"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-designer-muted" strokeWidth={2.2} />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-designer-muted" strokeWidth={2.2} />
          )}
          <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
            {title}
          </span>
        </span>
        {badge ? (
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-designer-muted px-2 py-0.5 border border-designer-rule bg-designer-card">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? <div className="space-y-4">{children}</div> : null}
    </div>
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function SliderRow({ label, value, unit, min, max, step, onChange, disabled }: SliderRowProps) {
  const [active, setActive] = useState(false);
  const valueClass = active
    ? 'font-mono text-[17px] font-semibold tabular-nums text-designer-ink'
    : 'font-mono text-[17px] tabular-nums text-designer-ink-2';
  return (
    <div
      className={[
        '-mx-2 px-2 py-1 transition-colors',
        active ? 'bg-designer-surface-2 border-l-2 border-designer-accent -ml-[10px] pl-[8px]' : '',
      ].join(' ')}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[17px] font-medium text-designer-ink">{label}</span>
        <span className={valueClass}>
          {value.toFixed(step < 1 ? 1 : 0)}
          <span className="ml-1 text-designer-muted">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        onChange={(e) => onChange(Number(e.target.value))}
        className={[
          'mt-2 w-full cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
          active ? 'accent-designer-accent' : 'accent-[#6B6B6B]',
        ].join(' ')}
        aria-label={label}
      />
      <div className="mt-1 flex justify-between font-mono text-[11px] text-designer-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function SpecParametersPanel() {
  const product = useDesignerVacuumStore((s) => s.product);
  const setBaseShape = useDesignerVacuumStore((s) => s.setBaseShape);
  const setBaseHeightCm = useDesignerVacuumStore((s) => s.setBaseHeightCm);
  const setBaseDiameterOrWidthCm = useDesignerVacuumStore((s) => s.setBaseDiameterOrWidthCm);
  const setBaseWeightKg = useDesignerVacuumStore((s) => s.setBaseWeightKg);
  const setHasLiftColumn = useDesignerVacuumStore((s) => s.setHasLiftColumn);
  const setLiftColumnMaxExtensionCm = useDesignerVacuumStore((s) => s.setLiftColumnMaxExtensionCm);
  const setProductName = useDesignerVacuumStore((s) => s.setProductName);
  const setArmCount = useDesignerVacuumStore((s) => s.setArmCount);

  const { base, arms } = product;
  const armCount = arms.length;

  // REQ-2 catalogs
  const actuatorsQ = useQuery({
    queryKey: ['vacuum-arm', 'actuators'],
    queryFn: () => designerVacuumApi.listActuators(),
    staleTime: 5 * 60_000,
  });
  const endEffectorsQ = useQuery({
    queryKey: ['vacuum-arm', 'end-effectors'],
    queryFn: () => designerVacuumApi.listEndEffectors(),
    staleTime: 5 * 60_000,
  });

  const actuators = actuatorsQ.data?.actuators ?? [];
  const endEffectors = endEffectorsQ.data?.endEffectors ?? [];
  const catalogLoadError = actuatorsQ.error || endEffectorsQ.error;

  return (
    <div>
      <div className="pb-2">
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
          Spec Variables · REQ-1 + REQ-2
        </span>
        <input
          type="text"
          value={product.name}
          onChange={(e) => setProductName(e.target.value)}
          className="mt-2 w-full bg-transparent border-b border-designer-rule pb-1 text-[22px] font-medium text-designer-ink focus:border-designer-accent focus:outline-none"
          placeholder="후보 이름"
          aria-label="후보 이름"
        />
        {catalogLoadError ? (
          <p className="mt-2 text-[15px] text-designer-risk">
            카탈로그 로드 실패: {(catalogLoadError as Error).message}
          </p>
        ) : null}
      </div>

      {/* 베이스 */}
      <Section title="VACUUM BASE" badge="5 vars">
        <div>
          <span className="block text-[17px] font-medium text-designer-ink mb-2">폼 (Shape)</span>
          <div className="grid grid-cols-3 gap-2">
            {SHAPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBaseShape(opt.value)}
                className={[
                  'border px-3 py-2.5 text-left transition-colors',
                  base.shape === opt.value
                    ? 'border-designer-ink bg-designer-ink text-white'
                    : 'border-designer-rule bg-designer-card text-designer-ink-2 hover:border-designer-ink-2',
                ].join(' ')}
                aria-pressed={base.shape === opt.value}
              >
                <span
                  className={[
                    'block font-mono text-[11px] font-semibold uppercase tracking-[0.14em]',
                    base.shape === opt.value ? 'text-white' : 'text-designer-muted',
                  ].join(' ')}
                >
                  {opt.label}
                </span>
                <span
                  className={[
                    'mt-1 block text-[13px] leading-snug',
                    base.shape === opt.value ? 'text-white/80' : 'text-designer-muted',
                  ].join(' ')}
                >
                  {opt.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <SliderRow
          label="높이"
          value={base.heightCm}
          unit="cm"
          min={BASE_BOUNDS.heightCm.min}
          max={BASE_BOUNDS.heightCm.max}
          step={BASE_BOUNDS.heightCm.step}
          onChange={setBaseHeightCm}
        />

        <SliderRow
          label={base.shape === 'disc' ? '직경' : '폭'}
          value={base.diameterOrWidthCm}
          unit="cm"
          min={BASE_BOUNDS.diameterOrWidthCm.min}
          max={BASE_BOUNDS.diameterOrWidthCm.max}
          step={BASE_BOUNDS.diameterOrWidthCm.step}
          onChange={setBaseDiameterOrWidthCm}
        />

        <SliderRow
          label="무게"
          value={base.weightKg}
          unit="kg"
          min={BASE_BOUNDS.weightKg.min}
          max={BASE_BOUNDS.weightKg.max}
          step={BASE_BOUNDS.weightKg.step}
          onChange={setBaseWeightKg}
        />

        <div className="pt-1">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[17px] font-medium text-designer-ink">리프트 컬럼</span>
            <span className="relative inline-flex h-5 w-10 items-center">
              <input
                type="checkbox"
                checked={base.hasLiftColumn}
                onChange={(e) => setHasLiftColumn(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-full border border-designer-rule bg-designer-surface-2 peer-checked:border-designer-accent peer-checked:bg-designer-accent transition-colors" />
              <span className="absolute left-0.5 h-4 w-4 rounded-full bg-designer-muted transition-transform peer-checked:translate-x-5 peer-checked:bg-white" />
            </span>
          </label>
          {base.hasLiftColumn ? (
            <div className="mt-3">
              <SliderRow
                label="최대 스트로크"
                value={base.liftColumnMaxExtensionCm}
                unit="cm"
                min={1}
                max={BASE_BOUNDS.liftColumnMaxExtensionCm.max}
                step={BASE_BOUNDS.liftColumnMaxExtensionCm.step}
                onChange={setLiftColumnMaxExtensionCm}
              />
            </div>
          ) : null}
        </div>
      </Section>

      {/* 팔 개수 토글 (REQ-2) */}
      <Section title="MANIPULATOR ARM" badge={`${armCount}개`}>
        <div>
          <span className="block text-[17px] font-medium text-designer-ink mb-2">팔 개수</span>
          <div className="grid grid-cols-3 gap-2">
            {ARM_COUNT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setArmCount(opt.value)}
                className={[
                  'border py-2.5 text-center transition-colors font-mono text-[15px] font-semibold',
                  armCount === opt.value
                    ? 'border-designer-ink bg-designer-ink text-white'
                    : 'border-designer-rule bg-designer-card text-designer-ink-2 hover:border-designer-ink-2',
                ].join(' ')}
                aria-pressed={armCount === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[15px] text-designer-muted leading-relaxed">
            팔 0/1/2개 토글. 각 팔은 9개 사양 변수 (마운트 위치, 어깨 높이, L1, L2, 손목 DOF, 액추에이터×2, 엔드이펙터).
          </p>
        </div>
      </Section>

      {/* 팔 각각 — 기본 접힘 */}
      {arms.map((_, i) => (
        <ArmSpecSection
          key={i}
          index={i}
          defaultOpen={false}
          actuators={actuators}
          endEffectors={endEffectors}
        />
      ))}

      {/* 페이로드 — REQ-4 */}
      <PayloadSection />

      {/* 시각 자세 제어 (분석 무관) — 기본 접힘 */}
      {armCount > 0 ? <PoseSection /> : null}
    </div>
  );
}

function PoseSection() {
  const armPose = useDesignerVacuumStore((s) => s.armPose);
  const setArmPose = useDesignerVacuumStore((s) => s.setArmPose);
  const applyPosePreset = useDesignerVacuumStore((s) => s.applyPosePreset);

  return (
    <Section title="POSE (시각용)" defaultOpen={false} badge="3D 표시">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: 'folded', label: '접힘' },
            { id: 'reach', label: '리치' },
            { id: 'upright', label: '직립' },
            { id: 'worstCase', label: '수평 (분석용)' },
          ] as const
        ).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPosePreset(p.id)}
            className="border border-designer-rule bg-designer-card px-2.5 py-1.5 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-ink-2 hover:border-designer-ink-2 hover:text-designer-ink transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <SliderRow
        label="어깨 피치 (0=위, 90=앞 수평, 180=아래)"
        value={armPose.shoulderPitchDeg}
        unit="°"
        min={-30}
        max={180}
        step={1}
        onChange={(v) => setArmPose({ shoulderPitchDeg: v })}
      />
      <SliderRow
        label="팔꿈치 각도"
        value={armPose.elbowDeg}
        unit="°"
        min={0}
        max={180}
        step={1}
        onChange={(v) => setArmPose({ elbowDeg: v })}
      />
      <p className="text-[15px] text-designer-muted leading-relaxed">
        3D 미리보기 자세만 변경 — 토크·ZMP 분석은 항상 worst-case (수평 뻗음) 기준입니다.
      </p>
    </Section>
  );
}

function PayloadSection() {
  const payloadKg = useDesignerVacuumStore((s) => s.payloadKg);
  const setPayloadKg = useDesignerVacuumStore((s) => s.setPayloadKg);
  return (
    <Section title="PAYLOAD" badge={`${payloadKg.toFixed(1)} kg`}>
      <SliderRow
        label="끝점 페이로드"
        value={payloadKg}
        unit="kg"
        min={0}
        max={5}
        step={0.05}
        onChange={setPayloadKg}
      />
      <p className="text-[15px] text-designer-muted leading-relaxed">
        worst-case (팔 수평 뻗음) 자세에서 끝점에 매달리는 무게. 토크·도달성 분석에 사용됩니다.
      </p>
    </Section>
  );
}
