// 10개 고유 색상 팔레트
const PALETTE = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

const COUNTRY_COLORS: Record<string, string> = {
  US: '#3B82F6',   // blue
  CN: '#F97316',   // orange
  KR: '#EC4899',   // pink/red
  EU: '#10B981',   // green
  JP: '#8B5CF6',   // purple
};

/**
 * 로봇 ID 기반 일관된 색상 반환 (차트 타입/호출 시점 무관)
 */
export function getRobotColor(robotId: string): string {
  let hash = 0;
  for (let i = 0; i < robotId.length; i++) {
    hash = ((hash << 5) - hash + robotId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

/**
 * 국가 코드 기반 색상 매핑
 */
export function getCountryColor(countryCode: string): string {
  return COUNTRY_COLORS[countryCode.toUpperCase()] ?? '#94A3B8';
}

/**
 * N개(≤10) 서로 다른 색상 배열 반환
 */
export function getDistinctColors(n: number): string[] {
  return PALETTE.slice(0, Math.min(n, PALETTE.length));
}

// ARGOS v2 — muted consulting palette for report charts.
// 8 tones chosen to sit harmoniously on bg-paper / bg-white without clashing.
export const CHART_COLORS_V2 = [
  '#0B1E3A', // brand navy
  '#B8892B', // gold
  '#1F4A7A', // info
  '#2F7D5A', // pos
  '#B0452A', // neg
  '#5A6475', // ink-500
  '#B38A1F', // warn
  '#15325B', // brand soft
] as const;

export const CHART_AXIS_V2 = {
  stroke:     '#D9DDE4', // ink-200
  tick:       '#5A6475', // ink-500
  label:      '#3D4656', // ink-600
  grid:       '#EDEFF3', // ink-100
  reference:  '#B8892B', // gold
};

/** Deterministic v2 color assignment from robot ID (mutes-only palette). */
export function getRobotColorV2(robotId: string): string {
  let hash = 0;
  for (let i = 0; i < robotId.length; i++) {
    hash = ((hash << 5) - hash + robotId.charCodeAt(i)) | 0;
  }
  return CHART_COLORS_V2[Math.abs(hash) % CHART_COLORS_V2.length]!;
}

/** N distinct v2 chart colors (≤8). */
export function getDistinctColorsV2(n: number): string[] {
  return CHART_COLORS_V2.slice(0, Math.min(n, CHART_COLORS_V2.length));
}
