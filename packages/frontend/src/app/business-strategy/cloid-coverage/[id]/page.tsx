'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronDown, X } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  findCellById,
  CLOID_SPECS,
  VERDICT_LABEL,
  PRIORITY_LABEL,
  DEV_CLUSTERS,
  type SubCell,
  type Verdict,
  type CloidCoverageCell,
  type GripperConfidence,
} from '@/components/cloid-coverage/data';
import {
  lookupRequiredGripper,
  GRIPPER_GENERATED_META,
} from '@/components/cloid-coverage/gripper-data.generated';

// Phase B에서 enrich-cloid-gripper.ts가 생성한 정식 분류가 있으면 그걸 사용하고,
// 없을 때만 Phase A 휴리스틱 키워드 추출로 fallback.
const GRIPPER_KEYWORDS = [
  '그리퍼', '그리핑', '그립',
  'MAN-20', 'MAN-21', 'MAN-22',
  'Soft', 'soft',
  'F/T', 'F-T', 'F·T',
  '손바닥 카메라', '손목 회전', '손 DoF', '손목 7',
  'multi 그리퍼', 'multi-그리퍼',
  '평행', '흡착', 'suction', '진공',
];

function extractGripperHints(sc: SubCell): string[] {
  const sources: string[] = [...sc.coreActions, sc.thresholds, ...sc.devItems];
  const hits = new Set<string>();
  for (const text of sources) {
    if (GRIPPER_KEYWORDS.some((k) => text.includes(k))) hits.add(text);
  }
  return [...hits];
}

// 셀 / 클러스터 매칭: cluster.cells 문자열 안에 cell.cellNum + 산업명 일부가 포함되는지
function findRelevantClusters(cell: CloidCoverageCell) {
  return DEV_CLUSTERS.filter((cl) =>
    cl.cells.some((c) => c.includes(cell.cellNum) || c.includes(cell.sectorName)),
  );
}

const VERDICT_TINT: Record<
  Verdict,
  { strip: string; bg: string; chipBg: string; chipText: string; mark: string; dot: string }
> = {
  cover:   { strip: '#3F8C6E', bg: '#F4F9F6', chipBg: '#3F8C6E', chipText: '#FFFFFF', mark: '✓', dot: '#3F8C6E' },
  partial: { strip: '#D4A22F', bg: '#FBF6E8', chipBg: '#D4A22F', chipText: '#1A1A1A', mark: '⚠', dot: '#D4A22F' },
  gap:     { strip: '#D63F6F', bg: '#FBEEF3', chipBg: '#D63F6F', chipText: '#FFFFFF', mark: '✕', dot: '#D63F6F' },
};

function worseVerdict(a: Verdict, b: Verdict): Verdict {
  const order: Record<Verdict, number> = { gap: 0, partial: 1, cover: 2 };
  return order[a] < order[b] ? a : b;
}

