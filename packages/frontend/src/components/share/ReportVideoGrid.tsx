'use client';

import { Play } from 'lucide-react';
import { Panel, Tag } from '@/components/ui';
import type { ReportVideo } from '@/types/tech-trend-report';

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Props {
  videos: ReportVideo[];
  total: number;
  truncated: boolean;
  /** AI 판정으로 제외된 영상 수 */
  excludedCount?: number;
  /** 판정 전 영상에 "분석 대기" 배지를 표시할지 (핸드 리포트에서만) */
  showPendingBadge?: boolean;
}

export function ReportVideoGrid({ videos, total, truncated, excludedCount = 0, showPendingBadge = false }: Props) {
  const baseSubtitle = truncated
    ? `최신 ${videos.length}건만 표시`
    : '기간 내 수집된 영상입니다. 제목은 원어 그대로 표시합니다.';
  const subtitle =
    excludedCount > 0 ? `${baseSubtitle} · AI 판정으로 핸드와 무관한 영상 ${excludedCount}건 제외` : baseSubtitle;
  return (
    <Panel
      className="report-panel"
      kicker="Demo Videos"
      title={`영상 (${total}건)`}
      subtitle={subtitle}
    >
      {videos.length === 0 ? (
        <div className="py-8 text-center text-ink-400 text-sm">기간 내 수집된 영상이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <a
              key={v.id}
              href={v.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="report-panel block bg-white border border-ink-200 hover:border-ink-400 transition-colors group"
            >
              <div className="relative aspect-video bg-ink-100 overflow-hidden">
                {v.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnail} alt={v.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center">
                    <Play className="w-6 h-6 text-ink-400" />
                  </span>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[12.5px] font-semibold text-ink-900 leading-snug line-clamp-2">{v.title}</p>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {v.channel && (
                    <Tag tone="neutral" size="sm">
                      {v.channel}
                    </Tag>
                  )}
                  {v.thirdParty && (
                    <Tag tone="warn" size="sm">
                      외부 채널
                    </Tag>
                  )}
                  {showPendingBadge && v.domainFocus === null && (
                    <Tag tone="info" size="sm">
                      분석 대기
                    </Tag>
                  )}
                  <span className="text-[11px] text-ink-400">{formatDate(v.publishedAt)}</span>
                </div>
                {v.summaryKo && (
                  <p className="mt-1.5 text-[11.5px] text-ink-600 leading-relaxed line-clamp-2">{v.summaryKo}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </Panel>
  );
}
