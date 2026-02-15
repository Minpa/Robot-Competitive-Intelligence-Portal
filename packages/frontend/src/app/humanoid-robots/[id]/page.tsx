'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useState } from 'react';
import {
  ArrowLeft, GitCompare, FileDown, ExternalLink, Calendar, MapPin,
  Wrench, Newspaper, DollarSign, Package, Cpu, Hand, Battery, Eye,
  Zap, Weight, Ruler, Clock, Target, Shield, ChevronRight
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: '개요', icon: Eye },
  { id: 'body', label: 'Body 스펙', icon: Ruler },
  { id: 'hand', label: 'Hand 스펙', icon: Hand },
  { id: 'computing', label: 'Computing', icon: Cpu },
  { id: 'sensor', label: 'Sensors', icon: Target },
  { id: 'power', label: 'Power', icon: Battery },
  { id: 'articles', label: '관련 기사', icon: Newspaper },
  { id: 'cases', label: '적용 사례', icon: Wrench },
];

const STAGE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  concept: { label: '개념', bgColor: 'bg-slate-500/20', textColor: 'text-slate-400' },
  prototype: { label: '프로토타입', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  poc: { label: 'PoC', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
  pilot: { label: '파일럿', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400' },
  commercial: { label: '상용화', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
};

const SALES_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  on_sale: { label: '판매 중', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
  coming_soon: { label: '출시 예정', bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400' },
  poc_only: { label: 'PoC만', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  not_for_sale: { label: '비매품', bgColor: 'bg-slate-500/20', textColor: 'text-slate-400' },
};

const PURPOSE_LABELS: Record<string, string> = { industrial: '산업용', home: '가정용', service: '서비스용' };
const LOCOMOTION_LABELS: Record<string, string> = { biped: '2족 보행', wheel: '휠베이스', hybrid: '하이브리드' };
const HAND_LABELS: Record<string, string> = { gripper: '단순 그리퍼', multi_finger: '다지 손', modular: '교체형', none: '없음' };


export default function HumanoidRobotDetailPage() {
  const params = useParams();
  const router = useRouter();
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
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !robot) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">로봇 정보를 불러올 수 없습니다.</p>
            <Link href="/humanoid-robots" className="text-blue-400 hover:underline">
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const stageConfig = STAGE_CONFIG[robot.stage] || STAGE_CONFIG.concept;
  const salesConfig = SALES_CONFIG[robot.salesStatus || 'not_for_sale'] || SALES_CONFIG.not_for_sale;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          {/* 뒤로가기 */}
          <Link href="/humanoid-robots" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            카탈로그로 돌아가기
          </Link>

          {/* 상단 헤더 영역 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 mb-6">
            {/* 1줄: 제품명, 회사명, 배지들, 액션 버튼 */}
            <div className="p-6 border-b border-slate-700/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-white">{robot.name}</h1>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded ${stageConfig.bgColor} ${stageConfig.textColor}`}>
                      {stageConfig.label}
                    </span>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded ${salesConfig.bgColor} ${salesConfig.textColor}`}>
                      {salesConfig.label}
                    </span>
                    {robot.announcedYear && (
                      <span className="flex items-center gap-1 text-sm text-slate-400">
                        <Calendar className="w-4 h-4" />
                        {robot.announcedYear}년
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 mt-1">{robot.company?.name || robot.companyName}</p>
                </div>
                {/* 액션 버튼 */}
                <div className="flex items-center gap-2 shrink-0">
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm">
                    <GitCompare className="w-4 h-4" />
                    비교에 추가
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm">
                    <FileDown className="w-4 h-4" />
                    PPT 내보내기
                  </button>
                </div>
              </div>
            </div>

            {/* 2줄: 요약 카드 4개 */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard icon={Package} label="용도" value={PURPOSE_LABELS[robot.purpose] || robot.purpose} />
              <SummaryCard icon={Zap} label="이동 방식" value={LOCOMOTION_LABELS[robot.locomotionType] || robot.locomotionType} />
              <SummaryCard icon={Hand} label="Hand 타입" value={HAND_LABELS[robot.handType] || robot.handType} />
              <SummaryCard 
                icon={DollarSign} 
                label="가격/지역" 
                value={robot.listPrice ? `~${(robot.listPrice / 1000).toFixed(0)}K USD` : '미공개'}
                subValue={robot.salesRegions || '글로벌'}
              />
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50">
            <div className="border-b border-slate-700/50">
              <nav className="flex -mb-px overflow-x-auto">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {/* 개요 탭 */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* 설명 블록 */}
                  <div className="bg-slate-800/30 rounded-lg p-5">
                    <h3 className="text-lg font-semibold text-white mb-3">설명</h3>
                    <p className="text-slate-300 leading-relaxed">
                      {robot.description || '설명이 없습니다.'}
                    </p>
                    {/* 주요 특징 태그 */}
                    {robot.features && robot.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {robot.features.map((feature: string, idx: number) => (
                          <span key={idx} className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 핵심 성능 지표 카드 */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">핵심 성능 지표</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <KpiCard icon={Weight} label="최대 Payload" value={robot.bodySpec?.payload} unit="kg" color="blue" />
                      <KpiCard icon={Ruler} label="자유도 (DoF)" value={robot.bodySpec?.dof} color="purple" />
                      <KpiCard icon={Zap} label="최고 속도" value={robot.bodySpec?.maxSpeed} unit="m/s" color="green" />
                      <KpiCard icon={Clock} label="연속 동작" value={robot.bodySpec?.operationTime || robot.powerSpec?.operationTime} unit="h" color="orange" />
                      <KpiCard icon={Target} label="반복 정밀도" value={robot.bodySpec?.repeatability} unit="mm" color="cyan" />
                      <KpiCard icon={Shield} label="보호 등급" value={robot.bodySpec?.ipRating || 'IP54'} color="slate" />
                    </div>
                  </div>

                  {/* 가격·판매 정보 */}
                  <div className="bg-slate-800/30 rounded-lg p-5">
                    <h3 className="text-lg font-semibold text-white mb-4">가격·판매 정보</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">기준 가격</p>
                        <p className="text-slate-200 font-medium">
                          {robot.listPrice ? `~${(robot.listPrice / 1000).toFixed(0)}K USD` : '미공개'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">판매 지역</p>
                        <p className="text-slate-200 font-medium">{robot.salesRegions || '글로벌'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">판매 채널</p>
                        <p className="text-slate-200 font-medium">{robot.salesChannel || '직판/파트너'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">예상 리드타임</p>
                        <p className="text-slate-200 font-medium">{robot.leadTime || '3-6개월'}</p>
                      </div>
                    </div>
                  </div>

                  {/* 적용·기사 요약 */}
                  <div className="bg-slate-800/30 rounded-lg p-5">
                    <h3 className="text-lg font-semibold text-white mb-4">적용·기사 요약</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Wrench className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">
                            적용 사례 {robot.applicationCaseCount ?? robot.applicationCases?.length ?? 0}건
                          </p>
                          <p className="text-xs text-slate-500">
                            상용 {robot.productionCount ?? 0} / PoC {robot.pocCount ?? 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <MapPin className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">
                            적용 환경 {robot.distinctEnvironmentsCount ?? 0}개
                          </p>
                          <p className="text-xs text-slate-500">공장, 물류센터 등</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                          <Newspaper className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-slate-200 font-medium">
                            기사/이벤트 {robot.newsEventCount ?? 0}건
                          </p>
                          <p className="text-xs text-slate-500">최근 업데이트: {robot.lastNewsDate || '-'}</p>
                        </div>
                      </div>
                    </div>
                    {/* 대표 적용 사례 */}
                    {robot.applicationCases && robot.applicationCases.length > 0 && (
                      <div className="border-t border-slate-700/50 pt-4 mt-4">
                        <p className="text-xs text-slate-500 mb-2">대표 적용 사례</p>
                        {robot.applicationCases.slice(0, 2).map((c: any) => (
                          <Link
                            key={c.id}
                            href={`/application-cases?robot=${robot.id}`}
                            className="flex items-center justify-between py-2 text-sm text-slate-300 hover:text-white transition-colors"
                          >
                            <span>{c.title}</span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Body 스펙 탭 */}
              {activeTab === 'body' && (
                <div>
                  <p className="text-slate-400 mb-6">이 로봇의 물리적 구조와 동작 성능을 정의하는 핵심 스펙입니다.</p>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 좌측: 스펙 테이블 */}
                    <div className="lg:col-span-2">
                      {robot.bodySpec ? (
                        <div className="bg-slate-800/30 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <tbody>
                              <SpecRow label="신장" value={robot.bodySpec.height} unit="cm" />
                              <SpecRow label="중량" value={robot.bodySpec.weight} unit="kg" />
                              <SpecRow label="페이로드" value={robot.bodySpec.payload} unit="kg" />
                              <SpecRow label="자유도 (DoF)" value={robot.bodySpec.dof} />
                              <SpecRow label="최고 속도" value={robot.bodySpec.maxSpeed} unit="m/s" />
                              <SpecRow label="연속 동작 시간" value={robot.bodySpec.operationTime} unit="시간" />
                              <SpecRow label="반복 정밀도" value={robot.bodySpec.repeatability} unit="mm" />
                              <SpecRow label="보호 등급" value={robot.bodySpec.ipRating} />
                              <SpecRow label="주요 재질" value={robot.bodySpec.material} />
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500">Body 스펙 정보가 없습니다.</p>
                      )}
                    </div>
                    {/* 우측: 다이어그램 영역 */}
                    <div className="bg-slate-800/30 rounded-lg p-6 flex items-center justify-center min-h-[300px]">
                      <div className="text-center text-slate-500">
                        <Ruler className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">로봇 실루엣 다이어그램</p>
                        <p className="text-xs mt-1">(이미지 준비 중)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hand 스펙 탭 */}
              {activeTab === 'hand' && (
                <div>
                  <p className="text-slate-400 mb-6">로봇의 손(End Effector) 구조와 그립 성능 스펙입니다.</p>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      {robot.handSpec ? (
                        <div className="bg-slate-800/30 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <tbody>
                              <SpecRow label="타입" value={HAND_LABELS[robot.handSpec.type] || robot.handSpec.type} />
                              <SpecRow label="손가락 수" value={robot.handSpec.fingerCount} />
                              <SpecRow label="DoF (각 손)" value={robot.handSpec.dofPerHand} />
                              <SpecRow label="최대 Grip Force" value={robot.handSpec.maxGripForce} unit="N" />
                              <SpecRow label="최대 토크" value={robot.handSpec.maxTorque} unit="Nm" />
                              <SpecRow label="교체 가능" value={robot.handSpec.isModular ? '예' : '아니오'} />
                              <SpecRow label="촉각 센서" value={robot.handSpec.hasTactileSensor ? '있음' : '없음'} />
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500">Hand 스펙 정보가 없습니다.</p>
                      )}
                    </div>
                    <div className="bg-slate-800/30 rounded-lg p-6 flex items-center justify-center min-h-[250px]">
                      <div className="text-center text-slate-500">
                        <Hand className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Hand 구조 다이어그램</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Computing 탭 */}
              {activeTab === 'computing' && (
                <div>
                  <p className="text-slate-400 mb-6">로봇의 연산 처리 및 AI 추론을 담당하는 컴퓨팅 모듈 스펙입니다.</p>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      {robot.computingSpec ? (
                        <div className="bg-slate-800/30 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <tbody>
                              <SpecRow label="메인 SoC" value={robot.computingSpec.mainSoc} />
                              <SpecRow label="AI 성능 (TOPS)" value={robot.computingSpec.topsRange} />
                              <SpecRow label="아키텍처" value={robot.computingSpec.architecture} />
                              <SpecRow label="메모리" value={robot.computingSpec.memory} />
                              <SpecRow label="OS" value={robot.computingSpec.os} />
                              <SpecRow label="지원 프레임워크" value={robot.computingSpec.frameworks} />
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500">Computing 스펙 정보가 없습니다.</p>
                      )}
                      {/* 관련 SoC 링크 */}
                      {robot.computingSpec?.socId && (
                        <div className="mt-4">
                          <Link
                            href={`/components?type=soc&id=${robot.computingSpec.socId}`}
                            className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                          >
                            <ExternalLink className="w-4 h-4" />
                            SoC 상세 페이지 보기
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-800/30 rounded-lg p-6 flex items-center justify-center min-h-[250px]">
                      <div className="text-center text-slate-500">
                        <Cpu className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">컴퓨팅 아키텍처</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sensors 탭 */}
              {activeTab === 'sensor' && (
                <div>
                  <p className="text-slate-400 mb-6">로봇에 탑재된 센서 구성과 위치 정보입니다.</p>
                  {robot.sensorSpecs && robot.sensorSpecs.length > 0 ? (
                    <div className="bg-slate-800/30 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">타입</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">제조사</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">위치</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">스펙</th>
                          </tr>
                        </thead>
                        <tbody>
                          {robot.sensorSpecs.map((sensor: any, idx: number) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-800/20' : ''}>
                              <td className="px-4 py-3 text-sm text-slate-200">{sensor.type}</td>
                              <td className="px-4 py-3 text-sm text-slate-400">{sensor.manufacturer || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-400">{sensor.location || '-'}</td>
                              <td className="px-4 py-3 text-sm text-slate-400">{sensor.specs || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500">센서 정보가 없습니다.</p>
                  )}
                </div>
              )}

              {/* Power 탭 */}
              {activeTab === 'power' && (
                <div>
                  <p className="text-slate-400 mb-6">로봇의 전원 공급 및 배터리 스펙입니다.</p>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      {robot.powerSpec ? (
                        <div className="bg-slate-800/30 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <tbody>
                              <SpecRow label="배터리 종류" value={robot.powerSpec.batteryType} />
                              <SpecRow label="용량" value={robot.powerSpec.capacity} unit="Wh" />
                              <SpecRow label="동작 시간" value={robot.powerSpec.operationTime} unit="시간" />
                              <SpecRow label="충전 방식" value={robot.powerSpec.chargingMethod} />
                              <SpecRow label="충전 시간" value={robot.powerSpec.chargingTime} unit="시간" />
                              <SpecRow label="교체 가능" value={robot.powerSpec.isSwappable ? '예' : '아니오'} />
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-500">전원 스펙 정보가 없습니다.</p>
                      )}
                    </div>
                    <div className="bg-slate-800/30 rounded-lg p-6 flex items-center justify-center min-h-[200px]">
                      <div className="text-center text-slate-500">
                        <Battery className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">배터리 구성</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 관련 기사 탭 - 타임라인 뷰 */}
              {activeTab === 'articles' && (
                <div>
                  <p className="text-slate-400 mb-6">이 로봇과 관련된 기사, 발표, 이벤트 타임라인입니다.</p>
                  {articles?.items && articles.items.length > 0 ? (
                    <div className="space-y-4">
                      {articles.items.map((article: any, idx: number) => (
                        <div key={article.id} className="flex gap-4">
                          {/* 타임라인 라인 */}
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            {idx < articles.items.length - 1 && (
                              <div className="w-0.5 flex-1 bg-slate-700 mt-2"></div>
                            )}
                          </div>
                          {/* 기사 카드 */}
                          <div className="flex-1 bg-slate-800/30 rounded-lg p-4 mb-2">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="text-xs text-slate-500 mb-1">
                                  {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('ko-KR') : '-'}
                                  {' · '}{article.source}
                                </p>
                                <h4 className="text-slate-200 font-medium">{article.title}</h4>
                                {article.summary && (
                                  <p className="text-sm text-slate-400 mt-2 line-clamp-2">{article.summary}</p>
                                )}
                              </div>
                              {article.url && (
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 p-2 text-slate-400 hover:text-blue-400 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">관련 기사가 없습니다.</p>
                  )}
                </div>
              )}

              {/* 적용 사례 탭 */}
              {activeTab === 'cases' && (
                <div>
                  <p className="text-slate-400 mb-6">
                    이 로봇은 현재 주로 {robot.mainEnvironments || '공장, 물류센터'}에서 {robot.mainStage || 'PoC'} 단계로 활용 중입니다.
                  </p>
                  {robot.applicationCases && robot.applicationCases.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {robot.applicationCases.map((caseItem: any) => (
                        <div key={caseItem.id} className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-slate-200 font-medium">{caseItem.title}</h4>
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                              caseItem.status === 'production' ? 'bg-green-500/20 text-green-400' :
                              caseItem.status === 'poc' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {caseItem.status === 'production' ? '상용' : caseItem.status === 'poc' ? 'PoC' : caseItem.status}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                              {caseItem.environment}
                            </span>
                            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                              {caseItem.taskType}
                            </span>
                          </div>
                          {caseItem.description && (
                            <p className="text-sm text-slate-400 mt-3 line-clamp-2">{caseItem.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">적용 사례가 없습니다.</p>
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


// 요약 카드 컴포넌트
function SummaryCard({ icon: Icon, label, value, subValue }: { 
  icon: any; 
  label: string; 
  value: string; 
  subValue?: string;
}) {
  return (
    <div className="bg-slate-800/30 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-700/50 rounded-lg">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-slate-200 font-medium">{value}</p>
          {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

// KPI 카드 컴포넌트
function KpiCard({ icon: Icon, label, value, unit, color }: {
  icon: any;
  label: string;
  value: any;
  unit?: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
    orange: 'bg-orange-500/20 text-orange-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    slate: 'bg-slate-500/20 text-slate-400',
  };

  return (
    <div className="bg-slate-800/30 rounded-lg p-4 text-center">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">
        {value !== null && value !== undefined ? value : '-'}
        {value !== null && value !== undefined && unit && (
          <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
        )}
      </p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

// 스펙 테이블 행 컴포넌트
function SpecRow({ label, value, unit }: { label: string; value: any; unit?: string }) {
  return (
    <tr className="border-b border-slate-700/50 last:border-0">
      <td className="px-4 py-3 text-sm text-slate-400 w-1/3">{label}</td>
      <td className="px-4 py-3 text-sm text-slate-200">
        {value !== null && value !== undefined ? `${value}${unit ? ` ${unit}` : ''}` : '-'}
      </td>
    </tr>
  );
}
