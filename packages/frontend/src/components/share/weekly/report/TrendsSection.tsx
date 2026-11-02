import type { WeeklyReportPayload, WeeklyVolumeWeek } from '@/types/weekly-brief';
import { REPORT_CHART } from '@/lib/weekly-brief-theme';
import {
  compareRows,
  hasKeywordTable,
  hasTrendChart,
  keywordRows,
  sparklineModel,
  volumeBarRows,
  type BarRow,
} from '@/lib/weekly-brief-report';
import { Para } from './shared';

/** 8주 수집량 스파크라인 — 단색 SVG(xmlns·url() 없음), 좌표는 소수 1자리 */
export function Sparkline({ weeks }: { weeks: readonly WeeklyVolumeWeek[] }) {
  const m = sparklineModel(weeks);
  if (!m) return null;
  const label = `최근 ${weeks.length}주 수집량 추이: ${m.points.map((p) => `${p.week} ${p.total}건`).join(', ')}`;
  return (
    <svg className="block h-auto w-full max-w-full" viewBox={`0 0 ${m.width} ${m.height}`} width={m.width} height={m.height} role="img" aria-label={label} data-testid="sparkline">
      <title>{label}</title>
      <line x1={8} y1={m.height - 8} x2={m.width - 8} y2={m.height - 8} stroke={REPORT_CHART.grid} strokeWidth={1} />
      <polyline points={m.polyline} fill="none" stroke={REPORT_CHART.stroke} strokeWidth={2} />
      {m.points.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={2.5} fill={REPORT_CHART.stroke} />
      ))}
      <circle cx={m.last.x} cy={m.last.y} r={4.5} fill={REPORT_CHART.dot} />
    </svg>
  );
}

/** 막대 행 (CSS div + 인라인 width%) */
export function BarRows({ rows }: { rows: readonly BarRow[] }) {
  return (
    <ul className="m-0 mt-2 grid list-none gap-1.5 p-0" data-testid="bar-rows">
      {rows.map((r) => (
        <li key={r.label} className={`grid grid-cols-[44px_1fr_48px] items-center gap-x-2 text-[13px] sm:grid-cols-[48px_1fr_54px] ${r.current ? 'font-extrabold' : ''}`}>
          <span>{r.label}</span>
          <div className="h-2.5" style={{ background: REPORT_CHART.track }}>
            <div className="h-2.5" style={{ width: `${r.pct}%`, background: REPORT_CHART.stroke }} />
          </div>
          <span className="text-right">{r.value}</span>
          {r.note && <span className="col-start-2 col-end-4 -mt-0.5 text-[12px] font-normal text-poster-fg-2">{r.note}</span>}
        </li>
      ))}
    </ul>
  );
}

export function TrendsSection({ p }: { p: WeeklyReportPayload }) {
  const weeks = p.trends.volume.weeks;
  const cmp = compareRows(weeks, p.header.weekStart);
  const c = p.header.counts;
  return (
    <div data-testid="trends">
      {hasTrendChart(weeks) ? (
        <>
          <h3 className="mb-2 mt-0 text-[16px] font-extrabold">최근 {weeks.length}주 수집량</h3>
          <Sparkline weeks={weeks} />
          <BarRows rows={volumeBarRows(weeks, p.header.weekStart)} />
        </>
      ) : (
        <>
          <h3 className="mb-2 mt-0 text-[16px] font-extrabold">이번 주 수집량</h3>
          <Para>
            영상 {c.videosNew}건 · 기사 {c.articles}건 · 논문 {c.papers}건이 수집되었습니다. 추이를 비교할 만큼의 주별 데이터가 아직 없습니다.
          </Para>
        </>
      )}
      {cmp.length > 0 && (
        <>
          <h3 className="mb-2 mt-[22px] text-[16px] font-extrabold">이번 주 vs 지난주</h3>
          <div className="grid gap-2.5" data-testid="compare-bars">
            {cmp.map((r) => (
              <div key={r.label} className="grid grid-cols-[44px_1fr] items-center gap-x-2 gap-y-1 text-[13px] sm:grid-cols-[48px_1fr_auto]">
                <span>{r.label}</span>
                <div className="grid gap-[3px]">
                  <div className="h-2.5" style={{ background: REPORT_CHART.track }}>
                    <div className="h-2.5" style={{ width: `${r.curPct}%`, background: REPORT_CHART.stroke }} />
                  </div>
                  <div className="h-2.5" style={{ background: REPORT_CHART.track }}>
                    <div className="h-2.5" style={{ width: `${r.prevPct}%`, background: REPORT_CHART.barPrev }} />
                  </div>
                </div>
                <span className="col-start-2 text-[12.5px] text-poster-fg-2 sm:col-start-3">
                  이번 주 {r.cur} / 지난주 {r.prev}
                  {r.delta && ` ${r.delta}`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {p.trends.keywordNote && <Para>{p.trends.keywordNote}</Para>}
      {hasKeywordTable(p) && (
        <>
          <h3 className="mb-1 mt-[22px] text-[16px] font-extrabold">키워드 증감</h3>
          <table className="mt-1 w-full border-collapse text-[14px]" data-testid="keyword-table">
            <caption className="sr-only">이번 주 키워드 언급 횟수와 지난주 대비 증감</caption>
            <thead>
              <tr className="text-left text-[12px] text-poster-fg-2">
                <th scope="col" className="px-2 py-1.5 font-bold">용어</th>
                <th scope="col" className="px-2 py-1.5 text-right font-bold">이번 주</th>
                <th scope="col" className="px-2 py-1.5 text-right font-bold">지난주</th>
                <th scope="col" className="px-2 py-1.5 text-right font-bold">증감</th>
                <th scope="col" className="hidden px-2 py-1.5 font-bold sm:table-cell">언급량</th>
                <th scope="col" className="px-2 py-1.5 text-right font-bold">방향</th>
              </tr>
            </thead>
            <tbody>
              {keywordRows(p.trends.keywords).map((r) => (
                <tr key={r.term} className="border-t border-dashed border-white/[0.28]">
                  <td className="break-words px-2 py-[7px]">{r.term}</td>
                  <td className="whitespace-nowrap px-2 py-[7px] text-right">{r.count}</td>
                  <td className="whitespace-nowrap px-2 py-[7px] text-right">{r.prevCount}</td>
                  <td className="whitespace-nowrap px-2 py-[7px] text-right">{r.deltaText}</td>
                  <td className="hidden min-w-[80px] px-2 py-[7px] sm:table-cell">
                    <div className="h-2.5" style={{ background: REPORT_CHART.track }}>
                      <div className="h-2.5" style={{ width: `${r.pct}%`, background: REPORT_CHART.stroke }} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-[7px] text-right" aria-label={r.direction}>{r.symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
