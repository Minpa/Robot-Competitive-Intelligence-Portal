'use client';

import { Weight } from 'lucide-react';
import { useDesignerStore } from '../../stores/designer-store';

export function PayloadPanel() {
  const payloadKg = useDesignerStore((s) => s.payloadKg);
  const setPayloadKg = useDesignerStore((s) => s.setPayloadKg);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Weight className="w-3.5 h-3.5 text-gold" strokeWidth={2} />
        <div className="flex flex-col">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-gold">
            Payload
          </span>
          <span className="text-[11px] text-white/55 mt-0.5">REQ-4 · 페이로드</span>
        </div>
      </div>
      <div className="px-1">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[11px] text-white/55">목표 페이로드</span>
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-white">
            {payloadKg.toFixed(1)} kg
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          step={0.5}
          value={payloadKg}
          onChange={(e) => setPayloadKg(Number(e.target.value))}
          className="w-full accent-gold"
        />
        <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-white/30 mt-1">
          <span>0</span>
          <span>15</span>
          <span>30 kg</span>
        </div>
      </div>
    </div>
  );
}
