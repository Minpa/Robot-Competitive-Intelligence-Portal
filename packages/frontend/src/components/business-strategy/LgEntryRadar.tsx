'use client';

import { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { Panel, Kicker, InsightBox, Tag } from '@/components/ui';
import {
  INDUSTRIAL_TASKS,
  INDUSTRIAL_SECTORS,
  LG_ENTRY_SCORES,
  SECTOR_TAGLINES,
} from './data';

const CHART_AXIS = {
  grid: '#D9DDE4',
  tick: '#5A6475',
};

// ARGOS palette — 다중 sector overlay용 8색
const PALETTE = [
  '#B8892B', // gold
  '#1F4A7A', // info
  '#2F7D5A', // pos
  '#B0452A', // neg
  '#0B1E3A', // brand
  '#7A5C1F', // dark gold
  '#5A6475', // ink-500
  '#15325B', // brand-soft
];

type Mode = 'per-sector' | 'per-task';

const TOP_PRESETS: { label: string; sectors: string[] }[] = [
  { label: 'Top 3 진입 적합', sectors: ['물류', '자동차LG', '전자가전'] },
  { label: '자동차 비교',     sectors: ['자동차BCG', '자동차LG'] },
  { label: 'LG 자사 강점',    sectors: ['자동차LG', '전자가전'] },
  { label: 'Frontier 후보',   sectors: ['배터리', '반도체', 'Frontier'] },
];

// 점수 → 등급 변환 (ScoringLogic과 동일)
function scoreToGrade(s: number): { grade: string; tone: 'gold' | 'pos' | 'warn' | 'neutral' } {
  if (s >= 8.5) return { grade: '★★★', tone: 'gold' };
  if (s >= 6.5) return { grade: '★★',  tone: 'pos'  };
  if (s >= 4.5) return { grade: '★',   tone: 'warn' };
  return { grade: '✗',  tone: 'neutral' };
}

export default function LgEntryRadar() {
  const [mode, setMode] = useState<Mode>('per-sector');
  const [selectedSectors, setSelectedSectors] = useState<string[]>(['물류', '자동차LG', '전자가전']);
  const [selectedTasks,   setSelectedTasks]   = useState<string[]>(['Tote 이송', 'Bin Picking', 'Visual QC']);

  // ─── per-sector mode: 축=task, 데이터=sector별 점수 ───
  const perSectorData = useMemo(() => {
    return INDUSTRIAL_TASKS.map((task) => {
      const row: Record<string, string | number> = { axis: task };
      selectedSectors.forEach((s) => {
        row[s] = LG_ENTRY_SCORES[s]?.[task] ?? 0;
      });
      return row;
    });
  }, [selectedSectors]);

  // ─── per-task mode: 축=sector, 데이터=task별 점수 ───
  const perTaskData = useMemo(() => {
    return INDUSTRIAL_SECTORS.map((sector) => {
      const row: Record<string, string | number> = { axis: sector };
      selectedTasks.forEach((t) => {
        row[t] = LG_ENTRY_SCORES[sector]?.[t] ?? 0;
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

  // Average score for each selected series — 표시용
  const seriesStats = series.map((s, i) => {
    const scores = mode === 'per-sector'
      ? INDUSTRIAL_TASKS.map((t) => LG_ENTRY_SCORES[s]?.[t] ?? 0)
      : INDUSTRIAL_SECTORS.map((sec) => LG_ENTRY_SCORES[sec]?.[s] ?? 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const max = Math.max(...scores);
    const argmax = mode === 'per-sector'
      ? INDUSTRIAL_TASKS[scores.indexOf(max)]
      : INDUSTRIAL_SECTORS[scores.indexOf(max)];
    return { name: s, color: PALETTE[i], avg, max, argmax };
  });

  return (
    <section id="lg-radar" className="scroll-mt-24">
      <Panel
        kicker="LG Entry Feasibility Radar"
        title="산업 도메인 — LG 진입 적합도 레이더"
        subtitle="12 sector × 12 task 매트릭스를 레이더 차트로 시각화. 같은 sector 안에서 어느 task가 LG 라인업에 적합한지, 또는 같은 task에서 어느 sector가 우위인지 직관적으로 비교 가능"
        headerRight={
          <div className="flex items-center gap-2">
            <Tag tone="gold" size="sm" dot>v9 매트릭스 가설치</Tag>
          </div>
        }
      >
        {/* Mode toggle */}
        <div className="flex items-center gap-2 mb-5 -mt-1">
          <Kicker>View Mode</Kicker>
          <div className="inline-flex border border-ink-300">
            <button
              onClick={() => setMode('per-sector')}
              className={`px-3 py-1.5 text-[11.5px] font-medium transition-colors ${
                mode === 'per-sector'
                  ? 'bg-brand text-white'
                  : 'bg-white text-ink-700 hover:bg-ink-50'
              }`}
            >
              Sector × Tasks
            </button>
            <button
              onClick={() => setMode('per-task')}
              className={`px-3 py-1.5 text-[11.5px] font-medium border-l border-ink-300 transition-colors ${
                mode === 'per-task'
                  ? 'bg-brand text-white'
                  : 'bg-white text-ink-700 hover:bg-ink-50'
              }`}
            >
              Task × Sectors
            </button>
          </div>
          <span className="font-mono text-[10px] text-ink-500 ml-2">
            {mode === 'per-sector'
              ? '축 = 12개 Task, 오버레이 = 선택한 Sector (최대 4개)'
              : '축 = 12개 Sector, 오버레이 = 선택한 Task (최대 4개)'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Selectors */}
          <div className="lg:col-span-3 space-y-4">
            {mode === 'per-sector' && (
              <div>
                <Kicker>Quick Presets</Kicker>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TOP_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setSelectedSectors(p.sectors)}
                      className="px-2 py-1 text-[10.5px] font-mono uppercase tracking-[0.14em] bg-paper border border-ink-200 text-ink-600 hover:border-gold hover:text-gold transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <Kicker>{mode === 'per-sector' ? 'Sectors (max 4)' : 'Tasks (max 4)'}</Kicker>
                <span className="font-mono text-[9px] text-ink-400 uppercase tracking-[0.14em]">
                  {series.length} / 4
                </span>
              </div>
              <div className="border border-ink-200 bg-white max-h-[420px] overflow-y-auto">
                {(mode === 'per-sector' ? INDUSTRIAL_SECTORS : INDUSTRIAL_TASKS).map((item) => {
                  const list = mode === 'per-sector' ? selectedSectors : selectedTasks;
                  const isSelected = list.includes(item);
                  const idx = list.indexOf(item);
                  const color = isSelected ? PALETTE[idx] : '#D9DDE4';
                  const onToggle = mode === 'per-sector' ? toggleSector : toggleTask;
                  return (
                    <button
                      key={item}
                      onClick={() => onToggle(item)}
                      className={`w-full text-left px-3 py-2 text-[12px] flex items-center gap-2.5 border-b border-ink-100 last:border-0 transition-colors ${
                        isSelected ? 'bg-paper' : 'hover:bg-ink-50'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 shrink-0 border"
                        style={{
                          backgroundColor: isSelected ? color : 'transparent',
                          borderColor: isSelected ? color : '#B4BBC7',
                        }}
                      />
                      <span className={isSelected ? 'text-ink-900 font-medium' : 'text-ink-600'}>
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
            <div className="h-[480px] border border-ink-200 bg-paper">
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
                      border: '1px solid #D9DDE4',
                      borderRadius: 0,
                      fontSize: '11px',
                      color: '#0B1E3A',
                      boxShadow: '0 2px 6px rgba(11, 30, 58, 0.08)',
                    }}
                    formatter={(value: any) => [`${Number(value).toFixed(1)} / 10`, '']}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: '#5A6475' }}
                    iconSize={10}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="font-mono text-[10px] text-ink-400 text-center mt-2">
              값 0~10 · 8.5+ = ★★★ 진입 적합 / 6.5+ = ★★ 강력 후보 / 4.5+ = ★ 조건부
            </p>
          </div>

          {/* Series stats */}
          <div className="lg:col-span-3 space-y-3">
            <Kicker>Selected · Stats</Kicker>
            {seriesStats.map((s) => {
              const g = scoreToGrade(s.avg);
              return (
                <div key={s.name} className="border border-ink-200 bg-white p-3 relative">
                  <span
                    className="absolute left-0 top-0 bottom-0 w-[3px]"
                    style={{ backgroundColor: s.color }}
                  />
                  <div className="pl-2">
                    <p className="font-serif text-[13.5px] font-semibold text-ink-900 leading-tight">
                      {s.name}
                    </p>
                    {mode === 'per-sector' && SECTOR_TAGLINES[s.name] && (
                      <p className="text-[10.5px] text-ink-500 mt-1 leading-relaxed">
                        {SECTOR_TAGLINES[s.name]}
                      </p>
                    )}
                    <div className="mt-2.5 grid grid-cols-2 gap-2 pt-2 border-t border-ink-100">
                      <div>
                        <p className="font-mono text-[9px] text-ink-400 uppercase tracking-[0.16em]">Avg</p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="font-serif text-[16px] font-semibold text-ink-900">
                            {s.avg.toFixed(1)}
                          </span>
                          <Tag tone={g.tone} size="sm">{g.grade}</Tag>
                        </div>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] text-ink-400 uppercase tracking-[0.16em]">Max</p>
                        <p className="font-serif text-[16px] font-semibold text-ink-900 mt-0.5">
                          {s.max.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <p className="font-mono text-[10px] text-gold mt-2 truncate">
                      ▲ {s.argmax}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heatmap of full 12 × 12 — 추가로 직관적 비교 */}
        <div className="mt-8 pt-6 border-t border-ink-200">
          <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
            <div>
              <Kicker>Full 12 × 12 Heatmap</Kicker>
              <h4 className="font-serif text-[14px] font-semibold text-ink-900 mt-1.5">
                전체 매트릭스 — Sector × Task LG 진입 점수
              </h4>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-ink-500 uppercase tracking-[0.14em]">
              <span>0</span>
              <span className="w-4 h-3 bg-ink-100" />
              <span className="w-4 h-3 bg-warn-soft" />
              <span className="w-4 h-3 bg-gold-soft" />
              <span className="w-4 h-3 bg-gold" />
              <span className="w-4 h-3 bg-brand" />
              <span>10</span>
            </div>
          </div>
          <FullHeatmap onPickSector={(sec) => {
            setMode('per-sector');
            setSelectedSectors([sec]);
          }} />
        </div>

        <div className="mt-6">
          <InsightBox label="How to Read" tone="info" title="레이더가 알려주는 3가지">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>형태 (Shape)</strong> — 한 sector의 도형이 한 쪽으로 길면 그
                sector는 특정 Task에 특화. 둥글면 균형형.
              </li>
              <li>
                <strong>크기 (Size)</strong> — 도형 면적이 클수록 그 sector 내에서
                LG 라인업 적용 가능 영역이 넓음. 시장 우선순위 후보.
              </li>
              <li>
                <strong>겹침 (Overlap)</strong> — 두 sector를 겹쳐 비교하면 차별
                포인트(공동 강점 / 한쪽 강점)가 즉시 보임. 자원 배분 의사결정에 활용.
              </li>
            </ul>
          </InsightBox>
        </div>
      </Panel>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Full 12 × 12 heatmap
function FullHeatmap({ onPickSector }: { onPickSector: (sector: string) => void }) {
  const cellColor = (v: number) => {
    if (v < 2)  return 'bg-ink-100 text-ink-500';
    if (v < 4)  return 'bg-warn-soft/70 text-warn';
    if (v < 6)  return 'bg-gold-soft text-gold';
    if (v < 8)  return 'bg-gold/60 text-white';
    if (v < 9)  return 'bg-gold text-white';
    return 'bg-brand text-white';
  };

  return (
    <div className="overflow-x-auto border border-ink-200 bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white p-2 border-b border-ink-200" />
            {INDUSTRIAL_TASKS.map((t) => (
              <th
                key={t}
                className="font-mono text-[9px] font-medium text-ink-500 uppercase tracking-[0.12em] px-1 py-2 border-b border-ink-200 text-center"
                style={{ minWidth: 70 }}
              >
                <span className="block leading-tight">{t}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INDUSTRIAL_SECTORS.map((sec) => (
            <tr key={sec}>
              <td
                className="sticky left-0 z-10 bg-white border-b border-ink-100 px-2 py-1.5 cursor-pointer hover:bg-paper"
                onClick={() => onPickSector(sec)}
                title={`${sec} 단독 레이더 보기`}
              >
                <span className="font-serif text-[11.5px] font-medium text-ink-900 whitespace-nowrap underline decoration-ink-300 decoration-dotted underline-offset-2">
                  {sec}
                </span>
              </td>
              {INDUSTRIAL_TASKS.map((t) => {
                const v = LG_ENTRY_SCORES[sec]?.[t] ?? 0;
                return (
                  <td key={t} className="border-b border-ink-100 p-0.5">
                    <div
                      className={`h-7 flex items-center justify-center font-mono text-[10px] font-semibold ${cellColor(v)}`}
                    >
                      {v.toFixed(1)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
