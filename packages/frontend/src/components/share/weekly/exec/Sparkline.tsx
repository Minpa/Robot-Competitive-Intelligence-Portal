import { REPORT_CHART } from '@/lib/weekly-brief-theme';
import { sparklineAlt, sparklineModel } from '@/lib/weekly-brief-exec';

/**
 * 8주 스파크라인 — 인라인 SVG, 단색 도형(polyline + circle)만. xmlns·url() 없음.
 * 값은 서버가 계산한 점유율(%) 또는 조달 건수이고, 접근성 설명(title)에 8개 값을 모두 글로 적는다.
 */
export function Sparkline({ label, series, isCount = false }: { label: string; series: readonly number[]; isCount?: boolean }) {
  const m = sparklineModel(series);
  if (!m) return null;
  const alt = sparklineAlt(label, series, isCount);
  return (
    <svg viewBox={`0 0 ${m.width} ${m.height}`} width={m.width} height={m.height} role="img" aria-label={alt} className="exec-spark block shrink-0" data-testid="sparkline">
      <title>{alt}</title>
      <line x1="3" y1={m.height - 3} x2={m.width - 3} y2={m.height - 3} stroke={REPORT_CHART.grid} strokeWidth="1" />
      <polyline points={m.points} fill="none" stroke={REPORT_CHART.stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={m.last.x} cy={m.last.y} r="3" fill={REPORT_CHART.dot} />
    </svg>
  );
}
