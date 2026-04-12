'use client';

import { useState } from 'react';
import { useWarRoomGoals, useCreateWarRoomGoal } from '@/hooks/useWarRoom';
import type { StrategicGoal } from '@/types/war-room';
import { Target, Plus } from 'lucide-react';

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  achieved: { bg: 'bg-green-900/40', text: 'text-green-400', label: '달성' },
  on_track: { bg: 'bg-blue-900/40', text: 'text-blue-400', label: '순조' },
  at_risk: { bg: 'bg-yellow-900/40', text: 'text-yellow-400', label: '주의' },
  behind: { bg: 'bg-red-900/40', text: 'text-red-400', label: '지연' },
};

export function GoalTracker() {
  const { data: goals, isLoading } = useWarRoomGoals();
  const createMutation = useCreateWarRoomGoal();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [metricType, setMetricType] = useState('combined_score');
  const [targetValue, setTargetValue] = useState(50);

  async function handleCreate() {
    if (!title.trim()) return;
    await createMutation.mutateAsync({
      title: title.trim(),
      metric_type: metricType,
      target_value: targetValue,
    });
    setTitle('');
    setShowForm(false);
  }

  if (isLoading) {
    return (
      <div className="rounded-lg bg-argos-surface border border-argos-borderSoft p-4">
        <div className="h-5 w-32 bg-argos-bgAlt rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-argos-bgAlt rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-argos-surface border border-argos-borderSoft p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-argos-ink flex items-center gap-1.5">
          <Target className="h-4 w-4 text-blue-400" />
          전략 목표
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded p-1 text-argos-muted hover:text-blue-400 hover:bg-argos-bgAlt"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-md bg-argos-bgAlt border border-argos-borderSoft p-3 space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="목표 제목"
            className="w-full rounded-md bg-argos-surface border border-argos-border px-2 py-1 text-xs text-argos-ink placeholder-argos-muted"
          />
          <div className="flex gap-2">
            <select
              value={metricType}
              onChange={(e) => setMetricType(e.target.value)}
              className="flex-1 rounded-md bg-argos-surface border border-argos-border px-2 py-1 text-xs text-argos-ink"
            >
              <option value="combined_score">종합 점수</option>
              <option value="poc_total">PoC 합계</option>
              <option value="rfm_total">RFM 합계</option>
              <option value="partner_count">파트너 수</option>
              <option value="domain_readiness">도메인 준비도</option>
            </select>
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              className="w-20 rounded-md bg-argos-surface border border-argos-border px-2 py-1 text-xs text-argos-ink"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || createMutation.isPending}
            className="w-full rounded-md bg-blue-600 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            추가
          </button>
        </div>
      )}

      <div className="space-y-2">
        {(goals ?? []).length === 0 ? (
          <p className="text-xs text-argos-muted text-center py-4">전략 목표 없음</p>
        ) : (
          (goals ?? []).map((g: StrategicGoal) => {
            const cfg = statusConfig[g.status ?? 'behind'] ?? statusConfig.behind;
            const progress = g.targetValue > 0 ? Math.min(((g.currentValue ?? 0) / g.targetValue) * 100, 100) : 0;
            return (
              <div key={g.id} className="rounded-md bg-argos-bgAlt border border-argos-borderSoft p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-argos-ink">{g.title}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </div>
                <div className="h-1.5 bg-argos-bgAlt rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all ${
                      progress >= 100 ? 'bg-green-500' : progress >= 60 ? 'bg-blue-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-argos-muted">
                  <span>{g.currentValue ?? 0} / {g.targetValue}</span>
                  {g.deadline && <span>마감: {new Date(g.deadline).toLocaleDateString('ko-KR')}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
