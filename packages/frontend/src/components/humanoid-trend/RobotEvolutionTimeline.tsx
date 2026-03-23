'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';

// ── Stage / Purpose color maps ──

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  concept:   { bg: '#334155', border: '#64748b', text: '#cbd5e1', label: 'Concept' },
  prototype: { bg: '#1e3a5f', border: '#60a5fa', text: '#93c5fd', label: 'Prototype' },
  poc:       { bg: '#365314', border: '#84cc16', text: '#bef264', label: 'PoC' },
  pilot:     { bg: '#713f12', border: '#f59e0b', text: '#fcd34d', label: 'Pilot' },
  commercial:{ bg: '#581c87', border: '#a855f7', text: '#d8b4fe', label: 'Commercial' },
};

const PURPOSE_COLORS: Record<string, string> = {
  industrial: '#3b82f6',
  service:    '#f59e0b',
  home:       '#a855f7',
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
const LEFT_MARGIN = 200;
const TOP_MARGIN = 80;
const ROW_HEIGHT = 56;
const NODE_HEIGHT = 32;
const YEAR_WIDTH = 140;
const RIGHT_PADDING = 40;

export default function RobotEvolutionTimeline() {
  const [regionFilter, setRegionFilter] = useState('');
  const [hoveredRobot, setHoveredRobot] = useState<string | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{
    x: number; y: number; robot: any; companyName: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['evolution-timeline', regionFilter],
    queryFn: () => api.getEvolutionTimeline(regionFilter || undefined),
  });

  // Derive chart dimensions
  const chartData = useMemo(() => {
    if (!data) return null;

    const { companies, yearRange } = data;
    const years: number[] = [];
    for (let y = yearRange.min; y <= yearRange.max; y++) years.push(y);

    const width = LEFT_MARGIN + years.length * YEAR_WIDTH + RIGHT_PADDING;
    const height = TOP_MARGIN + companies.length * ROW_HEIGHT + 40;

    return { companies, years, width, height, yearRange };
  }, [data]);

  const getXForYear = (year: number) => {
    if (!chartData) return 0;
    return LEFT_MARGIN + (year - chartData.yearRange.min) * YEAR_WIDTH + YEAR_WIDTH / 2;
  };

  const handleMouseEnter = (e: React.MouseEvent, robot: any, companyName: string) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    setHoveredRobot(robot.id);
    setTooltipInfo({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      robot,
      companyName,
    });
  };

  const handleMouseLeave = () => {
    setHoveredRobot(null);
    setTooltipInfo(null);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 p-6">
        <div className="h-8 bg-slate-700 rounded w-1/3" />
        <div className="h-96 bg-slate-700/50 rounded" />
      </div>
    );
  }

  if (error || !chartData) {
    return (
      <div className="p-6 text-center text-slate-400">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  const { companies, years, width, height } = chartData;

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-200">제품 진화 타임라인</h2>
          <p className="text-sm text-slate-400">
            {companies.length}개 기업, {data!.totalRobots}개 로봇
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:ring-violet-500 focus:border-violet-500"
          >
            {REGION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="text-slate-400 font-medium">단계:</span>
        {Object.entries(STAGE_COLORS).map(([key, c]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: c.border }} />
            <span className="text-slate-300">{c.label}</span>
          </span>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/80">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          className="select-none"
          style={{ minWidth: width }}
        >
          {/* Background */}
          <rect width={width} height={height} fill="#0f172a" />

          {/* Year columns with alternating bg */}
          {years.map((year, i) => {
            const x = LEFT_MARGIN + i * YEAR_WIDTH;
            return (
              <g key={year}>
                {i % 2 === 0 && (
                  <rect x={x} y={0} width={YEAR_WIDTH} height={height} fill="#1e293b" opacity={0.3} />
                )}
                {/* Year header */}
                <text
                  x={x + YEAR_WIDTH / 2}
                  y={TOP_MARGIN - 20}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize={13}
                  fontWeight={600}
                >
                  {year}
                </text>
                {/* Vertical gridline */}
                <line
                  x1={x} y1={TOP_MARGIN - 10} x2={x} y2={height}
                  stroke="#334155" strokeWidth={0.5}
                />
              </g>
            );
          })}

          {/* Phase banners (top) */}
          {(() => {
            const phases = [
              { label: 'R&D / Prototype', startYear: years[0], endYear: Math.min(2022, years[years.length - 1]!), color: '#475569' },
              { label: '산업용 HR 등장', startYear: 2023, endYear: Math.min(2024, years[years.length - 1]!), color: '#1d4ed8' },
              { label: '상업/가정용 특화', startYear: 2025, endYear: years[years.length - 1]!, color: '#7c3aed' },
            ].filter(p => p.startYear <= years[years.length - 1]! && p.endYear >= years[0]!);

            return phases.map((phase, i) => {
              const x1 = LEFT_MARGIN + (Math.max(phase.startYear, years[0]!) - years[0]!) * YEAR_WIDTH;
              const x2 = LEFT_MARGIN + (Math.min(phase.endYear, years[years.length - 1]!) - years[0]! + 1) * YEAR_WIDTH;
              return (
                <g key={i}>
                  <rect x={x1} y={2} width={x2 - x1} height={24} rx={4} fill={phase.color} opacity={0.6} />
                  <text
                    x={(x1 + x2) / 2}
                    y={18}
                    textAnchor="middle"
                    fill="#e2e8f0"
                    fontSize={11}
                    fontWeight={600}
                  >
                    {phase.label}
                  </text>
                </g>
              );
            });
          })()}

          {/* Company rows */}
          {companies.map((company, rowIdx) => {
            const y = TOP_MARGIN + rowIdx * ROW_HEIGHT;
            const robotsWithYear = company.robots.filter(r => r.year != null).sort((a, b) => a.year! - b.year!);

            return (
              <g key={company.companyId}>
                {/* Row separator */}
                {rowIdx > 0 && (
                  <line
                    x1={0} y1={y} x2={width} y2={y}
                    stroke="#1e293b" strokeWidth={1}
                  />
                )}

                {/* Company label */}
                <text
                  x={LEFT_MARGIN - 12}
                  y={y + ROW_HEIGHT / 2 + 4}
                  textAnchor="end"
                  fill="#e2e8f0"
                  fontSize={12}
                  fontWeight={500}
                >
                  {company.companyName.length > 18
                    ? company.companyName.slice(0, 18) + '...'
                    : company.companyName}
                </text>
                {company.companyCountry && (
                  <text
                    x={LEFT_MARGIN - 12}
                    y={y + ROW_HEIGHT / 2 + 16}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize={9}
                  >
                    {company.companyCountry}
                  </text>
                )}

                {/* Evolution arrows */}
                {robotsWithYear.map((robot, i) => {
                  if (i === 0) return null;
                  const prev = robotsWithYear[i - 1]!;
                  const x1 = getXForYear(prev.year!) + getNodeWidth(prev.name) / 2 + 2;
                  const x2 = getXForYear(robot.year!) - getNodeWidth(robot.name) / 2 - 2;
                  const cy = y + ROW_HEIGHT / 2;
                  if (x2 <= x1 + 4) return null;
                  return (
                    <g key={`arrow-${robot.id}`}>
                      <line
                        x1={x1} y1={cy} x2={x2 - 6} y2={cy}
                        stroke="#64748b" strokeWidth={1.5}
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}

                {/* Robot nodes */}
                {robotsWithYear.map(robot => {
                  const cx = getXForYear(robot.year!);
                  const cy = y + ROW_HEIGHT / 2;
                  const nodeW = getNodeWidth(robot.name);
                  const stage = STAGE_COLORS[robot.stage || 'concept'] || STAGE_COLORS.concept!;
                  const isHovered = hoveredRobot === robot.id;
                  const purposeAccent = PURPOSE_COLORS[robot.purpose || ''] || '#64748b';

                  return (
                    <g
                      key={robot.id}
                      className="cursor-pointer"
                      onMouseEnter={e => handleMouseEnter(e, robot, company.companyName)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <Link href={`/humanoid-robots/${robot.id}`}>
                        {/* Node background */}
                        <rect
                          x={cx - nodeW / 2}
                          y={cy - NODE_HEIGHT / 2}
                          width={nodeW}
                          height={NODE_HEIGHT}
                          rx={6}
                          fill={isHovered ? stage.border : stage.bg}
                          stroke={stage.border}
                          strokeWidth={isHovered ? 2 : 1.5}
                          opacity={isHovered ? 1 : 0.95}
                        />
                        {/* Purpose indicator dot */}
                        <circle
                          cx={cx - nodeW / 2 + 10}
                          cy={cy}
                          r={3}
                          fill={purposeAccent}
                        />
                        {/* Robot name */}
                        <text
                          x={cx - nodeW / 2 + 18}
                          y={cy + 4}
                          fill={isHovered ? '#ffffff' : stage.text}
                          fontSize={11}
                          fontWeight={500}
                        >
                          {robot.name.length > 14 ? robot.name.slice(0, 14) + '..' : robot.name}
                        </text>
                      </Link>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth={8}
              markerHeight={6}
              refX={6}
              refY={3}
              orient="auto"
            >
              <path d="M0,0 L8,3 L0,6 Z" fill="#64748b" />
            </marker>
          </defs>
        </svg>

        {/* Tooltip */}
        {tooltipInfo && (
          <div
            className="absolute pointer-events-none z-50 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs"
            style={{
              left: tooltipInfo.x + 12,
              top: tooltipInfo.y - 60,
            }}
          >
            <div className="font-semibold text-slate-100">{tooltipInfo.robot.name}</div>
            <div className="text-slate-400">{tooltipInfo.companyName}</div>
            <div className="flex gap-3 mt-1 text-slate-300">
              <span>{tooltipInfo.robot.year}년</span>
              {tooltipInfo.robot.stage && (
                <span style={{ color: STAGE_COLORS[tooltipInfo.robot.stage]?.border }}>
                  {STAGE_COLORS[tooltipInfo.robot.stage]?.label}
                </span>
              )}
              {tooltipInfo.robot.purpose && (
                <span style={{ color: PURPOSE_COLORS[tooltipInfo.robot.purpose] }}>
                  {tooltipInfo.robot.purpose}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {companies.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          해당 지역에 등록된 로봇이 없습니다.
        </div>
      )}
    </div>
  );
}

/** Compute approx node width based on text length */
function getNodeWidth(name: string): number {
  const displayName = name.length > 14 ? name.slice(0, 14) + '..' : name;
  return Math.max(80, displayName.length * 7.5 + 30);
}
