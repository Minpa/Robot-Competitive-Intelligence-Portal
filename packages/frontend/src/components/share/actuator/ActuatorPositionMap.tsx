'use client';

/**
 * 액추에이터 관점 경쟁사 포지션·커버리지 맵 — SVG 산점도.
 *  X: 제어 난이도 지수(가중치 슬라이더), Y: 액추에이터 타입/무게/가반하중/가격(로그) 세그먼트 토글.
 *  점 = 로봇 1기(색 = 조달 태세 4단계, 확인 불가는 속 빈 회색 링), 반투명 영역 = 회사 커버리지(색은 회사 구분용·의미 없음, 겹치는 영역끼리 다른 색),
 *  LG 기준점은 잉크색 다이아몬드(형태로 구분). 회사명 라벨 앞의 색 점이 영역 색을 가리키고, 라벨·점에 hover/focus 하면 그 회사 영역만 강조한다.
 *  지역은 색이 아니라 필터·툴팁·표로만 제공한다.
 *  레이아웃 계산은 actuator-map-layout.ts(순수 함수)에 있고 이 파일은 그리기·상호작용만 담당한다.
 *  컨트롤은 모두 no-print. 색은 chartColors 팔레트 토큰 + Tailwind ink 토큰만 사용한다.
 */

import { useMemo, useRef, useState } from 'react';
import { Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActuatorMapResponse, DifficultyWeights, RobotSourcing, SourcingPosture } from '@/types/actuator-map';
import { SegmentedToggle, SubCard } from '../timeline-shared';
import { HullSwatch, PostureSwatch } from './ActuatorSwatches';
import {
  POSTURE_LABEL,
  POSTURE_ORDER,
  componentSourcingText,
  postureDetailLabel,
  postureOf,
} from './actuator-sourcing';
import {
  REGION_GROUPS,
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
  hullEmphasis,
  hullLabelDot,
  HULL_DOT_R,
  HULL_DOT_STROKE_W,
  HULL_FILL,
  HULL_STROKE,
  HULL_STROKE_W,
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
const TH = 'text-left px-2 py-1.5 text-[11px] font-medium text-ink-600 whitespace-nowrap print:whitespace-normal border-b border-ink-200';
const TD = 'px-2 py-1.5 text-[12px] text-ink-800 border-b border-ink-100 align-top';
const NUM = 'text-right tabular-nums whitespace-nowrap print:whitespace-normal';

export function ActuatorPositionMap({ data, initialYAxis = 'type' }: Props) {
  const [opts, setOpts] = useState<LayoutOptions>(() => ({ ...defaultLayoutOptions(data.difficultyDefault, data.typeOrder), yAxis: initialYAxis }));
  const [showTable, setShowTable] = useState(false);
  const [tip, setTip] = useState<TipState | null>(null);
  const [hoverCompany, setHoverCompany] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const layout = useMemo(() => buildLayout(data.robots, opts), [data.robots, opts]);
  const coverage = useMemo(() => coverageRows(layout, opts.yAxis), [layout, opts.yAxis]);
  const emphasis = useMemo(() => hullEmphasis(hoverCompany, layout.hulls), [hoverCompany, layout.hulls]);
  // 강조 hull 을 마지막에 그린다 (배열은 불변, 렌더 순서만)
  const hullDrawOrder = useMemo(
    () => (hoverCompany == null ? layout.hulls : [...layout.hulls].sort((a, b) => Number(a.company === hoverCompany) - Number(b.company === hoverCompany))),
    [layout.hulls, hoverCompany]
  );
  const yd = Y_DEF[opts.yAxis];
  const incompleteCount = data.robots.filter((r) => r.incomplete).length;
  const hasForecast = data.robots.some((r) => r.forecast);
  const hasLG = data.robots.some((r) => r.isLG && !r.incomplete);

  const update = (patch: Partial<LayoutOptions>) => setOpts((o) => ({ ...o, ...patch }));
  const setWeight = (key: keyof DifficultyWeights, value: number) => setOpts((o) => ({ ...o, weights: { ...o.weights, [key]: value } }));
  const toggleRegion = (g: RegionGroup) => setOpts((o) => ({ ...o, regions: { ...o.regions, [g]: !o.regions[g] } }));
  const togglePosture = (p: SourcingPosture) => setOpts((o) => ({ ...o, postures: { ...o.postures, [p]: !o.postures[p] } }));

  const showTip = (p: PlottedPoint) => {
    const svg = svgRef.current;
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const scale = box.width / layout.width;
    let left = p.px * scale + 16;
    let top = p.py * scale - 10;
    if (left + 320 > box.width) left = Math.max(0, p.px * scale - 326);
    if (top + 300 > box.height) top = Math.max(0, box.height - 310);
    if (top < 0) top = 0;
    setTip({ point: p, left, top });
  };

  const regionsOff = REGION_GROUPS.every((g) => !opts.regions[g]);
  const posturesOff = POSTURE_ORDER.every((p) => !opts.postures[p]);

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
              {REGION_GROUP_LABEL[g]}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[11px] text-ink-500">조달 태세</span>
          {POSTURE_ORDER.map((p) => (
            <label key={p} className={CHK}>
              <input type="checkbox" checked={opts.postures[p]} onChange={() => togglePosture(p)} className="accent-brand" />
              <PostureSwatch posture={p} />
              {POSTURE_LABEL[p]}
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
              : posturesOff
                ? '표시할 조달 태세를 하나 이상 선택하세요.'
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
            onPointerLeave={() => {
              setTip(null);
              setHoverCompany(null);
            }}
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
              {hullDrawOrder.map((h) => {
                const em = emphasis[h.company];
                return (
                  <path
                    key={h.company}
                    d={h.d}
                    fill={h.color}
                    fillOpacity={em?.fillOpacity ?? HULL_FILL}
                    stroke={h.color}
                    strokeOpacity={em?.strokeOpacity ?? HULL_STROKE}
                    strokeWidth={em?.strokeWidth ?? HULL_STROKE_W}
                    style={{ pointerEvents: 'none' }}
                  />
                );
              })}
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
                    onPointerMove={() => {
                      showTip(p);
                      setHoverCompany(r.company);
                    }}
                    onPointerLeave={() => setHoverCompany(null)}
                    onFocus={() => {
                      showTip(p);
                      setHoverCompany(r.company);
                    }}
                    onBlur={() => {
                      setTip(null);
                      setHoverCompany(null);
                    }}
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
                        {p.hollow ? (
                          <circle
                            cx={p.px}
                            cy={p.py}
                            r={4.5}
                            className="fill-white"
                            stroke={p.color}
                            strokeWidth={2}
                            strokeDasharray={r.forecast ? '2 2' : undefined}
                          />
                        ) : (
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
                        )}
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
              {layout.hulls.map((h) => {
                const dot = hullLabelDot(h);
                return (
                  <g
                    key={`hl-${h.company}`}
                    onPointerEnter={() => setHoverCompany(h.company)}
                    onPointerMove={() => setHoverCompany(h.company)}
                    onPointerLeave={() => setHoverCompany(null)}
                  >
                    <circle cx={dot.cx} cy={dot.cy} r={HULL_DOT_R} fill={h.color} className="stroke-white" strokeWidth={HULL_DOT_STROKE_W} />
                    <text
                      x={h.label.x}
                      y={h.label.y}
                      textAnchor={h.label.anchor}
                      fontSize={11}
                      fontWeight={600}
                      className="fill-ink-900 stroke-white"
                      strokeWidth={3}
                      style={{ paintOrder: 'stroke' }}
                    >
                      {h.company}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {tip && (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute z-10 min-w-[200px] max-w-[320px] rounded-[8px] border border-ink-200 bg-white px-3 py-2 text-[12px] text-ink-800 shadow-report-lg"
              style={{ left: tip.left, top: tip.top }}
            >
              <p className="text-[15px] font-semibold text-ink-900">
                {opts.yAxis === 'price' ? priceText(tip.point.robot.price) : yd.fmt(tip.point.yValue)}
              </p>
              <p className="text-ink-600">
                {tip.point.robot.name} · {tip.point.robot.company}
                {tip.point.robot.forecast ? ' · 예측' : ''}
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
              <TipRow k="지역" v={REGION_LABEL[tip.point.robot.region]} />
              <SourcingTip sourcing={tip.point.robot.sourcing} />
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
        {POSTURE_ORDER.map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
            <PostureSwatch posture={p} />
            {POSTURE_LABEL[p]}
          </span>
        ))}
        {hasLG && (
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
            <span aria-hidden className="inline-block w-2.5 h-2.5 bg-ink-900 rotate-45" />
            LG 기준점
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
          <HullSwatch />
          회사 커버리지(색은 회사 구분용, 의미 없음)
        </span>
        {hasForecast && <span className="text-[11.5px] text-ink-600">○ 점선 테두리 = 예측 모델</span>}
      </div>
      <p className="text-[11px] text-ink-500">
        점 색은 액추에이터 조달 태세입니다(속 빈 회색 링 = 근거 부족으로 확인 불가). 자체 개발 확인은 근거 등급 A·B만 셉니다. 영역 색은 회사 구분용으로 겹치는 영역끼리 다른 색을 자동 배정한 것이며 의미는 없습니다. 회사명 라벨 앞의 색 점이 영역 색을 가리키고, 라벨이나 점에 마우스를 올리거나 포커스하면 그 회사 영역이 강조됩니다. 지역은 필터·툴팁·표에서 확인하세요.
      </p>

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
              출처 등급은 ARGOS CI 신뢰도(A 공식 ~ D 추정). 조달 태세의 등급은 자체 개발 근거의 등급입니다. 가격은 DB에 있는 경우만 표시합니다.
              {incompleteCount > 0 && ` 스펙 미등록 ${incompleteCount}기는 난이도를 계산할 수 없어 차트에서 제외됩니다.`}
            </p>
            <div className="overflow-x-auto print:overflow-visible mt-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['로봇', '회사', '지역', '보행', '전신 DOF', '손 DOF', '속도 m/s', '난이도', '무게 kg', '키 cm', '가반하중 kg', '액추에이터 타입', '조달 태세', '가격 (등급)', '출처'].map(
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
                    .filter((r) => opts.regions[REGION_GROUP_OF[r.region]] && opts.postures[postureOf(r)] && (opts.includeForecast || !r.forecast))
                    .map((r) => ({ r, x: r.incomplete ? null : difficultyOf(r, opts.weights) }))
                    .sort((a, b) => (b.x ?? -1) - (a.x ?? -1))
                    .map(({ r, x }) => (
                      <tr key={r.id} className={cn(r.incomplete && 'text-ink-400')}>
                        <td className={cn(TD, 'font-medium whitespace-nowrap print:whitespace-normal')}>
                          {r.name}
                          {r.forecast ? ' (예측)' : ''}
                          {r.incomplete ? ' · 스펙 없음' : ''}
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal')}>{r.company}</td>
                        <td className={TD}>{REGION_LABEL[r.region]}</td>
                        <td className={TD}>{r.locomotion}</td>
                        <td className={cn(TD, NUM)}>{numText(r.dof)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.handDof)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.speed)}</td>
                        <td className={cn(TD, NUM, 'font-medium')}>{x == null ? '—' : x.toFixed(1)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.weight)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.height)}</td>
                        <td className={cn(TD, NUM)}>{numText(r.payload)}</td>
                        <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal')}>{r.actuatorTypeLabel}</td>
                        <td className={cn(TD, 'min-w-[150px] print:min-w-0')}>
                          <span className="inline-flex items-center gap-1.5">
                            <PostureSwatch posture={postureOf(r)} />
                            {postureDetailLabel(r.sourcing)}
                          </span>
                          {componentSourcingText(r.sourcing) && <span className="block text-[11px] text-ink-500">{componentSourcingText(r.sourcing)}</span>}
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal')}>
                          {priceText(r.price)}
                          {r.price ? ` ${r.price.conf}` : ''}
                        </td>
                        <td className={cn(TD, 'min-w-[220px] print:min-w-0 text-ink-600')}>
                          {r.sources.join(' · ')} · {r.actuatorTypeNote}
                          {r.sourcing.noteKo ? ` · ${r.sourcing.noteKo}` : ''}
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
              <div className="overflow-x-auto print:overflow-visible mt-2">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {['회사', '지역', '모델 수', '난이도 범위', yd.kind === 'cat' ? '액추에이터 타입' : `${yd.axis} 범위`, ...(yd.kind === 'cat' ? [] : ['액추에이터 타입']), '조달 태세'].map((h) => (
                        <th key={h} className={TH}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coverage.map((c) => (
                      <tr key={c.company}>
                        <td className={cn(TD, 'font-medium whitespace-nowrap print:whitespace-normal')}>{c.company}</td>
                        <td className={TD}>{REGION_GROUP_LABEL[c.region]}</td>
                        <td className={TD}>
                          {c.models.length} ({c.models.join(', ')})
                        </td>
                        <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal tabular-nums')}>
                          {c.xMin.toFixed(1)} – {c.xMax.toFixed(1)}
                        </td>
                        <td className={TD}>{c.yRange}</td>
                        {yd.kind !== 'cat' && <td className={TD}>{c.types.join(', ')}</td>}
                        <td className={TD}>{c.posture}</td>
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

const BASIS_TEXT: Record<RobotSourcing['basis'], string> = {
  regrade: '재판정 기록',
  derived: '재판정 기록 없음(공급사 기록 기준의 보수적 판정)',
};

/** 툴팁의 조달 태세 블록: 라벨(등급) · 판정 근거 방식 · 메모 · 근거 1건 · 부품 층 외부 조달 */
function SourcingTip({ sourcing }: { sourcing: RobotSourcing }) {
  const ev = sourcing.evidence[0];
  const comp = componentSourcingText(sourcing);
  return (
    <div className="mt-1 border-t border-ink-100 pt-1">
      <div className="flex justify-between gap-3">
        <span className="text-ink-500">조달 태세</span>
        <span className="text-right font-medium inline-flex items-center gap-1.5">
          <PostureSwatch posture={sourcing.posture} />
          {postureDetailLabel(sourcing)}
        </span>
      </div>
      <p className="text-[11px] text-ink-500">
        근거 등급 {sourcing.evidenceGrade ?? '—'} · {BASIS_TEXT[sourcing.basis]}
      </p>
      {comp && <p className="text-[11px] text-ink-700">{comp}</p>}
      {sourcing.noteKo && <p className="text-[11px] text-ink-600">{sourcing.noteKo}</p>}
      {ev && (
        <p className="text-[11px] text-ink-500 break-all">
          근거: {[ev.claim, ev.source, ev.grade, ev.date].filter(Boolean).join(' · ')}
          {ev.url ? ` · ${ev.url}` : ''}
        </p>
      )}
    </div>
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
