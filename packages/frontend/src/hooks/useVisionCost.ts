'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const STALE_TIME = 300_000; // 5분

export function useVisionBomParts() {
  return useQuery({
    queryKey: ['vision-cost', 'bom-parts'],
    queryFn: () => api.getVisionBomParts(),
    staleTime: STALE_TIME,
  });
}

export function useVisionRobotCosts() {
  return useQuery({
    queryKey: ['vision-cost', 'robot-costs'],
    queryFn: () => api.getVisionRobotCosts(),
    staleTime: STALE_TIME,
  });
}

export function useVisionBubbleChart() {
  return useQuery({
    queryKey: ['vision-cost', 'bubble-chart'],
    queryFn: () => api.getVisionBubbleChart(),
    staleTime: STALE_TIME,
  });
}

export function useCreateVisionRobotCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createVisionRobotCost(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vision-cost'] });
    },
  });
}

export function useUpdateVisionRobotCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateVisionRobotCost(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vision-cost'] });
    },
  });
}

export function useDeleteVisionRobotCost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteVisionRobotCost(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vision-cost'] });
    },
  });
}
