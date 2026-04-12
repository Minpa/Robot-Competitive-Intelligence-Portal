'use client';

import { useCiFreshness } from '@/hooks/useCiUpdate';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';

function getStatusBadge(status: string) {
  switch (status) {
    case 'fresh': return { dotColor: 'bg-green-500', label: '최신', cls: 'bg-green-500/20 text-green-400' };
    case 'warning': return { dotColor: 'bg-yellow-500', label: '주의', cls: 'bg-yellow-500/20 text-yellow-400' };
    case 'stale': return { dotColor: 'bg-red-500', label: '갱신필요', cls: 'bg-red-500/20 text-red-400' };
    default: return { dotColor: 'bg-argos-muted', label: '미검증', cls: 'bg-argos-bgAlt text-argos-muted' };
  }
}

const tierLabels: Record<number, string> = {
  1: '주간',
  2: '월간',
  3: '분기',
};

export function CiFreshnessPanel() {
  const { data, isLoading, error } = useCiFreshness();
  const queryClient = useQueryClient();

  const handleVerify = async (layerId: string, competitorId: string) => {
    try {
      await api.verifyCiFreshness(layerId, competitorId);
      queryClient.invalidateQueries({ queryKey: ['ci-update', 'freshness'] });
    } catch (err) {
      console.error('Failed to verify:', err);
    }
  };

  if (isLoading) return <div className="text-argos-muted text-sm p-4">로딩 중...</div>;
  if (error) return <div className="text-red-400 text-sm p-4">에러 발생</div>;
  if (!data || data.length === 0) return <div className="text-argos-muted text-sm p-4">데이터 없음</div>;

  // Group by layer
  const byLayer = data.reduce((acc, item) => {
    if (!acc[item.layerName]) acc[item.layerName] = { icon: item.layerIcon, items: [] };
    acc[item.layerName].items.push(item);
    return acc;
  }, {} as Record<string, { icon: string | null; items: typeof data }>);

  // Overall stats
  const freshCount = data.filter(d => d.status === 'fresh').length;
  const warningCount = data.filter(d => d.status === 'warning').length;
  const staleCount = data.filter(d => d.status === 'stale').length;
  const total = data.length;

  return (
    <div className="bg-argos-surface rounded-xl border border-argos-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-argos-ink">데이터 신선도</h3>
        <div className="flex gap-3 text-xs">
          <span className="text-green-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{freshCount}</span>
          <span className="text-yellow-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />{warningCount}</span>
          <span className="text-red-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{staleCount}</span>
          <span className="text-argos-muted">전체 {total}</span>
        </div>
      </div>

      {/* Freshness bar */}
      <div className="w-full h-2 bg-argos-bgAlt rounded-full mb-4 overflow-hidden flex">
        <div className="bg-green-500 h-full" style={{ width: `${(freshCount / total) * 100}%` }} />
        <div className="bg-yellow-500 h-full" style={{ width: `${(warningCount / total) * 100}%` }} />
        <div className="bg-red-500 h-full" style={{ width: `${(staleCount / total) * 100}%` }} />
      </div>

      {/* Per-layer breakdown */}
      <div className="space-y-3">
        {Object.entries(byLayer).map(([layerName, { icon, items }]) => {
          const layerFresh = items.filter(i => i.status === 'fresh').length;
          const layerTotal = items.length;
          return (
            <div key={layerName} className="bg-argos-bgAlt rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-argos-ink">
                  {layerName}
                </span>
                <span className="text-xs text-argos-muted">
                  {layerFresh}/{layerTotal} 최신
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {items.map(item => {
                  const badge = getStatusBadge(item.status);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-argos-surface rounded px-2 py-1"
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor} shrink-0`} />
                        <span className="text-[11px] text-argos-inkSoft truncate">{item.competitorName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-argos-muted">{tierLabels[item.tier]}</span>
                        {item.status !== 'fresh' && (
                          <button
                            onClick={() => handleVerify(item.layerId, item.competitorId)}
                            className="text-[10px] text-blue-400 hover:text-blue-300"
                            title="검증 완료 표시"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
