'use client';

import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { STATS, EMPHASIS_MODES, type EmphasisMode } from './data';
import { CELLS_V13, END_EFFECTOR_CATEGORIES } from '../cloid-coverage/data-v13';

// 13개 진입 적합 셀의 모든 Lv (52 sub-cell) 합산 그리퍼 사용 빈도
function aggregateAllGrippers() {
  const counts: Record<string, { tier1: number; tier2: number; tier3: number }> = {};
  for (const cell of CELLS_V13) {
    for (const sc of cell.subCells) {
      (sc.eeReq.tier1 || []).forEach((g) => {
        if (!counts[g]) counts[g] = { tier1: 0, tier2: 0, tier3: 0 };
        counts[g].tier1++;
      });
      (sc.eeReq.tier2 || []).forEach((g) => {
        if (!counts[g]) counts[g] = { tier1: 0, tier2: 0, tier3: 0 };
        counts[g].tier2++;
      });
      (sc.eeReq.tier3 || []).forEach((g) => {
        if (!counts[g]) counts[g] = { tier1: 0, tier2: 0, tier3: 0 };
        counts[g].tier3++;
      });
    }
  }
  const list = Object.entries(counts).map(([code, c]) => ({
    code,
    ...c,
    total: c.tier1 + c.tier2 + c.tier3,
    weighted: c.tier1 * 3 + c.tier2 * 2 + c.tier3,
  }));
  // Sort by weighted score descending (Tier1 weight 3x, Tier2 2x, Tier3 1x)
  list.sort((a, b) => b.weighted - a.weighted);
  return list;
}

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
            v11
          </span>
        </div>
        <span className="ml-auto font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.18em] hidden md:inline mr-3">
          12 Top Task × 12 산업 / 클릭 시 4Lv 상세
        </span>
        <Link
          href="/business-strategy/cloid-coverage/v13"
          className="px-3 py-1.5 text-[11.5px] font-medium border border-[#A50034] text-[#A50034] hover:bg-[#FAEAE7] transition-colors whitespace-nowrap"
          style={{ borderRadius: 4 }}
        >
          CLOiD W/B 커버리지 v1.3 →
        </Link>
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

      {/* 13개 진입 적합 셀 통합 — 권장 그리퍼 (52 sub-cell 합산, Tier 가중치 3:2:1) */}
      <RequiredGrippersBand />

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

function RequiredGrippersBand() {
  const grippers = aggregateAllGrippers();
  if (grippers.length === 0) return null;
  // Top 6 by weighted importance for the headline; rest as compact list
  const headline = grippers.slice(0, 6);
  return (
    <div
      className="border border-[#E8E6DD] bg-white p-4"
      style={{ borderRadius: 8 }}
    >
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Wrench size={14} className="text-[#A50034]" />
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#A50034]">
            13개 진입 적합 셀 통합 — 자주 쓰이는 End-Effector
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em]">
          52 sub-cell 합산 · 가중치 3:2:1
        </span>
      </div>
      <p className="text-[11px] text-[#5F5E5A] mb-3 leading-snug">
        ⓘ <strong>셀당 실제 채택은 1~2개</strong>. 아래는 13개 셀이 어떤 그리퍼를 얼마나 자주 요구하는지 빈도 순위입니다.
        <span className="font-mono text-[10px] ml-2">
          <strong style={{ color: '#1f6647' }}>주력</strong> = 1순위로 요구한 셀 수 ·
          <strong style={{ color: '#7a5a14' }} className="ml-1">대체</strong> = 차선책으로 받는 수 ·
          <strong style={{ color: '#5F5E5A' }} className="ml-1">옵션</strong> = 최후 옵션
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {headline.map((g, idx) => {
          const ee = END_EFFECTOR_CATEGORIES[g.code];
          const isTop3 = idx < 3;
          return (
            <div
              key={g.code}
              className="inline-flex items-baseline gap-2.5 px-3 py-2"
              style={{
                backgroundColor: isTop3 ? '#FAEAE7' : '#FAFAF7',
                border: `1.5px solid ${isTop3 ? '#A50034' : '#D3D1C7'}`,
                borderRadius: 6,
              }}
              title={ee ? `${ee.examples}` : g.code}
            >
              <span
                className="font-mono font-bold text-[14px]"
                style={{ color: isTop3 ? '#A50034' : '#2C2C2A' }}
              >
                {g.code}
              </span>
              {ee && (
                <span className="text-[14px] font-medium text-[#1A1A1A]">{ee.kr}</span>
              )}
              <span className="font-mono text-[10.5px] text-[#5F5E5A] inline-flex items-baseline gap-1">
                <span style={{ color: '#1f6647' }}>주력 <strong>{g.tier1}</strong></span>
                <span className="opacity-50">·</span>
                <span style={{ color: '#7a5a14' }}>대체 <strong>{g.tier2}</strong></span>
                {g.tier3 > 0 && (
                  <>
                    <span className="opacity-50">·</span>
                    <span style={{ color: '#5F5E5A' }}>옵션 <strong>{g.tier3}</strong></span>
                  </>
                )}
              </span>
            </div>
          );
        })}
        {grippers.length > 6 && (
          <span className="self-center font-mono text-[11px] text-[#888780]">
            + {grippers.length - 6}종 더
          </span>
        )}
      </div>
    </div>
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
