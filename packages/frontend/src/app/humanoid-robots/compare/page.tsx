'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Link from 'next/link';
import { ArrowLeft, Plus, X, Check, Minus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

export default function RobotComparePage() {
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    const ids = searchParams.get('ids');
    if (ids) {
      setSelectedIds(ids.split(',').filter(Boolean));
    }
  }, [searchParams]);

  const { data: allRobots } = useQuery({
    queryKey: ['all-robots-for-compare'],
    queryFn: () => api.getHumanoidRobots({ limit: 100 }),
  });

  const { data: robotDetails, isLoading } = useQuery({
    queryKey: ['robot-compare', selectedIds],
    queryFn: async () => {
      if (selectedIds.length === 0) return [];
      const details = await Promise.all(
        selectedIds.map(id => api.getHumanoidRobotById(id))
      );
      return details;
    },
    enabled: selectedIds.length > 0,
  });

  const toggleRobot = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const getSpecValue = (robot: any, specType: string, field: string) => {
    const spec = robot[specType];
    if (!spec) return '-';
    const value = spec[field];
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? <Check className="w-4 h-4 text-green-400 inline" /> : <Minus className="w-4 h-4 text-argos-faint inline" />;
    return value;
  };

  const renderComparisonRow = (label: string, getValue: (robot: any) => any) => {
    if (!robotDetails || robotDetails.length === 0) return null;
    return (
      <tr className="border-b border-argos-borderSoft">
        <td className="py-3 px-4 font-medium text-argos-inkSoft bg-argos-surface">{label}</td>
        {robotDetails.map((robot: any) => (
          <td key={robot.id} className="py-3 px-4 text-center text-argos-ink">
            {getValue(robot) ?? '-'}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          <PageHeader
            module="TELEMETRY MODULE V4.2"
            titleKo="로봇 비교"
            titleEn="COMPARE"
            description="선택한 로봇 간 스펙 비교"
            actions={
              <>
                <button
                  onClick={() => setShowSelector(!showSelector)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  {showSelector ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showSelector ? '선택 완료' : '로봇 선택'}
                </button>
                <Link
                  href="/humanoid-robots"
                  className="flex items-center gap-2 px-4 py-2 bg-argos-chip/50 text-argos-ink rounded-lg hover:bg-argos-bgAlt transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  카탈로그
                </Link>
              </>
            }
          />

          {/* 로봇 선택 패널 */}
          {showSelector && (
            <div className="bg-argos-surface backdrop-blur rounded-xl border border-argos-borderSoft p-5 mb-6">
              <h2 className="text-lg font-semibold text-argos-ink mb-4">비교할 로봇 선택 (최대 4개)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {allRobots?.items?.map((robot: any) => (
                  <button
                    key={robot.id}
                    onClick={() => toggleRobot(robot.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedIds.includes(robot.id)
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-argos-border hover:border-argos-blue/30 bg-argos-surface'
                    } ${selectedIds.length >= 4 && !selectedIds.includes(robot.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={selectedIds.length >= 4 && !selectedIds.includes(robot.id)}
                  >
                    <div className="font-medium text-sm text-argos-ink truncate">{robot.name}</div>
                    <div className="text-xs text-argos-faint truncate">{robot.companyName}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 비교 테이블 */}
          {selectedIds.length === 0 ? (
            <div className="bg-argos-surface backdrop-blur rounded-xl border border-argos-borderSoft p-12 text-center">
              <p className="text-argos-faint">비교할 로봇을 선택해주세요</p>
            </div>
          ) : isLoading ? (
            <div className="bg-argos-surface backdrop-blur rounded-xl border border-argos-borderSoft p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : (
            <div className="bg-argos-surface backdrop-blur rounded-xl border border-argos-borderSoft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-argos-surface">
                      <th className="py-4 px-4 text-left font-medium text-argos-muted w-48">항목</th>
                      {robotDetails?.map((robot: any) => (
                        <th key={robot.id} className="py-4 px-4 text-center min-w-[200px]">
                          <Link href={`/humanoid-robots/${robot.id}`} className="hover:text-blue-400 transition-colors">
                            <div className="font-bold text-argos-ink">{robot.name}</div>
                            <div className="text-sm text-argos-faint font-normal">{robot.company?.name}</div>
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* 기본 정보 */}
                    <tr className="bg-blue-500/10">
                      <td colSpan={selectedIds.length + 1} className="py-2 px-4 font-bold text-blue-400">
                        기본 정보
                      </td>
                    </tr>
                    {renderComparisonRow('용도', r => r.purpose === 'industrial' ? '산업용' : r.purpose === 'home' ? '가정용' : '서비스용')}
                    {renderComparisonRow('이동 방식', r => r.locomotionType === 'biped' ? '2족 보행' : r.locomotionType === 'wheel' ? '휠베이스' : '하이브리드')}
                    {renderComparisonRow('Hand 타입', r => r.handType === 'gripper' ? '그리퍼' : r.handType === 'multi_finger' ? '다지 손' : '교체형')}
                    {renderComparisonRow('상용화 단계', r => r.commercializationStage)}
                    {renderComparisonRow('발표 연도', r => r.announcementYear)}

                    {/* Body 스펙 */}
                    <tr className="bg-green-500/10">
                      <td colSpan={selectedIds.length + 1} className="py-2 px-4 font-bold text-green-400">
                        Body 스펙
                      </td>
                    </tr>
                    {renderComparisonRow('키 (cm)', r => getSpecValue(r, 'bodySpec', 'heightCm'))}
                    {renderComparisonRow('무게 (kg)', r => getSpecValue(r, 'bodySpec', 'weightKg'))}
                    {renderComparisonRow('페이로드 (kg)', r => getSpecValue(r, 'bodySpec', 'payloadKg'))}
                    {renderComparisonRow('DoF', r => getSpecValue(r, 'bodySpec', 'dofCount'))}
                    {renderComparisonRow('최대 속도 (m/s)', r => getSpecValue(r, 'bodySpec', 'maxSpeedMps'))}
                    {renderComparisonRow('운용 시간 (h)', r => getSpecValue(r, 'bodySpec', 'operationTimeHours'))}

                    {/* Hand 스펙 */}
                    <tr className="bg-yellow-500/10">
                      <td colSpan={selectedIds.length + 1} className="py-2 px-4 font-bold text-yellow-400">
                        Hand 스펙
                      </td>
                    </tr>
                    {renderComparisonRow('손가락 수', r => getSpecValue(r, 'handSpec', 'fingerCount'))}
                    {renderComparisonRow('손 DoF', r => getSpecValue(r, 'handSpec', 'handDof'))}
                    {renderComparisonRow('그립력 (N)', r => getSpecValue(r, 'handSpec', 'gripForceN'))}
                    {renderComparisonRow('교체 가능', r => getSpecValue(r, 'handSpec', 'isInterchangeable'))}

                    {/* Computing 스펙 */}
                    <tr className="bg-purple-500/10">
                      <td colSpan={selectedIds.length + 1} className="py-2 px-4 font-bold text-purple-400">
                        Computing 스펙
                      </td>
                    </tr>
                    {renderComparisonRow('메인 SoC', r => getSpecValue(r, 'computingSpec', 'mainSoc'))}
                    {renderComparisonRow('TOPS (최소)', r => getSpecValue(r, 'computingSpec', 'topsMin'))}
                    {renderComparisonRow('TOPS (최대)', r => getSpecValue(r, 'computingSpec', 'topsMax'))}
                    {renderComparisonRow('아키텍처', r => getSpecValue(r, 'computingSpec', 'architectureType'))}

                    {/* Power 스펙 */}
                    <tr className="bg-red-500/10">
                      <td colSpan={selectedIds.length + 1} className="py-2 px-4 font-bold text-red-400">
                        Power 스펙
                      </td>
                    </tr>
                    {renderComparisonRow('배터리 타입', r => getSpecValue(r, 'powerSpec', 'batteryType'))}
                    {renderComparisonRow('용량 (Wh)', r => getSpecValue(r, 'powerSpec', 'capacityWh'))}
                    {renderComparisonRow('충전 방식', r => getSpecValue(r, 'powerSpec', 'chargingMethod'))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
