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
import { EnvironmentPanel } from './panels/EnvironmentPanel';
import { CandidateComparisonPanel } from './panels/CandidateComparisonPanel';
import { RevisionLog } from './panels/RevisionLog';
import { EngineeringReviewPanel } from './panels/EngineeringReviewPanel';
import { TimelinePanel } from './panels/TimelinePanel';
import { ScenarioPanel } from './panels/ScenarioPanel';
import { useCandidatesStore } from '../stores/candidates-store';
import { computeArmStatics, computeStability } from '../lib/client-statics';
import { useTimelinePlayback } from '../lib/use-timeline-playback';
import { useEvalEngine } from '../lib/use-eval-engine';
import type { AnalyzeResponse } from '../types/product';

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

const Room3DViewport = dynamic(
  () => import('./viewport3d/Room3DViewport').then((m) => m.Room3DViewport),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
        Loading 3D room…
      </div>
    ),
  }
);

const RoomCanvas = dynamic(
  () => import('./room-editor/RoomCanvas').then((m) => m.RoomCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.22em] text-white/35">
        Loading room editor…
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
  const [compareOpen, setCompareOpen] = useState(false);

  // Timeline rAF playback loop — workbench level이라 한 번만 mount.
  useTimelinePlayback();

  const product = useDesignerVacuumStore((s) => s.product);
  const payloadKg = useDesignerVacuumStore((s) => s.payloadKg);
  const mode = useDesignerVacuumStore((s) => s.mode);
  const setMode = useDesignerVacuumStore((s) => s.setMode);
  const room = useDesignerVacuumStore((s) => s.room);

  // REQ-8 candidates
  const candidates = useCandidatesStore((s) => s.candidates);
  const selectedForCompareIds = useCandidatesStore((s) => s.selectedForCompareIds);
  const saveCandidate = useCandidatesStore((s) => s.saveCandidate);
  const removeCandidate = useCandidatesStore((s) => s.removeCandidate);
  const toggleCompareSelection = useCandidatesStore((s) => s.toggleCompareSelection);
  const autoRotate = useDesignerVacuumStore((s) => s.viewportAutoRotate);
  const showLabels = useDesignerVacuumStore((s) => s.showLabels);
  const showWorkspaceMesh = useDesignerVacuumStore((s) => s.showWorkspaceMesh);
  const showZmp = useDesignerVacuumStore((s) => s.showZmp);
  const toggleAutoRotate = useDesignerVacuumStore((s) => s.toggleAutoRotate);
  const toggleLabels = useDesignerVacuumStore((s) => s.toggleLabels);
  const toggleWorkspaceMesh = useDesignerVacuumStore((s) => s.toggleWorkspaceMesh);
  const toggleZmp = useDesignerVacuumStore((s) => s.toggleZmp);

  // Viewport debounce — slider-induced rebuilds settle before scene rebuilds.
  const debouncedProduct = useDebounced(product, 100);
  const debouncedPayload = useDebounced(payloadKg, 100);
  const debouncedRoom = useDebounced(room, 250);

  // Catalog fetches — required as inputs to client-side statics.
  const actuatorsQ = useQuery({
    queryKey: ['vacuum-arm', 'actuators'],
    queryFn: () => designerVacuumApi.listActuators(),
    staleTime: 5 * 60_000,
  });
  const endEffectorsQ = useQuery({
    queryKey: ['vacuum-arm', 'end-effectors'],
    queryFn: () => designerVacuumApi.listEndEffectors(),
    staleTime: 5 * 60_000,
  });
  const endEffectors = endEffectorsQ.data?.endEffectors ?? [];
  const actuators = actuatorsQ.data?.actuators ?? [];

  // REQ-7 (environment) — still backend-only since it depends on room geometry.
  const analyzeQ = useQuery({
    queryKey: ['vacuum-arm', 'analyze-env', debouncedProduct, debouncedPayload, debouncedRoom],
    queryFn: () =>
      designerVacuumApi.analyze(
        debouncedProduct,
        debouncedPayload,
        debouncedRoom.targets.length > 0 || debouncedRoom.obstacles.length > 0 ? debouncedRoom : undefined,
      ),
    enabled:
      (debouncedRoom.targets.length > 0 || debouncedRoom.obstacles.length > 0) &&
      debouncedProduct.arms.length > 0,
    staleTime: 2_000,
  });

  // ─── Client-side statics + ZMP — instant updates on slider changes ───
  // 백엔드 의존을 끊어 슬라이더 입력에 즉시 반응. (Phase 1 PoC 보호 가드레일에 부합)
  const clientAnalysis: AnalyzeResponse | null = (() => {
    if (debouncedProduct.arms.length === 0) return null;
    const eeKgByArm = debouncedProduct.arms.map((a) => {
      const ee = endEffectors.find((e) => e.sku === a.endEffectorSku);
      return ee ? ee.weightG / 1000 : 0.05;
    });
    const armResults = debouncedProduct.arms.map((arm, i) => {
      const ee = endEffectors.find((e) => e.sku === arm.endEffectorSku);
      const eeKg = eeKgByArm[i];
      const result = computeArmStatics(arm, debouncedPayload, eeKg, i, actuators);
      if (ee) {
        result.endEffector = {
          sku: ee.sku,
          name: ee.name,
          type: ee.type,
          maxPayloadKg: ee.maxPayloadKg,
          weightG: ee.weightG,
        };
        result.endEffectorMaxPayloadKg = ee.maxPayloadKg;
        result.endEffectorPayloadOverLimit = debouncedPayload > ee.maxPayloadKg;
      }
      return result;
    });
    return {
      base: debouncedProduct.base,
      armCount: debouncedProduct.arms.length,
      payloadKg: debouncedPayload,
      arms: armResults,
      stability: computeStability(debouncedProduct.base, debouncedProduct.arms, debouncedPayload, eeKgByArm),
      environment: analyzeQ.data?.environment ?? null,
      isMock: true,
      generatedAt: new Date().toISOString(),
    };
  })();

  const { base, arms, name } = debouncedProduct;
  const armCount = arms.length;

  return (
    <>
      {/* Candidate toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-designer-rule bg-designer-surface-2 px-4 py-2">
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
          후보안 ({candidates.length})
        </span>
        <button
          type="button"
          onClick={() => {
            const name = window.prompt('후보 이름 입력', `후보 ${String.fromCharCode(65 + candidates.length)}`);
            if (!name) return;
            saveCandidate(name, product, room, payloadKg, clientAnalysis ?? analyzeQ.data ?? null);
          }}
          className="bg-designer-ink px-3 py-1.5 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-designer-ink-2 transition-colors"
        >
          + 후보 저장
        </button>
        <div className="flex flex-wrap gap-1.5">
          {candidates.map((c) => {
            const selected = selectedForCompareIds.includes(c.id);
            const hasAnalysis = !!c.analysis;
            return (
              <div
                key={c.id}
                className={[
                  'flex items-center border px-2 py-1 gap-1.5 bg-designer-card',
                  selected ? 'border-designer-accent' : 'border-designer-rule',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleCompareSelection(c.id)}
                  className="cursor-pointer accent-designer-accent"
                  aria-label={`비교 ${c.name}`}
                />
                <span className="text-[15px] text-designer-ink truncate max-w-[10rem]">{c.name}</span>
                <button
                  type="button"
                  disabled={!hasAnalysis}
                  onClick={() => {
                    window.open(
                      `/argos-designer/vacuum-arm/spec-sheet?candidateId=${encodeURIComponent(c.id)}`,
                      '_blank'
                    );
                  }}
                  className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-ink-2 hover:text-designer-accent disabled:opacity-30 disabled:cursor-not-allowed"
                  title={hasAnalysis ? '사양서 PDF 출력' : '분석 데이터 없음 — 워크벤치에서 다시 저장'}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => removeCandidate(c.id)}
                  className="text-[15px] text-designer-muted hover:text-designer-risk"
                  title="삭제"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          disabled={selectedForCompareIds.length < 2}
          onClick={() => setCompareOpen(true)}
          className="ml-auto border border-designer-rule bg-designer-card px-3 py-1.5 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-ink-2 disabled:opacity-30 disabled:cursor-not-allowed hover:border-designer-accent hover:text-designer-ink transition-colors"
        >
          비교 ({selectedForCompareIds.length})
        </button>
      </div>

      <div className="grid flex-1 grid-cols-12 gap-px bg-designer-rule p-px min-h-[640px]">
        {/* Left: SpecParametersPanel + RevisionLog */}
        <aside
          className="col-span-3 overflow-y-auto bg-designer-surface p-6"
          style={{ maxHeight: '100%' }}
        >
          <SpecParametersPanel />
          <RevisionLog />
        </aside>

        {/* Center: 3D Viewport (또는 2D Room Editor) + Timeline (room3d 모드).
            3D 뷰포트만 다크 — spec §5에서 다크 캔버스 + light 오브젝트 대비 권장. */}
        <section className="col-span-6 flex flex-col bg-designer-viewport min-h-0">
          <div className="relative flex-1 min-h-[400px]">
          {/* Mode toggle — 활성만 accent 채움. spec §5.4 */}
          <div className="absolute left-3 top-3 z-10 flex items-center gap-1">
            <ViewportModeButton active={mode === 'product3d'} onClick={() => setMode('product3d')}>
              로봇 3D
            </ViewportModeButton>
            <ViewportModeButton active={mode === 'roomEditor'} onClick={() => setMode('roomEditor')}>
              방 에디터 (2D)
            </ViewportModeButton>
            <ViewportModeButton
              active={mode === 'room3d'}
              onClick={() => setMode('room3d')}
              title="방 + 로봇을 3D로 (옵션 A)"
            >
              방 3D
            </ViewportModeButton>
          </div>

          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-white/85 px-2 py-1 border border-white/20 bg-black/40">
              {base.shape} · {base.diameterOrWidthCm.toFixed(0)}×{base.heightCm.toFixed(0)} cm · {base.weightKg.toFixed(1)}kg
            </span>
            {armCount > 0 ? (
              <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-accent px-2 py-1 border border-designer-accent/60 bg-black/40">
                팔 {armCount}개
              </span>
            ) : null}
            {armCount > 0 ? (
              <>
                <ViewportToggle active={showWorkspaceMesh} onClick={toggleWorkspaceMesh} title="Toggle workspace mesh (REQ-3)">
                  ◑ workspace
                </ViewportToggle>
                <ViewportToggle active={showZmp} onClick={toggleZmp} title="Toggle ZMP overlay (REQ-5)">
                  ◎ ZMP
                </ViewportToggle>
              </>
            ) : null}
            <ViewportToggle active={autoRotate} onClick={toggleAutoRotate} title="Auto-rotate">
              ⟳ rotate
            </ViewportToggle>
            <ViewportToggle active={showLabels} onClick={toggleLabels} title="Toggle labels">
              labels
            </ViewportToggle>
          </div>
          <div className="absolute left-3 bottom-3 z-10 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-white/55">
            {name}
          </div>
          <div className="absolute inset-0">
            {mode === 'product3d' ? (
              <RobotViewport
                base={base}
                arms={arms}
                endEffectors={endEffectors}
                stability={clientAnalysis?.stability ?? null}
                autoRotate={autoRotate}
                showLabels={showLabels}
                showWorkspaceMesh={showWorkspaceMesh}
                showZmp={showZmp}
              />
            ) : mode === 'room3d' ? (
              <Room3DViewport
                base={base}
                arms={arms}
                endEffectors={endEffectors}
                stability={clientAnalysis?.stability ?? null}
                autoRotate={autoRotate}
                showLabels={showLabels}
                showWorkspaceMesh={showWorkspaceMesh}
                showZmp={showZmp}
              />
            ) : (
              <RoomCanvas heightPx={640} />
            )}
          </div>
          </div>

          {/* Timeline — 룸 3D 모드에서 viewport 바로 아래 항상 보임 (sticky) */}
          {mode === 'room3d' ? <TimelinePanel /> : null}
        </section>

        {/* Right: EngineeringAnalysisPanel (REQ-4) */}
        <aside
          className="col-span-3 overflow-y-auto bg-designer-surface p-6"
          style={{ maxHeight: '100%' }}
        >
          <EngineeringAnalysisPanel
            base={base}
            arms={arms}
            analysis={clientAnalysis?.arms ?? []}
            stability={clientAnalysis?.stability ?? null}
            payloadKg={debouncedPayload}
            isLoading={false}
            isError={false}
          />
          <EnvironmentPanel
            room={room}
            environment={analyzeQ.data?.environment ?? null}
            isLoading={analyzeQ.isFetching}
          />
        </aside>
      </div>

      {/* 시나리오 평가 — 룸 3D 모드에서만 표시. 접힘 가능. Timeline은 viewport
          바로 아래로 이동했고 여기는 시나리오 라이브러리 + 결과만. */}
      {mode === 'room3d' ? (
        <>
          <ScenarioPanel />
          <EvalEngineMount />
        </>
      ) : null}

      {/* Bottom: REQ-10 engineering review */}
      <EngineeringReviewPanel
        analysis={clientAnalysis ?? analyzeQ.data}
        isAnalyzing={analyzeQ.isFetching}
      />

      {/* Comparison modal */}
      {compareOpen ? (
        <CandidateComparisonPanel
          candidates={candidates.filter((c) => selectedForCompareIds.includes(c.id))}
          onClose={() => setCompareOpen(false)}
        />
      ) : null}
    </>
  );
}


