'use client';

import { useState, useEffect } from 'react';
import { useWarRoomContext } from '@/components/war-room/WarRoomContext';
import { useGapAnalysis, useCompetitiveOverlay, useAvailableCompetitors } from '@/hooks/useWarRoom';
import { GapAnalysisGrid } from '@/components/war-room/competitive/GapAnalysisGrid';
import { LgOverlayRadar } from '@/components/war-room/competitive/LgOverlayRadar';
import { LgOverlayBubble } from '@/components/war-room/competitive/LgOverlayBubble';
import { LgRankingCard } from '@/components/war-room/competitive/LgRankingCard';
import { CompetitorSelector } from '@/components/war-room/competitive/CompetitorSelector';

export default function CompetitiveAnalysisPage() {
  const { selectedRobotId, isLoading: ctxLoading } = useWarRoomContext();
  const [selectedCompetitorIds, setSelectedCompetitorIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: availableCompetitors, isLoading: competitorsLoading } =
    useAvailableCompetitors(selectedRobotId);

  // Default to top 5 when competitors load
  useEffect(() => {
    if (availableCompetitors && !initialized) {
      setSelectedCompetitorIds(availableCompetitors.slice(0, 5).map((c) => c.robotId));
      setInitialized(true);
    }
  }, [availableCompetitors, initialized]);

  // Reset when LG robot changes
  useEffect(() => {
    setInitialized(false);
  }, [selectedRobotId]);

  const competitorIdsParam = selectedCompetitorIds.length > 0 ? selectedCompetitorIds : undefined;
  const { data: gapData, isLoading: gapLoading } = useGapAnalysis(selectedRobotId, competitorIdsParam);
  const { data: overlayData, isLoading: overlayLoading } = useCompetitiveOverlay(selectedRobotId, competitorIdsParam);

  const isLoading = ctxLoading || gapLoading || overlayLoading;

  return (
    <div className="space-y-4">
      {/* Competitor Selector */}
      <CompetitorSelector
        competitors={availableCompetitors ?? []}
        selectedIds={selectedCompetitorIds}
        onSelectionChange={setSelectedCompetitorIds}
        isLoading={competitorsLoading}
      />

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
