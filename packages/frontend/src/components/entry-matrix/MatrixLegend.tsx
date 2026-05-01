'use client';

import { TOP_5, TASKS, SECTORS } from './data';

const COLOR_LEGEND = [
  { color: '#B8DB8F', label: '진입 적합', range: '7.5+' },
  { color: '#EAF3DE', label: '진입 가능', range: '5.0+' },
  { color: '#FAEEDA', label: '부분 진입', range: '3.0+' },
  { color: '#FBEAF0', label: '제한적',   range: '1.0+' },
  { color: '#F0EEE8', label: '진입 불가', range: '< 1.0' },
];

export default function MatrixLegend() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
      <div className="lg:col-span-7 border border-[#E8E6DD] bg-white p-4" style={{ borderRadius: 8 }}>
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
          ⭐ Top 5 = 2px 크림슨 외곽선 / 강조 모드 = 비대상 셀 28% 투명도
        </p>
      </div>

      <div className="lg:col-span-5 border-2 border-[#8B1538] bg-[#FAEAE7]/30 p-4" style={{ borderRadius: 8 }}>
        <p className="font-mono text-[10px] text-[#8B1538] uppercase tracking-[0.2em] mb-3 font-medium">
          ⭐ Top 5 진입 적합 셀
        </p>
        <ol className="space-y-1.5">
          {TOP_5.map((t) => (
            <li key={t.rank} className="flex items-baseline gap-3 text-[12px]">
              <span
                className="font-mono text-[#8B1538] font-medium tracking-wide w-6"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t.rank.toString().padStart(2, '0')}
              </span>
              <span className="text-[#2C2C2A] flex-1 leading-tight">
                <span className="font-mono text-[#8B1538]">{TASKS[t.taskIdx].num}</span>{' '}
                {TASKS[t.taskIdx].name}
                <span className="text-[#B8B6AE] mx-1.5">×</span>
                {SECTORS[t.sectorIdx]}
              </span>
              <span
                className="font-medium text-[#2C2C2A] tracking-wide"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t.score.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
