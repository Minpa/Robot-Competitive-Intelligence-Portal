'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CiMatrixData, CiFreshnessSummary, CiStagingEntry, CiMonitorAlert, CiValueHistoryEntry, BenchmarkData } from '@/types/ci-update';

const STALE_TIME = 120_000; // 2분

// Full CI matrix data
export function useCiMatrix() {
  const queryClient = useQueryClient();
  const query = useQuery<CiMatrixData>({
    queryKey: ['ci-update', 'matrix'],
    queryFn: () => api.getCiMatrix(),
    staleTime: STALE_TIME,
  });
  return {
    ...query,
    mutate: () => queryClient.invalidateQueries({ queryKey: ['ci-update', 'matrix'] }),
  };
}

// Freshness summary
export function useCiFreshness() {
  return useQuery<CiFreshnessSummary[]>({
    queryKey: ['ci-update', 'freshness'],
    queryFn: () => api.getCiFreshness(),
    staleTime: STALE_TIME,
  });
}

// Staging entries
export function useCiStaging() {
  return useQuery<CiStagingEntry[]>({
    queryKey: ['ci-update', 'staging'],
    queryFn: () => api.getCiStaging(),
    staleTime: STALE_TIME,
  });
}

// Monitor alerts
export function useCiMonitorAlerts(status?: string) {
  return useQuery<CiMonitorAlert[]>({
    queryKey: ['ci-update', 'monitor-alerts', status],
    queryFn: () => api.getCiMonitorAlerts(status),
    staleTime: STALE_TIME,
  });
}

// Value history (on demand)
export function useCiValueHistory(valueId: string | null) {
  return useQuery<CiValueHistoryEntry[]>({
    queryKey: ['ci-update', 'value-history', valueId],
    queryFn: () => api.getCiValueHistory(valueId!),
    enabled: !!valueId,
    staleTime: STALE_TIME,
  });
}

// Benchmark data
export function useBenchmarkData() {
  return useQuery<BenchmarkData>({
    queryKey: ['ci-update', 'benchmark'],
    queryFn: () => api.getBenchmarkData(),
    staleTime: STALE_TIME,
  });
}
