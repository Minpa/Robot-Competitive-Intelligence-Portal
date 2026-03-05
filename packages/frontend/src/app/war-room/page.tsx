'use client';

import { useWarRoomContext } from '@/components/war-room/WarRoomContext';
import { useWarRoomDashboard } from '@/hooks/useWarRoom';
import { LgPositioningCard } from '@/components/war-room/dashboard/LgPositioningCard';
import { AlertPanel } from '@/components/war-room/dashboard/AlertPanel';
import { RadarSummary } from '@/components/war-room/dashboard/RadarSummary';
import { PartnerSummaryCard } from '@/components/war-room/dashboard/PartnerSummaryCard';
import { TopDomainsCard } from '@/components/war-room/dashboard/TopDomainsCard';
import { GoalStatusCard } from '@/components/war-room/dashboard/GoalStatusCard';

const emptyGoalStatus = { achieved: 0, on_track: 0, at_risk: 0, behind: 0 };

export default function WarRoomDashboardPage() {
  const { selectedRobotId, isLoading: ctxLoading } = useWarRoomContext();
  const { data, isLoading: dataLoading } = useWarRoomDashboard(selectedRobotId);

  const isLoading = ctxLoading || dataLoading;

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Row 1 */}
      <div className="col-span-12 lg:col-span-4">
        <LgPositioningCard
          data={data?.lgPositioning ?? null}
          isLoading={isLoading}
        />
      </div>
      <div className="col-span-12 lg:col-span-4">
        <RadarSummary
          data={data?.lgPositioning ?? null}
          isLoading={isLoading}
        />
      </div>
      <div className="col-span-12 lg:col-span-4">
        <GoalStatusCard
          data={data?.goalStatus ?? emptyGoalStatus}
          isLoading={isLoading}
        />
      </div>

      {/* Row 2 */}
      <div className="col-span-12 lg:col-span-6">
        <AlertPanel
          alerts={data?.recentAlerts ?? []}
          isLoading={isLoading}
        />
      </div>
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <PartnerSummaryCard
          data={data?.partnerSummary ?? []}
          isLoading={isLoading}
        />
      </div>
      <div className="col-span-12 md:col-span-6 lg:col-span-3">
        <TopDomainsCard
          data={data?.topDomains ?? []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
