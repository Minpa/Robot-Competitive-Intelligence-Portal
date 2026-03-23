'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Color maps ──

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  concept:    { bg: '#334155', border: '#64748b', text: '#cbd5e1', label: 'Concept' },
  prototype:  { bg: '#1e3a5f', border: '#60a5fa', text: '#93c5fd', label: 'Prototype' },
  poc:        { bg: '#365314', border: '#84cc16', text: '#bef264', label: 'PoC' },
  pilot:      { bg: '#713f12', border: '#f59e0b', text: '#fcd34d', label: 'Pilot' },
  commercial: { bg: '#581c87', border: '#a855f7', text: '#d8b4fe', label: 'Commercial' },
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

// ── Compact layout constants ──
const COMPANY_COL_W = 140;
const YEAR_COL_W = 110;
const TOP_HEADER_H = 52;
const NODE_H = 22;
const NODE_GAP = 4;
const ROW_PAD_Y = 8;

type Robot = { id: string; name: string; year: number | null; purpose: string | null; stage: string | null };

/** Group robots by year within a company, return sorted year-groups (descending) */
function groupByYear(robots: Robot[]): { year: number; items: Robot[] }[] {
  const map = new Map<number, Robot[]>();
  for (const r of robots) {
    if (r.year == null) continue;
    if (!map.has(r.year)) map.set(r.year, []);
    map.get(r.year)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b - a) // descending (latest first)
    .map(([year, items]) => ({ year, items }));
}

/** Compute dynamic row height based on max stacked robots in a single year */
function getRowHeight(robots: Robot[]): number {
  const groups = groupByYear(robots);
  const maxStack = groups.reduce((max, g) => Math.max(max, g.items.length), 1);
  return maxStack * (NODE_H + NODE_GAP) - NODE_GAP + ROW_PAD_Y * 2;
}

/** Truncate name for node label */
function truncName(name: string, maxLen: number = 12): string {
  return name.length > maxLen ? name.slice(0, maxLen) + '..' : name;
}

