'use client';

import { STATS, EMPHASIS_MODES, type EmphasisMode } from './data';

interface Props {
  mode: EmphasisMode;
  onModeChange: (m: EmphasisMode) => void;
}

export default function MatrixHeader({ mode, onModeChange }: Props) {
  return (
    <header className="space-y-5 mb-6">
      {/* Title */}
      <div className="flex items-center gap-3 pb-4 border-b border-[#E8E6DD]">
        <span className="w-2 h-2 rounded-full bg-[#8B1538]" />
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="font-medium text-[24px] text-[#2C2C2A] tracking-tight">
            휴머노이드 진입성 매트릭스
          </h1>
          <span className="font-mono text-[11px] font-medium text-[#8B1538] tracking-[0.16em] uppercase">
            v9.3
          </span>
        </div>
        <span className="ml-auto font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.18em] hidden md:inline">
          12 Top Task × 12 산업 / 클릭 시 4Lv 상세
        </span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="총 셀" value={STATS.total.toString()} note="12 × 12" />
        <StatCard label="진입 적합" value={STATS.fitCount.toString()} note="점수 ≥ 7.5" accent />
        <StatCard label="평균 점수" value={STATS.avg.toFixed(1)} note="0~10 범위" />
        <StatCard
          label="산업 평균 1위"
          value={STATS.topSector.avg.toFixed(1)}
          note={STATS.topSector.name}
        />
      </div>

      {/* Emphasis toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.18em] mr-1">
          강조 모드
        </span>
        {EMPHASIS_MODES.map((m) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`px-3 py-1.5 text-[12px] font-medium border transition-colors ${
                active
                  ? 'bg-[#8B1538] text-white border-[#8B1538]'
                  : 'bg-white text-[#2C2C2A] border-[#D3D1C7] hover:border-[#8B1538] hover:text-[#8B1538]'
              }`}
              style={{ borderRadius: 4 }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}

function StatCard({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div
      className={`p-4 border ${accent ? 'border-[#8B1538] bg-[#FAEAE7]/40' : 'border-[#E8E6DD] bg-white'}`}
      style={{ borderRadius: 8 }}
    >
      <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.2em]">{label}</p>
      <p
        className={`font-medium text-[32px] mt-1.5 leading-none ${accent ? 'text-[#8B1538]' : 'text-[#2C2C2A]'}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
      <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mt-2">
        {note}
      </p>
    </div>
  );
}
