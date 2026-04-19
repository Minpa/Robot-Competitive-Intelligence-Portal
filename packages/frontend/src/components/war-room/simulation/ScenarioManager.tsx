'use client';

import { useState } from 'react';
import { useWarRoomScenarios, useCreateWarRoomScenario, useDeleteWarRoomScenario } from '@/hooks/useWarRoom';
import type { WhatifScenario } from '@/types/war-room';
import type { WhatIfSpecs, WhatIfResult } from '@/lib/war-room-calculator';
import { Save, Trash2, Download } from 'lucide-react';

interface Props {
  currentSpecs: WhatIfSpecs;
  currentResult: WhatIfResult;
  baseRobotId: string | null;
  onLoad: (overrides: Record<string, unknown>) => void;
}

export function ScenarioManager({ currentSpecs, currentResult, baseRobotId, onLoad }: Props) {
  const [name, setName] = useState('');
  const { data: scenarios, isLoading } = useWarRoomScenarios();
  const createMutation = useCreateWarRoomScenario();
  const deleteMutation = useDeleteWarRoomScenario();

  async function handleSave() {
    if (!name.trim()) return;
    await createMutation.mutateAsync({
      name: name.trim(),
      base_robot_id: baseRobotId,
      parameter_overrides: currentSpecs,
      calculated_scores: currentResult,
    });
    setName('');
  }

  return (
    <div className="rounded-lg bg-white border border-ink-100 p-4">
      <h3 className="text-sm font-semibold text-ink-900 mb-3">시나리오 관리</h3>

      {/* Save */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="시나리오 이름"
          className="flex-1 rounded-md bg-paper border border-ink-200 px-3 py-1.5 text-xs text-ink-900 placeholder-ink-500 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={!name.trim() || createMutation.isPending}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-3 w-3" />
          저장
        </button>
      </div>

      {/* Saved scenarios */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-10 bg-ink-100 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {(scenarios ?? []).length === 0 ? (
            <p className="text-xs text-ink-500 text-center py-2">저장된 시나리오 없음</p>
          ) : (
            (scenarios ?? []).map((s: WhatifScenario) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md bg-ink-100 border border-ink-100 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink-900 truncate">{s.name}</p>
                  <p className="text-[10px] text-ink-500">
                    {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => onLoad(s.parameterOverrides)}
                    className="rounded p-1 text-ink-500 hover:text-blue-400 hover:bg-ink-100"
                    title="불러오기"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(s.id)}
                    className="rounded p-1 text-ink-500 hover:text-red-400 hover:bg-ink-100"
                    title="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
