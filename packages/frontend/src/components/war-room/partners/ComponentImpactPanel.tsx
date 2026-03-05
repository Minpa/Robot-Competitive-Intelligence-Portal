'use client';

import type { Partner } from '@/types/war-room';

interface Props {
  partners: Partner[];
  isLoading: boolean;
}

const subCategoryLabel: Record<string, string> = {
  vision_sensor: '비전 센서',
  battery: '배터리',
  ai_chip: 'AI 칩',
  actuator: '액추에이터',
  motor: '모터',
  reducer: '감속기',
  force_sensor: '힘/토크 센서',
};

export function ComponentImpactPanel({ partners, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-4">
        <div className="h-5 w-40 bg-slate-700 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-800/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Group component partners by sub_category and compute avg scores
  const componentPartners = partners.filter((p) => p.category === 'component' && p.subCategory);
  const grouped = new Map<string, { count: number; avgTech: number; avgCompat: number }>();

  for (const p of componentPartners) {
    const key = p.subCategory!;
    const existing = grouped.get(key) ?? { count: 0, avgTech: 0, avgCompat: 0 };
    existing.count += 1;
    existing.avgTech += p.techCapability ?? 0;
    existing.avgCompat += p.lgCompatibility ?? 0;
    grouped.set(key, existing);
  }

  const rows = Array.from(grouped.entries())
    .map(([sub, v]) => ({
      sub,
      label: subCategoryLabel[sub] ?? sub,
      count: v.count,
      avgTech: v.count > 0 ? v.avgTech / v.count : 0,
      avgCompat: v.count > 0 ? v.avgCompat / v.count : 0,
    }))
    .sort((a, b) => b.avgCompat - a.avgCompat);

  return (
    <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">부품 영향도 분석</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-4">부품 파트너 데이터 없음</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.sub} className="flex items-center gap-3">
              <span className="text-xs text-slate-300 w-20 shrink-0">{r.label}</span>
              <div className="flex-1 h-4 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500/70 rounded-full"
                  style={{ width: `${(r.avgCompat / 10) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-16 text-right">
                호환 {r.avgCompat.toFixed(1)}
              </span>
              <span className="text-xs text-slate-500 w-10 text-right">{r.count}개</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
