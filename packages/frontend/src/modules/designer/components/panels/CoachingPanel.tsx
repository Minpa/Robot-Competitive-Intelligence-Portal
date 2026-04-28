'use client';

import { Sparkles, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { CoachingResponse, CoachingSeverity } from '../../types/robot';

const SEVERITY_STYLE: Record<CoachingSeverity, { color: string; icon: any; label: string }> = {
  high: { color: '#E63950', icon: AlertTriangle, label: 'High' },
  medium: { color: '#F2A93B', icon: AlertCircle, label: 'Medium' },
  low: { color: '#7CCBA2', icon: Info, label: 'Low' },
};

interface CoachingPanelProps {
  coaching: CoachingResponse | null;
  isLoading: boolean;
  isError: boolean;
  onRequest: () => void;
}

export function CoachingPanel({ coaching, isLoading, isError, onRequest }: CoachingPanelProps) {
  return (
    <section className="bg-[#0a0a0a] border-t border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-gold" strokeWidth={2} />
          <div className="flex flex-col">
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-gold">
              Failure Mode Coaching
            </span>
            <span className="text-[11px] text-white/55 mt-0.5">
              REQ-6 · {coaching?.modelUsed ?? 'claude-opus-4-7'}
              {coaching?.isFallback ? ' · rule-based fallback' : ''}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onRequest}
          disabled={isLoading}
          className={[
            'px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] border transition-colors',
            isLoading
              ? 'border-white/15 text-white/30 cursor-wait'
              : 'border-gold text-gold hover:bg-gold hover:text-[#0a0a0a]',
          ].join(' ')}
        >
          {isLoading ? 'Coaching…' : '코칭 받기'}
        </button>
      </div>

      {isError ? (
        <p className="text-[11px] text-[#E63950]">코칭 호출 실패. 다시 시도해 주세요.</p>
      ) : null}

      {!coaching && !isLoading && !isError ? (
        <p className="text-[11px] text-white/40 max-w-3xl leading-relaxed">
          평가 결과를 근거로 Claude API가 한국어 진단 + 권장사항을 카드로 출력합니다. API 키가
          없거나 실패 시 규칙 기반 fallback이 동일 스키마로 응답합니다 (모두 isMock).
        </p>
      ) : null}

      {coaching ? (
        <div className="space-y-3">
          <p className="text-[12px] text-white leading-relaxed">{coaching.summary}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {coaching.issues.map((issue, idx) => {
              const style = SEVERITY_STYLE[issue.severity];
              const SevIcon = style.icon;
              return (
                <div
                  key={idx}
                  className="border p-4 bg-[#0f0f0f]"
                  style={{ borderColor: `${style.color}66` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <SevIcon className="w-3.5 h-3.5" style={{ color: style.color }} strokeWidth={2} />
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.22em]"
                      style={{ color: style.color }}
                    >
                      {style.label}
                    </span>
                    {issue.relatedId ? (
                      <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/35">
                        · {issue.relatedId}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[12px] font-medium text-white leading-snug">{issue.title}</p>
                  <p className="mt-2 text-[11px] text-white/55 leading-relaxed">{issue.explanation}</p>
                  {issue.recommendations.length > 0 ? (
                    <ul className="mt-3 space-y-1">
                      {issue.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[10.5px] text-white/65">
                          <span className="text-gold mt-1">›</span>
                          <span className="leading-snug">{r}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
