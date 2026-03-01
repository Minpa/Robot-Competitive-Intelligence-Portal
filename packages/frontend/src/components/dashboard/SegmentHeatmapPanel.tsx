'use client';

import { useState, useMemo } from 'react';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';

export interface SegmentCell {
  count: number;
  robots: Array<{ id: string; name: string }>;
  companyCount?: number;
  recentEvents?: number;
}

export interface SegmentHeatmapPanelProps {
  matrix: Record<string, Record<string, SegmentCell>>;
  rows: string[];      // environment types (industrial, home, service)
  columns: string[];   // locomotion types (bipedal/biped, wheeled/wheel, hybrid)
  totalCount: number;
  isLoading?: boolean;
  taskTypeFilter?: string;
  taskTypes?: string[];
  onCellClick?: (environment: string, locomotion: string, cell: SegmentCell) => void;
  onTaskTypeChange?: (taskType: string) => void;
}

const environmentLabels: Record<string, string> = {
  industrial: '산업용',
  home: '가정용',
  service: '서비스용',
};

const locomotionLabels: Record<string, string> = {
  bipedal: '2족 보행',
  biped: '2족 보행',
  wheeled: '휠베이스',
  wheel: '휠베이스',
  hybrid: '하이브리드',
};

const DEFAULT_TASK_TYPES = [
  '전체',
  'Assembly',
  'Picking',
  'Inspection',
  'Delivery',
  'Cleaning',
  'Assistance',
  'Other',
];

const DEFAULT_ENVIRONMENTS = ['industrial', 'home', 'service'];
const DEFAULT_LOCOMOTIONS = ['biped', 'wheeled', 'hybrid'];

export function SegmentHeatmapPanel({
  matrix,
  rows,
  columns,
  totalCount,
  isLoading = false,
  taskTypeFilter,
  taskTypes,
  onCellClick,
  onTaskTypeChange,
}: SegmentHeatmapPanelProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: string; col: string } | null>(null);
  const [localTaskType, setLocalTaskType] = useState<string>('전체');

  const activeTaskType = taskTypeFilter ?? localTaskType;
  const availableTaskTypes = taskTypes ?? DEFAULT_TASK_TYPES;

  const allCellsEmpty = useMemo(() => {
    const displayRows = rows.length > 0 ? rows : DEFAULT_ENVIRONMENTS;
    const displayCols = columns.length > 0 ? columns : DEFAULT_LOCOMOTIONS;
    return displayRows.every((row) =>
      displayCols.every((col) => {
        const cell = matrix[row]?.[col];
        return !cell || cell.count === 0;
      })
    );
  }, [matrix, rows, columns]);

  const handleTaskTypeChange = (value: string) => {
    setLocalTaskType(value);
    onTaskTypeChange?.(value);
  };

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-slate-800/50';
    if (count <= 2) return 'bg-blue-900/60';
    if (count <= 5) return 'bg-blue-700/70';
    if (count <= 10) return 'bg-blue-600/80';
    return 'bg-blue-500';
  };

  const getTextColor = (count: number) => {
    if (count === 0) return 'text-slate-500';
    return 'text-white';
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 h-full animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/2 mb-4" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (allCellsEmpty) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 h-full">
        <EmptyChartPlaceholder
          title="세그먼트 데이터 없음"
          message="세그먼트 데이터가 없습니다"
          icon="🗺️"
          dataType="로봇"
          minDataCount={1}
        />
      </div>
    );
  }

  // Rows = environment (Y axis), Columns = locomotion (X axis)
  const displayRows = rows.length > 0 ? rows : DEFAULT_ENVIRONMENTS;
  const displayCols = columns.length > 0 ? columns : DEFAULT_LOCOMOTIONS;

  return (
    <div className="bg-slate-900 rounded-xl p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">🗺️</span>
            세그먼트 매트릭스
          </h3>
          <p className="text-xs text-slate-400 mt-1">환경 × 이동 방식별 로봇 분포</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Task type dropdown filter */}
          <select
            value={activeTaskType}
            onChange={(e) => handleTaskTypeChange(e.target.value)}
            className="text-sm bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {availableTaskTypes.map((type) => (
              <option key={type} value={type}>
                {type === '전체' ? '작업 유형: 전체' : type}
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            총 {totalCount}개
          </span>
        </div>
      </div>

      {/* Matrix: rows=environment, columns=locomotion */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-slate-500 uppercase w-24" />
              {displayCols.map((col) => (
                <th key={col} className="p-2 text-center text-xs font-medium text-slate-400 uppercase">
                  {locomotionLabels[col] || col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row}>
                <td className="p-2 text-sm font-medium text-slate-300">
                  {environmentLabels[row] || row}
                </td>
                {displayCols.map((col) => {
                  const cell = matrix[row]?.[col] || { count: 0, robots: [] };
                  const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;

                  return (
                    <td key={col} className="p-1">
                      <div
                        className={`
                          relative rounded-lg p-3 cursor-pointer transition-all
                          ${getHeatmapColor(cell.count)}
                          ${isHovered ? 'ring-2 ring-blue-400 scale-105' : ''}
                        `}
                        onMouseEnter={() => setHoveredCell({ row, col })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => onCellClick?.(row, col, cell)}
                      >
                        {/* Main count */}
                        <div className={`text-center ${getTextColor(cell.count)}`}>
                          <div className="text-2xl font-bold">{cell.count}</div>
                          <div className="text-xs opacity-70">제품</div>
                        </div>

                        {/* Hover tooltip */}
                        {isHovered && cell.count > 0 && (
                          <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl min-w-[180px]">
                            <div className="text-xs text-slate-400 mb-2">Top 3 로봇</div>
                            <ul className="space-y-1">
                              {cell.robots.slice(0, 3).map((robot) => (
                                <li key={robot.id} className="text-sm text-white truncate">
                                  • {robot.name}
                                </li>
                              ))}
                            </ul>
                            {cell.robots.length > 3 && (
                              <div className="text-xs text-slate-500 mt-2">
                                +{cell.robots.length - 3}개 더보기
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
        <span>적음</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-slate-800/50" />
          <div className="w-4 h-4 rounded bg-blue-900/60" />
          <div className="w-4 h-4 rounded bg-blue-700/70" />
          <div className="w-4 h-4 rounded bg-blue-600/80" />
          <div className="w-4 h-4 rounded bg-blue-500" />
        </div>
        <span>많음</span>
      </div>
    </div>
  );
}
