'use client';

import type { DomainRobotFitEntry } from '@/types/war-room';

interface Props {
  data: DomainRobotFitEntry[];
  isLoading: boolean;
}

function fitColor(score: number | null): string {
  if (score == null) return 'bg-argos-bgAlt text-argos-faint';
  if (score >= 0.8) return 'bg-green-900/60 text-green-300';
  if (score >= 0.6) return 'bg-green-900/30 text-green-400';
  if (score >= 0.4) return 'bg-yellow-900/30 text-yellow-400';
  if (score >= 0.2) return 'bg-orange-900/30 text-orange-400';
  return 'bg-red-900/30 text-red-400';
}

export function DomainFitHeatmap({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-argos-surface border border-argos-borderSoft p-4">
        <div className="h-5 w-44 bg-argos-bgAlt rounded animate-pulse mb-4" />
        <div className="h-48 bg-argos-bgAlt rounded animate-pulse" />
      </div>
    );
  }

  const domainNames = [...new Set(data.map((d) => d.domainName))];
  const robotNames = [...new Set(data.map((d) => d.robotName))];
  const lookup = new Map(data.map((d) => [`${d.domainName}__${d.robotName}`, d.fitScore != null ? Number(d.fitScore) : null]));

  if (domainNames.length === 0) {
    return (
      <div className="rounded-lg bg-argos-surface border border-argos-borderSoft p-4">
        <h3 className="text-sm font-semibold text-argos-ink mb-4">로봇-분야 적합도</h3>
        <p className="text-xs text-argos-muted text-center py-8">데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-argos-surface border border-argos-borderSoft p-4">
      <h3 className="text-sm font-semibold text-argos-ink mb-4">로봇-분야 적합도</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-argos-muted pb-2 pr-2 font-medium">분야</th>
              {robotNames.map((r) => (
                <th key={r} className="text-center text-argos-muted pb-2 px-1 font-medium whitespace-nowrap max-w-[80px] truncate">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domainNames.map((dn) => (
              <tr key={dn}>
                <td className="text-argos-inkSoft py-1 pr-2 whitespace-nowrap">{dn}</td>
                {robotNames.map((rn) => {
                  const score = lookup.get(`${dn}__${rn}`) ?? null;
                  return (
                    <td key={rn} className="text-center py-1 px-1">
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-mono ${fitColor(score)}`}>
                        {score != null ? score.toFixed(2) : '—'}
                      </span>
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
