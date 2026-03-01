'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import { SegmentHeatmapPanel, SegmentCell } from '../dashboard/SegmentHeatmapPanel';
import { SegmentDetailDrawer } from '../dashboard/SegmentDetailDrawer';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';

interface SegmentHeatmapTabProps {
  filters: GlobalFilterParams;
}

export function SegmentHeatmapTab({ filters }: SegmentHeatmapTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ env: string; locomotion: string } | null>(null);
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('전체');

  const { data, isLoading, isError, refetch: refetchHeatmap } = useQuery({
    queryKey: ['exec-segment-heatmap', filters],
    queryFn: () => api.getSegmentHeatmap(filters),
    staleTime: 86_400_000, // 24h
    gcTime: 86_400_000,
  });

  const { data: drawerData, isLoading: drawerLoading, isError: drawerError, error: drawerErr, refetch: refetchDrawer } = useQuery({
    queryKey: ['exec-segment-drawer', selectedCell?.env, selectedCell?.locomotion],
    queryFn: () => selectedCell ? api.getSegmentHeatmapRobots(selectedCell.env, selectedCell.locomotion) : null,
    enabled: !!selectedCell && drawerOpen,
  });

  // Transform API data to SegmentHeatmapPanel format
  const matrix: Record<string, Record<string, SegmentCell>> = {};
  const environments = ['industrial', 'home', 'service'];
  const locomotions = ['biped', 'wheeled', 'hybrid'];

  if (data?.cells) {
    for (const cell of data.cells) {
      const env = cell.environment?.toLowerCase() || '';
      const loco = cell.locomotion?.toLowerCase() || '';
      if (!matrix[env]) matrix[env] = {};
      matrix[env][loco] = {
        count: cell.robotCount || 0,
        robots: cell.robots || [],
        companyCount: cell.companyCount,
      };
    }
  }

  // Ensure all 9 cells exist (3 env × 3 locomotion)
  for (const env of environments) {
    if (!matrix[env]) matrix[env] = {};
    for (const loco of locomotions) {
      if (!matrix[env][loco]) {
        matrix[env][loco] = { count: 0, robots: [] };
      }
    }
  }

  const totalCount = Object.values(matrix).reduce(
    (sum, row) => sum + Object.values(row).reduce((s, cell) => s + cell.count, 0),
    0
  );

  const handleCellClick = (environment: string, locomotion: string) => {
    setSelectedCell({ env: environment, locomotion });
    setDrawerOpen(true);
  };

  return (
    <div>
      <ErrorFallbackWrapper
        isError={isError}
        isLoading={false}
        fallbackType="cache"
        cachedData={data}
        isStale={isError && !!data}
        onRetry={() => refetchHeatmap()}
      >
        <SegmentHeatmapPanel
          matrix={matrix}
          rows={environments}
          columns={locomotions}
          totalCount={totalCount}
          isLoading={isLoading}
          taskTypeFilter={taskTypeFilter}
          taskTypes={data?.taskTypes || undefined}
          onCellClick={(env, loco) => handleCellClick(env, loco)}
          onTaskTypeChange={setTaskTypeFilter}
        />
      </ErrorFallbackWrapper>

      {/* SegmentDetailDrawer — fallback: error_message + retry */}
      {drawerOpen && drawerError ? (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => { setDrawerOpen(false); setSelectedCell(null); }}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">세그먼트 상세</h2>
              <button
                onClick={() => { setDrawerOpen(false); setSelectedCell(null); }}
                className="p-2 hover:bg-slate-800 rounded-lg"
                aria-label="닫기"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 p-4">
              <ErrorFallbackWrapper
                isError={true}
                isLoading={false}
                error={drawerErr as Error}
                fallbackType="error_message"
                onRetry={() => refetchDrawer()}
              >
                <div />
              </ErrorFallbackWrapper>
            </div>
          </div>
        </>
      ) : (
        <SegmentDetailDrawer
          isOpen={drawerOpen}
          onClose={() => { setDrawerOpen(false); setSelectedCell(null); }}
          locomotion={selectedCell?.locomotion || ''}
          purpose={selectedCell?.env || ''}
          topCompanies={drawerData?.topCompanies || []}
          recentEvents={drawerData?.recentEvents || []}
          totalRobots={drawerData?.totalCount || 0}
          robots={drawerData?.robots || []}
          isLoading={drawerLoading}
        />
      )}
    </div>
  );
}
