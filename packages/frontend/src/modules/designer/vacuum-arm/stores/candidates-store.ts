/**
 * Spec candidates + revision log · REQ-8 + REQ-9
 *
 * Persistence: localStorage (Phase 1 PoC simplification — spec §4.1 calls
 * for PostgreSQL `designer_spec_candidates`/`designer_revision_log` tables,
 * but for solo-dev iteration we keep state on the client. Migration to DB
 * can happen in Phase 2 when multi-user collaboration arrives.)
 */

import { create } from 'zustand';
import type { ProductConfig, RoomConfig, AnalyzeResponse } from '../types/product';

const STORAGE_KEY_CANDIDATES = 'argos-designer-vacuum-candidates-v1';
const STORAGE_KEY_REVISIONS = 'argos-designer-vacuum-revisions-v1';

export interface SpecCandidate {
  id: string; // local UUID
  name: string;
  product: ProductConfig;
  room: RoomConfig;
  payloadKg: number;
  /** Cached analyze response — updated on save. */
  analysis: AnalyzeResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionEntry {
  id: string;
  candidateId: string | null; // null = uncommitted (working copy)
  parameterName: string;
  oldValue: unknown;
  newValue: unknown;
  changedAt: string;
}

interface CandidatesState {
  candidates: SpecCandidate[];
  revisions: RevisionEntry[];
  selectedForCompareIds: string[];

  saveCandidate: (
    name: string,
    product: ProductConfig,
    room: RoomConfig,
    payloadKg: number,
    analysis: AnalyzeResponse | null
  ) => SpecCandidate;
  updateCandidate: (id: string, patch: Partial<Omit<SpecCandidate, 'id' | 'createdAt'>>) => void;
  removeCandidate: (id: string) => void;
  toggleCompareSelection: (id: string) => void;
  clearCompareSelection: () => void;

  logRevision: (parameterName: string, oldValue: unknown, newValue: unknown) => void;
  clearRevisions: () => void;
}

function loadCandidates(): SpecCandidate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CANDIDATES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SpecCandidate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCandidatesToStorage(c: SpecCandidate[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CANDIDATES, JSON.stringify(c));
  } catch {
    // localStorage full or unavailable — silently drop
  }
}

function loadRevisions(): RevisionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REVISIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RevisionEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRevisionsToStorage(r: RevisionEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    // Cap at 200 entries — older entries dropped FIFO.
    const sliced = r.slice(-200);
    localStorage.setItem(STORAGE_KEY_REVISIONS, JSON.stringify(sliced));
  } catch {
    // ignore
  }
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useCandidatesStore = create<CandidatesState>((set) => ({
  candidates: loadCandidates(),
  revisions: loadRevisions(),
  selectedForCompareIds: [],

  saveCandidate: (name, product, room, payloadKg, analysis) => {
    const now = new Date().toISOString();
    const candidate: SpecCandidate = {
      id: uid(),
      name,
      product: structuredClone(product),
      room: structuredClone(room),
      payloadKg,
      analysis: analysis ? structuredClone(analysis) : null,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const next = [...s.candidates, candidate];
      saveCandidatesToStorage(next);
      return { candidates: next };
    });
    return candidate;
  },

  updateCandidate: (id, patch) =>
    set((s) => {
      const next = s.candidates.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
      );
      saveCandidatesToStorage(next);
      return { candidates: next };
    }),

  removeCandidate: (id) =>
    set((s) => {
      const next = s.candidates.filter((c) => c.id !== id);
      saveCandidatesToStorage(next);
      return {
        candidates: next,
        selectedForCompareIds: s.selectedForCompareIds.filter((x) => x !== id),
      };
    }),

  toggleCompareSelection: (id) =>
    set((s) => {
      const has = s.selectedForCompareIds.includes(id);
      if (has) {
        return { selectedForCompareIds: s.selectedForCompareIds.filter((x) => x !== id) };
      }
      // cap at 5 simultaneous comparisons
      if (s.selectedForCompareIds.length >= 5) return s;
      return { selectedForCompareIds: [...s.selectedForCompareIds, id] };
    }),

  clearCompareSelection: () => set({ selectedForCompareIds: [] }),

  logRevision: (parameterName, oldValue, newValue) =>
    set((s) => {
      const entry: RevisionEntry = {
        id: uid(),
        candidateId: null,
        parameterName,
        oldValue,
        newValue,
        changedAt: new Date().toISOString(),
      };
      const next = [...s.revisions, entry].slice(-200);
      saveRevisionsToStorage(next);
      return { revisions: next };
    }),

  clearRevisions: () =>
    set(() => {
      saveRevisionsToStorage([]);
      return { revisions: [] };
    }),
}));
