'use client';
// Build cache bust: v2
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Settings, Play, AlertTriangle, RefreshCw, Plus, Trash2, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTarget, setNewTarget] = useState({ domain: '', url: '' });

  const { data: targets, isLoading: targetsLoading } = useQuery({
    queryKey: ['crawl-targets'],
    queryFn: () => api.getCrawlTargets(),
  });

  const { data: errors } = useQuery({
    queryKey: ['crawl-errors'],
    queryFn: () => api.getCrawlErrors(),
  });

  const { data: jobs } = useQuery({
    queryKey: ['crawl-jobs'],
    queryFn: () => api.getCrawlJobs(),
  });

  const triggerMutation = useMutation({
    mutationFn: (targetId: string) => api.triggerCrawl(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawl-targets'] });
      queryClient.invalidateQueries({ queryKey: ['crawl-jobs'] });
      alert('크롤링 작업이 시작되었습니다.');
    },
    onError: () => alert('크롤링 시작에 실패했습니다.'),
  });

  const addTargetMutation = useMutation({
    mutationFn: (data: { domain: string; urls: string[] }) => api.addCrawlTarget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawl-targets'] });
      setShowAddModal(false);
      setNewTarget({ domain: '', url: '' });
      alert('크롤링 대상이 추가되었습니다.');
    },
    onError: () => alert('크롤링 대상 추가에 실패했습니다.'),
  });

  const deleteTargetMutation = useMutation({
    mutationFn: (targetId: string) => api.deleteCrawlTarget(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawl-targets'] });
      alert('크롤링 대상이 삭제되었습니다.');
    },
    onError: () => alert('크롤링 대상 삭제에 실패했습니다.'),
  });

  const toggleTargetMutation = useMutation({
    mutationFn: ({ targetId, enabled }: { targetId: string; enabled: boolean }) => 
      enabled ? api.enableCrawlTarget(targetId) : api.disableCrawlTarget(targetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crawl-targets'] }),
  });

  const getTargetStatus = (targetId: string) => {
    if (!jobs?.items) return { status: 'none' };
    const targetJobs = jobs.items
      .filter((job: any) => job.targetId === targetId)
      .sort((a: any, b: any) => new Date(b.completedAt || b.startedAt || 0).getTime() - new Date(a.completedAt || a.startedAt || 0).getTime());
    if (targetJobs.length === 0) return { status: 'none' };
    const lastJob = targetJobs[0];
    if (lastJob.status === 'pending' || lastJob.status === 'running') return { status: 'pending' };
    if (lastJob.status === 'failed') return { status: 'failed', error: '크롤링 실패' };
    if (lastJob.failureCount > 0 && lastJob.successCount === 0) return { status: 'blocked', error: '접근 거부 (403/404)' };
    if (lastJob.successCount > 0) return { status: 'success' };
    return { status: 'none' };
  };

  const handleAddTarget = () => {
    if (!newTarget.domain || !newTarget.url) { alert('도메인과 URL을 입력해주세요.'); return; }
    addTargetMutation.mutate({ domain: newTarget.domain, urls: [newTarget.url] });
  };

  const handleDeleteTarget = (targetId: string, domain: string) => {
    if (confirm(`"${domain}" 크롤링 대상을 삭제하시겠습니까?`)) deleteTargetMutation.mutate(targetId);
  };

  if (targetsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">관리</h1>
        <p className="text-gray-500">크롤링 대상 및 에러 모니터링</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            크롤링 대상
          </h2>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            <Plus className="w-4 h-4" />
            대상 추가
          </button>
        </div>
        <div className="divide-y">
          {targets && targets.length > 0 ? targets.map((target: any) => {
            const targetStatus = getTargetStatus(target.id);
            return (
              <div key={target.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium">{target.domain}</p>
                      {targetStatus.status === 'success' && <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />정상</span>}
                      {targetStatus.status === 'blocked' && <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700"><XCircle className="w-3 h-3" />접근 거부</span>}
                      {targetStatus.status === 'failed' && <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700"><AlertCircle className="w-3 h-3" />실패</span>}
                      {targetStatus.status === 'pending' && <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700"><RefreshCw className="w-3 h-3 animate-spin" />진행중</span>}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">스케줄: {target.cronExpression} · 마지막 크롤링: {target.lastCrawled ? formatDate(target.lastCrawled) : '없음'}</p>
                    {targetStatus.error && <p className="text-sm text-red-500 mt-1">⚠️ {targetStatus.error}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => toggleTargetMutation.mutate({ targetId: target.id, enabled: !target.enabled })} className={`px-2 py-0.5 text-xs rounded-full cursor-pointer transition-colors ${target.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {target.enabled ? '활성' : '비활성'}
                      </button>
                      <span className="text-xs text-gray-500">URL {target.urls?.length || 0}개</span>
                    </div>
                    <div className="mt-2">
                      {target.urls?.slice(0, 2).map((url: string, idx: number) => <p key={idx} className="text-xs text-gray-400 truncate max-w-md">{url}</p>)}
                      {target.urls?.length > 2 && <p className="text-xs text-gray-400">+{target.urls.length - 2}개 더...</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => triggerMutation.mutate(target.id)} disabled={triggerMutation.isPending || !target.enabled} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {triggerMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      크롤링
                    </button>
                    <button onClick={() => handleDeleteTarget(target.id, target.domain)} disabled={deleteTargetMutation.isPending} className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : <div className="p-6 text-center text-gray-500">등록된 크롤링 대상이 없습니다.</div>}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            최근 에러 ({errors?.total || 0})
          </h2>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {errors?.items && errors.items.length > 0 ? errors.items.slice(0, 20).map((error: any) => (
            <div key={error.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-red-600">{error.errorType}</p>
                  <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate max-w-md">{error.url}</p>
                </div>
                <span className="text-xs text-gray-500">{formatDate(error.occurredAt)}</span>
              </div>
            </div>
          )) : <div className="p-6 text-center text-gray-500">에러가 없습니다.</div>}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">크롤링 대상 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">도메인 이름</label>
                <input type="text" value={newTarget.domain} onChange={(e) => setNewTarget({ ...newTarget, domain: e.target.value })} placeholder="예: techcrunch.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">크롤링 URL</label>
                <input type="text" value={newTarget.url} onChange={(e) => setNewTarget({ ...newTarget, url: e.target.value })} placeholder="예: https://techcrunch.com/tag/robots/" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">취소</button>
              <button onClick={handleAddTarget} disabled={addTargetMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{addTargetMutation.isPending ? '추가 중...' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
