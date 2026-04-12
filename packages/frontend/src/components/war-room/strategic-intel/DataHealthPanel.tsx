'use client';

import { useDataAudit, useRunDataAudit } from '@/hooks/useWarRoom';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Database } from 'lucide-react';

const SPEC_LABELS: Record<string, string> = {
  body: 'Body',
  hand: 'Hand',
  sensor: 'Sensor',
  computing: 'Computing',
  power: 'Power',
};

const PRIORITY_CONFIG = {
  critical: { label: '긴급', bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle },
  warning: { label: '주의', bg: 'bg-amber-500/20', text: 'text-amber-400', icon: AlertTriangle },
  ok: { label: '양호', bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle },
};

function CompletenessBar({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const h = size === 'lg' ? 'h-4' : 'h-2';
  return (
    <div className={`w-full ${h} rounded-full bg-argos-bgAlt overflow-hidden`}>
      <div className={`${h} rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
    </div>
  );
}

export function DataHealthPanel() {
  const { data, isLoading, error } = useDataAudit();
  const runAudit = useRunDataAudit();

  if (isLoading) {
    return <div className="animate-pulse bg-argos-surface rounded-xl h-64" />;
  }

  if (error || !data || data.message) {
    return (
      <div className="bg-argos-surface rounded-xl border border-argos-borderSoft p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-argos-ink flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            데이터 건강도
          </h3>
          <button
            onClick={() => runAudit.mutate()}
            disabled={runAudit.isPending}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${runAudit.isPending ? 'animate-spin' : ''}`} />
            {runAudit.isPending ? '실행 중...' : '감사 실행'}
          </button>
        </div>
        <p className="text-argos-muted text-sm">아직 감사 리포트가 없습니다. 감사를 실행해주세요.</p>
      </div>
    );
  }

  const report = data;
  const robots = report.robotResults || [];

  return (
    <div className="bg-argos-surface rounded-xl border border-argos-borderSoft p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-argos-ink flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            데이터 건강도
          </h3>
          <p className="text-xs text-argos-muted mt-1">
            마지막 감사: {new Date(report.runAt).toLocaleString('ko-KR')}
          </p>
        </div>
        <button
          onClick={() => runAudit.mutate()}
          disabled={runAudit.isPending}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${runAudit.isPending ? 'animate-spin' : ''}`} />
          {runAudit.isPending ? '실행 중...' : '재실행'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-argos-bgAlt rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-argos-ink">{report.totalRobots}</div>
          <div className="text-xs text-argos-muted">전체 로봇</div>
        </div>
        <div className="bg-argos-bgAlt rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{Math.round(report.averageCompleteness)}%</div>
          <div className="text-xs text-argos-muted">평균 완성도</div>
          <CompletenessBar value={report.averageCompleteness} size="sm" />
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{report.criticalCount}</div>
          <div className="text-xs text-argos-muted">긴급</div>
        </div>
        <div className="bg-amber-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{report.warningCount}</div>
          <div className="text-xs text-argos-muted">주의</div>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{report.okCount}</div>
          <div className="text-xs text-argos-muted">양호</div>
        </div>
      </div>

      {/* Top missing specs */}
      {report.topMissingSpecs && report.topMissingSpecs.some((s: any) => s.missingCount > 0) && (
        <div className="mb-6 p-3 bg-argos-bgAlt rounded-lg">
          <h4 className="text-sm font-medium text-argos-inkSoft mb-2">가장 많이 누락된 스펙</h4>
          <div className="flex flex-wrap gap-2">
            {report.topMissingSpecs.filter((s: any) => s.missingCount > 0).map((s: any) => (
              <span key={s.specType} className="px-2 py-1 bg-argos-surface rounded text-xs text-argos-inkSoft">
                {SPEC_LABELS[s.specType] || s.specType}: <span className="text-red-400">{s.missingCount}개 로봇 누락</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Robot grid */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        <div className="grid grid-cols-[200px_60px_1fr_80px] gap-2 text-xs text-argos-muted font-medium px-2 sticky top-0 bg-argos-surface py-2 rounded">
          <span>로봇</span>
          <span>상태</span>
          <span>스펙 완성도</span>
          <span className="text-right">전체</span>
        </div>
        {robots.map((r: any) => {
          const cfg = PRIORITY_CONFIG[r.priority as keyof typeof PRIORITY_CONFIG];
          const Icon = cfg.icon;
          return (
            <div key={r.robotId} className="grid grid-cols-[200px_60px_1fr_80px] gap-2 items-center px-2 py-2 rounded-lg hover:bg-argos-bgAlt transition-colors">
              <div className="truncate">
                <span className="text-sm text-argos-ink">{r.robotName}</span>
                {r.companyName && (
                  <span className="text-xs text-argos-muted ml-1">{r.companyName}</span>
                )}
              </div>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
                <Icon className="w-3 h-3" />
                {cfg.label}
              </span>
              <div className="flex gap-1 items-center">
                {(['body', 'hand', 'sensor', 'computing', 'power'] as const).map(spec => (
                  <div key={spec} className="flex-1" title={`${SPEC_LABELS[spec]}: ${r.completeness[spec]}%`}>
                    <CompletenessBar value={r.completeness[spec]} />
                  </div>
                ))}
              </div>
              <div className="text-right text-sm font-medium text-argos-inkSoft">
                {r.completeness.overall}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
