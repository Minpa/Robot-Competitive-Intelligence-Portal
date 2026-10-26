'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WeeklyBriefGenerateResponse, WeeklyBriefRunStatus } from '@/types/weekly-brief';
import { WEEKLY_BRIEF_QUERY_KEY } from './useWeeklyBrief';

export const WEEKLY_BRIEF_STATUS_KEY = [...WEEKLY_BRIEF_QUERY_KEY, 'status'] as const;

const POLL_MS = 3000;
/** 202 직후 서버가 아직 running 을 보고하지 않을 때 폴링을 유지하는 최대 시간 */
const START_GRACE_MS = 30_000;

/**
 * 주간 브리프 "지금 생성" — 생성 뮤테이션 + 상태 폴링 (관리자 전용, enabled=false 면 아무것도 호출하지 않음).
 * useTechTrendAnalysis 와 같은 패턴: running 일 때만 3초 refetchInterval,
 * running 이 true → false 로 바뀌면 ['weekly-brief'] 전체를 무효화해 새로고침 없이 반영한다.
 */
export function useWeeklyBriefGenerate(enabled: boolean) {
  const qc = useQueryClient();
  // 202 를 받은 시각 — 서버 상태가 running 으로 바뀌기 전 짧은 구간에도 폴링을 이어간다
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  // 이 화면에서 실행이 끝나는 것을 관찰했는지 (완료 요약 표시용)
  const [finishedInSession, setFinishedInSession] = useState(false);

  const statusQuery = useQuery<WeeklyBriefRunStatus>({
    queryKey: WEEKLY_BRIEF_STATUS_KEY,
    queryFn: () => api.getWeeklyBriefStatus(),
    enabled,
    retry: false,
    // 폴링 중 일시 오류는 무시하고 다음 주기에 재시도 (마지막 성공 데이터 유지)
    refetchInterval: (query) => {
      if (query.state.data?.running) return POLL_MS;
      if (startedAtMs !== null && Date.now() - startedAtMs < START_GRACE_MS) return POLL_MS;
      return false;
    },
  });

  const startMutation = useMutation<WeeklyBriefGenerateResponse, Error, { weekStart?: string; force?: boolean }>({
    mutationFn: (body) => api.generateWeeklyBrief(body),
    onSuccess: (res) => {
      if (res.started) {
        setFinishedInSession(false);
        setStartedAtMs(Date.now());
      }
      qc.invalidateQueries({ queryKey: WEEKLY_BRIEF_STATUS_KEY });
    },
  });

  const status = statusQuery.data;
  const running = status?.running ?? false;
  const prevRunning = useRef(false);
  useEffect(() => {
    if (running) {
      // 서버가 running 을 보고하면 그 이후는 서버 상태가 폴링을 이끈다
      setStartedAtMs(null);
    }
    if (prevRunning.current && !running) {
      setFinishedInSession(true);
      qc.invalidateQueries({ queryKey: WEEKLY_BRIEF_QUERY_KEY });
    }
    prevRunning.current = running;
  }, [running, qc]);

  // 202 직후 아주 빨리 끝나 running 을 관찰하지 못한 경우: 이번 실행의 lastRun 이 확인되면 종료 처리
  useEffect(() => {
    if (startedAtMs === null || running || !status?.lastRun) return;
    if (new Date(status.lastRun.finishedAt).getTime() >= startedAtMs - 5000) {
      setStartedAtMs(null);
      setFinishedInSession(true);
      qc.invalidateQueries({ queryKey: WEEKLY_BRIEF_QUERY_KEY });
    }
  }, [startedAtMs, running, status?.lastRun, qc]);

  // 유예 시간이 지나도 running 이 관찰되지 않으면 대기 상태를 푼다
  useEffect(() => {
    if (startedAtMs === null) return;
    const id = setTimeout(() => setStartedAtMs(null), START_GRACE_MS);
    return () => clearTimeout(id);
  }, [startedAtMs]);

  const lastResponse = startMutation.data;
  return {
    status,
    running,
    phase: status?.phase ?? 'idle',
    /** 202 를 받았지만 아직 서버가 running 을 보고하기 전 */
    waitingForStart: startedAtMs !== null && !running,
    start: (body: { weekStart?: string; force?: boolean }) => startMutation.mutate(body),
    starting: startMutation.isPending,
    error: startMutation.error,
    lastResponse,
    skippedExists: !!lastResponse && !lastResponse.started && lastResponse.skipped === 'exists',
    finishedInSession,
    statusError: statusQuery.error as Error | null,
  };
}
