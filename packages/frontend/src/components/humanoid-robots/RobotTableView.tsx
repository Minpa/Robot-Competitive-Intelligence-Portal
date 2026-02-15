'use client';

import Link from 'next/link';

interface Robot {
  id: string;
  name: string;
  companyName?: string;
  company?: { name: string };
  stage: string;
  salesStatus?: string;
  purpose: string;
  locomotionType: string;
  handType: string;
  announcedYear?: number;
  listPrice?: number;
  payload?: number;
  operatingHours?: number;
  applicationCaseCount?: number;
  distinctEnvironmentsCount?: number;
  newsEventCount?: number;
}

interface RobotTableViewProps {
  robots: Robot[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  showCheckbox?: boolean;
}

const STAGE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  concept: { label: '개념', bgColor: 'bg-slate-500/20', textColor: 'text-slate-400' },
  prototype: { label: '프로토타입', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  poc: { label: 'PoC', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
  pilot: { label: '파일럿', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400' },
  commercial: { label: '상용화', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
};

const PURPOSE_LABELS: Record<string, string> = {
  industrial: '산업용',
  home: '가정용',
  service: '서비스용',
};

const LOCOMOTION_LABELS: Record<string, string> = {
  biped: '2족 보행',
  wheel: '휠베이스',
  hybrid: '하이브리드',
};

export function RobotTableView({ robots, selectedIds, onSelect, showCheckbox }: RobotTableViewProps) {
  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              {showCheckbox && (
                <th className="p-3 text-left w-10">
                  <span className="sr-only">선택</span>
                </th>
              )}
              <th className="p-3 text-left text-xs font-medium text-slate-400">제품명</th>
              <th className="p-3 text-left text-xs font-medium text-slate-400">제조사</th>
              <th className="p-3 text-left text-xs font-medium text-slate-400">단계</th>
              <th className="p-3 text-left text-xs font-medium text-slate-400">용도</th>
              <th className="p-3 text-left text-xs font-medium text-slate-400">이동</th>
              <th className="p-3 text-right text-xs font-medium text-slate-400">적재(kg)</th>
              <th className="p-3 text-right text-xs font-medium text-slate-400">가격(USD)</th>
              <th className="p-3 text-right text-xs font-medium text-slate-400">발표</th>
              <th className="p-3 text-right text-xs font-medium text-slate-400">사례</th>
            </tr>
          </thead>
          <tbody>
            {robots.map((robot, idx) => {
              const stageConfig = STAGE_CONFIG[robot.stage] || STAGE_CONFIG.concept;
              const isSelected = selectedIds.includes(robot.id);
              
              return (
                <tr
                  key={robot.id}
                  className={`border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    idx % 2 === 0 ? 'bg-slate-800/20' : ''
                  }`}
                >
                  {showCheckbox && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelect(robot.id)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
                      />
                    </td>
                  )}
                  <td className="p-3">
                    <Link
                      href={`/humanoid-robots/${robot.id}`}
                      className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
                    >
                      {robot.name}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-slate-400">
                    {robot.companyName || robot.company?.name || '-'}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${stageConfig.bgColor} ${stageConfig.textColor}`}>
                      {stageConfig.label}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-slate-400">
                    {PURPOSE_LABELS[robot.purpose] || robot.purpose}
                  </td>
                  <td className="p-3 text-sm text-slate-400">
                    {LOCOMOTION_LABELS[robot.locomotionType] || robot.locomotionType}
                  </td>
                  <td className="p-3 text-sm text-slate-300 text-right">
                    {robot.payload ?? '-'}
                  </td>
                  <td className="p-3 text-sm text-slate-300 text-right">
                    {robot.listPrice ? `~${(robot.listPrice / 1000).toFixed(0)}K` : '-'}
                  </td>
                  <td className="p-3 text-sm text-slate-400 text-right">
                    {robot.announcedYear ?? '-'}
                  </td>
                  <td className="p-3 text-sm text-slate-400 text-right">
                    {robot.applicationCaseCount ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
