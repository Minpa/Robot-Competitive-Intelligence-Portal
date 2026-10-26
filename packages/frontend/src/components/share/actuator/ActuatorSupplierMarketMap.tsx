'use client';

/**
 * 공급사 제품 맵 — 피크 토크(로그, 공유 Y) × 가격(로그, 우측 플롯). 가격 미공개 제품은 좌측 레인에 토크 높이로만 표시한다.
 *  점 색 = 시장 세그먼트(자사 전용은 속 빈 링), LG AXIUM 은 "직경 대응 제품의 토크 범위" 추정 밴드(가설)로 표시한다.
 *  레이아웃 계산은 actuator-market-layout.ts(순수 함수)에 있고 이 파일은 그리기·상호작용만 담당한다.
 *  컨트롤은 no-print. 색은 chartColors 토큰 + Tailwind ink 토큰만 사용한다.
 */

import { useMemo, useRef, useState } from 'react';
import type { ActuatorAdoptionCase, ActuatorSupplierProduct, MarketSegment } from '@/types/actuator-map';
import { SubCard } from '../timeline-shared';
import { SegmentSwatch } from './ActuatorSwatches';
import { fmtUSD, numText } from './actuator-map-layout';
import {
  SEGMENT_BASIS_LABEL,
  buildLgCallout,
  buildMarketLayout,
  defaultMarketOptions,
  fmtTorque,
  type MarketOptions,
  type MarketPoint,
} from './actuator-market-layout';
import { INK, SEGMENT_LABEL, SEGMENT_ORDER, WHITE } from './actuator-sourcing';

interface Props {
  suppliers: ActuatorSupplierProduct[];
  adoptions: ActuatorAdoptionCase[];
  segmentOrder?: MarketSegment[];
}

const CHK = 'inline-flex items-center gap-1.5 text-[12px] text-ink-700 cursor-pointer select-none';

interface TipState {
  point: MarketPoint;
  left: number;
  top: number;
}

