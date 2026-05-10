'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import TaskCategoryMatrix from '@/components/cloid-coverage/TaskCategoryMatrix';
import {
  CELLS_V13,
  CLUSTERS_V13,
  LG_ASSETS,
  KOREA_PARTNERS,
  END_EFFECTOR_CATEGORIES,
  GAP_DEFINITION,
  DEV_TYPES,
  getStatsV13,
  VERDICT_LABEL,
  cellHasFieldVerified,
  type Verdict,
} from '@/components/cloid-coverage/data-v13';

function ScoreBadge({ score }: { score: number }) {
  const bg = score >= 9 ? '#E1F0D9' : score >= 8 ? '#EAF3DE' : score >= 7 ? '#F4ECDC' : '#FAFAF8';
  return (
    <div className="inline-flex items-baseline gap-1 px-2.5 py-0.5" style={{ backgroundColor: bg, borderRadius: 4 }}>
      <span className="font-medium text-[15px] text-[#2C2C2A]" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {score.toFixed(1)}
      </span>
      <span className="font-mono text-[9px] text-[#5F5E5A]">/10</span>
    </div>
  );
}

function CellCard({ cell }: { cell: (typeof CELLS_V13)[number] }) {
  const w = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  const b = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  let lgCount = 0;
  for (const sc of cell.subCells) {
    w[sc.cloidW.verdict]++;
    b[sc.cloidB.verdict]++;
    if (sc.lgAssets && sc.lgAssets.length > 0) lgCount += sc.lgAssets.length;
  }
  const isVerified = cellHasFieldVerified(cell);
  return (
    <Link
      href={`/business-strategy/cloid-coverage/v13/${cell.id}`}
      className="group relative block bg-white border border-[#E8E6DD] hover:border-[#8B1538] hover:shadow-md transition-all p-5"
      style={{ borderRadius: 8 }}
    >
      {isVerified && (
        <span
          className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white"
          style={{ backgroundColor: '#A50034', borderRadius: 3 }}
        >
          ★ 현장 확인
        </span>
      )}
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
        <ChevronRight size={18} className="text-[#888780] group-hover:text-[#8B1538] transition-colors mt-1 shrink-0" />
      </div>
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
        {lgCount > 0 && (
          <div className="flex items-center gap-2 text-[10.5px] font-mono pt-1 border-t border-[#F0EEE8] mt-2">
            <Sparkles size={11} className="text-[#A50034]" />
            <span className="text-[#A50034] font-medium">LG Captive 매핑 {lgCount}건</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function CloidCoverageV13Content() {
  const stats = getStatsV13();
  const cwPct = ((stats.cw.cover + stats.cw.partial) / stats.totalSubcells) * 100;
  const cbPct = ((stats.cb.cover + stats.cb.partial) / stats.totalSubcells) * 100;

  return (
    <div className="min-h-screen bg-white" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 text-[12px] text-[#5F5E5A]">
            <Link href="/business-strategy" className="hover:text-[#8B1538]">ARGOS 도메인 확장</Link>
            <span className="text-[#B8B6AE]">/</span>
            <Link href="/business-strategy/matrix" className="hover:text-[#8B1538]">진입성 매트릭스</Link>
            <span className="text-[#B8B6AE]">/</span>
            <span className="text-[#2C2C2A] font-medium">CLOiD 커버리지</span>
          </div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="font-medium text-[28px] text-[#2C2C2A] tracking-tight">
              CLOiD W/B Capability Gap 분석
            </h1>
            <span className="font-mono text-[11px] text-[#A50034] font-medium tracking-[0.14em] px-2 py-0.5 bg-[#FAEAE7]">
              v1.3.1 r2
            </span>
            <span className="font-mono text-[10.5px] text-[#A50034] tracking-[0.14em] px-1.5 py-0.5 border border-[#A50034]">
              ★ 현장 {stats.verifiedSubcells}/{stats.totalSubcells}
            </span>
          </div>
          <p className="text-[13.5px] text-[#5F5E5A] leading-relaxed max-w-[920px]">
            {CELLS_V13.length}개 진입 적합 셀 × 4Lv = <strong>{stats.totalSubcells} sub-cell</strong>, EE 9-카테고리 분리, Tier 매칭, LG Captive 7종, 한국 협업 5종, 7 클러스터.
            v1.3.1 r2 — LG·BCG 합동 ES사업부 A2동 (2026-05-10) 현장 확인 {stats.verifiedSubcells}건 반영.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-1.5">총 sub-cell</p>
            <p className="font-medium text-[28px] text-[#2C2C2A] tabular-nums">{stats.totalSubcells}</p>
            <p className="text-[11px] text-[#5F5E5A] mt-1">{CELLS_V13.length} 셀 × 4 Lv</p>
          </div>
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-1.5">CLOiD W cover/partial</p>
            <p className="font-medium text-[28px] text-[#2C2C2A] tabular-nums">
              {stats.cw.cover + stats.cw.partial}
              <span className="text-[14px] text-[#888780] font-mono ml-1">({cwPct.toFixed(0)}%)</span>
            </p>
            <p className="text-[11px] text-[#5F5E5A] mt-1">평지 물류 강점</p>
          </div>
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-1.5">CLOiD B cover/partial</p>
            <p className="font-medium text-[28px] text-[#2C2C2A] tabular-nums">
              {stats.cb.cover + stats.cb.partial}
              <span className="text-[14px] text-[#888780] font-mono ml-1">({cbPct.toFixed(0)}%)</span>
            </p>
            <p className="text-[11px] text-[#5F5E5A] mt-1">계단·협소·조선 우위</p>
          </div>
          <div className="bg-[#FAEAE7] border border-[#F0CCD0] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#A50034] uppercase tracking-[0.16em] mb-1.5">LG Captive 매핑 셀</p>
            <p className="font-medium text-[28px] text-[#A50034] tabular-nums">
              {stats.cellsWithLgAssets}
              <span className="text-[14px] font-mono ml-1">/ {CELLS_V13.length} ({stats.lgAssetRatio})</span>
            </p>
            <p className="text-[11px] text-[#5F5E5A] mt-1">7종 자산 활용 가능</p>
          </div>
        </div>

        {/* Gap Definition */}
        <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-5 mb-8" style={{ borderRadius: 8 }}>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.16em] mb-3">판정 표기 정의 (v1.3 한국어 통일)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(GAP_DEFINITION).map(([key, def]) => (
              <div key={key} className="flex items-start gap-2">
                <span style={{ color: VERDICT_LABEL[key as Verdict].color }} className="text-[18px]">
                  {def.symbol}
                </span>
                <div className="text-[12px]">
                  <p className="font-medium text-[#2C2C2A]">{def.label} <span className="text-[#5F5E5A]">— {def.kr}</span></p>
                  <p className="text-[#5F5E5A] mt-0.5">{def.time} · {def.work}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task category × complexity matrix — 2축 빠른 조회 */}
        <div className="mb-8">
          <TaskCategoryMatrix />
        </div>

        {/* Cell Grid */}
        <h2 className="font-medium text-[16px] text-[#2C2C2A] mb-4">셀별 분석 (점수 내림차순)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {CELLS_V13.map((cell) => (
            <CellCard key={cell.id} cell={cell} />
          ))}
        </div>

        {/* Dev Clusters */}
        <h2 className="font-medium text-[16px] text-[#2C2C2A] mb-4">{CLUSTERS_V13.length}개 개발 클러스터 (LG 관점)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {CLUSTERS_V13.map((cluster, idx) => {
            const c = cluster as Record<string, unknown>;
            const name = (c.name as string) || `클러스터 ${idx + 1}`;
            const direction = (c.direction as string) || '';
            const lgPersp = (c.lg_perspective as string) || (c.lg_angle as string) || '';
            const koreaP = (c.korea_partner as string) || '';
            const benchmark = (c.benchmark as string) || '';
            const duration = (c.duration as string) || (c.time as string) || '';
            const priority = (c.priority as string) || '';
            const verified = c.field_verified === true;
            const verifiedSrc = (c.field_verified_source as string) || '';
            return (
              <div
                key={idx}
                className="bg-white p-5"
                style={{
                  borderRadius: 8,
                  border: verified ? '2px solid #A50034' : '1px solid #E8E6DD',
                }}
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <p className="font-medium text-[14px] text-[#2C2C2A] flex-1">
                    {verified && <span className="text-[#A50034] mr-1">★</span>}
                    {name}
                  </p>
                  {priority && (
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.12em] px-2 py-0.5 bg-[#FAEAE7] text-[#A50034]">
                      {priority}
                    </span>
                  )}
                </div>
                {verified && verifiedSrc && (
                  <p className="text-[10.5px] text-[#A50034] mb-2 font-mono">★ {verifiedSrc}</p>
                )}
                <div className="space-y-1.5 text-[12px]">
                  {direction && (
                    <div className="flex gap-2">
                      <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] w-20 shrink-0 mt-0.5">방향</span>
                      <span className="text-[#2C2C2A]">{direction}</span>
                    </div>
                  )}
                  {lgPersp && (
                    <div className="flex gap-2">
                      <span className="font-mono text-[10px] text-[#A50034] uppercase tracking-[0.14em] w-20 shrink-0 mt-0.5">LG 관점</span>
                      <span className="text-[#A50034]">{lgPersp}</span>
                    </div>
                  )}
                  {koreaP && (
                    <div className="flex gap-2">
                      <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] w-20 shrink-0 mt-0.5">한국 협업</span>
                      <span className="text-[#5F5E5A]">{koreaP}</span>
                    </div>
                  )}
                  {benchmark && (
                    <div className="flex gap-2">
                      <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] w-20 shrink-0 mt-0.5">벤치마크</span>
                      <span className="text-[#5F5E5A]">{benchmark}</span>
                    </div>
                  )}
                  {duration && (
                    <div className="flex gap-2">
                      <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] w-20 shrink-0 mt-0.5">기간</span>
                      <span className="text-[#8B1538] font-medium">{duration}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* LG Assets */}
        <h2 className="font-medium text-[16px] text-[#2C2C2A] mb-4">LG Captive (자체 자산) 7종</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
          {Object.entries(LG_ASSETS).map(([key, asset]) => (
            <div key={key} className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
              <div className="flex items-start justify-between mb-1.5">
                <span className="font-medium text-[13.5px] text-[#A50034]">{key}</span>
                <span className="font-mono text-[9.5px] text-[#888780] tracking-[0.10em]">{asset.reliability}</span>
              </div>
              <p className="text-[11.5px] text-[#5F5E5A] mb-1">
                <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.12em] mr-1">카테고리</span>
                {asset.category}
              </p>
              <p className="text-[12px] text-[#2C2C2A] mb-1.5 leading-relaxed">{asset.rationale}</p>
              <div className="flex flex-wrap gap-1">
                {asset.covers.map((c) => (
                  <span key={c} className="font-mono text-[9.5px] px-1.5 py-0.5 bg-white border border-[#E8E6DD] text-[#5F5E5A]">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Korea Partners */}
        <h2 className="font-medium text-[16px] text-[#2C2C2A] mb-4">한국 생태계 협업 5종</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
          {Object.entries(KOREA_PARTNERS).map(([key, p]) => (
            <div key={key} className="bg-white border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
              <div className="flex items-start justify-between mb-1.5">
                <span className="font-medium text-[13.5px] text-[#2C2C2A]">{key}</span>
                <span className="font-mono text-[9.5px] text-[#888780] tracking-[0.10em]">{p.reliability}</span>
              </div>
              <p className="text-[11.5px] text-[#5F5E5A] mb-1">
                <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.12em] mr-1">카테고리</span>
                {p.category}
              </p>
              <p className="text-[12px] text-[#2C2C2A] mb-1 leading-relaxed">{p.rationale}</p>
              <p className="text-[11px] text-[#8B1538] font-medium">{p.status}</p>
            </div>
          ))}
        </div>

        {/* EE Categories */}
        <h2 className="font-medium text-[16px] text-[#2C2C2A] mb-4">End-Effector 9-카테고리</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-12">
          {Object.entries(END_EFFECTOR_CATEGORIES).map(([key, ee]) => (
            <div key={key} className="bg-[#FAFAF8] border border-[#E8E6DD] p-3" style={{ borderRadius: 8 }}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-mono text-[10.5px] font-medium text-[#8B1538] tracking-wide">{key}</span>
                <span className="font-mono text-[9.5px] text-[#888780]">{ee.dof}</span>
              </div>
              <p className="font-medium text-[12.5px] text-[#2C2C2A]">{ee.kr}</p>
              <p className="font-mono text-[10px] text-[#5F5E5A] mb-1">{ee.en}</p>
              <p className="text-[10.5px] text-[#5F5E5A] leading-snug">{ee.examples}</p>
            </div>
          ))}
        </div>

        {/* Dev Types */}
        <h2 className="font-medium text-[16px] text-[#2C2C2A] mb-4">개발 유형 분류 A/B/C/D</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {Object.entries(DEV_TYPES).map(([key, t]) => (
            <div key={key} className="bg-white border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-mono text-[20px] font-medium text-[#A50034]">{key}</span>
                {t.priority && (
                  <span className="font-mono text-[10px] text-[#A50034]">{t.priority}</span>
                )}
              </div>
              <p className="text-[12px] text-[#2C2C2A] leading-relaxed mb-1">{t.desc}</p>
              <p className="font-mono text-[10.5px] text-[#888780]">⏱ {t.time}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CloidCoverageV13Page() {
  return (
    <AuthGuard>
      <CloidCoverageV13Content />
    </AuthGuard>
  );
}
