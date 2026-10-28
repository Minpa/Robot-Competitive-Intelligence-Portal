'use client';

/**
 * 조달 방식 가로 누적 막대 2개 + 범례 — actuator-sourcing-bars.ts(buildSourcingBars)가 만든 데이터를 그리기만 한다.
 * 막대 1 "설계"와 막대 2 "조달 방식"은 같은 폭·같은 스케일(세그먼트 폭 = 회사 수 / 전체 %)이라 위아래로 포개진다.
 * 100% 폭이라 모바일에서도 스크롤이 필요 없다. 색은 상수(INK·BOARD_COLOR·BOARD_SOFT)만 쓰고 의미는 라벨 텍스트로도 전달한다.
 * 범례는 실제 <ul> 텍스트라 스크린리더가 회사명까지 읽는다(막대는 role="img" + aria-label).
 */

import { WHITE } from './actuator-sourcing';
import { BAR_CAPTION, BAR_LEGEND_TITLE, bar1Caption, legendParts, type BarSegment, type SourcingBars } from './actuator-sourcing-bars';
import { PRINT_EXACT } from './ActuatorSourcingSummary';

const segmentStyle = (s: BarSegment, first: boolean): React.CSSProperties => ({
  width: `${s.pct}%`,
  backgroundColor: s.fill,
  ...(s.dashed ? { border: `1.5px dashed ${s.dashed}` } : first ? {} : { borderLeft: `2px solid ${WHITE}` }),
  ...PRINT_EXACT,
});

function Bar({ segments, ariaLabel }: { segments: BarSegment[]; ariaLabel: string }) {
  const anyOutside = segments.some((s) => s.outside);
  return (
    <div role="img" aria-label={ariaLabel} className={`flex h-8 w-full ${anyOutside ? 'mb-5' : ''}`}>
      {segments.map((s, i) => (
        <div
          key={s.id}
          title={s.title}
          className="relative box-border flex flex-none items-center justify-center text-[13px] font-bold tabular-nums leading-none"
          style={{ ...segmentStyle(s, i === 0), color: s.numColor }}
        >
          {s.outside ? (
            <span className="absolute left-0 right-0 top-full mt-0.5 text-center text-[11px] font-bold text-ink-900">{s.count}</span>
          ) : (
            s.count
          )}
        </div>
      ))}
    </div>
  );
}

function Legend({ title, segments }: { title: string; segments: BarSegment[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-medium text-ink-600">{title}</p>
      <ul className="flex flex-col gap-1">
        {segments.map((s) => {
          const p = legendParts(s);
          return (
          <li key={s.id} className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-900 [overflow-wrap:anywhere]">
            <span
              aria-hidden="true"
              className="mt-[5px] box-border h-2.5 w-2.5 flex-none"
              style={{ backgroundColor: s.fill, ...(s.dashed ? { border: `1px dashed ${s.dashed}` } : {}), ...PRINT_EXACT }}
            />
            <span>
              <span className="font-bold">{p.head}</span>
              {p.names}
              {p.hint ? <span className="text-ink-600">{p.hint}</span> : null}
            </span>
          </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ActuatorSourcingBars({ bars }: { bars: SourcingBars }) {
  return (
    <div className="flex flex-col gap-1.5 break-inside-avoid">
      <p className="text-[11px] font-medium text-ink-600">{bar1Caption(bars)}</p>
      <Bar segments={bars.bar1} ariaLabel={bars.ariaLabel1} />
      <p className="text-[11px] font-medium text-ink-600">{BAR_CAPTION.bar2}</p>
      <Bar segments={bars.bar2} ariaLabel={bars.ariaLabel2} />
      <div className="mt-1 flex flex-col gap-3">
        <Legend title={BAR_LEGEND_TITLE.bar1} segments={bars.bar1} />
        <Legend title={BAR_LEGEND_TITLE.bar2} segments={bars.bar2} />
      </div>
      {bars.omitted.length > 0 && <p className="text-[11px] text-ink-500">{`해당 회사 없음: ${bars.omitted.join(', ')}`}</p>}
    </div>
  );
}
