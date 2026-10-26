'use client';

/**
 * 액추에이터 공급사 제품 표 — products(type='actuator') + robot_components 에 연결되지 않은 components.
 * 제어 난이도 축이 정의되지 않는 부품 공급사라 표로만 제공한다. 타입 열은 DB 텍스트에서 추정한 값이다.
 * 시장 세그먼트는 공급사 기재 타깃 시장 + 키워드 규칙 분류이고, 공개 채택 사례는 같은 공급사·모델에 매칭된 외부 채택 사례다.
 */

import type { ActuatorAdoptionCase, ActuatorSupplierProduct } from '@/types/actuator-map';
import { cn } from '@/lib/utils';
import { SubCard } from '../timeline-shared';
import { SegmentSwatch } from './ActuatorSwatches';
import { fmtUSD, numText } from './actuator-map-layout';
import { SEGMENT_LABEL } from './actuator-sourcing';

const TH = 'text-left px-2 print:px-1 py-1.5 text-[11px] font-medium text-ink-600 whitespace-nowrap print:whitespace-normal border-b border-ink-200';
const TD = 'px-2 print:px-1 py-1.5 text-[12px] text-ink-800 border-b border-ink-100 align-top';
const NUM = 'text-right tabular-nums whitespace-nowrap print:whitespace-normal';

function adoptionCell(s: ActuatorSupplierProduct, byId: Map<string, ActuatorAdoptionCase>): string {
  const cases = s.adoptionIds.map((id) => byId.get(id)).filter((c): c is ActuatorAdoptionCase => !!c);
  if (cases.length === 0) return '—';
  const shown = cases.slice(0, 3).map((c) => c.robotName.replace(/\s*\([^)]*\)/g, ''));
  return `${cases.length}건: ${shown.join(', ')}${cases.length > 3 ? ` 외 ${cases.length - 3}건` : ''}`;
}

export function ActuatorSupplierTable({ suppliers, adoptions = [] }: { suppliers: ActuatorSupplierProduct[]; adoptions?: ActuatorAdoptionCase[] }) {
  const vendors = new Set(suppliers.map((s) => s.vendor.toLowerCase())).size;
  const byId = new Map(adoptions.map((c) => [c.id, c] as const));
  return (
    <SubCard
      title="액추에이터 공급사 커버리지"
      description={
        suppliers.length === 0
          ? 'ARGOS products/components 테이블에 등록된 액추에이터 공급사 제품이 없습니다.'
          : `공급사 ${vendors}개 · 제품 ${suppliers.length}개 (products type='actuator' + 로봇에 연결되지 않은 components). 타입은 DB 텍스트에서 추정한 값이고, 타깃 시장·세그먼트는 공급사 기재 + 키워드 규칙 분류입니다.`
      }
    >
      {suppliers.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-ink-400">표시할 공급사 제품이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse print:text-[10px]">
            <thead>
              <tr>
                <th className={TH}>공급사</th>
                <th className={TH}>국가</th>
                <th className={TH}>모델</th>
                <th className={TH}>타입(추정)</th>
                <th className={cn(TH, NUM)}>피크 토크 Nm</th>
                <th className={cn(TH, NUM)}>연속 토크 Nm</th>
                <th className={cn(TH, NUM)}>무게 kg</th>
                <th className={cn(TH, NUM)}>직경 mm</th>
                <th className={cn(TH, NUM)}>가격 USD</th>
                <th className={TH}>상태</th>
                <th className={TH}>타깃 시장</th>
                <th className={TH}>시장 세그먼트</th>
                <th className={TH}>공개 채택 사례</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, i) => (
                <tr key={`${s.vendor}-${s.model}-${i}`} className="break-inside-avoid">
                  <td className={cn(TD, 'font-medium whitespace-nowrap print:whitespace-normal')}>{s.vendor}</td>
                  <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal')}>{s.country ?? '—'}</td>
                  <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal')}>{s.model}</td>
                  <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal')}>{s.type}</td>
                  <td className={cn(TD, NUM)}>{numText(s.peakTorqueNm)}</td>
                  <td className={cn(TD, NUM)}>{numText(s.continuousTorqueNm)}</td>
                  <td className={cn(TD, NUM)}>{numText(s.weightKg)}</td>
                  <td className={cn(TD, NUM)}>{numText(s.diameterMm)}</td>
                  <td className={cn(TD, NUM)}>{s.priceUsd == null ? '—' : fmtUSD(s.priceUsd)}</td>
                  <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal')}>{s.status ?? '—'}</td>
                  <td className={cn(TD, 'min-w-[160px] print:min-w-[90px] text-ink-600')}>{s.targetMarket ?? '—'}</td>
                  <td className={cn(TD, 'min-w-[150px] print:min-w-[90px]')}>
                    <span className="inline-flex items-start gap-1.5">
                      <span className="mt-1">
                        <SegmentSwatch segment={s.segment} />
                      </span>
                      <span>
                        {SEGMENT_LABEL[s.segment]}
                        {s.segments.length > 1 && (
                          <span className="block text-[11px] text-ink-500">
                            그 외: {s.segments.filter((x) => x !== s.segment).map((x) => SEGMENT_LABEL[x]).join(', ')}
                          </span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className={cn(TD, 'min-w-[140px] print:min-w-[90px] text-ink-700')}>{adoptionCell(s, byId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SubCard>
  );
}
