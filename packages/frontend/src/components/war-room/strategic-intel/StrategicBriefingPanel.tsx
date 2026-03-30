'use client';

import { useWarRoomContext } from '@/components/war-room/WarRoomContext';
import { useStrategicBriefing, useGenerateStrategicBriefing } from '@/hooks/useWarRoom';
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  Shield,
  Target,
  Clock,
  Users,
  TrendingDown,
  Eye,
  Info,
} from 'lucide-react';

const THREAT_CONFIG = {
  high: { bg: 'bg-red-500/20', text: 'text-red-400', label: '높음' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '중간' },
  low: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '낮음' },
};

const CONFIDENCE_CONFIG = {
  high: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '높음' },
  medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '중간' },
  low: { bg: 'bg-red-500/20', text: 'text-red-400', label: '낮음' },
};

export function StrategicBriefingPanel() {
  const { selectedRobotId } = useWarRoomContext();
  const { data: briefing, isLoading } = useStrategicBriefing(selectedRobotId);
  const generate = useGenerateStrategicBriefing();

  if (!selectedRobotId) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-400" />
          전략 AI 브리핑
        </h3>
        <p className="text-sm text-slate-400 mt-2">로봇을 선택해주세요.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="animate-pulse bg-slate-800/50 rounded-xl h-64" />;
  }

  // No briefing yet
  if (!briefing || briefing.message) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            전략 AI 브리핑
          </h3>
          <button
            onClick={() => generate.mutate(selectedRobotId)}
            disabled={generate.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            <Brain className={`w-4 h-4 ${generate.isPending ? 'animate-pulse' : ''}`} />
            {generate.isPending ? '분석 중...' : '브리핑 생성'}
          </button>
        </div>
        <p className="text-slate-400 text-sm">
          아직 전략 브리핑이 없습니다. 갭 분석 및 경쟁 데이터를 기반으로 AI 전략 제언을 생성합니다.
        </p>
      </div>
    );
  }

  const data = briefing;
  const gaps = data.priorityGaps || [];
  const watchlist = data.competitorWatchlist || [];

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            전략 AI 브리핑
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            생성: {new Date(data.generatedAt).toLocaleString('ko-KR')}
          </p>
        </div>
        <button
          onClick={() => generate.mutate(selectedRobotId)}
          disabled={generate.isPending}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${generate.isPending ? 'animate-spin' : ''}`} />
          {generate.isPending ? '생성 중...' : '새 브리핑'}
        </button>
      </div>

      {/* Data Confidence Banner */}
      {data.dataConfidenceNote && (
        <div className="flex items-start gap-2 p-3 mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300">{data.dataConfidenceNote}</p>
        </div>
      )}

      {/* Priority Gaps */}
      {gaps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-red-400" />
            우선 개선 영역
          </h4>
          <div className="grid gap-3">
            {gaps.map((gap: any, i: number) => {
              const conf = CONFIDENCE_CONFIG[gap.confidenceLevel as keyof typeof CONFIDENCE_CONFIG] || CONFIDENCE_CONFIG.low;
              return (
                <div key={i} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                        {gap.rank}
                      </span>
                      <span className="text-sm font-medium text-white">{gap.factorName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-slate-400 uppercase">
                        {gap.factorType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${conf.bg} ${conf.text}`}>
                        신뢰도: {conf.label}
                      </span>
                      <span className="text-sm font-mono text-red-400">
                        <TrendingDown className="w-3 h-3 inline mr-0.5" />
                        {gap.currentGap}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 mb-3">{gap.recommendation}</p>

                  {/* Actions */}
                  {gap.specificActions?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-500 mb-1">실행 항목:</p>
                      <ul className="space-y-1">
                        {gap.specificActions.map((action: string, j: number) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                            <span className="mt-1 w-1 h-1 rounded-full bg-slate-500 shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-500">
                    {gap.suggestedTimeline && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {gap.suggestedTimeline}
                      </span>
                    )}
                    {gap.potentialPartners?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {gap.potentialPartners.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Competitor Watchlist */}
      {watchlist.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-blue-400" />
            경쟁사 워치리스트
          </h4>
          <div className="space-y-2">
            {watchlist.map((w: any, i: number) => {
              const threat = THREAT_CONFIG[w.threatLevel as keyof typeof THREAT_CONFIG] || THREAT_CONFIG.medium;
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg">
                  <Shield className={`w-4 h-4 mt-0.5 shrink-0 ${threat.text}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{w.competitorName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${threat.bg} ${threat.text}`}>
                        위협 {threat.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{w.recentMove}</p>
                    <p className="text-xs text-slate-500">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      대응: {w.suggestedResponse}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overall Assessment */}
      {data.overallAssessment && (
        <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
          <h4 className="text-sm font-medium text-slate-300 mb-2">종합 평가</h4>
          <p className="text-sm text-slate-400 leading-relaxed">{data.overallAssessment}</p>
        </div>
      )}
    </div>
  );
}
