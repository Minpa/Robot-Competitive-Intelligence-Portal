'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import {
  Building2,
  Package,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Layers,
  Cpu,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LabelList,
} from 'recharts';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

// 타입별 색상 (동적으로 생성)
const generateTypeColor = (type: string, index: number): string => {
  const colors = [
    '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#14B8A6',
    '#A855F7', '#F43F5E', '#0EA5E9', '#EAB308', '#22C55E'
  ];
  return colors[index % colors.length];
};

// 타입별 표시 이름
const TYPE_DISPLAY_NAMES: Record<string, string> = {
  humanoid: '휴머노이드',
  service: '서비스 로봇',
  logistics: '물류 로봇',
  industrial: '산업용 로봇',
  quadruped: '사족보행 로봇',
  cobot: '협동로봇',
  amr: 'AMR',
  foundation_model: 'RFM (파운데이션 모델)',
  actuator: '액츄에이터',
  soc: 'SoC',
  battery: '배터리',
};

// Product timeline tooltip
const ProductTimelineTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color || '#6B7280' }}
          />
          <span className="text-xs font-medium text-gray-500">{data.type}</span>
        </div>
        <p className="font-semibold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">{data.companyName}</p>
        <p className="text-xs text-gray-400 mt-1">{data.releaseDate || '날짜 미정'}</p>
      </div>
    );
  }
  return null;
};

// Form Factor 기본값 (제품 타입별) - 5개 축: 팔 개수, 핸드, 이동체, 높이, 페이로드
// 각 값은 0-100 스케일 (상대적 비교용)
// arms: 0=없음, 50=1개, 100=2개
// hands: 0=없음, 25=그리퍼, 50=3지, 75=4지, 100=5지
// mobility: 0=고정, 25=휠, 50=트랙, 75=4족, 100=2족
// height: 0=소형(~50cm), 50=중형(~120cm), 100=대형(170cm+)
// payload: 0=경량(~5kg), 50=중량(~50kg), 100=중량(100kg+)
const FORM_FACTOR_DEFAULTS: Record<string, { arms: number; hands: number; mobility: number; height: number; payload: number }> = {
  humanoid: { arms: 100, hands: 100, mobility: 100, height: 100, payload: 30 },  // 2팔, 5지, 2족, 대형, 경량
  cobot: { arms: 50, hands: 25, mobility: 0, height: 50, payload: 50 },          // 1팔, 그리퍼, 고정, 중형, 중량
  amr: { arms: 0, hands: 0, mobility: 25, height: 25, payload: 70 },             // 팔없음, 손없음, 휠, 소형, 중량
  logistics: { arms: 0, hands: 0, mobility: 25, height: 40, payload: 90 },       // 팔없음, 손없음, 휠, 중소형, 중량
  service: { arms: 50, hands: 25, mobility: 25, height: 60, payload: 20 },       // 1팔, 그리퍼, 휠, 중형, 경량
  quadruped: { arms: 0, hands: 0, mobility: 75, height: 40, payload: 40 },       // 팔없음, 손없음, 4족, 중소형, 중량
  industrial: { arms: 50, hands: 25, mobility: 0, height: 70, payload: 100 },    // 1팔, 그리퍼, 고정, 중대형, 중량
};

