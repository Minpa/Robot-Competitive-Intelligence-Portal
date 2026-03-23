'use client';

import { useCiStaging } from '@/hooks/useCiUpdate';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

export function CiStagingPanel() {
  const { data, isLoading, error } = useCiStaging();
  const [processing, setProcessing] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await api.approveCiStaging(id, 'admin');
      queryClient.invalidateQueries({ queryKey: ['ci-update'] });
    } catch (err) {
      console.error('Failed to approve:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setProcessing(id);
    try {
      await api.dismissCiStaging(id, 'admin');
      queryClient.invalidateQueries({ queryKey: ['ci-update', 'staging'] });
    } catch (err) {
      console.error('Failed to dismiss:', err);
    } finally {
      setProcessing(null);
    }
  };

  if (isLoading) return <div className="text-slate-400 text-sm p-4">로딩 중...</div>;
  if (error) return <div className="text-red-400 text-sm p-4">에러 발생</div>;
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-white mb-2">스테이징 큐</h3>
        <p className="text-slate-500 text-xs">대기 중인 업데이트가 없습니다.</p>
      </div>
    );
  }

  const channelLabels: Record<string, string> = {
    auto: '자동 수집',
    ai_assist: 'AI 보조',
    manual: '수동',
  };

  const typeLabels: Record<string, string> = {
    value_update: '값 업데이트',
    new_competitor: '새 경쟁사',
    score_adjust: '스코어 조정',
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">스테이징 큐</h3>
        <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full">
          {data.length}건 대기
        </span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-auto">
        {data.map(entry => (
          <div key={entry.id} className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-slate-600 text-slate-300">
                  {typeLabels[entry.updateType] || entry.updateType}
                </span>
                <span className="text-xs text-slate-400">
                  {channelLabels[entry.sourceChannel] || entry.sourceChannel}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                {new Date(entry.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>

            {/* Payload preview */}
            <div className="bg-slate-800/50 rounded p-2 mb-2 max-h-24 overflow-auto">
              <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">
                {JSON.stringify(entry.payload, null, 2).slice(0, 300)}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => handleDismiss(entry.id)}
                disabled={processing === entry.id}
                className="px-3 py-1 text-xs rounded bg-slate-600 text-slate-300 hover:bg-slate-500 disabled:opacity-50"
              >
                무시
              </button>
              <button
                onClick={() => handleApprove(entry.id)}
                disabled={processing === entry.id}
                className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
              >
                {processing === entry.id ? '처리 중...' : '승인'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
