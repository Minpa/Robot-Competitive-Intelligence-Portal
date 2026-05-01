'use client';

import { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { TASKS, SECTORS, SCORES } from './data';

const CHART_AXIS = { grid: '#E8E6DD', tick: '#5F5E5A' };

// 4-overlay 팔레트 (crimson 페이지에 어울리는 채도 낮은 톤)
const PALETTE = [
  '#B8892B', // gold
  '#0C447C', // navy
  '#3B6D11', // forest green
  '#8B1538', // crimson
];

type Mode = 'per-sector' | 'per-task';

const TOP_PRESETS: { label: string; sectors: string[] }[] = [
  { label: 'Top 3 진입 적합', sectors: ['물류', '자동차LG', '전자가전'] },
  { label: '자동차 비교',     sectors: ['자동차BCG', '자동차LG'] },
  { label: 'LG 자사 강점',    sectors: ['자동차LG', '전자가전'] },
  { label: 'Frontier 후보',   sectors: ['배터리', '반도체', 'Frontier'] },
];

const SECTOR_TAGLINES: Record<string, string> = {
  '자동차BCG':  'BCG 라인 — 정형 작업 + Tote 이송 강점',
  '자동차LG':   'LG 자사 라인 — 데이터 접근성 + CLOiD 우선 검증',
  '배터리':     '셀 조립·Tending·QC — 정밀도·반복성 핵심',
  '물류':       'Tote 이송·박스 적재 — Top 진입 후보 1순위',
  '전자가전':   'Kitting·Tending — LG 자사 강점 영역',
  '반도체':     'Visual QC·점검 — 정밀도 高, Cycle Time 엄격',
  '조선':       '용접·도장 특화 — 옥외 거대 작업물',
  '제약':       'QC·Kitting + 위생 — 인증·CRT 장벽 高',
  '식품':       '박스 적재·QC — 위생/HACCP 규제 多',
  '화학':       '위험 환경 — Tending 위주, 옥외/특수',
  '의류':       'SKU 다양도 高 — 비정형 多, 휴머노이드 우위 작음',
  'Frontier':   '신규 시장 — 사례 부족, 잠재 시장 평가',
};

const SECTOR_INDEX: Record<string, number> = SECTORS.reduce((acc, s, i) => {
  acc[s] = i;
  return acc;
}, {} as Record<string, number>);

const TASK_INDEX: Record<string, number> = TASKS.reduce((acc, t, i) => {
  acc[t.short] = i;
  return acc;
}, {} as Record<string, number>);

function getScore(taskShort: string, sector: string): number {
  const t = TASK_INDEX[taskShort];
  const s = SECTOR_INDEX[sector];
  if (t === undefined || s === undefined) return 0;
  return SCORES[t][s] ?? 0;
}

function scoreToGrade(s: number): { grade: string; bg: string; fg: string } {
  if (s >= 8.5) return { grade: '★★★', bg: '#B8DB8F', fg: '#2A5A0F' };
  if (s >= 6.5) return { grade: '★★',  bg: '#EAF3DE', fg: '#3B6D11' };
  if (s >= 4.5) return { grade: '★',   bg: '#FAEEDA', fg: '#B0452A' };
  return            { grade: '✗',   bg: '#F0EEE8', fg: '#888780' };
}

export default function EntryRadar() {
  const [mode, setMode] = useState<Mode>('per-sector');
  const [selectedSectors, setSelectedSectors] = useState<string[]>([
    '자동차LG', '전자가전', '배터리', '반도체',
  ]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([
    'Tote 이송', 'Bin Picking', 'Visual QC',
  ]);

  // axes = tasks, series = sectors
  const perSectorData = useMemo(() => {
    return TASKS.map((task) => {
      const row: Record<string, string | number> = { axis: task.short };
      selectedSectors.forEach((s) => {
        row[s] = getScore(task.short, s);
      });
      return row;
    });
  }, [selectedSectors]);

  // axes = sectors, series = tasks
  const perTaskData = useMemo(() => {
    return SECTORS.map((sector) => {
      const row: Record<string, string | number> = { axis: sector };
      selectedTasks.forEach((t) => {
        row[t] = getScore(t, sector);
      });
      return row;
    });
  }, [selectedTasks]);

  const series   = mode === 'per-sector' ? selectedSectors : selectedTasks;
  const chartData = mode === 'per-sector' ? perSectorData  : perTaskData;

  const toggleSector = (s: string) => {
    setSelectedSectors((prev) => {
      if (prev.includes(s)) return prev.length > 1 ? prev.filter((x) => x !== s) : prev;
      if (prev.length >= 4) return [...prev.slice(1), s];
      return [...prev, s];
    });
  };

  const toggleTask = (t: string) => {
    setSelectedTasks((prev) => {
      if (prev.includes(t)) return prev.length > 1 ? prev.filter((x) => x !== t) : prev;
      if (prev.length >= 4) return [...prev.slice(1), t];
      return [...prev, t];
    });
  };

  // 통계 (avg / max / argmax)
  const seriesStats = series.map((name, i) => {
    const scores = mode === 'per-sector'
      ? TASKS.map((t) => getScore(t.short, name))
      : SECTORS.map((sec) => getScore(name, sec));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const argmax = mode === 'per-sector'
      ? TASKS[scores.indexOf(max)].short
      : SECTORS[scores.indexOf(max)];
    return { name, color: PALETTE[i], avg, max, argmax };
  });

  return (
    <section className="mt-10 pt-8 border-t border-[#E8E6DD]">
      <header className="mb-6">
        <h2 className="font-medium text-[20px] text-[#2C2C2A] tracking-tight leading-tight">
          산업 도메인 — LG 진입 적합도 레이더
        </h2>
        <p className="text-[12.5px] text-[#5F5E5A] mt-1.5 leading-relaxed">
          12 sector × 12 task 매트릭스를 레이더 차트로 시각화. 같은 sector 안에서 어느
          task가 LG 라인업에 적합한지, 또는 같은 task에서 어느 sector가 우위인지 직관적으로 비교 가능
        </p>
      </header>

      {/* Mode toggle */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.2em]">
          View Mode
        </span>
        <div className="inline-flex border border-[#D3D1C7]">
          <button
            onClick={() => setMode('per-sector')}
            className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
              mode === 'per-sector'
                ? 'bg-[#2C2C2A] text-white'
                : 'bg-white text-[#2C2C2A] hover:bg-[#FAFAF8]'
            }`}
          >
            Sector × Tasks
          </button>
          <button
            onClick={() => setMode('per-task')}
            className={`px-3 py-1.5 text-[12px] font-medium border-l border-[#D3D1C7] transition-colors ${
              mode === 'per-task'
                ? 'bg-[#2C2C2A] text-white'
                : 'bg-white text-[#2C2C2A] hover:bg-[#FAFAF8]'
            }`}
          >
            Task × Sectors
          </button>
        </div>
        <span className="font-mono text-[10.5px] text-[#888780]">
          {mode === 'per-sector'
            ? '축 = 12개 Task, 오버레이 = 선택한 Sector (최대 4개)'
            : '축 = 12개 Sector, 오버레이 = 선택한 Task (최대 4개)'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Selectors */}
        <div className="lg:col-span-3 space-y-4">
          {mode === 'per-sector' && (
            <div>
              <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.2em] mb-2">
                Quick Presets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TOP_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setSelectedSectors(p.sectors)}
                    className="px-2 py-1 text-[10.5px] font-mono uppercase tracking-[0.14em] bg-white border border-[#D3D1C7] text-[#5F5E5A] hover:border-[#8B1538] hover:text-[#8B1538] transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.2em]">
                {mode === 'per-sector' ? 'Sectors (max 4)' : 'Tasks (max 4)'}
              </p>
              <span className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.16em]">
                {series.length} / 4
              </span>
            </div>
            <div className="border border-[#E8E6DD] bg-white max-h-[440px] overflow-y-auto">
              {(mode === 'per-sector' ? SECTORS : TASKS.map((t) => t.short)).map((item) => {
                const list = mode === 'per-sector' ? selectedSectors : selectedTasks;
                const isSelected = list.includes(item);
                const idx = list.indexOf(item);
                const color = isSelected ? PALETTE[idx] : '#D3D1C7';
                const onToggle = mode === 'per-sector' ? toggleSector : toggleTask;
                return (
                  <button
                    key={item}
                    onClick={() => onToggle(item)}
                    className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2.5 border-b border-[#E8E6DD] last:border-0 transition-colors ${
                      isSelected ? 'bg-[#FAFAF8]' : 'hover:bg-[#FAFAF8]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 shrink-0 border"
                      style={{
                        backgroundColor: isSelected ? color : 'transparent',
                        borderColor: isSelected ? color : '#B8B6AE',
                      }}
                    />
                    <span className={isSelected ? 'text-[#2C2C2A] font-medium' : 'text-[#5F5E5A]'}>
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Radar */}
        <div className="lg:col-span-6">
          <div
            className="border border-[#E8E6DD] bg-[#FAFAF8] flex flex-col"
            style={{ borderRadius: 8, height: 480 }}
          >
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="52%" outerRadius="68%" data={chartData}>
                  <PolarGrid stroke={CHART_AXIS.grid} />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fontSize: 10.5, fill: CHART_AXIS.tick }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 10]}
                    tick={{ fontSize: 9, fill: CHART_AXIS.tick }}
                    tickCount={6}
                  />
                  {series.map((s, i) => (
                    <Radar
                      key={s}
                      name={s}
                      dataKey={s}
                      stroke={PALETTE[i]}
                      fill={PALETTE[i]}
                      fillOpacity={0.12}
                      strokeWidth={1.75}
                    />
                  ))}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D3D1C7',
                      borderRadius: 0,
                      fontSize: '11px',
                      color: '#2C2C2A',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                    }}
                    formatter={(value: any) => [`${Number(value).toFixed(1)} / 10`, '']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: '#5F5E5A' }}
                    iconSize={10}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="font-mono text-[10px] text-[#888780] text-center mt-2 tracking-wide">
            값 0~10 · 8.5+ = ★★★ 진입 적합 / 6.5+ = ★★ 강력 후보 / 4.5+ = ★ 조건부
          </p>
        </div>

        {/* Stats */}
        <div className="lg:col-span-3 space-y-3">
          <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.2em]">
            Selected · Stats
          </p>
          {seriesStats.map((s) => {
            const g = scoreToGrade(s.avg);
            const tagline = mode === 'per-sector' ? SECTOR_TAGLINES[s.name] : undefined;
            return (
              <div key={s.name} className="border border-[#E8E6DD] bg-white p-3 relative">
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ backgroundColor: s.color }}
                />
                <div className="pl-2">
                  <p className="font-medium text-[13.5px] text-[#2C2C2A] leading-tight">
                    {s.name}
                  </p>
                  {tagline && (
                    <p className="text-[10.5px] text-[#5F5E5A] mt-1 leading-relaxed">
                      {tagline}
                    </p>
                  )}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-[#E8E6DD]">
                    <div>
                      <p className="font-mono text-[9px] text-[#888780] uppercase tracking-[0.16em]">Avg</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span
                          className="font-medium text-[16px] text-[#2C2C2A]"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {s.avg.toFixed(1)}
                        </span>
                        <span
                          className="font-mono text-[10px] font-medium px-1.5 py-px"
                          style={{ backgroundColor: g.bg, color: g.fg, letterSpacing: '0.04em' }}
                        >
                          {g.grade}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] text-[#888780] uppercase tracking-[0.16em]">Max</p>
                      <p
                        className="font-medium text-[16px] text-[#2C2C2A] mt-0.5"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {s.max.toFixed(1)}
                      </p>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-[#8B1538] mt-2 truncate tracking-wide">
                    ▲ {s.argmax}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
