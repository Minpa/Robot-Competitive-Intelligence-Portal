'use client';

import { X, TrendingUp, Factory, DollarSign, Users } from 'lucide-react';
import type { CompetitiveAlertRecord } from '@/types/war-room';

interface AlertDetailModalProps {
  alert: CompetitiveAlertRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (alertId: string) => void;
}

const alertConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  score_spike: { icon: TrendingUp, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', label: '점수 급등' },
  mass_production: { icon: Factory, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: '양산' },
  funding: { icon: DollarSign, color: 'bg-green-500/20 text-green-400 border-green-500/30', label: '투자' },
  partnership: { icon: Users, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '파트너십' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AlertDetailModal({ alert, isOpen, onClose, onMarkRead }: AlertDetailModalProps) {
  if (!isOpen || !alert) return null;

  const cfg = alertConfig[alert.type] ?? alertConfig.score_spike;
  const Icon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg rounded-xl border border-argos-border bg-argos-bg shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-argos-border p-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${cfg.color}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <span className="text-xs text-argos-muted">{cfg.label}</span>
              <h2 className="text-sm font-semibold text-argos-ink">{alert.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-argos-muted hover:bg-argos-bgAlt hover:text-argos-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          {alert.summary && (
            <div>
              <p className="mb-1 text-xs font-medium text-argos-muted">요약</p>
              <p className="text-sm text-argos-ink">{alert.summary}</p>
            </div>
          )}

          {alert.triggerData && Object.keys(alert.triggerData).length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-argos-muted">트리거 데이터</p>
              <div className="rounded-lg bg-argos-surface p-3">
                {Object.entries(alert.triggerData).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 text-xs">
                    <span className="text-argos-muted">{key}</span>
                    <span className="text-argos-ink">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-argos-muted">
            <span>{formatDate(alert.createdAt)}</span>
            <span>{alert.isRead ? '읽음' : '읽지 않음'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-argos-border p-4">
          {!alert.isRead && (
            <button
              type="button"
              onClick={() => onMarkRead(alert.id)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              읽음 처리
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-argos-border px-3 py-1.5 text-xs font-medium text-argos-inkSoft hover:bg-argos-bgAlt"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
