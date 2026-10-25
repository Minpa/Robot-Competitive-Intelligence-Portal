'use client';

/**
 * 액추에이터 관점 경쟁사 포지션·커버리지 맵 — SVG 산점도.
 *  X: 제어 난이도 지수(가중치 슬라이더), Y: 액추에이터 타입/무게/가반하중/가격(로그) 세그먼트 토글.
 *  점 = 로봇 1기(지역 색), 반투명 영역 = 같은 회사 제품군 커버리지, LG 기준점은 잉크색 다이아몬드(형태로 구분).
 *  레이아웃 계산은 actuator-map-layout.ts(순수 함수)에 있고 이 파일은 그리기·상호작용만 담당한다.
 *  컨트롤은 모두 no-print. 색은 chartColors 팔레트 토큰 + Tailwind ink 토큰만 사용한다.
 */

import { useMemo, useRef, useState } from 'react';
import { Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActuatorMapResponse, DifficultyWeights } from '@/types/actuator-map';
import { LegendChip, SegmentedToggle, SubCard } from '../timeline-shared';
import {
  REGION_GROUPS,
  REGION_GROUP_COLOR,
  REGION_GROUP_LABEL,
  REGION_GROUP_OF,
  REGION_LABEL,
  Y_AXIS_OPTIONS,
  Y_DEF,
  buildLayout,
  coverageRows,
  defaultLayoutOptions,
  diamondPath,
  difficultyOf,
  numText,
  priceText,
  type LayoutOptions,
  type PlottedPoint,
  type RegionGroup,
  type YAxisKey,
} from './actuator-map-layout';

interface Props {
  data: ActuatorMapResponse;
  /** 기본 Y축 (기본 '타입') */
  initialYAxis?: YAxisKey;
}

const WEIGHT_DEFS: { key: keyof DifficultyWeights; label: string }[] = [
  { key: 'L', label: '보행 방식 (바퀴 0 · 하이브리드 0.5 · 이족 1)' },
  { key: 'D', label: '전신 자유도 (10→0, 50→1)' },
  { key: 'H', label: '손 자유도 (0→0, 24→1)' },
  { key: 'S', label: '최고 속도 (0→0, 5 m/s→1)' },
];

interface TipState {
  point: PlottedPoint;
  left: number;
  top: number;
}

const CHK = 'inline-flex items-center gap-1.5 text-[12px] text-ink-700 cursor-pointer select-none';
const TH = 'text-left px-2 py-1.5 text-[11px] font-medium text-ink-600 whitespace-nowrap border-b border-ink-200';
const TD = 'px-2 py-1.5 text-[12px] text-ink-800 border-b border-ink-100 align-top';
const NUM = 'text-right tabular-nums whitespace-nowrap';

