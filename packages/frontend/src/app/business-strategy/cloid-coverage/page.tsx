'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  CELLS,
  DEV_CLUSTERS,
  getStats,
  VERDICT_LABEL,
  type Verdict,
} from '@/components/cloid-coverage/data';

function ScoreBadge({ score }: { score: number }) {
  // Match matrix color logic loosely
  const bg = score >= 9 ? '#E1F0D9' : score >= 8 ? '#EAF3DE' : score >= 7 ? '#F4ECDC' : '#FAFAF8';
  return (
    <div
      className="inline-flex items-baseline gap-1 px-2.5 py-0.5"
      style={{ backgroundColor: bg, borderRadius: 4 }}
    >
      <span
        className="font-medium text-[15px] text-[#2C2C2A]"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {score.toFixed(1)}
      </span>
      <span className="font-mono text-[9px] text-[#5F5E5A]">/10</span>
    </div>
  );
}

function VerdictBar({
  cw,
  cb,
}: {
  cw: { cover: number; partial: number; gap: number };
  cb: { cover: number; partial: number; gap: number };
}) {
  const total = cw.cover + cw.partial + cw.gap;
  const renderRow = (label: string, v: { cover: number; partial: number; gap: number }) => (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10.5px] text-[#5F5E5A] uppercase tracking-[0.14em] w-20">
        {label}
      </span>
      <div className="flex-1 flex h-3 rounded-sm overflow-hidden bg-[#F0EEE8]">
        <div style={{ width: `${(v.cover / total) * 100}%`, backgroundColor: VERDICT_LABEL.cover.color }} />
        <div style={{ width: `${(v.partial / total) * 100}%`, backgroundColor: VERDICT_LABEL.partial.color }} />
        <div style={{ width: `${(v.gap / total) * 100}%`, backgroundColor: VERDICT_LABEL.gap.color }} />
      </div>
      <span className="font-mono text-[11px] text-[#2C2C2A] w-44 tabular-nums">
        ✅ {v.cover} · ⚠️ {v.partial} · ❌ {v.gap}
      </span>
    </div>
  );
  return (
    <div className="space-y-2">
      {renderRow('CLOiD W', cw)}
      {renderRow('CLOiD B', cb)}
    </div>
  );
}

