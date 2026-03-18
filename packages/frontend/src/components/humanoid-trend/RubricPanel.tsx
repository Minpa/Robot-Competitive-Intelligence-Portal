'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, BookOpen, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

// ── Types ──

interface RubricFactor {
  factorName: string;
  factorKey: string;
  dataSource: string;
  scoreRange: string;
  formula: string;
}

interface PositioningRubric {
  chartType: string;
  chartName: string;
  xAxis: { label: string; source: string };
  yAxis: { label: string; source: string };
  bubbleSize: { label: string; source: string };
  colorGroup?: { label: string; source: string };
}

type RubricType = 'poc' | 'rfm' | 'positioning';

interface RubricPanelProps {
  type: RubricType;
}

// ── Hooks ──

function useRubricData(type: RubricType, enabled: boolean) {
  return useQuery({
    queryKey: ['scoring-rubric', type],
    queryFn: () => {
      if (type === 'poc') return api.getScoringRubricPoc();
      if (type === 'rfm') return api.getScoringRubricRfm();
      return api.getScoringRubricPositioning();
    },
    enabled,
    staleTime: 600_000, // 10분 — 루브릭은 자주 변하지 않음
  });
}

// ── Sub-components ──

const TITLES: Record<RubricType, string> = {
  poc: 'PoC 평가 기준 (6-Factor, 1–10)',
  rfm: 'RFM 평가 기준 (6-Factor, 1–5)',
  positioning: '포지셔닝 차트 축 매핑 정의',
};

function FactorTable({ factors }: { factors: RubricFactor[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-2 px-3 font-semibold text-slate-300">팩터명</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-300">데이터 소스</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-300">점수 구간</th>
            <th className="text-left py-2 px-3 font-semibold text-slate-300">계산 공식</th>
          </tr>
        </thead>
        <tbody>
          {factors.map((f) => (
            <tr key={f.factorKey} className="border-b border-slate-800 hover:bg-slate-800/50">
              <td className="py-2.5 px-3 font-medium text-slate-300 whitespace-nowrap">{f.factorName}</td>
              <td className="py-2.5 px-3 text-slate-400 font-mono text-xs">{f.dataSource}</td>
              <td className="py-2.5 px-3 text-slate-400">{f.scoreRange}</td>
              <td className="py-2.5 px-3 text-slate-400">{f.formula}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PositioningTable({ charts }: { charts: PositioningRubric[] }) {
  return (
    <div className="space-y-4">
      {charts.map((chart) => (
        <div key={chart.chartType} className="rounded-lg border border-slate-700 p-4">
          <h4 className="font-semibold text-slate-300 mb-3">{chart.chartName}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-400">X축:</span>{' '}
              <span className="font-medium text-slate-300">{chart.xAxis.label}</span>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{chart.xAxis.source}</p>
            </div>
            <div>
              <span className="text-slate-400">Y축:</span>{' '}
              <span className="font-medium text-slate-300">{chart.yAxis.label}</span>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{chart.yAxis.source}</p>
            </div>
            <div>
              <span className="text-slate-400">버블 크기:</span>{' '}
              <span className="font-medium text-slate-300">{chart.bubbleSize.label}</span>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{chart.bubbleSize.source}</p>
            </div>
            {chart.colorGroup && (
              <div>
                <span className="text-slate-400">색상 그룹:</span>{' '}
                <span className="font-medium text-slate-300">{chart.colorGroup.label}</span>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{chart.colorGroup.source}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ──

export default function RubricPanel({ type }: RubricPanelProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useRubricData(type, open);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        평가 기준 보기
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

          {/* Modal */}
          <div className="relative w-full max-w-3xl max-h-[80vh] mx-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="text-base font-bold text-slate-200">
                {TITLES[type]}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-64px)]">
              {isLoading && (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  로딩 중...
                </div>
              )}

              {error && (
                <div className="text-center py-12 text-red-400 text-sm">
                  루브릭 데이터를 불러오지 못했습니다.
                </div>
              )}

              {!isLoading && !error && data && (
                type === 'positioning'
                  ? <PositioningTable charts={data as PositioningRubric[]} />
                  : <FactorTable factors={data as RubricFactor[]} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