// 로봇 Form Factor 비교 차트 컴포넌트
const RobotFormFactorChart = ({ products, typeColors }: { products: any[]; typeColors: Record<string, string> }) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['humanoid', 'cobot', 'amr']);
  
  // 로봇 타입만 필터링
  const robotTypes = ['humanoid', 'cobot', 'amr', 'logistics', 'service', 'quadruped', 'industrial'];
  const availableTypes = robotTypes.filter(type => 
    products.some((p: any) => p.type === type)
  );

  // 레이더 차트 데이터 생성 - 5개 축
  const radarData = [
    { axis: '팔 개수', key: 'arms', fullMark: 100 },
    { axis: '핸드 (손)', key: 'hands', fullMark: 100 },
    { axis: '이동체', key: 'mobility', fullMark: 100 },
    { axis: '높이', key: 'height', fullMark: 100 },
    { axis: '페이로드', key: 'payload', fullMark: 100 },
  ].map(item => {
    const dataPoint: any = { axis: item.axis, fullMark: item.fullMark };
    selectedTypes.forEach(type => {
      const defaults = FORM_FACTOR_DEFAULTS[type] || { arms: 50, hands: 50, mobility: 50, height: 50, payload: 50 };
      dataPoint[type] = defaults[item.key as keyof typeof defaults];
    });
    return dataPoint;
  });

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      }
    } else {
      if (selectedTypes.length < 4) {
        setSelectedTypes([...selectedTypes, type]);
      }
    }
  };

  if (availableTypes.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-indigo-100">
          <Cpu className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">로봇 Form Factor 비교</h3>
          <p className="text-xs text-gray-500">팔 개수, 핸드, 이동체, 높이, 페이로드 5가지 축으로 비교</p>
        </div>
      </div>

      {/* 타입 선택 버튼 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {availableTypes.map((type) => {
          const isSelected = selectedTypes.includes(type);
          const typeName = TYPE_DISPLAY_NAMES[type] || type;
          const typeCount = products.filter((p: any) => p.type === type).length;
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                isSelected
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={isSelected ? { backgroundColor: typeColors[type] || COLORS[0] } : {}}
            >
              {typeName} ({typeCount})
            </button>
          );
        })}
        <span className="text-xs text-gray-400 self-center ml-2">
          (최대 4개 선택 가능)
        </span>
      </div>

      {/* 레이더 차트 */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
            {selectedTypes.map((type, index) => (
              <Radar
                key={type}
                name={TYPE_DISPLAY_NAMES[type] || type}
                dataKey={type}
                stroke={typeColors[type] || COLORS[index % COLORS.length]}
                fill={typeColors[type] || COLORS[index % COLORS.length]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Form Factor 설명 */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="p-2 bg-gray-50 rounded">
          <p className="font-medium text-gray-700">팔 개수</p>
          <p className="text-gray-500">0개 / 1개 / 2개</p>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <p className="font-medium text-gray-700">핸드 (손)</p>
          <p className="text-gray-500">없음/그리퍼/3지/5지</p>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <p className="font-medium text-gray-700">이동체</p>
          <p className="text-gray-500">고정/휠/트랙/4족/2족</p>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <p className="font-medium text-gray-700">높이</p>
          <p className="text-gray-500">소형~대형</p>
        </div>
        <div className="p-2 bg-gray-50 rounded">
          <p className="font-medium text-gray-700">페이로드</p>
          <p className="text-gray-500">경량~중량</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        * 현재는 제품 타입별 대표값으로 표시됩니다. 개별 제품 스펙 데이터가 추가되면 더 정확한 비교가 가능합니다.
      </p>
    </div>
  );
};

// 축 옵션 정의
const AXIS_OPTIONS = [
  { key: 'arms', label: '팔 개수' },
  { key: 'hands', label: '핸드 (손)' },
  { key: 'mobility', label: '이동체' },
  { key: 'height', label: '높이' },
  { key: 'payload', label: '페이로드' },
];

// Scatter Chart - 개별 제품 점 표시
const RobotScatterChart = ({ products, typeColors }: { products: any[]; typeColors: Record<string, string> }) => {
  const [xAxis, setXAxis] = useState('payload');
  const [yAxis, setYAxis] = useState('height');
  
  const robotTypes = ['humanoid', 'cobot', 'amr', 'logistics', 'service', 'quadruped', 'industrial'];
  const robotProducts = products.filter((p: any) => robotTypes.includes(p.type));
  
  if (robotProducts.length === 0) return null;

  // 제품별 데이터 생성 (타입 기본값 + 약간의 랜덤 변동)
  const scatterData = robotProducts.map((product: any, index: number) => {
    const defaults = FORM_FACTOR_DEFAULTS[product.type] || { arms: 50, hands: 50, mobility: 50, height: 50, payload: 50 };
    // 같은 타입 내에서 약간의 변동을 주어 겹치지 않게
    const variation = (index % 5) * 5 - 10;
    return {
      ...product,
      x: Math.max(0, Math.min(100, defaults[xAxis as keyof typeof defaults] + variation)),
      y: Math.max(0, Math.min(100, defaults[yAxis as keyof typeof defaults] + variation)),
      z: 150,
      color: typeColors[product.type] || '#6B7280',
    };
  });

  const xLabel = AXIS_OPTIONS.find(a => a.key === xAxis)?.label || xAxis;
  const yLabel = AXIS_OPTIONS.find(a => a.key === yAxis)?.label || yAxis;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-100">
          <Layers className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">제품별 Form Factor 분포 (Scatter)</h3>
          <p className="text-xs text-gray-500">2개 축을 선택하여 개별 제품 위치 확인</p>
        </div>
      </div>

      {/* 축 선택 */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">X축:</span>
          <select 
            value={xAxis} 
            onChange={(e) => setXAxis(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {AXIS_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Y축:</span>
          <select 
            value={yAxis} 
            onChange={(e) => setYAxis(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {AXIS_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {robotTypes.filter(type => robotProducts.some((p: any) => p.type === type)).map((type) => (
          <div key={type} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: typeColors[type] || '#6B7280' }} />
            <span className="text-gray-600">{TYPE_DISPLAY_NAMES[type] || type}</span>
          </div>
        ))}
      </div>

      {/* Scatter Chart */}
      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="x" 
              domain={[0, 100]} 
              name={xLabel}
              label={{ value: xLabel, position: 'bottom', offset: 0 }}
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              domain={[0, 100]} 
              name={yLabel}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 10 }}
              tick={{ fontSize: 11 }}
            />
            <ZAxis type="number" dataKey="z" range={[80, 200]} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-gray-900">{data.name}</p>
                      <p className="text-sm text-gray-600">{data.companyName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 mt-1">{TYPE_DISPLAY_NAMES[data.type] || data.type}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        <p>{xLabel}: {data.x}</p>
                        <p>{yLabel}: {data.y}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {robotTypes.map((type) => {
              const typeData = scatterData.filter((p: any) => p.type === type);
              if (typeData.length === 0) return null;
              return (
                <Scatter 
                  key={type} 
                  name={TYPE_DISPLAY_NAMES[type] || type} 
                  data={typeData} 
                  fill={typeColors[type] || '#6B7280'}
                >
                  {typeData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <LabelList 
                    dataKey="name" 
                    position="top" 
                    offset={8}
                    style={{ fontSize: 9, fill: '#374151', fontWeight: 500 }}
                  />
                </Scatter>
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* 제품 목록 (점 위에 이름 표시 대신) */}
      <div className="mt-4 border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">제품 목록 ({robotProducts.length}개)</p>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {robotProducts.slice(0, 20).map((product: any) => (
            <span 
              key={product.id}
              className="px-2 py-1 rounded text-xs"
              style={{ 
                backgroundColor: `${typeColors[product.type] || '#6B7280'}20`,
                color: typeColors[product.type] || '#6B7280'
              }}
            >
              {product.name}
            </span>
          ))}
          {robotProducts.length > 20 && (
            <span className="text-xs text-gray-400">+{robotProducts.length - 20}개 더</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Parallel Coordinates Chart - 5개 축 모두 표시
const RobotParallelChart = ({ products, typeColors }: { products: any[]; typeColors: Record<string, string> }) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['humanoid', 'cobot', 'amr', 'logistics']);
  
  const robotTypes = ['humanoid', 'cobot', 'amr', 'logistics', 'service', 'quadruped', 'industrial'];
  const robotProducts = products.filter((p: any) => robotTypes.includes(p.type) && selectedTypes.includes(p.type));
  
  const availableTypes = robotTypes.filter(type => 
    products.some((p: any) => p.type === type)
  );

  if (availableTypes.length === 0) return null;

  // 제품별 데이터 생성
  const parallelData = robotProducts.slice(0, 15).map((product: any, index: number) => {
    const defaults = FORM_FACTOR_DEFAULTS[product.type] || { arms: 50, hands: 50, mobility: 50, height: 50, payload: 50 };
    const variation = (index % 3) * 8 - 8;
    return {
      name: product.name,
      companyName: product.companyName,
      type: product.type,
      arms: Math.max(0, Math.min(100, defaults.arms + variation)),
      hands: Math.max(0, Math.min(100, defaults.hands + variation)),
      mobility: Math.max(0, Math.min(100, defaults.mobility + variation)),
      height: Math.max(0, Math.min(100, defaults.height + variation)),
      payload: Math.max(0, Math.min(100, defaults.payload + variation)),
      color: typeColors[product.type] || '#6B7280',
    };
  });

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-purple-100">
          <TrendingUp className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">제품별 Form Factor 비교 (Parallel)</h3>
          <p className="text-xs text-gray-500">5개 축 모두에서 개별 제품 비교 (최대 15개 표시)</p>
        </div>
      </div>

      {/* 타입 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {availableTypes.map((type) => {
          const isSelected = selectedTypes.includes(type);
          const typeName = TYPE_DISPLAY_NAMES[type] || type;
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                isSelected
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={isSelected ? { backgroundColor: typeColors[type] || COLORS[0] } : {}}
            >
              {typeName}
            </button>
          );
        })}
      </div>

      {/* Parallel Coordinates (SVG로 직접 구현) */}
      <div className="h-96 relative">
        <svg width="100%" height="100%" viewBox="0 0 800 350" preserveAspectRatio="xMidYMid meet">
          {/* 축 그리기 */}
          {AXIS_OPTIONS.map((axis, i) => {
            const x = 80 + i * 160;
            return (
              <g key={axis.key}>
                {/* 축 선 */}
                <line x1={x} y1={30} x2={x} y2={280} stroke="#E5E7EB" strokeWidth={2} />
                {/* 축 라벨 */}
                <text x={x} y={20} textAnchor="middle" fontSize={12} fill="#374151" fontWeight={500}>
                  {axis.label}
                </text>
                {/* 눈금 */}
                {[0, 25, 50, 75, 100].map(val => {
                  const y = 280 - (val / 100) * 250;
                  return (
                    <g key={val}>
                      <line x1={x - 5} y1={y} x2={x + 5} y2={y} stroke="#D1D5DB" />
                      <text x={x - 10} y={y + 4} textAnchor="end" fontSize={9} fill="#9CA3AF">
                        {val}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
          
          {/* 제품 라인 그리기 */}
          {parallelData.map((product, productIndex) => {
            const points = AXIS_OPTIONS.map((axis, i) => {
              const x = 80 + i * 160;
              const y = 280 - (product[axis.key as keyof typeof product] as number / 100) * 250;
              return `${x},${y}`;
            }).join(' ');
            
            return (
              <g key={productIndex}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={product.color}
                  strokeWidth={2}
                  strokeOpacity={0.7}
                />
                {/* 각 축에 점 표시 */}
                {AXIS_OPTIONS.map((axis, i) => {
                  const x = 80 + i * 160;
                  const y = 280 - (product[axis.key as keyof typeof product] as number / 100) * 250;
                  return (
                    <circle
                      key={`${productIndex}-${i}`}
                      cx={x}
                      cy={y}
                      r={4}
                      fill={product.color}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 제품 범례 */}
      <div className="mt-4 border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">표시된 제품 ({parallelData.length}개)</p>
        <div className="flex flex-wrap gap-2">
          {parallelData.map((product, index) => (
            <div 
              key={index}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs"
              style={{ 
                backgroundColor: `${product.color}15`,
                borderLeft: `3px solid ${product.color}`
              }}
            >
              <span className="font-medium" style={{ color: product.color }}>{product.name}</span>
              <span className="text-gray-400">({product.companyName || 'Unknown'})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 스크롤 가능한 타임라인 컴포넌트
interface ScrollableTimelineProps {
  title: string;
  subtitle: string;
  products: any[];
  typeColors: Record<string, string>;
  robotTypes?: string[];
  router: any;
  nowTimestamp: number;
  color?: string;
  showLegend?: boolean;
}

const ScrollableTimeline = ({ 
  title, 
  subtitle, 
  products, 
  typeColors, 
  robotTypes,
  router, 
  nowTimestamp,
  color,
  showLegend = false,
}: ScrollableTimelineProps) => {
  // 전체 기간 계산 (2020년부터 현재+1년까지)
  const minYear = 2020;
  const maxYear = new Date().getFullYear() + 1;
  
  // 반기 단위 틱 생성
  const allTicks: number[] = [];
  for (let year = minYear; year <= maxYear; year++) {
    allTicks.push(new Date(year, 0, 1).getTime());
    allTicks.push(new Date(year, 6, 1).getTime());
  }
  
  // 보이는 범위 (4년 = 8개 반기)
  const visibleHalfYears = 8;
  const maxScroll = Math.max(0, allTicks.length - visibleHalfYears);
  
  // 현재 시점이 오른쪽에 보이도록 초기 스크롤 위치 계산
  const calculateInitialScroll = () => {
    const now = Date.now();
    let currentTickIndex = 0;
    for (let i = 0; i < allTicks.length; i++) {
      if (allTicks[i] <= now) currentTickIndex = i;
    }
    // 현재 시점이 오른쪽 끝에서 2번째에 오도록
    return Math.max(0, Math.min(maxScroll, currentTickIndex - visibleHalfYears + 3));
  };
  
  const [scrollPosition, setScrollPosition] = useState(calculateInitialScroll);
  
  const visibleTicks = allTicks.slice(scrollPosition, scrollPosition + visibleHalfYears);
  const domainStart = visibleTicks[0] || allTicks[0];
  const domainEnd = visibleTicks[visibleTicks.length - 1] || allTicks[allTicks.length - 1];
  
  const chartData = products.map((product, index) => ({
    ...product,
    x: product.releaseDate ? new Date(product.releaseDate).getTime() : Date.now(),
    y: index % 5 + 1,
    z: 120,
    color: color || typeColors[product.type] || '#6B7280',
  }));

  // 트렌드 분석 텍스트 생성 (제품, 시장규모, 사용분야 관점)
  const generateTrendSummary = (): { 
    product: string; 
    market: string; 
    application: string; 
    overall: string;
    typeDistribution: Array<{ type: string; name: string; count: number; percentage: number }>;
    companyDistribution: Array<{ name: string; count: number; percentage: number }>;
    totalProducts: number;
  } | null => {
    if (products.length === 0) return null;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const oneYearAgo = new Date(currentYear - 1, now.getMonth(), 1);
    const twoYearsAgo = new Date(currentYear - 2, now.getMonth(), 1);
    const threeYearsAgo = new Date(currentYear - 3, now.getMonth(), 1);
    
    const recentProducts = products.filter((p: any) => {
      if (!p.releaseDate) return false;
      const date = new Date(p.releaseDate);
      return date >= oneYearAgo;
    });
    
    const olderProducts = products.filter((p: any) => {
      if (!p.releaseDate) return false;
      const date = new Date(p.releaseDate);
      return date >= twoYearsAgo && date < oneYearAgo;
    });

    const oldestProducts = products.filter((p: any) => {
      if (!p.releaseDate) return false;
      const date = new Date(p.releaseDate);
      return date >= threeYearsAgo && date < twoYearsAgo;
    });
    
    if (recentProducts.length === 0 && olderProducts.length === 0 && products.length < 3) return null;
    
    const growthRate = olderProducts.length > 0 
      ? Math.round(((recentProducts.length - olderProducts.length) / olderProducts.length) * 100)
      : 0;

    const prevGrowthRate = oldestProducts.length > 0
      ? Math.round(((olderProducts.length - oldestProducts.length) / oldestProducts.length) * 100)
      : 0;
    
    // 타입별 분포
    const typeDistribution: Record<string, number> = {};
    const recentTypeDistribution: Record<string, number> = {};
    products.forEach((p: any) => {
      typeDistribution[p.type] = (typeDistribution[p.type] || 0) + 1;
    });
    recentProducts.forEach((p: any) => {
      recentTypeDistribution[p.type] = (recentTypeDistribution[p.type] || 0) + 1;
    });
    const sortedTypes = Object.entries(typeDistribution).sort((a, b) => b[1] - a[1]);
    const sortedRecentTypes = Object.entries(recentTypeDistribution).sort((a, b) => b[1] - a[1]);
    
    // 회사별 분포 (undefined 필터링)
    const companyDistribution: Record<string, number> = {};
    const recentCompanyDistribution: Record<string, number> = {};
    products.forEach((p: any) => {
      if (p.companyName) {
        companyDistribution[p.companyName] = (companyDistribution[p.companyName] || 0) + 1;
      }
    });
    recentProducts.forEach((p: any) => {
      if (p.companyName) {
        recentCompanyDistribution[p.companyName] = (recentCompanyDistribution[p.companyName] || 0) + 1;
      }
    });
    const topCompanies = Object.entries(companyDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .filter(([name]) => name && name !== 'undefined');
    const topRecentCompanies = Object.entries(recentCompanyDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .filter(([name]) => name && name !== 'undefined');

    // 국가별 분포
    const countryDistribution: Record<string, number> = {};
    products.forEach((p: any) => {
      // companyName에서 국가 추정 (실제로는 회사 데이터에서 가져와야 함)
      const country = p.country || 'Unknown';
      countryDistribution[country] = (countryDistribution[country] || 0) + 1;
    });
    
    // 1. 제품 관점 분석
    let productAnalysis = '';
    if (products.length > 0) {
      productAnalysis = `총 ${products.length}개 제품이 등록되어 있으며, `;
      if (recentProducts.length > 0) {
        productAnalysis += `최근 1년간 ${recentProducts.length}개의 신제품이 출시되었습니다. `;
        if (sortedRecentTypes.length > 0) {
          const topTypes = sortedRecentTypes.slice(0, 3).map(([type, count]) => 
            `${TYPE_DISPLAY_NAMES[type] || type}(${count}개)`
          ).join(', ');
          productAnalysis += `신제품 유형별로는 ${topTypes} 순으로 출시되었습니다. `;
        }
        if (topRecentCompanies.length > 0) {
          const activeCompanies = topRecentCompanies.map(([name, count]) => `${name}(${count}개)`).join(', ');
          productAnalysis += `최근 가장 활발한 기업은 ${activeCompanies}입니다.`;
        }
      } else {
        productAnalysis += `최근 1년간 신규 출시 제품은 없습니다.`;
      }
    }

    // 2. 시장 규모 관점 분석
    let marketAnalysis = '';
    if (olderProducts.length > 0 || recentProducts.length > 0) {
      if (growthRate > 20) {
        marketAnalysis = `시장이 급성장 중입니다. 전년 대비 ${growthRate}% 증가하여 높은 성장세를 보이고 있습니다. `;
      } else if (growthRate > 0) {
        marketAnalysis = `시장이 안정적으로 성장 중입니다. 전년 대비 ${growthRate}% 증가했습니다. `;
      } else if (growthRate === 0) {
        marketAnalysis = `시장이 안정기에 접어들었습니다. 전년과 비슷한 수준을 유지하고 있습니다. `;
      } else {
        marketAnalysis = `시장이 조정기에 있습니다. 전년 대비 ${Math.abs(growthRate)}% 감소했으나, 기술 고도화에 따른 자연스러운 현상으로 보입니다. `;
      }
      
      if (prevGrowthRate !== 0 && olderProducts.length > 0) {
        if (growthRate > prevGrowthRate) {
          marketAnalysis += `성장 가속화 추세입니다(전전년 대비 ${prevGrowthRate}% → 전년 대비 ${growthRate}%). `;
        } else if (growthRate < prevGrowthRate && growthRate > 0) {
          marketAnalysis += `성장세가 다소 둔화되고 있습니다. `;
        }
      }

      if (topCompanies.length >= 3) {
        const top3Share = topCompanies.slice(0, 3).reduce((sum, [, count]) => sum + count, 0);
        const marketConcentration = Math.round((top3Share / products.length) * 100);
        if (marketConcentration > 60) {
          marketAnalysis += `상위 3개 기업이 시장의 ${marketConcentration}%를 점유하며 과점 구조를 보입니다.`;
        } else if (marketConcentration > 40) {
          marketAnalysis += `상위 3개 기업이 시장의 ${marketConcentration}%를 점유하고 있습니다.`;
        } else {
          marketAnalysis += `시장이 다양한 기업들로 분산되어 있어 경쟁이 활발합니다.`;
        }
      }
    } else {
      marketAnalysis = `시장 규모 분석을 위한 충분한 데이터가 축적되지 않았습니다.`;
    }

    // 3. 사용 분야 관점 분석
    let applicationAnalysis = '';
    if (sortedTypes.length > 0) {
      const typeBreakdown = sortedTypes.slice(0, 4).map(([type, count]) => {
        const percentage = Math.round((count / products.length) * 100);
        return `${TYPE_DISPLAY_NAMES[type] || type} ${percentage}%`;
      }).join(', ');
      applicationAnalysis = `분야별 분포: ${typeBreakdown}. `;
      
      if (sortedTypes.length > 1) {
        const topType = sortedTypes[0][0];
        const topTypeName = TYPE_DISPLAY_NAMES[topType] || topType;
        applicationAnalysis += `${topTypeName} 분야가 가장 큰 비중을 차지하고 있으며, `;
        
        // 성장하는 분야 찾기
        if (sortedRecentTypes.length > 0) {
          const growingTypes = sortedRecentTypes.filter(([type]) => {
            const totalCount = typeDistribution[type] || 0;
            const recentCount = recentTypeDistribution[type] || 0;
            return totalCount > 0 && (recentCount / totalCount) > 0.5;
          });
          if (growingTypes.length > 0) {
            const growingNames = growingTypes.slice(0, 2).map(([type]) => TYPE_DISPLAY_NAMES[type] || type).join(', ');
            applicationAnalysis += `${growingNames} 분야가 최근 빠르게 성장하고 있습니다.`;
          } else {
            applicationAnalysis += `전반적으로 균형 잡힌 성장세를 보이고 있습니다.`;
          }
        }
      }
    } else {
      applicationAnalysis = `분야별 분석을 위한 데이터가 부족합니다.`;
    }

    // 4. 종합 분석
    let overallAnalysis = '';
    if (products.length >= 5) {
      overallAnalysis = `【종합】 `;
      if (growthRate > 10) {
        overallAnalysis += `로봇 산업이 활발히 성장하고 있습니다. `;
      } else if (growthRate >= 0) {
        overallAnalysis += `로봇 산업이 안정적인 성장세를 유지하고 있습니다. `;
      } else {
        overallAnalysis += `로봇 산업이 성숙기에 접어들며 기술 고도화에 집중하고 있습니다. `;
      }
      
      if (topCompanies.length > 0) {
        overallAnalysis += `${topCompanies[0][0]}이(가) ${topCompanies[0][1]}개 제품으로 시장을 선도하고 있으며, `;
      }
      
      if (sortedTypes.length > 0) {
        const topTypeName = TYPE_DISPLAY_NAMES[sortedTypes[0][0]] || sortedTypes[0][0];
        overallAnalysis += `${topTypeName} 분야가 핵심 성장 동력입니다. `;
      }
      
      overallAnalysis += `향후 기술 혁신과 시장 확대가 지속될 것으로 전망됩니다.`;
    } else {
      overallAnalysis = `데이터 축적 중입니다. 더 많은 데이터가 수집되면 상세한 분석이 가능합니다.`;
    }

    // 분포 데이터 생성
    const typeDistributionData = sortedTypes.map(([type, count]) => ({
      type,
      name: TYPE_DISPLAY_NAMES[type] || type,
      count,
      percentage: Math.round((count / products.length) * 100),
    }));

    const companyDistributionData = topCompanies.slice(0, 5).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / products.length) * 100),
    }));
    
    return {
      product: productAnalysis,
      market: marketAnalysis,
      application: applicationAnalysis,
      overall: overallAnalysis,
      typeDistribution: typeDistributionData,
      companyDistribution: companyDistributionData,
      totalProducts: products.length,
    };
  };
  
  const trendSummary = generateTrendSummary();

  const handleScrollLeft = () => {
    setScrollPosition(Math.max(0, scrollPosition - 2));
  };

  const handleScrollRight = () => {
    setScrollPosition(Math.min(maxScroll, scrollPosition + 2));
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${color || '#10B981'}20` }}>
            <Package className="w-5 h-5" style={{ color: color || '#10B981' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        {showLegend && robotTypes && (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {robotTypes.filter(type => products.some((p: any) => p.type === type)).map((type) => (
              <div key={type} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: typeColors[type] }} />
                <span className="text-gray-600">{TYPE_DISPLAY_NAMES[type] || type}</span>
              </div>
            ))}
          </div>
        )}
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
          {products.length}개
        </span>
      </div>
      
      {products.length > 0 ? (
        <>
          {/* 스크롤 컨트롤 */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleScrollLeft}
              disabled={scrollPosition === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-xs text-gray-500">
              {new Date(domainStart).getFullYear()} - {new Date(domainEnd).getFullYear()} 
              <span className="ml-2 text-gray-400">← → 스크롤</span>
            </div>
            <button
              onClick={handleScrollRight}
              disabled={scrollPosition >= maxScroll}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart 
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }} 
                onClick={(data) => {
                  if (data?.activePayload?.[0]) router.push(`/products/${data.activePayload[0].payload.id}`);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  domain={[domainStart, domainEnd]} 
                  ticks={visibleTicks}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getFullYear().toString().slice(-2)}' ${date.getMonth() < 6 ? 'H1' : 'H2'}`;
                  }} 
                  tick={{ fontSize: 11 }} 
                />
                <YAxis type="number" dataKey="y" hide domain={[0, 6]} />
                <ZAxis type="number" dataKey="z" range={[100, 400]} />
                <Tooltip content={<ProductTimelineTooltip />} />
                {nowTimestamp >= domainStart && nowTimestamp <= domainEnd && (
                  <ReferenceLine 
                    x={nowTimestamp} 
                    stroke="#EF4444" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    label={{ value: '현재', position: 'top', fill: '#EF4444', fontSize: 11 }} 
                  />
                )}
                {robotTypes ? (
                  robotTypes.map((type) => {
                    const typeData = chartData.filter((p: any) => p.type === type);
                    if (typeData.length === 0) return null;
                    return (
                      <Scatter 
                        key={type} 
                        name={type} 
                        data={typeData} 
                        fill={typeColors[type]} 
                        style={{ cursor: 'pointer' }} 
                      />
                    );
                  })
                ) : (
                  <Scatter name={title} data={chartData} fill={color} style={{ cursor: 'pointer' }} />
                )}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          {/* AI 트렌드 분석 섹션 */}
          {trendSummary && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h4 className="text-sm font-semibold text-gray-800">AI 트렌드 분석</h4>
              </div>
              
              <div className="space-y-3">
                {/* 제품 관점 */}
                <div className="p-3 bg-white rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">제품 관점</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{trendSummary.product}</p>
                </div>
                
                {/* 시장 규모 관점 */}
                <div className="p-3 bg-white rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700">시장 규모 관점</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{trendSummary.market}</p>
                </div>
                
                {/* 사용 분야 관점 */}
                <div className="p-3 bg-white rounded-lg border-l-4 border-orange-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-semibold text-orange-700">사용 분야 관점</span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">{trendSummary.application}</p>
                  
                  {/* 제품 유형별 분포 바 차트 */}
                  {trendSummary.typeDistribution && trendSummary.typeDistribution.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 mb-2">제품 유형별 분포</p>
                      {trendSummary.typeDistribution.slice(0, 6).map((item: any, index: number) => (
                        <div key={item.type} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-24 truncate">{item.name}</span>
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${item.percentage}%`,
                                backgroundColor: typeColors[item.type] || COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-16 text-right">{item.count}개 ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* 회사별 분포 */}
                  {trendSummary.companyDistribution && trendSummary.companyDistribution.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-2">주요 기업별 제품 수</p>
                      <div className="flex flex-wrap gap-2">
                        {trendSummary.companyDistribution.map((item: any, index: number) => (
                          <span 
                            key={item.name}
                            className="px-2 py-1 rounded-full text-xs"
                            style={{ 
                              backgroundColor: `${COLORS[index % COLORS.length]}20`,
                              color: COLORS[index % COLORS.length]
                            }}
                          >
                            {item.name}: {item.count}개
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 종합 분석 */}
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800 leading-relaxed font-medium">{trendSummary.overall}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">제품 목록</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
              {products.slice(0, 12).map((product: any) => (
                <Link 
                  key={product.id} 
                  href={`/products/${product.id}`} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: color || typeColors[product.type] || '#6B7280' }}
                  >
                    {product.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.companyName}</p>
                  </div>
                  <div className="text-xs text-gray-400">{product.releaseDate?.substring(0, 7) || '-'}</div>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Layers className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>등록된 제품이 없습니다.</p>
        </div>
      )}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
    retry: 1,
  });

  const { data: productTypeChart } = useQuery({
    queryKey: ['product-type-chart'],
    queryFn: () => api.getProductTypeChartData(),
    retry: 1,
  });

  // 모든 제품을 가져와서 타입별로 그룹화
  const { data: allProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['all-products-for-timeline'],
    queryFn: async () => {
      const result = await api.getProducts({ pageSize: '1000' });
      return result.items;
    },
    retry: 1,
  });

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">데이터를 불러오는 중 오류가 발생했습니다.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    { name: '회사', value: summary?.totalCompanies || 0, icon: Building2, color: 'bg-blue-500', href: '/companies' },
    { name: '제품', value: summary?.totalProducts || 0, icon: Package, color: 'bg-green-500', href: '/products' },
    { name: '키워드', value: summary?.totalKeywords || 0, icon: TrendingUp, color: 'bg-purple-500', href: '/keywords' },
  ];

  const pieData = productTypeChart?.labels?.map((label: string, i: number) => ({
    name: label,
    displayName: TYPE_DISPLAY_NAMES[label] || label,
    value: productTypeChart.datasets[0]?.data[i] || 0,
  })) || [];

  const nowTimestamp = Date.now();

  // 제품을 타입별로 그룹화
  const productsByType = (allProducts || []).reduce((acc: Record<string, any[]>, product: any) => {
    const type = product.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(product);
    return acc;
  }, {});

  // 타입별 색상 맵 생성
  const typeColors: Record<string, string> = {};
  Object.keys(productsByType).forEach((type, index) => {
    typeColors[type] = generateTypeColor(type, index);
  });

  // 로봇 타입들 (메인 타임라인에 표시)
  const robotTypes = ['humanoid', 'service', 'logistics', 'industrial', 'quadruped', 'cobot', 'amr'];
  const robotProducts = (allProducts || []).filter((p: any) => robotTypes.includes(p.type));

  // 개별 타임라인으로 표시할 타입들 (로봇 제외)
  const specialTypes = Object.keys(productsByType).filter(type => !robotTypes.includes(type) && type !== 'other');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-500">로봇 경쟁사 인텔리전스 현황</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold">{formatNumber(stat.value)}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">이번 주 신규 제품</span>
          </div>
          <p className="text-3xl font-bold">{summary?.weeklyNewProducts || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-500">AI 데이터 수집</span>
          </div>
          <Link href="/analyze" className="text-3xl font-bold text-purple-600 hover:underline">
            수집하기 →
          </Link>
        </div>
      </div>

      {/* Product Type Chart */}
      {/* 전체 제품 유형별 분포 */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">전체 제품 유형별 분포</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ displayName, percent }) => `${displayName} ${(percent * 100).toFixed(0)}%`}
                  onClick={(data) => data?.name && router.push(`/products?type=${data.name}`)}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string, props: any) => [
                    `${value}개`,
                    props.payload.displayName
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 제품 유형별 회사 분포 (개별 파이 차트) */}
      {Object.keys(productsByType).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">제품 유형별 회사 분포</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Object.entries(productsByType)
              .filter(([type, prods]) => (prods as any[]).length >= 2)
              .sort((a, b) => (b[1] as any[]).length - (a[1] as any[]).length)
              .slice(0, 8)
              .map(([type, prods], typeIndex) => {
                const products = prods as any[];
                const typeName = TYPE_DISPLAY_NAMES[type] || type;
                
                // 회사별 그룹화 (undefined, null, 빈 문자열 필터링)
                const companyCount: Record<string, number> = {};
                products.forEach((p: any) => {
                  const company = p.companyName && p.companyName.trim() ? p.companyName.trim() : null;
                  if (company) {
                    companyCount[company] = (companyCount[company] || 0) + 1;
                  }
                });
                
                const companyData = Object.entries(companyCount)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([name, count]) => ({
                    name,
                    value: count,
                    percentage: Math.round((count / products.length) * 100),
                  }));
                
                return (
                  <div key={type} className="text-center">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">{typeName}</h4>
                    <p className="text-xs text-gray-400 mb-2">{products.length}개 제품</p>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={companyData}
                            cx="50%"
                            cy="50%"
                            innerRadius={25}
                            outerRadius={45}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {companyData.map((_, index) => (
                              <Cell key={`cell-${type}-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number, name: string) => [`${value}개`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 space-y-1">
                      {companyData.slice(0, 3).map((item, idx) => (
                        <div key={item.name} className="flex items-center justify-center gap-1 text-xs">
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-gray-600 truncate max-w-[80px]">{item.name}</span>
                          <span className="text-gray-400">({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Robot Product Timeline (통합) */}
      {productsLoading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-green-100">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">로봇 제품 타임라인</h3>
              <p className="text-xs text-gray-500">데이터 로딩 중...</p>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        </div>
      ) : robotProducts.length > 0 ? (
        <ScrollableTimeline
          title="로봇 제품 타임라인"
          subtitle="휴머노이드, 서비스, 물류, 산업용, 협동로봇"
          products={robotProducts}
          typeColors={typeColors}
          robotTypes={robotTypes}
          router={router}
          nowTimestamp={nowTimestamp}
          color="#10B981"
          showLegend={true}
        />
      ) : null}

      {/* 동적 타임라인 섹션들 (로봇 외 타입) */}
      {specialTypes.map((type, index) => {
        const typeProducts = productsByType[type] || [];
        const displayName = TYPE_DISPLAY_NAMES[type] || type;
        const typeColor = generateTypeColor(type, index + robotTypes.length);
        
        return (
          <ScrollableTimeline
            key={type}
            title={displayName}
            subtitle={`${type} 타입 제품`}
            products={typeProducts}
            typeColors={typeColors}
            router={router}
            nowTimestamp={nowTimestamp}
            color={typeColor}
          />
        );
      })}

      {/* AI 데이터 수집 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">AI 데이터 수집</h3>
              <p className="text-xs text-gray-500">GPT-4o를 활용한 텍스트 분석</p>
            </div>
          </div>
          <Link href="/analyze" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
            데이터 수집하기
          </Link>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-700 mb-3">
            ChatGPT, Claude 등 AI 서비스에서 수집한 정보를 JSON 형식으로 변환하여 입력하면 자동으로 DB에 저장됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-white text-purple-600 rounded-full text-xs border border-purple-200">회사 정보</span>
            <span className="px-3 py-1 bg-white text-purple-600 rounded-full text-xs border border-purple-200">제품 정보</span>
            <span className="px-3 py-1 bg-white text-purple-600 rounded-full text-xs border border-purple-200">키워드</span>
            <span className="px-3 py-1 bg-white text-purple-600 rounded-full text-xs border border-purple-200">출시일</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-green-50 rounded-lg text-xs text-green-700">
          ✅ 크롤링 없이 합법적으로 데이터를 수집합니다. 사용자가 직접 입력한 텍스트만 분석합니다.
        </div>
      </div>

      {/* 로봇 Form Factor 비교 차트 (레이더) */}
      <RobotFormFactorChart products={allProducts || []} typeColors={typeColors} />

      {/* 로봇 Form Factor 분포 (Scatter) */}
      <RobotScatterChart products={allProducts || []} typeColors={typeColors} />

      {/* 로봇 Form Factor 비교 (Parallel Coordinates) */}
      <RobotParallelChart products={allProducts || []} typeColors={typeColors} />
    </div>
  );
}
