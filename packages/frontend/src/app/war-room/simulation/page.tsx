'use client';

import { useState, useMemo } from 'react';
import { useWarRoomContext } from '@/components/war-room/WarRoomContext';
import { recalculateScores, type WhatIfSpecs, type WhatIfResult } from '@/lib/war-room-calculator';
import { WhatIfForm } from '@/components/war-room/simulation/WhatIfForm';
import { PrebuiltScenarios } from '@/components/war-room/simulation/PrebuiltScenarios';
import { BeforeAfterRadar } from '@/components/war-room/simulation/BeforeAfterRadar';
import { BeforeAfterBubble } from '@/components/war-room/simulation/BeforeAfterBubble';
import { BeforeAfterGapTable } from '@/components/war-room/simulation/BeforeAfterGapTable';
import { ScenarioManager } from '@/components/war-room/simulation/ScenarioManager';
import { GoalTracker } from '@/components/war-room/simulation/GoalTracker';
import { InvestmentPriorityMatrix } from '@/components/war-room/simulation/InvestmentPriorityMatrix';

// CLOiD default specs
const DEFAULT_SPECS: WhatIfSpecs = {
  payloadKg: 5,
  operationTimeHours: 4,
  handDof: 14,
  heightCm: 130,
  dofCount: 30,
  fingerCount: 5,
  locomotionType: 'wheeled',
  topsMax: 200,
  commercializationStage: 'poc',
  estimatedPriceUsd: 30000,
};

export default function SimulationPage() {
  const { selectedRobotId, lgRobots } = useWarRoomContext();
  const selectedRobot = lgRobots.find((r) => r.id === selectedRobotId);

  const [specs, setSpecs] = useState<WhatIfSpecs>(DEFAULT_SPECS);

  const baseResult = useMemo(() => recalculateScores(DEFAULT_SPECS), []);
  const currentResult = useMemo(() => recalculateScores(specs), [specs]);

  function handleLoad(overrides: Record<string, unknown>) {
    const loaded = { ...DEFAULT_SPECS };
    for (const [key, value] of Object.entries(overrides)) {
      if (key in loaded) {
        (loaded as any)[key] = value;
      }
    }
    setSpecs(loaded);
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left column: Form + Prebuilt + Scenario Manager */}
      <div className="col-span-12 lg:col-span-4 space-y-4">
        <WhatIfForm specs={specs} onChange={setSpecs} />
        <PrebuiltScenarios baseSpecs={DEFAULT_SPECS} onApply={setSpecs} />
        <ScenarioManager
          currentSpecs={specs}
          currentResult={currentResult}
          baseRobotId={selectedRobotId}
          onLoad={handleLoad}
        />
      </div>

      {/* Right column: Charts + Tables + Goals */}
      <div className="col-span-12 lg:col-span-8 space-y-4">
        {/* Before/After visualizations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BeforeAfterRadar before={baseResult} after={currentResult} />
          <BeforeAfterBubble
            before={baseResult}
            after={currentResult}
            robotName={selectedRobot?.name ?? 'CLOiD'}
          />
        </div>

        <BeforeAfterGapTable before={baseResult} after={currentResult} />

        {/* Goals + Investment Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GoalTracker />
          <InvestmentPriorityMatrix />
        </div>
      </div>
    </div>
  );
}
