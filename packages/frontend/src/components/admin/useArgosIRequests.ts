'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ArgosIAdminRequestsResponse, ArgosIRequestsStats } from '@/types/argos-i-requests';

export const ARGOS_I_REQUESTS_KEY = ['admin', 'argos-i-requests'] as const;
const POLL_MS = 15_000;

/** ARGOS_I 요청 카드 데이터 — 통계·목록 폴링(15초) + 승인·거부·재개 뮤테이션 (관리자 전용) */
export function useArgosIRequests(statusFilter: string | undefined, enabled = true) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ARGOS_I_REQUESTS_KEY });

  const stats = useQuery<ArgosIRequestsStats>({
    queryKey: [...ARGOS_I_REQUESTS_KEY, 'stats'],
    queryFn: () => api.getArgosIRequestsStats(),
    enabled,
    retry: false,
    refetchInterval: POLL_MS,
  });
  const list = useQuery<ArgosIAdminRequestsResponse>({
    queryKey: [...ARGOS_I_REQUESTS_KEY, 'list', statusFilter ?? 'all'],
    queryFn: () => api.getArgosIRequests(statusFilter),
    enabled,
    retry: false,
    refetchInterval: POLL_MS,
  });

  const approve = useMutation({ mutationFn: (id: string) => api.approveArgosIRequest(id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: (id: string) => api.rejectArgosIRequest(id), onSuccess: invalidate });
  const resume = useMutation({ mutationFn: () => api.resumeArgosIRequests(), onSuccess: invalidate });

  return {
    stats: stats.data,
    items: list.data?.items ?? [],
    isLoading: stats.isLoading || list.isLoading,
    error: (stats.error ?? list.error) as Error | null,
    approve: (id: string) => approve.mutate(id),
    reject: (id: string) => reject.mutate(id),
    resume: () => resume.mutate(),
    busyId: approve.isPending ? approve.variables : reject.isPending ? reject.variables : undefined,
    resuming: resume.isPending,
    actionError: (approve.error ?? reject.error ?? resume.error) as Error | null,
    refetch: () => {
      void stats.refetch();
      void list.refetch();
    },
  };
}
