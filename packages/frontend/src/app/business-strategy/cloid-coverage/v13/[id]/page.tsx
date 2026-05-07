'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, X, Wrench } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  findCellV13,
  CLOID_SPECS_V13,
  VERDICT_LABEL,
  PRIORITY_LABEL,
  LG_ASSETS,
  KOREA_PARTNERS,
  END_EFFECTOR_CATEGORIES,
  DEV_TYPES,
  type SubCellV13,
  type Verdict,
} from '@/components/cloid-coverage/data-v13';

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

function PriorityPill({ priority }: { priority: SubCellV13['priority'] }) {
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

function DevTypeBadge({ type }: { type: SubCellV13['devType'] }) {
  if (!type) return null;
  const t = DEV_TYPES[type as 'A' | 'B' | 'C' | 'D'];
  if (!t) return null;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 bg-[#F0EEE8] text-[#5F5E5A]"
      style={{ borderRadius: 3 }}
      title={`${t.desc} (${t.time})`}
    >
      <span className="font-medium text-[#A50034]">{type}</span>
      <span>· {t.time}</span>
    </span>
  );
}

function EeReqRow({ eeReq }: { eeReq: SubCellV13['eeReq'] }) {
  const tier1 = eeReq.tier1 || [];
  const tier2 = eeReq.tier2 || [];
  const tier3 = eeReq.tier3 || [];
  if (tier1.length === 0 && tier2.length === 0 && tier3.length === 0) return null;
  const renderTier = (label: string, items: string[], color: string) =>
    items.length > 0 && (
      <div className="flex items-start gap-2">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] w-12 shrink-0 mt-0.5" style={{ color }}>
          {label}
        </span>
        <div className="flex flex-wrap gap-1">
          {items.map((it) => {
            const ee = END_EFFECTOR_CATEGORIES[it];
            return (
              <span
                key={it}
                className="font-mono text-[9.5px] px-1.5 py-0.5 bg-[#FAFAF8] border border-[#E8E6DD] text-[#2C2C2A]"
                title={ee ? `${ee.kr} (${ee.dof})` : it}
              >
                {it}
                {ee && <span className="text-[#888780] ml-1">· {ee.kr}</span>}
              </span>
            );
          })}
        </div>
      </div>
    );
  return (
    <div className="space-y-1">
      {renderTier('Tier 1', tier1, '#1a7a3a')}
      {renderTier('Tier 2', tier2, '#9a6500')}
      {renderTier('Tier 3', tier3, '#5F5E5A')}
    </div>
  );
}

function LgAssetChips({ assetIds }: { assetIds: string[] }) {
  if (!assetIds || assetIds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {assetIds.map((id) => {
        const asset = LG_ASSETS[id];
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 font-mono text-[9.5px] px-1.5 py-0.5 bg-[#FAEAE7] text-[#A50034]"
            title={asset ? asset.rationale : id}
          >
            <Sparkles size={9} />
            {id}
          </span>
        );
      })}
    </div>
  );
}

function KoreaPartnerChips({ partnerIds }: { partnerIds: string[] }) {
  if (!partnerIds || partnerIds.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {partnerIds.map((id) => {
        const p = KOREA_PARTNERS[id];
        return (
          <span
            key={id}
            className="font-mono text-[9.5px] px-1.5 py-0.5 bg-[#E6F1FB] text-[#0C447C]"
            title={p ? p.rationale : id}
          >
            🤝 {id}
          </span>
        );
      })}
    </div>
  );
}

