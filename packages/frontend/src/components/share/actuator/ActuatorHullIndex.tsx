'use client';

/**
 * 포지션 맵 영역 색인 — 차트 안 번호 배지와 같은 번호·색으로 "어느 영역이 어느 회사인지"를 보여 준다. 모든 폭에서 차트 바로 아래에 놓는다.
 *  단일 DOM: md 이상은 2열 격자, 그보다 좁으면 1열. 행 = 번호 배지 · 회사 · "n기" / 태세 견본+라벨 / 포함 로봇. 높이 제한·내부 스크롤 없음.
 *  행은 tabIndex=0 이라 탭 정지점 수 = hull 수이고, 행에 hover/focus 하면 그 회사 영역을 강조한다(onHover).
 *  차트에서 hover 한 회사의 행도 bg-ink-50 으로 강조한다(화면 전용). 인쇄에서는 행이 쪼개지지 않는다.
 *  색은 chartColors 팔레트 + Tailwind ink/brand 토큰만 사용한다.
 */

import { cn } from '@/lib/utils';
import { HullBadge, PostureSwatch } from './ActuatorSwatches';
import { HULL_INDEX_FOOTNOTE, HULL_INDEX_TITLE, hullIndexRows, type HullShape } from './actuator-map-layout';

interface Props {
  hulls: HullShape[];
  hoverCompany: string | null;
  onHover: (company: string | null) => void;
}

export function ActuatorHullIndex({ hulls, hoverCompany, onHover }: Props) {
  const rows = hullIndexRows(hulls);
  if (rows.length === 0) return null;

  return (
    <section aria-label={HULL_INDEX_TITLE} className="w-full">
      <p className="text-[12px] text-ink-500">
        <span className="font-medium text-ink-800">{HULL_INDEX_TITLE}</span> · 번호 = 차트 영역 안의 번호 · {rows.length}개 영역
      </p>
      <ul className="mt-1.5 grid gap-x-6 gap-y-1 md:grid-cols-2" aria-label={`${HULL_INDEX_TITLE} 목록`}>
        {rows.map((r) => (
          <li
            key={r.company}
            tabIndex={0}
            onPointerEnter={() => onHover(r.company)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(r.company)}
            onBlur={() => onHover(null)}
            className={cn(
              'cursor-default rounded-[6px] border-b border-ink-100 px-1.5 py-1.5 outline-none transition-colors print:break-inside-avoid',
              'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
              hoverCompany === r.company ? 'bg-ink-50 print:bg-transparent' : 'bg-transparent'
            )}
          >
            <div className="flex items-center gap-2">
              <HullBadge index={r.index} colorIndex={r.colorIndex} />
              <span className="min-w-0 flex-1 break-words text-[12px] font-semibold leading-tight text-ink-900" title={r.company}>
                {r.company}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-ink-600">{r.robotCount}기</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-700">
              <PostureSwatch posture={r.posture} />
              {r.postureLabel}
            </div>
            <p className="mt-0.5 break-words text-[11px] text-ink-500" title={r.robotsFull}>
              {r.robots}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-ink-500">{HULL_INDEX_FOOTNOTE}</p>
    </section>
  );
}
