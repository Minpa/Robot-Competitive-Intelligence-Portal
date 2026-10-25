'use client';

/**
 * 액추에이터 공급망 맵 — 로봇 → 공급사 이분 그래프.
 *  왼쪽 로봇 노드(지역 색), 오른쪽 공급사/자체 노드, 엣지 두께 = 수량(√ 스케일), 자체 생산은 회사 자신 노드로 연결.
 *  점선 엣지 = CI 매트릭스 추정(C/D). 노드가 많으면 매트릭스 표로 전환할 수 있다(기본: 엣지 60개 초과 시 매트릭스).
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ActuatorMapRobot, ActuatorSupplyEdge } from '@/types/actuator-map';
import { LegendChip, SegmentedToggle, SubCard } from '../timeline-shared';
import { REGION_GROUPS, REGION_GROUP_COLOR, REGION_GROUP_LABEL, REGION_GROUP_OF, type RegionGroup } from './actuator-map-layout';

type ViewMode = 'graph' | 'matrix';

interface Props {
  edges: ActuatorSupplyEdge[];
  robots: ActuatorMapRobot[];
}

interface LeftNode {
  id: string;
  name: string;
  company: string;
  region: RegionGroup;
  y: number;
}
interface RightNode {
  key: string;
  name: string;
  inHouse: boolean;
  total: number;
  y: number;
}
interface GraphEdge extends ActuatorSupplyEdge {
  vendorKey: string;
  y1: number;
  y2: number;
  width: number;
  color: string;
  estimated: boolean;
}

const SVG_W = 900;
const ROW_H = 26;
const TOP = 34;
const LEFT_X = 250;
const RIGHT_X = 650;

function buildGraph(edges: ActuatorSupplyEdge[], robots: ActuatorMapRobot[]) {
  const regionOf = new Map(robots.map((r) => [r.id, REGION_GROUP_OF[r.region]] as const));
  const leftMap = new Map<string, LeftNode>();
  const rightMap = new Map<string, RightNode>();
  for (const e of edges) {
    if (!leftMap.has(e.robotId)) leftMap.set(e.robotId, { id: e.robotId, name: e.robotName, company: e.company, region: regionOf.get(e.robotId) ?? 'other', y: 0 });
    const key = e.vendor.trim().toLowerCase();
    const rn = rightMap.get(key) ?? { key, name: e.vendor, inHouse: true, total: 0, y: 0 };
    rn.total += e.quantity;
    rn.inHouse = rn.inHouse && e.inHouse;
    rightMap.set(key, rn);
  }
  const left = [...leftMap.values()].sort((a, b) => a.company.localeCompare(b.company) || a.name.localeCompare(b.name));
  const right = [...rightMap.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  left.forEach((n, i) => (n.y = TOP + i * ROW_H + ROW_H / 2));
  right.forEach((n, i) => (n.y = TOP + i * ROW_H + ROW_H / 2));
  const leftY = new Map(left.map((n) => [n.id, n.y]));
  const rightY = new Map(right.map((n) => [n.key, n.y]));
  const gEdges: GraphEdge[] = edges.map((e) => {
    const vendorKey = e.vendor.trim().toLowerCase();
    return {
      ...e,
      vendorKey,
      y1: leftY.get(e.robotId) ?? 0,
      y2: rightY.get(vendorKey) ?? 0,
      width: Math.min(8, 1 + 1.6 * Math.sqrt(Math.max(1, e.quantity))),
      color: REGION_GROUP_COLOR[regionOf.get(e.robotId) ?? 'other'],
      estimated: e.confidence === 'C' || e.confidence === 'D',
    };
  });
  const height = TOP + Math.max(left.length, right.length, 1) * ROW_H + 16;
  return { left, right, edges: gEdges, height };
}

const TH = 'px-2 py-1.5 text-[11px] font-medium text-ink-600 whitespace-nowrap border-b border-ink-200';
const TD = 'px-2 py-1.5 text-[12px] text-ink-800 border-b border-ink-100';

export function ActuatorSupplyChainMap({ edges, robots }: Props) {
  const graph = useMemo(() => buildGraph(edges, robots), [edges, robots]);
  const dense = edges.length > 60 || graph.left.length > 28 || graph.right.length > 28;
  const [mode, setMode] = useState<ViewMode>(dense ? 'matrix' : 'graph');
  const [hover, setHover] = useState<{ kind: 'robot' | 'vendor'; key: string } | null>(null);

  const inHouseCount = edges.filter((e) => e.inHouse).length;
  const description =
    edges.length === 0
      ? 'robot_components(type=actuator)·CI 공급사/자체 생산 항목에 기록된 로봇–공급사 관계가 없습니다.'
      : `로봇 ${graph.left.length}기 → 공급사 ${graph.right.length}개 · 관계 ${edges.length}건 (자체 생산 ${inHouseCount}건) · 선 두께 = 수량, 점선 = CI 추정(C/D)`;

  const isDim = (e: GraphEdge) => hover && !(hover.kind === 'robot' ? hover.key === e.robotId : hover.key === e.vendorKey);

  return (
    <SubCard
      title="액추에이터 공급망 맵"
      description={description}
      right={
        edges.length > 0 ? (
          <SegmentedToggle
            label="보기"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'graph', label: '그래프' },
              { value: 'matrix', label: '매트릭스' },
            ]}
          />
        ) : undefined
      }
    >
      {edges.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-ink-400">표시할 공급망 관계가 없습니다.</div>
      ) : mode === 'graph' ? (
        <>
          <svg
            viewBox={`0 0 ${SVG_W} ${graph.height}`}
            className="w-full h-auto block"
            role="img"
            aria-label={`로봇 → 액추에이터 공급사 이분 그래프 — ${description}`}
            onPointerLeave={() => setHover(null)}
          >
            <text x={LEFT_X - 10} y={16} textAnchor="end" fontSize={11} fontWeight={600} className="fill-ink-600">
              로봇 (제조사)
            </text>
            <text x={RIGHT_X + 10} y={16} fontSize={11} fontWeight={600} className="fill-ink-600">
              액추에이터 공급사 · 자체
            </text>
            <g>
              {graph.edges.map((e, i) => (
                <path
                  key={`${e.robotId}-${e.vendorKey}-${i}`}
                  d={`M${LEFT_X},${e.y1} C${(LEFT_X + RIGHT_X) / 2},${e.y1} ${(LEFT_X + RIGHT_X) / 2},${e.y2} ${RIGHT_X},${e.y2}`}
                  fill="none"
                  stroke={e.color}
                  strokeWidth={e.width}
                  strokeOpacity={isDim(e) ? 0.08 : 0.55}
                  strokeDasharray={e.estimated ? '6 4' : undefined}
                  strokeLinecap="round"
                >
                  <title>
                    {`${e.robotName} (${e.company}) → ${e.vendor}${e.inHouse ? ' (자체)' : ''} · ${e.type} · 수량 ${e.quantity} · 신뢰도 ${e.confidence}`}
                  </title>
                </path>
              ))}
            </g>
            <g>
              {graph.left.map((n) => {
                const dim = hover && !(hover.kind === 'robot' ? hover.key === n.id : graph.edges.some((e) => e.robotId === n.id && e.vendorKey === hover.key));
                return (
                  <g
                    key={n.id}
                    tabIndex={0}
                    role="img"
                    aria-label={`${n.name} (${n.company})`}
                    className="outline-none cursor-default"
                    opacity={dim ? 0.3 : 1}
                    onPointerEnter={() => setHover({ kind: 'robot', key: n.id })}
                    onFocus={() => setHover({ kind: 'robot', key: n.id })}
                    onBlur={() => setHover(null)}
                  >
                    <rect x={0} y={n.y - ROW_H / 2} width={LEFT_X + 8} height={ROW_H} fill="transparent" />
                    <circle cx={LEFT_X} cy={n.y} r={5} fill={REGION_GROUP_COLOR[n.region]} className="stroke-white" strokeWidth={1.5} />
                    <text x={LEFT_X - 12} y={n.y + 4} textAnchor="end" fontSize={11.5} className="fill-ink-900">
                      {n.name}
                      <tspan className="fill-ink-500" fontSize={10.5}>{`  ${n.company}`}</tspan>
                    </text>
                  </g>
                );
              })}
            </g>
            <g>
              {graph.right.map((n) => {
                const dim = hover && !(hover.kind === 'vendor' ? hover.key === n.key : graph.edges.some((e) => e.vendorKey === n.key && e.robotId === hover.key));
                return (
                  <g
                    key={n.key}
                    tabIndex={0}
                    role="img"
                    aria-label={`${n.name}${n.inHouse ? ' (자체 생산)' : ''} · 연결 수량 ${n.total}`}
                    className="outline-none cursor-default"
                    opacity={dim ? 0.3 : 1}
                    onPointerEnter={() => setHover({ kind: 'vendor', key: n.key })}
                    onFocus={() => setHover({ kind: 'vendor', key: n.key })}
                    onBlur={() => setHover(null)}
                  >
                    <rect x={RIGHT_X - 8} y={n.y - ROW_H / 2} width={SVG_W - RIGHT_X + 8} height={ROW_H} fill="transparent" />
                    {n.inHouse ? (
                      <path d={`M${RIGHT_X},${n.y - 6}L${RIGHT_X + 6},${n.y}L${RIGHT_X},${n.y + 6}L${RIGHT_X - 6},${n.y}Z`} className="fill-ink-900" />
                    ) : (
                      <circle cx={RIGHT_X} cy={n.y} r={5} className="fill-ink-600 stroke-white" strokeWidth={1.5} />
                    )}
                    <text x={RIGHT_X + 12} y={n.y + 4} fontSize={11.5} className="fill-ink-900">
                      {n.name}
                      <tspan className="fill-ink-500" fontSize={10.5}>{n.inHouse ? '  자체' : `  ×${n.total}`}</tspan>
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {REGION_GROUPS.map((g) => (
              <LegendChip key={g} color={REGION_GROUP_COLOR[g]} label={`${REGION_GROUP_LABEL[g]} 로봇`} />
            ))}
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
              <span aria-hidden className="inline-block w-2.5 h-2.5 bg-ink-900 rotate-45" />
              자체 생산 (제조사 자신)
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-600">
              <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full bg-ink-600" />
              외부 공급사
            </span>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse min-w-full" aria-label="로봇 × 공급사 매트릭스 (셀 = 수량, ◆ = 자체 생산)">
            <thead>
              <tr>
                <th className={cn(TH, 'text-left')}>로봇 \ 공급사</th>
                {graph.right.map((v) => (
                  <th key={v.key} className={cn(TH, 'text-center')}>
                    {v.name}
                    {v.inHouse ? ' ◆' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {graph.left.map((r) => (
                <tr key={r.id}>
                  <td className={cn(TD, 'whitespace-nowrap')}>
                    <span aria-hidden className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: REGION_GROUP_COLOR[r.region] }} />
                    <span className="font-medium">{r.name}</span> <span className="text-ink-500">{r.company}</span>
                  </td>
                  {graph.right.map((v) => {
                    const e = graph.edges.find((x) => x.robotId === r.id && x.vendorKey === v.key);
                    return (
                      <td key={v.key} className={cn(TD, 'text-center tabular-nums', e ? (e.inHouse ? 'bg-ink-100 font-semibold' : 'bg-ink-50 font-medium') : 'text-ink-300')}>
                        {e ? `${e.inHouse ? '◆ ' : ''}${e.quantity}${e.estimated ? '*' : ''}` : '·'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-ink-500 mt-2">셀 = 액추에이터 수량(robot_components) · ◆ = 자체 생산 · * = CI 추정(C/D) · 수량 미상은 1로 표시</p>
        </div>
      )}
    </SubCard>
  );
}
