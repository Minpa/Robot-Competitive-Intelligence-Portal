'use client';

import { Bot, Dog, Disc3, MoveDiagonal, Truck } from 'lucide-react';
import { useDesignerStore } from '../../stores/designer-store';
import type { FormFactorSummary, FormFactorId } from '../../types/robot';

const ICONS: Record<FormFactorId, any> = {
  biped: Bot,
  quadruped: Dog,
  wheeled: Disc3,
  cobot_arm: MoveDiagonal,
  mobile_manipulator: Truck,
};

interface FormFactorSelectorProps {
  formFactors: FormFactorSummary[];
  isLoading?: boolean;
}

export function FormFactorSelector({ formFactors, isLoading = false }: FormFactorSelectorProps) {
  const selectedId = useDesignerStore((s) => s.selectedFormFactorId);
  const select = useDesignerStore((s) => s.setSelectedFormFactor);

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[58px] bg-white/[0.03] border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5" data-testid="form-factor-list">
      {formFactors.map((f) => {
        const Icon = ICONS[f.id];
        const isActive = selectedId === f.id;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => select(f.id)}
            data-testid={`form-factor-${f.id}`}
            data-active={isActive}
            className={[
              'w-full text-left flex items-start gap-3 px-3 py-2.5 border transition-colors',
              isActive
                ? 'bg-white/[0.06] border-gold/60'
                : 'bg-[#0f0f0f] border-white/5 hover:border-white/20 hover:bg-white/[0.03]',
            ].join(' ')}
          >
            <Icon
              className={isActive ? 'w-4 h-4 mt-0.5 text-gold shrink-0' : 'w-4 h-4 mt-0.5 text-white/45 shrink-0'}
              strokeWidth={isActive ? 2.25 : 1.75}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] font-medium text-white">{f.nameKo}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                  {f.totalDof} DoF
                </span>
              </div>
              <p className="text-[10.5px] text-white/45 mt-0.5 line-clamp-2 leading-snug">
                {f.description}
              </p>
              <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
                <span>{f.heightM.toFixed(2)} m</span>
                <span>·</span>
                <span>payload {f.defaultPayloadKg} kg</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
