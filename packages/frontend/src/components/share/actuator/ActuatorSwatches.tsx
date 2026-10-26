/**
 * 조달 태세·시장 세그먼트 범례 견본 (HTML). 확인 불가·자사 전용은 속 빈 링으로 그려 색만으로 구분하지 않는다.
 * 색은 actuator-sourcing.ts 의 토큰만 사용한다.
 */

import { CATEGORY_PALETTE } from '@/app/events/wrc2026/components/chartColors';
import type { MarketSegment, SourcingPosture } from '@/types/actuator-map';
import { HULL_FILL } from './actuator-map-layout';
import { INK, WHITE, POSTURE_COLOR, POSTURE_HOLLOW, SEGMENT_COLOR, SEGMENT_HOLLOW } from './actuator-sourcing';

export function PostureSwatch({ posture, size = 10 }: { posture: SourcingPosture; size?: number }) {
  const hollow = POSTURE_HOLLOW[posture];
  return (
    <span
      aria-hidden
      className="inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: hollow ? WHITE : POSTURE_COLOR[posture],
        border: hollow ? `2px solid ${POSTURE_COLOR[posture]}` : undefined,
        boxSizing: 'border-box',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}
    />
  );
}

const EXACT_STYLE = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties;

/** 회사 커버리지 영역 견본 — 채움 0.12 + 같은 색 테두리 칩 1개, 옆에 겹친 작은 칩 2개(인접 영역은 다른 색). 색은 회사 구분용이며 의미 없음 */
export function HullSwatch() {
  const chip = (i: number, w: number, left: number) => (
    <span
      key={i}
      className="absolute top-0 rounded-[3px] overflow-hidden"
      style={{ left, width: w, height: 10, boxSizing: 'border-box', border: `1px solid ${CATEGORY_PALETTE[i]}`, ...EXACT_STYLE }}
    >
      <span className="block w-full h-full" style={{ backgroundColor: CATEGORY_PALETTE[i], opacity: HULL_FILL, ...EXACT_STYLE }} />
    </span>
  );
  return (
    <span aria-hidden className="relative inline-block shrink-0" style={{ width: 34, height: 10 }}>
      {chip(0, 18, 0)}
      {chip(1, 10, 14)}
      {chip(2, 10, 24)}
    </span>
  );
}

export function SegmentSwatch({ segment, size = 10 }: { segment: MarketSegment; size?: number }) {
  const hollow = SEGMENT_HOLLOW[segment];
  return (
    <span
      aria-hidden
      className="inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: hollow ? WHITE : SEGMENT_COLOR[segment],
        border: hollow ? `1.75px solid ${INK[600]}` : undefined,
        boxSizing: 'border-box',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      } as React.CSSProperties}
    />
  );
}
