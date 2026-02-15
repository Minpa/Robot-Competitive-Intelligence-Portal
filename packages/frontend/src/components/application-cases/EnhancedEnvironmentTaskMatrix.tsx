'use client';

import { useState } from 'react';

interface MatrixCell {
  count: number;
  robots: string[];
  topRobots?: Array<{ name: string; count: number }>;
  spaceTypes?: string[];
}

interface EnhancedEnvironmentTaskMatrixProps {
  matrix: Record<string, Record<string, MatrixCell>>;
  environments: Array<{ id: string; label: string }>;
  tasks: Array<{ id: string; label: string }>;
  insight?: string;
  onCellClick?: (environment: string, task: string) => void;
}

export function EnhancedEnvironmentTaskMatrix({
  matrix,
  environments,
  tasks,
  insight,
  onCellClick,
}: EnhancedEnvironmentTaskMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<{ env: string; task: string } | null>(null);

  const getHeatmapColor = (count: number) => {
    if (count >= 5) return 'bg-blue-600 text-white';
    if (count >= 3) return 'bg-blue-400 text-white';
    if (count >= 1) return 'bg-blue-200 text-blue-900';
    return 'bg-gray-50 text-gray-400';
  };

  const getCellData = (envId: string, taskId: string): MatrixCell => {
    return matrix[envId]?.[taskId] || { count: 0, robots: [] };
  };

  // 전체 건수 계산
  const totalCases = Object.values(matrix).reduce((sum, envData) => {
    return sum + Object.values(envData).reduce((s, cell) => s + (cell.count || 0), 0);
  }, 0);

  // 가장 많은 조합 찾기
  let maxCell = { env: '', task: '', count: 0 };
  Object.entries(matrix).forEach(([env, tasks]) => {
    Object.entries(tasks).forEach(([task, cell]) => {
      if (cell.count > maxCell.count) {
        maxCell = { env, task, count: cell.count };
      }
    });
  });

  const maxEnvLabel = environments.find(e => e.id === maxCell.env)?.label || maxCell.env;
  const maxTaskLabel = tasks.find(t => t.id === maxCell.task)?.label || maxCell.task;
  const maxPercentage = totalCases > 0 ? Math.round((maxCell.count / totalCases) * 100) : 0;

  const defaultInsight = totalCases > 0
    ? `현재는 '${maxEnvLabel}-${maxTaskLabel}'이 전체 사례의 ${maxPercentage}%로 가장 많음`
    : '아직 적용 사례 데이터가 없습니다.';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">환경×작업 인사이트</h2>
      
      {/* 상단 한 줄 코멘트 */}
      <p className="text-sm text-blue-600 mb-4 bg-blue-50 px-3 py-2 rounded">
        💡 {insight || defaultInsight}
      </p>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 w-20"></th>
              {tasks.filter(t => t.id).slice(0, 6).map(task => (
                <th key={task.id} className="px-2 py-2 text-center text-xs font-medium text-gray-500">
                  {task.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {environments.filter(e => e.id).slice(0, 6).map(env => (
              <tr key={env.id}>
                <td className="px-2 py-2 text-xs font-medium text-gray-700">{env.label}</td>
                {tasks.filter(t => t.id).slice(0, 6).map(task => {
                  const cell = getCellData(env.id, task.id);
                  const isHovered = hoveredCell?.env === env.id && hoveredCell?.task === task.id;
                  const topRobot = cell.robots[0];

                  return (
                    <td key={task.id} className="px-1 py-1 text-center relative">
                      <div
                        className={`
                          inline-flex flex-col items-center justify-center 
                          min-w-[70px] min-h-[50px] rounded cursor-pointer
                          transition-all duration-200
                          ${getHeatmapColor(cell.count)}
                          ${isHovered ? 'ring-2 ring-blue-500 scale-105' : ''}
                        `}
                        onMouseEnter={() => setHoveredCell({ env: env.id, task: task.id })}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => onCellClick?.(env.id, task.id)}
                      >
                        <span className="text-xs font-bold">{cell.count}건</span>
                        {topRobot && (
                          <span className="text-[10px] truncate max-w-[60px]" title={topRobot}>
                            {topRobot.length > 8 ? topRobot.slice(0, 8) + '…' : topRobot}
                          </span>
                        )}
                      </div>

                      {/* Hover 툴팁 */}
                      {isHovered && cell.count > 0 && (
                        <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg min-w-[180px]">
                          <div className="font-semibold mb-2">Top 3 로봇</div>
                          <ul className="space-y-1">
                            {cell.robots.slice(0, 3).map((robot, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <span className="text-blue-300">{i + 1}.</span> {robot}
                              </li>
                            ))}
                          </ul>
                          {cell.spaceTypes && cell.spaceTypes.length > 0 && (
                            <>
                              <div className="font-semibold mt-2 mb-1">대표 공간</div>
                              <div className="text-gray-300">{cell.spaceTypes.slice(0, 2).join(', ')}</div>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
