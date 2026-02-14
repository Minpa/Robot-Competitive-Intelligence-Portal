'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
  });

  const { data: segmentMatrix } = useQuery({
    queryKey: ['segment-matrix'],
    queryFn: () => api.getSegmentMatrix(),
  });

  const { data: handDistribution } = useQuery({
    queryKey: ['hand-distribution'],
    queryFn: () => api.getHandTypeDistribution(),
  });

  const { data: topWorkforce } = useQuery({
    queryKey: ['top-workforce'],
    queryFn: () => api.getTopWorkforceComparison(10),
  });

  const { data: deploymentDist } = useQuery({
    queryKey: ['deployment-distribution'],
    queryFn: () => api.getDeploymentStatusDistribution(),
  });

  const getLocomotionLabel = (type: string) => {
    const map: Record<string, string> = {
      biped: '2족 보행',
      wheel: '휠베이스',
      hybrid: '하이브리드',
    };
    return map[type] || type;
  };

  const getPurposeLabel = (purpose: string) => {
    const map: Record<string, string> = {
      industrial: '산업용',
      home: '가정용',
      service: '서비스용',
    };
    return map[purpose] || purpose;
  };

  const getHandTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      gripper: '단순 그리퍼',
      multi_finger: '다지 손',
      modular: '교체형',
    };
    return map[type] || type;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">분석 대시보드</h1>
            <p className="mt-2 text-gray-600">휴머노이드 로봇 시장 세그먼트 및 인력 분석</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">총 로봇</p>
              <p className="text-3xl font-bold text-gray-900">{summary?.totalRobots || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">총 회사</p>
              <p className="text-3xl font-bold text-gray-900">{summary?.totalCompanies || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">총 기사</p>
              <p className="text-3xl font-bold text-gray-900">{summary?.totalArticles || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-500">적용 사례</p>
              <p className="text-3xl font-bold text-gray-900">{summary?.totalCases || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Segment Matrix */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">세그먼트 매트릭스</h2>
              <p className="text-sm text-gray-500 mb-4">이동 방식 × 용도별 로봇 분포</p>
              
              {segmentMatrix?.matrix && segmentMatrix.matrix.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">산업용</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">가정용</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">서비스용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['biped', 'wheel', 'hybrid'].map(locomotion => (
                        <tr key={locomotion}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {getLocomotionLabel(locomotion)}
                          </td>
                          {['industrial', 'home', 'service'].map(purpose => {
                            const cell = segmentMatrix.matrix.find(
                              (m: any) => m.locomotionType === locomotion && m.purpose === purpose
                            );
                            return (
                              <td key={purpose} className="px-4 py-2 text-center">
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${
                                  cell?.count > 5 ? 'bg-blue-600 text-white' :
                                  cell?.count > 2 ? 'bg-blue-400 text-white' :
                                  cell?.count > 0 ? 'bg-blue-200 text-blue-800' :
                                  'bg-gray-100 text-gray-400'
                                }`}>
                                  {cell?.count || 0}
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

            {/* Hand Type Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Hand 타입 분포</h2>
              <p className="text-sm text-gray-500 mb-4">전체 로봇의 Hand 타입별 비율</p>
              
              {handDistribution?.overall && handDistribution.overall.length > 0 ? (
                <div className="space-y-4">
                  {handDistribution.overall.map((item: any) => (
                    <div key={item.handType}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{getHandTypeLabel(item.handType)}</span>
                        <span className="text-gray-500">{item.count}개 ({item.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            item.handType === 'multi_finger' ? 'bg-blue-600' :
                            item.handType === 'gripper' ? 'bg-green-600' :
                            'bg-purple-600'
                          }`}
                          style={{ width: `${item.percentage}%` }}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Workforce Comparison */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Top 10 인력 비교</h2>
              <p className="text-sm text-gray-500 mb-4">휴머노이드 관련 인력 규모 상위 회사</p>
              
              {topWorkforce?.companies && topWorkforce.companies.length > 0 ? (
                <div className="space-y-3">
                  {topWorkforce.companies.map((company: any, idx: number) => (
                    <div key={company.companyId} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500 w-6">{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-900">{company.companyName}</span>
                          <span className="text-gray-500">{company.humanoidHeadcount || company.totalHeadcount}명</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{
                              width: `${((company.humanoidHeadcount || company.totalHeadcount) / 
                                (topWorkforce.companies[0]?.humanoidHeadcount || topWorkforce.companies[0]?.totalHeadcount || 1)) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">데이터가 없습니다.</p>
              )}
            </div>

            {/* Deployment Status Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">배포 상태 분포</h2>
              <p className="text-sm text-gray-500 mb-4">적용 사례의 배포 단계별 분포</p>
              
              {deploymentDist?.distribution && deploymentDist.distribution.length > 0 ? (
                <div className="space-y-4">
                  {deploymentDist.distribution.map((item: any) => (
                    <div key={item.status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.status}</span>
                        <span className="text-gray-500">{item.count}건 ({item.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            item.status === 'production' ? 'bg-green-600' :
                            item.status === 'pilot' ? 'bg-yellow-500' :
                            item.status === 'demo' ? 'bg-blue-500' :
                            'bg-gray-400'
                          }`}
                          style={{ width: `${item.percentage}%` }}
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

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">빠른 링크</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/humanoid-robots"
                className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center"
              >
                <span className="text-2xl">🤖</span>
                <p className="mt-2 text-sm font-medium text-blue-900">로봇 카탈로그</p>
              </Link>
              <Link
                href="/companies"
                className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center"
              >
                <span className="text-2xl">🏢</span>
                <p className="mt-2 text-sm font-medium text-green-900">회사 목록</p>
              </Link>
              <Link
                href="/article-analyzer"
                className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center"
              >
                <span className="text-2xl">📰</span>
                <p className="mt-2 text-sm font-medium text-purple-900">기사 분석</p>
              </Link>
              <Link
                href="/ppt-builder"
                className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center"
              >
                <span className="text-2xl">📊</span>
                <p className="mt-2 text-sm font-medium text-orange-900">PPT 빌더</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
