'use client';

import { Panel, Tag } from '@/components/ui';
import type { TechTrendTimelineInsightResponse, TimelineClassification, TimelinePeriod } from '@/types/tech-trend-timeline';
import { leadLagText } from './timeline-shared';

function formatDateTime(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  data?: TechTrendTimelineInsightResponse;
  loading: boolean;
  error: boolean;
  classification?: TimelineClassification;
  period?: TimelinePeriod | null;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-ink-100 text-ink-700 px-2 py-0.5 text-[11px] font-medium">
      {children}
    </span>
  );
}

/** AI 시계열 해설 — 수치 칩은 AI 문장이 아닌 서버 계산값(metrics)만 쓴다. */
export function TimelineInsightCard({ data, loading, error, classification, period }: Props) {
  const insight = data?.status === 'ok' ? data.insight : null;
  const short = !!period && period.monthCount < 6;

  const emptyMessage = (): string => {
    if (error) return '해설 생성 불가';
    switch (data?.status) {
      case 'insufficient_classification':
        return `분류 완료율이 낮아 해설을 생성하지 않았습니다(필요 80%, 현재 ${Math.floor((classification?.ratio ?? 0) * 100)}%)`;
      case 'insufficient_period':
        return '수집 기간이 짧아(3개월 미만) 해설을 생성하지 않았습니다';
      default:
        return '해설 생성 불가';
    }
  };

  return (
    <Panel
      className="report-panel"
      kicker="AI Time-Series Insight"
      title="시계열 기술 트렌드 해설"
      subtitle="수집 전체 기간의 건수 집계와 대표 제목만을 근거로 생성된 해설입니다"
      footer={
        insight
          ? `AI 생성 · ${insight.model} · ${formatDateTime(insight.generatedAt)} · ${insight.cached ? '캐시' : '신규'}${insight.stale ? ' · 갱신 중' : ''}`
          : undefined
      }
    >
      {loading ? (
        <p className="text-[13px] text-ink-500">시계열 해설을 생성하는 중… (첫 생성 시 최대 2~3분 소요)</p>
      ) : !insight ? (
        <p className="text-[13px] text-ink-500">{emptyMessage()}</p>
      ) : (
        <div className="flex flex-col gap-5">
          {short && <p className="text-[12px] text-warn">기간이 짧아 참고용입니다</p>}

          <p className="text-[14.5px] leading-relaxed text-ink-800 max-w-[820px]">{insight.overview}</p>

          {insight.rising.length > 0 && (
            <section className="flex flex-col gap-3">
              <h4 className="text-[13px] font-semibold text-ink-900">부상 주제 Top {insight.rising.length}</h4>
              {insight.rising.map((r) => (
                <div key={r.topicId} className="border border-ink-200 rounded-[8px] p-3 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink-900">{r.label}</span>
                    <Chip>
                      논문 {r.metrics.papers.prior}→{r.metrics.papers.recent}
                    </Chip>
                    <Chip>
                      영상 {r.metrics.videos.prior}→{r.metrics.videos.recent}
                    </Chip>
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink-800">{r.evidence}</p>
                  {(r.paperTitles.length > 0 || r.videoTitles.length > 0) && (
                    <ul className="text-[12px] text-ink-600 space-y-0.5 list-disc pl-4">
                      {r.paperTitles.map((t) => (
                        <li key={`p-${t}`}>
                          <span className="text-ink-500">논문</span> · {t}
                        </li>
                      ))}
                      {r.videoTitles.map((t) => (
                        <li key={`v-${t}`}>
                          <span className="text-ink-500">영상</span> · {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {insight.declining.length > 0 && (
            <section className="flex flex-col gap-2">
              <h4 className="text-[13px] font-semibold text-ink-900">감소·정체 주제</h4>
              <ul className="space-y-1.5">
                {insight.declining.map((d) => (
                  <li key={d.topicId} className="text-[13px] leading-relaxed text-ink-800">
                    <span className="font-medium">{d.label}</span>{' '}
                    <span className="text-ink-500 text-[11.5px]">
                      ({d.metrics.prior}→{d.metrics.recent}건)
                    </span>{' '}
                    — {d.note}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {insight.leadLag.length > 0 && (
            <section className="flex flex-col gap-2">
              <h4 className="text-[13px] font-semibold text-ink-900">논문(연구) vs 영상(제품화) 선후행</h4>
              <ul className="space-y-1.5">
                {insight.leadLag.map((l) => (
                  <li key={l.topicId} className="text-[13px] leading-relaxed text-ink-800 flex flex-wrap items-center gap-2">
                    <span className="font-medium">{l.label}</span>
                    <Tag tone={l.relation === 'undetermined' ? 'neutral' : 'info'} size="sm">
                      {leadLagText(l.relation, l.lagMonths)}
                    </Tag>
                    <span>{l.note}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-ink-500">선후행은 월별 피크 비교에 따른 참고용 판정이며 확정이 아닙니다.</p>
            </section>
          )}

          {insight.lgImplications.length > 0 && (
            <section className="flex flex-col gap-2">
              <h4 className="text-[13px] font-semibold text-ink-900">LG 시사점</h4>
              <ol className="space-y-2">
                {insight.lgImplications.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 inline-flex w-6 h-6 items-center justify-center rounded-full bg-ink-100 font-mono text-[11px] font-semibold text-ink-700">
                      {i + 1}
                    </span>
                    <p className="text-[13.5px] leading-relaxed text-ink-800">{s}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </Panel>
  );
}
