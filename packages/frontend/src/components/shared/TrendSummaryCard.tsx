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

/**
 * 구버전(평문+마크다운) 요약을 라인 단위로 분해 —
 * **굵은 구절**을 키워드로 보고 다음 굵은 구절 전까지를 설명으로 묶는다.
 */
function parseLegacy(text: string): { lede: string; items: { title: string; body: string }[] } {
  // JSON형 텍스트(생성 실패로 원문이 저장된 경우) — title/body 쌍을 복원
  if (/"title"\s*:/.test(text)) {
    const unesc = (s: string) => {
      try { return JSON.parse(`"${s}"`) as string; } catch { return s; }
    };
    const headlineMatch = text.match(/"headline"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const items: { title: string; body: string }[] = [];
    const pointRe = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"body"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = pointRe.exec(text)) !== null) {
      items.push({ title: unesc(m[1] ?? ''), body: unesc(m[2] ?? '') });
    }
    if (items.length > 0) {
      return { lede: headlineMatch ? unesc(headlineMatch[1] ?? '') : '', items };
    }
  }

  const cleaned = text
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .trim();
  const parts = cleaned.split(/\*\*(.+?)\*\*/g);
  const lede = (parts[0] ?? '').trim();
  const items: { title: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = (parts[i] ?? '').replace(/[:：]\s*$/, '').trim();
    const body = (parts[i + 1] ?? '').replace(/^[\s:：—-]+/, '').trim();
    if (title) items.push({ title, body });
  }
  return { lede, items };
}

function PointLine({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 text-[13px] text-ink-400 mt-0.5" aria-hidden>
        ◆
      </span>
      <p className="text-[13px] leading-relaxed text-ink-600 min-w-0">
        <strong className="font-semibold text-[13.5px] text-ink-900">{title}</strong>
        {body && (
          <>
            <span className="text-ink-300 mx-2">—</span>
            {body}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * AI 트렌드 요약 카드 (뉴트럴 디자인)
 * 헤더(닷 + 라벨 + 기간) → 리드 문장 → "키워드 — 설명" 라인 목록.
 * 구조화 응답(points)이 없으면 구버전 산문을 굵은 구절 기준으로 분해해 같은 형식으로 표시한다.
 */
export function TrendSummaryCard({ loading, data, windowLabel = '최근 60일' }: Props) {
  let lede: string | undefined;
  let items: { title: string; body: string }[] = [];
  let fallbackText: string | null = null;

  if (data) {
    if (data.points && data.points.length > 0) {
      lede = data.headline;
      items = data.points;
    } else {
      const parsed = parseLegacy(data.summary);
      if (parsed.items.length > 0) {
        lede = parsed.lede || undefined;
        items = parsed.items;
      } else {
        fallbackText = parsed.lede || data.summary;
      }
    }
  }

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
      ) : items.length > 0 ? (
        <>
          {lede && (
            <p className="text-[16px] font-medium leading-relaxed text-ink-800 max-w-[820px] mb-5">
              {lede}
            </p>
          )}
          <div className="space-y-3">
            {items.map((p, i) => (
              <PointLine key={i} title={p.title} body={p.body} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-[14px] leading-relaxed text-ink-700">{fallbackText}</p>
      )}
    </section>
  );
}
