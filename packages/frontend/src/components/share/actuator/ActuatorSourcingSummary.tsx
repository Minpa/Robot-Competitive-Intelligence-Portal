'use client';

/**
 * @deprecated ActuatorMapSection 은 더 이상 렌더하지 않는다(조달 태세 그래프는 분류 트리 하나뿐 — ActuatorSourcingBoard). PRINT_EXACT 상수만 다른 컴포넌트가 가져다 쓴다.
 *
 * 조달 태세 요약 — 섹션 최상단. 헤드라인 메시지(웹·HTML 지도 카드·전략 카드 공통 문장) 아래에
 * 로봇 조달 태세 4단계 누적 가로 막대와 범례(건수)를 보여준다. forecast 로봇은 제외하고, 총합이 0이면 막대를 숨긴다.
 * 색은 actuator-sourcing.ts(chartColors 토큰)만 사용한다.
 */

import { useMemo } from 'react';
import { SubCard } from '../timeline-shared';
import type { ActuatorMapResponse } from '@/types/actuator-map';
import { PostureSwatch } from './ActuatorSwatches';
import { POSTURE_COLOR, POSTURE_HOLLOW, POSTURE_LABEL, POSTURE_ORDER, WHITE, summarizeSourcing } from './actuator-sourcing';
import { buildHeadlineMessage, computeStrategyStats } from './actuator-strategy';

/** 인쇄 시에도 배경색이 남도록 */
export const PRINT_EXACT = { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties;

export function ActuatorSourcingSummary({ data }: { data: ActuatorMapResponse }) {
  const headline = useMemo(() => buildHeadlineMessage(computeStrategyStats(data)), [data]);
  const sum = useMemo(() => summarizeSourcing(data.robots), [data.robots]);
  const counts = { in_house: sum.inHouse, in_house_sells: sum.inHouseSells, external: sum.external, unknown: sum.unknown };

  return (
    <SubCard title="조달 태세 요약" description={`로봇 ${sum.robots}기(예측 모델 제외) · 근거 등급 A·B가 있는 경우만 자체 개발 확인으로 셉니다`}>
      <p className="text-[13px] text-ink-900 leading-relaxed font-medium rounded-[10px] border border-ink-200 bg-ink-50 px-3 py-2.5">{headline}</p>

      {sum.robots > 0 && (
        <>
          <div
            role="img"
            aria-label={`로봇 조달 태세 ${POSTURE_ORDER.map((p) => `${POSTURE_LABEL[p]} ${counts[p]}기`).join(', ')}`}
            className="flex w-full h-6 rounded-[6px] overflow-hidden border border-ink-200"
          >
            {POSTURE_ORDER.filter((p) => counts[p] > 0).map((p) => (
              <div
                key={p}
                title={`${POSTURE_LABEL[p]} ${counts[p]}기`}
                style={{
                  flexGrow: counts[p],
                  flexBasis: 0,
                  backgroundColor: POSTURE_HOLLOW[p] ? WHITE : POSTURE_COLOR[p],
                  borderLeft: POSTURE_HOLLOW[p] ? `3px solid ${POSTURE_COLOR[p]}` : undefined,
                  ...PRINT_EXACT,
                }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-ink-700">
            {POSTURE_ORDER.map((p) => (
              <li key={p} className="inline-flex items-center gap-1.5">
                <PostureSwatch posture={p} />
                <span>
                  {POSTURE_LABEL[p]} <b className="tabular-nums text-ink-900">{counts[p]}기</b>
                  {p === 'external' && sum.externalMixed > 0 ? ` (이 중 혼합 ${sum.externalMixed}기)` : ''}
                  {p === 'unknown' ? ` (이 중 자체 개발 추정 ${sum.unknownPresumed}기)` : ''}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11.5px] text-ink-600 leading-relaxed">
            자체 개발 확인 {sum.inHouse + sum.inHouseSells}기 중 근거 등급 A {sum.confirmedGradeA}기 / B {sum.confirmedGradeB}기 (A 모델 특정 공식 근거, B 회사 단위 근거).
            {sum.componentSourcing > 0
              ? ` 모듈(통합 관절)은 자체 설계이고 부품(모터·감속기)만 외부에서 조달하는 ${sum.componentSourcing}기는 자체 개발 확인에 포함하고 툴팁·표에 따로 표기합니다.`
              : ''}
          </p>
        </>
      )}
    </SubCard>
  );
}
