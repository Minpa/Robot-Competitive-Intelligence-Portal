'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';

const PURPOSE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'industrial', label: '산업용' },
  { value: 'home', label: '가정용' },
  { value: 'service', label: '서비스용' },
];

const LOCOMOTION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'biped', label: '2족 보행' },
  { value: 'wheel', label: '휠베이스' },
  { value: 'hybrid', label: '하이브리드' },
];

const HAND_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'gripper', label: '단순 그리퍼' },
  { value: 'multi_finger', label: '다지 손' },
  { value: 'modular', label: '교체형' },
];

const STAGE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'concept', label: '개념' },
  { value: 'prototype', label: '프로토타입' },
  { value: 'poc', label: 'PoC' },
  { value: 'pilot', label: '파일럿' },
  { value: 'commercial', label: '상용화' },
];

const REGION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'north_america', label: '북미' },
  { value: 'europe', label: '유럽' },
  { value: 'china', label: '중국' },
  { value: 'japan', label: '일본' },
  { value: 'korea', label: '한국' },
  { value: 'other', label: '기타' },
];

export default function HumanoidRobotsPage() {
  const [filters, setFilters] = useState({
    purpose: '',
    locomotionType: '',
    handType: '',
    stage: '',
    region: '',
    sortBy: 'name',
    sortOrder: 'asc' as 'asc' | 'desc',
    page: 1,
    limit: 12,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['humanoid-robots', filters],
    queryFn: () => api.getHumanoidRobots(
      Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
      ) as any
    ),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const getPurposeIcon = (purpose: string) => {
    switch (purpose) {
      case 'industrial': return '🏭';
      case 'home': return '🏠';
      case 'service': return '🏨';
      default: return '🤖';
    }
  };

  const getLocomotionIcon = (type: string) => {
    switch (type) {
      case 'biped': return '🚶';
      case 'wheel': return '🛞';
      case 'hybrid': return '🔄';
      default: return '❓';
    }
  };

  const getHandIcon = (type: string) => {
    switch (type) {
      case 'gripper': return '🦾';
      case 'multi_finger': return '🖐️';
      case 'modular': return '🔧';
      default: return '❓';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'concept': return 'bg-gray-100 text-gray-800';
      case 'prototype': return 'bg-blue-100 text-blue-800';
      case 'poc': return 'bg-yellow-100 text-yellow-800';
      case 'pilot': return 'bg-orange-100 text-orange-800';
      case 'commercial': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">휴머노이드 로봇 카탈로그</h1>
            <p className="mt-2 text-gray-600">산업용/가정용, 이동 방식, Hand 타입별 휴머노이드 로봇 분석</p>
          </div>

          {/* 필터 패널 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">용도</label>
                <select
                  value={filters.purpose}
                  onChange={(e) => handleFilterChange('purpose', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {PURPOSE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이동 방식</label>
                <select
                  value={filters.locomotionType}
                  onChange={(e) => handleFilterChange('locomotionType', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {LOCOMOTION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hand 타입</label>
                <select
                  value={filters.handType}
                  onChange={(e) => handleFilterChange('handType', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {HAND_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상용 단계</label>
                <select
                  value={filters.stage}
                  onChange={(e) => handleFilterChange('stage', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {STAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">지역</label>
                <select
                  value={filters.region}
                  onChange={(e) => handleFilterChange('region', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {REGION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">정렬</label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="name-asc">이름 (A-Z)</option>
                  <option value="name-desc">이름 (Z-A)</option>
                  <option value="company-asc">회사 (A-Z)</option>
                  <option value="year-desc">최신순</option>
                  <option value="year-asc">오래된순</option>
                </select>
              </div>
            </div>
          </div>

          {/* 결과 */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">로딩 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">데이터를 불러오는 중 오류가 발생했습니다.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                총 {data?.total || 0}개의 로봇
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data?.items?.map((robot: any) => (
                  <Link
                    key={robot.id}
                    href={`/humanoid-robots/${robot.id}`}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{robot.name}</h3>
                          <p className="text-sm text-gray-500">{robot.companyName || robot.company?.name}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStageColor(robot.stage)}`}>
                          {STAGE_OPTIONS.find(s => s.value === robot.stage)?.label || robot.stage}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-1" title="용도">
                          <span className="text-xl">{getPurposeIcon(robot.purpose)}</span>
                          <span className="text-xs text-gray-500">
                            {PURPOSE_OPTIONS.find(p => p.value === robot.purpose)?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" title="이동 방식">
                          <span className="text-xl">{getLocomotionIcon(robot.locomotionType)}</span>
                          <span className="text-xs text-gray-500">
                            {LOCOMOTION_OPTIONS.find(l => l.value === robot.locomotionType)?.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" title="Hand 타입">
                          <span className="text-xl">{getHandIcon(robot.handType)}</span>
                          <span className="text-xs text-gray-500">
                            {HAND_TYPE_OPTIONS.find(h => h.value === robot.handType)?.label}
                          </span>
                        </div>
                      </div>

                      {robot.announcedYear && (
                        <p className="text-sm text-gray-500">발표: {robot.announcedYear}년</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* 페이지네이션 */}
              {data && data.total > filters.limit && (
                <div className="mt-8 flex justify-center gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={filters.page === 1}
                    className="px-4 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    {filters.page} / {Math.ceil(data.total / filters.limit)}
                  </span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={filters.page >= Math.ceil(data.total / filters.limit)}
                    className="px-4 py-2 rounded-md bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              )}

              {data?.items?.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-gray-500">조건에 맞는 로봇이 없습니다.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
