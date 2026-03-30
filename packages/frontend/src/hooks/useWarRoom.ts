'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  DashboardSummary,
  GapAnalysisResult,
  CompetitiveOverlayResult,
  ScoreHistoryEntry,
  CompetitiveAlertRecord,
  LgRobotListItem,
  LgRobotWithSpecs,
  SpecChangeLog,
  Partner,
  PartnerDetail,
  AdoptionMatrixEntry,
  ApplicationDomain,
  DomainRobotFitEntry,
  WhatifScenario,
  StrategicGoal,
} from '@/types/war-room';

const STALE_TIME = 300_000; // 5분

// ── Dashboard ──

export function useWarRoomDashboard(lgRobotId: string | null) {
  return useQuery<DashboardSummary>({
    queryKey: ['war-room', 'dashboard', lgRobotId],
    queryFn: () => api.getWarRoomDashboard(lgRobotId!),
    staleTime: STALE_TIME,
    enabled: !!lgRobotId,
  });
}

export function useWarRoomLgRobots() {
  return useQuery<LgRobotListItem[]>({
    queryKey: ['war-room', 'lg-robots'],
    queryFn: () => api.getWarRoomLgRobots(),
    staleTime: STALE_TIME,
  });
}

// ── Competitive Analysis ──

export function useGapAnalysis(robotId: string | null, competitorIds?: string[]) {
  return useQuery<GapAnalysisResult>({
    queryKey: ['war-room', 'gap-analysis', robotId, competitorIds],
    queryFn: () => api.getWarRoomGapAnalysis(robotId!, competitorIds),
    staleTime: STALE_TIME,
    enabled: !!robotId,
  });
}

export function useCompetitiveOverlay(robotId: string | null, competitorIds?: string[]) {
  return useQuery<CompetitiveOverlayResult>({
    queryKey: ['war-room', 'competitive-overlay', robotId, competitorIds],
    queryFn: () => api.getWarRoomCompetitiveOverlay(robotId!, competitorIds),
    staleTime: STALE_TIME,
    enabled: !!robotId,
  });
}

export function useAvailableCompetitors(robotId: string | null) {
  return useQuery<{ robotId: string; robotName: string; companyName: string; combinedScore: number }[]>({
    queryKey: ['war-room', 'available-competitors', robotId],
    queryFn: () => api.getWarRoomAvailableCompetitors(robotId!),
    staleTime: STALE_TIME,
    enabled: !!robotId,
  });
}

// ── Score History ──

export function useScoreHistory(robotIds: string[], months?: number) {
  return useQuery<ScoreHistoryEntry[]>({
    queryKey: ['war-room', 'score-history', robotIds, months],
    queryFn: () => api.getWarRoomScoreHistory(robotIds, months),
    staleTime: STALE_TIME,
    enabled: robotIds.length > 0,
  });
}

// ── Alerts ──

export function useWarRoomAlerts(filters?: { type?: string; is_read?: string }) {
  return useQuery<CompetitiveAlertRecord[]>({
    queryKey: ['war-room', 'alerts', filters],
    queryFn: () => api.getWarRoomAlerts(filters),
    staleTime: STALE_TIME,
  });
}

export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alertId, userId }: { alertId: string; userId?: string }) =>
      api.markWarRoomAlertRead(alertId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room', 'alerts'] });
      qc.invalidateQueries({ queryKey: ['war-room', 'dashboard'] });
    },
  });
}

// ── CLOiD Management ──

export function useLgRobotsManagement() {
  return useQuery<LgRobotWithSpecs[]>({
    queryKey: ['war-room', 'lg-robots-management'],
    queryFn: () => api.getWarRoomLgRobotsManagement(),
    staleTime: STALE_TIME,
  });
}

export function useCreateLgRobot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createWarRoomLgRobot(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room', 'lg-robots'] });
      qc.invalidateQueries({ queryKey: ['war-room', 'lg-robots-management'] });
    },
  });
}

export function useUpdateLgRobotSpecs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ robotId, specs }: { robotId: string; specs: any }) =>
      api.updateWarRoomLgRobotSpecs(robotId, specs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room'] });
    },
  });
}

export function useLgRobotHistory(robotId: string | null) {
  return useQuery<SpecChangeLog[]>({
    queryKey: ['war-room', 'lg-robot-history', robotId],
    queryFn: () => api.getWarRoomLgRobotHistory(robotId!),
    staleTime: STALE_TIME,
    enabled: !!robotId,
  });
}

// ── Phase 4: Partners ──

