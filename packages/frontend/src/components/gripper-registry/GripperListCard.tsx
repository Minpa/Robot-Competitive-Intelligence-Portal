'use client';

import { GripperIllustration } from './GripperIllustration';
import type { AppliedProcess, GripperCategory } from './data';

interface Props {
  category: GripperCategory;
  processes: AppliedProcess[];
}

const SECTOR_COLOR: Record<string, { bg: string; text: string }> = {
  물류: { bg: 'bg-emerald-500/10', text: 'text-emerald-700' },
  배터리: { bg: 'bg-amber-500/10', text: 'text-amber-700' },
  전자가전: { bg: 'bg-sky-500/10', text: 'text-sky-700' },
  조선: { bg: 'bg-slate-500/15', text: 'text-slate-700' },
  자동차BCG: { bg: 'bg-rose-500/10', text: 'text-rose-700' },
};

const LV_COLOR: Record<number, string> = {
  1: 'bg-ink-100 text-ink-700',
  2: 'bg-info-soft/60 text-info',
  3: 'bg-amber-500/15 text-amber-700',
  4: 'bg-rose-500/15 text-rose-700',
};

export function GripperListCard({ category, processes }: Props) {
  // 산업별 그룹핑
  const bySector = new Map<string, AppliedProcess[]>();
  for (const p of processes) {
    const arr = bySector.get(p.sectorName) || [];
    arr.push(p);
    bySector.set(p.sectorName, arr);
  }

  return (
    <div className="bg-white rounded-xl border border-ink-200 hover:border-info/40 transition-all hover:shadow-report-lg overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-0">
        {/* Illustration */}
        <div className="bg-[#FAFAF8] border-b md:border-b-0 md:border-r border-ink-100 aspect-[5/4] md:aspect-auto md:min-h-[220px] flex items-center justify-center">
          <GripperIllustration gripperKey={category.key} />
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[17px] font-semibold text-ink-900 leading-tight">{category.nameKr}</h3>
                <p className="font-mono text-[10.5px] text-ink-500 uppercase tracking-[0.16em] mt-0.5">
                  {category.nameEn}
                </p>
              </div>
              <span
                className="px-2.5 py-1 text-[11px] font-medium rounded shrink-0 text-white"
                style={{ backgroundColor: category.accent }}
              >
                {processes.length}개 공정
              </span>
            </div>
            <p className="text-[13px] text-ink-700 mt-2 leading-snug">{category.tagline}</p>
            <p className="text-[12px] text-ink-500 mt-1.5 leading-relaxed">{category.description}</p>
          </div>

          {/* Examples */}
          <div>
            <p className="font-mono text-[9.5px] text-ink-500 uppercase tracking-[0.18em] mb-1.5">대표 제품</p>
            <div className="flex flex-wrap gap-1.5">
              {category.examples.map((ex) => (
                <span
                  key={ex}
                  className="inline-flex items-center px-2 py-0.5 border border-ink-200 bg-white text-[11.5px] text-ink-700 rounded"
                >
                  {ex}
                </span>
              ))}
            </div>
          </div>

          {/* Applied processes — grouped by sector */}
          <div>
            <p className="font-mono text-[9.5px] text-ink-500 uppercase tracking-[0.18em] mb-2">
              적용 공정 ({processes.length})
            </p>
            <div className="space-y-1.5">
              {Array.from(bySector.entries()).map(([sector, arr]) => {
                const sectorColor = SECTOR_COLOR[sector] || { bg: 'bg-ink-100', text: 'text-ink-700' };
                return (
                  <div key={sector} className="flex items-start gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded ${sectorColor.bg} ${sectorColor.text} shrink-0`}
                    >
                      {sector}
                    </span>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {arr.map((p) => (
                        <span
                          key={`${p.cellId}-${p.lv}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded ${LV_COLOR[p.lv]}`}
                          title={p.detail}
                        >
                          <span className="font-mono text-[10px] opacity-70">Lv{p.lv}</span>
                          <span>{p.cellTaskName}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