export function ActuatorPositionMap({ data, initialYAxis = 'type' }: Props) {
  const [opts, setOpts] = useState<LayoutOptions>(() => ({ ...defaultLayoutOptions(data.difficultyDefault, data.typeOrder), yAxis: initialYAxis }));
  const [showTable, setShowTable] = useState(false);
  const [tip, setTip] = useState<TipState | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const layout = useMemo(() => buildLayout(data.robots, opts), [data.robots, opts]);
  const coverage = useMemo(() => coverageRows(layout, opts.yAxis), [layout, opts.yAxis]);
  const yd = Y_DEF[opts.yAxis];
  const incompleteCount = data.robots.filter((r) => r.incomplete).length;
  const hasForecast = data.robots.some((r) => r.forecast);
  const hasLG = data.robots.some((r) => r.isLG && !r.incomplete);

  const update = (patch: Partial<LayoutOptions>) => setOpts((o) => ({ ...o, ...patch }));
  const setWeight = (key: keyof DifficultyWeights, value: number) => setOpts((o) => ({ ...o, weights: { ...o.weights, [key]: value } }));
  const toggleRegion = (g: RegionGroup) => setOpts((o) => ({ ...o, regions: { ...o.regions, [g]: !o.regions[g] } }));

  const showTip = (p: PlottedPoint) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const scale = box.width / layout.width;
    let left = p.px * scale + 16;
    let top = p.py * scale - 10;
    if (left + 300 > box.width) left = Math.max(0, p.px * scale - 306);
    if (top + 170 > box.height) top = Math.max(0, box.height - 180);
    if (top < 0) top = 0;
    setTip({ point: p, left, top });
  };

  const regionsOff = REGION_GROUPS.every((g) => !opts.regions[g]);

  return (
    <SubCard
      title={layout.title}
      description={layout.meta}
      right={
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className={cn(
            'no-print inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium border rounded-[8px] transition-colors',
            showTable ? 'bg-brand text-white border-brand' : 'bg-white text-ink-700 border-ink-200 hover:bg-ink-50'
          )}
        >
          <Table2 className="w-3.5 h-3.5" />
          {showTable ? '표 닫기' : '표로 보기'}
        </button>
      }
    >
      {/* 필터 */}
      <div className="no-print flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[10px] border border-ink-200 bg-ink-50 px-3 py-2">
        <SegmentedToggle label="Y축" value={opts.yAxis} options={Y_AXIS_OPTIONS} onChange={(v) => update({ yAxis: v })} />
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-ink-500">지역</span>
          {REGION_GROUPS.map((g) => (
            <label key={g} className={CHK}>
              <input type="checkbox" checked={opts.regions[g]} onChange={() => toggleRegion(g)} className="accent-brand" />
              <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REGION_GROUP_COLOR[g] }} />
              {REGION_GROUP_LABEL[g]}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className={CHK}>
            <input type="checkbox" checked={opts.hull} onChange={(e) => update({ hull: e.target.checked })} className="accent-brand" />
            회사별 커버리지
          </label>
          {hasLG && (
            <label className={CHK}>
              <input type="checkbox" checked={opts.showLG} onChange={(e) => update({ showLG: e.target.checked })} className="accent-brand" />
              LG 기준점
            </label>
          )}
          {hasForecast && (
            <label className={CHK}>
              <input
                type="checkbox"
                checked={opts.includeForecast}
                onChange={(e) => update({ includeForecast: e.target.checked })}
                className="accent-brand"
              />
              예측(forecast) 모델 포함
            </label>
          )}
        </div>
      </div>

      {/* 차트 */}
      {layout.points.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-ink-400">
          {data.robots.length === 0
            ? '포지션 맵에 올릴 로봇 데이터가 없습니다.'
            : regionsOff
              ? '표시할 지역을 하나 이상 선택하세요.'
              : opts.yAxis === 'price'
                ? '가격이 기록된 로봇이 없습니다. 다른 Y축을 선택하세요.'
                : '현재 필터에 해당하는 로봇이 없습니다. (스펙 미등록 로봇은 표에서 확인)'}
        </div>
      ) : (
        <div className="relative w-full">
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
              {layout.xTicks.map((t) => (
                <g key={`x${t.label}`}>
                  <line x1={t.x} x2={t.x} y1={layout.plot.y} y2={layout.plot.y + layout.plot.h} className="stroke-ink-100" strokeWidth={1} />
                  <text x={t.x} y={layout.plot.y + layout.plot.h + 18} textAnchor="middle" fontSize={11} className="fill-ink-500">
                    {t.label}
                  </text>
                </g>
              ))}
              {layout.gridY.map((y, i) => (
                <line key={`g${i}`} x1={layout.plot.x} x2={layout.plot.x + layout.plot.w} y1={y} y2={y} className="stroke-ink-100" strokeWidth={1} />
              ))}
              {layout.yTicks.map((t) => (
                <text key={`y${t.label}`} x={layout.plot.x - 10} y={t.y + 4} textAnchor="end" fontSize={11} className="fill-ink-500">
                  {t.label}
                </text>
              ))}
              <line
                x1={layout.plot.x}
                x2={layout.plot.x + layout.plot.w}
                y1={layout.plot.y + layout.plot.h}
                y2={layout.plot.y + layout.plot.h}
                className="stroke-ink-300"
                strokeWidth={1}
              />
              <line x1={layout.plot.x} x2={layout.plot.x} y1={layout.plot.y} y2={layout.plot.y + layout.plot.h} className="stroke-ink-300" strokeWidth={1} />
              <text x={layout.plot.x + layout.plot.w / 2} y={layout.height - 14} textAnchor="middle" fontSize={12} className="fill-ink-600">
                {layout.xAxisTitle}
              </text>
              <text x={16} y={layout.plot.y - 10} fontSize={12} className="fill-ink-600">
                {layout.yAxisTitle}
              </text>
            </g>

            {/* 커버리지 헐 */}
            <g>
              {layout.hulls.map((h) => (
                <path key={h.company} d={h.d} fill={h.color} fillOpacity={0.1} stroke={h.color} strokeOpacity={0.45} strokeWidth={1} />
              ))}
            </g>

            {/* 가격 범위 막대 */}
            <g>
              {layout.priceBars.map((b, i) => (
                <line key={i} x1={b.px} x2={b.px} y1={b.y1} y2={b.y2} stroke={b.color} strokeWidth={2} strokeLinecap="round" strokeOpacity={0.7} />
              ))}
            </g>

            {/* 점 + 라벨 */}
            <g>
              {layout.points.map((p) => {
                const r = p.robot;
                const active = tip?.point.robot.id === r.id;
                return (
                  <g
                    key={r.id}
                    tabIndex={0}
                    role="img"
                    aria-label={p.ariaLabel}
                    className="outline-none cursor-default"
                    onPointerMove={() => showTip(p)}
                    onFocus={() => showTip(p)}
                    onBlur={() => setTip(null)}
                  >
                    <circle cx={p.px} cy={p.py} r={14} fill="transparent" />
                    {r.isLG ? (
                      <>
                        <path d={diamondPath(p.px, p.py, 9)} className="fill-white" />
                        <path d={diamondPath(p.px, p.py, 7)} className={cn('fill-ink-900', active && 'stroke-ink-900')} strokeWidth={active ? 2 : 0} />
                      </>
                    ) : (
                      <>
                        <circle cx={p.px} cy={p.py} r={7} className="fill-white stroke-white" strokeWidth={active ? 3 : 2} />
                        <circle
                          cx={p.px}
                          cy={p.py}
                          r={5}
                          fill={p.color}
                          fillOpacity={r.forecast ? 0.35 : 1}
                          stroke={r.forecast ? p.color : undefined}
                          strokeWidth={r.forecast ? 1.5 : 0}
                          strokeDasharray={r.forecast ? '2 2' : undefined}
                        />
                      </>
                    )}
                    {p.label.leader && (
                      <line x1={p.px} y1={p.py} x2={p.label.leader.x2} y2={p.label.leader.y2} className="stroke-ink-400" strokeWidth={1} />
                    )}
                    <text
                      x={p.label.x}
                      y={p.label.y}
                      textAnchor={p.label.anchor}
                      fontSize={11}
                      className="fill-ink-900 stroke-white"
                      strokeWidth={3}
                      strokeLinejoin="round"
                      style={{ paintOrder: 'stroke' }}
                    >
                      {r.name}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 회사명 라벨 */}
            <g>
              {layout.hulls.map((h) => (
                <text
                  key={`hl-${h.company}`}
                  x={h.label.x}
                  y={h.label.y}
                  textAnchor={h.label.anchor}
                  fontSize={11}
                  fontWeight={600}
                  className="fill-ink-600 stroke-white"
                  strokeWidth={3}
                  style={{ paintOrder: 'stroke' }}
                >
                  {h.company}
                </text>
              ))}
            </g>
          </svg>

          {tip && (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute z-10 min-w-[200px] max-w-[300px] rounded-[8px] border border-ink-200 bg-white px-3 py-2 text-[12px] text-ink-800 shadow-report-lg"
              style={{ left: tip.left, top: tip.top }}
            >
              <p className="text-[15px] font-semibold text-ink-900">
                {opts.yAxis === 'price' ? priceText(tip.point.robot.price) : yd.fmt(tip.point.yValue)}
              </p>
              <p className="text-ink-600">
                {tip.point.robot.name} · {tip.point.robot.company}
                {tip.point.robot.forecast ? ' · 예측' : ''} · {REGION_LABEL[tip.point.robot.region]}
              </p>
              <TipRow k="제어 난이도" v={`${tip.point.x.toFixed(1)} / 10`} />
              <TipRow
                k="보행·DOF·손DOF·속도"
                v={`${tip.point.robot.locomotion} · ${numText(tip.point.robot.dof)} · ${numText(tip.point.robot.handDof)} · ${numText(tip.point.robot.speed, ' m/s')}`}
              />
              <TipRow
                k="무게·키·가반하중"
                v={`${numText(tip.point.robot.weight, ' kg')} · ${numText(tip.point.robot.height, ' cm')} · ${numText(tip.point.robot.payload, ' kg')}`}
              />
              <TipRow k="액추에이터" v={tip.point.robot.actuatorTypeLabel} />
              {tip.point.robot.price && <TipRow k="가격" v={`${priceText(tip.point.robot.price)} (${tip.point.robot.price.conf})`} />}
              <p className="mt-1 text-[11px] text-ink-500">{tip.point.robot.actuatorTypeNote}</p>
              <p className="text-[11px] text-ink-500">
                출처: {tip.point.robot.sources.join(' · ')}
                {tip.point.robot.price ? ` · 가격: ${tip.point.robot.price.src}` : ''}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 범례 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {REGION_GROUPS.map((g) => (
          <LegendChip key={g} color={REGION_GROUP_COLOR[g]} label={REGION_GROUP_LABEL[g]} />
        ))}
        {hasLG && (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
            <span aria-hidden className="inline-block w-2.5 h-2.5 bg-ink-900 rotate-45" />
            LG 기준점
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
          <span aria-hidden className="inline-block w-[18px] h-2.5 rounded-[3px] border border-ink-400 bg-ink-100" />
          같은 회사 제품군 커버리지
        </span>
        {hasForecast && <span className="text-[11.5px] text-ink-600">○ 점선 테두리 = 예측 모델</span>}
      </div>

      {/* 가중치 슬라이더 */}
      <div className="no-print rounded-[10px] border border-ink-200 p-3">
        <p className="text-[12px] font-medium text-ink-800">제어 난이도 지수 (X축) 가중치</p>
        <p className="text-[11px] text-ink-500 mt-0.5">DB 필드(보행 방식·전신 DOF·손 DOF·최고 속도)만으로 계산합니다. 가중치를 바꾸면 차트가 즉시 다시 그려집니다.</p>
        <div className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
          {WEIGHT_DEFS.map((d) => (
            <label key={d.key} className="grid grid-cols-[1fr_auto] gap-x-2 text-[12px] text-ink-600">
              <span>{d.label}</span>
              <span className="tabular-nums text-ink-800">{opts.weights[d.key]}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={opts.weights[d.key]}
                onChange={(e) => setWeight(d.key, Number(e.target.value))}
                className="col-span-2 w-full accent-brand"
                aria-label={d.label}
              />
            </label>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-ink-500">{layout.formula}</p>
          <button
            type="button"
            onClick={() => update({ weights: { ...data.difficultyDefault } })}
            className="text-[11px] text-ink-600 underline-offset-2 hover:underline"
          >
            기본값으로
          </button>
        </div>
      </div>
      <p className="text-[11px] text-ink-500 print:block hidden">{layout.formula}</p>

      {/* 표 */}
      {showTable && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[12px] font-medium text-ink-800">데이터 표 (차트와 동일한 슬라이스 + 스펙 미등록 로봇)</p>
            <p className="text-[11px] text-ink-500 mt-0.5">
              출처 등급은 ARGOS CI 신뢰도(A 공식 ~ D 추정). 가격은 DB에 있는 경우만 표시합니다.
              {incompleteCount > 0 && ` 스펙 미등록 ${incompleteCount}기는 난이도를 계산할 수 없어 차트에서 제외됩니다.`}
            </p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['로봇', '회사', '지역', '보행', '전신 DOF', '손 DOF', '속도 m/s', '난이도', '무게 kg', '키 cm', '가반하중 kg', '액추에이터 타입', '가격 (등급)', '출처'].map(
                      (h, i) => (
                        <th key={h} className={cn(TH, i >= 4 && i <= 10 && NUM)}>
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[...data.robots]
                    .filter((r) => opts.regions[REGION_GROUP_OF[r.region]] && (opts.includeForecast || !r.forecast))
                    .map((r) => ({ r, x: r.incomplete ? null : difficultyOf(r, opts.weights) }))
                    .sort((a, b) => (b.x ?? -1) - (a.x ?? -1))
                    .map(({ r, x }) => (
                      <tr key={r.id} className={cn(r.incomplete && 'text-ink-400')}>
                        <td className={cn(TD, 'font-medium whitespace-nowrap')}>
                          {r.name}
                          {r.forecast ? ' (예측)' : ''}
                          {r.incomplete ? ' · 스펙 없음' : ''}
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap')}>{r.company}</td>
                        <td className={TD}>{REGION_LABEL[r.region]}</td>
                        <td className={TD}>{r.locomotion}</td>
                        <td className={cn(TD, NUM)}>{numText(r.dof)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.handDof)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.speed)}</td>
                        <td className={cn(TD, NUM, 'font-medium')}>{x == null ? '—' : x.toFixed(1)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.weight)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.height)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.payload)}</td>
                        <td className={cn(TD, 'whitespace-nowrap')}>{r.actuatorTypeLabel}</td>
                        <td className={cn(TD, 'whitespace-nowrap')}>
                          {priceText(r.price)}
                          {r.price ? ` ${r.price.conf}` : ''}
                        </td>
                        <td className={cn(TD, 'min-w-[220px] text-ink-600')}>
                          {r.sources.join(' · ')} · {r.actuatorTypeNote}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {coverage.length > 0 && (
            <div>
              <p className="text-[12px] font-medium text-ink-800">회사별 커버리지 요약</p>
              <p className="text-[11px] text-ink-500 mt-0.5">현재 Y축({yd.axis}) 기준으로 각 회사 제품군이 차지하는 범위입니다.</p>
              <div className="overflow-x-auto mt-2">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['회사', '지역', '모델 수', '난이도 범위', yd.kind === 'cat' ? '액추에이터 타입' : `${yd.axis} 범위`, ...(yd.kind === 'cat' ? [] : ['액추에이터 타입'])].map((h) => (
                        <th key={h} className={TH}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.map((c) => (
                      <tr key={c.company}>
                        <td className={cn(TD, 'font-medium whitespace-nowrap')}>{c.company}</td>
                        <td className={TD}>{REGION_GROUP_LABEL[c.region]}</td>
                        <td className={TD}>
                          {c.models.length} ({c.models.join(', ')})
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap tabular-nums')}>
                          {c.xMin.toFixed(1)} – {c.xMax.toFixed(1)}
                        </td>
                        <td className={TD}>{c.yRange}</td>
                        {yd.kind !== 'cat' && <td className={TD}>{c.types.join(', ')}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </SubCard>
  );
}

function TipRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-500">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
