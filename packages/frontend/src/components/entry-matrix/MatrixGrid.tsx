'use client';

import { useMemo } from 'react';
import {
  TASKS, SECTORS, SCORES,
  scoreToColor, isCellHighlighted, isTop5Cell, getTop5Rank,
  getCellAvgByTask, getCellAvgBySector,
  type EmphasisMode,
} from './data';

interface Props {
  mode: EmphasisMode;
  onCellClick: (taskIdx: number, sectorIdx: number) => void;
}

const LINEUP_BY_TASK: Record<number, string[]> = {
  0: ['IR', 'CR'],     1: ['MoMa', 'AMR'],   2: ['IR', 'MoMa'],
  3: ['IR', 'MoMa'],   4: ['CR'],            5: ['CR', 'CLOiD'],
  6: ['CR'],           7: ['AMR', 'MoMa'],   8: ['MoMa'],
  9: ['MoMa'],        10: ['IR', 'CLOiD'],  11: ['MoMa', 'CLOiD'],
};

export default function MatrixGrid({ mode, onCellClick }: Props) {
  const taskAvgs = useMemo(() => TASKS.map((_, i) => getCellAvgByTask(i)), []);
  const sectorAvgs = useMemo(() => SECTORS.map((_, i) => getCellAvgBySector(i)), []);

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="border-separate border-spacing-0 mx-auto" style={{ minWidth: 1100 }}>
        <thead>
          <tr>
            <th
              className="sticky left-0 z-20 bg-[#FAFAF8] border-b-2 border-[#D3D1C7] px-3 py-2.5 text-left"
              style={{ minWidth: 130 }}
            />
            {SECTORS.map((s) => (
              <th
                key={s}
                className="border-b-2 border-[#D3D1C7] px-1 py-2.5 text-center"
                style={{ minWidth: 100 }}
              >
                <span className="block font-medium text-[11.5px] text-[#5F5E5A] tracking-tight leading-tight">
                  {s}
                </span>
              </th>
            ))}
            <th
              className="border-b-2 border-[#D3D1C7] px-2 py-2.5 text-center bg-[#2C2C2A]"
              style={{ minWidth: 80 }}
            >
              <span className="block font-mono font-medium text-[11px] text-white uppercase tracking-[0.16em]">
                Avg
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {TASKS.map((task, t) => (
            <tr key={task.idx}>
              {/* Task header column */}
              <th
                className="sticky left-0 z-10 bg-[#FAFAF8] border-b border-[#E8E6DD] px-3 py-2 text-left align-middle"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-medium text-[13px] text-[#8B1538]">
                    {task.num}
                  </span>
                  <span className="font-medium text-[12.5px] text-[#2C2C2A] leading-tight">
                    {task.short}
                  </span>
                </div>
              </th>

              {/* 12 sectors */}
              {SECTORS.map((s, sec) => {
                const score = SCORES[t][sec];
                const isLow = score < 1.0;
                const highlighted = isCellHighlighted(mode, t, sec);
                const isTop = isTop5Cell(t, sec);
                const rank = getTop5Rank(t, sec);
                const lineupShown = (LINEUP_BY_TASK[t] || []).slice(0, 2);

                return (
                  <td
                    key={`${t}-${sec}`}
                    className="border-b border-[#E8E6DD] p-0"
                    style={{ height: 78 }}
                  >
                    <button
                      onClick={() => onCellClick(t, sec)}
                      className="group relative w-full h-full flex flex-col items-stretch justify-between text-left transition-all duration-150 ease-out hover:z-10 focus:z-10 focus:outline-none"
                      style={{
                        backgroundColor: scoreToColor(score),
                        opacity: highlighted ? 1 : 0.28,
                        outline: isTop ? '2px solid #8B1538' : '1px solid rgba(0,0,0,0.04)',
                        outlineOffset: isTop ? '-2px' : '-1px',
                        padding: '6px 8px',
                      }}
                    >
                      {/* Top 5 star + rank */}
                      {isTop && (
                        <span className="absolute top-0.5 right-1 font-mono text-[10px] font-medium text-[#8B1538] tracking-wide">
                          ⭐ {rank}
                        </span>
                      )}

                      {isLow ? (
                        <span className="font-medium text-[18px] text-[#B8B6AE] flex-1 flex items-center justify-center">
                          —
                        </span>
                      ) : (
                        <>
                          <span
                            className="font-medium text-[20px] text-[#2C2C2A] leading-none"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {score.toFixed(1)}
                          </span>
                          <span className="font-medium text-[10.5px] text-[#5F5E5A] truncate leading-tight">
                            {task.short}
                          </span>
                          {lineupShown.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {lineupShown.map((l) => (
                                <span
                                  key={l}
                                  className="font-mono text-[8.5px] font-medium text-[#0C447C] bg-[#E6F1FB] px-1.5 py-px"
                                  style={{ letterSpacing: '0.04em' }}
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  </td>
                );
              })}

              {/* Task avg */}
              <td className="border-b border-[#E8E6DD] p-0 bg-[#2C2C2A]">
                <div className="h-full w-full flex items-center justify-center px-2 py-2">
                  <span
                    className="font-medium text-[16px] text-white"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {taskAvgs[t].toFixed(1)}
                  </span>
                </div>
              </td>
            </tr>
          ))}

          {/* Sector avg row */}
          <tr>
            <th
              className="sticky left-0 z-10 bg-[#2C2C2A] px-3 py-2.5 text-left"
            >
              <span className="font-mono font-medium text-[11px] text-white uppercase tracking-[0.16em]">
                Sector Avg
              </span>
            </th>
            {sectorAvgs.map((avg, i) => (
              <td key={i} className="bg-[#2C2C2A] p-2.5 text-center">
                <span
                  className="font-medium text-[16px] text-white"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {avg.toFixed(1)}
                </span>
              </td>
            ))}
            <td className="bg-[#8B1538] p-2.5 text-center">
              <span
                className="font-medium text-[16px] text-white"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {(SCORES.flat().reduce((a, b) => a + b, 0) / 144).toFixed(1)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
