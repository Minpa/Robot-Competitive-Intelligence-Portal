'use client';

import type { WhatIfSpecs } from '@/lib/war-room-calculator';

interface Props {
  specs: WhatIfSpecs;
  onChange: (specs: WhatIfSpecs) => void;
}

const FIELDS: { key: keyof WhatIfSpecs; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: 'payloadKg', label: '페이로드', min: 0, max: 50, step: 1, unit: 'kg' },
  { key: 'operationTimeHours', label: '운용 시간', min: 0, max: 24, step: 0.5, unit: 'h' },
  { key: 'handDof', label: '핸드 DoF', min: 0, max: 30, step: 1, unit: '' },
  { key: 'heightCm', label: '키', min: 50, max: 200, step: 1, unit: 'cm' },
  { key: 'dofCount', label: '전체 DoF', min: 0, max: 60, step: 1, unit: '' },
  { key: 'fingerCount', label: '손가락 수', min: 0, max: 5, step: 1, unit: '' },
  { key: 'topsMax', label: 'AI 연산 (TOPS)', min: 0, max: 1000, step: 10, unit: 'TOPS' },
  { key: 'estimatedPriceUsd', label: '예상 가격', min: 0, max: 200000, step: 1000, unit: 'USD' },
];

const LOCOMOTION_OPTIONS = ['bipedal', 'wheeled', 'hybrid', 'tracked'];
const STAGE_OPTIONS = ['concept', 'prototype', 'poc', 'pilot', 'commercial'];

export function WhatIfForm({ specs, onChange }: Props) {
  function update(key: keyof WhatIfSpecs, value: number | string) {
    onChange({ ...specs, [key]: value });
  }

  return (
    <div className="rounded-lg bg-argos-surface border border-argos-borderSoft p-4">
      <h3 className="text-sm font-semibold text-argos-ink mb-4">스펙 파라미터</h3>
      <div className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-argos-muted">{f.label}</span>
              <span className="text-argos-inkSoft font-mono">
                {specs[f.key]}{f.unit && ` ${f.unit}`}
              </span>
            </div>
            <input
              type="range"
              min={f.min}
              max={f.max}
              step={f.step}
              value={Number(specs[f.key])}
              onChange={(e) => update(f.key, Number(e.target.value))}
              className="w-full h-1.5 bg-argos-bgAlt rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        ))}

        {/* Locomotion type */}
        <div>
          <label className="text-xs text-argos-muted mb-1 block">이동 방식</label>
          <select
            value={specs.locomotionType}
            onChange={(e) => update('locomotionType', e.target.value)}
            className="w-full rounded-md bg-argos-bg border border-argos-border px-2 py-1.5 text-xs text-argos-ink"
          >
            {LOCOMOTION_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Commercialization stage */}
        <div>
          <label className="text-xs text-argos-muted mb-1 block">상용화 단계</label>
          <select
            value={specs.commercializationStage}
            onChange={(e) => update('commercializationStage', e.target.value)}
            className="w-full rounded-md bg-argos-bg border border-argos-border px-2 py-1.5 text-xs text-argos-ink"
          >
            {STAGE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
