'use client';

import { useState, useMemo } from 'react';
import { useWarRoomContext } from '@/components/war-room/WarRoomContext';
import { useScoreHistory, useWarRoomAlerts, useMarkAlertRead, useWarRoomLgRobots } from '@/hooks/useWarRoom';
import { ScoreTrendChart } from '@/components/war-room/timeline/ScoreTrendChart';
import { RobotMultiSelect } from '@/components/war-room/timeline/RobotMultiSelect';
import { FactorMultiSelect } from '@/components/war-room/timeline/FactorMultiSelect';
import { AlertList } from '@/components/war-room/timeline/AlertList';
import { AlertDetailModal } from '@/components/war-room/timeline/AlertDetailModal';
import type { CompetitiveAlertRecord } from '@/types/war-room';

export default function TimelinePage() {
  const { selectedRobotId, lgRobots } = useWarRoomContext();
  const { data: allRobots } = useWarRoomLgRobots();

  // State
  const [selectedRobotIds, setSelectedRobotIds] = useState<string[]>(() =>
    selectedRobotId ? [selectedRobotId] : [],
  );
  const [selectedFactors, setSelectedFactors] = useState<string[]>(['combinedScore']);
  const [months] = useState(24);
  const [selectedAlert, setSelectedAlert] = useState<CompetitiveAlertRecord | null>(null);

  // Data
  const { data: historyData, isLoading: historyLoading } = useScoreHistory(selectedRobotIds, months);
  const { data: alerts, isLoading: alertsLoading } = useWarRoomAlerts();
  const markRead = useMarkAlertRead();

  // Robot name map
  const robotNames = useMemo(() => {
    const map = new Map<string, string>();
    if (allRobots) {
      for (const r of allRobots) map.set(r.id, r.name);
    }
    for (const r of lgRobots) map.set(r.id, r.name);
    return map;
  }, [allRobots, lgRobots]);

  const handleMarkRead = (alertId: string) => {
    markRead.mutate({ alertId });
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left: Chart area */}
      <div className="col-span-12 space-y-4 lg:col-span-8">
        {/* Filter bar */}
        <div className="rounded-xl border border-argos-border bg-argos-surface p-4 shadow-argos-card">
          <h3 className="mb-3 text-sm font-semibold text-argos-ink">필터</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-argos-muted">로봇 선택</label>
              <RobotMultiSelect
                robots={lgRobots}
                selected={selectedRobotIds}
                onChange={setSelectedRobotIds}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-argos-muted">팩터 선택</label>
              <FactorMultiSelect
                selected={selectedFactors}
                onChange={setSelectedFactors}
              />
            </div>
          </div>
        </div>

        {/* Score Trend Chart */}
        <ScoreTrendChart
          data={historyData ?? []}
          selectedFactors={selectedFactors}
          robotNames={robotNames}
          isLoading={historyLoading}
        />
      </div>

      {/* Right: Alert panel */}
      <div className="col-span-12 lg:col-span-4">
        <AlertList
          alerts={alerts ?? []}
          isLoading={alertsLoading}
          onAlertClick={setSelectedAlert}
          onMarkRead={handleMarkRead}
        />
      </div>

      {/* Alert Detail Modal */}
      <AlertDetailModal
        alert={selectedAlert}
        isOpen={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onMarkRead={(alertId) => {
          handleMarkRead(alertId);
          setSelectedAlert(null);
        }}
      />
    </div>
  );
}
