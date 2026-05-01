'use client';

import { Panel, Kicker, Tag } from '@/components/ui';
import { PHASES } from './data';

const TOTAL_MONTHS = 30; // 2026-01 ~ 2028-06
const QUARTER_LABELS = [
  '26 Q1', '26 Q2', '26 Q3', '26 Q4',
  '27 Q1', '27 Q2', '27 Q3', '27 Q4',
  '28 Q1', '28 Q2',
];

const COLOR_MAP: Record<string, { bar: string; soft: string; text: string }> = {
  gold: { bar: 'bg-gold',  soft: 'bg-gold-soft',  text: 'text-gold'  },
  pos:  { bar: 'bg-pos',   soft: 'bg-pos-soft',   text: 'text-pos'   },
  info: { bar: 'bg-info',  soft: 'bg-info-soft',  text: 'text-info'  },
  neg:  { bar: 'bg-neg',   soft: 'bg-neg-soft',   text: 'text-neg'   },
};

export default function PhaseRoadmap() {
  return (
    <section id="roadmap" className="scroll-mt-24">
      <Panel
        kicker="Expansion Roadmap · 2026 — 2028"
        title="도메인 채움 우선순위 (4-Phase 로드맵)"
        subtitle="Phase 1 산업 완성 → Phase 2 가정 (LG 강점) → Phase 3 물류 (외부 데이터 풍부) → Phase 4 상업 (복잡도 高 마지막)"
      >
        {/* Quarter ticks header */}
        <div className="grid grid-cols-[180px_1fr] gap-3 mb-3">
          <div />
          <div className="grid grid-cols-10 border-b border-ink-200 pb-2">
            {QUARTER_LABELS.map((q) => (
              <span
                key={q}
                className="font-mono text-[9.5px] text-ink-400 uppercase tracking-[0.14em] text-center"
              >
                {q}
              </span>
            ))}
          </div>
        </div>

        {/* Gantt rows */}
        <div className="space-y-3">
          {PHASES.map((p) => {
            const c = COLOR_MAP[p.domainColor] || COLOR_MAP.gold;
            const leftPct = (p.startMonth / TOTAL_MONTHS) * 100;
            const widthPct = (p.duration / TOTAL_MONTHS) * 100;
            const doneCount = p.milestones.filter((m) => m.done).length;
            const progressPct = (doneCount / p.milestones.length) * 100;

            return (
              <div key={p.id} className="grid grid-cols-[180px_1fr] gap-3 items-center">
                {/* Phase label */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${c.text}`}>
                      {p.name}
                    </span>
                    {p.status === 'IN_PROGRESS' && (
                      <Tag tone="gold" size="sm" dot>LIVE</Tag>
                    )}
                  </div>
                  <p className="font-serif text-[13px] font-semibold text-ink-900 leading-tight">
                    {p.domain}
                  </p>
                  <p className="font-mono text-[9.5px] text-ink-400 mt-0.5">
                    {p.start} → {p.end}
                  </p>
                </div>

                {/* Bar track */}
                <div className="relative h-10 bg-ink-50 border border-ink-100">
                  {/* Quarter gridlines */}
                  <div className="absolute inset-0 grid grid-cols-10 pointer-events-none">
                    {QUARTER_LABELS.map((_, i) => (
                      <div
                        key={i}
                        className={`${i !== 0 ? 'border-l border-ink-100' : ''}`}
                      />
                    ))}
                  </div>

                  {/* Phase bar */}
                  <div
                    className={`absolute top-1.5 bottom-1.5 ${c.soft} border ${c.bar.replace('bg-', 'border-')} flex items-center px-2`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  >
                    {/* Progress fill */}
                    <div
                      className={`absolute inset-y-0 left-0 ${c.bar} opacity-70`}
                      style={{ width: `${progressPct}%` }}
                    />
                    <span className={`relative font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${
                      progressPct > 30 ? 'text-white' : c.text
                    }`}>
                      {doneCount}/{p.milestones.length} · {Math.round(progressPct)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Milestone detail cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-ink-200">
          {PHASES.map((p) => {
            const c = COLOR_MAP[p.domainColor] || COLOR_MAP.gold;
            return (
              <div key={p.id} className="border border-ink-200 bg-white p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 ${c.bar}`} />
                  <Kicker tone={p.domainColor as any}>{p.name}</Kicker>
                </div>
                <h5 className="font-serif text-[14px] font-semibold text-ink-900 leading-tight">
                  {p.domain}
                </h5>
                <ul className="space-y-1.5 flex-1">
                  {p.milestones.map((m) => (
                    <li key={m.label} className="flex items-start gap-2 text-[11.5px]">
                      <span
                        className={`mt-0.5 w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                          m.done
                            ? 'bg-pos text-white border-pos'
                            : 'bg-white border-ink-300 text-ink-300'
                        }`}
                      >
                        {m.done ? '✓' : ''}
                      </span>
                      <span className={m.done ? 'text-ink-700' : 'text-ink-500'}>
                        {m.label}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-ink-500 leading-relaxed pt-2 border-t border-ink-100 italic">
                  {p.rationale}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}
