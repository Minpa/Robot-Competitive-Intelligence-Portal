'use client';

/**
 * TrendMatrix — 트렌드 포인트를 기술 성숙도(X축) × 사업 영향도(Y축) 2축 산점도로 보여준다.
 * PocBubbleChart(humanoid-trend)의 recharts ScatterChart 패턴을 이식.
 * 버블 크기 = 근거 영상 건수(evidenceCount), 색 = 테마(THEME_COLOR 고정 매핑, 무테마는 CHART_HUE_MUTED).
 * impact/maturity가 모두 산정된 포인트만 전달받아 그린다(호출부에서 hasTrendScore로 필터링).
 */

import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Label, LabelList, ReferenceLine,
} from 'recharts';
import { Tag } from '@/components/ui';
import type { TrendPointTheme } from '../types';
import { CATEGORY_PALETTE, CHART_HUE_MUTED } from './chartColors';

export interface TrendMatrixPoint {
  key: string;
  source: '종합' | '기술';
  title?: string;
  text: string;
  theme?: TrendPointTheme;
  impact: number;
  maturity: number;
  evidenceCount: number;
  /** 하단 랭킹 보드의 순위(#N) — 버블 라벨로 표시해 카드와 1:1 대응시킨다 */
  rank?: number;
}

interface JitteredPoint extends TrendMatrixPoint {
  jx: number;
  jy: number;
}

/** THEME_COLOR — TREND_POINT_THEMES 순서(제품·기술·시장·서비스·생산·파트너십) = CATEGORY_PALETTE[0..5] 고정 매핑. TrendRankingBoard의 테마 칩도 이 매핑을 공유한다 */
export const THEME_COLOR: Record<TrendPointTheme, string> = {
  제품: CATEGORY_PALETTE[0],
  기술: CATEGORY_PALETTE[1],
  시장: CATEGORY_PALETTE[2],
  서비스: CATEGORY_PALETTE[3],
  생산: CATEGORY_PALETTE[4],
  파트너십: CATEGORY_PALETTE[5],
};

const AXIS_TICKS = [1, 2, 3, 4, 5];
const JITTER_RADIUS = 0.18;

/**
 * 동일 (maturity, impact) 좌표에 겹치는 포인트를 원형으로 살짝 흩뿌려 시각적으로 구분한다.
 * 그룹 내 i번째 포인트는 각도 2π·i/size, 반경 JITTER_RADIUS의 오프셋을 받는다(그룹 크기 1이면 오프셋 없음).
 * 지터는 차트상 위치(jx/jy)에만 적용되며, 툴팁·카드 등에는 항상 원본 정수(impact/maturity)를 사용한다.
 */
export function jitterMatrixPoints(points: TrendMatrixPoint[]): JitteredPoint[] {
  const sizeByKey = new Map<string, number>();
  for (const p of points) {
    const k = `${p.maturity}-${p.impact}`;
    sizeByKey.set(k, (sizeByKey.get(k) ?? 0) + 1);
  }
  const seenByKey = new Map<string, number>();
  return points.map((p) => {
    const k = `${p.maturity}-${p.impact}`;
    const size = sizeByKey.get(k) ?? 1;
    const i = seenByKey.get(k) ?? 0;
    seenByKey.set(k, i + 1);
    if (size <= 1) return { ...p, jx: p.maturity, jy: p.impact };
    const angle = (2 * Math.PI * i) / size;
    return {
      ...p,
      jx: p.maturity + JITTER_RADIUS * Math.cos(angle),
      jy: p.impact + JITTER_RADIUS * Math.sin(angle),
    };
  });
}

interface Props {
  points: TrendMatrixPoint[];
  selectedKey: string | null;
  onSelectPoint: (key: string) => void;
}

