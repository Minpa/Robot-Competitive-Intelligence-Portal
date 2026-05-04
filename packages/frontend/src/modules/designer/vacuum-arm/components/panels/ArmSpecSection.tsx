'use client';

/**
 * ArmSpecSection · REQ-2 (팔 1~2개의 9변수 입력)
 *
 * 9 spec variables per arm (spec §4.2):
 *   1. mountPosition (center/front/left/right)
 *   2. shoulderHeightAboveBaseCm (0~20)
 *   3. shoulderActuatorSku
 *   4. upperArmLengthCm L1 (15~40)
 *   5. elbowActuatorSku
 *   6. forearmLengthCm L2 (15~40)
 *   7. wristDof (0~3)
 *   8. endEffectorSku
 *   (mountPosition counts once; 8 controls + count toggle = 9 vars)
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import type { ArmMountPosition, ActuatorSpec, EndEffectorSpec } from '../../types/product';

const MOUNT_OPTIONS: Array<{ value: ArmMountPosition; label: string }> = [
  { value: 'center', label: '중앙' },
  { value: 'front', label: '전면' },
  { value: 'left', label: '좌측' },
  { value: 'right', label: '우측' },
];

interface ArmSpecSectionProps {
  index: number;
  defaultOpen?: boolean;
  actuators: ActuatorSpec[];
  endEffectors: EndEffectorSpec[];
}

interface SliderRowProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}
function SliderRow({ label, value, unit, min, max, step, onChange }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-white/75">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-white">
          {step < 1 ? value.toFixed(1) : Math.round(value)}
          <span className="ml-1 text-white/40">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-gold cursor-pointer"
        aria-label={label}
      />
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-white/35">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function ArmSpecSection({ index, defaultOpen = true, actuators, endEffectors }: ArmSpecSectionProps) {
  const arm = useDesignerVacuumStore((s) => s.product.arms[index]);
  const updateArm = useDesignerVacuumStore((s) => s.updateArm);
  const setArmMount = useDesignerVacuumStore((s) => s.setArmMount);
  const [open, setOpen] = useState(defaultOpen);

  if (!arm) return null;

  const armNum = index + 1;
  const totalReach = arm.upperArmLengthCm + arm.forearmLengthCm;

  return (
    <div className="border-t border-white/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3 w-3 text-white/45" strokeWidth={2.2} />
          ) : (
            <ChevronRight className="h-3 w-3 text-white/45" strokeWidth={2.2} />
          )}
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/70">
            팔 {armNum} (Manipulator Arm)
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold/75 px-1.5 py-0.5 border border-gold/30">
          리치 {totalReach.toFixed(0)}cm · {arm.wristDof + 2}DOF
        </span>
      </button>

      {open ? (
        <div className="space-y-3 pb-4">
          {/* 1. mount position */}
          <div>
            <span className="text-[12px] text-white/75">마운트 위치</span>
            <div className="mt-1.5 grid grid-cols-4 gap-1">
              {MOUNT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setArmMount(index, opt.value)}
                  className={[
                    'border py-1.5 transition-colors font-mono text-[10.5px] uppercase tracking-[0.18em]',
                    arm.mountPosition === opt.value
                      ? 'border-gold bg-[#1a1408] text-white'
                      : 'border-white/10 bg-[#0a0a0a] text-white/55 hover:border-white/30 hover:text-white',
                  ].join(' ')}
                  aria-pressed={arm.mountPosition === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. shoulder height */}
          <SliderRow
            label="어깨 높이 (베이스 위)"
            value={arm.shoulderHeightAboveBaseCm}
            unit="cm"
            min={0}
            max={20}
            step={0.5}
            onChange={(v) => updateArm(index, { shoulderHeightAboveBaseCm: v })}
          />

          {/* 3. shoulder actuator */}
          <ActuatorSelect
            label="어깨 액추에이터"
            value={arm.shoulderActuatorSku}
            actuators={actuators}
            onChange={(sku) => updateArm(index, { shoulderActuatorSku: sku })}
          />

          {/* 4. L1 */}
          <SliderRow
            label="상완 길이 (L1)"
            value={arm.upperArmLengthCm}
            unit="cm"
            min={15}
            max={40}
            step={0.5}
            onChange={(v) => updateArm(index, { upperArmLengthCm: v })}
          />

          {/* 5. elbow actuator */}
          <ActuatorSelect
            label="팔꿈치 액추에이터"
            value={arm.elbowActuatorSku}
            actuators={actuators}
            onChange={(sku) => updateArm(index, { elbowActuatorSku: sku })}
          />

          {/* 6. L2 */}
          <SliderRow
            label="전완 길이 (L2)"
            value={arm.forearmLengthCm}
            unit="cm"
            min={15}
            max={40}
            step={0.5}
            onChange={(v) => updateArm(index, { forearmLengthCm: v })}
          />

          {/* 7. wrist DOF */}
          <SliderRow
            label="손목 DOF"
            value={arm.wristDof}
            unit=""
            min={0}
            max={3}
            step={1}
            onChange={(v) => updateArm(index, { wristDof: v })}
          />

          {/* 8. end-effector */}
          <EndEffectorSelect
            label="엔드이펙터"
            value={arm.endEffectorSku}
            endEffectors={endEffectors}
            onChange={(sku) => updateArm(index, { endEffectorSku: sku })}
          />
        </div>
      ) : null}
    </div>
  );
}

function ActuatorSelect({
  label,
  value,
  actuators,
  onChange,
}: {
  label: string;
  value: string;
  actuators: ActuatorSpec[];
  onChange: (sku: string) => void;
}) {
  const current = actuators.find((a) => a.sku === value);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-white/75">{label}</span>
        {current ? (
          <span className="font-mono text-[11px] tabular-nums text-white/60">
            {current.peakTorqueNm.toFixed(0)}Nm · {current.weightG}g
          </span>
        ) : null}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-[#0a0a0a] border border-white/15 px-2 py-1.5 text-[12px] text-white focus:border-gold focus:outline-none cursor-pointer"
        aria-label={label}
      >
        {actuators.length === 0 ? (
          <option value={value}>(카탈로그 로딩…)</option>
        ) : (
          actuators.map((a) => (
            <option key={a.sku} value={a.sku}>
              {a.modelName} — {a.peakTorqueNm.toFixed(0)}Nm
            </option>
          ))
        )}
      </select>
    </div>
  );
}

function EndEffectorSelect({
  label,
  value,
  endEffectors,
  onChange,
}: {
  label: string;
  value: string;
  endEffectors: EndEffectorSpec[];
  onChange: (sku: string) => void;
}) {
  const current = endEffectors.find((e) => e.sku === value);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-white/75">{label}</span>
        {current ? (
          <span className="font-mono text-[11px] tabular-nums text-white/60">
            ≤{current.maxPayloadKg.toFixed(1)}kg · {current.weightG}g
          </span>
        ) : null}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-[#0a0a0a] border border-white/15 px-2 py-1.5 text-[12px] text-white focus:border-gold focus:outline-none cursor-pointer"
        aria-label={label}
      >
        {endEffectors.length === 0 ? (
          <option value={value}>(카탈로그 로딩…)</option>
        ) : (
          endEffectors.map((e) => (
            <option key={e.sku} value={e.sku}>
              {e.name} — ≤{e.maxPayloadKg.toFixed(1)}kg
            </option>
          ))
        )}
      </select>
    </div>
  );
}
