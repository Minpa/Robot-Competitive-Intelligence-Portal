'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { HumanoidRobotCard, RobotCompareModal, RobotTableView } from '@/components/humanoid-robots';
import { LayoutGrid, Table, GitCompare, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

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

const PRICE_BAND_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'low', label: '저가 (<50K USD)' },
  { value: 'mid', label: '중가 (50K-150K)' },
  { value: 'high', label: '고가 (>150K USD)' },
];

const SALES_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'on_sale', label: '판매 중' },
  { value: 'coming_soon', label: '출시 예정' },
  { value: 'poc_only', label: 'PoC만' },
  { value: 'not_for_sale', label: '비매품/컨셉' },
];

const SORT_OPTIONS = [
  { value: 'competitiveness-desc', label: '경쟁력 점수 (높은순)' },
  { value: 'competitiveness-asc', label: '경쟁력 점수 (낮은순)' },
  { value: 'year-desc', label: '출시 연도 (최신순)' },
  { value: 'year-asc', label: '출시 연도 (오래된순)' },
  { value: 'name-asc', label: '이름 (A-Z)' },
  { value: 'name-desc', label: '이름 (Z-A)' },
];

export default function HumanoidRobotsPage() {
  // 필터 상태
  const [filters, setFilters] = useState({
    purpose: '',
    locomotionType: '',
    handType: '',
    stage: '',
    region: '',
    priceBand: '',
    salesStatus: '',
    sortBy: 'competitiveness',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
    limit: 10,
  });

  // 뷰 모드: card / table
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  
  // 비교 모드
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

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

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split('-');
    setFilters(prev => ({ ...prev, sortBy, sortOrder: sortOrder as 'asc' | 'desc' }));
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 4) {
        return prev; // 최대 4개
      }
      return [...prev, id];
    });
  };

  const toggleCompareMode = () => {
    if (compareMode) {
      setSelectedIds([]);
    }
    setCompareMode(!compareMode);
  };

  // 선택된 로봇 데이터
  const selectedRobots = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((r: any) => selectedIds.includes(r.id));
  }, [data?.items, selectedIds]);

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          <PageHeader
            module="TELEMETRY MODULE V4.2"
            titleKo="휴머노이드 로봇 리스트"
            titleEn="ROBOT REGISTRY"
            description="등록된 휴머노이드 로봇 제품 목록"
          />

          {/* 필터 패널 */}
          <div className="bg-white backdrop-blur rounded-xl border border-ink-100 p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {/* 용도 */}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">용도</label>
                <select
                  value={filters.purpose}
                  onChange={(e) => handleFilterChange('purpose', e.target.value)}
                  className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
                >
                  {PURPOSE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 이동 방식 */}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">이동 방식</label>
                <select
                  value={filters.locomotionType}
                  onChange={(e) => handleFilterChange('locomotionType', e.target.value)}
                  className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
                >
                  {LOCOMOTION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Hand 타입 */}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">Hand 타입</label>
                <select
                  value={filters.handType}
                  onChange={(e) => handleFilterChange('handType', e.target.value)}
                  className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
                >
                  {HAND_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 상용 단계 */}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">상용 단계</label>
                <select
                  value={filters.stage}
                  onChange={(e) => handleFilterChange('stage', e.target.value)}
                  className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
                >
                  {STAGE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 지역 */}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">지역</label>
                <select
                  value={filters.region}
                  onChange={(e) => handleFilterChange('region', e.target.value)}
                  className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
                >
                  {REGION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 가격 구간 */}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">가격 구간</label>
                <select
                  value={filters.priceBand}
                  onChange={(e) => handleFilterChange('priceBand', e.target.value)}
                  className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
                >
                  {PRICE_BAND_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 판매 상태 */}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">판매 상태</label>
                <select
                  value={filters.salesStatus}
                  onChange={(e) => handleFilterChange('salesStatus', e.target.value)}
                  className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
                >
                  {SALES_STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 정렬 */}
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1">정렬</label>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 뷰 컨트롤 바 */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-ink-500">
              총 {data?.total || 0}개의 로봇
            </div>
            <div className="flex items-center gap-2">
              {/* 비교 모드 토글 */}
              <button
                onClick={toggleCompareMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  compareMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-ink-500 hover:bg-ink-100'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                비교 모드
              </button>

              {/* 뷰 모드 토글 */}
              <div className="flex bg-white rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'card' ? 'bg-info-soft/50 text-ink-900' : 'text-ink-500 hover:text-ink-900'
                  }`}
                  title="카드 뷰"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'table' ? 'bg-info-soft/50 text-ink-900' : 'text-ink-500 hover:text-ink-900'
                  }`}
                  title="테이블 뷰"
                >
                  <Table className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 비교 모드 선택 바 */}
          {compareMode && selectedIds.length > 0 && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 mb-4 flex items-center justify-between">
              <span className="text-sm text-blue-300">
                {selectedIds.length}개 선택됨 (최대 4개)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-ink-700 hover:text-ink-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                  선택 해제
                </button>
                <button
                  onClick={() => setShowCompareModal(true)}
                  disabled={selectedIds.length < 2}
                  className="px-4 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  비교하기
                </button>
              </div>
            </div>
          )}

          {/* 결과 */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-ink-500">로딩 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">데이터를 불러오는 중 오류가 발생했습니다.</p>
            </div>
          ) : (
            <>
              {viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {data?.items?.map((robot: any) => (
                    <HumanoidRobotCard
                      key={robot.id}
                      robot={robot}
                      isSelected={selectedIds.includes(robot.id)}
                      onSelect={handleSelect}
                      showCheckbox={compareMode}
                    />
                  ))}
                </div>
              ) : (
                <RobotTableView
                  robots={data?.items || []}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  showCheckbox={compareMode}
                />
              )}

              {/* 페이지네이션 */}
              {data && data.total > filters.limit && (
                <div className="mt-8 flex justify-center gap-2">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={filters.page === 1}
                    className="px-4 py-2 rounded-lg bg-white border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    이전
                  </button>
                  <span className="px-4 py-2 text-sm text-ink-500">
                    {filters.page} / {Math.ceil(data.total / filters.limit)}
                  </span>
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={filters.page >= Math.ceil(data.total / filters.limit)}
                    className="px-4 py-2 rounded-lg bg-white border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    다음
                  </button>
                </div>
              )}

              {data?.items?.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-ink-100">
                  <p className="text-ink-500">조건에 맞는 로봇이 없습니다.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 비교 모달 */}
        {showCompareModal && (
          <RobotCompareModal
            robots={selectedRobots}
            onClose={() => setShowCompareModal(false)}
          />
        )}
      </div>
    </AuthGuard>
  );
}
