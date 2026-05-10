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
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[10.5px]">
          <span className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.18em]">
            현장 검증
          </span>
          {/* 좌측 6px 녹색 띠 + 우하단 카운트 배지 미니 미리보기 */}
          <span
            className="relative inline-block"
            style={{
              width: 32,
              height: 18,
              backgroundColor: '#EAF3DE',
              boxShadow: 'inset 6px 0 0 0 #1a7a3a',
              borderRadius: 2,
            }}
          >
            <span
              className="absolute bottom-0.5 right-0.5 inline-flex items-center gap-0.5 font-bold text-[8.5px] px-1 py-px"
              style={{ color: '#FFFFFF', backgroundColor: '#1a7a3a', borderRadius: 2 }}
            >
              ✓N
            </span>
          </span>
          <span className="text-[10.5px] text-[#5F5E5A]">
            셀 좌측 녹색 띠 + 카운트 배지 = 현장 확인된 sub-cell 수 (DB 누적)
          </span>
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
