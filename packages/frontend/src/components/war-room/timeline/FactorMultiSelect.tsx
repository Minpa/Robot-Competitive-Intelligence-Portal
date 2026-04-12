'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface FactorMultiSelectProps {
  selected: string[];
  onChange: (factors: string[]) => void;
}

interface FactorGroup {
  label: string;
  factors: { key: string; label: string }[];
}

const FACTOR_GROUPS: FactorGroup[] = [
  {
    label: '종합',
    factors: [{ key: 'combinedScore', label: '종합 점수' }],
  },
  {
    label: 'PoC 팩터',
    factors: [
      { key: 'pocManipulation', label: '조작 능력' },
      { key: 'pocMobility', label: '이동 능력' },
      { key: 'pocAI', label: 'AI 능력' },
      { key: 'pocSafety', label: '안전성' },
      { key: 'pocDeployment', label: '배치 준비도' },
      { key: 'pocHRI', label: 'HRI' },
    ],
  },
  {
    label: 'RFM 팩터',
    factors: [
      { key: 'rfmFunding', label: '자금력' },
      { key: 'rfmTeam', label: '팀 역량' },
      { key: 'rfmPartnership', label: '파트너십' },
      { key: 'rfmMarket', label: '시장 접근' },
      { key: 'rfmIP', label: '지적재산' },
      { key: 'rfmScalability', label: '확장성' },
    ],
  },
];

export function FactorMultiSelect({ selected, onChange }: FactorMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((s) => s !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const allFactors = FACTOR_GROUPS.flatMap((g) => g.factors);
  const selectedLabels = allFactors
    .filter((f) => selected.includes(f.key))
    .map((f) => f.label);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-argos-border bg-argos-surface px-3 py-2 text-sm text-argos-ink hover:border-argos-border"
      >
        <span className="truncate">
          {selected.length === 0
            ? '팩터 선택'
            : `${selectedLabels.slice(0, 2).join(', ')}${selected.length > 2 ? ` 외 ${selected.length - 2}개` : ''}`}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-argos-muted" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-argos-border bg-argos-surface shadow-xl">
          {FACTOR_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-argos-muted">
                {group.label}
              </p>
              {group.factors.map((factor) => {
                const checked = selected.includes(factor.key);
                return (
                  <label
                    key={factor.key}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-argos-bgAlt"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(factor.key)}
                      className="h-3.5 w-3.5 rounded border-argos-border bg-argos-bgAlt text-blue-500 focus:ring-blue-500/30"
                    />
                    <span className="text-sm text-argos-ink">{factor.label}</span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
