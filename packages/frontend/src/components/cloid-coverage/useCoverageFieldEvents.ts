'use client';

// CLOiD 커버리지 sub-cell 현장 확인 / PoC / 배포 진행 이벤트 hook.
// API: GET /api/coverage/field/status (sub-cell 별 latest event)
// API: GET /api/coverage/field/events (전체 이력)

import { useQuery } from '@tanstack/react-query';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

export type CoverageStatus = 'observed' | 'poc-planned' | 'poc-active' | 'deployed';
export type CoverageEventKind =
  | 'visit'
  | 'poc-planned'
  | 'poc-active'
  | 'poc-milestone'
  | 'deployed'
  | 'note';

export interface CoverageFieldEvent {
  id: number;
  subcellKey: string;
  cellId: string;
  lv: number;
  eventDate: string;
  kind: CoverageEventKind;
  status: CoverageStatus;
  site: string | null;
  source: string | null;
  note: string | null;
  nextStep: string | null;
  priorityRank: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoverageFieldStatus {
  subcellKey: string;
  cellId: string;
  lv: number;
  currentStatus: CoverageStatus;
  statusRank: number;
  latestEventDate: string;
  latestKind: CoverageEventKind;
  latestSite: string | null;
  latestSource: string | null;
  latestNote: string | null;
  nextStep: string | null;
  priorityRank: number | null;
  eventCount: number;
}

/**
 * sub-cell 별 latest event = 현재 status. v11/v1.3 매트릭스가 모두 사용.
 */
export function useCoverageFieldStatus() {
  return useQuery({
    queryKey: ['coverage-field-status'],
    queryFn: async (): Promise<CoverageFieldStatus[]> => {
      const res = await fetch(`${API_BASE}/coverage/field/status`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.status ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * sub-cell 별 status 를 빠르게 lookup 할 수 있도록 Map 으로 인덱싱.
 */
export function useCoverageFieldStatusMap() {
  const q = useCoverageFieldStatus();
  const map = new Map<string, CoverageFieldStatus>();
  if (q.data) {
    for (const s of q.data) map.set(s.subcellKey, s);
  }
  return { ...q, map };
}

/**
 * 모든 이벤트 (newest first) — 방문 로그 페이지·sub-cell 모달용.
 */
export function useCoverageFieldEvents() {
  return useQuery({
    queryKey: ['coverage-field-events'],
    queryFn: async (): Promise<CoverageFieldEvent[]> => {
      const res = await fetch(`${API_BASE}/coverage/field/events`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.events ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * 특정 sub-cell 의 전체 이력.
 */
export function useCoverageFieldEventsForSubcell(subcellKey: string | null | undefined) {
  return useQuery({
    queryKey: ['coverage-field-events', subcellKey],
    enabled: !!subcellKey,
    queryFn: async (): Promise<CoverageFieldEvent[]> => {
      const res = await fetch(`${API_BASE}/coverage/field/events/${subcellKey}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.events ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface CoverageFieldSummary {
  totalEvents: number;
  uniqueSubcells: number;
  uniqueCells: number;
  latestEventDate: string | null;
}

export function useCoverageFieldSummary() {
  return useQuery({
    queryKey: ['coverage-field-summary'],
    queryFn: async (): Promise<CoverageFieldSummary> => {
      const res = await fetch(`${API_BASE}/coverage/field/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * sub-cell key 생성. CELLS_V13 의 cell.id + lv → 'cellId-lv{N}'.
 */
export function makeSubcellKey(cellId: string, lv: number): string {
  return `${cellId}-lv${lv}`;
}

/**
 * 매트릭스 셀 (taskIdx, sectorIdx) 단위로 sub-cell status 들을 묶음.
 * v11 매트릭스에서 셀 표시할 때 사용.
 */
export function aggregateByCell(statuses: CoverageFieldStatus[]) {
  const byCell = new Map<string, CoverageFieldStatus[]>();
  for (const s of statuses) {
    const list = byCell.get(s.cellId) ?? [];
    list.push(s);
    byCell.set(s.cellId, list);
  }
  return byCell;
}

export const STATUS_LABEL: Record<CoverageStatus, { ko: string; color: string; bg: string }> = {
  observed: { ko: '현장 확인', color: '#A50034', bg: '#FAEAE7' },
  'poc-planned': { ko: 'PoC 계획', color: '#9a6500', bg: '#FFF4D6' },
  'poc-active': { ko: 'PoC 진행', color: '#0C447C', bg: '#E6F1FB' },
  deployed: { ko: '배포', color: '#1a7a3a', bg: '#E6F4EA' },
};
