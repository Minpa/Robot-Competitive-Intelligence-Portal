'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ActuatorMapResponse } from '@/types/actuator-map';

export const ACTUATOR_MAP_QUERY_KEY = ['actuator-map'] as const;

/** 액추에이터 포지션·공급망 맵 데이터 — 서버 캐시(10분)와 맞춘 staleTime. 다운로드 HTML은 같은 키의 캐시를 읽는다. */
export function useActuatorMap(enabled = true) {
  return useQuery<ActuatorMapResponse>({
    queryKey: ACTUATOR_MAP_QUERY_KEY,
    queryFn: () => api.getActuatorMap(),
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