function CellCard({
  cell,
}: {
  cell: (typeof CELLS)[number];
}) {
  // Per-cell W/B verdict counts
  const w = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  const b = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  for (const sc of cell.subCells) {
    w[sc.cloidW.verdict]++;
    b[sc.cloidB.verdict]++;
  }
  return (
    <Link
      href={`/business-strategy/cloid-coverage/${cell.id}`}
      className="group block bg-white border border-[#E8E6DD] hover:border-[#8B1538] hover:shadow-md transition-all p-5"
      style={{ borderRadius: 8 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[#8B1538] text-[14px] font-medium">{cell.cellNum}</span>
            <span className="font-medium text-[15px] text-[#2C2C2A] truncate">{cell.taskName}</span>
            <span className="text-[#B8B6AE]">×</span>
            <span className="font-medium text-[14px] text-[#5F5E5A]">{cell.sectorName}</span>
          </div>
          <ScoreBadge score={cell.score} />
        </div>
        <ChevronRight
          size={18}
          className="text-[#888780] group-hover:text-[#8B1538] transition-colors mt-1 shrink-0"
        />
      </div>
      <p className="text-[12.5px] text-[#5F5E5A] leading-relaxed mb-3 min-h-[2.6em]">
        {cell.oneLineInsight}
      </p>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[10.5px] font-mono">
          <span className="text-[#888780] uppercase tracking-[0.14em] w-14">CLOiD W</span>
          <span className="text-emerald-700">✅ {w.cover}</span>
          <span className="text-amber-700">⚠️ {w.partial}</span>
          <span className="text-red-700">❌ {w.gap}</span>
        </div>
        <div className="flex items-center gap-2 text-[10.5px] font-mono">
          <span className="text-[#888780] uppercase tracking-[0.14em] w-14">CLOiD B</span>
          <span className="text-emerald-700">✅ {b.cover}</span>
          <span className="text-amber-700">⚠️ {b.partial}</span>
          <span className="text-red-700">❌ {b.gap}</span>
        </div>
      </div>
    </Link>
  );
}

function CloidCoverageContent() {
  const stats = getStats();
  const sorted = [...CELLS].sort((a, b) => b.score - a.score);
  const cwPct = ((stats.cw.cover + stats.cw.partial) / stats.totalSubcells) * 100;
  const cbPct = ((stats.cb.cover + stats.cb.partial) / stats.totalSubcells) * 100;

  return (
    <div className="min-h-screen bg-white" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/business-strategy/matrix"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#5F5E5A] hover:text-[#8B1538] mb-3"
          >
            <ArrowLeft size={14} />
            진입성 매트릭스로 돌아가기
          </Link>
          <h1 className="font-medium text-[28px] text-[#2C2C2A] tracking-tight mb-2">
            13개 진입 적합 셀 × CLOiD W/B 동작·Gap 분석
          </h1>
          <p className="text-[13.5px] text-[#5F5E5A] leading-relaxed max-w-[860px]">
            진입 적합 (≥7.5점) 13개 셀을 4Lv (52 sub-cell)로 분해하고, 각 sub-cell이 CLOiD W (휠형) 와 CLOiD B (양족) 로 즉시 cover 가능한지 / 부분 cover인지 / 신규 개발이 필요한지 분류했습니다. <span className="text-[#8B1538] font-medium">모든 CLOiD 스펙은 [추정]</span>으로 ARGOS 페이지에 실제 스펙 입력 후 정밀화 예정.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-1.5">총 sub-cell</p>
            <p className="font-medium text-[28px] text-[#2C2C2A] tabular-nums">
              {stats.totalSubcells}
              <span className="text-[14px] text-[#888780] font-mono ml-1">/ 52</span>
            </p>
            <p className="text-[11px] text-[#5F5E5A] mt-1">13 셀 × 4 Lv</p>
          </div>
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-1.5">CLOiD W cover/partial</p>
            <p className="font-medium text-[28px] text-[#2C2C2A] tabular-nums">
              {stats.cw.cover + stats.cw.partial}
              <span className="text-[14px] text-[#888780] font-mono ml-1">({cwPct.toFixed(0)}%)</span>
            </p>
            <p className="text-[11px] text-[#5F5E5A] mt-1">평지 물류 영역 강점</p>
          </div>
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-1.5">CLOiD B cover/partial</p>
            <p className="font-medium text-[28px] text-[#2C2C2A] tabular-nums">
              {stats.cb.cover + stats.cb.partial}
              <span className="text-[14px] text-[#888780] font-mono ml-1">({cbPct.toFixed(0)}%)</span>
            </p>
            <p className="text-[11px] text-[#5F5E5A] mt-1">계단·협소·조선 영역 우위</p>
          </div>
        </div>

        {/* Coverage Bar */}
        <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-5 mb-8" style={{ borderRadius: 8 }}>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.16em] mb-3">전체 커버리지 분포</p>
          <VerdictBar cw={stats.cw} cb={stats.cb} />
        </div>

        {/* Cell Grid */}
        <h2 className="font-medium text-[16px] text-[#2C2C2A] mb-4">셀별 분석 (점수 내림차순)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {sorted.map((cell) => (
            <CellCard key={cell.id} cell={cell} />
          ))}
        </div>

        {/* Dev Clusters */}
        <h2 className="font-medium text-[16px] text-[#2C2C2A] mb-4">5개 개발 클러스터 (Phase 4 정밀화 가이드)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEV_CLUSTERS.map((cluster) => (
            <div
              key={cluster.id}
              className="bg-white border border-[#E8E6DD] p-5"
              style={{ borderRadius: 8 }}
            >
              <p className="font-medium text-[14px] text-[#2C2C2A] mb-2">{cluster.name}</p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex gap-2">
                  <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] w-20 shrink-0 mt-0.5">영향 셀</span>
                  <span className="text-[#5F5E5A]">{cluster.cells.join(', ')}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] w-20 shrink-0 mt-0.5">방향</span>
                  <span className="text-[#2C2C2A]">{cluster.direction}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] w-20 shrink-0 mt-0.5">벤치마크</span>
                  <span className="text-[#5F5E5A]">{cluster.benchmark}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] w-20 shrink-0 mt-0.5">기간</span>
                  <span className="text-[#8B1538] font-medium">{cluster.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CloidCoveragePage() {
  return (
    <AuthGuard>
      <CloidCoverageContent />
    </AuthGuard>
  );
}
