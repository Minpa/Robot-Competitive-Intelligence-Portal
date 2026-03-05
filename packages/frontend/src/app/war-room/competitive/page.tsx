'use client';

import { useWarRoomContext } from '@/components/war-room/WarRoomContext';
import { useGapAnalysis, useCompetitiveOverlay } from '@/hooks/useWarRoom';
import { GapAnalysisGrid } from '@/components/war-room/competitive/GapAnalysisGrid';
import { LgOverlayRadar } from '@/components/war-room/competitive/LgOverlayRadar';
import { LgOverlayBubble } from '@/components/war-room/competitive/LgOverlayBubble';
import { LgRankingCard } from '@/components/war-room/competitive/LgRankingCard';

export default function CompetitiveAnalysisPage() {
  const { selectedRobotId, isLoading: ctxLoading } = useWarRoomContext();
  const { data: gapData, isLoading: gapLoading } = useGapAnalysis(selectedRobotId);
  const { data: overlayData, isLoading: overlayLoading } = useCompetitiveOverlay(selectedRobotId);

  const isLoading = ctxLoading || gapLoading || overlayLoading;

  return (
    <div className="space-y-4">
      {/* Row 1: GAP Analysis Grid (full width) */}
      <GapAnalysisGrid
        factors={gapData?.factors ?? []}
        isLoading={isLoading}
      />

      {/* Row 2: Radar (left) | Bubble (right) */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6">
          <LgOverlayRadar data={overlayData ?? null} isLoading={isLoading} />
        </div>
        <div className="col-span-12 lg:col-span-6">
          <LgOverlayBubble data={overlayData ?? null} isLoading={isLoading} />
        </div>
      </div>

      {/* Row 3: Ranking Card */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-4">
          <LgRankingCard
            ranking={gapData?.lgRanking ?? null}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
