'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ArgosIExportGenerateResponse, ArgosIExportRunStatus } from '@/types/argos-i-export';

export const ARGOS_I_EXPORT_STATUS_KEY = ['admin', 'argos-i-export', 'status'] as const;

const POLL_MS = 3000;
/** 202 직후 서버가 아직 running 을 보고하지 않을 때 폴링을 유지하는 최대 시간 */
const START_GRACE_MS = 30_000;

/**
 * ARGOS_I "지금 생성" — 생성 뮤테이션 + 상태 폴링 (관리자 전용).
 * useWeeklyBriefGenerate 와 같은 패턴: running 일 때만 3초 refetchInterval, 202 직후에는 유예 시간 동안 폴링을 이어간다.
 */
export function useArgosIExport(enabled = true) {
  const qc = useQueryClient();
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [finishedInSession, setFinishedInSession] = useState(false);

  const statusQuery = useQuery<ArgosIExportRunStatus>({
    queryKey: ARGOS_I_EXPORT_STATUS_KEY,
    queryFn: () => api.getArgosIExportStatus(),
    enabled,
    retry: false,
    refetchInterval: (query) => {
      if (query.state.data?.running) return POLL_MS;
      if (startedAtMs !== null && Date.now() - startedAtMs < START_GRACE_MS) return POLL_MS;
      return false;
    },
  });

  const startMutation = useMutation<ArgosIExportGenerateResponse, Error, void>({
    mutationFn: () => api.generateArgosIExport(),
    onSuccess: () => {
      setFinishedInSession(false);
      setStartedAtMs(Date.now());
      qc.invalidateQueries({ queryKey: ARGOS_I_EXPORT_STATUS_KEY });
    },
  });

  const status = statusQuery.data;
  const running = status?.running ?? false;
  const prevRunning = useRef(false);
  useEffect(() => {
    if (running) setStartedAtMs(null);
    if (prevRunning.current && !running) {
      setFinishedInSession(true);
      qc.invalidateQueries({ queryKey: ARGOS_I_EXPORT_STATUS_KEY });
    }
    prevRunning.current = running;
  }, [running, qc]);

  // 202 직후 아주 빨리 끝나 running 을 관찰하지 못한 경우: 이번 실행의 lastRun 이 확인되면 종료 처리
  useEffect(() => {
    if (startedAtMs === null || running || !status?.lastRun) return;
    if (new Date(status.lastRun.finishedAt).getTime() >= startedAtMs - 5000) {
      setStartedAtMs(null);
      setFinishedInSession(true);
    }
  }, [startedAtMs, running, status?.lastRun]);

  // 유예 시간이 지나도 running 이 관찰되지 않으면 대기 상태를 푼다
  useEffect(() => {
    if (startedAtMs === null) return;
    const id = setTimeout(() => setStartedAtMs(null), START_GRACE_MS);
    return () => clearTimeout(id);
  }, [startedAtMs]);

  return {
    status,
    running,
    phase: status?.phase ?? 'idle',
    waitingForStart: startedAtMs !== null && !running,
    start: () => startMutation.mutate(),
    starting: startMutation.isPending,
    error: startMutation.error,
    finishedInSession,
    isLoading: statusQuery.isLoading,
    statusError: statusQuery.error as Error | null,
    refetch: () => statusQuery.refetch(),
  };
}
