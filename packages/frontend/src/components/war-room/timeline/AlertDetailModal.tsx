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
      <div className="relative mx-4 w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg border ${cfg.color}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <span className="text-xs text-slate-400">{cfg.label}</span>
              <h2 className="text-sm font-semibold text-white">{alert.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          {alert.summary && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400">요약</p>
              <p className="text-sm text-slate-200">{alert.summary}</p>
            </div>
          )}

          {alert.triggerData && Object.keys(alert.triggerData).length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-400">트리거 데이터</p>
              <div className="rounded-lg bg-slate-800/50 p-3">
                {Object.entries(alert.triggerData).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 text-xs">
                    <span className="text-slate-400">{key}</span>
                    <span className="text-white">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{formatDate(alert.createdAt)}</span>
            <span>{alert.isRead ? '읽음' : '읽지 않음'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-800 p-4">
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
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