function LvRow({ sc }: { sc: SubCellV13 }) {
  return (
    <div id={`lv-${sc.lv}`} className="border-b border-[#E8E6DD] last:border-b-0 py-5 scroll-mt-20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono text-[12px] font-medium px-2 py-1 bg-[#F0EEE8] text-[#2C2C2A] tracking-wide" style={{ borderRadius: 3 }}>
            Lv{sc.lv}
          </span>
          <h3 className="font-medium text-[15px] text-[#2C2C2A] leading-tight">{sc.taskName}</h3>
        </div>
        <div className="flex items-center gap-2">
          <DevTypeBadge type={sc.devType} />
          <PriorityPill priority={sc.priority} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-3">
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
        <div>
          <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] mb-1.5">요구 임계값</p>
          <p className="text-[12.5px] text-[#2C2C2A] leading-relaxed">{sc.thresholds}</p>
        </div>
      </div>

      {/* EE requirement */}
      {(sc.eeReq.tier1 || sc.eeReq.tier2 || sc.eeReq.tier3) && (
        <div className="mb-3 bg-[#FAFAF8] border border-[#E8E6DD] p-2.5" style={{ borderRadius: 4 }}>
          <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em] mb-1.5">End-Effector 요구</p>
          <EeReqRow eeReq={sc.eeReq} />
        </div>
      )}

      {/* CLOiD W/B verdicts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="border border-[#E8E6DD] p-3" style={{ borderRadius: 6, backgroundColor: VERDICT_LABEL[sc.cloidW.verdict].bg + '40' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10.5px] text-[#5F5E5A] uppercase tracking-[0.14em] font-medium">CLOiD W (휠형)</span>
            <VerdictPill verdict={sc.cloidW.verdict} />
          </div>
          <p className="text-[12px] text-[#2C2C2A] leading-relaxed">{sc.cloidW.note}</p>
        </div>
        <div className="border border-[#E8E6DD] p-3" style={{ borderRadius: 6, backgroundColor: VERDICT_LABEL[sc.cloidB.verdict].bg + '40' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-[10.5px] text-[#5F5E5A] uppercase tracking-[0.14em] font-medium">CLOiD B (양족)</span>
            <VerdictPill verdict={sc.cloidB.verdict} />
          </div>
          <p className="text-[12px] text-[#2C2C2A] leading-relaxed">{sc.cloidB.note}</p>
        </div>
      </div>

      {/* LG assets + Korea partners */}
      {(sc.lgAssets.length > 0 || sc.koreaPartners.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          {sc.lgAssets.length > 0 && (
            <div>
              <p className="font-mono text-[10px] text-[#A50034] uppercase tracking-[0.14em] mb-1.5">LG Captive</p>
              <LgAssetChips assetIds={sc.lgAssets} />
            </div>
          )}
          {sc.koreaPartners.length > 0 && (
            <div>
              <p className="font-mono text-[10px] text-[#0C447C] uppercase tracking-[0.14em] mb-1.5">한국 생태계 협업</p>
              <KoreaPartnerChips partnerIds={sc.koreaPartners} />
            </div>
          )}
        </div>
      )}

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

