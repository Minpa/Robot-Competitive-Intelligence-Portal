'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Link from 'next/link';

const COMPONENT_TYPES = [
  { id: '', label: '전체' },
  { id: 'actuator', label: '액추에이터' },
  { id: 'soc', label: 'SoC' },
  { id: 'sensor', label: '센서' },
  { id: 'power', label: '전원' },
];

export default function ComponentsTrendPage() {
  const [selectedType, setSelectedType] = useState('');
  const [page, setPage] = useState(1);

  const { data: components, isLoading } = useQuery({
    queryKey: ['components', selectedType, page],
    queryFn: () => api.getComponents({
      type: selectedType || undefined,
      page,
      limit: 20,
    }),
  });

  const { data: torqueData } = useQuery({
    queryKey: ['torque-density'],
    queryFn: () => api.getTorqueDensityChart(),
  });

  const { data: topsData } = useQuery({
    queryKey: ['tops-timeline'],
    queryFn: () => api.getTopsTimeline(),
  });

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">부품 동향</h1>
            <p className="mt-2 text-gray-600">액추에이터, SoC, 센서, 전원 등 핵심 부품 분석</p>
          </div>

          {/* 차트 섹션 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 토크 밀도 차트 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">토크 밀도 vs 무게</h2>
              <p className="text-sm text-gray-500 mb-4">액추에이터 성능 비교</p>
              
              {torqueData?.data && torqueData.data.length > 0 ? (
                <div className="h-64 relative">
                  {/* 간단한 산점도 시각화 */}
                  <div className="absolute inset-0 border-l border-b border-gray-300">
                    {torqueData.data.map((item: any, idx: number) => {
                      const maxTorque = Math.max(...torqueData.data.map((d: any) => d.torqueDensity));
                      const maxWeight = Math.max(...torqueData.data.map((d: any) => d.weight));
                      const x = (item.weight / maxWeight) * 90 + 5;
                      const y = 95 - (item.torqueDensity / maxTorque) * 90;
                      return (
                        <div
                          key={idx}
                          className="absolute w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 hover:bg-blue-700 cursor-pointer"
                          style={{ left: `${x}%`, top: `${y}%` }}
                          title={`${item.name}\n토크밀도: ${item.torqueDensity}\n무게: ${item.weight}kg`}
                        />
                      );
                    })}
                  </div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                    무게 (kg)
                  </div>
                  <div className="absolute left-0 top-1/2 transform -rotate-90 -translate-y-1/2 text-xs text-gray-500">
                    토크 밀도
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다.</p>
              )}
            </div>

            {/* TOPS 타임라인 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">TOPS 추이</h2>
              <p className="text-sm text-gray-500 mb-4">연도별 SoC 연산 성능 변화</p>
              
              {topsData?.data && topsData.data.length > 0 ? (
                <div className="space-y-4">
                  {topsData.data.map((yearData: any) => (
                    <div key={yearData.year}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900">{yearData.year}</span>
                        <span className="text-gray-500">
                          평균: {yearData.avgTops?.toFixed(1)} / 최대: {yearData.maxTops?.toFixed(1)} TOPS
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                          style={{ width: `${(yearData.maxTops / 500) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다.</p>
              )}
            </div>
          </div>

          {/* 부품 목록 */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">부품 목록</h2>
                <div className="flex gap-2">
                  {COMPONENT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => {
                        setSelectedType(type.id);
                        setPage(1);
                      }}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        selectedType === type.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : components?.items && components.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">회사</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">스펙</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">적용 로봇</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {components.items.map((component: any) => (
                      <tr key={component.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/components-trend/${component.id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {component.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {component.company || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            component.type === 'actuator' ? 'bg-blue-100 text-blue-800' :
                            component.type === 'soc' ? 'bg-purple-100 text-purple-800' :
                            component.type === 'sensor' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {COMPONENT_TYPES.find(t => t.id === component.type)?.label || component.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {component.specs ? JSON.stringify(component.specs).slice(0, 50) + '...' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {component.robotCount || 0}개
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                부품 데이터가 없습니다.
              </div>
            )}

            {/* 페이지네이션 */}
            {components && components.total > 20 && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {page} / {Math.ceil(components.total / 20)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(components.total / 20)}
                  className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
