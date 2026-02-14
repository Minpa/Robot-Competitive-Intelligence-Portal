'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useState } from 'react';

const TABS = [
  { id: 'overview', label: '개요' },
  { id: 'body', label: 'Body 스펙' },
  { id: 'hand', label: 'Hand 스펙' },
  { id: 'computing', label: 'Computing' },
  { id: 'sensor', label: 'Sensors' },
  { id: 'power', label: 'Power' },
  { id: 'articles', label: '관련 기사' },
  { id: 'cases', label: '적용 사례' },
];

export default function HumanoidRobotDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState('overview');

  const { data: robot, isLoading, error } = useQuery({
    queryKey: ['humanoid-robot', id],
    queryFn: () => api.getHumanoidRobot(id),
    enabled: !!id,
  });

  const { data: radarData } = useQuery({
    queryKey: ['robot-radar', id],
    queryFn: () => api.getRobotRadarData(id),
    enabled: !!id,
  });

  const { data: articles } = useQuery({
    queryKey: ['robot-articles', id],
    queryFn: () => api.getArticlesByRobot(id),
    enabled: !!id && activeTab === 'articles',
  });

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !robot) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">로봇 정보를 불러올 수 없습니다.</p>
            <Link href="/humanoid-robots" className="text-blue-600 hover:underline">
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const getPurposeLabel = (purpose: string) => {
    const map: Record<string, string> = {
      industrial: '산업용',
      home: '가정용',
      service: '서비스용',
    };
    return map[purpose] || purpose;
  };

  const getLocomotionLabel = (type: string) => {
    const map: Record<string, string> = {
      biped: '2족 보행',
      wheel: '휠베이스',
      hybrid: '하이브리드',
    };
    return map[type] || type;
  };

  const getHandTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      gripper: '단순 그리퍼',
      multi_finger: '다지 손',
      modular: '교체형',
    };
    return map[type] || type;
  };

  const getStageLabel = (stage: string) => {
    const map: Record<string, string> = {
      concept: '개념',
      prototype: '프로토타입',
      poc: 'PoC',
      pilot: '파일럿',
      commercial: '상용화',
    };
    return map[stage] || stage;
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* 헤더 */}
          <div className="mb-6">
            <Link href="/humanoid-robots" className="text-blue-600 hover:underline text-sm">
              ← 카탈로그로 돌아가기
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow mb-6">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{robot.name}</h1>
                  <p className="text-lg text-gray-600 mt-1">
                    {robot.company?.name || robot.companyName}
                  </p>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  robot.stage === 'commercial' ? 'bg-green-100 text-green-800' :
                  robot.stage === 'pilot' ? 'bg-orange-100 text-orange-800' :
                  robot.stage === 'poc' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {getStageLabel(robot.stage)}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">용도</p>
                  <p className="text-lg font-medium">{getPurposeLabel(robot.purpose)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">이동 방식</p>
                  <p className="text-lg font-medium">{getLocomotionLabel(robot.locomotionType)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">Hand 타입</p>
                  <p className="text-lg font-medium">{getHandTypeLabel(robot.handType)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">발표 연도</p>
                  <p className="text-lg font-medium">{robot.announcedYear || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px overflow-x-auto">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {robot.description && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">설명</h3>
                      <p className="text-gray-600">{robot.description}</p>
                    </div>
                  )}

                  {/* 레이더 차트 (간단한 텍스트 표시) */}
                  {radarData && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">성능 지표</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {radarData.axes?.map((axis: any) => (
                          <div key={axis.axis} className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-gray-500">{axis.axis}</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {axis.value}/{axis.maxValue}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'body' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Body 스펙</h3>
                  {robot.bodySpec ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <SpecItem label="신장" value={robot.bodySpec.height} unit="cm" />
                      <SpecItem label="중량" value={robot.bodySpec.weight} unit="kg" />
                      <SpecItem label="페이로드" value={robot.bodySpec.payload} unit="kg" />
                      <SpecItem label="자유도 (DoF)" value={robot.bodySpec.dof} />
                      <SpecItem label="최고 속도" value={robot.bodySpec.maxSpeed} unit="m/s" />
                      <SpecItem label="연속 동작 시간" value={robot.bodySpec.operationTime} unit="시간" />
                    </div>
                  ) : (
                    <p className="text-gray-500">Body 스펙 정보가 없습니다.</p>
                  )}
                </div>
              )}

              {activeTab === 'hand' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Hand 스펙</h3>
                  {robot.handSpec ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <SpecItem label="타입" value={getHandTypeLabel(robot.handSpec.type)} />
                      <SpecItem label="손가락 수" value={robot.handSpec.fingerCount} />
                      <SpecItem label="DoF (각 손)" value={robot.handSpec.dofPerHand} />
                      <SpecItem label="최대 Grip Force" value={robot.handSpec.maxGripForce} unit="N" />
                      <SpecItem label="최대 토크" value={robot.handSpec.maxTorque} unit="Nm" />
                      <SpecItem label="교체 가능" value={robot.handSpec.isModular ? '예' : '아니오'} />
                    </div>
                  ) : (
                    <p className="text-gray-500">Hand 스펙 정보가 없습니다.</p>
                  )}
                </div>
              )}

              {activeTab === 'computing' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Computing 스펙</h3>
                  {robot.computingSpec ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <SpecItem label="메인 SoC" value={robot.computingSpec.mainSoc} />
                      <SpecItem label="TOPS" value={robot.computingSpec.topsRange} />
                      <SpecItem label="아키텍처" value={robot.computingSpec.architecture} />
                    </div>
                  ) : (
                    <p className="text-gray-500">Computing 스펙 정보가 없습니다.</p>
                  )}
                </div>
              )}

              {activeTab === 'sensor' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">센서 구성</h3>
                  {robot.sensorSpecs && robot.sensorSpecs.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">제조사</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">위치</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">스펙</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {robot.sensorSpecs.map((sensor: any, idx: number) => (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sensor.type}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sensor.manufacturer || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sensor.location || '-'}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{sensor.specs || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500">센서 정보가 없습니다.</p>
                  )}
                </div>
              )}

              {activeTab === 'power' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">전원 스펙</h3>
                  {robot.powerSpec ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <SpecItem label="배터리 종류" value={robot.powerSpec.batteryType} />
                      <SpecItem label="용량" value={robot.powerSpec.capacity} unit="Wh" />
                      <SpecItem label="동작 시간" value={robot.powerSpec.operationTime} unit="시간" />
                      <SpecItem label="충전 방식" value={robot.powerSpec.chargingMethod} />
                      <SpecItem label="교체 가능" value={robot.powerSpec.isSwappable ? '예' : '아니오'} />
                    </div>
                  ) : (
                    <p className="text-gray-500">전원 스펙 정보가 없습니다.</p>
                  )}
                </div>
              )}

              {activeTab === 'articles' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">관련 기사</h3>
                  {articles?.items && articles.items.length > 0 ? (
                    <div className="space-y-4">
                      {articles.items.map((article: any) => (
                        <div key={article.id} className="border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900">{article.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{article.summary}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {article.source} · {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">관련 기사가 없습니다.</p>
                  )}
                </div>
              )}

              {activeTab === 'cases' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">적용 사례</h3>
                  {robot.applicationCases && robot.applicationCases.length > 0 ? (
                    <div className="space-y-4">
                      {robot.applicationCases.map((caseItem: any) => (
                        <div key={caseItem.id} className="border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900">{caseItem.title}</h4>
                          <div className="flex gap-2 mt-2">
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {caseItem.environment}
                            </span>
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              {caseItem.taskType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-2">{caseItem.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">적용 사례가 없습니다.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

function SpecItem({ label, value, unit }: { label: string; value: any; unit?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-medium text-gray-900">
        {value !== null && value !== undefined ? `${value}${unit ? ` ${unit}` : ''}` : '-'}
      </p>
    </div>
  );
}
