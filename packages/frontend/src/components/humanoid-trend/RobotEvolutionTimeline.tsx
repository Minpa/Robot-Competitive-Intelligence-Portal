'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Stage colors — aligned with site-wide badge convention ──
// concept=slate, prototype=blue, poc=yellow, pilot=orange, commercial=green

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  concept:    { bg: '#1e293b', border: '#64748b', text: '#94a3b8', label: 'Concept' },
  prototype:  { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', label: 'Prototype' },
  poc:        { bg: '#422006', border: '#eab308', text: '#fde047', label: 'PoC' },
  pilot:      { bg: '#431407', border: '#f97316', text: '#fdba74', label: 'Pilot' },
  commercial: { bg: '#052e16', border: '#22c55e', text: '#86efac', label: 'Commercial' },
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
const YEAR_COL_W = 110;
const TOP_HEADER_H = 52;
const NODE_H = 22;
const NODE_GAP = 4;
const ROW_PAD_Y = 8;
const RECENT_YEARS = 5;

type Robot = { id: string; name: string; year: number | null; purpose: string | null; stage: string | null };

/** Group robots by year, sorted descending (latest first) */
function groupByYear(robots: Robot[], minYear: number): { year: number; items: Robot[] }[] {
  const map = new Map<number, Robot[]>();
  for (const r of robots) {
    if (r.year == null || r.year < minYear) continue;
    if (!map.has(r.year)) map.set(r.year, []);
    map.get(r.year)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, items]) => ({ year, items }));
}

/** Row height based on max stacked robots in a single year */
function getRowHeight(robots: Robot[], minYear: number): number {
  const groups = groupByYear(robots, minYear);
  const maxStack = groups.reduce((max, g) => Math.max(max, g.items.length), 1);
  return maxStack * (NODE_H + NODE_GAP) - NODE_GAP + ROW_PAD_Y * 2;
}

function truncName(name: string, maxLen: number = 12): string {
  return name.length > maxLen ? name.slice(0, maxLen) + '..' : name;
}

function nodeWidth(name: string): number {
  return Math.max(68, truncName(name).length * 6.8 + 20);
}

