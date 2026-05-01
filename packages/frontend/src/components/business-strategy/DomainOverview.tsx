'use client';

import { Panel, KpiTile, Tag, Kicker } from '@/components/ui';
import { DOMAINS } from './data';

const TOTAL_CELLS_TARGET_PER_DOMAIN = 576;

export default function DomainOverview() {
  const totalFilled  = DOMAINS.reduce((s, d) => s + d.cellsFilled, 0);
  const targetTotal  = TOTAL_CELLS_TARGET_PER_DOMAIN * 4;
  const fillRatePct  = Math.round((totalFilled / targetTotal) * 1000) / 10;
  const activeCount  = DOMAINS.filter((d) => d.status === 'ACTIVE').length;

  return (
    <section id="overview" className="scroll-mt-24 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiTile
          label="Total Domains"
          value="4"
          unit="DOMAINS"
          context="Industrial · Commercial · Residential · Logistics"
        />
        <KpiTile
          label="Active / Planned"
          value={`${activeCount} / ${4 - activeCount}`}
          unit="STATUS"
          context="산업 ACTIVE — 나머지 PLANNED"
        />
        <KpiTile
          label="Cells Filled"
          value={totalFilled.toLocaleString()}
          unit={`/ ${targetTotal.toLocaleString()}`}
          context={`전체 채움율 ${fillRatePct}%`}
        />
        <KpiTile
          label="Coverage Goal"
          value="2028"
          unit="H1"
          context="Phase 4 완료 시점 — 4도메인 통합"
        />
      </div>

      <Panel
        kicker="Domain Status Map"
        title="4개 도메인 진행 현황"
        subtitle="단일 매트릭스 구조 (Task × Sector × Level 4Lv) 위에 도메인 차원만 추가 — 점수 산출 로직과 등급 체계는 4도메인 동일"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {DOMAINS.map((d) => {
            const fillRate = d.cellsTotal === 0 ? 0 : (d.cellsFilled / d.cellsTotal) * 100;
            const isActive = d.status === 'ACTIVE';
            return (
              <div
                key={d.id}
                className={`relative border ${
                  isActive
                    ? 'border-gold bg-gold-soft/30'
                    : 'border-ink-200 bg-ink-50'
                } p-5 flex flex-col gap-3`}
              >
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-gold" />
                )}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Kicker tone={isActive ? 'gold' : 'default'}>
                      DOMAIN {d.id.toString().padStart(2, '0')}
                    </Kicker>
                    <h3 className="font-serif text-[20px] font-semibold text-ink-900 mt-1 leading-tight">
                      {d.nameKr}
                    </h3>
                    <p className="font-mono text-[10px] text-ink-400 uppercase tracking-[0.18em] mt-0.5">
                      {d.nameEn}
                    </p>
                  </div>
                  <Tag tone={isActive ? 'gold' : 'neutral'} dot size="sm">
                    {d.status}
                  </Tag>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ink-100">
                  <div>
                    <p className="font-mono text-[9px] text-ink-400 uppercase tracking-[0.2em]">Tasks</p>
                    <p className="font-serif text-[18px] font-semibold text-ink-900 mt-0.5">
                      {d.taskCount || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] text-ink-400 uppercase tracking-[0.2em]">Sectors</p>
                    <p className="font-serif text-[18px] font-semibold text-ink-900 mt-0.5">
                      {d.sectorCount || '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[9px] text-ink-400 uppercase tracking-[0.2em]">
                      Cells Filled
                    </span>
                    <span className="font-mono text-[10px] font-medium text-ink-700">
                      {d.cellsFilled} / {d.cellsTotal || TOTAL_CELLS_TARGET_PER_DOMAIN}
                    </span>
                  </div>
                  <div className="h-1.5 bg-ink-100 relative">
                    <div
                      className={`absolute inset-y-0 left-0 ${isActive ? 'bg-gold' : 'bg-ink-300'}`}
                      style={{ width: `${fillRate}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11.5px] text-ink-500 leading-relaxed pt-1">
                  {d.tagline}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}