// ─── Dev items modal ──────────────────────────────────────────────
function DevItemsModal({
  cell,
  onClose,
}: {
  cell: NonNullable<ReturnType<typeof findCellV13>>;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const totalDev = cell.subCells.reduce((s, sc) => s + sc.devItems.length, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(26,26,26,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[920px] max-h-[90vh] overflow-hidden flex flex-col"
        style={{ borderRadius: 8, border: '1px solid #E2DED4' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E2DED4]"
          style={{ backgroundColor: '#FAFAF7' }}
        >
          <div>
            <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.16em] font-semibold mb-1">
              개발 필요 항목
            </p>
            <h2 className="text-[20px] font-medium text-[#1A1A1A] leading-tight">
              <span className="font-mono text-[#8B1538] mr-1.5">{cell.cellNum}</span>
              {cell.taskName}
              <span className="text-[#B8B6AE] mx-2">×</span>
              {cell.sectorName}
              <span className="ml-3 font-mono text-[14px] text-[#6B6B6B]">총 {totalDev}건</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded hover:bg-[#F2F0EA] text-[#6B6B6B] hover:text-[#1A1A1A]"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {(() => {
            const lvsWithItems = cell.subCells.filter((sc) => sc.devItems && sc.devItems.length > 0);
            if (lvsWithItems.length === 0) {
              return (
                <p className="text-[13px] text-[#5F5E5A] text-center py-8">
                  이 셀의 4개 Lv 모두 개발 필요 항목이 없습니다.
                </p>
              );
            }
            return lvsWithItems.map((sc) => {
              const tint = VERDICT_LABEL[sc.cloidW.verdict];
              return (
                <div
                  key={sc.lv}
                  className="relative pl-5 pr-4 py-4 border border-[#E2DED4] bg-white"
                  style={{ borderRadius: 6 }}
                >
                  <div className="absolute left-0 top-0 bottom-0" style={{ width: 4, backgroundColor: tint.color }} />
                  <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="font-mono text-[12px] font-medium px-2 py-0.5 bg-[#F0EEE8] text-[#1A1A1A] tracking-wide"
                        style={{ borderRadius: 3 }}
                      >
                        Lv{sc.lv}
                      </span>
                      <span className="text-[14px] font-medium text-[#1A1A1A]">
                        {sc.taskName || `Lv${sc.lv} 작업`}
                      </span>
                      <span className="font-mono text-[11px] text-[#888780]">
                        ({sc.devItems.length}건)
                      </span>
                    </div>
                    <PriorityPill priority={sc.priority} />
                  </div>
                  <div
                    className="bg-[#FAFAF7] p-3"
                    style={{ borderRadius: 4, border: '1px solid #E8E6DD' }}
                  >
                    <p className="font-mono text-[10px] text-[#1A1A1A] uppercase tracking-[0.14em] mb-2 font-bold">
                      → 개발 필요
                    </p>
                    <ul className="space-y-1.5">
                      {sc.devItems.map((d, i) => (
                        <li
                          key={i}
                          className="text-[13.5px] text-[#1A1A1A] leading-relaxed flex gap-2"
                        >
                          <span className="shrink-0 text-[#8B1538] font-bold">·</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Aggregate gripper requirements across all 4 levels of a cell ─────
function aggregateGrippers(cell: NonNullable<ReturnType<typeof findCellV13>>) {
  const tier1 = new Set<string>();
  const tier2 = new Set<string>();
  const tier3 = new Set<string>();
  for (const sc of cell.subCells) {
    (sc.eeReq.tier1 || []).forEach((g) => tier1.add(g));
    (sc.eeReq.tier2 || []).forEach((g) => tier2.add(g));
    (sc.eeReq.tier3 || []).forEach((g) => tier3.add(g));
  }
  // De-dupe across tiers — if a gripper appears in tier1, drop from tier2/3 etc.
  tier1.forEach((g) => { tier2.delete(g); tier3.delete(g); });
  tier2.forEach((g) => tier3.delete(g));
  return { tier1: [...tier1], tier2: [...tier2], tier3: [...tier3] };
}

function GripperPill({ code, tone }: { code: string; tone: 'primary' | 'secondary' | 'tertiary' }) {
  const ee = END_EFFECTOR_CATEGORIES[code];
  const styles = {
    primary:   { bg: '#E8F5EE', color: '#0F4F32', border: '#3F8C6E', dofColor: '#1f6647' },
    secondary: { bg: '#FBF1D6', color: '#5A3F0A', border: '#D4A22F', dofColor: '#7a5a14' },
    tertiary:  { bg: '#F0EEE8', color: '#3A3A38', border: '#B8B6AE', dofColor: '#5F5E5A' },
  } as const;
  const s = styles[tone];
  return (
    <span
      className="inline-flex items-baseline gap-2 px-3 py-1.5"
      style={{ backgroundColor: s.bg, color: s.color, border: `1.5px solid ${s.border}`, borderRadius: 6 }}
      title={ee ? `${ee.kr} (${ee.dof}) — ${ee.examples}` : code}
    >
      <span className="font-mono font-bold text-[14px] tracking-wide">{code}</span>
      {ee && (
        <span className="text-[14px] font-medium">{ee.kr}</span>
      )}
      {ee && (
        <span className="font-mono text-[10px] opacity-75" style={{ color: s.dofColor }}>{ee.dof}</span>
      )}
    </span>
  );
}

function CellDetailV13Content() {
  const params = useParams<{ id: string }>();
  const cell = findCellV13(params.id);
  const [devModalOpen, setDevModalOpen] = useState(false);

  if (!cell) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[20px] text-[#2C2C2A] mb-2">셀을 찾을 수 없습니다</h1>
          <Link href="/business-strategy/cloid-coverage/v13" className="text-[#8B1538]">
            ← v1.3 인덱스로
          </Link>
        </div>
      </div>
    );
  }

  const w = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  const b = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  let totalDev = 0;
  for (const sc of cell.subCells) {
    w[sc.cloidW.verdict]++;
    b[sc.cloidB.verdict]++;
    totalDev += sc.devItems.length;
  }

  // Aggregated unique LG assets / Korea partners across all 4 levels
  const allLg = Array.from(new Set(cell.subCells.flatMap((sc) => sc.lgAssets)));
  const allKorea = Array.from(new Set(cell.subCells.flatMap((sc) => sc.koreaPartners)));
  const grippers = aggregateGrippers(cell);

  return (
    <div className="min-h-screen bg-white" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <Link
          href="/business-strategy/cloid-coverage/v13"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#5F5E5A] hover:text-[#8B1538] mb-3"
        >
          <ArrowLeft size={14} />
          v1.3 인덱스
        </Link>

        {/* Cell header */}
        <div className="flex items-stretch border border-[#E8E6DD] mb-6" style={{ borderRadius: 8, overflow: 'hidden' }}>
          <div
            className="flex flex-col items-center justify-center px-6 py-5 shrink-0"
            style={{ width: 110, backgroundColor: cell.score >= 9 ? '#E1F0D9' : cell.score >= 8 ? '#EAF3DE' : '#F4ECDC' }}
          >
            <span className="font-medium text-[36px] text-[#2C2C2A] leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {cell.score.toFixed(1)}
            </span>
            <span className="font-mono text-[10px] text-[#5F5E5A] uppercase tracking-[0.18em] mt-1.5">/ 10</span>
          </div>
          <div className="flex-1 px-6 py-5 min-w-0 bg-white">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#8B1538]">진입 적합 셀</span>
              <span className="font-mono text-[10px] text-[#A50034] tracking-[0.14em] px-1.5 py-0.5 bg-[#FAEAE7]">v1.3</span>
            </div>
            <h1 className="font-medium text-[24px] text-[#2C2C2A] tracking-tight leading-tight">
              <span className="font-mono text-[#8B1538] mr-1.5">{cell.cellNum}</span>
              {cell.taskName}
              <span className="text-[#B8B6AE] mx-2">×</span>
              {cell.sectorName}
            </h1>
          </div>
        </div>

        {/* Top summary band — 권장 그리퍼 + 개발 필요 N건 버튼 (셀 단위 한눈에 보기) */}
        <div
          className="flex items-stretch flex-wrap gap-3 px-5 py-4 border border-[#E2DED4] bg-white mb-3"
          style={{ borderRadius: 8 }}
        >
          <div className="flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5 mb-1">
              <Wrench size={13} className="text-[#5F5E5A]" />
              <span className="font-mono text-[10.5px] text-[#5F5E5A] uppercase tracking-[0.16em] font-semibold">
                이 셀에 필요한 End-Effector
              </span>
            </div>
            <p className="text-[10.5px] text-[#888780] mb-2">
              4 Lv별 요구 그리퍼 합산 — <strong style={{ color: '#1f6647' }}>주력</strong>(1순위) /
              <strong style={{ color: '#7a5a14' }} className="ml-1">대체</strong>(폴백) /
              <strong style={{ color: '#5F5E5A' }} className="ml-1">옵션</strong>(최후)
            </p>
            <div className="space-y-1.5">
              {grippers.tier1.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-[#1f6647] uppercase tracking-[0.12em] w-12 shrink-0 mt-1.5 font-semibold">
                    주력
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {grippers.tier1.map((g) => (
                      <GripperPill key={g} code={g} tone="primary" />
                    ))}
                  </div>
                </div>
              )}
              {grippers.tier2.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-[#7a5a14] uppercase tracking-[0.12em] w-12 shrink-0 mt-1.5 font-semibold">
                    대체
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {grippers.tier2.map((g) => (
                      <GripperPill key={g} code={g} tone="secondary" />
                    ))}
                  </div>
                </div>
              )}
              {grippers.tier3.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[10px] text-[#5F5E5A] uppercase tracking-[0.12em] w-12 shrink-0 mt-1.5 font-semibold">
                    옵션
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {grippers.tier3.map((g) => (
                      <GripperPill key={g} code={g} tone="tertiary" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end justify-center gap-2 pl-3 border-l border-[#E2DED4]">
            <span className="font-mono text-[10.5px] text-[#5F5E5A] uppercase tracking-[0.16em]">
              개발 필요 작업
            </span>
            <button
              type="button"
              onClick={() => setDevModalOpen(true)}
              className="font-mono text-[14px] font-semibold px-4 py-2 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] flex items-center gap-2"
              style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: 4 }}
              aria-label={`개발 필요 작업 ${totalDev}건 상세 보기`}
            >
              → 개발 필요 {totalDev}건
            </button>
            <span className="font-mono text-[10px] text-[#888780]">
              4 Lv 작업 항목 합 · {cell.subCells.filter((sc) => sc.priority === 'High').length} High
            </span>
          </div>
        </div>

        {devModalOpen && <DevItemsModal cell={cell} onClose={() => setDevModalOpen(false)} />}

        {/* W/B summary + LG/Korea aggregate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-2">CLOiD W — Lv 단위 평가</p>
            <div className="flex gap-3 text-[13px]">
              <span className="font-medium text-emerald-700">✅ Cover {w.cover}</span>
              <span className="font-medium text-amber-700">⚠️ Partial {w.partial}</span>
              <span className="font-medium text-red-700">❌ 신규 개발 {w.gap}</span>
            </div>
            <p className="text-[10px] text-[#888780] mt-1.5">4 Lv 중 각 verdict 개수 (작업 항목 카운트와 별개)</p>
          </div>
          <div className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-2">CLOiD B — Lv 단위 평가</p>
            <div className="flex gap-3 text-[13px]">
              <span className="font-medium text-emerald-700">✅ Cover {b.cover}</span>
              <span className="font-medium text-amber-700">⚠️ Partial {b.partial}</span>
              <span className="font-medium text-red-700">❌ 신규 개발 {b.gap}</span>
            </div>
            <p className="text-[10px] text-[#888780] mt-1.5">4 Lv 중 각 verdict 개수 (작업 항목 카운트와 별개)</p>
          </div>
        </div>

        {(allLg.length > 0 || allKorea.length > 0) && (
          <div className="bg-white border border-[#E8E6DD] p-4 mb-6" style={{ borderRadius: 8 }}>
            <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em] mb-3">셀 전체 매핑</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allLg.length > 0 && (
                <div>
                  <p className="font-mono text-[10.5px] text-[#A50034] uppercase tracking-[0.14em] mb-1.5">LG Captive</p>
                  <LgAssetChips assetIds={allLg} />
                </div>
              )}
              {allKorea.length > 0 && (
                <div>
                  <p className="font-mono text-[10.5px] text-[#0C447C] uppercase tracking-[0.14em] mb-1.5">한국 생태계 협업</p>
                  <KoreaPartnerChips partnerIds={allKorea} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4Lv detail */}
        <div className="bg-white border border-[#E8E6DD] mb-8" style={{ borderRadius: 8 }}>
          <div className="px-5 py-3 border-b border-[#E8E6DD] bg-[#FAFAF8]">
            <h2 className="font-medium text-[14px] text-[#2C2C2A]">4-Level 동작 · Gap · LG Captive 매핑</h2>
          </div>
          <div className="px-5">
            {cell.subCells.map((sc) => (
              <LvRow key={sc.lv} sc={sc} />
            ))}
          </div>
        </div>

        {/* Spec baseline */}
        <h2 className="font-medium text-[14px] text-[#2C2C2A] mb-3">분석 baseline — CLOiD 스펙 v1.3</h2>
        <p className="text-[11.5px] text-[#5F5E5A] mb-3 leading-relaxed">
          ⚠️ [F추정] — ARGOS 휴머노이드 스펙 페이지 입력 후 Phase 4 정밀화 예정.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {(['W', 'B'] as const).map((k) => {
            const s = CLOID_SPECS_V13[k];
            return (
              <div key={k} className="bg-[#FAFAF8] border border-[#E8E6DD] p-4" style={{ borderRadius: 8 }}>
                <p className="font-medium text-[13px] text-[#2C2C2A] mb-3">{s.label}</p>
                <table className="w-full text-[11.5px]">
                  <tbody>
                    {s.rows.slice(0, 22).map((row, i) => (
                      <tr key={i} className="border-b border-[#EAE7DD] last:border-b-0">
                        <td className="py-1 pr-2 font-mono text-[10px] text-[#888780] uppercase tracking-[0.10em] w-16 align-top">
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
          })}
        </div>
      </div>
    </div>
  );
}

export default function CellDetailV13Page() {
  return (
    <AuthGuard>
      <CellDetailV13Content />
    </AuthGuard>
  );
}
