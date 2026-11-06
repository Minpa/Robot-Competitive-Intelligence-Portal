'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { normalizeWeeklyBrief } from '@/lib/weekly-brief-format';
import { DEFAULT_EDIT_LIMITS, clientEditProblem, editLimitFor, execBaseTextAt } from '@/lib/weekly-brief-exec';
import type { WeeklyBriefAdminEdits, WeeklyBriefDraftListItem, WeeklyBriefEditLimits, WeeklyExecutivePayload } from '@/types/weekly-brief';
import { WEEKLY_BRIEF_QUERY_KEY, isNotFoundError } from './useWeeklyBrief';

export const WEEKLY_BRIEF_DRAFTS_KEY = [...WEEKLY_BRIEF_QUERY_KEY, 'drafts'] as const;
export const WEEKLY_BRIEF_ADMIN_EDITS_KEY = [...WEEKLY_BRIEF_QUERY_KEY, 'admin-edits'] as const;

/** 관리자: 발행 전 초안 목록 (비관리자는 호출하지 않는다) */
export function useWeeklyBriefDrafts(enabled: boolean) {
  return useQuery<WeeklyBriefDraftListItem[], Error>({
    queryKey: WEEKLY_BRIEF_DRAFTS_KEY,
    queryFn: async () => (await api.listWeeklyBriefDrafts()).items,
    enabled,
    staleTime: 15 * 1000,
    retry: false,
  });
}

/** 관리자: 한 주의 초안(AI 원문·편집본·효과 payload). 초안이 없으면 null */
export function useWeeklyBriefAdminEdits(weekStart: string | null, enabled: boolean) {
  return useQuery<WeeklyBriefAdminEdits | null, Error>({
    queryKey: [...WEEKLY_BRIEF_ADMIN_EDITS_KEY, weekStart],
    queryFn: async () => {
      try {
        const r = await api.getWeeklyBriefEdits(weekStart as string);
        return { ...r, effective: normalizeWeeklyBrief(r.effective) as WeeklyBriefAdminEdits['effective'] };
      } catch (err) {
        if (isNotFoundError(err)) return null;
        throw err;
      }
    },
    enabled: enabled && !!weekStart,
    staleTime: 0,
    retry: false,
  });
}

// ───────────────────────── 편집 컨텍스트 (EditableLine 이 읽는다) ─────────────────────────

export interface ExecEditApi {
  /** 편집 모드가 켜져 있는가 — 비관리자에게는 컨텍스트 자체가 없다 */
  enabled: boolean;
  limits: WeeklyBriefEditLimits;
  /** 화면에 보일 현재 텍스트 (저장 전 로컬 입력 포함) */
  valueOf(path: string, effectiveText: string): string;
  /** AI 원문과 다른가 */
  isEdited(path: string, effectiveText: string): boolean;
  /** 입력 점검 메시지 (없으면 null) */
  problemOf(path: string, effectiveText: string): string | null;
  set(path: string, text: string): void;
  /** AI 초안으로 되돌리기 */
  revert(path: string): void;
}

export const ExecEditContext = createContext<ExecEditApi | null>(null);

export function useExecEdit(): ExecEditApi | null {
  return useContext(ExecEditContext);
}

export interface WeeklyBriefEditor {
  data: WeeklyBriefAdminEdits;
  editMode: boolean;
  setEditMode(on: boolean): void;
  /** 저장하지 않은 변경 문장 수 */
  unsavedCount: number;
  /** 서버에 저장된 편집 문장 수 (AI 원문과 다른 문장) */
  savedCount: number;
  warnings: { path: string; codes: string[] }[];
  notice: string | null;
  saving: boolean;
  publishing: boolean;
  save(): void;
  publish(): void;
  unpublish(): void;
  api: ExecEditApi;
}

/**
 * 관리자 편집 상태 — 로컬 입력(local) 을 모았다가 저장(PATCH, rev 포함) · 발행 · 내리기를 수행한다.
 * 409 rev_conflict 이면 안내 후 서버 값을 다시 불러온다.
 */
