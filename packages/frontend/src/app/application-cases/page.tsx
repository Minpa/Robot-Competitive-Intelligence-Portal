'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  EnhancedEnvironmentTaskMatrix,
  RecentDeploymentEventsCard,
  ApplicationCaseCard,
  CaseDetailDrawer,
} from '@/components/application-cases';

const ENVIRONMENTS = [
  { id: '', label: '전체' },
  { id: 'factory', label: '공장' },
  { id: 'warehouse', label: '물류센터' },
  { id: 'retail', label: '리테일' },
  { id: 'healthcare', label: '병원' },
  { id: 'hospitality', label: '호텔' },
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
  { id: 'transport', label: '운반' },
  { id: 'other', label: '기타' },
];

const SPACE_TYPES = [
  { id: '', label: '전체' },
  { id: 'factory_line', label: '공장 라인' },
  { id: 'logistics_center', label: '물류센터' },
  { id: 'retail_store', label: '리테일 매장' },
  { id: 'hospital', label: '병원' },
  { id: 'hotel', label: '호텔' },
  { id: 'home', label: '가정' },
  { id: 'other', label: '기타' },
];

const ROBOT_TYPES = [
  { id: '', label: '전체' },
  { id: 'humanoid', label: '휴머노이드' },
  { id: 'arm', label: '팔형 로봇' },
  { id: 'amr', label: 'AMR' },
  { id: 'other', label: '기타' },
];

const SORT_OPTIONS = [
  { id: 'latest', label: '최신 적용일' },
  { id: 'impact', label: '임팩트' },
  { id: 'difficulty', label: '난이도' },
];

