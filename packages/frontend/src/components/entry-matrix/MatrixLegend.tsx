'use client';

import { TOP_TIER, TOP_5, TASKS, SECTORS } from './data';

const COLOR_LEGEND = [
  { color: '#B8DB8F', label: '진입 적합', range: '7.5+' },
  { color: '#EAF3DE', label: '진입 가능', range: '5.0+' },
  { color: '#FAEEDA', label: '부분 진입', range: '3.0+' },
  { color: '#FBEAF0', label: '제한적',   range: '1.0+' },
  { color: '#F0EEE8', label: '진입 불가', range: '< 1.0' },
];

const TOP5_KEYS = new Set(TOP_5.map(t => `${t.taskIdx}-${t.sectorIdx}`));

export default function MatrixLegend() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
      <div className="lg:col-span-5 border border-[#E8E6DD] bg-white p-4" style={{ borderRadius: 8 }}>
        <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.2em] mb-3">
          점수 색상 범례
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {COLOR_LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span
                className="w-5 h-3.5 border border-[#D3D1C7]"
                style={{ backgroundColor: l.color }}
              />
              <span className="text-[12px] text-[#2C2C2A]">{l.label}</span>
              <span
                className="font-mono text-[10.5px] text-[#888780] tracking-wide"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {l.range}
              </span>
            </div>
          ))}
        </div>
        <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.18em] mt-4 pt-3 border-t border-[#E8E6DD]">
          🎯 진입 적합 = 2px LG Red 외곽선 / 강조 모드 = 비대상 셀 28% 투명도
        </p>
        <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[10.5px]">
          <span className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.18em]">
            📍 현장 / PoC / 배포
          </span>
          {[
            { label: '현장 확인', color: '#A50034', bg: '#FAEAE7' },
            { label: 'PoC 계획', color: '#9a6500', bg: '#FFF4D6' },
            { label: 'PoC 진행', color: '#0C447C', bg: '#E6F1FB' },
            { label: '배포', color: '#1a7a3a', bg: '#E6F4EA' },
          ].map((x) => (
            <span
              key={x.label}
              className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-1.5 py-0.5"
              style={{
                color: x.color,
                backgroundColor: x.bg,
                border: `1px solid ${x.color}`,
                borderRadius: 3,
              }}
            >
              {x.label}
            </span>
          ))}
        </div>
      </div>

      <div className="lg:col-span-7 border-2 border-[#A50034] bg-[#FAEAE7]/30 p-4" style={{ borderRadius: 8 }}>
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-mono text-[10px] text-[#A50034] uppercase tracking-[0.2em] font-medium">
            🎯 진입 적합 셀 (점수 ≥ 7.5)
          </p>
          <p className="font-mono text-[10px] text-[#888780] tracking-wide">
            총 {TOP_TIER.length}개 / 144 셀 ({((TOP_TIER.length / 144) * 100).toFixed(1)}%)
          </p>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-1.5">
          {TOP_TIER.map((t) => {
            const isDeepDive = TOP5_KEYS.has(`${t.taskIdx}-${t.sectorIdx}`);
            return (
              <li key={`${t.taskIdx}-${t.sectorIdx}`} className="flex items-baseline gap-3 text-[12px]">
                <span
                  className="font-mono text-[#A50034] font-medium tracking-wide w-6 shrink-0"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {t.rank.toString().padStart(2, '0')}
                </span>
                <span className="text-[#2C2C2A] flex-1 leading-tight min-w-0">
                  <span className="font-mono text-[#A50034]">{TASKS[t.taskIdx].num}</span>{' '}
                  {TASKS[t.taskIdx].name}
                  <span className="text-[#B8B6AE] mx-1.5">×</span>
                  {SECTORS[t.sectorIdx]}
                  {isDeepDive && (
                    <span className="ml-1.5 font-mono text-[9px] text-[#A50034] uppercase tracking-[0.16em]">
                      · Deep Dive
                    </span>
                  )}
                </span>
                <span
                  className="font-medium text-[#2C2C2A] tracking-wide shrink-0"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {t.score.toFixed(1)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
