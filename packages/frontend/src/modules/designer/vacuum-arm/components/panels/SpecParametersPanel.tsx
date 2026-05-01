'use client';

/**
 * SpecParametersPanel · REQ-1 (베이스 5변수) + REQ-2 (팔 0/1/2개 + 9변수)
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
    <div className="border-t border-white/10 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3 w-3 text-white/45" strokeWidth={2.2} />
          ) : (
            <ChevronRight className="h-3 w-3 text-white/45" strokeWidth={2.2} />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/65">
            {title}
          </span>
        </span>
        {badge ? (
          <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-white/40 px-1.5 py-0.5 border border-white/10">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? <div className="pb-4 space-y-3">{children}</div> : null}
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
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-white/70">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-white">
          {value.toFixed(step < 1 ? 1 : 0)}
          <span className="ml-1 text-white/40">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-gold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label={label}
      />
      <div className="mt-0.5 flex justify-between font-mono text-[8.5px] text-white/30">
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
    <div className="space-y-1">
      <div className="pb-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
          Spec Variables · REQ-1 + REQ-2
        </span>
        <input
          type="text"
          value={product.name}
          onChange={(e) => setProductName(e.target.value)}
          className="mt-1.5 w-full bg-transparent border-b border-white/15 pb-1 text-[14px] text-white focus:border-gold focus:outline-none"
          placeholder="후보 이름"
          aria-label="후보 이름"
        />
        {catalogLoadError ? (
          <p className="mt-2 text-[10px] text-[#E63950]">
            카탈로그 로드 실패: {(catalogLoadError as Error).message}
          </p>
        ) : null}
      </div>

      {/* 베이스 */}
      <Section title="베이스 (Vacuum Base)" badge="5 vars">
        <div>
          <span className="text-[11px] text-white/70">폼 (Shape)</span>
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            {SHAPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBaseShape(opt.value)}
                className={[
                  'border px-2 py-2 text-left transition-colors',
                  base.shape === opt.value
                    ? 'border-gold bg-[#1a1408] text-white'
                    : 'border-white/10 bg-[#0a0a0a] text-white/65 hover:border-white/30 hover:text-white',
                ].join(' ')}
                aria-pressed={base.shape === opt.value}
              >
                <span className="block font-mono text-[9px] uppercase tracking-[0.18em]">
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-[9.5px] text-white/45 leading-snug">
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

        <div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[11px] text-white/70">리프트 컬럼</span>
            <span className="relative inline-flex h-4 w-8 items-center">
              <input
                type="checkbox"
                checked={base.hasLiftColumn}
                onChange={(e) => setHasLiftColumn(e.target.checked)}
                className="peer sr-only"
              />
              <span className="absolute inset-0 rounded-none border border-white/20 bg-[#0a0a0a] peer-checked:border-gold peer-checked:bg-[#1a1408] transition-colors" />
              <span className="absolute left-0.5 h-3 w-3 bg-white/55 transition-transform peer-checked:translate-x-4 peer-checked:bg-gold" />
            </span>
          </label>
          {base.hasLiftColumn ? (
            <div className="mt-2">
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
      <Section title="매니퓰레이터" badge={`${armCount}개`}>
        <div>
          <span className="text-[11px] text-white/70">팔 개수</span>
          <div className="mt-1.5 grid grid-cols-3 gap-1">
            {ARM_COUNT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setArmCount(opt.value)}
                className={[
                  'border py-2 text-center transition-colors font-mono text-[10px] uppercase tracking-[0.18em]',
                  armCount === opt.value
                    ? 'border-gold bg-[#1a1408] text-white'
                    : 'border-white/10 bg-[#0a0a0a] text-white/55 hover:border-white/30 hover:text-white',
                ].join(' ')}
                aria-pressed={armCount === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/45 leading-relaxed">
            팔 0/1/2개 토글. 각 팔은 9개 사양 변수 (마운트 위치, 어깨 높이, L1, L2, 손목 DOF, 액추에이터×2, 엔드이펙터).
          </p>
        </div>
      </Section>

      {/* 팔 각각 (있을 때만) */}
      {arms.map((_, i) => (
        <ArmSpecSection
          key={i}
          index={i}
          defaultOpen={i === 0}
          actuators={actuators}
          endEffectors={endEffectors}
        />
      ))}

      {/* 페이로드 placeholder */}
      <Section title="페이로드 / 타겟" defaultOpen={false} badge="REQ-4 예정">
        <p className="text-[10.5px] text-white/45 leading-relaxed">
          페이로드 무게·grip 변수는 REQ-4에서 추가.
        </p>
      </Section>
    </div>
  );
}