export default function ApplicationCasesPage() {
  const [filters, setFilters] = useState({
    environment: '',
    taskType: '',
    deploymentStatus: '',
    spaceType: '',
    robotType: '',
    sortBy: 'latest',
  });

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // 적용 사례 목록
  const { data: cases, isLoading } = useQuery({
    queryKey: ['application-cases', filters],
    queryFn: () => api.getApplicationCases(
      Object.fromEntries(
        Object.entries(filters).filter(([k, v]) => v !== '' && k !== 'sortBy' && k !== 'spaceType' && k !== 'robotType')
      ) as any
    ),
  });

  // 환경-작업 매트릭스
  const { data: matrix } = useQuery({
    queryKey: ['environment-task-matrix'],
    queryFn: () => api.getEnvironmentTaskMatrix(),
  });

  // 시연 타임라인
  const { data: demoTimeline } = useQuery({
    queryKey: ['demo-timeline'],
    queryFn: () => api.getDemoTimeline(),
  });

  // 선택된 케이스 상세
  const { data: selectedCaseDetail } = useQuery({
    queryKey: ['application-case', selectedCaseId],
    queryFn: () => selectedCaseId ? api.getApplicationCase(selectedCaseId) : null,
    enabled: !!selectedCaseId,
  });

  // 통계 계산
  const stats = useMemo(() => {
    const items = cases?.items || [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return {
      newDeployments30d: items.filter((c: any) => {
        if (!c.demoDate) return false;
        return new Date(c.demoDate) >= thirtyDaysAgo;
      }).length,
      pocToProductionCount: items.filter((c: any) => c.deploymentStatus === 'production').length,
      failedCount: items.filter((c: any) => c.deploymentStatus === 'ended').length,
    };
  }, [cases]);

  // 하이라이트 사례
  const highlights = useMemo(() => {
    const items = cases?.items || [];
    return items.slice(0, 2).map((c: any) => ({
      id: c.id,
      title: c.demoEvent || c.description || '적용 사례',
      companyName: c.companyName || '',
      robotName: c.robotName || '',
      description: c.description || '',
      status: c.deploymentStatus || 'poc',
    }));
  }, [cases]);

  // 케이스 카드 데이터 변환
  const caseCards = useMemo(() => {
    return (cases?.items || []).map((c: any) => ({
      id: c.id,
      title: c.demoEvent || c.description || '적용 사례',
      status: c.deploymentStatus || 'poc',
      environment: c.environment || 'other',
      taskType: c.taskType || 'other',
      robotName: c.robotName || '',
      companyName: c.companyName || '',
      description: c.description,
      robotType: 'humanoid', // 기본값
    }));
  }, [cases]);

  // 케이스 상세 데이터 변환
  const drawerCaseDetail = useMemo(() => {
    if (!selectedCaseDetail) return null;
    const c = selectedCaseDetail;
    return {
      id: c.case?.id || c.id,
      title: c.case?.demoEvent || c.demoEvent || '적용 사례',
      status: c.case?.deploymentStatus || c.deploymentStatus || 'poc',
      environment: c.case?.environmentType || c.environment || 'other',
      taskType: c.case?.taskType || c.taskType || 'other',
      description: c.case?.taskDescription || c.description,
      robots: c.robot ? [{
        id: c.robot.id,
        name: c.robot.name,
        companyName: c.company?.name || '',
        mainSpec: '',
        role: c.case?.taskType || '작업 수행',
      }] : [],
      effects: [],
      relatedLinks: [],
    };
  }, [selectedCaseDetail]);

  const handleCellClick = (environment: string, task: string) => {
    setFilters(prev => ({
      ...prev,
      environment,
      taskType: task,
    }));
  };

  const handleCaseClick = (id: string) => {
    setSelectedCaseId(id);
    setIsDrawerOpen(true);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">적용 사례</h1>
            <p className="mt-2 text-gray-600">휴머노이드 로봇 실제 적용 사례 및 시연 이벤트</p>
          </div>

          {/* 상단 요약 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* 환경×작업 인사이트 매트릭스 */}
            <EnhancedEnvironmentTaskMatrix
              matrix={matrix?.matrix || {}}
              environments={ENVIRONMENTS}
              tasks={TASK_TYPES}
              onCellClick={handleCellClick}
            />

            {/* 최근 적용·도입 이벤트 */}
            <RecentDeploymentEventsCard
              stats={stats}
              highlights={highlights}
              onCaseClick={handleCaseClick}
            />
          </div>

          {/* 필터 영역 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* 환경 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">환경</label>
                <select
                  value={filters.environment}
                  onChange={(e) => setFilters(prev => ({ ...prev, environment: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  {ENVIRONMENTS.map(env => (
                    <option key={env.id} value={env.id}>{env.label}</option>
                  ))}
                </select>
              </div>

              {/* 작업 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">작업 유형</label>
                <select
                  value={filters.taskType}
                  onChange={(e) => setFilters(prev => ({ ...prev, taskType: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  {TASK_TYPES.map(task => (
                    <option key={task.id} value={task.id}>{task.label}</option>
                  ))}
                </select>
              </div>

              {/* 배포 상태 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">배포 상태</label>
                <select
                  value={filters.deploymentStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, deploymentStatus: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="">전체</option>
                  <option value="production">상용</option>
                  <option value="pilot">파일럿</option>
                  <option value="poc">PoC</option>
                  <option value="expanding">확대 중</option>
                  <option value="ended">종료</option>
                </select>
              </div>

              {/* 공간 타입 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">공간 타입</label>
                <select
                  value={filters.spaceType}
                  onChange={(e) => setFilters(prev => ({ ...prev, spaceType: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  {SPACE_TYPES.map(space => (
                    <option key={space.id} value={space.id}>{space.label}</option>
                  ))}
                </select>
              </div>

              {/* 로봇 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">로봇 유형</label>
                <select
                  value={filters.robotType}
                  onChange={(e) => setFilters(prev => ({ ...prev, robotType: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  {ROBOT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* 정렬 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">정렬</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 사례 목록 (카드 그리드) */}
          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : caseCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseCards.map((caseData: any) => (
                <ApplicationCaseCard
                  key={caseData.id}
                  caseData={caseData}
                  onClick={() => handleCaseClick(caseData.id)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              적용 사례가 없습니다.
            </div>
          )}
        </div>

        {/* 상세 드로어 */}
        <CaseDetailDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedCaseId(null);
          }}
          caseDetail={drawerCaseDetail}
        />
      </div>
    </AuthGuard>
  );
}
