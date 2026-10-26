'use client';

/**
 * 액추에이터 공급망 맵 — 외부 조달 로봇 → 공급사 → 공개 채택 사례(3열 그래프) + 표 보기.
 *  좌: 외부 조달이 기록된 로봇(점 색 = 조달 태세), 중: 공급사(외부 조달 엣지 + 수요 사례 공급사 병합), 우: 수요 사례 로봇(점 색 = 시장 세그먼트).
 *  모듈(통합 관절) 층이 1차이고, 부품(모터·감속기) 층은 작은 속 빈 마커 + 점선 엣지로 구분한다. 자체 개발 엣지는 그리지 않는다.
 *  선 두께(좌) = 수량(√), 점선 = 추정(C/D) 또는 부품 단위. 그래프 아래 문단(확인 불가·자체 확인 회사)은 인쇄에도 포함된다.
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type {
  ActuatorAdoptionCase,
  ActuatorMapRobot,
  ActuatorSupplierProduct,
  ActuatorSupplyEdge,
  MarketSegment,
  VendorTargetMarket,
} from '@/types/actuator-map';
import { SegmentedToggle, SubCard } from '../timeline-shared';
import { PostureSwatch, SegmentSwatch } from './ActuatorSwatches';
import { COL, GRAPH_W, ROW_H, buildSupplyGraph, type GraphLink } from './actuator-supply-graph';
import {
  INK,
  POSTURE_COLOR,
  POSTURE_HOLLOW,
  POSTURE_LABEL,
  POSTURE_ORDER,
  SEGMENT_COLOR,
  SEGMENT_HOLLOW,
  SEGMENT_LABEL,
  SEGMENT_ORDER,
  WHITE,
  adoptionBySegment,
  companyPosture,
  postureOf,
  roleKo,
  sameVendorName,
} from './actuator-sourcing';
import { safeSourceHref } from './actuator-strategy';

type ViewMode = 'graph' | 'table';

interface Props {
  edges: ActuatorSupplyEdge[];
  robots: ActuatorMapRobot[];
  adoptions: ActuatorAdoptionCase[];
  vendorMarkets: VendorTargetMarket[];
  suppliers?: ActuatorSupplierProduct[];
  segmentOrder?: MarketSegment[];
}

type Hover = { kind: 'robot' | 'vendor' | 'case'; key: string } | null;

const TH = 'text-left px-2 py-1.5 text-[11px] font-medium text-ink-600 whitespace-nowrap print:whitespace-normal border-b border-ink-200';
const TD = 'px-2 py-1.5 text-[12px] text-ink-800 border-b border-ink-100 align-top';
const NUM = 'text-right tabular-nums whitespace-nowrap print:whitespace-normal';

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function ActuatorSupplyChainMap({ edges, robots, adoptions, vendorMarkets, suppliers = [], segmentOrder = SEGMENT_ORDER }: Props) {
  const graph = useMemo(() => buildSupplyGraph(edges, robots, adoptions, suppliers), [edges, robots, adoptions, suppliers]);
  const [mode, setMode] = useState<ViewMode>('graph');
  const [hover, setHover] = useState<Hover>(null);

  const extEdges = useMemo(() => edges.filter((e) => e.basis === 'external'), [edges]);
  const unknownRobots = useMemo(() => robots.filter((r) => !r.forecast && postureOf(r) === 'unknown'), [robots]);
  const confirmedCompanies = useMemo(() => [...companyPosture(robots).values()].filter((c) => c.posture === 'in_house' || c.posture === 'in_house_sells').map((c) => c.company), [robots]);
  const segCounts = useMemo(() => adoptionBySegment(adoptions, segmentOrder), [adoptions, segmentOrder]);
  const moduleCases = adoptions.filter((c) => c.level !== 'component').length;
  const componentCases = adoptions.length - moduleCases;
  const presentSegments = segCounts.map((c) => c.segment);
  const hasComponent = graph.links.some((l) => l.level === 'component');

  const description = graph.empty && adoptions.length === 0
    ? '외부 조달이 기록된 로봇과 공개 채택 사례가 없습니다.'
    : `로봇 ${graph.robots.length}기 → 공급사 ${graph.vendors.length}개 → 공개 채택 사례 ${graph.cases.length}건 · 선 두께(좌) = 수량, 점선 = 추정(C/D) 또는 부품 단위`;

  // hover 강조: 연결된 노드/엣지만 진하게
  const connected = useMemo(() => {
    if (!hover) return null;
    const nodes = new Set<string>([`${hover.kind}:${hover.key}`]);
    const active = new Set<GraphLink>();
    const seed = new Set<string>([hover.key]);
    // 1단계: 직접 연결, 2단계: 공급사를 거쳐 반대편까지
    for (let pass = 0; pass < 2; pass++) {
      for (const l of graph.links) {
        if (seed.has(l.from) || seed.has(l.to)) {
          if (hover.kind === 'robot' && l.side === 'right' && !seed.has(l.from)) continue;
          if (hover.kind === 'case' && l.side === 'left' && !seed.has(l.to)) continue;
          active.add(l);
          seed.add(l.from);
          seed.add(l.to);
        }
      }
    }
    for (const l of active) {
      nodes.add(l.side === 'left' ? `robot:${l.from}` : `vendor:${l.from}`);
      nodes.add(l.side === 'left' ? `vendor:${l.to}` : `case:${l.to}`);
    }
    return { nodes, active };
  }, [hover, graph.links]);

  const dimNode = (id: string) => connected != null && !connected.nodes.has(id);
  const linkColor = (l: GraphLink) => (l.side === 'left' ? POSTURE_COLOR[l.posture ?? 'external'] : SEGMENT_HOLLOW[l.segment ?? 'other'] ? INK[600] : SEGMENT_COLOR[l.segment ?? 'other']);
  const marketsOf = (name: string) => vendorMarkets.find((m) => sameVendorName(m.vendor, name))?.targetMarketsKo ?? [];

  return (
    <SubCard
      title="액추에이터 공급망 맵"
      description={description}
      right={
        <SegmentedToggle
          label="보기"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'graph', label: '그래프' },
            { value: 'table', label: '표' },
          ]}
        />
      }
    >
      {mode === 'graph' ? (
        graph.empty ? (
          <div className="py-8 text-center text-[13px] text-ink-400">표시할 공급망 관계가 없습니다.</div>
        ) : (
          <>
            <div className="overflow-x-auto print:overflow-visible">
              <svg
                viewBox={`0 0 ${GRAPH_W} ${graph.height}`}
                className="w-full h-auto block min-w-[760px] print:min-w-0"
                role="img"
                aria-label={`외부 조달 로봇 → 액추에이터 공급사 → 공개 채택 사례 3열 그래프 — ${description}`}
                onPointerLeave={() => setHover(null)}
              >
                <text x={COL.left - 10} y={16} textAnchor="end" fontSize={11} fontWeight={600} className="fill-ink-600">
                  외부 조달 로봇 (제조사)
                </text>
                <text x={COL.mid - 6} y={16} fontSize={11} fontWeight={600} className="fill-ink-600">
                  액추에이터 공급사
                </text>
                <text x={COL.right + 12} y={16} fontSize={11} fontWeight={600} className="fill-ink-600">
                  공개 채택 사례 (로봇)
                </text>

                {/* 엣지 */}
                <g>
                  {graph.links.map((l, i) => {
                    const x1 = l.side === 'left' ? COL.left : COL.mid;
                    const x2 = l.side === 'left' ? COL.mid : COL.right;
                    const dim = connected != null && !connected.active.has(l);
                    return (
                      <path
                        key={i}
                        d={`M${x1},${l.y1} C${(x1 + x2) / 2},${l.y1} ${(x1 + x2) / 2},${l.y2} ${x2},${l.y2}`}
                        fill="none"
                        stroke={linkColor(l)}
                        strokeWidth={l.width}
                        strokeOpacity={dim ? 0.08 : l.level === 'component' ? 0.45 : 0.6}
                        strokeDasharray={l.level === 'component' ? '2 3' : l.estimated ? '6 4' : undefined}
                        strokeLinecap="round"
                      >
                        <title>{l.title}</title>
                      </path>
                    );
                  })}
                </g>

                {/* 좌: 로봇 */}
                <g>
                  {graph.robots.map((n) => (
                    <g
                      key={n.id}
                      tabIndex={0}
                      role="img"
                      aria-label={`${n.name} (${n.company}) · 조달 태세 ${POSTURE_LABEL[n.posture]}`}
                      className="outline-none cursor-default"
                      opacity={dimNode(`robot:${n.id}`) ? 0.3 : 1}
                      onPointerEnter={() => setHover({ kind: 'robot', key: n.id })}
                      onFocus={() => setHover({ kind: 'robot', key: n.id })}
                      onBlur={() => setHover(null)}
                    >
                      <rect x={0} y={n.y - ROW_H / 2} width={COL.left + 8} height={ROW_H} fill="transparent" />
                      {POSTURE_HOLLOW[n.posture] ? (
                        <circle cx={COL.left} cy={n.y} r={4.5} fill={WHITE} stroke={POSTURE_COLOR[n.posture]} strokeWidth={2} />
                      ) : (
                        <circle cx={COL.left} cy={n.y} r={5} fill={POSTURE_COLOR[n.posture]} className="stroke-white" strokeWidth={1.5} />
                      )}
                      <text x={COL.left - 12} y={n.y + 4} textAnchor="end" fontSize={11.5} className="fill-ink-900">
                        {n.name}
                        <tspan className="fill-ink-500" fontSize={10.5}>{`  ${n.company}`}</tspan>
                      </text>
                    </g>
                  ))}
                </g>

                {/* 중: 공급사 */}
                <g>
                  {graph.vendors.map((n) => {
                    const markets = marketsOf(n.name);
                    return (
                      <g
                        key={n.key}
                        tabIndex={0}
                        role="img"
                        aria-label={`${n.name} · 외부 조달 ${n.edgeCount}건 · 공개 채택 ${n.caseCount}건${n.level === 'component' ? ' · 부품 단위' : ''}${n.registered ? '' : ' · 제품 스펙 미등록'}`}
                        className="outline-none cursor-default"
                        opacity={dimNode(`vendor:${n.key}`) ? 0.3 : 1}
                        onPointerEnter={() => setHover({ kind: 'vendor', key: n.key })}
                        onFocus={() => setHover({ kind: 'vendor', key: n.key })}
                        onBlur={() => setHover(null)}
                      >
                        <title>{`${n.name}${markets.length ? ` · 타깃 시장(공급사 기재): ${markets.join(', ')}` : ''}${n.registered ? '' : ' · 제품 스펙 미등록'}`}</title>
                        <rect x={COL.mid - 8} y={n.y - ROW_H / 2} width={220} height={ROW_H} fill="transparent" />
                        {n.level === 'component' ? (
                          <circle cx={COL.mid} cy={n.y} r={3.5} fill={WHITE} stroke={INK[600]} strokeWidth={1.5} />
                        ) : (
                          <circle cx={COL.mid} cy={n.y} r={5} fill={INK[600]} className="stroke-white" strokeWidth={1.5} />
                        )}
                        <text x={COL.mid + 12} y={n.y + 4} fontSize={11.5} className="fill-ink-900 stroke-white" strokeWidth={3} strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>
                          {truncate(n.name, 30)}
                          <tspan className="fill-ink-500" fontSize={10.5}>{`  ${n.edgeCount + n.caseCount}`}</tspan>
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* 우: 수요 사례 */}
                <g>
                  {graph.cases.map((n) => (
                    <g
                      key={n.id}
                      tabIndex={0}
                      role="img"
                      aria-label={`${n.label} · ${SEGMENT_LABEL[n.segment]} · 근거 ${n.grade ?? '—'}${n.level === 'component' ? ' · 부품 단위' : ''}`}
                      className="outline-none cursor-default"
                      opacity={dimNode(`case:${n.id}`) ? 0.3 : 1}
                      onPointerEnter={() => setHover({ kind: 'case', key: n.id })}
                      onFocus={() => setHover({ kind: 'case', key: n.id })}
                      onBlur={() => setHover(null)}
                    >
                      <title>{n.label}</title>
                      <rect x={COL.right - 8} y={n.y - ROW_H / 2} width={GRAPH_W - COL.right + 8} height={ROW_H} fill="transparent" />
                      {n.level === 'component' ? (
                        <circle cx={COL.right} cy={n.y} r={3.5} fill={WHITE} stroke={SEGMENT_HOLLOW[n.segment] ? INK[600] : SEGMENT_COLOR[n.segment]} strokeWidth={1.5} />
                      ) : SEGMENT_HOLLOW[n.segment] ? (
                        <circle cx={COL.right} cy={n.y} r={4.25} fill={WHITE} stroke={INK[600]} strokeWidth={1.75} />
                      ) : (
                        <circle cx={COL.right} cy={n.y} r={5} fill={SEGMENT_COLOR[n.segment]} className="stroke-white" strokeWidth={1.5} />
                      )}
                      <text x={COL.right + 12} y={n.y + 4} fontSize={11} className="fill-ink-900">
                        {truncate(n.label, 24)}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>

            {/* 범례: 좌(조달 태세)·우(시장 세그먼트)는 의미가 다르므로 각각 라벨을 붙여 따로 둔다 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-[11px] text-ink-500">좌 · 로봇 조달 태세</span>
              {POSTURE_ORDER.map((p) => (
                <span key={p} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
                  <PostureSwatch posture={p} />
                  {POSTURE_LABEL[p]}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-[11px] text-ink-500">우 · 채택 사례 시장 세그먼트</span>
              {presentSegments.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
                  <SegmentSwatch segment={s} />
                  {SEGMENT_LABEL[s]}
                </span>
              ))}
              {hasComponent && <span className="text-[11.5px] text-ink-600">작은 속 빈 마커·점선 = 부품(모터·감속기) 단위 채택</span>}
            </div>
          </>
        )
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-[12px] font-medium text-ink-800">외부 조달 관계 표</p>
            <p className="text-[11px] text-ink-500 mt-0.5">조달 태세가 외부 조달·혼합인 로봇의 공급사 관계입니다. 부품 단위는 공급사명 뒤에 (부품)으로 표기합니다. 신뢰도 A 공식 ~ D 추정.</p>
            {extEdges.length === 0 ? (
              <div className="py-4 text-[13px] text-ink-400">기록된 외부 조달 관계가 없습니다.</div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible mt-2">
                <table className="w-full border-collapse" aria-label="외부 조달 관계 표">
                  <thead>
                    <tr>
                      {['로봇', '회사', '공급사', '역할', '타입', '수량', '등급'].map((h, i) => (
                        <th key={h} className={cn(TH, i >= 5 && NUM)}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...extEdges]
                      .sort((a, b) => a.company.localeCompare(b.company) || a.robotName.localeCompare(b.robotName) || b.quantity - a.quantity)
                      .map((e, i) => (
                        <tr key={i} className="break-inside-avoid">
                          <td className={cn(TD, 'font-medium')}>{e.robotName}</td>
                          <td className={TD}>{e.company}</td>
                          <td className={TD}>
                            {e.vendor}
                            {e.level === 'component' ? ' (부품)' : ''}
                          </td>
                          <td className={TD}>{roleKo(e.role) ?? '—'}</td>
                          <td className={TD}>{e.type}</td>
                          <td className={cn(TD, NUM)}>{e.quantity}</td>
                          <td className={cn(TD, NUM)}>{e.confidence}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <p className="text-[12px] font-medium text-ink-800">수요 사례 표 (외부 액추에이터 공개 채택)</p>
            <p className="text-[11px] text-ink-500 mt-0.5">공급 계약 여부와는 별개입니다. 출처 링크는 https 주소만 연결합니다.</p>
            {adoptions.length === 0 ? (
              <div className="py-4 text-[13px] text-ink-400">공개 채택 사례는 아직 수집되지 않았습니다.</div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible mt-2">
                <table className="w-full border-collapse" aria-label="수요 사례 표">
                  <thead>
                    <tr>
                      {['로봇', '회사', '국가', '세그먼트', '공급사/모델', '용도', '등급', '연도', '출처'].map((h, i) => (
                        <th key={h} className={cn(TH, (i === 6 || i === 7) && NUM)}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adoptions.map((c) => (
                      <tr key={c.id} className="break-inside-avoid">
                        <td className={cn(TD, 'font-medium')}>{c.robotName}</td>
                        <td className={TD}>{c.company}</td>
                        <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal')}>{c.country ?? '—'}</td>
                        <td className={TD}>
                          <span className="inline-flex items-start gap-1.5">
                            <span className="mt-1">
                              <SegmentSwatch segment={c.marketSegment} />
                            </span>
                            {SEGMENT_LABEL[c.marketSegment]}
                          </span>
                        </td>
                        <td className={TD}>
                          {c.actuatorVendor}
                          {c.level === 'component' ? ' (부품)' : ''}
                          {c.actuatorModel ? <span className="block text-[11px] text-ink-500">{c.actuatorModel}</span> : null}
                        </td>
                        <td className={cn(TD, 'min-w-[140px] print:min-w-0')}>{c.usage ?? '—'}</td>
                        <td className={cn(TD, NUM)}>{c.evidenceGrade ?? '—'}</td>
                        <td className={cn(TD, NUM)}>{c.year ?? '—'}</td>
                        <td className={cn(TD, 'break-all')}>
                          {c.sources.length === 0
                            ? '—'
                            : c.sources.slice(0, 2).map((s, i) => {
                                const href = safeSourceHref(s.url);
                                const text = s.title ?? s.url;
                                return (
                                  <span key={i} className="block text-[11px]">
                                    {href ? (
                                      <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-900">
                                        {truncate(text, 48)}
                                      </a>
                                    ) : (
                                      truncate(text, 48)
                                    )}
                                  </span>
                                );
                              })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 그래프 아래 문단 — 인쇄에도 포함 */}
      <div className="flex flex-col gap-1.5 text-[11.5px] text-ink-600 leading-relaxed">
        {adoptions.length > 0 && (
          <p>
            공개 채택 사례 {adoptions.length}건
            {moduleCases > 0 ? `: ${segCounts.filter((c) => c.count > 0).map((c) => `${SEGMENT_LABEL[c.segment]} ${c.count}`).join(', ')}` : ''}
            {componentCases > 0 ? ` (부품 단위 채택 ${componentCases}건은 별도)` : ''}
          </p>
        )}
        <p>
          확인 불가 로봇 {unknownRobots.length}기
          {unknownRobots.length ? `: ${unknownRobots.map((r) => `${r.name}(${r.company})${r.sourcing.kind === 'in_house_presumed' ? ' 자체 개발 추정' : ''}`).join(', ')}` : ''}
        </p>
        <p>
          자체 개발 확인 회사 {confirmedCompanies.length}개사{confirmedCompanies.length ? `: ${confirmedCompanies.join(', ')}` : ''}. 자체 개발 엣지는 그리지 않았습니다.
        </p>
      </div>
    </SubCard>
  );
}
