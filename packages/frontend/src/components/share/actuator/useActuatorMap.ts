'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ActuatorMapResponse } from '@/types/actuator-map';
import { normalizeActuatorMap } from './actuator-map-normalize';

export const ACTUATOR_MAP_QUERY_KEY = ['actuator-map'] as const;

/** 액추에이터 포지션·공급망 맵 데이터 — 서버 캐시(10분)와 맞춘 staleTime. 다운로드 HTML은 같은 키의 캐시를 읽는다.
 * queryFn 에서 normalizeActuatorMap 을 적용하므로 이후 컴포넌트·HTML 빌더는 정규화된(구 응답도 새 필드가 채워진) 값만 받는다. */
export function useActuatorMap(enabled = true) {
  return useQuery<ActuatorMapResponse>({
    queryKey: ACTUATOR_MAP_QUERY_KEY,
    queryFn: async () => normalizeActuatorMap(await api.getActuatorMap()),
    enabled,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}
