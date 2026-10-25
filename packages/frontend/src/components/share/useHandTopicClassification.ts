'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HandTopicClassificationStatus } from '@/types/tech-trend-timeline';

/**
 * 시계열 서브토픽 분류(hand·actuator) — 상태 폴링(실행 중 5초) + 실행 뮤테이션 (useTechTrendAnalysis와 같은 패턴).
 * domain 인자로 /tech-trends/{domain}/classify 를 호출한다 (훅 이름은 핸드 시절 호환으로 유지).
 * running이 true → false로 바뀌면 타임라인·해설 쿼리를 무효화해 새로고침 없이 결과를 반영한다.
 */
export function useHandTopicClassification(domain: string, enabled: boolean) {
  const qc = useQueryClient();

  const statusQuery = useQuery<HandTopicClassificationStatus>({
    queryKey: ['hand-topic-classification-status', domain],
    queryFn: () => api.getHandTopicClassificationStatus(domain),
    enabled,
    retry: false,
    // 폴링 중 일시 오류는 무시하고 다음 주기에 재시도 (마지막 성공 데이터 유지)
    refetchInterval: (query) => (query.state.data?.running ? 5000 : false),
  });

  const startMutation = useMutation({
    mutationFn: () => api.startHandTopicClassification(domain),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hand-topic-classification-status', domain] });
    },
  });

  const running = statusQuery.data?.running ?? false;
  const prevRunning = useRef(false);
  useEffect(() => {
    if (prevRunning.current && !running) {
      qc.invalidateQueries({ queryKey: ['tech-trend-timeline', domain] });
      qc.invalidateQueries({ queryKey: ['tech-trend-timeline-insight', domain] });
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
