'use client';

import type { Partner } from '@/types/war-room';

interface Props {
  partners: Partner[];
  isLoading: boolean;
}

export function PartnerCompareTable({ partners, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-white border border-ink-100 p-4">
        <div className="h-5 w-36 bg-ink-100 rounded animate-pulse mb-4" />
        <div className="h-48 bg-ink-100 rounded animate-pulse" />
      </div>
    );
  }

  // Show top partners by techCapability for comparison
  const sorted = [...partners]
    .filter((p) => p.techCapability != null)
    .sort((a, b) => (b.techCapability ?? 0) - (a.techCapability ?? 0))
    .slice(0, 10);

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg bg-white border border-ink-100 p-4">
        <h3 className="text-sm font-semibold text-ink-900 mb-4">파트너 비교</h3>
        <p className="text-xs text-ink-500 text-center py-4">비교 데이터 없음</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white border border-ink-100 p-4">
      <h3 className="text-sm font-semibold text-ink-900 mb-4">파트너 비교 (Top 10)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink-200">
              <th className="text-left text-ink-500 pb-2 pr-3 font-medium">파트너</th>
              <th className="text-left text-ink-500 pb-2 pr-3 font-medium">카테고리</th>
              <th className="text-center text-ink-500 pb-2 px-2 font-medium">기술력</th>
              <th className="text-center text-ink-500 pb-2 px-2 font-medium">LG 호환</th>
              <th className="text-center text-ink-500 pb-2 px-2 font-medium">점유율</th>
              <th className="text-left text-ink-500 pb-2 font-medium">국가</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className="border-b border-ink-200">
                <td className="text-ink-900 py-2 pr-3 font-medium">{p.name}</td>
                <td className="text-ink-500 py-2 pr-3">{p.subCategory ?? p.category}</td>
                <td className="text-center py-2 px-2">
                  <ScoreCell value={p.techCapability} />
                </td>
                <td className="text-center py-2 px-2">
                  <ScoreCell value={p.lgCompatibility} />
                </td>
                <td className="text-center text-ink-500 py-2 px-2">
                  {p.marketShare != null ? `${p.marketShare}%` : '—'}
                </td>
                <td className="text-ink-500 py-2">{p.country ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  if (value == null) return <span className="text-ink-400">—</span>;
  const color =
    value >= 8 ? 'text-green-400' : value >= 5 ? 'text-yellow-400' : 'text-red-400';
  return <span className={color}>{value}</span>;
}
