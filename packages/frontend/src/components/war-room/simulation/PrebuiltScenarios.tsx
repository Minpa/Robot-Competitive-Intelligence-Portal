'use client';

import type { WhatIfSpecs } from '@/lib/war-room-calculator';
import { Zap } from 'lucide-react';

interface Props {
  baseSpecs: WhatIfSpecs;
  onApply: (specs: WhatIfSpecs) => void;
}

interface Scenario {
  name: string;
  description: string;
  overrides: Partial<WhatIfSpecs>;
}

const PREBUILT: Scenario[] = [
  {
    name: 'Jetson Thor 탑재',
    description: 'NVIDIA Jetson Thor (800 TOPS) 적용',
    overrides: { topsMax: 800 },
  },
  {
    name: '전고체 배터리',
    description: '운용 시간 2배 증가',
    overrides: { operationTimeHours: 16 },
  },
  {
    name: 'RoboSense AC2',
    description: '고급 비전 센서 + 핸드 DoF 향상',
    overrides: { handDof: 24, fingerCount: 5 },
  },
  {
    name: '보행 추가',
    description: 'Wheeled → Bipedal 전환',
    overrides: { locomotionType: 'bipedal', heightCm: 170, dofCount: 40 },
  },
  {
    name: '양산 전환',
    description: 'PoC → Commercial 단계 전환',
    overrides: { commercializationStage: 'commercial' },
  },
  {
    name: '가격 경쟁력',
    description: '가격 50% 절감',
    overrides: {},
  },
];

export function PrebuiltScenarios({ baseSpecs, onApply }: Props) {
  function apply(scenario: Scenario) {
    const newSpecs = { ...baseSpecs };
    for (const [key, value] of Object.entries(scenario.overrides)) {
      (newSpecs as any)[key] = value;
    }
    // Special case: price competitiveness
    if (scenario.name === '가격 경쟁력') {
      newSpecs.estimatedPriceUsd = Math.round(baseSpecs.estimatedPriceUsd * 0.5);
    }
    onApply(newSpecs);
  }

  return (
    <div className="rounded-lg bg-argos-surface border border-argos-borderSoft p-4">
      <h3 className="text-sm font-semibold text-argos-ink mb-3">프리빌트 시나리오</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PREBUILT.map((s) => (
          <button
            key={s.name}
            onClick={() => apply(s)}
            className="text-left rounded-md border border-argos-borderSoft bg-argos-bgAlt p-2.5 hover:border-blue-500/50 hover:bg-argos-bgAlt transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="h-3 w-3 text-yellow-400" />
              <span className="text-xs font-medium text-argos-ink">{s.name}</span>
            </div>
            <p className="text-[10px] text-argos-muted">{s.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
