'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Link from 'next/link';
import {
  Factory, Warehouse, Store, Building2, Home, FlaskConical,
  Bot, Cog, Package, Search, Truck, Sparkles, HelpCircle,
  TrendingUp, Calendar, ChevronRight, X, ExternalLink,
  Car, Cpu, Box, ShoppingCart, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const ENVIRONMENTS = [
  { id: '', label: '전체', icon: HelpCircle },
  { id: 'factory', label: '공장', icon: Factory },
  { id: 'warehouse', label: '물류센터', icon: Warehouse },
  { id: 'retail', label: '리테일', icon: Store },
  { id: 'healthcare', label: '병원', icon: Building2 },
  { id: 'hospitality', label: '호텔', icon: Building2 },
  { id: 'home', label: '가정', icon: Home },
  { id: 'research_lab', label: '연구소', icon: FlaskConical },
  { id: 'other', label: '기타', icon: HelpCircle },
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

const INDUSTRIES = [
  { id: '', label: '전체' },
  { id: 'automotive', label: '자동차', icon: Car },
  { id: 'electronics', label: '전자', icon: Cpu },
  { id: 'logistics', label: '물류', icon: Box },
  { id: 'retail', label: '리테일', icon: ShoppingCart },
  { id: 'other', label: '기타', icon: HelpCircle },
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  production: { label: '상용', bg: 'bg-green-500/20', text: 'text-green-400' },
  pilot: { label: '파일럿', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  poc: { label: 'PoC', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  expanding: { label: '확대 중', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  ended: { label: '종료', bg: 'bg-slate-500/20', text: 'text-slate-400' },
};

export default function ApplicationCasesPage() {
  const [filters, setFilters] = useState({
    environment: '',
    taskType: '',
    deploymentStatus: '',
    industry: '',
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
        Object.entries(filters).filter(([k, v]) => v !== '' && k !== 'sortBy' && k !== 'industry' && k !== 'robotType')
      ) as any
    ),
  });

  // 환경-작업 매트릭스
  const { data: matrix } = useQuery({
    queryKey: ['environment-task-matrix'],
    queryFn: () => api.getEnvironmentTaskMatrix(),
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

    const recentItems = items.filter((c: any) => {
      if (!c.demoDate) return false;
      return new Date(c.demoDate) >= thirtyDaysAgo;
    });

    // 환경별 신규 건수
    const byEnvironment: Record<string, number> = {};
    recentItems.forEach((c: any) => {
      const env = c.environment || 'other';
      byEnvironment[env] = (byEnvironment[env] || 0) + 1;
    });

    return {
      total: items.length,
      newDeployments30d: recentItems.length,
      byEnvironment,
      pocToProductionCount: items.filter((c: any) => c.deploymentStatus === 'production').length,
      pilotCount: items.filter((c: any) => c.deploymentStatus === 'pilot').length,
      pocCount: items.filter((c: any) => c.deploymentStatus === 'poc').length,
      endedCount: items.filter((c: any) => c.deploymentStatus === 'ended').length,
    };
  }, [cases]);

  // 기간별 변화 문자열 생성
  const periodChangeText = useMemo(() => {
    const envLabels: Record<string, string> = {
      factory: '공장',
      warehouse: '물류센터',
      retail: '리테일',
      healthcare: '병원',
      home: '가정',
      research_lab: '연구소',
    };
    
    const parts: string[] = [];
    Object.entries(stats.byEnvironment).forEach(([env, count]) => {
      const label = envLabels[env] || env;
      parts.push(`${label} ${count}`);
    });
    
    if (stats.newDeployments30d === 0) {
      return '지난 30일간 신규 적용 없음';
    }
    
    return `지난 30일간 신규 적용 ${stats.newDeployments30d}건 (${parts.join(', ')})`;
  }, [stats]);

  // 매트릭스 인사이트 생성
  const matrixInsight = useMemo(() => {
    const matrixData = matrix?.matrix || {};
    let maxCount = 0;
    let maxCell = { env: '', task: '' };
    
    Object.entries(matrixData).forEach(([env, tasks]: [string, any]) => {
      Object.entries(tasks).forEach(([task, cellData]: [string, any]) => {
        const count = typeof cellData === 'object' ? cellData?.count : (cellData || 0);
        if (count > maxCount) {
          maxCount = count;
          maxCell = { env, task };
        }
      });
    });

    const envLabels: Record<string, string> = {
      factory: '공장',
      warehouse: '물류센터',
      retail: '리테일',
    };
    const taskLabels: Record<string, string> = {
      assembly: '조립',
      picking: '피킹',
      packing: '포장',
      transport: '운반',
    };

    if (maxCount === 0) {
      return '아직 적용 사례 데이터가 충분하지 않습니다.';
    }

    return `현재 가장 활발한 적용 영역은 "${envLabels[maxCell.env] || maxCell.env} × ${taskLabels[maxCell.task] || maxCell.task}" (${maxCount}건)`;
  }, [matrix]);

  // 하이라이트 사례
  const highlights = useMemo(() => {
    const items = cases?.items || [];
    return items.slice(0, 3).map((c: any) => ({
      id: c.id,
      title: c.demoEvent || c.description || '적용 사례',
      companyName: c.companyName || '',
      robotName: c.robotName || '',
      description: c.description || '',
      status: c.deploymentStatus || 'poc',
      environment: c.environment || 'other',
      taskType: c.taskType || 'other',
      quantitativeEffect: (c as any).quantitativeEffect || null,
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
      robotType: 'humanoid',
      quantitativeEffect: (c as any).quantitativeEffect || null,
      demoDate: c.demoDate,
    }));
  }, [cases]);

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

  const getEnvIcon = (env: string) => {
    const found = ENVIRONMENTS.find(e => e.id === env);
    return found?.icon || HelpCircle;
  };

  const getEnvLabel = (env: string) => {
    const found = ENVIRONMENTS.find(e => e.id === env);
    return found?.label || env;
  };

  const getTaskLabel = (task: string) => {
    const found = TASK_TYPES.find(t => t.id === task);
    return found?.label || task;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              적용 사례
            </h1>
            <p className="text-slate-400 mt-1">휴머노이드 로봇 실제 적용 사례 및 시연 이벤트</p>
          </div>

          {/* 상단 인사이트 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* 좌측: 환경×작업 매트릭스 */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">환경 × 작업 매트릭스</h2>
              </div>
              
              {/* 한줄 인사이트 */}
              <p className="text-sm text-cyan-400 mb-2">{matrixInsight}</p>
              
              {/* 기간별 변화 */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 bg-slate-900/50 rounded-lg px-3 py-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span>{periodChangeText}</span>
              </div>

              {/* 매트릭스 그리드 */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-slate-500"></th>
                      {TASK_TYPES.slice(1, 6).map(task => (
                        <th key={task.id} className="p-2 text-center text-slate-400 font-medium">
                          {task.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ENVIRONMENTS.slice(1, 5).map(env => {
                      const Icon = env.icon || HelpCircle;
                      return (
                        <tr key={env.id}>
                          <td className="p-2 text-slate-300 flex items-center gap-1">
                            <Icon className="w-3 h-3" />
                            {env.label}
                          </td>
                          {TASK_TYPES.slice(1, 6).map(task => {
                            const cellData = (matrix?.matrix as any)?.[env.id]?.[task.id];
                            const count = typeof cellData === 'object' ? cellData?.count : (cellData || 0);
                            return (
                              <td key={task.id} className="p-1 text-center">
                                <button
                                  onClick={() => handleCellClick(env.id, task.id)}
                                  className={`w-8 h-8 rounded text-xs font-medium transition-all ${
                                    count > 0
                                      ? 'bg-blue-500/30 text-blue-300 hover:bg-blue-500/50'
                                      : 'bg-slate-700/30 text-slate-600 hover:bg-slate-700/50'
                                  }`}
                                >
                                  {count || '-'}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 우측: 최근 적용·도입 이벤트 */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">최근 적용·도입 이벤트</h2>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-green-400">상용 {stats.pocToProductionCount}</span>
                  <span className="text-blue-400">파일럿 {stats.pilotCount}</span>
                  <span className="text-yellow-400">PoC {stats.pocCount}</span>
                </div>
              </div>

              {/* 하이라이트 사례 */}
              <div className="space-y-3">
                {highlights.length > 0 ? highlights.map((item: any) => {
                  const statusConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.poc;
                  const Icon = getEnvIcon(item.environment);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleCaseClick(item.id)}
                      className="p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                              {item.title}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${statusConf.bg} ${statusConf.text}`}>
                              {statusConf.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {item.robotName && <span className="text-slate-400">{item.robotName}</span>}
                            {item.companyName && <span> · {item.companyName}</span>}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center text-slate-500 py-8">
                    최근 이벤트가 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 필터 바 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* 환경 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">환경:</span>
                <select
                  value={filters.environment}
                  onChange={(e) => setFilters(prev => ({ ...prev, environment: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1.5"
                >
                  {ENVIRONMENTS.map(env => (
                    <option key={env.id} value={env.id}>{env.label}</option>
                  ))}
                </select>
              </div>

              {/* 작업 유형 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">작업:</span>
                <select
                  value={filters.taskType}
                  onChange={(e) => setFilters(prev => ({ ...prev, taskType: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1.5"
                >
                  {TASK_TYPES.map(task => (
                    <option key={task.id} value={task.id}>{task.label}</option>
                  ))}
                </select>
              </div>

              {/* 배포 상태 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">상태:</span>
                <select
                  value={filters.deploymentStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, deploymentStatus: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1.5"
                >
                  <option value="">전체</option>
                  <option value="production">상용</option>
                  <option value="pilot">파일럿</option>
                  <option value="poc">PoC</option>
                  <option value="expanding">확대 중</option>
                  <option value="ended">종료</option>
                </select>
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* 고객 산업 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">산업:</span>
                <select
                  value={filters.industry}
                  onChange={(e) => setFilters(prev => ({ ...prev, industry: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1.5"
                >
                  {INDUSTRIES.map(ind => (
                    <option key={ind.id} value={ind.id}>{ind.label}</option>
                  ))}
                </select>
              </div>

              {/* 로봇 유형 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">로봇:</span>
                <select
                  value={filters.robotType}
                  onChange={(e) => setFilters(prev => ({ ...prev, robotType: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1.5"
                >
                  {ROBOT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* 정렬 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">정렬:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1.5"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 필터 초기화 */}
              {(filters.environment || filters.taskType || filters.deploymentStatus || filters.industry || filters.robotType) && (
                <button
                  onClick={() => setFilters({
                    environment: '',
                    taskType: '',
                    deploymentStatus: '',
                    industry: '',
                    robotType: '',
                    sortBy: 'latest',
                  })}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* 사례 목록 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              적용 사례 목록
              <span className="ml-2 text-sm font-normal text-slate-400">
                총 {cases?.items?.length || 0}건
              </span>
            </h2>
          </div>

          {/* 사례 카드 그리드 */}
          {isLoading ? (
            <div className="bg-slate-800/50 rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : caseCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseCards.map((caseData: any) => {
                const statusConf = STATUS_CONFIG[caseData.status] || STATUS_CONFIG.poc;
                const EnvIcon = getEnvIcon(caseData.environment);
                
                return (
                  <div
                    key={caseData.id}
                    onClick={() => handleCaseClick(caseData.id)}
                    className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-4 hover:border-slate-600 transition-all cursor-pointer group"
                  >
                    {/* 헤더 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                          {caseData.title}
                        </h3>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded ml-2 ${statusConf.bg} ${statusConf.text}`}>
                        {statusConf.label}
                      </span>
                    </div>

                    {/* 메타 정보 */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                      <EnvIcon className="w-3.5 h-3.5" />
                      <span>{getEnvLabel(caseData.environment)}</span>
                      <span className="text-slate-600">·</span>
                      <span>{getTaskLabel(caseData.taskType)}</span>
                    </div>

                    {/* 로봇 정보 */}
                    {caseData.robotName && (
                      <div className="flex items-center gap-2 text-xs mb-3">
                        <Bot className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-slate-300">{caseData.robotName}</span>
                        {caseData.companyName && (
                          <span className="text-slate-500">({caseData.companyName})</span>
                        )}
                      </div>
                    )}

                    {/* 설명 */}
                    {caseData.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {caseData.description}
                      </p>
                    )}

                    {/* 하단: 날짜 + 정량 효과 */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {caseData.demoDate ? new Date(caseData.demoDate).toLocaleDateString('ko-KR') : '-'}
                      </div>
                      
                      {/* 정량 효과 배지 */}
                      {caseData.quantitativeEffect && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 rounded text-[10px] text-emerald-400">
                          <ArrowUpRight className="w-3 h-3" />
                          {caseData.quantitativeEffect}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-500">
              적용 사례가 없습니다.
            </div>
          )}
        </div>

        {/* 상세 드로어 */}
        {isDrawerOpen && selectedCaseDetail && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* 오버레이 */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => {
                setIsDrawerOpen(false);
                setSelectedCaseId(null);
              }}
            />
            
            {/* 드로어 */}
            <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-700 overflow-y-auto">
              <div className="p-6">
                {/* 닫기 버튼 */}
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setSelectedCaseId(null);
                  }}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {(() => {
                  const detail = selectedCaseDetail?.case || selectedCaseDetail;
                  const robot = selectedCaseDetail?.robot;
                  const company = selectedCaseDetail?.company;
                  const statusConf = STATUS_CONFIG[detail?.deploymentStatus] || STATUS_CONFIG.poc;
                  
                  return (
                    <>
                      {/* 헤더 */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 text-xs rounded ${statusConf.bg} ${statusConf.text}`}>
                            {statusConf.label}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                          {detail?.demoEvent || detail?.description || '적용 사례'}
                        </h2>
                        <p className="text-sm text-slate-400">
                          {getEnvLabel(detail?.environment || detail?.environmentType)} · {getTaskLabel(detail?.taskType)}
                        </p>
                      </div>

                      {/* 로봇 정보 */}
                      {robot && (
                        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg">
                          <h3 className="text-sm font-medium text-slate-300 mb-3">적용 로봇</h3>
                          <Link
                            href={`/humanoid-robots/${robot.id}`}
                            className="flex items-center gap-3 group"
                          >
                            <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                              <Bot className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                {robot.name}
                              </p>
                              <p className="text-xs text-slate-500">{company?.name || ''}</p>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-500 ml-auto" />
                          </Link>
                        </div>
                      )}

                      {/* 상세 설명 */}
                      {detail?.taskDescription && (
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-slate-300 mb-2">상세 설명</h3>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {detail.taskDescription}
                          </p>
                        </div>
                      )}

                      {/* 정량 효과 */}
                      {(detail as any)?.quantitativeEffect && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <h3 className="text-sm font-medium text-emerald-400 mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            정량 효과
                          </h3>
                          <p className="text-lg font-semibold text-white">
                            {(detail as any).quantitativeEffect}
                          </p>
                        </div>
                      )}

                      {/* 날짜 정보 */}
                      <div className="text-xs text-slate-500">
                        {detail?.demoDate && (
                          <p>시연일: {new Date(detail.demoDate).toLocaleDateString('ko-KR')}</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
