'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ── Stage colors — ARGOS light-friendly palette ──
const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  concept:    { bg: '#F1F5F9', border: '#94A3B8', text: '#64748B', label: 'Concept' },
  prototype:  { bg: '#DBEAFE', border: '#3B82F6', text: '#1D4ED8', label: 'Prototype' },
  poc:        { bg: '#FEF3C7', border: '#EAB308', text: '#A16207', label: 'PoC' },
  pilot:      { bg: '#FFEDD5', border: '#F97316', text: '#C2410C', label: 'Pilot' },
  commercial: { bg: '#DCFCE7', border: '#22C55E', text: '#15803D', label: 'Commercial' },
};

const PURPOSE_LABELS: Record<string, string> = {
  industrial: '산업용',
  service: '서비스',
  home: '가정용',
};

const REGION_OPTIONS = [
  { value: '', label: '전체 지역' },
  { value: 'china', label: '중국' },
  { value: 'north_america', label: '북미' },
  { value: 'europe', label: '유럽' },
  { value: 'japan', label: '일본' },
  { value: 'korea', label: '한국' },
  { value: 'other', label: '기타' },
];

// ── Layout constants ──
const COMPANY_COL_W = 140;
const TOP_HEADER_H = 52; // year + quarter header
const NODE_H = 26;
const NODE_GAP = 5;
const ROW_PAD_Y = 10;
const YEAR_RANGE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const QUARTER_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

// ── ARGOS colors for SVG ──
const SVG_BG = '#FFFFFF';
const SVG_BG_ALT = '#F4F6FA';
const SVG_BORDER = '#E5E9F0';
const SVG_BORDER_SOFT = '#EEF1F6';
const SVG_INK = '#1E2838';
const SVG_INK_SOFT = '#4A5468';
const SVG_MUTED = '#6B7585';
const SVG_FAINT = '#98A2B3';

type Robot = {
  id: string;
  name: string;
  year: number | null;
  quarter: number | null;
  purpose: string | null;
  stage: string | null;
};

/** Compute a sortable value for year+quarter */
function yqVal(year: number | null, quarter: number | null): number {
  if (year == null) return 0;
  return year * 10 + (quarter ?? 1);
}

/** Check if a robot's release is in the future */
function isFuture(year: number | null, quarter: number | null): boolean {
  if (year == null) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  return yqVal(year, quarter) > yqVal(currentYear, currentQuarter);
}

