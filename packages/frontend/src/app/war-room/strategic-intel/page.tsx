'use client';

import { DataHealthPanel } from '@/components/war-room/strategic-intel/DataHealthPanel';
import { StrategicBriefingPanel } from '@/components/war-room/strategic-intel/StrategicBriefingPanel';
import { SystemStatusPanel } from '@/components/war-room/strategic-intel/SystemStatusPanel';

export default function StrategicIntelPage() {
  return (
    <div className="space-y-6">
      {/* Section 1: Data Health */}
      <DataHealthPanel />

      {/* Section 2: Strategic Briefing */}
      <StrategicBriefingPanel />

      {/* Section 3: System Status */}
      <SystemStatusPanel />
    </div>
  );
}
