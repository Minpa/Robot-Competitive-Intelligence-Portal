'use client';

/**
 * CandidateComparisonPanel · REQ-8
 *
 * Modal-style overlay (full-width inside the workbench). Shows a comparison
 * matrix of metrics × candidates with the best cell highlighted per row.
 * Generates a textual recommendation by counting per-metric winners.
 */

import { useMemo } from 'react';
import { X } from 'lucide-react';
import type { SpecCandidate } from '../../stores/candidates-store';

const METRICS: Array<{
  key: string;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  extract: (c: SpecCandidate) => number | null;
}> = [
  {
    key: 'max_reach_cm',
    label: '최대 리치 (L1+L2)',
    unit: 'cm',
    higherIsBetter: true,
    extract: (c) => {
      const reach = c.product.arms.reduce(
        (m, a) => Math.max(m, a.upperArmLengthCm + a.forearmLengthCm),
        0
      );
      return reach > 0 ? reach : null;
    },
  },
  {
    key: 'max_height_cm',
    label: '최대 도달 높이',
    unit: 'cm',
    higherIsBetter: true,
    extract: (c) => {
      const arms = c.product.arms;
      if (arms.length === 0) return c.product.base.heightCm;
      return arms.reduce((m, a) => {
        const h =
          c.product.base.heightCm +
          (c.product.base.hasLiftColumn ? c.product.base.liftColumnMaxExtensionCm : 0) +
          a.shoulderHeightAboveBaseCm +
          (a.upperArmLengthCm + a.forearmLengthCm);
        return Math.max(m, h);
      }, 0);
    },
  },
  {
    key: 'payload_at_max',
    label: '페이로드 @ max reach',
    unit: 'kg',
    higherIsBetter: true,
    extract: (c) => {
      const arms = c.analysis?.arms ?? [];
      if (arms.length === 0) return null;
      const point = arms[0]?.payloadCurve?.[arms[0].payloadCurve.length - 1];
      return point?.maxPayloadKg ?? null;
    },
  },
  {
    key: 'zmp_margin_cm',
    label: 'ZMP 마진',
    unit: 'cm',
    higherIsBetter: true,
    extract: (c) => c.analysis?.stability?.marginToEdgeCm ?? null,
  },
  {
    key: 'target_reach_pct',
    label: '타겟 도달성',
    unit: '%',
    higherIsBetter: true,
    extract: (c) => {
      const targets = c.analysis?.environment?.targets ?? [];
      if (targets.length === 0) return null;
      const reached = targets.filter((t) => t.canReach).length;
      return (reached / targets.length) * 100;
    },
  },
  {
    key: 'traversability_pct',
    label: '통과 가능 영역',
    unit: '%',
    higherIsBetter: true,
    extract: (c) => c.analysis?.environment?.traversability?.coveragePct ?? null,
  },
  {
    key: 'total_actuator_price_usd',
    label: '액추에이터 추정 가격',
    unit: 'USD',
    higherIsBetter: false,
    extract: (c) => {
      // sum unique actuator SKUs is hard without catalog; we substitute by
      // counting joints × placeholder $300 per joint (rough estimate).
      const joints = c.product.arms.length * 2;
      return joints > 0 ? joints * 300 : null;
    },
  },
];

interface CandidateComparisonPanelProps {
  candidates: SpecCandidate[];
  onClose: () => void;
}

export function CandidateComparisonPanel({ candidates, onClose }: CandidateComparisonPanelProps) {
  const matrix = useMemo(() => {
    return METRICS.map((m) => {
      const values = candidates.map((c) => m.extract(c));
      let best: number | null = null;
      values.forEach((v) => {
        if (v === null) return;
        if (best === null) {
          best = v;
        } else if (m.higherIsBetter ? v > best : v < best) {
          best = v;
        }
      });
      return { ...m, values, best };
    });
  }, [candidates]);

  const winners = useMemo(() => {
    const counts = new Array(candidates.length).fill(0);
    for (const row of matrix) {
      row.values.forEach((v, i) => {
        if (v === null || row.best === null) return;
        if (Math.abs(v - row.best) < 0.001) counts[i]++;
      });
    }
    return counts;
  }, [matrix, candidates]);

  const recommendation = useMemo(() => {
    if (candidates.length < 2) return '비교할 후보가 부족합니다.';
    const ranked = candidates
      .map((c, i) => ({ name: c.name, wins: winners[i] }))
      .sort((a, b) => b.wins - a.wins);
    const top = ranked[0];
    const second = ranked[1];
    if (!top || !second) return '비교 결과를 계산할 수 없습니다.';
    if (top.wins === second.wins) {
      return `${top.name}와(과) ${second.name}이(가) 동률 (${top.wins}개 메트릭). 우선순위를 명확히 한 뒤 재선택하세요.`;
    }
    return `${top.name}이(가) ${top.wins}개 메트릭에서 우위 — ${second.name}는 ${second.wins}개. 환경 도달성·ZMP 마진을 함께 검토 후 결정.`;
  }, [winners, candidates]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-designer-ink/40 p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl max-h-[88vh] overflow-y-auto bg-designer-card border border-designer-rule shadow-report-lg p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 border border-designer-rule bg-designer-surface p-1.5 text-designer-muted hover:border-designer-ink-2 hover:text-designer-ink"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
          Candidate Comparison · REQ-8
        </span>
        <h2 className="mt-2 text-[22px] font-medium text-designer-ink">사양 후보안 비교 매트릭스</h2>

        {candidates.length === 0 ? (
          <p className="mt-4 text-[15px] text-designer-muted">
            비교할 후보가 없습니다. 좌측 사양 입력 후 [후보 저장]으로 추가하세요.
          </p>
        ) : (
          <>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="border-b-2 border-designer-rule">
                    <th className="text-left py-3 px-3 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted w-44">
                      메트릭
                    </th>
                    {candidates.map((c, i) => (
                      <th
                        key={c.id}
                        className="text-right py-3 px-3 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted"
                      >
                        <span className="block text-[15px] text-designer-ink">{c.name}</span>
                        <span className="block text-designer-muted mt-1">팔 {c.product.arms.length}</span>
                        <span className="block mt-1.5 text-designer-accent tabular-nums">
                          🏆 {winners[i]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.key} className="border-b border-designer-rule">
                      <td className="py-2.5 px-3 text-[15px] text-designer-ink">
                        {row.label} <span className="text-designer-muted ml-1">({row.unit})</span>
                      </td>
                      {row.values.map((v, i) => {
                        const isBest = v !== null && row.best !== null && Math.abs(v - row.best) < 0.001;
                        return (
                          <td
                            key={i}
                            className={[
                              'py-2.5 px-3 text-right font-mono tabular-nums text-[15px]',
                              isBest
                                ? 'bg-designer-accent/15 text-designer-ink font-semibold'
                                : 'text-designer-ink-2',
                            ].join(' ')}
                          >
                            {v === null ? <span className="text-designer-muted">—</span> : v.toFixed(row.unit === '%' ? 1 : 1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 border-l-4 border-designer-accent bg-designer-surface-2 pl-4 py-3">
              <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
                종합 추천
              </span>
              <p className="mt-1.5 text-[17px] text-designer-ink leading-relaxed">{recommendation}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
