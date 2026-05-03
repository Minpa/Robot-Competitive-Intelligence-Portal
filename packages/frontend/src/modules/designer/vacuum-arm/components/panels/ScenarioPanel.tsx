'use client';

/**
 * ScenarioPanel — 가사업무 시나리오 로드 + 평가 결과.
 *
 * 위: 시나리오 라이브러리 (선택해서 로드)
 * 아래: 마지막 재생의 evalResult (passed/fail + issue list + recommendations)
 *
 * 부품 교체 워크플로우:
 *   1. 시나리오 로드
 *   2. ▶ 재생 → 평가 결과
 *   3. spec 변경 (어깨 액추에이터 / 팔 길이 / 그리퍼)
 *   4. 다시 ▶ 재생 → 새 결과 (이전과 비교 가능, candidates 저장으로 영구 보관)
 */

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

  return (
    <div className="bg-[#0a0a0a] border-t border-white/10 px-4 py-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold">
          가사업무 시나리오 + 평가
        </span>
        {activeScenario ? (
          <span className="font-mono text-[9px] text-white/60">
            · 현재: <span className="text-white">{activeScenario.name}</span>
          </span>
        ) : null}
        <div className="flex-1" />
        {activeScenarioId ? (
          <button
            type="button"
            onClick={onReRun}
            disabled={isPlaying}
            className="border border-gold/40 bg-[#1a1408] hover:bg-[#231a0c] text-gold px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] disabled:opacity-30"
            title="현재 spec으로 시나리오 다시 재생 (부품 교체 후 결과 비교)"
          >
            ▶ 재실행 (현재 spec으로)
          </button>
        ) : null}
      </div>

      {/* 시나리오 라이브러리 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {TASK_SCENARIOS.map((scn) => {
          const active = scn.id === activeScenarioId;
          return (
            <button
              key={scn.id}
              type="button"
              onClick={() => onLoadScenario(scn.id)}
              className={[
                'text-left border px-3 py-2 transition-colors',
                active
                  ? 'border-gold bg-[#1a1408]'
                  : 'border-white/15 bg-[#0f0f0f] hover:border-white/40 hover:bg-[#141414]',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider"
                  style={{ color: CATEGORY_COLORS[scn.category], borderLeft: `2px solid ${CATEGORY_COLORS[scn.category]}`, paddingLeft: 6 }}
                >
                  {scn.category}
                </span>
                <span className="text-[12px] font-medium text-white">{scn.name}</span>
              </div>
              <p className="text-[10.5px] text-white/55 leading-relaxed">{scn.description}</p>
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
      ) : (
        <div className="border border-white/10 px-3 py-2 text-[10.5px] text-white/40 leading-relaxed">
          시나리오를 선택해서 로드한 뒤, 모션 타임라인의 ▶ 재생을 누르면 자동 평가가 시작됩니다.
          <br />
          <span className="text-white/55">
            평가 항목: 도달 (reach) · 토크 한계 · ZMP 안정성 · 목표 위치
          </span>
        </div>
      )}
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
    <div className="border border-white/15 bg-[#0a0a0a] p-3 space-y-2">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/55">
          평가 결과
        </span>
        <span className="text-[13px] font-medium" style={{ color: verdictColor }}>
          {verdict}
        </span>
        {result ? (
          <>
            <span className="text-[10px] text-white/35">
              · {result.durationSec.toFixed(1)}s 재생
            </span>
            {warnCount > 0 ? (
              <span className="text-[10px] text-amber-300">· 경고 {warnCount}건</span>
            ) : null}
          </>
        ) : null}
      </div>

      {result?.specSummary ? (
        <div className="font-mono text-[9.5px] text-white/45 truncate" title={result.specSummary}>
          spec: {result.specSummary}
        </div>
      ) : null}

      {/* 시나리오 설명 */}
      <div className="text-[10.5px] text-white/50">{scenarioName}</div>

      {/* 이슈 리스트 */}
      {issues.length === 0 ? (
        <div className="text-[10.5px] text-white/40 italic">발견된 이슈 없음 — 모든 검사 통과</div>
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
                  <span className="font-mono text-[8.5px] text-white/45">
                    [{CATEGORY_LABELS[issue.category]}]
                  </span>
                  <span className="font-mono text-[8.5px] text-white/45">
                    @ {issue.timeSec.toFixed(1)}s
                  </span>
                </div>
                <div className="text-[11px] text-white/85 leading-snug">{issue.message}</div>
                {issue.recommendation ? (
                  <div className="text-[10px] text-gold/80 leading-snug mt-0.5">
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
