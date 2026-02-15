'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';

const ENVIRONMENTS = [
  { id: '', label: '전체' },
  { id: 'factory', label: '공장' },
  { id: 'warehouse', label: '물류창고' },
  { id: 'retail', label: '리테일' },
  { id: 'healthcare', label: '의료' },
  { id: 'hospitality', label: '호텔/서비스' },
  { id: 'home', label: '가정' },
  { id: 'research_lab', label: '연구소' },
  { id: 'other', label: '기타' },
];

const TASK_TYPES = [
  { id: '', label: '전체' },
  { id: 'assembly', label: '조립' },
  { id: 'picking', label: '피킹' },
  { id: 'packing', label: '포장' },
  { id: 'inspection', label: '검사' },
  { id: 'delivery', label: '배송' },
  { id: 'cleaning', label: '청소' },
  { id: 'assistance', label: '보조' },
  { id: 'other', label: '기타' },
];

export default function ApplicationCasesPage() {
  const [filters, setFilters] = useState({
    environment: '',
    taskType: '',
    deploymentStatus: '',
  });

  const { data: cases, isLoading } = useQuery({
    queryKey: ['application-cases', filters],
    queryFn: () => api.getApplicationCases(
      Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      ) as any
    ),
  });

  const { data: matrix } = useQuery({
    queryKey: ['environment-task-matrix'],
    queryFn: () => api.getEnvironmentTaskMatrix(),
  });

  const { data: demoTimeline } = useQuery({
    queryKey: ['demo-timeline'],
    queryFn: () => api.getDemoTimeline(),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'production': return 'bg-green-100 text-green-800';
      case 'pilot': return 'bg-yellow-100 text-yellow-800';
      case 'poc': return 'bg-orange-100 text-orange-800';
      case 'concept': return 'bg-purple-100 text-purple-800';
      case 'demo': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      production: '상용',
      pilot: '파일럿',
      poc: 'PoC',
      concept: '컨셉',
      demo: '시연',
    };
    return map[status] || status;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">적용 사례</h1>
            <p className="mt-2 text-gray-600">휴머노이드 로봇 실제 적용 사례 및 시연 이벤트</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 환경-작업 매트릭스 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">환경-작업 매트릭스</h2>
              <p className="text-sm text-gray-500 mb-4">적용 환경과 작업 유형별 사례 분포</p>
              
              {matrix?.matrix && Object.keys(matrix.matrix).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500"></th>
                        {TASK_TYPES.filter(t => t.id).slice(0, 5).map(task => (
                          <th key={task.id} className="px-2 py-1 text-center text-xs font-medium text-gray-500">
                            {task.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ENVIRONMENTS.filter(e => e.id).slice(0, 5).map(env => (
                        <tr key={env.id}>
                          <td className="px-2 py-1 text-xs font-medium text-gray-700">{env.label}</td>
                          {TASK_TYPES.filter(t => t.id).slice(0, 5).map(task => {
                            const cell = matrix.matrix[env.id]?.[task.id];
                            const count = cell?.count ?? 0;
                            return (
                              <td key={task.id} className="px-2 py-1 text-center">
                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded text-xs font-medium ${
                                  count > 3 ? 'bg-blue-600 text-white' :
                                  count > 1 ? 'bg-blue-300 text-blue-900' :
                                  count > 0 ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-50 text-gray-400'
                                }`}>
                                  {count}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다.</p>
              )}
            </div>

            {/* 시연 타임라인 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">최근 시연 이벤트</h2>
              <p className="text-sm text-gray-500 mb-4">주요 시연 및 발표 일정</p>
              
              {demoTimeline?.events && demoTimeline.events.length > 0 ? (
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {demoTimeline.events.map((event: any) => (
                    <div key={event.id} className="flex gap-4 border-l-2 border-blue-500 pl-4">
                      <div className="flex-shrink-0 text-sm text-gray-500">
                        {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : '-'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <p className="text-sm text-gray-500">
                          {event.robotName} · {event.companyName}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-400 mt-1">📍 {event.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">시연 이벤트가 없습니다.</p>
              )}
            </div>
          </div>

          {/* 필터 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">환경</label>
                <select
                  value={filters.environment}
                  onChange={(e) => setFilters(prev => ({ ...prev, environment: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {ENVIRONMENTS.map(env => (
                    <option key={env.id} value={env.id}>{env.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">작업 유형</label>
                <select
                  value={filters.taskType}
                  onChange={(e) => setFilters(prev => ({ ...prev, taskType: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {TASK_TYPES.map(task => (
                    <option key={task.id} value={task.id}>{task.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">배포 상태</label>
                <select
                  value={filters.deploymentStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, deploymentStatus: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">전체</option>
                  <option value="production">상용</option>
                  <option value="pilot">파일럿</option>
                  <option value="poc">PoC</option>
                  <option value="concept">컨셉</option>
                  <option value="demo">시연</option>
                </select>
              </div>
            </div>
          </div>

          {/* 사례 목록 */}
          <div className="bg-white rounded-lg shadow">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : cases?.items && cases.items.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {cases.items.map((caseItem: any) => (
                  <div key={caseItem.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{caseItem.demoEvent || caseItem.description || '적용 사례'}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {caseItem.robotName} · {caseItem.companyName}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(caseItem.deploymentStatus)}`}>
                        {getStatusLabel(caseItem.deploymentStatus)}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {ENVIRONMENTS.find(e => e.id === caseItem.environment)?.label || caseItem.environment}
                      </span>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        {TASK_TYPES.find(t => t.id === caseItem.taskType)?.label || caseItem.taskType}
                      </span>
                    </div>
                    
                    {caseItem.description && caseItem.demoEvent && (
                      <p className="text-sm text-gray-600 mt-3">{caseItem.description}</p>
                    )}
                    
                    {caseItem.metrics && (
                      <div className="mt-3 flex gap-4 text-sm text-gray-500">
                        {caseItem.metrics.efficiency && (
                          <span>효율성: {caseItem.metrics.efficiency}%</span>
                        )}
                        {caseItem.metrics.accuracy && (
                          <span>정확도: {caseItem.metrics.accuracy}%</span>
                        )}
                        {caseItem.metrics.throughput && (
                          <span>처리량: {caseItem.metrics.throughput}/h</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                적용 사례가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
