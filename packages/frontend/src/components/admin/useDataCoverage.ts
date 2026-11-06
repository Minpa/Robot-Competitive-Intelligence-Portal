'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { retryMessage } from '@/lib/data-coverage-view';
import type { DataCoverageResponse } from '@/types/data-coverage';

export const DATA_COVERAGE_KEY = ['admin', 'data-coverage'] as const;
/** 조회는 자동 폴링 없이 5분 동안 신선하게 본다(서버 캐시는 10분) */
export const DATA_COVERAGE_STALE_MS = 5 * 60_000;

type HttpError = Error & { status?: number; payload?: { retryAfterSec?: number } };

/** 데이터 커버리지 조회 + 새로고침(POST /refresh) + 비교 기준 상태. useArgosIExport 와 같은 패턴 */
export function useDataCoverage(enabled = true) {
  const qc = useQueryClient();
  const [compareTo, setCompareTo] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const query = useQuery<DataCoverageResponse, HttpError>({
    queryKey: [...DATA_COVERAGE_KEY, compareTo],
    queryFn: () => api.getDataCoverage(compareTo ?? undefined),
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: DATA_COVERAGE_STALE_MS,
  });

  const refreshMutation = useMutation<DataCoverageResponse, HttpError, void>({
    mutationFn: () => api.refreshDataCoverage(),
    onSuccess: (data) => {
      // 기본 기준이면 응답을 바로 반영하고, 비교 기준을 고른 상태면 다시 조회한다(서버 캐시 적중이라 재집계 없음)
      if (compareTo === null) qc.setQueryData([...DATA_COVERAGE_KEY, null], data);
      qc.invalidateQueries({ queryKey: DATA_COVERAGE_KEY });
      setAnnouncement('데이터 커버리지를 새로 계산했습니다.');
    },
    onError: (err) => {
      if (err.status === 429) setAnnouncement(retryMessage(err.payload?.retryAfterSec));
      else setAnnouncement('새로고침에 실패했습니다.');
    },
  });

  const refreshError = refreshMutation.error;
  const throttled = refreshError?.status === 429;
  const refresh = useCallback(() => {
    setAnnouncement('');
    refreshMutation.mutate();
  }, [refreshMutation]);

  const err = query.error;
  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    forbidden: err?.status === 403,
    loadError: err ?? null,
    reload: () => query.refetch(),
    compareTo,
    setCompareTo,
    refresh,
    refreshing: refreshMutation.isPending,
    throttled,
    retryAfterSec: throttled ? refreshError?.payload?.retryAfterSec ?? null : null,
    refreshFailed: refreshMutation.isError && !throttled,
    announcement,
  };
}