/** Node width from truncated name */
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

  // Years in reverse order (latest → oldest), row heights, total dims
  const chart = useMemo(() => {
    if (!data) return null;
    const { companies, yearRange } = data;

    // Reverse: latest year first
    const years: number[] = [];
    for (let y = yearRange.max; y >= yearRange.min; y--) years.push(y);

    // Sort companies: most recent product first, then by robot count desc
    const sorted = [...companies].sort((a, b) => {
      const aMax = Math.max(...a.robots.filter(r => r.year != null).map(r => r.year!), 0);
      const bMax = Math.max(...b.robots.filter(r => r.year != null).map(r => r.year!), 0);
      if (bMax !== aMax) return bMax - aMax;
      return b.robots.length - a.robots.length;
    });

    // Compute per-company row height
    const rowHeights = sorted.map(c => getRowHeight(c.robots));
    const rowYOffsets: number[] = [];
    let cumY = TOP_HEADER_H;
    for (const h of rowHeights) {
      rowYOffsets.push(cumY);
      cumY += h;
    }

    const svgW = COMPANY_COL_W + years.length * YEAR_COL_W + 20;
    const svgH = cumY + 8;

    return { companies: sorted, years, rowHeights, rowYOffsets, svgW, svgH };
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

  const { companies, years, rowHeights, rowYOffsets, svgW, svgH } = chart;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-200">제품 진화 타임라인</h2>
          <p className="text-xs text-slate-400">{companies.length}개 기업 · {data!.totalRobots}개 로봇 · 최신순</p>
        </div>
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-violet-500 focus:border-violet-500"
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

      {/* Chart container with sticky company column */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/80"
        style={{ maxHeight: '75vh' }}
        onMouseLeave={() => { setHoveredRobot(null); setTooltip(null); }}
      >
        <svg
          width={svgW}
          height={svgH}
          className="select-none"
          style={{ minWidth: svgW }}
        >
          <defs>
            <marker id="arr" markerWidth={6} markerHeight={5} refX={5} refY={2.5} orient="auto">
              <path d="M0,0 L6,2.5 L0,5 Z" fill="#475569" />
            </marker>
          </defs>

          {/* Background */}
          <rect width={svgW} height={svgH} fill="#0f172a" />

          {/* ── Year column headers ── */}
          {years.map((year, i) => {
            const x = COMPANY_COL_W + i * YEAR_COL_W;
            return (
              <g key={year}>
                {i % 2 === 0 && <rect x={x} y={0} width={YEAR_COL_W} height={svgH} fill="#1e293b" opacity={0.25} />}
                <text x={x + YEAR_COL_W / 2} y={22} textAnchor="middle" fill="#94a3b8" fontSize={12} fontWeight={600}>
                  {year}
                </text>
                <line x1={x} y1={TOP_HEADER_H - 6} x2={x} y2={svgH} stroke="#1e293b" strokeWidth={0.5} />
              </g>
            );
          })}

          {/* ── Phase bar (top) ── */}
          {(() => {
            const phases = [
              { label: '상업/가정용 특화', minY: Math.max(years[years.length - 1]!, 2025), maxY: years[0]!, color: '#7c3aed' },
              { label: '산업용 HR 등장', minY: 2023, maxY: 2024, color: '#1d4ed8' },
              { label: 'R&D / Prototype', minY: years[years.length - 1]!, maxY: Math.min(2022, years[0]!), color: '#475569' },
            ].filter(p => p.minY <= years[0]! && p.maxY >= years[years.length - 1]!);

            return phases.map((p, i) => {
              // In reversed axis, higher year = smaller index = more left
              const idxLeft = years.indexOf(Math.min(p.maxY, years[0]!));
              const idxRight = years.indexOf(Math.max(p.minY, years[years.length - 1]!));
              if (idxLeft === -1 || idxRight === -1) return null;
              const x1 = COMPANY_COL_W + Math.min(idxLeft, idxRight) * YEAR_COL_W;
              const x2 = COMPANY_COL_W + (Math.max(idxLeft, idxRight) + 1) * YEAR_COL_W;
              return (
                <g key={i}>
                  <rect x={x1} y={32} width={x2 - x1} height={16} rx={3} fill={p.color} opacity={0.5} />
                  <text x={(x1 + x2) / 2} y={44} textAnchor="middle" fill="#e2e8f0" fontSize={9} fontWeight={600}>
                    {p.label}
                  </text>
                </g>
              );
            });
          })()}

          {/* ── Company rows ── */}
          {companies.map((company, rowIdx) => {
            const y = rowYOffsets[rowIdx]!;
            const rowH = rowHeights[rowIdx]!;
            const groups = groupByYear(company.robots);

            return (
              <g key={company.companyId}>
                {/* Row separator */}
                <line x1={0} y1={y} x2={svgW} y2={y} stroke="#1e293b" strokeWidth={0.5} />

                {/* Company name (fixed left) */}
                <rect x={0} y={y} width={COMPANY_COL_W} height={rowH} fill="#0f172a" />
                <text x={COMPANY_COL_W - 8} y={y + rowH / 2 + 1} textAnchor="end" fill="#e2e8f0" fontSize={11} fontWeight={500}>
                  {truncName(company.companyName, 16)}
                </text>
                {company.companyCountry && (
                  <text x={COMPANY_COL_W - 8} y={y + rowH / 2 + 13} textAnchor="end" fill="#475569" fontSize={8}>
                    {company.companyCountry}
                  </text>
                )}

                {/* Evolution arrows between year-groups (connect rightmost node of newer group → leftmost of older) */}
                {groups.map((group, gi) => {
                  if (gi === groups.length - 1) return null;
                  const olderGroup = groups[gi + 1]!;
                  const cx1 = yearToX(group.year);
                  const cx2 = yearToX(olderGroup.year);
                  const cy = y + rowH / 2;
                  // arrow goes left→right (newer→older in reversed timeline)
                  const x1 = cx1 + 30;
                  const x2 = cx2 - 30;
                  if (x2 <= x1 + 6) return null;
                  return (
                    <line
                      key={`a-${gi}`}
                      x1={x1} y1={cy} x2={x2 - 4} y2={cy}
                      stroke="#475569" strokeWidth={1} strokeDasharray="4 3"
                      markerEnd="url(#arr)"
                    />
                  );
                })}

                {/* Robot nodes — stacked vertically within each year */}
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
            <div className="text-violet-400 mt-0.5">클릭하여 상세 보기</div>
          </div>
        )}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-10 text-slate-400">해당 지역에 등록된 로봇이 없습니다.</div>
      )}
    </div>
  );
}
