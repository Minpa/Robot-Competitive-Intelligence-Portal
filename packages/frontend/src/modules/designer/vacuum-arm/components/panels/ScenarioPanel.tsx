'use client';

/**
 * ScenarioPanel — 가사업무 시나리오 로드 + 평가 결과.
 *
 * 두 섹션 모두 접힘 가능 (기본 접힘) — 작업 공간을 viewport+timeline에 양보.
 *   - 라이브러리 + 결과 (펼침 시 시나리오 카드 + 마지막 결과)
 *   - 매트릭스 (펼침 시 시나리오 × spec 비교 표)
 *
 * 부품 교체 워크플로우는 commit message 참조.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import { TASK_SCENARIOS, findScenario } from '../../kinematics/task-scenarios';
import { designerVacuumApi } from '../../api/designer-vacuum-api';

const CATEGORY_COLORS: Record<string, string> = {
  청소: '#3a8dde',
  정리정돈: '#22c55e',
  서빙: '#f97316',
  기타: '#9ca3af',
};

const SEVERITY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  fail: { label: '실패', color: '#fca5a5', bg: 'rgba(239, 68, 68, 0.12)' },
  warning: { label: '경고', color: '#fcd34d', bg: 'rgba(245, 158, 11, 0.12)' },
  info: { label: '정보', color: '#bfdbfe', bg: 'rgba(59, 130, 246, 0.10)' },
};

const CATEGORY_LABELS: Record<string, string> = {
  reach: '도달',
  torque: '토크',
  stability: '안정성',
  goal: '목표',
  collision: '충돌',
  other: '기타',
};

export function ScenarioPanel() {
  const activeScenarioId = useDesignerVacuumStore((s) => s.activeScenarioId);
  const evalResult = useDesignerVacuumStore((s) => s.evalResult);
  const evalIssuesInProgress = useDesignerVacuumStore((s) => s.evalIssuesInProgress);
  const isPlaying = useDesignerVacuumStore((s) => s.timeline.isPlaying);
  const loadTaskScenario = useDesignerVacuumStore((s) => s.loadTaskScenario);
  const setPlaying = useDesignerVacuumStore((s) => s.setTimelinePlaying);
  const setCurrentTime = useDesignerVacuumStore((s) => s.setTimelineCurrentTime);
  const clearEvalResult = useDesignerVacuumStore((s) => s.clearEvalResult);

  // Collapsible — 라이브러리는 마지막 평가 결과가 있을 때만 자동 펼침
  const [libraryOpen, setLibraryOpen] = useState(false);

  // 룸 프리셋 로딩 (시나리오 로드 시 사용)
  const presetsQ = useQuery({
    queryKey: ['vacuum-arm', 'room-presets'],
    queryFn: () => designerVacuumApi.listRoomPresets(),
    staleTime: 5 * 60_000,
  });
  const roomPresets = presetsQ.data?.roomPresets ?? [];

  const activeScenario = activeScenarioId ? findScenario(activeScenarioId) : null;

  const onLoadScenario = (scenarioId: string) => {
    const scn = findScenario(scenarioId);
    if (!scn) return;
    const preset = scn.basePresetId
      ? roomPresets.find((p) => p.id === scn.basePresetId) ?? null
      : null;
    loadTaskScenario(scn, preset);
  };

  const onReRun = () => {
    setCurrentTime(0);
    clearEvalResult();
    setPlaying(true);
  };

  // 결과가 있으면 자동으로 라이브러리도 펼침 (사용자가 결과 본 뒤 다시 시나리오 고르기 쉽도록)
  const hasContent = activeScenarioId !== null || evalResult !== null;
  const libraryEffectivelyOpen = libraryOpen || hasContent;

  return (
    <div className="bg-designer-surface border-t border-designer-rule">
      {/* Always-visible header — 한 줄, 클릭으로 toggle */}
      <button
        type="button"
        onClick={() => setLibraryOpen(!libraryEffectivelyOpen)}
        className="flex items-center gap-2 w-full px-4 py-1.5 hover:bg-designer-surface-2 text-left"
      >
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-designer-accent">
          {libraryEffectivelyOpen ? '▼' : '▶'} 가사업무 시나리오 + 평가
        </span>
        {activeScenario ? (
          <span className="font-mono text-[9px] text-designer-ink-2">
            · 현재: <span className="text-designer-ink">{activeScenario.name}</span>
          </span>
        ) : (
          <span className="font-mono text-[9px] text-designer-muted">
            · {TASK_SCENARIOS.length}개 시나리오 사용 가능
          </span>
        )}
        {evalResult ? (
          <span
            className="font-mono text-[9px] ml-2"
            style={{ color: evalResult.passed ? '#86efac' : '#fca5a5' }}
          >
            {evalResult.passed ? '✓ 통과' : `✗ 실패 (${evalResult.issues.filter((i) => i.severity === 'fail').length}건)`}
          </span>
        ) : null}
        <div className="flex-1" />
        {activeScenarioId ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReRun();
            }}
            disabled={isPlaying}
            className="border border-designer-accent/50 bg-designer-accent/10 hover:bg-designer-accent/20 text-designer-accent px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] disabled:opacity-30"
            title="현재 spec으로 시나리오 다시 재생"
          >
            ▶ 재실행
          </button>
        ) : null}
      </button>

      {libraryEffectivelyOpen ? (
        <div className="px-4 pb-3 space-y-3">
          {/* 시나리오 라이브러리 — 더 작게 grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {TASK_SCENARIOS.map((scn) => {
              const active = scn.id === activeScenarioId;
              return (
                <button
                  key={scn.id}
                  type="button"
                  onClick={() => onLoadScenario(scn.id)}
                  className={[
                    'text-left border px-2 py-1.5 transition-colors',
                    active
                      ? 'border-designer-accent bg-designer-accent/10'
                      : 'border-designer-rule bg-designer-card hover:border-designer-ink-2 hover:bg-designer-surface-2',
                  ].join(' ')}
                  title={scn.description}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="font-mono text-[7.5px] uppercase tracking-wider"
                      style={{ color: CATEGORY_COLORS[scn.category] }}
                    >
                      {scn.category}
                    </span>
                  </div>
                  <span className="text-[10.5px] font-medium text-designer-ink leading-tight block">
                    {scn.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 평가 결과 */}
          {(evalResult || (isPlaying && evalIssuesInProgress.length > 0)) && activeScenario ? (
            <ResultBlock
              scenarioName={activeScenario.name}
              result={evalResult}
              inProgressIssues={isPlaying ? evalIssuesInProgress : null}
            />
          ) : null}

          {/* 결과 비교 매트릭스 — 자체 collapsible */}
          <ResultMatrix />
        </div>
      ) : null}
    </div>
  );
}

