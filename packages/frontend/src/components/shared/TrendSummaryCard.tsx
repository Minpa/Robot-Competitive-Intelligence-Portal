'use client';

import { InsightBox } from '@/components/ui';

export interface TrendSummaryData {
  summary: string;
  headline?: string;
  points?: { title: string; body: string }[];
  generatedAt?: string;
}

interface Props {
  title: string;
  loading: boolean;
  data?: TrendSummaryData;
}

/** 구버전(평문+마크다운 기호) 요약 폴백 렌더링 — #/불릿 제거, **강조** 변환 */
function LegacyText({ text }: { text: string }) {
  const cleaned = text
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .trim();
  const segments = cleaned.split(/\*\*(.+?)\*\*/g);
  return (
    <p className="text-[13px] leading-relaxed">
      {segments.map((seg, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-ink-900">
            {seg}
          </strong>
        ) : (
          <span key={i}>{seg}</span>
        )
      )}
    </p>
  );
}

/**
 * AI 트렌드 요약 카드 — 구조화 응답(headline + points)을 소제목/불릿으로 렌더링.
 * 구조가 없는 응답(구버전 캐시)은 마크다운 기호를 정리한 평문으로 표시한다.
 */
export function TrendSummaryCard({ title, loading, data }: Props) {
  return (
    <InsightBox label="AI Trend Summary" tone="gold" title={title}>
      {loading ? (
        <p className="text-[13px] leading-relaxed text-ink-500">요약을 생성하는 중...</p>
      ) : !data ? (
        <p className="text-[13px] leading-relaxed text-ink-500">요약을 불러오지 못했습니다.</p>
      ) : data.points && data.points.length > 0 ? (
        <div className="space-y-3">
          {data.headline && (
            <p className="text-[13.5px] font-semibold text-ink-900 leading-snug">{data.headline}</p>
          )}
          <ul className="space-y-2.5">
            {data.points.map((p, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 mt-[7px] w-1.5 h-1.5 bg-gold" aria-hidden />
                <p className="text-[12.5px] leading-relaxed text-ink-700">
                  <strong className="font-semibold text-ink-900">{p.title}</strong>
                  <span className="text-ink-300 mx-1.5">—</span>
                  {p.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <LegacyText text={data.summary} />
      )}
    </InsightBox>
  );
}
