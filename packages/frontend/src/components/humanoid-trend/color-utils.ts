// 10개 고유 색상 팔레트
const PALETTE = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

const COUNTRY_COLORS: Record<string, string> = {
  US: '#3B82F6',   // blue
  CN: '#F97316',   // orange
  KR: '#EC4899',   // pink/red
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