export function ActuatorSupplierMarketMap({ suppliers, adoptions, segmentOrder = SEGMENT_ORDER }: Props) {
  const [opts, setOpts] = useState<MarketOptions>(defaultMarketOptions);
  const [tip, setTip] = useState<TipState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const layout = useMemo(() => buildMarketLayout(suppliers, adoptions, opts), [suppliers, adoptions, opts]);
  const callout = useMemo(() => buildLgCallout(suppliers, adoptions, segmentOrder), [suppliers, adoptions, segmentOrder]);
  const P = layout.plot;
  const L = layout.lane;
  const drawable = layout.counts.plotted + layout.counts.lane > 0 || layout.band != null || layout.bandNote != null;

  const toggle = (s: MarketSegment) => setOpts((o) => ({ ...o, segments: { ...o.segments, [s]: !o.segments[s] } }));

  const showTip = (p: MarketPoint) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const scale = box.width / layout.width;
    let left = p.px * scale + 16;
    let top = p.py * scale - 10;
    if (left + 300 > box.width) left = Math.max(0, p.px * scale - 306);
    if (top + 230 > box.height) top = Math.max(0, box.height - 240);
    if (top < 0) top = 0;
    setTip({ point: p, left, top });
  };

  return (
    <SubCard title={layout.title} description={layout.meta}>
      {!drawable ? (
        <div className="py-8 text-center text-[13px] text-ink-400">표시할 공급사 제품이 없습니다.</div>
      ) : (
        <>
          <div className="no-print flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-ink-200 bg-ink-50 px-3 py-2">
            <span className="text-[11px] text-ink-500">시장 세그먼트</span>
            {segmentOrder.map((s) => (
              <label key={s} className={CHK}>
                <input type="checkbox" checked={opts.segments[s] !== false} onChange={() => toggle(s)} className="accent-brand" />
                <SegmentSwatch segment={s} />
                {SEGMENT_LABEL[s]} {layout.segmentCounts[s] ?? 0}
              </label>
            ))}
            <span className="text-[11px] text-ink-500">표시 {layout.counts.visible}개 / 전체 {layout.counts.total}개</span>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <div className="relative min-w-[760px] print:min-w-0">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                className="w-full h-auto block"
                role="img"
                aria-label={`${layout.title} 산점도 — ${layout.meta}`}
                onPointerLeave={() => setTip(null)}
              >
                {/* 격자·축 */}
                <g>
                  {layout.yTicks.map((t) => (
                    <g key={`y${t.label}`}>
                      <line x1={L.x} x2={P.x + P.w} y1={t.y} y2={t.y} className="stroke-ink-100" strokeWidth={1} />
                      <text x={L.x - 8} y={t.y + 4} textAnchor="end" fontSize={11} className="fill-ink-500">
                        {t.label}
                      </text>
                    </g>
                  ))}
                  {layout.xTicks.map((t) => (
                    <g key={`x${t.label}`}>
                      <line x1={t.x} x2={t.x} y1={P.y} y2={P.y + P.h} className="stroke-ink-100" strokeWidth={1} />
                      <text x={t.x} y={P.y + P.h + 18} textAnchor="middle" fontSize={11} className="fill-ink-500">
                        {t.label}
                      </text>
                    </g>
                  ))}
                  <line x1={L.x} x2={P.x + P.w} y1={P.y + P.h} y2={P.y + P.h} className="stroke-ink-300" strokeWidth={1} />
                  <line x1={L.x} x2={L.x} y1={P.y} y2={P.y + P.h} className="stroke-ink-300" strokeWidth={1} />
                  {/* 레인-플롯 경계 */}
                  <line x1={P.x - 11} x2={P.x - 11} y1={P.y - 8} y2={P.y + P.h} className="stroke-ink-400" strokeWidth={1} strokeDasharray="4 4" />
                  <text x={L.x} y={P.y - 14} fontSize={11.5} fontWeight={600} className="fill-ink-600">
                    {layout.laneTitle}
                  </text>
                  <text x={P.x} y={P.y - 14} fontSize={11.5} fontWeight={600} className="fill-ink-600">
                    {layout.plotTitle}
                  </text>
                  <text x={P.x + P.w / 2} y={layout.height - 16} textAnchor="middle" fontSize={12} className="fill-ink-600">
                    {layout.xAxisTitle}
                  </text>
                  <text x={14} y={P.y + P.h / 2} textAnchor="middle" fontSize={12} className="fill-ink-600" transform={`rotate(-90 14 ${P.y + P.h / 2})`}>
                    {layout.yAxisTitle}
                  </text>
                </g>

                {/* 빈 구간 주석 (가설) */}
                {layout.gap && (
                  <g>
                    <rect
                      x={layout.gap.x1}
                      y={layout.gap.y1}
                      width={layout.gap.x2 - layout.gap.x1}
                      height={layout.gap.y2 - layout.gap.y1}
                      fill="none"
                      className="stroke-ink-400"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <text textAnchor="middle" fontSize={10.5} className="fill-ink-600">
                      {layout.gap.lines.map((line, i) => (
                        <tspan key={i} x={layout.gap!.labelX} y={layout.gap!.labelY + i * 13} fontWeight={i === 0 ? 600 : 400}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                )}

                {/* LG AXIUM 추정 밴드 — 점·라벨 아래 레이어 */}
                {layout.band && (
                  <rect
                    x={layout.band.x1}
                    y={layout.band.y1}
                    width={layout.band.x2 - layout.band.x1}
                    height={layout.band.y2 - layout.band.y1}
                    fillOpacity={0.07}
                    className="fill-ink-900 stroke-ink-900"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                  >
                    <title>{layout.band.labelLines.join(' ')}</title>
                  </rect>
                )}

                {/* 점 + 라벨 */}
                <g>
                  {layout.points.map((p, i) => {
                    const active = tip?.point === p;
                    return (
                      <g
                        key={`${p.supplier.vendor}-${p.supplier.model}-${i}`}
                        tabIndex={0}
                        role="img"
                        aria-label={p.ariaLabel}
                        className="outline-none cursor-default"
                        onPointerMove={() => showTip(p)}
                        onFocus={() => showTip(p)}
                        onBlur={() => setTip(null)}
                      >
                        <circle cx={p.px} cy={p.py} r={12} fill="transparent" />
                        {p.label.leader && (
                          <polyline points={p.label.leader.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ')} fill="none" className="stroke-ink-300" strokeWidth={1} />
                        )}
                        <circle cx={p.px} cy={p.py} r={active ? 8 : 7} fill={WHITE} />
                        {p.hollow ? (
                          <circle cx={p.px} cy={p.py} r={4.25} fill={WHITE} stroke={p.color} strokeWidth={1.75} />
                        ) : (
                          <circle cx={p.px} cy={p.py} r={5} fill={p.color} />
                        )}
                        <text
                          x={p.label.x}
                          y={p.label.y}
                          textAnchor={p.label.anchor}
                          fontSize={10.5}
                          className="fill-ink-900 stroke-white"
                          strokeWidth={3}
                          strokeLinejoin="round"
                          style={{ paintOrder: 'stroke' }}
                        >
                          {p.label.text}
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* 밴드 라벨 · 표시 불가 안내 */}
                {layout.band && (
                  <text textAnchor="end" fontSize={10.5} className="fill-ink-900 stroke-white" strokeWidth={3} strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>
                    {layout.band.labelLines.map((line, i) => (
                      <tspan key={i} x={layout.band!.labelX} y={layout.band!.labelY + i * 13} fontWeight={i === 0 ? 700 : 400}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}
                {layout.bandNote && (
                  <text x={layout.bandNote.x} y={layout.bandNote.y} textAnchor="end" fontSize={10.5} className="fill-ink-600">
                    {layout.bandNote.text}
                  </text>
                )}
              </svg>

              {tip && <SupplierTip tip={tip} />}
            </div>
          </div>

          {/* 범례 */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {segmentOrder.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
                <SegmentSwatch segment={s} />
                {SEGMENT_LABEL[s]} {layout.segmentCounts[s] ?? 0}
              </span>
            ))}
            {layout.lg && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
                <span aria-hidden className="inline-block w-[18px] h-2.5 border border-dashed bg-ink-900/[0.07]" style={{ borderColor: INK[900] }} />
                LG AXIUM 추정 밴드(가설)
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
              <span aria-hidden className="inline-block w-[18px] h-2.5 border border-dashed" style={{ borderColor: INK[400] }} />
              점선 사각형 = 가설 구간
            </span>
          </div>
          <p className="text-[11px] text-ink-500">
            점 색은 시장 세그먼트이며 조달 태세 색과 의미가 다릅니다. 세그먼트는 공급사 기재 타깃 시장과 키워드 규칙으로 분류했고, 자사 전용(계열 포함)은 속 빈 링으로 표시합니다.
          </p>

          {layout.excludedNoTorque.length > 0 && (
            <p className="text-[11.5px] text-ink-600 leading-relaxed">
              토크 미공개 {layout.excludedNoTorque.length}개는 그래프에서 제외: {layout.excludedNoTorque.map((e) => e.label).join(', ')}
            </p>
          )}
          {callout.length > 0 && (
            <div className="rounded-[10px] border border-ink-200 bg-ink-50 px-3 py-2 flex flex-col gap-1">
              {callout.map((line, i) => (
                <p key={i} className="text-[12px] text-ink-800 leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </SubCard>
  );
}

function SupplierTip({ tip }: { tip: TipState }) {
  const s = tip.point.supplier;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute z-10 min-w-[200px] max-w-[300px] rounded-[8px] border border-ink-200 bg-white px-3 py-2 text-[12px] text-ink-800 shadow-report-lg"
      style={{ left: tip.left, top: tip.top }}
    >
      <p className="text-[14px] font-semibold text-ink-900">{s.vendor}</p>
      <p className="text-ink-600 break-words">{s.model}</p>
      <Row k="타입" v={s.type} />
      <Row k="피크·연속 토크" v={`${fmtTorque(s.peakTorqueNm)} · ${fmtTorque(s.continuousTorqueNm)}`} />
      <Row k="무게 · 직경" v={`${numText(s.weightKg, ' kg')} · ${numText(s.diameterMm, ' mm')}`} />
      <Row k="가격" v={s.priceUsd == null ? '미공개' : fmtUSD(s.priceUsd)} />
      <Row k="상태" v={s.status ?? '—'} />
      <Row k="세그먼트" v={`${SEGMENT_LABEL[s.segment]} (${SEGMENT_BASIS_LABEL[s.segmentBasis]})`} />
      {s.segments.length > 1 && <Row k="해당 세그먼트" v={s.segments.map((x) => SEGMENT_LABEL[x]).join(', ')} />}
      <Row k="공개 채택 사례" v={`${s.adoptionIds.length}건`} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-500 shrink-0">{k}</span>
      <span className="text-right break-words">{v}</span>
    </div>
  );
}
