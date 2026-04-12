'use client';

import {
  useSchedulerStatus,
  usePipelineHistory,
  useTriggerScheduledTask,
  useAiBudget,
} from '@/hooks/useWarRoom';
import {
  Clock,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Server,
} from 'lucide-react';

const CRON_LABELS: Record<string, string> = {
  '0 2 * * 1': '매주 월 02:00',
  '0 3 * * 1': '매주 월 03:00',
  '0 4 * * 1': '매주 월 04:00',
};

function formatDuration(ms: number | null) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = {
    success: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle },
    running: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Loader2 },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
    failure: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
    partial_failure: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: XCircle },
  }[status] || { bg: 'bg-argos-bgAlt', text: 'text-argos-muted', icon: Clock };

  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
      <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {status}
    </span>
  );
}

export function SystemStatusPanel() {
  const { data: scheduler, isLoading: schedulerLoading } = useSchedulerStatus();
  const { data: history, isLoading: historyLoading } = usePipelineHistory();
  const { data: budget } = useAiBudget();
  const trigger = useTriggerScheduledTask();

  if (schedulerLoading) {
    return <div className="animate-pulse bg-argos-surface rounded-xl h-48" />;
  }

  const tasks = scheduler?.tasks || [];
  const runs = (history || []).slice(0, 10);
  const budgetPct = budget ? Math.min((budget.currentCostUsd / budget.limitUsd) * 100, 100) : 0;
  const budgetColor = budgetPct >= 80 ? 'bg-red-500' : budgetPct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="bg-argos-surface rounded-xl border border-argos-borderSoft p-6">
      {/* Header */}
      <h3 className="text-lg font-semibold text-argos-ink flex items-center gap-2 mb-6">
        <Server className="w-5 h-5 text-cyan-400" />
        시스템 상태
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Scheduler + Budget */}
        <div className="space-y-4">
          {/* Schedule table */}
          <div>
            <h4 className="text-sm font-medium text-argos-inkSoft flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-blue-400" />
              자동 실행 스케줄
            </h4>
            <div className="space-y-2">
              {tasks.map((t: any) => (
                <div key={t.name} className="flex items-center justify-between p-3 bg-argos-bgAlt rounded-lg">
                  <div>
                    <div className="text-sm text-argos-ink">{t.label}</div>
                    <div className="text-[11px] text-argos-muted">
                      {CRON_LABELS[t.cron] || t.cron}
                      {t.lastRun && (
                        <> &middot; 마지막: {new Date(t.lastRun).toLocaleString('ko-KR')}</>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => trigger.mutate(t.name)}
                    disabled={trigger.isPending || t.isRunning}
                    className="flex items-center gap-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
                  >
                    {t.isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    {t.isRunning ? '실행 중' : '실행'}
                  </button>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-xs text-argos-muted">스케줄러가 초기화되지 않았습니다.</p>
              )}
            </div>
          </div>

          {/* AI Budget */}
          <div className="p-4 bg-argos-bgAlt rounded-lg">
            <h4 className="text-sm font-medium text-argos-inkSoft flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-green-400" />
              AI 예산 (이번 달)
            </h4>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-bold text-argos-ink">
                ${budget?.currentCostUsd?.toFixed(2) ?? '0.00'}
              </span>
              <span className="text-sm text-argos-muted mb-0.5">/ ${budget?.limitUsd?.toFixed(2) ?? '7.00'}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-argos-bgAlt overflow-hidden">
              <div
                className={`h-3 rounded-full ${budgetColor} transition-all`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
            <p className="text-[11px] text-argos-muted mt-1">
              {budgetPct >= 80 ? '예산 소진 임박 — 초과 시 rule-based fallback 사용' : `${budgetPct.toFixed(0)}% 사용`}
            </p>
          </div>
        </div>

        {/* Right: Pipeline History */}
        <div>
          <h4 className="text-sm font-medium text-argos-inkSoft mb-3">파이프라인 실행 이력</h4>
          {historyLoading ? (
            <div className="animate-pulse bg-argos-bgAlt rounded-lg h-40" />
          ) : runs.length === 0 ? (
            <p className="text-xs text-argos-muted">실행 이력이 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {runs.map((run: any) => (
                <div key={run.id} className="p-3 bg-argos-bgAlt rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <StatusBadge status={run.status} />
                    <span className="text-[11px] text-argos-muted">
                      {formatDuration(run.totalDurationMs)}
                    </span>
                  </div>
                  <div className="text-[11px] text-argos-muted">
                    {new Date(run.startedAt).toLocaleString('ko-KR')}
                  </div>
                  {run.steps?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {run.steps.map((s: any, i: number) => (
                        <span
                          key={i}
                          className={`px-1.5 py-0.5 rounded text-[9px] ${
                            s.status === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : s.status === 'error'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}
                          title={s.errorMessage || `${s.successCount || 0} ok / ${s.failureCount || 0} fail`}
                        >
                          {s.stepName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
