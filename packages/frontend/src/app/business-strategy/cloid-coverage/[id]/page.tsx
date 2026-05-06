'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  findCellById,
  CLOID_SPECS,
  VERDICT_LABEL,
  PRIORITY_LABEL,
  type SubCell,
  type Verdict,
} from '@/components/cloid-coverage/data';

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const v = VERDICT_LABEL[verdict];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[11px] font-medium"
      style={{ backgroundColor: v.bg, color: v.color, borderRadius: 3 }}
    >
      <span>{v.emoji}</span>
      <span>{v.ko}</span>
    </span>
  );
}

function PriorityPill({ priority }: { priority: SubCell['priority'] }) {
  const p = PRIORITY_LABEL[priority];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em]"
      style={{ backgroundColor: p.bg, color: p.color, borderRadius: 3 }}
    >
      {priority}
    </span>
  );
}

function LvRow({ sc }: { sc: SubCell }) {
  return (
    <div className="border-b border-[#E8E6DD] last:border-b-0 py-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="font-mono text-[12px] font-medium px-2 py-1 bg-[#F0EEE8] text-[#2C2C2A] tracking-wide"
            style={{ borderRadius: 3 }}
          >
            Lv{sc.lv}
          </span>
          <h3 className="font-medium text-[15px] text-[#2C2C2A] leading-tight">{sc.taskName}</h3>
        </div>
        <PriorityPill priority={sc.priority} />
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-3">
        {/* Core actions */}
        <div>
          <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] mb-1.5">핵심 동작</p>
          <ul className="space-y-1">
            {sc.coreActions.map((a, i) => (
              <li key={i} className="text-[12.5px] text-[#2C2C2A]">
                <span className="text-[#8B1538] mr-1.5">•</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
        {/* Thresholds */}
        <div>
          <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] mb-1.5">요구 임계값</p>
          <p className="text-[12.5px] text-[#2C2C2A] leading-relaxed">{sc.thresholds}</p>
        </div>
      </div>

      {/* CLOiD W / B verdicts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div
          className="border border-[#E8E6DD] p-3"
          style={{ borderRadius: 6, backgroundColor: VERDICT_LABEL[sc.cloidW.verdict].bg + '40' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10.5px] text-[#5F5E5A] uppercase tracking-[0.14em] font-medium">
              CLOiD W (휠형)
            </span>
            <VerdictPill verdict={sc.cloidW.verdict} />
          </div>
          <p className="text-[12px] text-[#2C2C2A] leading-relaxed">{sc.cloidW.note}</p>
        </div>
        <div
          className="border border-[#E8E6DD] p-3"
          style={{ borderRadius: 6, backgroundColor: VERDICT_LABEL[sc.cloidB.verdict].bg + '40' }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10.5px] text-[#5F5E5A] uppercase tracking-[0.14em] font-medium">
              CLOiD B (양족)
            </span>
            <VerdictPill verdict={sc.cloidB.verdict} />
          </div>
          <p className="text-[12px] text-[#2C2C2A] leading-relaxed">{sc.cloidB.note}</p>
        </div>
      </div>

      {/* Benchmark + Dev items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] mb-1">양산 벤치마크</p>
          <p className="text-[11.5px] text-[#5F5E5A] leading-snug">{sc.benchmark}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] mb-1">개발 필요 항목</p>
          <ul className="space-y-0.5">
            {sc.devItems.map((d, i) => (
              <li key={i} className="text-[11.5px] text-[#2C2C2A] leading-snug">
                <span className="text-[#8B1538] mr-1">→</span>
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SpecTable({ spec }: { spec: { label: string; rows: readonly (readonly [string, string, string])[] } }) {
  return (
    <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
      <p className="font-medium text-[13px] text-[#2C2C2A] mb-3">{spec.label}</p>
      <table className="w-full text-[11.5px]">
        <tbody>
          {spec.rows.map((row, i) => (
            <tr key={i} className="border-b border-[#EAE7DD] last:border-b-0">
              <td className="py-1 pr-2 font-mono text-[10px] text-[#888780] uppercase tracking-[0.12em] w-12 align-top">
                {row[0]}
              </td>
              <td className="py-1 pr-2 text-[#5F5E5A] align-top">{row[1]}</td>
              <td className="py-1 text-[#2C2C2A] font-medium align-top">{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellDetailContent() {
  const params = useParams<{ id: string }>();
  const cell = findCellById(params.id);

  if (!cell) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[20px] text-[#2C2C2A] mb-2">셀을 찾을 수 없습니다</h1>
          <Link href="/business-strategy/cloid-coverage" className="text-[#8B1538]">
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Per-cell W/B counts
  const w = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  const b = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  for (const sc of cell.subCells) {
    w[sc.cloidW.verdict]++;
    b[sc.cloidB.verdict]++;
  }

  return (
    <div className="min-h-screen bg-white" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Breadcrumb */}
        <Link
          href="/business-strategy/cloid-coverage"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#5F5E5A] hover:text-[#8B1538] mb-3"
        >
          <ArrowLeft size={14} />
          진입 적합 셀 목록
        </Link>

        {/* Cell header */}
        <div className="flex items-stretch border border-[#E8E6DD] mb-6" style={{ borderRadius: 8, overflow: 'hidden' }}>
          <div
            className="flex flex-col items-center justify-center px-6 py-5 shrink-0"
            style={{ width: 110, backgroundColor: cell.score >= 9 ? '#E1F0D9' : cell.score >= 8 ? '#EAF3DE' : '#F4ECDC' }}
          >
            <span
              className="font-medium text-[36px] text-[#2C2C2A] leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {cell.score.toFixed(1)}
            </span>
            <span className="font-mono text-[10px] text-[#5F5E5A] uppercase tracking-[0.18em] mt-1.5">/ 10</span>
          </div>
          <div className="flex-1 px-6 py-5 min-w-0 bg-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#8B1538]">
                진입 적합 셀
              </span>
            </div>
            <h1 className="font-medium text-[24px] text-[#2C2C2A] tracking-tight leading-tight">
              <span className="font-mono text-[#8B1538] mr-1.5">{cell.cellNum}</span>
              {cell.taskName}
              <span className="text-[#B8B6AE] mx-2">×</span>
              {cell.sectorName}
            </h1>
            <p className="text-[13.5px] text-[#5F5E5A] mt-1.5 leading-relaxed">{cell.oneLineInsight}</p>
          </div>
        </div>

        {/* W/B summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-2">CLOiD W 4-Lv 종합</p>
            <div className="flex gap-3 text-[13px]">
              <span className="font-medium text-emerald-700">✅ Cover {w.cover}</span>
              <span className="font-medium text-amber-700">⚠️ Partial {w.partial}</span>
              <span className="font-medium text-red-700">❌ Gap {w.gap}</span>
            </div>
          </div>
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-2">CLOiD B 4-Lv 종합</p>
            <div className="flex gap-3 text-[13px]">
              <span className="font-medium text-emerald-700">✅ Cover {b.cover}</span>
              <span className="font-medium text-amber-700">⚠️ Partial {b.partial}</span>
              <span className="font-medium text-red-700">❌ Gap {b.gap}</span>
            </div>
          </div>
        </div>

        {/* 4Lv detail */}
        <div className="bg-white border border-[#E8E6DD] mb-8" style={{ borderRadius: 8 }}>
          <div className="px-5 py-3 border-b border-[#E8E6DD] bg-[#FAFAF8]">
            <h2 className="font-medium text-[14px] text-[#2C2C2A]">4-Level 동작·Gap 상세</h2>
          </div>
          <div className="px-5">
            {cell.subCells.map((sc) => (
              <LvRow key={sc.lv} sc={sc} />
            ))}
          </div>
        </div>

        {/* Spec baseline */}
        <h2 className="font-medium text-[14px] text-[#2C2C2A] mb-3">분석 baseline — CLOiD 추정 스펙</h2>
        <p className="text-[11.5px] text-[#5F5E5A] mb-3 leading-relaxed">
          ⚠️ 모든 항목 [추정] — ARGOS의 LG 휴머노이드 스펙 페이지에 실제 스펙 입력 후 정밀화 예정.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SpecTable spec={CLOID_SPECS.W} />
          <SpecTable spec={CLOID_SPECS.B} />
        </div>
      </div>
    </div>
  );
}

export default function CellDetailPage() {
  return (
    <AuthGuard>
      <CellDetailContent />
    </AuthGuard>
  );
}
