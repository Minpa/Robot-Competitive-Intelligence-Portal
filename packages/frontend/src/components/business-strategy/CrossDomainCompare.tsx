'use client';

import { useState } from 'react';
import { Panel, Kicker, InsightBox } from '@/components/ui';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  Cell,
} from 'recharts';
import { CROSS_DOMAIN_COMPARE } from './data';

const DOMAIN_COLORS: Record<string, string> = {
  '산업': '#B8892B', // gold
  '물류': '#1F4A7A', // info
  '가정': '#2F7D5A', // pos
  '상업': '#B0452A', // neg
};

export default function CrossDomainCompare() {
  const [selectedConcept, setSelectedConcept] = useState(CROSS_DOMAIN_COMPARE[0].taskConcept);
  const selected = CROSS_DOMAIN_COMPARE.find((c) => c.taskConcept === selectedConcept)!;

  // Build scatter data: x = domain order (1,2,3,4), y = score10, size = score10
  const domainOrder: Record<string, number> = { '산업': 1, '물류': 2, '가정': 3, '상업': 4 };
  const scatterData = selected.rows.map((r) => ({
    x: domainOrder[r.domain],
    y: r.score10,
    domain: r.domain,
    task: r.task,
    grade: r.lgGradeMax,
    color: DOMAIN_COLORS[r.domain],
  }));

  return (
    <section id="compare" className="scroll-mt-24">
      <Panel
        kicker="Cross-Domain Comparison"
        title="도메인 간 유사 Task 비교"
        subtitle="같은 개념의 작업이라도 환경·요구가 달라 별도 평가가 맞음. Task 자체는 도메인별 독립 정의 (중복 허용), 셀 데이터는 도메인별 별도 관리"
      >
        {/* Concept selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CROSS_DOMAIN_COMPARE.map((c) => (
            <button
              key={c.taskConcept}
              onClick={() => setSelectedConcept(c.taskConcept)}
              className={`px-3 py-1.5 text-[12px] font-medium border transition-colors ${
                c.taskConcept === selectedConcept
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink-700 border-ink-200 hover:border-gold hover:text-gold'
              }`}
            >
              {c.taskConcept}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart */}
          <div className="lg:col-span-7">
            <Kicker>Score Distribution · 10pt scale</Kicker>
            <h4 className="font-serif text-[14px] font-semibold text-ink-900 mt-1.5 mb-4">
              "{selected.taskConcept}" — 도메인별 10점 환산 점수
            </h4>
            <div className="h-[320px] border border-ink-200 bg-paper p-4">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid stroke="#EDEFF3" vertical={false} />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[0.5, 4.5]}
                    ticks={[1, 2, 3, 4]}
                    tickFormatter={(v) => ['', '산업', '물류', '가정', '상업'][v]}
                    stroke="#5A6475"
                    tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#5A6475' }}
                    axisLine={{ stroke: '#D9DDE4' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[0, 10]}
                    ticks={[0, 2, 4, 6, 8, 10]}
                    stroke="#5A6475"
                    tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#5A6475' }}
                    axisLine={{ stroke: '#D9DDE4' }}
                    label={{
                      value: '10점 환산 점수',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 10, fontFamily: 'monospace', fill: '#818A9B' },
                    }}
                  />
                  <ZAxis type="number" dataKey="y" range={[300, 1200]} />
                  <Tooltip
                    cursor={{ stroke: '#B8892B', strokeWidth: 1, strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white border border-ink-300 shadow-report-lg p-3 text-[11px]">
                          <p className="font-mono text-[9px] text-ink-400 uppercase tracking-[0.18em]">
                            {d.domain}
                          </p>
                          <p className="font-serif text-[13px] font-semibold text-ink-900 mt-1">
                            {d.task}
                          </p>
                          <div className="mt-2 pt-2 border-t border-ink-100 flex items-center gap-3">
                            <span className="text-ink-500">최고 등급</span>
                            <span className="font-bold text-gold">{d.grade}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-ink-500">10점 환산</span>
                            <span className="font-bold text-ink-900">{d.y}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke={entry.color} strokeWidth={2} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {Object.entries(DOMAIN_COLORS).map(([name, color]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span className="w-3 h-3" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[10px] text-ink-500 uppercase tracking-[0.14em]">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Side: comparison table + insight */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <Kicker>Side by Side</Kicker>
              <div className="mt-2 border border-ink-200">
                <table className="w-full text-[11.5px]">
                  <thead className="bg-ink-50">
                    <tr>
                      <th className="font-mono text-[9px] font-medium text-ink-500 uppercase tracking-[0.14em] text-left px-3 py-2 border-b border-ink-200">
                        Domain
                      </th>
                      <th className="font-mono text-[9px] font-medium text-ink-500 uppercase tracking-[0.14em] text-left px-3 py-2 border-b border-ink-200">
                        Task
                      </th>
                      <th className="font-mono text-[9px] font-medium text-ink-500 uppercase tracking-[0.14em] text-center px-2 py-2 border-b border-ink-200">
                        Grade
                      </th>
                      <th className="font-mono text-[9px] font-medium text-ink-500 uppercase tracking-[0.14em] text-right px-3 py-2 border-b border-ink-200">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows.map((r) => (
                      <tr key={r.domain} className="border-b border-ink-100 last:border-0">
                        <td className="px-3 py-2 flex items-center gap-2">
                          <span
                            className="w-1.5 h-3"
                            style={{ backgroundColor: DOMAIN_COLORS[r.domain] }}
                          />
                          <span className="text-ink-900 font-medium">{r.domain}</span>
                        </td>
                        <td className="px-3 py-2 text-ink-700">{r.task}</td>
                        <td className="px-2 py-2 text-center font-bold text-gold">
                          {r.lgGradeMax}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-ink-900">
                          {r.score10 === 0 ? '—' : r.score10.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <InsightBox label="Why Separate" tone="gold" title="같은 개념·다른 매트릭스">
              <p>
                "{selected.taskConcept}"은 도메인별로 환경과 요구가 달라 동일 척도로 평가하지
                않습니다. 산업 ⑧ Tote 이송은 15kg·정형 환경, 물류 라스트마일은 옥외·차량
                연계, 가정 정리는 비정형 옥내, 상업 응대는 대인 인터랙션이 핵심입니다.
              </p>
              <p>
                <strong>Task는 도메인별 독립 정의 (중복 허용)</strong>, 셀 데이터는
                도메인별 별도 관리 — 비교는 가능하되 합산은 하지 않습니다.
              </p>
            </InsightBox>
          </div>
        </div>
      </Panel>
    </section>
  );
}