function VerdictChip({ verdict }: { verdict: Verdict }) {
  const t = VERDICT_TINT[verdict];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[11px] font-medium"
      style={{ backgroundColor: t.chipBg, color: t.chipText, borderRadius: 3 }}
    >
      <span>{t.mark}</span>
      <span>{VERDICT_LABEL[verdict].ko}</span>
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

function LvRow({ sc, isLast }: { sc: SubCell; isLast: boolean }) {
  const lvVerdict = worseVerdict(sc.cloidW.verdict, sc.cloidB.verdict);
  const tint = VERDICT_TINT[lvVerdict];

  return (
    <div
      className={`relative pl-6 pr-5 py-5 ${isLast ? '' : 'border-b border-[#E2DED4]'}`}
      style={{ backgroundColor: tint.bg }}
    >
      {/* §12.2 4px solid strip */}
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 4, backgroundColor: tint.strip }} />

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="font-mono text-[12px] font-medium px-2 py-1 bg-white text-[#1A1A1A] tracking-wide border border-[#E2DED4]"
            style={{ borderRadius: 3 }}
          >
            Lv{sc.lv}
          </span>
          <h3 className="font-medium text-[17px] text-[#1A1A1A] leading-tight">{sc.taskName}</h3>
        </div>
        <PriorityPill priority={sc.priority} />
      </div>

      {/* Body grid: core actions + thresholds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-4">
        <div>
          <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.14em] mb-2 font-semibold">
            핵심 동작
          </p>
          <ul className="space-y-1">
            {sc.coreActions.map((a, i) => (
              <li key={i} className="text-[15px] text-[#1A1A1A] leading-relaxed">
                <span className="text-[#8B1538] mr-1.5">•</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.14em] mb-2 font-semibold">
            요구 임계값
          </p>
          <p className="text-[15px] text-[#1A1A1A] leading-relaxed">{sc.thresholds}</p>
        </div>
      </div>

      {/* CLOiD W / B verdicts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {(['cloidW', 'cloidB'] as const).map((key) => {
          const item = sc[key];
          const t = VERDICT_TINT[item.verdict];
          const label = key === 'cloidW' ? 'CLOiD W (휠형)' : 'CLOiD B (양족)';
          return (
            <div
              key={key}
              className="relative bg-white p-3 pl-4 border border-[#E2DED4] overflow-hidden"
              style={{ borderRadius: 6 }}
            >
              <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, backgroundColor: t.strip }} />
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.14em] font-semibold">
                  {label}
                </span>
                <VerdictChip verdict={item.verdict} />
              </div>
              <p className="text-[14px] text-[#1A1A1A] leading-relaxed">{item.note}</p>
            </div>
          );
        })}
      </div>

      {/* §12.3 Benchmark (plain) + Dev items (검정 테두리 강조) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-[#E2DED4] p-3" style={{ borderRadius: 6 }}>
          <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.14em] mb-1.5 font-semibold">
            양산 벤치마크
          </p>
          <p className="text-[14px] text-[#3A3A3A] leading-snug">{sc.benchmark}</p>
        </div>
        <div className="bg-white p-3" style={{ borderRadius: 6, border: '1.5px solid #1A1A1A' }}>
          <p className="font-mono text-[11px] text-[#1A1A1A] uppercase tracking-[0.12em] mb-1.5 font-bold">
            → 개발 필요 항목
          </p>
          <ul className="space-y-1">
            {sc.devItems.map((d, i) => (
              <li key={i} className="text-[15px] text-[#1A1A1A] leading-relaxed flex gap-1.5">
                <span className="text-[#1A1A1A] shrink-0">·</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SpecTable({
  spec,
}: {
  spec: { label: string; rows: readonly (readonly [string, string, string])[] };
}) {
  return (
    <div className="bg-[#FAFAF7] border border-[#E2DED4] p-4" style={{ borderRadius: 8 }}>
      <p className="font-medium text-[13px] text-[#1A1A1A] mb-3">{spec.label}</p>
      <table className="w-full text-[12px]">
        <tbody>
          {spec.rows.map((row, i) => (
            <tr key={i} className="border-b border-[#E2DED4] last:border-b-0">
              <td className="py-1 pr-2 font-mono text-[10px] text-[#6B6B6B] uppercase tracking-[0.12em] w-12 align-top">
                {row[0]}
              </td>
              <td className="py-1 pr-2 text-[#3A3A3A] align-top">{row[1]}</td>
              <td className="py-1 text-[#1A1A1A] font-medium align-top">{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DevItemsModal({
  cell,
  onClose,
}: {
  cell: CloidCoverageCell;
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
  const clusters = findRelevantClusters(cell);

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
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#E2DED4]"
          style={{ backgroundColor: '#FAFAF7' }}
        >
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.16em] font-semibold mb-1">
              개발 필요 항목
            </p>
            <h2 className="text-[20px] font-medium text-[#1A1A1A] leading-tight">
              <span className="font-mono text-[#8B1538] mr-1.5">{cell.cellNum}</span>
              {cell.taskName}
              <span className="text-[#B8B6AE] mx-2">×</span>
              {cell.sectorName}
              <span className="ml-3 font-mono text-[14px] text-[#6B6B6B]">
                총 {totalDev}건
              </span>
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {cell.subCells.map((sc) => {
            if (sc.devItems.length === 0) return null;
            const lvVerdict = worseVerdict(sc.cloidW.verdict, sc.cloidB.verdict);
            const tint = VERDICT_TINT[lvVerdict];
            const formalGripper = lookupRequiredGripper(cell.id, sc.lv);
            const gripperHints = formalGripper ? [] : extractGripperHints(sc);

            return (
              <div
                key={sc.lv}
                className="relative pl-5 pr-4 py-4 border border-[#E2DED4]"
                style={{ borderRadius: 6, backgroundColor: tint.bg }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0"
                  style={{ width: 4, backgroundColor: tint.strip }}
                />

                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="font-mono text-[12px] font-medium px-2 py-0.5 bg-white text-[#1A1A1A] tracking-wide border border-[#E2DED4]"
                      style={{ borderRadius: 3 }}
                    >
                      Lv{sc.lv}
                    </span>
                    <span className="text-[15px] font-medium text-[#1A1A1A]">
                      {sc.taskName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityPill priority={sc.priority} />
                    <span className="font-mono text-[11px] text-[#6B6B6B]">
                      W <VerdictDot v={sc.cloidW.verdict} /> · B{' '}
                      <VerdictDot v={sc.cloidB.verdict} />
                    </span>
                  </div>
                </div>

                {/* Dev items — 가장 강한 시각 무게 */}
                <div
                  className="bg-white p-3"
                  style={{ borderRadius: 6, border: '1.5px solid #1A1A1A' }}
                >
                  <p className="font-mono text-[11px] text-[#1A1A1A] uppercase tracking-[0.12em] mb-1.5 font-bold">
                    → 개발 필요
                  </p>
                  <ul className="space-y-1">
                    {sc.devItems.map((d, i) => (
                      <li
                        key={i}
                        className="text-[15px] text-[#1A1A1A] leading-relaxed flex gap-1.5"
                      >
                        <span className="shrink-0">·</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 필요 그리퍼 — 정식 분류 (Phase B 산출물) */}
                {formalGripper && (
                  <div
                    className="bg-white border border-[#E2DED4] p-3 mt-2"
                    style={{ borderRadius: 6 }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.14em] font-semibold">
                        필요 그리퍼
                      </p>
                      <ConfidenceBadge confidence={formalGripper.confidence} />
                    </div>
                    <p className="text-[15px] font-medium text-[#1A1A1A] mb-0.5">
                      {formalGripper.category}
                    </p>
                    <p className="text-[13.5px] text-[#3A3A3A] leading-relaxed">
                      {formalGripper.detail}
                    </p>
                  </div>
                )}

                {/* Fallback: 휴리스틱 키워드 추출 (정식 분류 없을 때만) */}
                {!formalGripper && gripperHints.length > 0 && (
                  <div
                    className="bg-white border border-[#E2DED4] p-3 mt-2"
                    style={{ borderRadius: 6 }}
                  >
                    <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.14em] mb-1.5 font-semibold">
                      관련 그리퍼·손목 단서{' '}
                      <span className="text-[#B8B6AE] normal-case tracking-normal font-normal">
                        (텍스트 추출 — 정식 분류 미생성)
                      </span>
                    </p>
                    <ul className="space-y-0.5">
                      {gripperHints.map((g, i) => (
                        <li
                          key={i}
                          className="text-[13.5px] text-[#3A3A3A] leading-relaxed flex gap-1.5"
                        >
                          <span className="shrink-0">·</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}

          {/* 관련 개발 클러스터 */}
          {clusters.length > 0 && (
            <div
              className="border border-[#E2DED4] p-4"
              style={{ borderRadius: 6, backgroundColor: '#FAFAF7' }}
            >
              <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.14em] mb-2.5 font-semibold">
                Phase 4 관련 개발 클러스터
              </p>
              <ul className="space-y-2">
                {clusters.map((cl) => (
                  <li key={cl.id} className="text-[14px] text-[#1A1A1A] leading-relaxed">
                    <div className="font-medium">{cl.name}</div>
                    <div className="text-[12.5px] text-[#3A3A3A] mt-0.5">
                      방향: {cl.direction}
                    </div>
                    <div className="font-mono text-[11.5px] text-[#6B6B6B] mt-0.5">
                      벤치마크: {cl.benchmark} · 기간: {cl.duration}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t border-[#E2DED4] flex items-center justify-between gap-4"
          style={{ backgroundColor: '#FAFAF7' }}
        >
          <p className="font-mono text-[10.5px] text-[#6B6B6B]">
            {GRIPPER_GENERATED_META.count > 0 ? (
              <>
                필요 그리퍼 분류: {GRIPPER_GENERATED_META.model} ·{' '}
                {GRIPPER_GENERATED_META.generatedAt?.slice(0, 10)} 생성
              </>
            ) : (
              <>필요 그리퍼 정식 분류 미생성 — 휴리스틱 추출 표시 중</>
            )}
          </p>
          <button
            onClick={onClose}
            className="font-mono text-[12px] text-[#1A1A1A] px-3 py-1.5 border border-[#E2DED4] hover:bg-white"
            style={{ borderRadius: 4 }}
          >
            닫기 (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}

function VerdictDot({ v }: { v: Verdict }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full align-middle mx-0.5"
      style={{ backgroundColor: VERDICT_TINT[v].dot }}
    />
  );
}

const CONFIDENCE_STYLE: Record<GripperConfidence, { label: string; bg: string; color: string }> = {
  high:   { label: 'HIGH 신뢰',  bg: '#E6F4EA', color: '#1a7a3a' },
  medium: { label: 'MED 신뢰',   bg: '#FFF4D6', color: '#9a6500' },
  low:    { label: 'LOW 신뢰',   bg: '#FBEAF0', color: '#a01020' },
};

function ConfidenceBadge({ confidence }: { confidence: GripperConfidence }) {
  const s = CONFIDENCE_STYLE[confidence];
  return (
    <span
      className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5"
      style={{ backgroundColor: s.bg, color: s.color, borderRadius: 3 }}
    >
      {s.label}
    </span>
  );
}

function CellDetailContent() {
  const params = useParams<{ id: string }>();
  const cell = findCellById(params.id);
  const [devModalOpen, setDevModalOpen] = useState(false);

  if (!cell) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-[20px] text-[#1A1A1A] mb-2">셀을 찾을 수 없습니다</h1>
          <Link href="/business-strategy/cloid-coverage" className="text-[#8B1538]">
            ← 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // Per-cell W/B counts + dev count
  const w = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  const b = { cover: 0, partial: 0, gap: 0 } as Record<Verdict, number>;
  let devCount = 0;
  for (const sc of cell.subCells) {
    w[sc.cloidW.verdict]++;
    b[sc.cloidB.verdict]++;
    devCount += sc.devItems.length;
  }
  const totalCover = w.cover + b.cover;
  const totalPartial = w.partial + b.partial;
  const totalGap = w.gap + b.gap;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF7', color: '#1A1A1A' }}>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Breadcrumb */}
        <Link
          href="/business-strategy/cloid-coverage"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#6B6B6B] hover:text-[#8B1538] mb-3"
        >
          <ArrowLeft size={14} />
          진입 적합 셀 목록
        </Link>

        {/* Cell identity header */}
        <div
          className="flex items-stretch border border-[#E2DED4] mb-3 bg-white"
          style={{ borderRadius: 8, overflow: 'hidden' }}
        >
          <div
            className="flex flex-col items-center justify-center px-6 py-5 shrink-0"
            style={{
              width: 110,
              backgroundColor:
                cell.score >= 9 ? '#E1F0D9' : cell.score >= 8 ? '#EAF3DE' : '#F4ECDC',
            }}
          >
            <span
              className="font-medium text-[36px] text-[#1A1A1A] leading-none"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {cell.score.toFixed(1)}
            </span>
            <span className="font-mono text-[10px] text-[#6B6B6B] uppercase tracking-[0.18em] mt-1.5">
              / 10
            </span>
          </div>
          <div className="flex-1 px-6 py-5 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#8B1538]">
                진입 적합 셀
              </span>
            </div>
            <h1 className="font-medium text-[24px] text-[#1A1A1A] tracking-tight leading-tight">
              <span className="font-mono text-[#8B1538] mr-1.5">{cell.cellNum}</span>
              {cell.taskName}
              <span className="text-[#B8B6AE] mx-2">×</span>
              {cell.sectorName}
            </h1>
            <p className="text-[15px] text-[#3A3A3A] mt-1.5 leading-relaxed">
              {cell.oneLineInsight}
            </p>
          </div>
        </div>

        {/* §12.1 한 줄 결론 띠 */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-3 border border-[#E2DED4] bg-white mb-3 flex-wrap"
          style={{ borderRadius: 8 }}
        >
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: VERDICT_TINT.cover.dot }}
              />
              <span className="font-mono text-[13px] text-[#1A1A1A]">
                {totalCover} <span className="text-[#6B6B6B]">Cover</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: VERDICT_TINT.partial.dot }}
              />
              <span className="font-mono text-[13px] text-[#1A1A1A]">
                {totalPartial} <span className="text-[#6B6B6B]">Partial</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: VERDICT_TINT.gap.dot }}
              />
              <span className="font-mono text-[13px] text-[#1A1A1A]">
                {totalGap} <span className="text-[#6B6B6B]">Gap</span>
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.14em]">
              W·B 합산 {totalCover + totalPartial + totalGap}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDevModalOpen(true)}
            className="font-mono text-[13px] font-medium px-3 py-1.5 transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1A1A1A]"
            style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF', borderRadius: 4 }}
            aria-label={`개발 필요 ${devCount}건 상세 보기`}
          >
            → 개발 필요 {devCount}건
          </button>
        </div>

        {devModalOpen && <DevItemsModal cell={cell} onClose={() => setDevModalOpen(false)} />}

        {/* W·B 분리 카운트 — 비교 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div
            className="bg-white border border-[#E2DED4] px-4 py-3"
            style={{ borderRadius: 8 }}
          >
            <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.16em] mb-2 font-semibold">
              CLOiD W (휠형)
            </p>
            <div className="flex gap-3 text-[13px] font-mono">
              <span style={{ color: VERDICT_TINT.cover.dot }} className="font-medium">
                Cover {w.cover}
              </span>
              <span style={{ color: VERDICT_TINT.partial.dot }} className="font-medium">
                Partial {w.partial}
              </span>
              <span style={{ color: VERDICT_TINT.gap.dot }} className="font-medium">
                Gap {w.gap}
              </span>
            </div>
          </div>
          <div
            className="bg-white border border-[#E2DED4] px-4 py-3"
            style={{ borderRadius: 8 }}
          >
            <p className="font-mono text-[11px] text-[#6B6B6B] uppercase tracking-[0.16em] mb-2 font-semibold">
              CLOiD B (양족)
            </p>
            <div className="flex gap-3 text-[13px] font-mono">
              <span style={{ color: VERDICT_TINT.cover.dot }} className="font-medium">
                Cover {b.cover}
              </span>
              <span style={{ color: VERDICT_TINT.partial.dot }} className="font-medium">
                Partial {b.partial}
              </span>
              <span style={{ color: VERDICT_TINT.gap.dot }} className="font-medium">
                Gap {b.gap}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Lv 상세 */}
        <div
          className="bg-white border border-[#E2DED4] mb-8 overflow-hidden"
          style={{ borderRadius: 8 }}
        >
          <div
            className="px-5 py-3 border-b border-[#E2DED4]"
            style={{ backgroundColor: '#F2F0EA' }}
          >
            <h2 className="font-mono text-[13px] text-[#6B6B6B] uppercase tracking-[0.14em] font-semibold">
              4-Level 동작·Gap 상세
            </h2>
          </div>
          {cell.subCells.map((sc, i) => (
            <LvRow key={sc.lv} sc={sc} isLast={i === cell.subCells.length - 1} />
          ))}
        </div>

        {/* §12.4 베이스라인 스펙 — collapsed */}
        <details
          className="group border border-[#E2DED4] bg-white"
          style={{ borderRadius: 8 }}
        >
          <summary className="cursor-pointer list-none px-5 py-3 flex items-center gap-2 hover:bg-[#FAFAF7]">
            <ChevronDown
              size={14}
              className="transition-transform -rotate-90 group-open:rotate-0 text-[#6B6B6B]"
            />
            <span className="font-mono text-[13px] uppercase tracking-[0.14em] font-semibold text-[#6B6B6B]">
              분석 baseline
            </span>
            <span className="text-[13px] text-[#1A1A1A]">— CLOiD 추정 스펙 (펼치기)</span>
          </summary>
          <div className="px-5 pb-5 pt-2">
            <p className="text-[12px] text-[#6B6B6B] mb-3 leading-relaxed">
              모든 항목 [추정] — ARGOS의 LG 휴머노이드 스펙 페이지에 실제 스펙 입력 후 정밀화 예정.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SpecTable spec={CLOID_SPECS.W} />
              <SpecTable spec={CLOID_SPECS.B} />
            </div>
          </div>
        </details>
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
