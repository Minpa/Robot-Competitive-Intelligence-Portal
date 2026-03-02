'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const STALE_TIME = 300_000; // 5분

// ── 조회 훅 ──

export function usePocScores() {
  return useQuery({
    queryKey: ['humanoid-trend', 'poc-scores'],
    queryFn: () => api.getHumanoidTrendPocScores(),
    staleTime: STALE_TIME,
  });
}

export function useRfmScores() {
  return useQuery({
    queryKey: ['humanoid-trend', 'rfm-scores'],
    queryFn: () => api.getHumanoidTrendRfmScores(),
    staleTime: STALE_TIME,
  });
}

export function usePositioningData(chartType: string) {
  return useQuery({
    queryKey: ['humanoid-trend', 'positioning', chartType],
    queryFn: () => api.getHumanoidTrendPositioning(chartType),
    staleTime: STALE_TIME,
    enabled: !!chartType,
  });
}

export function useBarSpecs() {
  return useQuery({
    queryKey: ['humanoid-trend', 'bar-specs'],
    queryFn: () => api.getHumanoidTrendBarSpecs(),
    staleTime: STALE_TIME,
  });
}

// ── PoC Score 뮤테이션 ──

export function useCreatePocScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createPocScore(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['humanoid-trend', 'poc-scores'] }); },
  });
}

export function useUpdatePocScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updatePocScore(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['humanoid-trend', 'poc-scores'] }); },
  });
}

export function useDeletePocScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePocScore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['humanoid-trend', 'poc-scores'] }); },
  });
}

// ── RFM Score 뮤테이션 ──

export function useCreateRfmScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createRfmScore(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['humanoid-trend', 'rfm-scores'] }); },
  });
}

export function useUpdateRfmScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateRfmScore(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['humanoid-trend', 'rfm-scores'] }); },
  });
}

export function useDeleteRfmScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRfmScore(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['humanoid-trend', 'rfm-scores'] }); },
  });
}

// ── Positioning Data 뮤테이션 ──

export function useCreatePositioningData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createPositioningData(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['humanoid-trend', 'positioning'] }); },
  });
}

export function useUpdatePositioningData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updatePositioningData(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['humanoid-trend', 'positioning'] }); },
  });
}

export function useDeletePositioningData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePositioningData(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['humanoid-trend', 'positioning'] }); },
  });
}
