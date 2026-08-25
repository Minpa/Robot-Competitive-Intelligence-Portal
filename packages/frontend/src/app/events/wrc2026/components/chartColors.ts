/**
 * WRC 2026 특집 페이지 차트 색상 상수.
 *
 * - CHART_HUE: 단일 측정 차트(B-2 기업 막대·B-4 주간 타임라인·B-5 기술 축 막대)에 쓰는 단일 hue.
 *   tailwind.config.js의 info 토큰(#1F4A7A) 실제 hex 값.
 * - CATEGORY_PALETTE: B-3 카테고리 100% 스택바 전용 팔레트.
 *   tailwind 토큰(info/pos/warn/neg/ink-600/ink-400 + 기타=ink-300) 조합은
 *   dataviz validate_palette.js 검증에서 FAIL(lightness band·chroma floor 다수 위반)했으므로,
 *   같은 스킬의 references/palette.md 기본 카테고리 팔레트(파랑·주황·아쿠아·노랑·마젠타·초록)로 교체해
 *   재검증 PASS 확인 후 채택했다. count desc 순서로 인덱스 0부터 배정.
 * - CATEGORY_OTHER: '기타' 세그먼트 고정 색(ink-300, 항상 마지막).
 */

export const CHART_HUE = '#1F4A7A';

export const CATEGORY_PALETTE = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
];

export const CATEGORY_OTHER = '#C6CAD0'; // ink-300

/** 낮을수록 유리한 지표(예: CES 부스 재현 난이도) 전용 회색 — 값이 클수록 좋다는 통상적 해석과 구분하기 위해 CHART_HUE와 다른 무채색 사용 */
export const CHART_HUE_MUTED = '#9AA1AC';