/* ─── Viewport HUD buttons — spec §5.4 ────────────────────────────────────
 * 활성 모드만 accent 채움 + ink 글자, 비활성은 transparent + muted, hover 시
 * surface-2 배경. 다크 viewport 위라 white 베이스로 처리.
 * ───────────────────────────────────────────────────────────────────────── */

function ViewportModeButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={[
        'font-mono text-[13px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1.5 transition-colors',
        active
          ? 'bg-designer-accent text-designer-ink'
          : 'bg-transparent text-white/65 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ViewportToggle({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={[
        'font-mono text-[13px] font-semibold uppercase tracking-[0.14em] px-2 py-1 border transition-colors',
        active
          ? 'border-designer-accent bg-designer-accent/15 text-designer-accent'
          : 'border-white/20 bg-black/40 text-white/65 hover:border-white/40 hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* EvalEngineMount — useEvalEngine를 actuator/endEffector/furniture 카탈로그와 함께 mount.
   workbench 안에서 카탈로그가 있으므로 별도 컴포넌트로 분리. */
function EvalEngineMount() {
  const actuatorsQ = useQuery({
    queryKey: ['vacuum-arm', 'actuators'],
    queryFn: () => designerVacuumApi.listActuators(),
    staleTime: 5 * 60_000,
  });
  const endEffectorsQ = useQuery({
    queryKey: ['vacuum-arm', 'end-effectors'],
    queryFn: () => designerVacuumApi.listEndEffectors(),
    staleTime: 5 * 60_000,
  });
  const furnitureQ = useQuery({
    queryKey: ['vacuum-arm', 'furniture'],
    queryFn: () => designerVacuumApi.listFurniture(),
    staleTime: 5 * 60_000,
  });
  useEvalEngine({
    actuators: actuatorsQ.data?.actuators ?? [],
    endEffectors: endEffectorsQ.data?.endEffectors ?? [],
    furnitureCatalog: furnitureQ.data?.furniture ?? [],
  });
  return null;
}
