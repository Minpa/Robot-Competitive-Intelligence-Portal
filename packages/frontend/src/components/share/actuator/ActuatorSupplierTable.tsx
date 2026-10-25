'use client';

/**
 * 액추에이터 공급사 제품 표 — products(type='actuator') + robot_components 에 연결되지 않은 components.
 * 제어 난이도 축이 정의되지 않는 부품 공급사라 표로만 제공한다. 타입 열은 DB 텍스트에서 추정한 값이다.
 */

import type { ActuatorSupplierProduct } from '@/types/actuator-map';
import { cn } from '@/lib/utils';
import { SubCard } from '../timeline-shared';
import { fmtUSD, numText } from './actuator-map-layout';

const TH = 'text-left px-2 py-1.5 text-[11px] font-medium text-ink-600 whitespace-nowrap print:whitespace-normal border-b border-ink-200';
const TD = 'px-2 py-1.5 text-[12px] text-ink-800 border-b border-ink-100 align-top';
const NUM = 'text-right tabular-nums whitespace-nowrap print:whitespace-normal';

export function ActuatorSupplierTable({ suppliers }: { suppliers: ActuatorSupplierProduct[] }) {
  const vendors = new Set(suppliers.map((s) => s.vendor.toLowerCase())).size;
  return (
    <SubCard
      title="액추에이터 공급사 커버리지"
      description={
        suppliers.length === 0
          ? 'ARGOS products/components 테이블에 등록된 액추에이터 공급사 제품이 없습니다.'
          : `공급사 ${vendors}개 · 제품 ${suppliers.length}개 (products type='actuator' + 로봇에 연결되지 않은 components). 타입은 DB 텍스트에서 추정한 값입니다.`
      }
    >
      {suppliers.length === 0 ? (
        <div className="py-6 text-center text-[13px] text-ink-400">표시할 공급사 제품이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse">
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
                <th className={TH}>근거</th>
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
                  <td className={cn(TD, 'min-w-[160px] text-ink-600')}>{s.targetMarket ?? '—'}</td>
                  <td className={cn(TD, 'whitespace-nowrap print:whitespace-normal text-ink-500')}>{s.source === 'products' ? 'products + product_specs' : 'components'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SubCard>
  );
}