/** Group robots by year+quarter, sorted descending */
function groupByYQ(robots: Robot[], minYear: number): { year: number; quarter: number; items: Robot[] }[] {
  const map = new Map<string, Robot[]>();
  for (const r of robots) {
    if (r.year == null || r.year < minYear) continue;
    const q = r.quarter ?? 1;
    const key = `${r.year}-${q}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      const [ay, aq] = a.split('-').map(Number);
      const [by, bq] = b.split('-').map(Number);
      return (by! * 10 + bq!) - (ay! * 10 + aq!);
    })
    .map(([key, items]) => {
      const [year, quarter] = key.split('-').map(Number);
      return { year: year!, quarter: quarter!, items };
    });
}

/** Row height based on max stacked robots in a single quarter */
function getRowHeight(robots: Robot[], minYear: number): number {
  const groups = groupByYQ(robots, minYear);
  const maxStack = groups.reduce((max, g) => Math.max(max, g.items.length), 1);
  return maxStack * (NODE_H + NODE_GAP) - NODE_GAP + ROW_PAD_Y * 2;
}

function truncName(name: string, maxLen: number = 14): string {
  return name.length > maxLen ? name.slice(0, maxLen) + '..' : name;
}

function nodeWidth(name: string, showTBD: boolean): number {
  const label = truncName(name) + (showTBD ? ' (TBD)' : '');
  return Math.max(80, label.length * 7 + 22);
}

export default function RobotEvolutionTimeline() {
  const [regionFilter, setRegionFilter] = useState('');
  const [recentYears, setRecentYears] = useState(2);
  const [hoveredRobot, setHoveredRobot] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; robot: Robot; companyName: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const measure = () => {
      const el = containerRef.current;
      if (el) {
        const prev = el.style.overflow;
        el.style.overflow = 'hidden';
        setContainerWidth(el.clientWidth);
        el.style.overflow = prev;
      }
    };
    requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['evolution-timeline', regionFilter],
    queryFn: () => api.getEvolutionTimeline(regionFilter || undefined),
  });

  const chart = useMemo(() => {
    if (!data) return null;
    const { companies } = data;

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - recentYears + 1;
    const years: number[] = [];
    for (let y = minYear; y <= currentYear; y++) years.push(y);

    const totalQuarters = years.length * 4;
    const minContentW = totalQuarters * 50;
    const fittedW = containerWidth - COMPANY_COL_W - 20;
    const availableW = Math.max(fittedW, minContentW);
    const quarterW = availableW / totalQuarters;

    const filtered = companies
      .map((c: any) => ({
        ...c,
        robots: c.robots.filter((r: any) => r.year != null && r.year >= minYear),
      }))
      .filter((c: any) => c.robots.length > 0);

    const sorted = [...filtered].sort((a: any, b: any) => {
      const aMax = Math.max(...a.robots.map((r: any) => yqVal(r.year, r.quarter)), 0);
      const bMax = Math.max(...b.robots.map((r: any) => yqVal(r.year, r.quarter)), 0);
      if (bMax !== aMax) return bMax - aMax;
      return b.robots.length - a.robots.length;
    });

    const rowHeights = sorted.map((c: any) => getRowHeight(c.robots, minYear));
    const rowYOffsets: number[] = [];
    let cumY = TOP_HEADER_H;
    for (const h of rowHeights) {
      rowYOffsets.push(cumY);
      cumY += h;
    }

    const svgW = availableW <= fittedW ? containerWidth : COMPANY_COL_W + availableW + 20;
    const svgH = cumY + 8;

    return { companies: sorted, years, rowHeights, rowYOffsets, svgW, svgH, minYear, quarterW, totalQuarters };
  }, [data, containerWidth, recentYears]);

  const yqToX = useCallback((year: number, quarter: number) => {
    if (!chart) return 0;
    const yearIdx = chart.years.indexOf(year);
    if (yearIdx === -1) return 0;
    const qIdx = (quarter - 1);
    const slotIdx = yearIdx * 4 + qIdx;
    return COMPANY_COL_W + slotIdx * chart.quarterW + chart.quarterW / 2;
  }, [chart]);

  const handleMouseEnter = (e: React.MouseEvent, robot: Robot, companyName: string) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setHoveredRobot(robot.id);
    setTooltip({
      x: e.clientX - rect.left + container.scrollLeft,
      y: e.clientY - rect.top + container.scrollTop,
      robot,
      companyName,
    });
  };

  const handleClick = (robotId: string) => {
    router.push(`/humanoid-robots/${robotId}`);
  };

  if (isLoading || containerWidth === 0) {
    return (
      <div ref={containerRef} className="animate-pulse space-y-3 p-4">
        <div className="h-6 bg-ink-200 rounded w-1/4" />
        <div className="h-72 bg-ink-100 rounded" />
      </div>
    );
  }

  if (error || !chart) {
    return (
      <div className="p-6 text-center text-ink-500">
        <p>데이터를 불러올 수 없습니다.</p>
        {error && <p className="text-xs text-ink-400 mt-2">{(error as Error).message}</p>}
      </div>
    );
  }

  const { companies, years, rowHeights, rowYOffsets, svgW, svgH, minYear, quarterW } = chart;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-ink-900">제품 진화 타임라인</h2>
          <p className="text-xs text-ink-500">
            최근 {recentYears}년 ({years[0]}–{years[years.length - 1]}) · {companies.length}개 기업 · 최신순
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={recentYears}
            onChange={e => setRecentYears(Number(e.target.value))}
            className="bg-ink-100 border border-ink-200 text-ink-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-info focus:border-info"
          >
            {YEAR_RANGE_OPTIONS.map(n => (
              <option key={n} value={n}>최근 {n}년</option>
            ))}
          </select>
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="bg-ink-100 border border-ink-200 text-ink-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-info focus:border-info"
          >
            {REGION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px]">
        {Object.entries(STAGE_COLORS).map(([key, c]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.border }} />
            <span className="text-ink-500">{c.label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1 ml-2">
          <span className="text-amber-500 text-[10px] font-medium border border-amber-500/40 rounded px-1">TBD</span>
          <span className="text-ink-500">출시 예정</span>
        </span>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto rounded-xl border border-ink-200 bg-white"
        onMouseLeave={() => { setHoveredRobot(null); setTooltip(null); }}
      >
        <svg width={svgW} height={svgH} className="select-none">
          <defs>
            <marker id="arr" markerWidth={6} markerHeight={5} refX={5} refY={2.5} orient="auto">
              <path d="M0,0 L6,2.5 L0,5 Z" fill={SVG_BORDER} />
            </marker>
          </defs>

          {/* Background */}
          <rect width={svgW} height={svgH} fill={SVG_BG} />

          {/* Year + Quarter columns */}
          {years.map((year, yi) => {
            const yearX = COMPANY_COL_W + yi * 4 * quarterW;
            const yearWidth = 4 * quarterW;
            return (
              <g key={year}>
                {/* Year background stripe (alternate) */}
                {yi % 2 === 0 && (
                  <rect x={yearX} y={0} width={yearWidth} height={svgH} fill={SVG_BG_ALT} opacity={0.6} />
                )}
                {/* Year label */}
                <text
                  x={yearX + yearWidth / 2}
                  y={18}
                  textAnchor="middle"
                  fill={SVG_INK}
                  fontSize={14}
                  fontWeight={700}
                >
                  {year}
                </text>
                {/* Year separator line */}
                <line x1={yearX} y1={0} x2={yearX} y2={svgH} stroke={SVG_BORDER} strokeWidth={0.8} />

                {/* Quarter labels + separator lines */}
                {QUARTER_LABELS.map((ql, qi) => {
                  const qx = yearX + qi * quarterW;
                  return (
                    <g key={`${year}-${qi}`}>
                      <text
                        x={qx + quarterW / 2}
                        y={40}
                        textAnchor="middle"
                        fill={SVG_MUTED}
                        fontSize={12}
                        fontWeight={600}
                      >
                        {ql}
                      </text>
                      {qi > 0 && (
                        <line
                          x1={qx} y1={TOP_HEADER_H}
                          x2={qx} y2={svgH}
                          stroke={SVG_BORDER_SOFT} strokeWidth={0.5}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Header separator */}
          <line x1={0} y1={TOP_HEADER_H} x2={svgW} y2={TOP_HEADER_H} stroke={SVG_BORDER} strokeWidth={0.8} />

          {/* Company rows */}
          {companies.map((company: any, rowIdx: number) => {
            const y = rowYOffsets[rowIdx]!;
            const rowH = rowHeights[rowIdx]!;
            const groups = groupByYQ(company.robots, minYear);

            return (
              <g key={company.companyId}>
                <line x1={0} y1={y} x2={svgW} y2={y} stroke={SVG_BORDER_SOFT} strokeWidth={0.5} />

                {/* Company label */}
                <rect x={0} y={y} width={COMPANY_COL_W} height={rowH} fill={SVG_BG} />
                <text
                  x={COMPANY_COL_W - 10}
                  y={y + rowH / 2 + 1}
                  textAnchor="end"
                  fill={SVG_INK}
                  fontSize={12}
                  fontWeight={500}
                >
                  {truncName(company.companyName, 16)}
                </text>
                {company.companyCountry && (
                  <text
                    x={COMPANY_COL_W - 10}
                    y={y + rowH / 2 + 14}
                    textAnchor="end"
                    fill={SVG_FAINT}
                    fontSize={9}
                  >
                    {company.companyCountry}
                  </text>
                )}

                {/* Arrows between consecutive groups */}
                {groups.map((group, gi) => {
                  if (gi === groups.length - 1) return null;
                  const olderGroup = groups[gi + 1]!;
                  const cx1 = yqToX(group.year, group.quarter);
                  const cx2 = yqToX(olderGroup.year, olderGroup.quarter);
                  const cy = y + rowH / 2;
                  const x1 = cx1 + 30;
                  const x2 = cx2 - 30;
                  if (x2 <= x1 + 6) return null;
                  return (
                    <line
                      key={`a-${gi}`}
                      x1={x1} y1={cy} x2={x2 - 4} y2={cy}
                      stroke={SVG_BORDER} strokeWidth={1} strokeDasharray="4 3"
                      markerEnd="url(#arr)"
                    />
                  );
                })}

                {/* Robot nodes */}
                {groups.map(group => {
                  const cx = yqToX(group.year, group.quarter);
                  const stackH = group.items.length * (NODE_H + NODE_GAP) - NODE_GAP;
                  const startY = y + (rowH - stackH) / 2;

                  return group.items.map((robot, si) => {
                    const ny = startY + si * (NODE_H + NODE_GAP);
                    const future = isFuture(robot.year, robot.quarter);
                    const nw = nodeWidth(robot.name, future);
                    const stage = STAGE_COLORS[robot.stage || 'concept'] || STAGE_COLORS.concept!;
                    const isHov = hoveredRobot === robot.id;
                    const displayName = truncName(robot.name);

                    return (
                      <g
                        key={robot.id}
                        className="cursor-pointer"
                        onClick={() => handleClick(robot.id)}
                        onMouseEnter={e => handleMouseEnter(e, robot, company.companyName)}
                        onMouseLeave={() => { setHoveredRobot(null); setTooltip(null); }}
                      >
                        <rect
                          x={cx - nw / 2}
                          y={ny}
                          width={nw}
                          height={NODE_H}
                          rx={4}
                          fill={isHov ? stage.border : stage.bg}
                          stroke={stage.border}
                          strokeWidth={isHov ? 1.5 : 1}
                          strokeDasharray={future ? '3 2' : undefined}
                        />
                        <text
                          x={cx - (future ? 12 : 0)}
                          y={ny + NODE_H / 2 + 3.5}
                          textAnchor="middle"
                          fill={isHov ? '#fff' : stage.text}
                          fontSize={11}
                          fontWeight={500}
                        >
                          {displayName}
                        </text>
                        {future && (
                          <text
                            x={cx + nw / 2 - 22}
                            y={ny + NODE_H / 2 + 3}
                            textAnchor="middle"
                            fill="#d97706"
                            fontSize={8}
                            fontWeight={600}
                          >
                            TBD
                          </text>
                        )}
                      </g>
                    );
                  });
                })}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 bg-white border border-ink-200 rounded-lg px-3 py-2 shadow-report-lg text-xs whitespace-nowrap"
            style={{ left: tooltip.x + 14, top: tooltip.y - 50 }}
          >
            <div className="font-semibold text-ink-900">{tooltip.robot.name}</div>
            <div className="text-ink-500">
              {tooltip.companyName} · {tooltip.robot.year}년 Q{tooltip.robot.quarter || 1}
              {isFuture(tooltip.robot.year, tooltip.robot.quarter) && (
                <span className="ml-1 text-amber-500 font-medium">(TBD)</span>
              )}
            </div>
            <div className="flex gap-2 mt-0.5">
              {tooltip.robot.stage && (
                <span style={{ color: STAGE_COLORS[tooltip.robot.stage]?.border }}>
                  {STAGE_COLORS[tooltip.robot.stage]?.label}
                </span>
              )}
              {tooltip.robot.purpose && (
                <span className="text-ink-500">{PURPOSE_LABELS[tooltip.robot.purpose] || tooltip.robot.purpose}</span>
              )}
            </div>
            <div className="text-info mt-0.5">클릭하여 상세 보기</div>
          </div>
        )}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-10 text-ink-500">해당 지역에 등록된 로봇이 없습니다.</div>
      )}
    </div>
  );
}
