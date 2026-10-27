'use client';

/**
 * 액추에이터 리포트 섹션 — 조달 태세 요약(헤드라인) → 포지션 맵 → 조달 방식 보드 → 상세 공급망 그래프 토글(기본 접힘, 인쇄 제외) → 공급사 제품 맵 → 공급사 표 → 각주를 한 Panel 로 묶는다.
 * TechTrendShareView 에서 `report.domain === 'actuator'` 일 때 넣는다. 데이터는 useActuatorMap(['actuator-map']) 하나로 공유한다.
 */

import { useId, useMemo, useState } from 'react';
import { Panel } from '@/components/ui';
import { ActuatorPositionMap } from './ActuatorPositionMap';
import { ActuatorSourcingBoard } from './ActuatorSourcingBoard';
import { ActuatorSourcingSummary } from './ActuatorSourcingSummary';
import { ActuatorSupplierMarketMap } from './ActuatorSupplierMarketMap';
import { ActuatorSupplierTable } from './ActuatorSupplierTable';
import { ActuatorSupplyChainMap } from './ActuatorSupplyChainMap';
import { unregisteredVendorNames } from './actuator-supply-graph';
import { useActuatorMap } from './useActuatorMap';

function fmtDateTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function ActuatorMapSection() {
  const query = useActuatorMap();
  const data = query.data;
  // 상세 공급망 그래프 토글 — 기본 접힘(접힌 동안 마운트하지 않음), 상태는 저장하지 않는다
  const [detailOpen, setDetailOpen] = useState(false);
  const detailId = useId();

  const unregistered = useMemo(
    () => (data ? unregisteredVendorNames(data.edges, data.robots, data.adoptions, data.suppliers) : []),
    [data]
  );

  const subtitle = data
    ? `로봇 ${data.stats.robots}기(스펙 완결 ${data.stats.complete}) · 공급사 제품 ${data.stats.suppliers}개 · 공급 관계 ${data.stats.edges}건 · 수요 사례 ${data.stats.adoptions}건 · 집계 ${fmtDateTime(data.generatedAt)}${data.cached ? ' (캐시)' : ''}`
    : query.isError
      ? 'DB 집계를 불러오지 못했습니다.'
      : 'ARGOS DB(humanoid_robots·body_specs·components·CI 매트릭스)에서 집계하는 중…';

  return (
    <Panel
      className="print:block print:overflow-visible"
      kicker="Actuator · Position & Supply Chain"
      title="액추에이터 관점 경쟁사 포지션·공급망 맵"
      subtitle={subtitle}
    >
      {query.isLoading && <div className="py-8 text-center text-[13px] text-ink-400">집계 중…</div>}
      {query.isError && (
        <div className="py-8 flex flex-col items-center gap-3 text-sm">
          <p className="text-ink-600">포지션 맵 데이터를 불러오지 못했습니다</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="no-print px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors"
          >
            재시도
          </button>
        </div>
      )}
      {data && (
        <div className="flex flex-col gap-4">
          <ActuatorSourcingSummary data={data} />
          <ActuatorPositionMap data={data} />
          <ActuatorSourcingBoard data={data} />
          <div className="no-print flex flex-col gap-4">
            <div>
              <button
                type="button"
                aria-expanded={detailOpen}
                aria-controls={detailId}
                onClick={() => setDetailOpen((v) => !v)}
                className="px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors"
              >
                {detailOpen ? '상세 공급망 그래프 숨기기' : '상세 공급망 그래프 보기'}
              </button>
            </div>
            <div id={detailId}>
              {detailOpen && (
                <ActuatorSupplyChainMap
                  edges={data.edges}
                  robots={data.robots}
                  adoptions={data.adoptions}
                  vendorMarkets={data.vendorMarkets}
                  suppliers={data.suppliers}
                  segmentOrder={data.segmentOrder}
                />
              )}
            </div>
          </div>
          <ActuatorSupplierMarketMap suppliers={data.suppliers} adoptions={data.adoptions} segmentOrder={data.segmentOrder} />
          <ActuatorSupplierTable suppliers={data.suppliers} adoptions={data.adoptions} />
          <p className="text-[11px] text-ink-500 leading-relaxed">
            X축은 DB 필드(보행 방식·전신 DOF·손 DOF·최고 속도)만으로 계산한 지수이며, 액추에이터 타입은 components·CI '구동 방식' 근거가 있는 경우만 분류하고
            없으면 '미확인'으로 둡니다. 가격은 CI '가격대'·로봇 설명에 기록된 값만 사용합니다(범위는 세로 막대, 점은 기하 평균).
          </p>
          <p className="text-[11px] text-ink-500 leading-relaxed">
            조달 태세: 자체 개발 확인은 근거 등급 A·B가 있는 경우만 세고, C·D 등급이거나 근거가 없으면 확인 불가로 둡니다(자체 개발로 추정되는 로봇은 별도 표기). 외부 조달에는 일부만 외부에서 조달하는 혼합을 포함하며,
            모듈(통합 관절)은 자체 설계이고 부품(모터·감속기)만 외부에서 조달하는 경우는 자체 개발 확인으로 두고 부품 외부 조달을 따로 적습니다. 수요 사례는 외부 액추에이터를 쓰는 공개 채택 사례이며 공급 계약 여부는 별도입니다.
            시장 세그먼트는 공급사 기재 타깃 시장과 키워드 규칙으로 분류했고 (가설)을 포함합니다.
            {unregistered.length > 0 && ` 제품 스펙 미등록 공급사 ${unregistered.length}개(${unregistered.join(', ')})는 상세 공급망 그래프에만 표시하며 공급사 제품 맵·표에는 없습니다.`}
          </p>
        </div>
      )}
    </Panel>
  );
}
