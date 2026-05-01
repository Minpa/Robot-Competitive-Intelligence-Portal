'use client';

/**
 * DesignerVacuumWorkbench · REQ-1 + REQ-2
 *
 * 3-pane shell. Left: SpecParametersPanel. Center: 3D viewport.
 * Right: placeholder for EngineeringAnalysisPanel (REQ-4) and EnvironmentPanel
 * (REQ-7). Bottom: placeholder for EngineeringReviewPanel (REQ-10).
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useDesignerVacuumStore } from '../stores/designer-vacuum-store';
import { designerVacuumApi } from '../api/designer-vacuum-api';
import { SpecParametersPanel } from './panels/SpecParametersPanel';
import { EngineeringAnalysisPanel } from './panels/EngineeringAnalysisPanel';

const RobotViewport = dynamic(
  () => import('./viewport3d/RobotViewport').then((m) => m.RobotViewport),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
        Loading viewport…
      </div>
    ),
  }
);

/** Light debounce hook (no extra deps). */
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function DesignerVacuumWorkbench() {
  const product = useDesignerVacuumStore((s) => s.product);
  const payloadKg = useDesignerVacuumStore((s) => s.payloadKg);
  const autoRotate = useDesignerVacuumStore((s) => s.viewportAutoRotate);
  const showLabels = useDesignerVacuumStore((s) => s.showLabels);
  const showWorkspaceMesh = useDesignerVacuumStore((s) => s.showWorkspaceMesh);
  const showZmp = useDesignerVacuumStore((s) => s.showZmp);
  const toggleAutoRotate = useDesignerVacuumStore((s) => s.toggleAutoRotate);
  const toggleLabels = useDesignerVacuumStore((s) => s.toggleLabels);
  const toggleWorkspaceMesh = useDesignerVacuumStore((s) => s.toggleWorkspaceMesh);
  const toggleZmp = useDesignerVacuumStore((s) => s.toggleZmp);

  // Viewport debounce — slider-induced rebuilds settle before scene rebuilds.
  const debouncedProduct = useDebounced(product, 200);
  const debouncedPayload = useDebounced(payloadKg, 250);

  // REQ-4: analyze whenever product or payload changes (debounced)
  const analyzeQ = useQuery({
    queryKey: ['vacuum-arm', 'analyze', debouncedProduct, debouncedPayload],
    queryFn: () => designerVacuumApi.analyze(debouncedProduct, debouncedPayload),
    enabled: debouncedProduct.arms.length > 0,
    staleTime: 2_000,
  });

  // End-effector catalog so the viewport can adapt tip scale to payload.
  const endEffectorsQ = useQuery({
    queryKey: ['vacuum-arm', 'end-effectors'],
    queryFn: () => designerVacuumApi.listEndEffectors(),
    staleTime: 5 * 60_000,
  });
  const endEffectors = endEffectorsQ.data?.endEffectors ?? [];

  const { base, arms, name } = debouncedProduct;
  const armCount = arms.length;

  return (
    <>
      <div className="grid flex-1 grid-cols-12 gap-px bg-white/5 p-px min-h-[640px]">
        {/* Left: SpecParametersPanel */}
        <aside
          className="col-span-3 overflow-y-auto bg-[#0a0a0a] p-5"
          style={{ maxHeight: '100%' }}
        >
          <SpecParametersPanel />
        </aside>

        {/* Center: 3D Viewport */}
        <section className="col-span-6 relative bg-[#050505]">
          <div className="absolute left-3 top-3 z-10 font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
            Three.js Viewport · OrbitControls
          </div>
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/55 px-2 py-1 border border-white/15 bg-black/40">
              {base.shape} · {base.diameterOrWidthCm.toFixed(0)}×{base.heightCm.toFixed(0)} cm · {base.weightKg.toFixed(1)}kg
            </span>
            {armCount > 0 ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gold/80 px-2 py-1 border border-gold/40 bg-black/40">
                팔 {armCount}개
              </span>
            ) : null}
            {armCount > 0 ? (
              <>
                <button
                  type="button"
                  onClick={toggleWorkspaceMesh}
                  className={[
                    'font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-1 border bg-black/40 transition-colors',
                    showWorkspaceMesh
                      ? 'border-gold/60 text-gold'
                      : 'border-white/15 text-white/55 hover:border-white/30 hover:text-white',
                  ].join(' ')}
                  aria-pressed={showWorkspaceMesh}
                  title="Toggle workspace mesh (REQ-3)"
                >
                  ◑ workspace
                </button>
                <button
                  type="button"
                  onClick={toggleZmp}
                  className={[
                    'font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-1 border bg-black/40 transition-colors',
                    showZmp
                      ? 'border-gold/60 text-gold'
                      : 'border-white/15 text-white/55 hover:border-white/30 hover:text-white',
                  ].join(' ')}
                  aria-pressed={showZmp}
                  title="Toggle ZMP overlay (REQ-5)"
                >
                  ◎ ZMP
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={toggleAutoRotate}
              className={[
                'font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-1 border bg-black/40 transition-colors',
                autoRotate
                  ? 'border-gold/60 text-gold'
                  : 'border-white/15 text-white/55 hover:border-white/30 hover:text-white',
              ].join(' ')}
              aria-pressed={autoRotate}
              title="Auto-rotate"
            >
              ⟳ rotate
            </button>
            <button
              type="button"
              onClick={toggleLabels}
              className={[
                'font-mono text-[9px] uppercase tracking-[0.18em] px-2 py-1 border bg-black/40 transition-colors',
                showLabels
                  ? 'border-gold/60 text-gold'
                  : 'border-white/15 text-white/55 hover:border-white/30 hover:text-white',
              ].join(' ')}
              aria-pressed={showLabels}
              title="Toggle labels"
            >
              labels
            </button>
          </div>
          <div className="absolute left-3 bottom-3 z-10 font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
            {name}
          </div>
          <div className="absolute inset-0">
            <RobotViewport
              base={base}
              arms={arms}
              endEffectors={endEffectors}
              stability={analyzeQ.data?.stability ?? null}
              autoRotate={autoRotate}
              showLabels={showLabels}
              showWorkspaceMesh={showWorkspaceMesh}
              showZmp={showZmp}
            />
          </div>
        </section>

        {/* Right: EngineeringAnalysisPanel (REQ-4) */}
        <aside
          className="col-span-3 overflow-y-auto bg-[#0a0a0a] p-5"
          style={{ maxHeight: '100%' }}
        >
          <EngineeringAnalysisPanel
            base={base}
            arms={arms}
            analysis={analyzeQ.data?.arms ?? []}
            stability={analyzeQ.data?.stability ?? null}
            payloadKg={debouncedPayload}
            isLoading={analyzeQ.isFetching}
            isError={analyzeQ.isError}
            errorMessage={(analyzeQ.error as Error | null)?.message}
          />
        </aside>
      </div>

      {/* Bottom: review panel placeholder */}
      <div className="border-t border-white/10 bg-[#0a0a0a] px-6 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
          Engineering Review · REQ-10 예정
        </span>
        <p className="mt-1 text-[11px] text-white/45">
          Claude API 기반 검토 의견 + PDF 사양서 출력은 REQ-10에서 추가됩니다.
        </p>
      </div>
    </>
  );
}

