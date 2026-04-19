'use client';

import { useCiMonitorAlerts } from '@/hooks/useCiUpdate';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function CiMonitorAlertsPanel() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const { data, isLoading, error } = useCiMonitorAlerts(statusFilter);
  const [processing, setProcessing] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleReview = async (alertId: string, newStatus: string) => {
    setProcessing(alertId);
    try {
      await api.reviewCiMonitorAlert(alertId, newStatus, 'admin');
      queryClient.invalidateQueries({ queryKey: ['ci-update', 'monitor-alerts'] });
    } catch (err) {
      console.error('Failed to review alert:', err);
    } finally {
      setProcessing(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'reviewed': return 'bg-blue-500/20 text-blue-400';
      case 'applied': return 'bg-green-500/20 text-green-400';
      case 'dismissed': return 'bg-ink-100 text-ink-500';
      default: return 'bg-ink-100 text-ink-500';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-ink-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-900">모니터링 알림</h3>
        <div className="flex gap-1">
          {[undefined, 'pending', 'reviewed', 'applied', 'dismissed'].map(s => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`text-[11px] px-2 py-0.5 rounded ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-ink-100 text-ink-500 hover:text-ink-700'
              }`}
            >
              {s || '전체'}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-ink-500 text-sm">로딩 중...</div>}
      {error && <div className="text-red-400 text-sm">에러 발생</div>}

      {data && data.length === 0 && (
        <p className="text-ink-500 text-xs">알림이 없습니다.</p>
      )}

      <div className="space-y-2 max-h-[400px] overflow-auto">
        {data?.map(alert => (
          <div key={alert.id} className="bg-ink-100 rounded-lg p-3">
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-900 font-medium truncate">{alert.headline}</p>
                {alert.summary && (
                  <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{alert.summary}</p>
                )}
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ml-2 whitespace-nowrap ${statusBadge(alert.status)}`}>
                {alert.status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-[10px] text-ink-500">
                {alert.sourceName && <span>{alert.sourceName}</span>}
                <span>{new Date(alert.detectedAt).toLocaleDateString('ko-KR')}</span>
              </div>
              {alert.status === 'pending' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleReview(alert.id, 'dismissed')}
                    disabled={processing === alert.id}
                    className="text-[10px] px-2 py-0.5 rounded bg-ink-100 text-ink-700 hover:bg-ink-100"
                  >
                    무시
                  </button>
                  <button
                    onClick={() => handleReview(alert.id, 'reviewed')}
                    disabled={processing === alert.id}
                    className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-500"
                  >
                    검토
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
