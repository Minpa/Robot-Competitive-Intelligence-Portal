'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Check, Plus, Search } from 'lucide-react';

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Slugs already added as competitors — those rows are shown as disabled. */
  existingSlugs?: string[];
}

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const STAGE_LABELS: Record<string, string> = {
  concept: 'Concept',
  prototype: 'Prototype',
  poc: 'PoC',
  pilot: 'Pilot',
  commercial: 'Commercial',
  development: 'Development',
};

export function AddCompetitorModal({ isOpen, onClose, onSuccess, existingSlugs = [] }: AddCompetitorModalProps) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['humanoid-robots-all-for-picker'],
    queryFn: () => api.getHumanoidRobots({ limit: 200 }),
    enabled: isOpen,
    staleTime: 60_000,
  });

  const existingSet = useMemo(() => new Set(existingSlugs), [existingSlugs]);

  const robots = useMemo(() => {
    const items: { id: string; name: string; companyName: string; country: string; stage: string; slug: string; imageUrl: string | null }[] = [];
    const list: any[] = Array.isArray(data) ? data : (data as any)?.robots ?? (data as any)?.data ?? [];
    for (const item of list) {
      const r = item.robot ?? item;
      const c = item.company ?? {};
      items.push({
        id: r.id,
        name: r.name,
        companyName: c.name ?? r.companyName ?? 'Unknown',
        country: c.country ?? '—',
        stage: r.commercializationStage ?? 'prototype',
        slug: toSlug(r.name),
        imageUrl: r.imageUrl ?? null,
      });
    }
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.companyName.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q),
    );
  }, [data, query]);

  if (!isOpen) return null;

  const handlePick = async (robot: typeof robots[number]) => {
    if (existingSet.has(robot.slug) || justAdded.has(robot.slug)) return;
    setAdding(robot.slug);
    setError('');
    try {
      await api.addCiCompetitor({
        slug: robot.slug,
        name: robot.name,
        manufacturer: robot.companyName,
        country: robot.country !== '—' ? robot.country : undefined,
        stage: robot.stage,
      });
      setJustAdded((prev) => {
        const next = new Set(prev);
        next.add(robot.slug);
        return next;
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || '추가 실패');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl border border-ink-200 max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-ink-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-ink-900">경쟁사 추가</h3>
            <button onClick={onClose} className="text-ink-400 hover:text-ink-700 text-lg leading-none">×</button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="로봇 이름 · 제조사 · 국가로 검색"
              className="w-full bg-ink-100 border border-ink-200 rounded-lg pl-10 pr-3 py-2 text-ink-900 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          {error && (
            <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5">
              {error}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="py-10 text-center text-ink-500 text-sm">로봇 목록 로딩 중...</div>
          ) : robots.length === 0 ? (
            <div className="py-10 text-center text-ink-500 text-sm">
              {query ? '검색 결과가 없습니다.' : '등록된 로봇이 없습니다.'}
            </div>
          ) : (
            <ul className="space-y-1.5">
              {robots.map((robot) => {
                const already = existingSet.has(robot.slug);
                const nowAdded = justAdded.has(robot.slug);
                const isAdding = adding === robot.slug;
                const disabled = already || nowAdded || isAdding;

                return (
                  <li key={robot.id}>
                    <button
                      onClick={() => handlePick(robot)}
                      disabled={disabled}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        disabled
                          ? 'border-ink-100 bg-ink-100/50 cursor-not-allowed'
                          : 'border-ink-200 bg-white hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${disabled ? 'text-ink-500' : 'text-ink-900'}`}>
                            {robot.name}
                          </p>
                          <span className="text-[10px] font-mono text-ink-400 uppercase tracking-wide shrink-0">
                            {STAGE_LABELS[robot.stage] ?? robot.stage}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-ink-500 mt-0.5">
                          <span className="truncate">{robot.companyName}</span>
                          <span className="text-ink-300">·</span>
                          <span className="shrink-0">{robot.country}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {already || nowAdded ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                            추가됨
                          </span>
                        ) : isAdding ? (
                          <span className="text-xs text-ink-500">추가 중...</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <Plus className="w-3.5 h-3.5" />
                            추가
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
          <span>총 {robots.length}개 로봇 · 이미 추가된 항목은 비활성화</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-ink-100 text-ink-700 text-sm hover:bg-ink-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
