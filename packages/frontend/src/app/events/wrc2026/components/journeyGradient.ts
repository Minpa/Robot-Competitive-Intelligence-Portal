/**
 * TrendJourney 배지·스파인 색상 보간 — 순수 함수, 외부 라이브러리 미사용.
 * CHART_HUE → CATEGORY_PALETTE[0] → CATEGORY_PALETTE[2] 3색 그라데이션을
 * 배지 인덱스 비율(t, 0~1)에 따라 보간한 hex 색상을 반환한다.
 */

/** '#rrggbb' → {r,g,b}(0~255) */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

function toHexByte(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');
}

/** 두 hex 색상을 t(0~1) 비율로 선형 보간한 hex 색상 반환 */
function lerpColor(from: string, to: string, t: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const r = a.r + (b.r - a.r) * t;
  const g = a.g + (b.g - a.g) * t;
  const bch = a.b + (b.b - a.b) * t;
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(bch)}`;
}

/** 3색 스톱(0%, 50%, 100%)을 t(0~1)에서 보간한 hex 색상 반환 */
export function lerp3Stops(stops: readonly [string, string, string], t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped <= 0.5) {
    return lerpColor(stops[0], stops[1], clamped / 0.5);
  }
  return lerpColor(stops[1], stops[2], (clamped - 0.5) / 0.5);
}
