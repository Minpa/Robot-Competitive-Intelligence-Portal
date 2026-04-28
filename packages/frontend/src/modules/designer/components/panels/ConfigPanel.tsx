'use client';

import { Wrench, RotateCw, Tag, Eye } from 'lucide-react';
import { useDesignerStore } from '../../stores/designer-store';
import { FormFactorSelector } from './FormFactorSelector';
import { CameraPanel } from './CameraPanel';
import { PayloadPanel } from './PayloadPanel';
import type { FormFactorSummary, SensorSpec } from '../../types/robot';

interface ConfigPanelProps {
  formFactors: FormFactorSummary[];
  sensors: SensorSpec[];
  isLoading: boolean;
}

export function ConfigPanel({ formFactors, sensors, isLoading }: ConfigPanelProps) {
  const autoRotate = useDesignerStore((s) => s.viewportAutoRotate);
  const showLabels = useDesignerStore((s) => s.showLabels);
  const showFovCones = useDesignerStore((s) => s.showFovCones);
  const toggleAutoRotate = useDesignerStore((s) => s.toggleAutoRotate);
  const toggleLabels = useDesignerStore((s) => s.toggleLabels);
  const toggleFovCones = useDesignerStore((s) => s.toggleFovCones);

  return (
    <div className="flex flex-col gap-5">
      <Section icon={Wrench} label="Form Factor" subtitle="REQ-1 · 폼팩터">
        <FormFactorSelector formFactors={formFactors} isLoading={isLoading} />
      </Section>

      <CameraPanel sensors={sensors} isLoading={isLoading} />

      <PayloadPanel />

      <Section icon={RotateCw} label="Viewport" subtitle="뷰포트 옵션">
        <div className="space-y-1">
          <Toggle label="자동 회전" pressed={autoRotate} onPress={toggleAutoRotate} icon={RotateCw} />
          <Toggle label="조인트 라벨" pressed={showLabels} onPress={toggleLabels} icon={Tag} />
          <Toggle label="FoV cone 표시" pressed={showFovCones} onPress={toggleFovCones} icon={Eye} />
        </div>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  label,
  subtitle,
  children,
}: {
  icon: any;
  label: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-gold" strokeWidth={2} />
        <div className="flex flex-col">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-gold">
            {label}
          </span>
          <span className="text-[11px] text-white/55 mt-0.5">{subtitle}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function Toggle({
  label,
  pressed,
  onPress,
  icon: Icon,
}: {
  label: string;
  pressed: boolean;
  onPress: () => void;
  icon?: any;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={pressed}
      className={[
        'w-full flex items-center justify-between px-3 py-2 border text-[11.5px]',
        pressed
          ? 'bg-white/[0.06] border-gold/50 text-white'
          : 'bg-[#0f0f0f] border-white/5 text-white/65 hover:border-white/20 hover:text-white',
      ].join(' ')}
    >
      <span className="flex items-center gap-2">
        {Icon ? <Icon className="w-3.5 h-3.5" strokeWidth={1.75} /> : null}
        {label}
      </span>
      <span
        className={[
          'font-mono text-[9px] uppercase tracking-[0.18em]',
          pressed ? 'text-gold' : 'text-white/30',
        ].join(' ')}
      >
        {pressed ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}
