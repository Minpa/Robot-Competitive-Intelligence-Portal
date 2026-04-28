'use client';

import type { PayloadLimitResult } from '../../types/robot';

interface PayloadGaugeProps {
  payloadKg: number;
  limit: PayloadLimitResult | null;
}

export function PayloadGauge({ payloadKg, limit }: PayloadGaugeProps) {
  if (!limit) {
    return <p className="text-[11px] text-white/40">평가 후 표시됩니다.</p>;
  }

  const ratio = Math.min(1, payloadKg / Math.max(limit.payloadLimitKg, 0.1));
  const overLimit = payloadKg > limit.payloadLimitKg;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] text-white/55">현재 / 한계</span>
        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-white">
          {payloadKg.toFixed(1)} / {limit.payloadLimitKg.toFixed(1)} kg
        </span>
      </div>
      <div className="relative h-2 bg-white/5 overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, ratio * 100)}%`,
            backgroundColor: overLimit ? '#E63950' : ratio > 0.85 ? '#F2A93B' : '#7CCBA2',
          }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
        <span>제한 관절: {limit.limitingJointId}</span>
        <span>safety {limit.safetyFactor}×</span>
      </div>
      {overLimit ? (
        <p className="text-[10.5px] text-[#E63950]">
          페이로드가 한계를 초과합니다. {limit.limitingJointId} 액추에이터 등급 상향 권장.
        </p>
      ) : null}
    </div>
  );
}
