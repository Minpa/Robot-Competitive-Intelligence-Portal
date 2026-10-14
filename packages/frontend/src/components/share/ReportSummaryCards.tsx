'use client';

import { Panel, Tag, KpiTile, Kicker } from '@/components/ui';
import type { TechTrendReport } from '@/types/tech-trend-report';

export function ReportSummaryCards({ report }: { report: TechTrendReport }) {
  const { stats } = report;
  const secondLabel = report.secondKind === 'papers' ? '논문' : '기사';
  const secondUnit = report.secondKind === 'papers' ? '편' : '건';
  const hasTags = stats.topChannels.length > 0 || stats.topKeywords.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile className="report-panel" label="영상" value={stats.videoCount} unit="건" />
        <KpiTile className="report-panel" label={secondLabel} value={stats.paperCount} unit={secondUnit} />
        <KpiTile className="report-panel" label="활동 채널" value={stats.channelCount} unit="곳" />
        <KpiTile className="report-panel" label="기간" value={report.days} unit="일" />
      </div>

      {hasTags && (
        <Panel className="report-panel" padding="compact">
          <div className="flex flex-col gap-3">
            {stats.topChannels.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Kicker className="mr-1">활발한 채널</Kicker>
                {stats.topChannels.map((c) => (
                  <Tag key={c.name} tone="neutral" size="sm">
                    {c.name} · {c.count}
                  </Tag>
                ))}
              </div>
            )}
            {stats.topKeywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Kicker className="mr-1">기술 키워드</Kicker>
                {stats.topKeywords.map((k) => (
                  <Tag key={k.keyword} tone="info" size="sm">
                    {k.keyword} · {k.count}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
