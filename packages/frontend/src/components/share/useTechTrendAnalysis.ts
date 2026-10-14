'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TechTrendAnalysisStatus } from '@/types/tech-trend-report';

/**
 * 핸드 리포트 Gemini 전체 분석 — 상태 폴링(실행 중 5초) + 실행 뮤테이션.
 * running이 true → false로 바뀌면 리포트 쿼리를 무효화해 새로고침 없이 결과를 반영한다.
 */
export function useTechTrendAnalysis(domain: string, days: number, enabled: boolean) {
  const qc = useQueryClient();

  const statusQuery = useQuery<TechTrendAnalysisStatus>({
    queryKey: ['tech-trend-analysis-status', domain],
    queryFn: () => api.getTechTrendAnalysisStatus(domain),
    enabled,
    retry: false,
    // 폴링 중 일시 오류는 무시하고 다음 주기에 재시도 (마지막 성공 데이터 유지)
    refetchInterval: (query) => (query.state.data?.running ? 5000 : false),
  });

  const startMutation = useMutation({
    mutationFn: () => api.startTechTrendAnalysis(domain, days),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tech-trend-analysis-status', domain] });
    },
  });

  const running = statusQuery.data?.running ?? false;
  const prevRunning = useRef(false);
  useEffect(() => {
    if (prevRunning.current && !running) {
      qc.invalidateQueries({ queryKey: ['tech-trend-report', domain] });
    }
    prevRunning.current = running;
  }, [running, domain, qc]);

  return {
    status: statusQuery.data,
    running,
    start: () => startMutation.mutate(),
    starting: startMutation.isPending,
    error: startMutation.error as Error | null,
    lastResponse: startMutation.data,
  };
}
