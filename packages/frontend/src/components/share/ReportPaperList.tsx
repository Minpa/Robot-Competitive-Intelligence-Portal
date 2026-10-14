'use client';

import { FileText, ExternalLink } from 'lucide-react';
import { Panel } from '@/components/ui';
import type { ReportPaper } from '@/types/tech-trend-report';

function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

interface Props {
  papers: ReportPaper[];
  total: number;
  truncated: boolean;
  kind: 'papers' | 'news';
}

export function ReportPaperList({ papers, total, truncated, kind }: Props) {
  const label = kind === 'papers' ? '논문' : '기사';
  const unit = kind === 'papers' ? '편' : '건';
  return (
    <Panel
      className="report-panel"
      kicker={kind === 'papers' ? 'Research Papers' : 'Related News'}
      title={`${label} (${total}${unit})`}
      subtitle={
        truncated
          ? '최신 60건만 표시'
          : kind === 'papers'
            ? 'arXiv 공식 API로 수집된 논문 중 이 기술 축 키워드에 해당하는 것입니다. 제목·초록은 원어 그대로 표시합니다.'
            : '수집된 뉴스 중 이 주제 키워드에 해당하는 기사입니다.'
      }
    >
      {papers.length === 0 ? (
        <div className="py-8 text-center text-ink-400 text-sm">기간 내 수집된 {label}이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {papers.map((p) => (
            <a
              key={p.id}
              href={p.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="report-panel flex items-start gap-3 border-b border-ink-100 pb-3 last:border-b-0 hover:bg-paper transition-colors px-1"
            >
              <FileText className="w-4 h-4 shrink-0 text-gold mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-ink-900 leading-snug">{p.title}</p>
                {p.abstractSnippet && (
                  <p className="mt-1 text-[11.5px] text-ink-500 leading-relaxed">{p.abstractSnippet}</p>
                )}
                <span className="mt-1 inline-block text-[11px] text-ink-400">
                  {formatDate(p.publishedAt)}
                  {p.arxivId ? ` · arXiv:${p.arxivId}` : kind === 'papers' ? ' · arXiv' : ''}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-ink-400 mt-0.5" />
            </a>
          ))}
        </div>
      )}
    </Panel>
  );
}
