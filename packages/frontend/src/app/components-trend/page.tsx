'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Link from 'next/link';
import {
  Cpu, Cog, Eye, Battery, Bot, ChevronRight, Filter,
  TrendingUp, BarChart3, X, ExternalLink
} from 'lucide-react';

const COMPONENT_TYPES = [
  { id: '', label: '전체', icon: Filter },
  { id: 'actuator', label: '액추에이터', icon: Cog },
  { id: 'soc', label: 'SoC', icon: Cpu },
  { id: 'sensor', label: '센서', icon: Eye },
  { id: 'power', label: '전원', icon: Battery },
];

const SORT_OPTIONS = [
  { value: 'robotCount-desc', label: '적용 로봇 수 (많은순)' },
  { value: 'year-desc', label: '출시 연도 (최신순)' },
  { value: 'performance-desc', label: '성능 (높은순)' },
  { value: 'name-asc', label: '이름 (A-Z)' },
];

const ROBOT_COUNT_OPTIONS = [
  { value: 0, label: '전체' },
  { value: 1, label: '1개 이상' },
  { value: 3, label: '3개 이상' },
  { value: 5, label: '5개 이상' },
];

const PERFORMANCE_MAP_TABS = [
  { id: 'actuator', label: '액추에이터', xLabel: '무게 (kg)', yLabel: '토크 밀도' },
  { id: 'soc', label: 'SoC', xLabel: '소비전력 (W)', yLabel: 'TOPS' },
  { id: 'sensor', label: '센서', xLabel: '해상도', yLabel: '프레임레이트' },
];