/* ─── ResultMatrix ─────────────────────────────────────────────────────────
 * 시나리오 × spec 결과 매트릭스. evalHistory에서 모든 결과 모아 보여줌.
 * Rows = 시나리오, Cols = 고유 spec (specLabel 기준 그룹화).
 * 각 셀 = 가장 최근 결과 (✓/✗ + duration). 클릭하면 해당 결과로 evalResult 교체.
 * ─────────────────────────────────────────────────────────────────────────── */

function ResultMatrix() {
  const evalHistory = useDesignerVacuumStore((s) => s.evalHistory);
  const removeEvalHistoryEntry = useDesignerVacuumStore((s) => s.removeEvalHistoryEntry);
  const clearEvalHistory = useDesignerVacuumStore((s) => s.clearEvalHistory);
  const [open, setOpen] = useState(false);

  if (evalHistory.length === 0) {
    return null;
  }

  // 그룹화: scenarioId × specLabel → 가장 최근 result
  const grid = new Map<string, Map<string, import('../../types/product').EvalResult>>();
  const scenarioOrder: string[] = [];
  const specOrder: string[] = [];
  for (const r of evalHistory) {
    if (!grid.has(r.scenarioId)) {
      grid.set(r.scenarioId, new Map());
      scenarioOrder.push(r.scenarioId);
    }
    const row = grid.get(r.scenarioId)!;
    // specLabel + 처음 spec 순서 보존
    if (!row.has(r.specLabel)) {
      if (!specOrder.includes(r.specLabel)) specOrder.push(r.specLabel);
    }
    // 가장 최근 결과로 덮어씌움 (같은 spec으로 여러 번 돌렸을 때)
    row.set(r.specLabel, r);
  }

  // 시나리오 이름 lookup
  const scenarioNames = new Map<string, string>();
  for (const r of evalHistory) {
    if (!scenarioNames.has(r.scenarioId)) scenarioNames.set(r.scenarioId, r.scenarioName);
  }

  // 컬럼별 통과/실패 카운트
  const colStats = new Map<string, { pass: number; total: number }>();
  for (const spec of specOrder) {
    let pass = 0;
    let total = 0;
    for (const scn of scenarioOrder) {
      const r = grid.get(scn)?.get(spec);
      if (r) {
        total++;
        if (r.passed) pass++;
      }
    }
    colStats.set(spec, { pass, total });
  }

  return (
    <div className="border border-designer-rule bg-designer-surface">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="font-mono text-[9px] uppercase tracking-[0.22em] text-designer-accent hover:text-designer-ink"
        >
          {open ? '▼' : '▶'} 결과 매트릭스 (시나리오 × spec)
        </button>
        <span className="font-mono text-[9px] text-designer-muted">
          · {scenarioOrder.length}개 시나리오 × {specOrder.length}개 spec · {evalHistory.length}회
        </span>
        <div className="flex-1" />
        {open ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('평가 history 전체 삭제할까요?')) clearEvalHistory();
            }}
            className="border border-designer-rule bg-designer-surface hover:border-error hover:text-error text-designer-ink-2 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em]"
          >
            history 전체 삭제
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="px-3 pb-3 space-y-2">
      <div className="overflow-x-auto">
        <table className="text-[10.5px] font-mono w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-1.5 px-2 border-b border-designer-rule text-designer-ink-2">
                시나리오 ↓ / spec →
              </th>
              {specOrder.map((spec) => {
                const stat = colStats.get(spec)!;
                const ratio = stat.total > 0 ? Math.round((stat.pass / stat.total) * 100) : 0;
                const ratioColor =
                  ratio === 100 ? '#86efac' : ratio >= 50 ? '#fcd34d' : '#fca5a5';
                return (
                  <th
                    key={spec}
                    className="text-center py-1.5 px-2 border-b border-designer-rule text-designer-ink min-w-[110px]"
                  >
                    <div className="text-[10.5px]">{spec}</div>
                    <div className="text-[8.5px]" style={{ color: ratioColor }}>
                      {stat.pass}/{stat.total} ({ratio}%)
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scenarioOrder.map((scnId) => (
              <tr key={scnId} className="border-b border-designer-rule hover:bg-designer-surface-2">
                <td className="py-1.5 px-2 text-designer-ink">{scenarioNames.get(scnId) ?? scnId}</td>
                {specOrder.map((spec) => {
                  const r = grid.get(scnId)?.get(spec);
                  if (!r) {
                    return (
                      <td key={spec} className="text-center py-1.5 px-2 text-designer-ink/25">
                        —
                      </td>
                    );
                  }
                  const failCount = r.issues.filter((i) => i.severity === 'fail').length;
                  return (
                    <td
                      key={spec}
                      className="text-center py-1.5 px-2 group relative"
                      title={
                        `${r.passed ? '✓ 통과' : '✗ 실패'} · ${r.durationSec.toFixed(1)}s · ` +
                        `criteria ${r.passedCriteriaCount}/${r.totalCriteriaCount}` +
                        (r.issues.length > 0
                          ? '\n\n' + r.issues.map((i) => `[${i.category}] ${i.message}`).join('\n')
                          : '')
                      }
                    >
                      <div className="inline-flex items-center gap-1">
                        <span
                          className="text-[12px]"
                          style={{ color: r.passed ? '#86efac' : '#fca5a5' }}
                        >
                          {r.passed ? '✓' : '✗'}
                        </span>
                        <span className="text-designer-ink-2 text-[9.5px]">
                          {r.passedCriteriaCount}/{r.totalCriteriaCount}
                        </span>
                        {failCount > 0 ? (
                          <span className="text-error text-[8.5px]">·{failCount}f</span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEvalHistoryEntry(r.id)}
                        className="absolute top-0 right-0.5 text-designer-ink/25 hover:text-error opacity-0 group-hover:opacity-100 text-[10px]"
                        title="결과 삭제"
                      >
                        ×
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[9.5px] text-designer-muted leading-relaxed">
        같은 시나리오를 여러 spec(부품 교체 후)으로 돌리면 컬럼이 추가됩니다.
        셀 hover 시 상세 내용. 컬럼 헤더의 통과율로 어떤 spec이 가장 많은 시나리오를 통과하는지 비교 가능.
      </p>
        </div>
      ) : null}
    </div>
  );
}

function ResultBlock({
  scenarioName,
  result,
  inProgressIssues,
}: {
  scenarioName: string;
  result: import('../../types/product').EvalResult | null;
  inProgressIssues: import('../../types/product').EvalIssue[] | null;
}) {
  const issues = result?.issues ?? inProgressIssues ?? [];
  const failCount = issues.filter((i) => i.severity === 'fail').length;
  const warnCount = issues.filter((i) => i.severity === 'warning').length;
  const inProgress = inProgressIssues !== null;
  const verdict = inProgress
    ? '평가 중…'
    : failCount === 0
      ? '✓ 통과'
      : `✗ 실패 (${failCount}건)`;
  const verdictColor = inProgress
    ? '#9ca3af'
    : failCount === 0
      ? '#86efac'
      : '#fca5a5';

  return (
    <div className="border border-designer-rule bg-designer-surface p-3 space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-designer-ink-2">
          평가 결과
        </span>
        <span className="text-[13px] font-medium" style={{ color: verdictColor }}>
          {verdict}
        </span>
        {result ? (
          <>
            <span className="text-[10px] text-designer-muted">
              · {result.durationSec.toFixed(1)}s 재생
            </span>
            {warnCount > 0 ? (
              <span className="text-[10px] text-amber-300">· 경고 {warnCount}건</span>
            ) : null}
          </>
        ) : null}
      </div>

      {result?.specSummary ? (
        <div className="font-mono text-[9.5px] text-designer-muted truncate" title={result.specSummary}>
          spec: {result.specSummary}
        </div>
      ) : null}

      {/* 시나리오 설명 */}
      <div className="text-[10.5px] text-designer-muted">{scenarioName}</div>

      {/* 이슈 리스트 */}
      {issues.length === 0 ? (
        <div className="text-[10.5px] text-designer-muted italic">발견된 이슈 없음 — 모든 검사 통과</div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {issues.map((issue, i) => {
            const sty = SEVERITY_STYLES[issue.severity];
            return (
              <div
                key={i}
                className="border-l-2 px-2.5 py-1.5"
                style={{ borderLeftColor: sty.color, background: sty.bg }}
              >
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span
                    className="font-mono text-[8.5px] uppercase tracking-wider"
                    style={{ color: sty.color }}
                  >
                    {sty.label}
                  </span>
                  <span className="font-mono text-[8.5px] text-designer-muted">
                    [{CATEGORY_LABELS[issue.category]}]
                  </span>
                  <span className="font-mono text-[8.5px] text-designer-muted">
                    @ {issue.timeSec.toFixed(1)}s
                  </span>
                </div>
                <div className="text-[11px] text-designer-ink leading-snug">{issue.message}</div>
                {issue.recommendation ? (
                  <div className="text-[10px] text-designer-accent/80 leading-snug mt-0.5">
                    → {issue.recommendation}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
