'use client';

/**
 * 액추에이터 리포트 섹션 — 포지션 맵 + 공급망 맵 + 공급사 표를 한 Panel 로 묶는다.
 * TechTrendShareView 에서 `report.domain === 'actuator'` 일 때 넣는다. 데이터는 useActuatorMap(['actuator-map']) 하나로 공유한다.
 */

import { Panel } from '@/components/ui';
import { ActuatorPositionMap } from './ActuatorPositionMap';
import { ActuatorSupplyChainMap } from './ActuatorSupplyChainMap';
import { ActuatorSupplierTable } from './ActuatorSupplierTable';
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

  const subtitle = data
    ? `로봇 ${data.stats.robots}기(스펙 완결 ${data.stats.complete}) · 공급사 제품 ${data.stats.suppliers}개 · 공급 관계 ${data.stats.edges}건 · 집계 ${fmtDateTime(data.generatedAt)}${data.cached ? ' (캐시)' : ''}`
    : query.isError
      ? 'DB 집계를 불러오지 못했습니다.'
      : 'ARGOS DB(humanoid_robots·body_specs·components·CI 매트릭스)에서 집계하는 중…';

  return (
    <Panel
      className="report-panel"
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
          <ActuatorPositionMap data={data} />
          <ActuatorSupplyChainMap edges={data.edges} robots={data.robots} />
          <ActuatorSupplierTable suppliers={data.suppliers} />
          <p className="text-[11px] text-ink-500 leading-relaxed">
            X축은 DB 필드(보행 방식·전신 DOF·손 DOF·최고 속도)만으로 계산한 지수이며, 액추에이터 타입은 components·CI '구동 방식' 근거가 있는 경우만 분류하고
            없으면 '미확인'으로 둡니다. 가격은 CI '가격대'·로봇 설명에 기록된 값만 사용합니다(범위는 세로 막대, 점은 기하 평균).
          </p>
        </div>
      )}
    </Panel>
  );
}
