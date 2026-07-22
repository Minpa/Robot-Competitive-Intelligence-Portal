'use client';

export interface TrendSummaryData {
  summary: string;
  headline?: string;
  points?: { title: string; body: string }[];
  generatedAt?: string;
}

interface Props {
  title?: string;
  loading: boolean;
  data?: TrendSummaryData;
  /** 우측 기간 라벨 (기본: 최근 60일) */
  windowLabel?: string;
}

/** 구버전(평문+마크다운 기호) 요약 폴백 렌더링 — #/불릿 제거, **강조** 변환 */
function LegacyText({ text }: { text: string }) {
  const cleaned = text
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .trim();
  const segments = cleaned.split(/\*\*(.+?)\*\*/g);
  return (
    <p className="text-[14px] leading-relaxed text-ink-700">
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
 * AI 트렌드 요약 카드 (뉴트럴 디자인)
 * 헤더(닷 + 라벨 + 기간) → 리드 문장 → 2열 하이라이트(◆ 소제목 — 설명).
 * 구조가 없는 응답(구버전 캐시)은 마크다운 기호를 정리한 평문으로 표시한다.
 */
export function TrendSummaryCard({ loading, data, windowLabel = '최근 60일' }: Props) {
  return (
    <section className="bg-white border border-ink-200 rounded-[14px] shadow-report px-7 py-[26px]">
      {/* Header row */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-2 h-2 rounded-full bg-ink-600 shrink-0" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-[2px] text-ink-600">
          AI Trend Summary
        </span>
        <span className="ml-auto text-[12px] text-ink-400">{windowLabel}</span>
      </div>

      {loading ? (
        <p className="text-[14px] text-ink-500">요약을 생성하는 중...</p>
      ) : !data ? (
        <p className="text-[14px] text-ink-500">요약을 불러오지 못했습니다.</p>
      ) : data.points && data.points.length > 0 ? (
        <>
          {data.headline && (
            <p className="text-[16px] font-medium leading-relaxed text-ink-800 max-w-[820px] mb-5">
              {data.headline}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3.5 gap-x-8">
            {data.points.map((p, i) => (
              <div key={i} className="flex gap-3">
                <span className="shrink-0 text-[13px] text-ink-400 mt-0.5" aria-hidden>
                  ◆
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink-900 mb-0.5">{p.title}</p>
                  <p className="text-[13px] leading-relaxed text-ink-600">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <LegacyText text={data.summary} />
      )}
    </section>
  );
}
