'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { ClipboardCheck, AlertTriangle, CheckCircle, Filter } from 'lucide-react';

const PERIODS = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: 'all', label: '전체' },
];

const TYPES = [
  { value: '', label: '전체' },
  { value: 'company', label: '회사' },
  { value: 'robot', label: '로봇' },
  { value: 'component', label: '부품' },
  { value: 'application', label: '적용 사례' },
];

export default function ReviewPage() {
  const [period, setPeriod] = useState('30d');
  const [type, setType] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['review-entities', period, type],
    queryFn: () => (api as any).request(`/review/entities?period=${period}${type ? `&type=${type}` : ''}`),
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <ClipboardCheck className="w-6 h-6 text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">엔티티 검토 대시보드</h1>
            </div>
            <p className="text-slate-400">최근 생성된 엔티티의 데이터 품질을 검토합니다.</p>
          </div>

          {/* 필터 */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <div className="flex gap-1">
                {PERIODS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1.5 rounded text-sm ${period === p.value ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-1">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded text-sm ${type === t.value ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 요약 카드 */}
          {data && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <p className="text-sm text-slate-400">전체</p>
                <p className="text-2xl font-bold text-white">{data.total}</p>
              </div>
              <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-4">
                <p className="text-sm text-amber-400">이슈 있음</p>
                <p className="text-2xl font-bold text-amber-300">{data.withIssues}</p>
              </div>
              <div className="bg-slate-900/50 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-sm text-emerald-400">정상</p>
                <p className="text-2xl font-bold text-emerald-300">{data.total - data.withIssues}</p>
              </div>
            </div>
          )}

          {/* 엔티티 목록 */}
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">로딩 중...</div>
          ) : (
            <div className="space-y-2">
              {data?.entities?.map((entity: any) => (
                <div key={entity.id} className={`bg-slate-900/50 border rounded-lg p-4 ${entity.issues.length > 0 ? 'border-amber-500/30' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {entity.issues.length > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="text-white font-medium">{entity.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded">{entity.type}</span>
                    </div>
                    <span className="text-xs text-slate-500">{new Date(entity.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  {entity.issues.length > 0 && (
                    <div className="ml-7 space-y-1">
                      {entity.issues.map((issue: any, i: number) => (
                        <p key={i} className={`text-xs ${issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                          [{issue.field}] {issue.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {data?.entities?.length === 0 && (
                <div className="text-center py-12 text-slate-500">해당 기간에 생성된 엔티티가 없습니다.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
