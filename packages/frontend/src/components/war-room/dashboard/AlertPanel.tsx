'use client';

import { TrendingUp, Factory, DollarSign, Users } from 'lucide-react';
import type { CompetitiveAlertRecord } from '@/types/war-room';
import { AlertPanelInfo } from './DashboardInfoModals';

interface AlertPanelProps {
  alerts: CompetitiveAlertRecord[];
  isLoading: boolean;
}

const alertConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  score_spike: { icon: TrendingUp, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: '점수 급등' },
  mass_production: { icon: Factory, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: '양산' },
  funding: { icon: DollarSign, color: 'bg-green-500/20 text-green-400 border-green-500/30', label: '투자' },
  partnership: { icon: Users, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '파트너십' },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function AlertPanel({ alerts, isLoading }: AlertPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="mb-3 h-5 w-44 animate-pulse rounded bg-ink-100" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded bg-ink-100" />
          ))}
        </div>
      </div>
    );
  }

  const recent = alerts.slice(0, 5);

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-ink-900">경쟁 동향 알림</h3>
        <AlertPanelInfo />
      </div>
      <p className="mt-1 text-xs text-ink-500">최근 5건</p>

      {recent.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">알림이 없습니다</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {recent.map((alert) => {
            const cfg = alertConfig[alert.type] ?? alertConfig.score_spike;
            const Icon = cfg.icon;
            return (
              <li
                key={alert.id}
                className="flex items-start gap-3 rounded-lg border border-ink-200 bg-ink-100 p-2.5"
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${cfg.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-900">{alert.title}</p>
                  {alert.summary && (
                    <p className="mt-0.5 truncate text-xs text-ink-500">{alert.summary}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-ink-500">
                  {formatRelativeTime(alert.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
