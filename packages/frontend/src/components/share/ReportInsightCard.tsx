'use client';

import { Panel, Tag } from '@/components/ui';
import type { TrendInsight } from '@/types/tech-trend-report';
import { evidenceForPoints, formatEvidenceText, safeHref } from '@/lib/tech-trend-report-html';

function formatDateTime(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ReportInsightCard({ insight }: { insight: TrendInsight | null }) {
  const evidence = insight ? evidenceForPoints(insight) : null;
  return (
    <Panel
      className="report-panel"
      kicker="AI Insight"
      title="주요 시사점"
      subtitle={
        evidence
          ? '주어진 영상 메타데이터와 논문 목록만을 근거로 생성된 시사점입니다. 각 시사점 아래에 근거가 된 영상·논문을 함께 표시합니다.'
          : '주어진 영상 메타데이터와 논문 목록만을 근거로 생성된 시사점입니다.'
      }
      footer={
        insight
          ? `AI 생성 · ${insight.model} · ${formatDateTime(insight.generatedAt)} · ${insight.cached ? '캐시' : '신규'}${insight.stale ? ' · 갱신 중' : ''}`
          : undefined
      }
    >
      {!insight ? (
        <p className="text-[13px] text-ink-500">시사점 생성 조건 미충족(영상+논문 3건 미만) 또는 생성 실패</p>
      ) : (
        <div className="flex flex-col gap-4">
          {insight.headline && (
            <p className="text-[16px] font-medium leading-relaxed text-ink-800 max-w-[820px]">{insight.headline}</p>
          )}
          <ol className="space-y-2.5">
            {insight.points.map((pt, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 inline-flex w-6 h-6 items-center justify-center rounded-full bg-ink-100 font-mono text-[11px] font-semibold text-ink-700">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] leading-relaxed text-ink-800">{pt}</p>
                  {evidence?.[i]?.map((ev, j) => {
                    const href = safeHref(ev.url);
                    const text = formatEvidenceText(ev);
                    return (
                      <p key={j} className="mt-0.5 text-[12px] leading-snug text-ink-500">
                        {href ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {text}
                          </a>
                        ) : (
                          text
                        )}
                      </p>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
          {insight.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {insight.keywords.map((k) => (
                <Tag key={k} tone="gold" size="sm">
                  {k}
                </Tag>
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
