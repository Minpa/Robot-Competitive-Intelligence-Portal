'use client';

import type { AdoptionMatrixEntry } from '@/types/war-room';

interface Props {
  data: AdoptionMatrixEntry[];
  isLoading: boolean;
}

const statusColor: Record<string, string> = {
  evaluating: 'bg-blue-900/40 text-blue-300',
  adopted: 'bg-green-900/40 text-green-300',
  strategic: 'bg-purple-900/50 text-purple-300',
};

export function AdoptionHeatmap({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-white border border-ink-100 p-4">
        <div className="h-5 w-32 bg-ink-100 rounded animate-pulse mb-4" />
        <div className="h-48 bg-ink-100 rounded animate-pulse" />
      </div>
    );
  }

  // Build unique partners and robots
  const partnerNames = [...new Set(data.map((d) => d.partnerName))];
  const robotNames = [...new Set(data.map((d) => d.robotName))];
  const lookup = new Map(data.map((d) => [`${d.partnerName}__${d.robotName}`, d]));

  if (partnerNames.length === 0) {
    return (
      <div className="rounded-lg bg-white border border-ink-100 p-4">
        <h3 className="text-sm font-semibold text-ink-900 mb-4">채택 히트맵</h3>
        <p className="text-xs text-ink-500 text-center py-8">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white border border-ink-100 p-4">
      <h3 className="text-sm font-semibold text-ink-900 mb-4">채택 히트맵</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-ink-500 pb-2 pr-2 font-medium">파트너</th>
              {robotNames.map((r) => (
                <th key={r} className="text-center text-ink-500 pb-2 px-1 font-medium whitespace-nowrap">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partnerNames.map((pn) => (
              <tr key={pn}>
                <td className="text-ink-700 py-1 pr-2 whitespace-nowrap">{pn}</td>
                {robotNames.map((rn) => {
                  const entry = lookup.get(`${pn}__${rn}`);
                  return (
                    <td key={rn} className="text-center py-1 px-1">
                      {entry ? (
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColor[entry.adoptionStatus] ?? 'bg-ink-100 text-ink-500'}`}>
                          {entry.adoptionStatus}
                        </span>
                      ) : (
                        <span className="text-ink-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-blue-900/40" /> evaluating
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-green-900/40" /> adopted
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded bg-purple-900/50" /> strategic
        </span>
      </div>
    </div>
  );
}
