import { REPORT_CHART } from '@/lib/weekly-brief-theme';
import { sparklineAlt, sparklineAxisText, sparklineCaption, sparklineModel } from '@/lib/weekly-brief-exec';

/**
 * 8주 스파크라인 — 인라인 SVG, 단색 도형(polyline + circle)만. xmlns·url() 없음.
 * 값은 서버가 계산한 점유율(%) 또는 조달 건수이고, 접근성 설명(title)에 8개 값을 모두 글로 적는다.
 * 그래프 아래에 무엇의 추이인지 캡션과 축 숫자(최저·최고·최근)를 함께 보여준다.
 */
export function Sparkline({ label, series, isCount = false }: { label: string; series: readonly number[]; isCount?: boolean }) {
  const m = sparklineModel(series);
  if (!m) return null;
  const alt = sparklineAlt(label, series, isCount);
  return (
    <figure className="m-0 max-w-[200px] shrink-0" data-testid="sparkline-figure">
      <svg viewBox={`0 0 ${m.width} ${m.height}`} width={m.width} height={m.height} role="img" aria-label={alt} className="exec-spark block" data-testid="sparkline">
        <title>{alt}</title>
        <line x1="3" y1={m.height - 3} x2={m.width - 3} y2={m.height - 3} stroke={REPORT_CHART.grid} strokeWidth="1" />
        <polyline points={m.points} fill="none" stroke={REPORT_CHART.stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={m.last.x} cy={m.last.y} r="3" fill={REPORT_CHART.dot} />
      </svg>
      <figcaption className="mt-0.5 text-[11.5px] leading-snug text-poster-fg-2" data-testid="sparkline-caption">
        {sparklineCaption(label, isCount)}
        <span className="block" data-testid="sparkline-axis">{sparklineAxisText(series, isCount)}</span>
      </figcaption>
    </figure>
  );
}