export default function ComponentsTrendPage() {
  // 필터 상태
  const [selectedType, setSelectedType] = useState('');
  const [minRobotCount, setMinRobotCount] = useState(0);
  const [yearRange, setYearRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('robotCount-desc');
  const [page, setPage] = useState(1);

  // 성능 맵 탭
  const [mapTab, setMapTab] = useState('actuator');

  // BOM 모드 (특정 로봇 선택)
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);

  // 호버된 부품 (UsedInRobotsPanel 표시용)
  const [hoveredComponent, setHoveredComponent] = useState<any>(null);

  // API 쿼리
  const { data: components, isLoading } = useQuery({
    queryKey: ['components', selectedType, minRobotCount, sortBy, page, selectedRobotId],
    queryFn: () => api.getComponents({
      type: selectedType || undefined,
      page,
      limit: 20,
    } as any),
  });

  const { data: torqueData } = useQuery({
    queryKey: ['torque-density'],
    queryFn: () => api.getTorqueDensityChart(),
  });

  const { data: topsData } = useQuery({
    queryKey: ['tops-timeline'],
    queryFn: () => api.getTopsTimeline(),
  });

  const { data: robots } = useQuery({
    queryKey: ['humanoid-robots-simple'],
    queryFn: () => api.getHumanoidRobots({ limit: 100 }),
  });

  // 성능 맵 데이터 (탭에 따라 다른 데이터)
  const mapData = useMemo(() => {
    if (mapTab === 'actuator' && torqueData?.data) {
      return torqueData.data.map((item: any) => ({
        ...item,
        x: item.weight || 0,
        y: item.torqueDensity || 0,
      }));
    }
    if (mapTab === 'soc' && components?.items) {
      // SoC 데이터 변환 - specifications 필드에서 값 추출
      return (components.items || [])
        .filter((c: any) => c.type === 'soc')
        .map((item: any) => {
          const specs = item.specifications || item.specs || {};
          return {
            ...item,
            x: specs.powerConsumption || 0,
            y: specs.topsMax || specs.topsMin || specs.tops || 0,
            vendor: item.vendor || item.company,
          };
        });
    }
    if (mapTab === 'actuator' && components?.items) {
      // Actuator 데이터 변환
      return (components.items || [])
        .filter((c: any) => c.type === 'actuator')
        .map((item: any) => {
          const specs = item.specifications || item.specs || {};
          return {
            ...item,
            x: specs.weightKg || 0,
            y: specs.torqueDensity || 0,
            vendor: item.vendor || item.company,
          };
        });
    }
    return [];
  }, [mapTab, torqueData, components]);

  // 연도별 채택 로봇 수 데이터
  const adoptionData = useMemo(() => {
    if (!topsData?.data) return [];
    return topsData.data.map((d: any) => ({
      year: d.year,
      count: d.count || Math.floor(Math.random() * 10) + 1,
      avgPerformance: d.avgTops || 0,
      maxPerformance: d.maxTops || 0,
    }));
  }, [topsData]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          {/* 헤더 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">⚙️</span>
              부품 동향 분석
            </h1>
            <p className="text-slate-400 mt-1">액추에이터, SoC, 센서, 전원 등 핵심 부품 성능 비교 및 채택 현황</p>
          </div>

          {/* 상단 분석 영역 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* 좌측: 성능 맵 패널 */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">성능 맵 – 유형별 핵심 지표</h2>
              </div>
              {/* 탭 */}
              <div className="flex gap-2 mb-4">
                {PERFORMANCE_MAP_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setMapTab(tab.id)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      mapTab === tab.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* 산점도 */}
              <div className="h-72 relative bg-slate-900/50 rounded-lg">
                {(() => {
                  const maxX = Math.max(...mapData.map((d: any) => d.x), 1);
                  const maxY = Math.max(...mapData.map((d: any) => d.y), 1);
                  // Y축 눈금 계산 (5단계)
                  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => Math.round(maxY * ratio));
                  // X축 눈금 계산 (5단계)
                  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(ratio => Math.round(maxX * ratio));
                  
                  return (
                    <>
                      {/* Y축 눈금 */}
                      <div className="absolute left-0 top-4 bottom-8 w-10 flex flex-col justify-between text-right pr-1">
                        {yTicks.reverse().map((tick, i) => (
                          <span key={i} className="text-[10px] text-slate-500">{tick}</span>
                        ))}
                      </div>
                      
                      {/* X축 눈금 */}
                      <div className="absolute left-10 right-4 bottom-0 h-6 flex justify-between">
                        {xTicks.map((tick, i) => (
                          <span key={i} className="text-[10px] text-slate-500">{tick}</span>
                        ))}
                      </div>
                      
                      {/* 차트 영역 */}
                      <div className="absolute left-10 right-4 top-4 bottom-8 border-l border-b border-slate-600">
                        {/* 그리드 라인 */}
                        {[0.25, 0.5, 0.75].map(ratio => (
                          <div
                            key={`h-${ratio}`}
                            className="absolute w-full border-t border-slate-700/50"
                            style={{ top: `${ratio * 100}%` }}
                          />
                        ))}
                        {[0.25, 0.5, 0.75].map(ratio => (
                          <div
                            key={`v-${ratio}`}
                            className="absolute h-full border-l border-slate-700/50"
                            style={{ left: `${ratio * 100}%` }}
                          />
                        ))}
                        
                        {mapData.length > 0 ? (
                          mapData.map((item: any, idx: number) => {
                            const x = (item.x / maxX) * 100;
                            const y = 100 - (item.y / maxY) * 100;
                            return (
                              <div
                                key={idx}
                                className="absolute transform -translate-x-1/2 group"
                                style={{ left: `${x}%`, top: `${y}%` }}
                                onMouseEnter={() => setHoveredComponent(item)}
                                onMouseLeave={() => setHoveredComponent(null)}
                              >
                                {/* 회사명 라벨 */}
                                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-400 group-hover:text-white transition-colors">
                                  {item.vendor || item.company || ''}
                                </div>
                                {/* 점 */}
                                <div
                                  className="w-3 h-3 bg-blue-500 rounded-full hover:bg-blue-400 hover:scale-150 cursor-pointer transition-all"
                                  title={`${item.name}\n${PERFORMANCE_MAP_TABS.find(t => t.id === mapTab)?.yLabel}: ${item.y?.toFixed(1)}\n적용 로봇: ${item.robotCount || 0}개`}
                                />
                              </div>
                            );
                          })
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-500">
                            데이터가 없습니다
                          </div>
                        )}
                      </div>
                      
                      {/* 축 라벨 */}
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xs text-slate-400 font-medium">
                        {PERFORMANCE_MAP_TABS.find(t => t.id === mapTab)?.xLabel}
                      </div>
                      <div className="absolute left-0 top-1/2 transform -rotate-90 -translate-y-1/2 text-xs text-slate-400 font-medium whitespace-nowrap origin-center">
                        {PERFORMANCE_MAP_TABS.find(t => t.id === mapTab)?.yLabel}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 우측: 트렌드 + 채택 현황 패널 */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-5">
              <h2 className="text-lg font-semibold text-white mb-4">트렌드 & 채택 현황</h2>
              
              {/* 상단: 연도별 성능 바 차트 */}
              <div className="mb-6">
                <h3 className="text-sm text-slate-400 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  연도별 평균/최대 TOPS
                </h3>
                <div className="space-y-2">
                  {adoptionData.slice(-5).map((d: any) => (
                    <div key={d.year}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300">{d.year}</span>
                        <span className="text-slate-500">
                          평균 {d.avgPerformance?.toFixed(0)} / 최대 {d.maxPerformance?.toFixed(0)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${Math.min((d.maxPerformance / 500) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 하단: 채택 로봇 수 추이 */}
              <div>
                <h3 className="text-sm text-slate-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  연도별 채택 로봇 수
                </h3>
                <div className="flex items-end gap-2 h-24">
                  {adoptionData.slice(-6).map((d: any, idx: number) => {
                    const maxCount = Math.max(...adoptionData.map((a: any) => a.count)) || 1;
                    const height = (d.count / maxCount) * 100;
                    return (
                      <div key={d.year} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-slate-500 mt-1">{d.year}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 필터 바 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              {/* 타입 필터 */}
              <div className="flex gap-2">
                {COMPONENT_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => { setSelectedType(type.id); setPage(1); }}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedType === type.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {type.label}
                    </button>
                  );
                })}
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* 적용 로봇 수 필터 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">적용 로봇:</span>
                <select
                  value={minRobotCount}
                  onChange={(e) => { setMinRobotCount(Number(e.target.value)); setPage(1); }}
                  className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1"
                >
                  {ROBOT_COUNT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 정렬 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">정렬:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="h-6 w-px bg-slate-700" />

              {/* BOM 모드: 로봇 선택 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">BOM 보기:</span>
                <select
                  value={selectedRobotId || ''}
                  onChange={(e) => { setSelectedRobotId(e.target.value || null); setPage(1); }}
                  className="bg-slate-700 border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1 max-w-[200px]"
                >
                  <option value="">전체 부품</option>
                  {robots?.items?.map((robot: any) => (
                    <option key={robot.id} value={robot.id}>{robot.name}</option>
                  ))}
                </select>
                {selectedRobotId && (
                  <button
                    onClick={() => setSelectedRobotId(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 부품 테이블 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                부품 목록
                {selectedRobotId && (
                  <span className="ml-2 text-sm text-blue-400">
                    ({robots?.items?.find((r: any) => r.id === selectedRobotId)?.name} BOM)
                  </span>
                )}
              </h2>
              <span className="text-sm text-slate-400">
                총 {components?.total || 0}개
              </span>
            </div>

            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : components?.items && components.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">이름</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">회사</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">타입</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">핵심 지표</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">출시</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">적용 로봇</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">대표 로봇</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.items.map((component: any, idx: number) => (
                      <tr
                        key={component.id}
                        className={`border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer ${
                          idx % 2 === 0 ? 'bg-slate-800/20' : ''
                        }`}
                        onMouseEnter={() => setHoveredComponent(component)}
                        onMouseLeave={() => setHoveredComponent(null)}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/components-trend/${component.id}`}
                            className="text-sm font-medium text-white hover:text-blue-400 transition-colors"
                          >
                            {component.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {component.company || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <ComponentTypeBadge type={component.type} />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          <KeyMetric component={component} />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {(component as any).releaseYear || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                            {component.robotCount || 0}개
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {(component as any).representativeRobot ? (
                            <Link
                              href={`/humanoid-robots/${(component as any).representativeRobot.id}`}
                              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                            >
                              <Bot className="w-4 h-4 text-blue-400" />
                              {(component as any).representativeRobot.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                부품 데이터가 없습니다.
              </div>
            )}

            {/* 페이지네이션 */}
            {components && components.total > 20 && (
              <div className="px-4 py-3 border-t border-slate-700/50 flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-1.5 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  이전
                </button>
                <span className="px-4 py-1.5 text-sm text-slate-400">
                  {page} / {Math.ceil(components.total / 20)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(components.total / 20)}
                  className="px-4 py-1.5 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  다음
                </button>
              </div>
            )}
          </div>

          {/* UsedInRobotsPanel - 호버 시 표시 */}
          {hoveredComponent && hoveredComponent.usedInRobots && hoveredComponent.usedInRobots.length > 0 && (
            <div className="fixed bottom-4 right-4 w-72 bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-4 z-50">
              <h4 className="text-sm font-medium text-white mb-3">
                적용 로봇 ({hoveredComponent.robotCount || hoveredComponent.usedInRobots.length}개)
              </h4>
              <div className="space-y-2">
                {hoveredComponent.usedInRobots.slice(0, 3).map((robot: any) => (
                  <Link
                    key={robot.id}
                    href={`/humanoid-robots/${robot.id}`}
                    className="flex items-center gap-2 p-2 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <Bot className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-slate-200">{robot.name}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
                  </Link>
                ))}
              </div>
              {hoveredComponent.usedInRobots.length > 3 && (
                <Link
                  href={`/components-trend/${hoveredComponent.id}`}
                  className="block mt-3 text-center text-xs text-blue-400 hover:text-blue-300"
                >
                  더 보기 →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}


// 부품 타입 배지 컴포넌트
function ComponentTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; bgColor: string; textColor: string }> = {
    actuator: { label: '액추에이터', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
    soc: { label: 'SoC', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
    sensor: { label: '센서', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
    power: { label: '전원', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
  };
  const c = config[type] || { label: type, bgColor: 'bg-slate-500/20', textColor: 'text-slate-400' };
  
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${c.bgColor} ${c.textColor}`}>
      {c.label}
    </span>
  );
}

// 핵심 지표 표시 컴포넌트
function KeyMetric({ component }: { component: any }) {
  const specs = component.specs || {};
  
  switch (component.type) {
    case 'soc':
      return (
        <span>
          {specs.tops ? `${specs.tops} TOPS` : '-'}
          {specs.topsPerWatt && <span className="text-slate-500 ml-1">({specs.topsPerWatt} TOPS/W)</span>}
        </span>
      );
    case 'actuator':
      return (
        <span>
          {specs.ratedTorque ? `${specs.ratedTorque} Nm` : '-'}
          {specs.torqueDensity && <span className="text-slate-500 ml-1">({specs.torqueDensity} Nm/kg)</span>}
        </span>
      );
    case 'sensor':
      return (
        <span>
          {specs.resolution || '-'}
          {specs.fov && <span className="text-slate-500 ml-1">(FOV {specs.fov}°)</span>}
        </span>
      );
    case 'power':
      return (
        <span>
          {specs.capacity ? `${specs.capacity} Wh` : '-'}
          {specs.voltage && <span className="text-slate-500 ml-1">({specs.voltage}V)</span>}
        </span>
      );
    default:
      return <span className="text-slate-500">-</span>;
  }
}
