'use client';

import { useState } from 'react';
import { TrendingUp, Factory, DollarSign, Users, Bell } from 'lucide-react';
import type { CompetitiveAlertRecord } from '@/types/war-room';

interface AlertListProps {
  alerts: CompetitiveAlertRecord[];
  isLoading: boolean;
  onAlertClick: (alert: CompetitiveAlertRecord) => void;
  onMarkRead: (alertId: string) => void;
}

const alertConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  score_spike: { icon: TrendingUp, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: '점수 급등' },
  mass_production: { icon: Factory, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: '양산' },
  funding: { icon: DollarSign, color: 'bg-green-500/20 text-green-400 border-green-500/30', label: '투자' },
  partnership: { icon: Users, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '파트너십' },
};

const TYPE_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'score_spike', label: '점수 급등' },
  { key: 'mass_production', label: '양산' },
  { key: 'funding', label: '투자' },
  { key: 'partnership', label: '파트너십' },
];

const READ_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'unread', label: '읽지 않음' },
  { key: 'read', label: '읽음' },
];

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function AlertList({ alerts, isLoading, onAlertClick, onMarkRead }: AlertListProps) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

  const filtered = alerts.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    if (readFilter === 'unread' && a.isRead) return false;
    if (readFilter === 'read' && !a.isRead) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-argos-border bg-argos-bg p-4">
        <div className="mb-3 h-5 w-32 animate-pulse rounded bg-argos-bgAlt" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 w-full animate-pulse rounded bg-argos-bgAlt" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-argos-border bg-argos-bg p-4">
      <div className="mb-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-argos-muted" />
        <h3 className="text-sm font-semibold text-argos-ink">경쟁 알림</h3>
        <span className="ml-auto text-xs text-argos-muted">{filtered.length}건</span>
      </div>

      {/* Type filter */}
      <div className="mb-2 flex flex-wrap gap-1">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setTypeFilter(f.key)}
            className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
              typeFilter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-argos-bgAlt text-argos-muted hover:text-argos-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Read filter */}
      <div className="mb-3 flex flex-wrap gap-1">
        {READ_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setReadFilter(f.key)}
            className={`rounded-md px-2 py-0.5 text-xs transition-colors ${
              readFilter === f.key
                ? 'bg-argos-bgAlt text-argos-ink'
                : 'bg-argos-bgAlt text-argos-muted hover:text-argos-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-argos-muted">알림이 없습니다</p>
      ) : (
        <ul className="max-h-[500px] space-y-2 overflow-y-auto">
          {filtered.map((alert) => {
            const cfg = alertConfig[alert.type] ?? alertConfig.score_spike;
            const Icon = cfg.icon;
            return (
              <li
                key={alert.id}
                className={`group cursor-pointer rounded-lg border p-2.5 transition-colors hover:bg-argos-bgAlt ${
                  alert.isRead
                    ? 'border-argos-border bg-argos-surface'
                    : 'border-argos-border bg-argos-surface'
                }`}
                onClick={() => onAlertClick(alert)}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${cfg.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${alert.isRead ? 'text-argos-muted' : 'text-argos-ink'}`}>
                      {alert.title}
                    </p>
                    {alert.summary && (
                      <p className="mt-0.5 truncate text-xs text-argos-muted">{alert.summary}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-argos-muted">{formatRelativeTime(alert.createdAt)}</span>
                    {!alert.isRead && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkRead(alert.id);
                        }}
                        className="rounded px-1.5 py-0.5 text-xs text-blue-400 opacity-0 transition-opacity hover:bg-blue-500/20 group-hover:opacity-100"
                      >
                        읽음
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
