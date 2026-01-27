'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Settings, Play, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminPage() {
  const queryClient = useQueryClient();

  const { data: targets, isLoading: targetsLoading } = useQuery({
    queryKey: ['crawl-targets'],
    queryFn: () => api.getCrawlTargets(),
  });

  const { data: errors } = useQuery({
    queryKey: ['crawl-errors'],
    queryFn: () => api.getCrawlErrors(),
  });

  const triggerMutation = useMutation({
    mutationFn: (targetId: string) => api.triggerCrawl(targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crawl-targets'] });
      alert('크롤링 작업이 시작되었습니다.');
    },
    onError: () => {
      alert('크롤링 시작에 실패했습니다.');
    },
  });

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

      {/* Crawl Targets */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            크롤링 대상
          </h2>
        </div>
        <div className="divide-y">
          {targets && targets.length > 0 ? (
            targets.map((target: any) => (
              <div key={target.id} className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium">{target.domain}</p>
                  <p className="text-sm text-gray-500">
                    스케줄: {target.cronExpression} · 
                    마지막 크롤링: {target.lastCrawled ? formatDate(target.lastCrawled) : '없음'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      target.enabled 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {target.enabled ? '활성' : '비활성'}
                    </span>
                    <span className="text-xs text-gray-500">
                      URL {target.urls?.length || 0}개
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => triggerMutation.mutate(target.id)}
                  disabled={triggerMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {triggerMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  크롤링 시작
                </button>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              등록된 크롤링 대상이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Error Logs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            최근 에러 ({errors?.total || 0})
          </h2>
        </div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {errors?.items && errors.items.length > 0 ? (
            errors.items.slice(0, 20).map((error: any) => (
              <div key={error.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-red-600">{error.errorType}</p>
                    <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                    <p className="text-xs text-gray-400 mt-1 truncate max-w-md">
                      {error.url}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(error.occurredAt)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-gray-500">
              에러가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
