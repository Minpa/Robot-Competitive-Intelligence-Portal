'use client';

import { AlertTriangle, Cpu } from 'lucide-react';
import type { ActuatorRecommendation } from '../../types/robot';

interface ActuatorRecommendationsProps {
  recommendations: ActuatorRecommendation[];
  isLoading: boolean;
}

export function ActuatorRecommendations({ recommendations, isLoading }: ActuatorRecommendationsProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[58px] bg-white/[0.03] border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return <p className="text-[11px] text-white/40">평가 결과가 없습니다.</p>;
  }

  // Highlight the joint with the highest required torque
  const topJoint = [...recommendations].sort(
    (a, b) => b.requiredPeakTorqueNm - a.requiredPeakTorqueNm
  )[0];

  if (!topJoint) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 px-3 py-2 bg-[#2a1a0d] border border-[#E63950]/30">
        <AlertTriangle className="w-3.5 h-3.5 text-[#E63950] mt-0.5 shrink-0" strokeWidth={2} />
        <p className="text-[10.5px] text-white/75 leading-relaxed">
          이 부품은 모두 가상 데이터입니다. <code className="font-mono text-[10px] text-[#E63950]">isMock=true</code> · Phase 1 가드레일.
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold">
            Top joint · {topJoint.jointId}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">
            req {topJoint.requiredPeakTorqueNm.toFixed(1)} Nm
          </span>
        </div>
        <div className="space-y-1.5">
          {topJoint.candidates.length === 0 ? (
            <p className="text-[11px] text-[#E63950]">
              안전 마진 1.3×를 만족하는 액추에이터가 카탈로그에 없습니다.
            </p>
          ) : (
            topJoint.candidates.map((cand) => (
              <div
                key={cand.actuator.sku}
                className="flex items-center justify-between px-3 py-2 bg-[#0f0f0f] border border-white/5 hover:border-white/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Cpu className="w-3.5 h-3.5 text-gold/70 shrink-0" strokeWidth={1.75} />
                  <div className="min-w-0">
                    <p className="text-[11.5px] text-white truncate">
                      {cand.actuator.modelName}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">
                      {cand.actuator.vendor} · {cand.actuator.type} · {cand.actuator.weightG}g
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gold">
                    {cand.actuator.peakTorqueNm} Nm
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/45">
                    ×{cand.headroomRatio} headroom · ${cand.actuator.priceUsdEstimated}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
