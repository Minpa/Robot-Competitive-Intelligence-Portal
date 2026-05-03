/**
 * useEvalEngine — 시나리오 재생 중 자동 평가 엔진.
 *
 * isPlaying이 true가 되면 시작:
 *   - 매 200ms 토크/ZMP 체크 → fail 발견 시 evalIssuesInProgress에 추가
 *   - GRAB 끝날 때마다 reach 체크 (heldTargetIndex 검사)
 *   - 재생 끝나거나 isPlaying false가 되면 finalizeEval (specSummary와 함께)
 *
 * 시나리오가 active일 때만 작동 (수동 timeline은 평가 안 함).
 */

import { useEffect, useRef } from 'react';
import { useDesignerVacuumStore } from '../stores/designer-vacuum-store';
import { computeArmStatics, computeStability } from './client-statics';
import type { EvalIssue, ActuatorSpec, EndEffectorSpec } from '../types/product';

interface EvalEngineProps {
  actuators: ActuatorSpec[];
  endEffectors: EndEffectorSpec[];
}

export function useEvalEngine({ actuators, endEffectors }: EvalEngineProps) {
  const isPlaying = useDesignerVacuumStore((s) => s.timeline.isPlaying);
  const activeScenarioId = useDesignerVacuumStore((s) => s.activeScenarioId);
  const startEval = useDesignerVacuumStore((s) => s.startEval);
  const addEvalIssue = useDesignerVacuumStore((s) => s.addEvalIssue);
  const finalizeEval = useDesignerVacuumStore((s) => s.finalizeEval);

  const tickRef = useRef<{
    lastCheck: number;
    checkedGrabs: Set<string>;
    sawTorqueFail: boolean;
    sawZmpFail: boolean;
    maxTimeReached: number;
  }>({
    lastCheck: 0,
    checkedGrabs: new Set(),
    sawTorqueFail: false,
    sawZmpFail: false,
    maxTimeReached: 0,
  });

  useEffect(() => {
    // 시나리오 active + 재생 시작 → 평가 init
    if (!isPlaying || !activeScenarioId) return;

    startEval();
    tickRef.current = {
      lastCheck: 0,
      checkedGrabs: new Set(),
      sawTorqueFail: false,
      sawZmpFail: false,
      maxTimeReached: 0,
    };

    let raf = 0;
    const tick = () => {
      const state = useDesignerVacuumStore.getState();
      const t = state.timeline.currentTime;
      const now = performance.now();

      // max 도달 시간 추적 (loop되어도 정확한 playback span 표시)
      if (t > tickRef.current.maxTimeReached) {
        tickRef.current.maxTimeReached = t;
      }

      // 1. GRAB END 시 reach 체크 — 한 GRAB당 한 번만
      for (const g of state.timeline.gestures) {
        if (g.type !== 'GRAB') continue;
        if (tickRef.current.checkedGrabs.has(g.id)) continue;
        if (t >= g.t + g.durationSec) {
          tickRef.current.checkedGrabs.add(g.id);
          if (state.heldTargetIndex === null) {
            addEvalIssue({
              severity: 'fail',
              timeSec: t,
              category: 'reach',
              message:
                `GRAB 시점 (t=${(g.t + g.durationSec).toFixed(1)}s)에 잡은 타겟 없음 — ` +
                `그리퍼가 반경(18cm) 안 target에 도달 못 함`,
              recommendation:
                '로봇을 target에 더 가까이 이동, 또는 팔 길이(L1+L2) 증가, ' +
                '또는 어깨 피치를 더 크게 (180°까지) 해서 바닥 reach 확보',
            });
          }
        }
      }

      // 2. ~200ms마다 토크/ZMP 체크
      if (now - tickRef.current.lastCheck > 200) {
        tickRef.current.lastCheck = now;
        const arm = state.product.arms[0];
        if (arm) {
          const ee = endEffectors.find((e) => e.sku === arm.endEffectorSku);
          const eeKg = ee ? ee.weightG / 1000 : 0.05;
          const armStatics = computeArmStatics(arm, state.payloadKg, eeKg, 0, actuators);
          // 토크 한계 초과 검사
          for (const j of armStatics.statics.joints) {
            if (j.overLimit && !tickRef.current.sawTorqueFail) {
              tickRef.current.sawTorqueFail = true;
              addEvalIssue({
                severity: 'fail',
                timeSec: t,
                category: 'torque',
                message:
                  `${j.jointName} 모터 토크 한계 초과 — 요구 ${j.requiredPeakTorqueNm.toFixed(1)}Nm > ` +
                  `한계 ${j.actuatorPeakTorqueNm.toFixed(1)}Nm (마진 ${j.marginPct.toFixed(0)}%)`,
                recommendation:
                  '더 강한 액추에이터로 교체 (예: AK60-12 9Nm → AK70-10 16Nm), ' +
                  '또는 페이로드 감소, 또는 팔 길이 (특히 forearm L2) 단축',
              });
            }
          }
          // ZMP 안정성
          const stability = computeStability(state.product.base, state.product.arms, state.payloadKg, [eeKg]);
          if (!stability.isStable && !tickRef.current.sawZmpFail) {
            tickRef.current.sawZmpFail = true;
            addEvalIssue({
              severity: 'fail',
              timeSec: t,
              category: 'stability',
              message:
                `ZMP 안정성 위반 — 무게중심이 base footprint 밖 ` +
                `(margin ${stability.marginToEdgeCm.toFixed(1)}cm)`,
              recommendation:
                '베이스 직경 증가, 베이스 무게 증가, 또는 팔/페이로드 reach 감소. ' +
                '또는 mount 위치를 center로 변경 (front/side는 비대칭 → 전복 위험 ↑)',
            });
          }
        }
      }

      // 3. 시나리오 평가는 1 cycle만 — duration 도달하면 자동 stop
      // (loop되면 결과가 계속 갱신되어 혼란)
      // maxTimeReached로 거의 끝까지 갔는지 판단 (loop 직후 t≈0인 경우 max는 ≈duration)
      if (
        tickRef.current.maxTimeReached >= state.timeline.duration - 0.5 &&
        t < 1.0 // loop 직후 (다시 0 근처로 돌아옴)
      ) {
        // 한 cycle 완료 → 자동 정지
        useDesignerVacuumStore.getState().setTimelinePlaying(false);
        return; // raf 재예약 안 함 (effect cleanup이 실행되면서 finalize)
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      // 재생 종료 시 finalize. durationSec은 maxTimeReached 사용 (loop 후
      // currentTime이 0으로 돌아와도 정확한 playback span 표시).
      const state = useDesignerVacuumStore.getState();
      const arm = state.product.arms[0];
      const armSku = arm
        ? `L1=${arm.upperArmLengthCm}cm L2=${arm.forearmLengthCm}cm ` +
          `${arm.shoulderActuatorSku} ${arm.endEffectorSku}`
        : '(no arm)';
      const baseSummary = `${state.product.base.shape} ${state.product.base.diameterOrWidthCm}cm`;
      const span = Math.max(tickRef.current.maxTimeReached, state.timeline.currentTime);
      finalizeEval(span, `${baseSummary} | ${armSku} | payload ${state.payloadKg}kg`);
    };
  }, [isPlaying, activeScenarioId, startEval, addEvalIssue, finalizeEval, actuators, endEffectors]);
}
