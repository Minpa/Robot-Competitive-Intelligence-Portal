'use client';

import { Camera } from 'lucide-react';
import { useDesignerStore } from '../../stores/designer-store';
import type { CameraPosition, SensorSpec } from '../../types/robot';

const POSITIONS: { id: CameraPosition; label: string }[] = [
  { id: 'head', label: '머리' },
  { id: 'chest', label: '가슴' },
  { id: 'arm_left', label: '좌팔' },
  { id: 'arm_right', label: '우팔' },
];

interface CameraPanelProps {
  sensors: SensorSpec[];
  isLoading: boolean;
}

export function CameraPanel({ sensors, isLoading }: CameraPanelProps) {
  const cameras = useDesignerStore((s) => s.cameras);
  const toggle = useDesignerStore((s) => s.toggleCameraPosition);
  const setSensor = useDesignerStore((s) => s.setCameraSensor);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-3.5 h-3.5 text-gold" strokeWidth={2} />
        <div className="flex flex-col">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-gold">
            Cameras
          </span>
          <span className="text-[11px] text-white/55 mt-0.5">REQ-2 · 카메라 + FoV</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {POSITIONS.map((p) => {
          const mount = cameras.find((c) => c.position === p.id);
          const enabled = !!mount;
          return (
            <div
              key={p.id}
              className={[
                'border',
                enabled ? 'border-gold/50 bg-white/[0.04]' : 'border-white/5 bg-[#0f0f0f]',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-[11.5px]"
              >
                <span className="flex items-center gap-2 text-white">{p.label}</span>
                <span
                  className={[
                    'font-mono text-[9px] uppercase tracking-[0.18em]',
                    enabled ? 'text-gold' : 'text-white/30',
                  ].join(' ')}
                >
                  {enabled ? 'ON' : 'OFF'}
                </span>
              </button>
              {enabled ? (
                <select
                  value={mount.sensorSku}
                  onChange={(e) => setSensor(p.id, e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[#050505] border-t border-white/10 px-3 py-1.5 text-[11px] text-white/80 font-mono focus:outline-none focus:border-gold/40"
                >
                  {sensors.map((s) => (
                    <option key={s.sku} value={s.sku} className="bg-[#0a0a0a]">
                      {s.sku} · {s.fovHorizontalDeg}°×{s.fovVerticalDeg}°
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