export function useWarRoomPartners(filters?: { category?: string; sub_category?: string; country?: string }) {
  return useQuery<Partner[]>({
    queryKey: ['war-room', 'partners', filters],
    queryFn: () => api.getWarRoomPartners(filters),
    staleTime: STALE_TIME,
  });
}

export function useWarRoomPartner(id: string | null) {
  return useQuery<PartnerDetail>({
    queryKey: ['war-room', 'partner', id],
    queryFn: () => api.getWarRoomPartner(id!),
    staleTime: STALE_TIME,
    enabled: !!id,
  });
}

export function useWarRoomPartnerAdoptions() {
  return useQuery<AdoptionMatrixEntry[]>({
    queryKey: ['war-room', 'partner-adoptions'],
    queryFn: () => api.getWarRoomPartnerAdoptions(),
    staleTime: STALE_TIME,
  });
}

// ── Phase 4: Domains ──

export function useWarRoomDomains() {
  return useQuery<ApplicationDomain[]>({
    queryKey: ['war-room', 'domains'],
    queryFn: () => api.getWarRoomDomains(),
    staleTime: STALE_TIME,
  });
}

export function useWarRoomDomain(id: string | null) {
  return useQuery<ApplicationDomain>({
    queryKey: ['war-room', 'domain', id],
    queryFn: () => api.getWarRoomDomain(id!),
    staleTime: STALE_TIME,
    enabled: !!id,
  });
}

export function useWarRoomDomainRobotFit() {
  return useQuery<DomainRobotFitEntry[]>({
    queryKey: ['war-room', 'domain-robot-fit'],
    queryFn: () => api.getWarRoomDomainRobotFit(),
    staleTime: STALE_TIME,
  });
}

// ── Phase 4: Scenarios ──

export function useWarRoomScenarios(userId?: string) {
  return useQuery<WhatifScenario[]>({
    queryKey: ['war-room', 'scenarios', userId],
    queryFn: () => api.getWarRoomScenarios(userId),
    staleTime: STALE_TIME,
  });
}

export function useCreateWarRoomScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createWarRoomScenario(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room', 'scenarios'] });
    },
  });
}

export function useDeleteWarRoomScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWarRoomScenario(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room', 'scenarios'] });
    },
  });
}

// ── Phase 4: Goals ──

export function useWarRoomGoals() {
  return useQuery<StrategicGoal[]>({
    queryKey: ['war-room', 'goals'],
    queryFn: () => api.getWarRoomGoals(),
    staleTime: STALE_TIME,
  });
}

export function useCreateWarRoomGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.createWarRoomGoal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room', 'goals'] });
    },
  });
}

export function useUpdateWarRoomGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.updateWarRoomGoal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room', 'goals'] });
    },
  });
}

// ── Phase 4: Investment Priority ──

export function useWarRoomInvestmentPriority() {
  return useQuery<any>({
    queryKey: ['war-room', 'investment-priority'],
    queryFn: () => api.getWarRoomInvestmentPriority(),
    staleTime: STALE_TIME,
  });
}

// ── Strategic Intelligence ──

export function useDataAudit() {
  return useQuery<any>({
    queryKey: ['war-room', 'data-audit'],
    queryFn: () => api.getDataAudit(),
    staleTime: STALE_TIME,
  });
}

export function useRunDataAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.runDataAudit(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room', 'data-audit'] });
    },
  });
}

export function useStrategicBriefing(robotId: string | null) {
  return useQuery<any>({
    queryKey: ['war-room', 'strategic-briefing', robotId],
    queryFn: () => api.getStrategicBriefing(robotId!),
    staleTime: STALE_TIME,
    enabled: !!robotId,
  });
}

export function useGenerateStrategicBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (robotId: string) => api.generateStrategicBriefing(robotId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room', 'strategic-briefing'] });
    },
  });
}

export function useSchedulerStatus() {
  return useQuery<any>({
    queryKey: ['war-room', 'scheduler-status'],
    queryFn: () => api.getSchedulerStatus(),
    staleTime: STALE_TIME,
  });
}

export function usePipelineHistory() {
  return useQuery<any[]>({
    queryKey: ['war-room', 'pipeline-history'],
    queryFn: () => api.getPipelineHistory(),
    staleTime: STALE_TIME,
  });
}

export function useTriggerScheduledTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskName: string) => api.triggerScheduledTask(taskName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['war-room', 'scheduler-status'] });
      qc.invalidateQueries({ queryKey: ['war-room', 'pipeline-history'] });
    },
  });
}

export function useAiBudget() {
  return useQuery<{ currentCostUsd: number; limitUsd: number }>({
    queryKey: ['war-room', 'ai-budget'],
    queryFn: () => api.getAiBudget(),
    staleTime: STALE_TIME,
  });
}
