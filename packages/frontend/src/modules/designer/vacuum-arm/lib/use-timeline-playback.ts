/**
 * useTimelinePlayback — rAF 루프로 timeline.currentTime을 진행시키는 hook.
 *
 * isPlaying이 true가 되면 requestAnimationFrame 루프 시작.
 * 매 프레임 deltaSec 계산 → store.advanceTimeline(dt) 호출.
 * advanceTimeline은 currentTime + 파생 상태(robotXCm/yCm, armPose)를 한 번에 갱신.
 *
 * isPlaying이 false가 되면 rAF 정리.
 *
 * 한 곳에서만 mount되어야 함 (DesignerVacuumWorkbench가 적당). 여러 곳에서
 * mount하면 시간이 여러 번 진행됨.
 */

import { useEffect } from 'react';
import { useDesignerVacuumStore } from '../stores/designer-vacuum-store';

export function useTimelinePlayback() {
  const isPlaying = useDesignerVacuumStore((s) => s.timeline.isPlaying);
  const advanceTimeline = useDesignerVacuumStore((s) => s.advanceTimeline);

  useEffect(() => {
    if (!isPlaying) return;

    let raf = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      // 너무 큰 dt (탭 백그라운드 등) clamp — 한 프레임에 100ms 이상 점프 안 함
      const safeDt = Math.min(dt, 0.1);
      advanceTimeline(safeDt);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, advanceTimeline]);
}