export function TrendMatrix({ points, selectedKey, onSelectPoint }: Props) {
  if (points.length === 0) {
    return (
      <div className="py-10 text-center text-ink-400 text-[12px]">
        기술 성숙도·영향도 점수가 아직 산정되지 않았습니다. 다음 트렌드 갱신 시 표시됩니다.
      </div>
    );
  }

  const data = jitterMatrixPoints(points);

  return (
    <div className="space-y-4">
      <div className="relative h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 24, right: 24, bottom: 44, left: 20 }}>
            <CartesianGrid strokeDasharray="2 3" stroke="#ECECEF" />
            <XAxis
              type="number"
              dataKey="jx"
              domain={[0.5, 5.5]}
              ticks={AXIS_TICKS}
              tick={{ fontSize: 11, fill: '#5C636E' }}
              stroke="#C6CAD0"
            >
              <Label
                value="기술 성숙도 →"
                position="bottom"
                offset={16}
                style={{ fontSize: 11, fill: '#8A909A' }}
              />
            </XAxis>
            <YAxis
              type="number"
              dataKey="jy"
              domain={[0.5, 5.5]}
              ticks={AXIS_TICKS}
              tick={{ fontSize: 11, fill: '#5C636E' }}
              width={36}
              stroke="#C6CAD0"
            >
              <Label
                value="사업 영향도 ↑"
                angle={-90}
                position="insideLeft"
                offset={12}
                style={{ fontSize: 11, fill: '#8A909A', textAnchor: 'middle' }}
              />
            </YAxis>
            <ZAxis type="number" dataKey="evidenceCount" range={[80, 500]} />
            <ReferenceLine x={3} stroke="#C6CAD0" />
            <ReferenceLine y={3} stroke="#C6CAD0" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#C6CAD0' }}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload as JitteredPoint;
                return (
                  <div className="bg-white border border-ink-200 p-3 text-[11px] text-ink-700 shadow-sm max-w-[280px]">
                    <div className="mb-1.5 flex items-center gap-1.5">
                      {typeof d.rank === 'number' && (
                        <span className="font-mono font-bold text-ink-900 text-[12px]">#{d.rank}</span>
                      )}
                      <Tag tone="neutral" size="sm">{d.source}</Tag>
                      {d.theme && <Tag tone="neutral" size="sm">{d.theme}</Tag>}
                    </div>
                    <p className="font-semibold text-ink-900 mb-1 text-[12.5px] leading-snug">
                      {d.title ?? d.text}
                    </p>
                    {d.title && (
                      <p className="mb-1.5 text-ink-600 leading-relaxed">{d.text}</p>
                    )}
                    <p className="font-mono">사업 영향도 {d.impact}/5</p>
                    <p className="font-mono">기술 성숙도 {d.maturity}/5</p>
                    <p className="font-mono">근거 {d.evidenceCount}건</p>
                    <p className="mt-1.5 text-ink-400">클릭하면 아래 상세 카드로 이동합니다</p>
                  </div>
                );
              }}
            />
            <Scatter data={data} cursor="pointer" onClick={(entry: any) => onSelectPoint(entry.key)}>
              {data.map((d) => {
                const isSelected = selectedKey === d.key;
                const fill = d.theme ? THEME_COLOR[d.theme] : CHART_HUE_MUTED;
                return (
                  <Cell
                    key={d.key}
                    fill={fill}
                    fillOpacity={0.78}
                    stroke={isSelected ? '#1F2328' : 'transparent'}
                    strokeWidth={isSelected ? 3 : 0}
                  />
                );
              })}
              {/* 버블 위 랭킹 번호(#N) — 하단 랭킹 카드와 1:1 대응 */}
              <LabelList
                dataKey="rank"
                position="top"
                offset={6}
                formatter={(v: number) => (typeof v === 'number' ? `#${v}` : '')}
                style={{ fontSize: 10, fontWeight: 700, fill: '#3A3F47', fontFamily: 'ui-monospace, monospace' }}
              />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>

        {/* 사분면 코너 라벨 — 연한 안내 텍스트, 실제 데이터 위에 얹히지 않도록 옅게 표시 */}
        <span className="pointer-events-none absolute font-mono text-[10px] text-ink-400" style={{ top: 26, right: 26 }}>
          지금 대응 필요
        </span>
        <span className="pointer-events-none absolute font-mono text-[10px] text-ink-400" style={{ top: 26, left: 24 }}>
          선행 투자 관찰
        </span>
        <span className="pointer-events-none absolute font-mono text-[10px] text-ink-400" style={{ bottom: 46, right: 26 }}>
          주시·벤치마킹
        </span>
        <span className="pointer-events-none absolute font-mono text-[10px] text-ink-400" style={{ bottom: 46, left: 24 }}>
          장기 관찰
        </span>
      </div>

      {/* 범례: 색 = 테마, 크기 = 근거 영상 수, 번호 = 하단 랭킹 순위 */}
      <div className="space-y-2 border-t border-ink-100 pt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[10.5px] font-semibold text-ink-500 uppercase tracking-wide">색 = 테마</span>
          {(Object.keys(THEME_COLOR) as TrendPointTheme[]).map((theme) => (
            <div key={theme} className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: THEME_COLOR[theme] }} />
              <span className="text-[11px] text-ink-600">{theme}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-[10.5px] font-semibold text-ink-500 uppercase tracking-wide">크기 = 근거 영상 수</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-ink-300" />
            <span className="text-[11px] text-ink-600">1건</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-ink-300" />
            <span className="text-[11px] text-ink-600">2~3건</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-5 rounded-full bg-ink-300" />
            <span className="text-[11px] text-ink-600">4건 (많을수록 여러 영상이 뒷받침)</span>
          </div>
          <span className="text-[10.5px] font-semibold text-ink-500 uppercase tracking-wide ml-2">#번호 = 아래 랭킹 순위</span>
        </div>
      </div>
    </div>
  );
}
