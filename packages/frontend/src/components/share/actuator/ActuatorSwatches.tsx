/**
 * 조달 태세·시장 세그먼트 범례 견본 (HTML). 확인 불가·자사 전용은 속 빈 링으로 그려 색만으로 구분하지 않는다.
 * 색은 actuator-sourcing.ts 의 토큰만 사용한다.
 */

import type { MarketSegment, SourcingPosture } from '@/types/actuator-map';
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