export default function RobotEvolutionTimeline() {
  const [regionFilter, setRegionFilter] = useState('');
  const [hoveredRobot, setHoveredRobot] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; robot: Robot; companyName: string;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['evolution-timeline', regionFilter],
    queryFn: () => api.getEvolutionTimeline(regionFilter || undefined),
  });

  const chart = useMemo(() => {
    if (!data) return null;
    const { companies } = data;

    // Recent 5 years only
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - RECENT_YEARS + 1;
    const years: number[] = [];
    for (let y = currentYear; y >= minYear; y--) years.push(y);

    // Filter companies: only those with at least one robot in range
    const filtered = companies
      .map(c => ({
        ...c,
        robots: c.robots.filter(r => r.year != null && r.year >= minYear),
      }))
      .filter(c => c.robots.length > 0);

    // Sort: most recent product first, then robot count
    const sorted = [...filtered].sort((a, b) => {
      const aMax = Math.max(...a.robots.map(r => r.year!), 0);
      const bMax = Math.max(...b.robots.map(r => r.year!), 0);
      if (bMax !== aMax) return bMax - aMax;
      return b.robots.length - a.robots.length;
    });

    // Row heights
    const rowHeights = sorted.map(c => getRowHeight(c.robots, minYear));
    const rowYOffsets: number[] = [];
    let cumY = TOP_HEADER_H;
    for (const h of rowHeights) {
      rowYOffsets.push(cumY);
      cumY += h;
    }

    const svgW = COMPANY_COL_W + years.length * YEAR_COL_W + 20;
    const svgH = cumY + 8;

    return { companies: sorted, years, rowHeights, rowYOffsets, svgW, svgH, minYear };
  }, [data]);

  const yearToX = useCallback((year: number) => {
    if (!chart) return 0;
    const idx = chart.years.indexOf(year);
    if (idx === -1) return 0;
    return COMPANY_COL_W + idx * YEAR_COL_W + YEAR_COL_W / 2;
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

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-6 bg-slate-700 rounded w-1/4" />
        <div className="h-72 bg-slate-700/50 rounded" />
      </div>
    );
  }

  if (error || !chart) {
    return <div className="p-6 text-center text-slate-400">데이터를 불러올 수 없습니다.</div>;
  }

  const { companies, years, rowHeights, rowYOffsets, svgW, svgH, minYear } = chart;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">제품 진화 타임라인</h2>
          <p className="text-xs text-slate-400">
            최근 {RECENT_YEARS}년 ({years[years.length - 1]}–{years[0]}) · {companies.length}개 기업 · 최신순
          </p>
        </div>
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:ring-blue-500 focus:border-blue-500"
        >
          {REGION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[11px]">
        {Object.entries(STAGE_COLORS).map(([key, c]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.border }} />
            <span className="text-slate-400">{c.label}</span>
          </span>
        ))}
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto rounded-xl border border-slate-700 bg-slate-900"
        onMouseLeave={() => { setHoveredRobot(null); setTooltip(null); }}
      >
        <svg width={svgW} height={svgH} className="select-none" style={{ minWidth: svgW }}>
          <defs>
            <marker id="arr" markerWidth={6} markerHeight={5} refX={5} refY={2.5} orient="auto">
              <path d="M0,0 L6,2.5 L0,5 Z" fill="#334155" />
            </marker>
          </defs>

          {/* Background */}
          <rect width={svgW} height={svgH} fill="#0f172a" />

          {/* Year columns */}
          {years.map((year, i) => {
            const x = COMPANY_COL_W + i * YEAR_COL_W;
            return (
              <g key={year}>
                {i % 2 === 0 && <rect x={x} y={0} width={YEAR_COL_W} height={svgH} fill="#1e293b" opacity={0.2} />}
                <text x={x + YEAR_COL_W / 2} y={22} textAnchor="middle" fill="#94a3b8" fontSize={12} fontWeight={600}>
                  {year}
                </text>
                <line x1={x} y1={TOP_HEADER_H - 6} x2={x} y2={svgH} stroke="#334155" strokeWidth={0.5} />
              </g>
            );
          })}

          {/* Phase bar */}
          {(() => {
            const phases = [
              { label: '상업/가정용 특화', fromYear: 2025, toYear: years[0]!, color: '#3b82f6' },
              { label: '산업용 HR 등장', fromYear: 2023, toYear: 2024, color: '#475569' },
            ].filter(p => p.toYear >= minYear && p.fromYear <= years[0]!);

            return phases.map((p, i) => {
              const clampedFrom = Math.max(p.fromYear, minYear);
              const clampedTo = Math.min(p.toYear, years[0]!);
              const idxLeft = years.indexOf(clampedTo);
              const idxRight = years.indexOf(clampedFrom);
              if (idxLeft === -1 || idxRight === -1) return null;
              const x1 = COMPANY_COL_W + Math.min(idxLeft, idxRight) * YEAR_COL_W;
              const x2 = COMPANY_COL_W + (Math.max(idxLeft, idxRight) + 1) * YEAR_COL_W;
              return (
                <g key={i}>
                  <rect x={x1} y={32} width={x2 - x1} height={14} rx={3} fill={p.color} opacity={0.35} />
                  <text x={(x1 + x2) / 2} y={43} textAnchor="middle" fill="#cbd5e1" fontSize={9} fontWeight={500}>
                    {p.label}
                  </text>
                </g>
              );
            });
          })()}

          {/* Company rows */}
          {companies.map((company, rowIdx) => {
            const y = rowYOffsets[rowIdx]!;
            const rowH = rowHeights[rowIdx]!;
            const groups = groupByYear(company.robots, minYear);

            return (
              <g key={company.companyId}>
                <line x1={0} y1={y} x2={svgW} y2={y} stroke="#334155" strokeWidth={0.5} />

                {/* Company label */}
                <rect x={0} y={y} width={COMPANY_COL_W} height={rowH} fill="#0f172a" />
                <text x={COMPANY_COL_W - 8} y={y + rowH / 2 + 1} textAnchor="end" fill="#e2e8f0" fontSize={11} fontWeight={500}>
                  {truncName(company.companyName, 16)}
                </text>
                {company.companyCountry && (
                  <text x={COMPANY_COL_W - 8} y={y + rowH / 2 + 13} textAnchor="end" fill="#475569" fontSize={8}>
                    {company.companyCountry}
                  </text>
                )}

                {/* Arrows between year-groups */}
                {groups.map((group, gi) => {
                  if (gi === groups.length - 1) return null;
                  const olderGroup = groups[gi + 1]!;
                  const cx1 = yearToX(group.year);
                  const cx2 = yearToX(olderGroup.year);
                  const cy = y + rowH / 2;
                  const x1 = cx1 + 30;
                  const x2 = cx2 - 30;
                  if (x2 <= x1 + 6) return null;
                  return (
                    <line
                      key={`a-${gi}`}
                      x1={x1} y1={cy} x2={x2 - 4} y2={cy}
                      stroke="#334155" strokeWidth={1} strokeDasharray="4 3"
                      markerEnd="url(#arr)"
                    />
                  );
                })}

                {/* Robot nodes */}
                {groups.map(group => {
                  const cx = yearToX(group.year);
                  const stackH = group.items.length * (NODE_H + NODE_GAP) - NODE_GAP;
                  const startY = y + (rowH - stackH) / 2;

                  return group.items.map((robot, si) => {
                    const ny = startY + si * (NODE_H + NODE_GAP);
                    const nw = nodeWidth(robot.name);
                    const stage = STAGE_COLORS[robot.stage || 'concept'] || STAGE_COLORS.concept!;
                    const isHov = hoveredRobot === robot.id;

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
                        />
                        <text
                          x={cx}
                          y={ny + NODE_H / 2 + 3.5}
                          textAnchor="middle"
                          fill={isHov ? '#fff' : stage.text}
                          fontSize={10}
                          fontWeight={500}
                        >
                          {truncName(robot.name)}
                        </text>
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
            className="absolute pointer-events-none z-50 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap"
            style={{ left: tooltip.x + 14, top: tooltip.y - 50 }}
          >
            <div className="font-semibold text-slate-100">{tooltip.robot.name}</div>
            <div className="text-slate-400">{tooltip.companyName} · {tooltip.robot.year}년</div>
            <div className="flex gap-2 mt-0.5">
              {tooltip.robot.stage && (
                <span style={{ color: STAGE_COLORS[tooltip.robot.stage]?.border }}>
                  {STAGE_COLORS[tooltip.robot.stage]?.label}
                </span>
              )}
              {tooltip.robot.purpose && (
                <span className="text-slate-400">{PURPOSE_LABELS[tooltip.robot.purpose] || tooltip.robot.purpose}</span>
              )}
            </div>
            <div className="text-blue-400 mt-0.5">클릭하여 상세 보기</div>
          </div>
        )}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-10 text-slate-400">해당 지역에 등록된 로봇이 없습니다.</div>
      )}
    </div>
  );
}
