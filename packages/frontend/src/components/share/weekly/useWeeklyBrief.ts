'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WeeklyBriefListItem, WeeklyBriefResponse } from '@/types/weekly-brief';

/** 주간 브리프 쿼리 키 루트 — 생성 완료 시 이 키 전체를 무효화한다 */
export const WEEKLY_BRIEF_QUERY_KEY = ['weekly-brief'] as const;

/** api.request 는 서버의 `{ error }` 문자열을 Error.message 로 던진다 */
export function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && err.message === 'not_found';
}

/** weekStart 가 없으면 최신(GET /latest), 있으면 해당 주(GET /:weekStart) */
export function useWeeklyBrief(weekStart?: string, enabled = true) {
  return useQuery<WeeklyBriefResponse, Error>({
    queryKey: weekStart ? [...WEEKLY_BRIEF_QUERY_KEY, 'week', weekStart] : [...WEEKLY_BRIEF_QUERY_KEY, 'latest'],
    queryFn: () => (weekStart ? api.getWeeklyBrief(weekStart) : api.getWeeklyBriefLatest()),
    enabled,
    staleTime: 60 * 1000,
    // 404(not_found)는 재시도해도 같다. 그 외 일시 오류만 1회 재시도
    retry: (failureCount, err) => !isNotFoundError(err) && failureCount < 1,
  });
}

export function useWeeklyBriefList(limit = 26) {
  return useQuery<WeeklyBriefListItem[], Error>({
    queryKey: [...WEEKLY_BRIEF_QUERY_KEY, 'list', limit],
    queryFn: async () => (await api.listWeeklyBriefs(limit)).items,
    staleTime: 60 * 1000,
    retry: 1,
  });
}
