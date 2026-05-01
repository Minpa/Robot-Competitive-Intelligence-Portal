'use client';

import { Panel, Kicker } from '@/components/ui';
import { COMMON_VS_DIFFERENT } from './data';

export default function CommonVsDifferent() {
  const commonRows = COMMON_VS_DIFFERENT.filter((r) => r.common);
  const diffRows   = COMMON_VS_DIFFERENT.filter((r) => r.diff);

  return (
    <section id="common-diff" className="scroll-mt-24">
      <Panel
        kicker="Common vs Different"
        title="도메인 간 공통 요소 vs 도메인별 차이"
        subtitle="구조·로직은 4도메인 공유 → 한 번 만든 시스템이 4배로 확장. Task·Sector·로봇 형태는 도메인별 정의 → 도메인 특수성 보존"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Common */}
          <div className="border border-pos-soft bg-pos-soft/30 p-5 relative">
            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-pos" />
            <div className="pl-2">
              <Kicker tone="pos">Shared Across All Domains</Kicker>
              <h4 className="font-serif text-[16px] font-semibold text-ink-900 mt-1.5">
                4도메인 공통 ({commonRows.length}개 항목)
              </h4>
              <p className="text-[11.5px] text-ink-600 mt-1.5 mb-4 leading-relaxed">
                구조·로직·코드 시스템은 공유 — 도메인 추가 시 기반 재설계 불필요
              </p>
              <ul className="space-y-2.5">
                {commonRows.map((r) => (
                  <li key={r.topic} className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-4 h-4 bg-pos text-white flex items-center justify-center font-bold shrink-0 text-[10px]">
                      ✓
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-ink-900">{r.topic}</p>
                      {r.detail && (
                        <p className="text-[11px] text-ink-500 leading-relaxed mt-0.5">
                          {r.detail}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Different */}
          <div className="border border-warn-soft bg-warn-soft/30 p-5 relative">
            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-warn" />
            <div className="pl-2">
              <Kicker tone="warn">Per-Domain Specifics</Kicker>
              <h4 className="font-serif text-[16px] font-semibold text-ink-900 mt-1.5">
                도메인별 정의 ({diffRows.length}개 항목)
              </h4>
              <p className="text-[11.5px] text-ink-600 mt-1.5 mb-4 leading-relaxed">
                도메인 특수성 보존 — 같은 개념의 Task라도 별도 평가
              </p>
              <ul className="space-y-2.5">
                {diffRows.map((r) => (
                  <li key={r.topic} className="flex items-start gap-2.5">
                    <span className="mt-0.5 w-4 h-4 border-2 border-warn text-warn flex items-center justify-center font-bold shrink-0 text-[10px]">
                      ◇
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-ink-900">{r.topic}</p>
                      {r.detail && (
                        <p className="text-[11px] text-ink-500 leading-relaxed mt-0.5">
                          {r.detail}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Panel>
    </section>
  );
}
