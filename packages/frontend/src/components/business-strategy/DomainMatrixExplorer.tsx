'use client';

import { useState } from 'react';
import { Panel, Kicker } from '@/components/ui';
import { DOMAINS, DIFFICULTY_LEVELS, BARRIERS } from './data';

export default function DomainMatrixExplorer() {
  const [selectedId, setSelectedId] = useState(1);
  const selected = DOMAINS.find((d) => d.id === selectedId)!;

  const cellsByLevel = [
    { lv: 1, label: 'Lv1 평면·정형',     classes: 'bg-pos-soft text-pos border-pos-soft' },
    { lv: 2, label: 'Lv2 곡면·반정형',   classes: 'bg-warn-soft text-warn border-warn-soft' },
    { lv: 3, label: 'Lv3 비정형·동적',   classes: 'bg-neg-soft text-neg border-neg-soft' },
    { lv: 4, label: 'Lv4 비정형·제약多', classes: 'bg-brand text-white border-brand' },
  ];

  return (
    <section id="matrix" className="scroll-mt-24">
      <Panel
        kicker="Domain Matrix Architecture"
        title="단일 매트릭스 구조 — 도메인 차원 추가"
        subtitle="Task × Sector × Level (4Lv) 동일 구조에 domain_id 한 차원만 추가. Task·Sector 정의는 도메인별로 다르되, 셀 8개 정보 / 점수 산출 / 등급 체계는 4도메인 공유"
      >
        {/* Domain Tabs */}
        <div className="flex gap-2 mb-6 border-b border-ink-200 -mt-2">
          {DOMAINS.map((d) => {
            const active = d.id === selectedId;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'text-ink-900'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{d.nameKr}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      d.status === 'ACTIVE' ? 'bg-gold' : 'bg-ink-300'
                    }`}
                  />
                </span>
                {active && (
                  <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-gold" />
                )}
              </button>
            );
          })}
        </div>

        {/* Domain Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tasks */}
          <div className="lg:col-span-4">
            <Kicker>Tasks · {selected.tasks.length || '정의 필요'}</Kicker>
            <h4 className="font-serif text-[15px] font-semibold text-ink-900 mt-1.5 mb-3">
              {selected.nameKr} 도메인 작업 정의
            </h4>
            {selected.tasks.length > 0 ? (
              <ul className="border border-ink-200 bg-paper">
                {selected.tasks.map((t, i) => (
                  <li
                    key={t}
                    className={`flex items-center gap-3 px-3 py-2 text-[12.5px] text-ink-700 ${
                      i !== selected.tasks.length - 1 ? 'border-b border-ink-100' : ''
                    }`}
                  >
                    <span className="font-mono text-[10px] text-ink-400 w-6">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border border-dashed border-ink-300 bg-ink-50 px-4 py-8 text-center">
                <p className="text-[12px] text-ink-500">정의 예정 (Phase 진입 시)</p>
              </div>
            )}
          </div>

          {/* Sectors */}
          <div className="lg:col-span-4">
            <Kicker>Sectors · {selected.sectors.length || '정의 필요'}</Kicker>
            <h4 className="font-serif text-[15px] font-semibold text-ink-900 mt-1.5 mb-3">
              {selected.nameKr} 도메인 산업 분류
            </h4>
            {selected.sectors.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selected.sectors.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center px-2.5 py-1 border border-ink-200 bg-white text-[11.5px] text-ink-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-ink-300 bg-ink-50 px-4 py-8 text-center">
                <p className="text-[12px] text-ink-500">정의 예정 (Phase 진입 시)</p>
              </div>
            )}
            <div className="mt-4 border-l-2 border-ink-300 pl-3 py-1">
              <p className="text-[11.5px] text-ink-600 leading-relaxed">{selected.hint}</p>
            </div>
          </div>

          {/* 4Lv Difficulty Visual */}
          <div className="lg:col-span-4">
            <Kicker>4Lv Structure</Kicker>
            <h4 className="font-serif text-[15px] font-semibold text-ink-900 mt-1.5 mb-3">
              난이도 레벨 (4도메인 공통)
            </h4>
            <div className="space-y-2">
              {DIFFICULTY_LEVELS.map((lv, i) => (
                <div key={lv.level} className={`border ${cellsByLevel[i].classes} px-3 py-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]">
                      Lv {lv.level} · {lv.name}
                    </span>
                    <span className="font-mono text-[11px] font-bold">{lv.weight}</span>
                  </div>
                  <p className="text-[11px] mt-0.5 opacity-80">{lv.desc}</p>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-ink-400 mt-3 leading-relaxed">
              4Lv 합산 (최대 12점) → 10점 환산 — 단일 가이드 로직 4도메인 동일
            </p>
          </div>
        </div>

        {/* Matrix Grid Diagram */}
        <div className="mt-8 pt-6 border-t border-ink-200">
          <Kicker>Cell Structure · {selected.taskCount} × {selected.sectorCount} × 4Lv</Kicker>
          <h4 className="font-serif text-[14px] font-semibold text-ink-900 mt-1.5 mb-4">
            셀 구조 미리보기
          </h4>
          {selected.cellsFilled > 0 ? (
            <div className="border border-ink-200 bg-paper p-4">
              <MatrixHeatmap
                rows={selected.tasks.slice(0, 6)}
                cols={selected.sectors.slice(0, 6)}
              />
              <p className="font-mono text-[10px] text-ink-400 mt-3 text-center">
                — 상위 6×6 셀 미리보기 — 각 셀은 Lv1~4 4겹으로 구성, 8개 정보(점유율·등급·작업·장벽·풀이·로봇·그리퍼·태그) 보유
              </p>
            </div>
          ) : (
            <div className="border border-dashed border-ink-300 bg-ink-50 px-4 py-12 text-center">
              <p className="font-mono text-[10px] text-ink-400 uppercase tracking-[0.2em]">
                Cells Pending · 정의 단계 미시작
              </p>
              <div className="mt-4 inline-flex items-center gap-3 text-[11.5px] text-ink-600">
                <span className="px-2 py-0.5 bg-pos-soft text-pos">✓ Task 정의</span>
                <span className="px-2 py-0.5 bg-ink-100 text-ink-500">– Sector 정의</span>
                <span className="px-2 py-0.5 bg-ink-100 text-ink-500">– 셀 입력</span>
                <span className="px-2 py-0.5 bg-ink-100 text-ink-500">– 출처 검증</span>
              </div>
            </div>
          )}
        </div>

        {/* Barriers */}
        <div className="mt-8 pt-6 border-t border-ink-200">
          <Kicker>Entry Barriers · 8 codes</Kicker>
          <h4 className="font-serif text-[14px] font-semibold text-ink-900 mt-1.5 mb-4">
            진입 장벽 코드 (4도메인 공통 — 풀이 텍스트만 도메인별 차이)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {BARRIERS.map((b) => (
              <div key={b.code} className="border border-ink-200 bg-white p-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] font-bold text-gold tracking-[0.18em]">
                    {b.code}
                  </span>
                  <span className="font-mono text-[9px] text-ink-400 uppercase tracking-[0.16em]">
                    {b.nameEn}
                  </span>
                </div>
                <p className="font-serif text-[12.5px] font-semibold text-ink-900 mt-1">
                  {b.nameKr}
                </p>
                <p className="text-[10.5px] text-ink-500 leading-relaxed mt-1">
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </section>
  );
}

// ─── Mini heatmap (for ACTIVE domain) ───
function MatrixHeatmap({ rows, cols }: { rows: string[]; cols: string[] }) {
  // Pseudo intensity to suggest filled cells
  const intensity = (r: number, c: number) => {
    const v = ((r * 7 + c * 3) % 9) / 9;
    return v;
  };

  const cellColor = (v: number) => {
    if (v < 0.2) return 'bg-ink-100';
    if (v < 0.4) return 'bg-gold-soft';
    if (v < 0.6) return 'bg-gold/50';
    if (v < 0.8) return 'bg-gold';
    return 'bg-brand';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-32" />
            {cols.map((c) => (
              <th
                key={c}
                className="font-mono text-[9px] font-medium text-ink-400 uppercase tracking-[0.14em] px-1 pb-2 text-left"
              >
                <span className="block truncate" style={{ maxWidth: 64 }}>{c}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r}>
              <td className="font-mono text-[10px] text-ink-700 pr-2 py-0.5 text-right">
                <span className="block truncate" style={{ maxWidth: 124 }}>{r}</span>
              </td>
              {cols.map((c, ci) => {
                const v = intensity(ri, ci);
                return (
                  <td key={c} className="p-0.5">
                    <div className={`h-7 ${cellColor(v)} relative`}>
                      <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-medium text-white/90 mix-blend-difference">
                        {v >= 0.6 ? '★' : ''}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 mt-3 font-mono text-[9px] text-ink-400 uppercase tracking-[0.14em]">
        <span>Low</span>
        <span className="w-4 h-2 bg-ink-100" />
        <span className="w-4 h-2 bg-gold-soft" />
        <span className="w-4 h-2 bg-gold/50" />
        <span className="w-4 h-2 bg-gold" />
        <span className="w-4 h-2 bg-brand" />
        <span>High · LG 적합도</span>
      </div>
    </div>
  );
}