export function useWeeklyBriefEditor(data: WeeklyBriefAdminEdits | null | undefined): WeeklyBriefEditor | null {
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [local, setLocal] = useState<Record<string, string | null>>({});
  const [warnings, setWarnings] = useState<{ path: string; codes: string[] }[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const ai = data?.aiPayload as WeeklyExecutivePayload | undefined;
  const saved = data?.edits;
  const limits = data?.limits ?? DEFAULT_EDIT_LIMITS;

  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: WEEKLY_BRIEF_ADMIN_EDITS_KEY });
    void qc.invalidateQueries({ queryKey: WEEKLY_BRIEF_DRAFTS_KEY });
  }, [qc]);

  const valueOf = useCallback(
    (path: string, effective: string): string => {
      if (path in local) {
        const v = local[path];
        return v === null ? (ai ? (execBaseTextAt(ai, path) ?? effective) : effective) : (v as string);
      }
      return effective;
    },
    [local, ai],
  );

  const isEdited = useCallback(
    (path: string, effective: string): boolean => {
      const base = ai ? execBaseTextAt(ai, path) : undefined;
      return base !== undefined && valueOf(path, effective) !== base;
    },
    [ai, valueOf],
  );

  const problemOf = useCallback((path: string, effective: string): string | null => clientEditProblem(valueOf(path, effective), editLimitFor(path, limits)), [valueOf, limits]);

  // 저장되어 있는 값과 다른 경로만 보낸다 (null = AI 원문으로 되돌리기)
  const pending = useMemo(() => {
    const out: Record<string, string | null> = {};
    for (const [path, v] of Object.entries(local)) {
      const savedText = saved?.[path] ?? null;
      if (v === null) {
        if (savedText !== null) out[path] = null;
      } else if (v !== savedText && !(savedText === null && ai && execBaseTextAt(ai, path) === v)) {
        out[path] = v;
      }
    }
    return out;
  }, [local, saved, ai]);
  const unsavedCount = Object.keys(pending).length;

  const saveMutation = useMutation({
    mutationFn: () => api.saveWeeklyBriefEdits(data!.weekStart, { rev: data!.rev, edits: pending }),
    onSuccess: (res) => {
      setWarnings(res.warnings);
      setNotice(null);
      setLocal({});
      refetch();
    },
    onError: (err: Error) => {
      if (err.message === 'rev_conflict') {
        setNotice('다른 곳에서 수정되었습니다. 새로 불러옵니다');
        setLocal({});
        refetch();
      } else if (err.message === 'invalid_edit') {
        setNotice('저장할 수 없는 문장이 있습니다. 표시된 안내를 확인하세요');
      } else {
        setNotice(`저장하지 못했습니다: ${err.message}`);
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => api.publishWeeklyBrief(data!.weekStart, { rev: data!.rev }),
    onSuccess: () => {
      setNotice('발행했습니다');
      void qc.invalidateQueries({ queryKey: WEEKLY_BRIEF_QUERY_KEY });
    },
    onError: (err: Error) => {
      if (err.message === 'rev_conflict') {
        setNotice('다른 곳에서 수정되었습니다. 새로 불러옵니다');
        setLocal({});
        refetch();
      } else if (err.message === 'guard_failed') setNotice('발행 전 검증에 실패한 문장이 있습니다. 저장된 편집을 확인하세요');
      else setNotice(`발행하지 못했습니다: ${err.message}`);
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: () => api.unpublishWeeklyBrief(data!.weekStart),
    onSuccess: () => {
      setNotice('발행을 내렸습니다. 초안으로 돌아갑니다');
      void qc.invalidateQueries({ queryKey: WEEKLY_BRIEF_QUERY_KEY });
    },
    onError: (err: Error) => setNotice(`내리지 못했습니다: ${err.message}`),
  });

  const editApi = useMemo<ExecEditApi>(
    () => ({
      enabled: editMode,
      limits,
      valueOf,
      isEdited,
      problemOf,
      set: (path, text) => setLocal((cur) => ({ ...cur, [path]: text })),
      revert: (path) => setLocal((cur) => ({ ...cur, [path]: null })),
    }),
    [editMode, limits, valueOf, isEdited, problemOf],
  );

  if (!data || !ai) return null;
  const savedCount = Object.keys(data.edits ?? {}).length;
  return {
    data,
    editMode,
    setEditMode,
    unsavedCount,
    savedCount,
    warnings,
    notice,
    saving: saveMutation.isPending,
    publishing: publishMutation.isPending,
    save: () => saveMutation.mutate(),
    publish: () => publishMutation.mutate(),
    unpublish: () => unpublishMutation.mutate(),
    api: editApi,
  };
}
