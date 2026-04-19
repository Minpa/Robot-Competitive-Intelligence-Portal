'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Play, RefreshCw, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, Database } from 'lucide-react';

interface PipelineError {
  robotId: string;
  step: string;
  message: string;
}

interface PipelineExecutionResult {
  runId: string;
  status: 'success' | 'partial_failure' | 'failure';
  totalRobots: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
  errors: PipelineError[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = (ms / 1000).toFixed(1);
  return `${sec}초`;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ts; }
}

export default function ScoringPipelineAdmin() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<PipelineExecutionResult | null>(null);
  const [runningRobotId, setRunningRobotId] = useState<string | null>(null);

  // Fetch last run status
  const { data: lastStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['scoring-pipeline', 'status'],
    queryFn: () => api.getScoringPipelineStatus(),
    staleTime: 60_000,
  });

  // Full pipeline mutation
  const fullRunMutation = useMutation({
    mutationFn: () => api.runScoringPipeline(),
    onSuccess: (data: PipelineExecutionResult) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['scoring-pipeline', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['humanoid-trend'] });
    },
    onError: (error: any) => {
      if (error?.message?.includes('409') || error?.status === 409) {
        setResult(null);
      }
    },
  });

  // Single robot mutation
  const robotRunMutation = useMutation({
    mutationFn: (robotId: string) => api.runScoringPipelineForRobot(robotId),
    onSuccess: (data: PipelineExecutionResult) => {
      setResult(data);
      setRunningRobotId(null);
      queryClient.invalidateQueries({ queryKey: ['scoring-pipeline', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['humanoid-trend'] });
    },
    onError: () => {
      setRunningRobotId(null);
    },
  });

  const isRunning = fullRunMutation.isPending || robotRunMutation.isPending;

  // Migration mutation
  const migrationMutation = useMutation({
    mutationFn: () => api.runMigration(),
    onSuccess: (data: any) => {
      setMigrationResult(data);
    },
  });
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const handleFullRun = useCallback(() => {
    setResult(null);
    fullRunMutation.mutate();
  }, [fullRunMutation]);

  const handleRobotRun = useCallback((robotId: string) => {
    setResult(null);
    setRunningRobotId(robotId);
    robotRunMutation.mutate(robotId);
  }, [robotRunMutation]);

  const statusIcon = lastStatus?.status === 'success'
    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
    : lastStatus?.status === 'partial_failure'
      ? <AlertTriangle className="w-4 h-4 text-yellow-500" />
      : lastStatus?.status === 'failure'
        ? <XCircle className="w-4 h-4 text-red-500" />
        : <Clock className="w-4 h-4 text-ink-500" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-700">
          스코어링 파이프라인
        </h3>
        {isRunning && (
          <span className="flex items-center gap-1 text-xs text-violet-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            파이프라인 실행 중...
          </span>
        )}
      </div>

      {/* Last run status */}
      {statusLoading ? (
        <div className="text-xs text-ink-500">상태 로딩 중...</div>
      ) : lastStatus ? (
        <div className="flex items-center gap-2 text-xs text-ink-500 bg-ink-100 rounded px-3 py-2">
          {statusIcon}
          <span>
            {lastStatus.status === 'success' ? '성공' : lastStatus.status === 'partial_failure' ? '부분 실패' : lastStatus.status === 'failure' ? '실패' : '알 수 없음'}
          </span>
          <span className="text-ink-500">|</span>
          <span>{lastStatus.totalRobots ?? 0}개 로봇 처리</span>
          {lastStatus.totalDurationMs != null && (
            <>
              <span className="text-ink-500">|</span>
              <span>{formatDuration(lastStatus.totalDurationMs)}</span>
            </>
          )}
          {lastStatus.timestamp && (
            <>
              <span className="text-ink-500">|</span>
              <span>{formatTimestamp(lastStatus.timestamp)}</span>
            </>
          )}
        </div>
      ) : (
        <div className="text-xs text-ink-500">실행 기록 없음</div>
      )}

      {/* DB Migration section */}
      <div className="border border-ink-200 rounded p-3 space-y-2">
        <div className="text-xs font-medium text-ink-500">DB 마이그레이션</div>
        <button
          onClick={() => { setMigrationResult(null); migrationMutation.mutate(); }}
          disabled={migrationMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {migrationMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Database className="w-4 h-4" />
          )}
          마이그레이션 실행
        </button>
        {migrationMutation.isError && (
          <div className="text-xs text-red-500">오류: {(migrationMutation.error as any)?.message || '알 수 없는 오류'}</div>
        )}
        {migrationResult && (
          <div className="text-xs space-y-1">
            <div className="text-green-400">{migrationResult.message}</div>
            {migrationResult.results?.map((r: any, i: number) => (
              <div key={i} className={`pl-2 border-l-2 ${r.status === 'success' ? 'border-green-300 text-ink-500' : 'border-red-300 text-red-500'}`}>
                {r.file}: {r.status === 'success' ? <CheckCircle2 className="w-3 h-3 text-green-400 inline" /> : <><XCircle className="w-3 h-3 text-red-400 inline" /> {r.error}</>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full recalculation button */}
      <button
        onClick={handleFullRun}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {fullRunMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        전체 재계산
      </button>

      {/* 409 Conflict message */}
      {fullRunMutation.isError && (
        <div className="text-xs text-yellow-400 bg-yellow-900/20 rounded px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
          {(fullRunMutation.error as any)?.message?.includes('409')
            ? '파이프라인이 이미 실행 중입니다. 완료 후 다시 시도해주세요.'
            : `오류: ${(fullRunMutation.error as any)?.message || '알 수 없는 오류'}`}
        </div>
      )}

      {/* Execution result summary */}
      {result && (
        <div className="rounded border border-ink-200 overflow-hidden">
          <div className={`px-3 py-2 text-xs font-medium ${
            result.status === 'success'
              ? 'bg-green-900/20 text-green-400'
              : result.status === 'partial_failure'
                ? 'bg-yellow-900/20 text-yellow-400'
                : 'bg-red-900/20 text-red-400'
          }`}>
            {result.status === 'success' ? <><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />완료</> : result.status === 'partial_failure' ? <><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />부분 완료</> : <><XCircle className="w-3.5 h-3.5 inline mr-1" />실패</>}
            <span className="ml-2 font-normal">
              총 {result.totalRobots}개 | 성공 {result.successCount} | 실패 {result.failureCount} | {formatDuration(result.totalDurationMs)}
            </span>
          </div>

          {/* Error details */}
          {result.errors && result.errors.length > 0 && (
            <div className="px-3 py-2 space-y-1 bg-white">
              <div className="text-xs font-medium text-red-400">오류 상세:</div>
              {result.errors.map((err, i) => (
                <div key={i} className="text-xs text-ink-500 pl-2 border-l-2 border-red-700">
                  <span className="font-medium">{err.robotId}</span>
                  <span className="text-ink-500 mx-1">→</span>
                  <span className="text-red-500">{err.step}</span>
                  <span className="text-ink-500 mx-1">:</span>
                  <span>{err.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Per-robot recalculation section */}
      <RobotRecalcList
        isRunning={isRunning}
        runningRobotId={runningRobotId}
        onRobotRun={handleRobotRun}
      />
    </div>
  );
}

function RobotRecalcList({
  isRunning,
  runningRobotId,
  onRobotRun,
}: {
  isRunning: boolean;
  runningRobotId: string | null;
  onRobotRun: (robotId: string) => void;
}) {
  const { data: pocScores } = useQuery({
    queryKey: ['humanoid-trend', 'poc-scores'],
    queryFn: () => api.getHumanoidTrendPocScores(),
    staleTime: 300_000,
  });

  const robots = pocScores?.map((s: any) => ({
    id: s.robotId,
    name: s.robotName || s.robotId,
    company: s.companyName || '',
  })) ?? [];

  if (robots.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-ink-500">로봇별 재계산</div>
      <div className="max-h-40 overflow-y-auto space-y-0.5">
        {robots.map((robot: any) => (
          <div
            key={robot.id}
            className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-ink-100"
          >
            <span className="text-ink-700 truncate mr-2">
              {robot.name} {robot.company && `(${robot.company})`}
            </span>
            <button
              onClick={() => onRobotRun(robot.id)}
              disabled={isRunning}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 text-xs text-violet-400 hover:bg-violet-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {runningRobotId === robot.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              재계산
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
