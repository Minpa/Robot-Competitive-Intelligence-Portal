'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation } from '@tanstack/react-query';
import { designerApi } from '../api/designer-api';
import { useDesignerStore } from '../stores/designer-store';
import { ConfigPanel } from './panels/ConfigPanel';
import { AnalysisPanel } from './panels/AnalysisPanel';
import { CoachingPanel } from './panels/CoachingPanel';
import type { CoachingResponse, EvaluationRequest, EvaluationResult, ActuatorRecommendation } from '../types/robot';

const RobotViewport = dynamic(
  () => import('./viewport/RobotViewport').then((m) => m.RobotViewport),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-white/35 font-mono text-[10px] uppercase tracking-[0.22em]">
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

export function DesignerWorkbench() {
  // ── catalog (REQ-1, REQ-2)
  const formFactorsQ = useQuery({
    queryKey: ['designer', 'form-factors'],
    queryFn: () => designerApi.listFormFactors(),
    staleTime: 60_000,
  });
  const sensorsQ = useQuery({
    queryKey: ['designer', 'sensors'],
    queryFn: () => designerApi.listSensors(),
    staleTime: 60_000,
  });

  // ── store selectors
  const selectedId = useDesignerStore((s) => s.selectedFormFactorId);
  const setSelected = useDesignerStore((s) => s.setSelectedFormFactor);
  const cameras = useDesignerStore((s) => s.cameras);
  const payloadKg = useDesignerStore((s) => s.payloadKg);
  const autoRotate = useDesignerStore((s) => s.viewportAutoRotate);
  const showLabels = useDesignerStore((s) => s.showLabels);
  const showFovCones = useDesignerStore((s) => s.showFovCones);

  useEffect(() => {
    if (!selectedId && formFactorsQ.data?.formFactors[0]) {
      setSelected(formFactorsQ.data.formFactors[0].id);
    }
  }, [formFactorsQ.data, selectedId, setSelected]);

  const selectedFormFactor = useMemo(
    () => formFactorsQ.data?.formFactors.find((f) => f.id === selectedId) ?? null,
    [formFactorsQ.data, selectedId]
  );

  // ── debounced evaluation request (REQ-3 / REQ-4 / REQ-2)
  const debouncedPayload = useDebounced(payloadKg, 350);
  const debouncedCameras = useDebounced(cameras, 250);

  const evalRequest: EvaluationRequest | null = selectedId
    ? {
        formFactorId: selectedId,
        payloadKg: debouncedPayload,
        cameras: debouncedCameras,
      }
    : null;

  const evaluationQ = useQuery<{ evaluation: EvaluationResult; recommendations: ActuatorRecommendation[] }>({
    queryKey: ['designer', 'evaluate-recommend', evalRequest],
    enabled: !!evalRequest,
    queryFn: async () => {
      if (!evalRequest) throw new Error('no request');
      const data = await designerApi.recommendActuators({ ...evalRequest, topN: 3, safetyFactor: 1.3 });
      return { evaluation: data.evaluation, recommendations: data.recommendations };
    },
    staleTime: 5_000,
  });

  const evaluation = evaluationQ.data?.evaluation ?? null;
  const recommendations = evaluationQ.data?.recommendations ?? [];

  // ── coaching (REQ-6, on-demand)
  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const coachingMut = useMutation({
    mutationFn: async () => {
      if (!evalRequest) throw new Error('no request');
      const res = await designerApi.coach({ ...evalRequest, language: 'ko' });
      return res.coaching;
    },
    onSuccess: (data) => setCoaching(data),
  });

  // ── reset coaching when form factor changes
  useEffect(() => {
    setCoaching(null);
  }, [selectedId]);

  return (
    <>
      <div className="flex-1 grid grid-cols-12 gap-px bg-white/5 p-px min-h-[640px]">
        {/* Left: ConfigPanel */}
        <aside className="col-span-3 bg-[#0a0a0a] p-5 overflow-y-auto" style={{ maxHeight: '100%' }}>
          <ConfigPanel
            formFactors={formFactorsQ.data?.formFactors ?? []}
            sensors={sensorsQ.data?.sensors ?? []}
            isLoading={formFactorsQ.isLoading || sensorsQ.isLoading}
          />
          {formFactorsQ.isError ? (
            <p className="mt-4 text-[10.5px] text-[#E63950]">
              카탈로그 로드 실패: {(formFactorsQ.error as Error)?.message}
            </p>
          ) : null}
        </aside>

        {/* Center: RobotViewport */}
        <section className="col-span-6 bg-[#050505] relative">
          <div className="absolute top-3 left-3 z-10 font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
            Three.js Viewport · OrbitControls
          </div>
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            {selectedFormFactor ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/55 px-2 py-1 border border-white/15 bg-black/40">
                {selectedFormFactor.id} · {selectedFormFactor.totalDof} DoF
              </span>
            ) : null}
            {evaluation?.fovCoverage ? (
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/55 px-2 py-1 border border-white/15 bg-black/40">
                FoV {(evaluation.fovCoverage.horizontalCoverageRatio * 100).toFixed(0)}%
              </span>
            ) : null}
          </div>
          <div className="absolute inset-0">
            <RobotViewport
              formFactor={selectedFormFactor}
              autoRotate={autoRotate}
              showLabels={showLabels}
              fovCones={evaluation?.fovCoverage?.cones ?? []}
              showFovCones={showFovCones}
            />
          </div>
        </section>

        {/* Right: AnalysisPanel */}
        <aside className="col-span-3 bg-[#0a0a0a] p-5 overflow-y-auto" style={{ maxHeight: '100%' }}>
          <AnalysisPanel
            formFactor={selectedFormFactor}
            evaluation={evaluation}
            recommendations={recommendations}
            isEvaluating={evaluationQ.isFetching}
            isRecommending={evaluationQ.isFetching}
          />
          {evaluation?.warnings.length ? (
            <div className="mt-4 space-y-1">
              {evaluation.warnings.map((w, i) => (
                <p key={i} className="text-[10.5px] text-[#F2A93B] leading-snug">
                  · {w}
                </p>
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      <CoachingPanel
        coaching={coaching}
        isLoading={coachingMut.isPending}
        isError={coachingMut.isError}
        onRequest={() => coachingMut.mutate()}
      />
    </>
  );
}
