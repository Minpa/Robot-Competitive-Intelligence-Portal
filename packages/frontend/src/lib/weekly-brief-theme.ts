/**
 * 주간 브리프 포스터 팔레트 — 화면(Tailwind `poster-*`)과 다운로드 HTML(인라인 CSS)이 공유하는 단일 출처.
 * tailwind.config.js 의 `poster` 값과 동일해야 하며 weekly-brief-theme.test.ts 가 일치를 검사한다.
 */

export const POSTER_COLORS = {
  /** 포스터 배경 (Tailwind `poster`) */
  base: '#4A4F57',
  /** 밴드 배경 (`poster-2`) */
  band: '#565B64',
  /** 키커·필 배경 (`poster-3`) */
  pill: '#616670',
  /** 박스 배경 (`poster-card`) */
  card: '#5B606A',
  /** 기본 글자 (`poster-fg`) */
  fg: '#F4F5F6',
  /** 보조 글자 (`poster-fg-2`) */
  fg2: '#D9DCE0',
  /** 메타 글자 (`poster-fg-3`) — poster 배경 위 약 4.7:1. card/pill 위 작은 글자에는 쓰지 않는다 */
  fg3: '#C0C5CC',
} as const;

/** Tailwind `poster` 그룹의 키와 POSTER_COLORS 키의 대응 (DEFAULT 포함) */
export const POSTER_TAILWIND_KEYS: Record<keyof typeof POSTER_COLORS, string> = {
  base: 'DEFAULT',
  band: '2',
  pill: '3',
  card: 'card',
  fg: 'fg',
  fg2: 'fg-2',
  fg3: 'fg-3',
};

/** 상단 바 배경 — 기존 토큰 ink-900 */
export const POSTER_TOP_BAR = '#1F2328';
/** 포스터 바깥 페이지 배경 — 기존 토큰 paper */
export const POSTER_PAGE_BG = '#F2F3F4';
/** 점선·구분선 색 (Tailwind `border-white/[0.28]`) */
export const POSTER_LINE = 'rgba(255,255,255,.28)';

/** 썸네일 플레이스홀더 그라디언트 (135deg, from → to) — 화면(inline style)과 HTML(.thw)이 공유 */
export const POSTER_THUMB_GRADIENT_FROM = '#6a707a';
export const POSTER_THUMB_GRADIENT_TO = '#4f545d';
export const POSTER_THUMB_GRADIENT = `linear-gradient(135deg,${POSTER_THUMB_GRADIENT_FROM},${POSTER_THUMB_GRADIENT_TO})`;
/** 순백 — 영상 길이 배지 글자, 인쇄 시 바깥 배경 */
export const POSTER_WHITE = '#FFFFFF';
/** 영상 길이 배지 배경 */
export const POSTER_DURATION_BG = 'rgba(0,0,0,.72)';
