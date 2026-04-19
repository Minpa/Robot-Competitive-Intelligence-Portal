'use client';

import type { WhatIfResult } from '@/lib/war-room-calculator';

interface Props {
  before: WhatIfResult | null;
  after: WhatIfResult;
}

const FACTOR_LABELS: Record<string, string> = {
  payloadScore: '페이로드',
  operationTimeScore: '운용시간',
  fingerDofScore: '핸드DoF',
  formFactorScore: '폼팩터',
  pocDeploymentScore: 'PoC배포',
  costEfficiencyScore: '비용효율',
  generalityScore: '범용성',
  realWorldDataScore: '실환경데이터',
  edgeInferenceScore: '엣지추론',
  multiRobotCollabScore: '다중로봇협업',
  openSourceScore: '오픈소스',
  commercialMaturityScore: '상용화성숙도',
};

export function BeforeAfterGapTable({ before, after }: Props) {
  const allScores = { ...after.pocScores, ...after.rfmScores };
  const beforeScores = before ? { ...before.pocScores, ...before.rfmScores } : null;

  const rows = Object.entries(allScores).map(([key, afterVal]) => {
    const beforeVal = beforeScores?.[key] ?? 0;
    const diff = afterVal - beforeVal;
    return { key, label: FACTOR_LABELS[key] ?? key, before: beforeVal, after: afterVal, diff };
  });

  return (
    <div className="rounded-lg bg-white border border-ink-100 p-4">
      <h3 className="text-sm font-semibold text-ink-900 mb-3">Before vs After GAP</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink-200">
              <th className="text-left text-ink-500 pb-2 pr-3 font-medium">팩터</th>
              <th className="text-center text-ink-500 pb-2 px-2 font-medium">Before</th>
              <th className="text-center text-ink-500 pb-2 px-2 font-medium">After</th>
              <th className="text-center text-ink-500 pb-2 px-2 font-medium">변화</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-white">
                <td className="text-ink-700 py-1.5 pr-3">{r.label}</td>
                <td className="text-center text-ink-500 py-1.5 px-2">{r.before}</td>
                <td className="text-center text-ink-900 py-1.5 px-2 font-medium">{r.after}</td>
                <td className="text-center py-1.5 px-2">
                  <span
                    className={
                      r.diff > 0
                        ? 'text-green-400'
                        : r.diff < 0
                        ? 'text-red-400'
                        : 'text-ink-500'
                    }
                  >
                    {r.diff > 0 ? '+' : ''}{r.diff}
                  </span>
                </td>
              </tr>
            ))}
            {/* Totals */}
            <tr className="border-t border-ink-200">
              <td className="text-ink-900 py-2 pr-3 font-semibold">합계</td>
              <td className="text-center text-ink-700 py-2 px-2 font-medium">
                {before ? before.combinedScore : 0}
              </td>
              <td className="text-center text-ink-900 py-2 px-2 font-bold">{after.combinedScore}</td>
              <td className="text-center py-2 px-2">
                {(() => {
                  const d = after.combinedScore - (before?.combinedScore ?? 0);
                  return (
                    <span className={d > 0 ? 'text-green-400 font-bold' : d < 0 ? 'text-red-400 font-bold' : 'text-ink-500'}>
                      {d > 0 ? '+' : ''}{d}
                    </span>
                  );
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
