'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Link from 'next/link';
import { ArrowLeft, Bot, Cpu, Cog, Eye, Battery } from 'lucide-react';

const TYPE_CONFIG: Record<string, { label: string; icon: any; bg: string; text: string }> = {
  actuator: { label: '액추에이터', icon: Cog, bg: 'bg-blue-500/20', text: 'text-blue-400' },
  soc: { label: 'SoC', icon: Cpu, bg: 'bg-purple-500/20', text: 'text-purple-400' },
  sensor: { label: '센서', icon: Eye, bg: 'bg-green-500/20', text: 'text-green-400' },
  power: { label: '전원', icon: Battery, bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
};

const SPEC_LABELS: Record<string, string> = {
  actuatorType: '액추에이터 타입',
  ratedTorqueNm: '정격 토크 (Nm)',
  maxTorqueNm: '최대 토크 (Nm)',
  speedRpm: '속도 (RPM)',
  weightKg: '무게 (kg)',
  torqueDensity: '토크 밀도 (Nm/kg)',
  integrationLevel: '통합 수준',
  builtInSensors: '내장 센서',
  processNode: '공정',
  topsMin: 'TOPS (최소)',
  topsMax: 'TOPS (최대)',
  powerConsumption: '소비전력 (W)',
  topsPerWatt: 'TOPS/W',
  releaseYear: '출시 연도',
  location: '위치',
  sensorType: '센서 타입',
  resolution: '해상도',
  range: '범위',
  batteryType: '배터리 타입',
  capacityWh: '용량 (Wh)',
};

export default function ComponentDetailPage() {
  const params = useParams();
  const componentId = params.id as string;

  const { data: component, isLoading, error } = useQuery({
    queryKey: ['component', componentId],
    queryFn: () => api.getComponentById(componentId),
    enabled: !!componentId,
  });

  const { data: robotsUsingComponent } = useQuery({
    queryKey: ['component-robots', componentId],
    queryFn: () => api.getRobotsByComponent(componentId),
    enabled: !!componentId,
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

  if (error || !component) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 mb-4">부품을 찾을 수 없습니다.</p>
            <Link href="/components-trend" className="text-blue-400 hover:text-blue-300 transition-colors">
              부품 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const specs = component.specifications || {};
  const typeConfig = TYPE_CONFIG[component.type] || TYPE_CONFIG.actuator;
  const TypeIcon = typeConfig.icon;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* 헤더 */}
          <div className="mb-6">
            <Link href="/components-trend" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              부품 목록으로
            </Link>
          </div>

          {/* 기본 정보 카드 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className={`p-4 rounded-xl ${typeConfig.bg}`}>
                <TypeIcon className={`w-8 h-8 ${typeConfig.text}`} />
              </div>
              <div>
                <span className={`inline-block px-3 py-1 text-sm rounded-full mb-2 ${typeConfig.bg} ${typeConfig.text}`}>
                  {typeConfig.label}
                </span>
                <h1 className="text-2xl font-bold text-white">{component.name}</h1>
                {component.vendor && (
                  <p className="text-lg text-slate-400 mt-1">{component.vendor}</p>
                )}
              </div>
            </div>
          </div>

          {/* 스펙 정보 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">상세 스펙</h2>
            {Object.keys(specs).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(specs).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  const label = SPEC_LABELS[key] || key;
                  let displayValue: string;
                  
                  if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                  } else if (typeof value === 'boolean') {
                    displayValue = value ? '예' : '아니오';
                  } else {
                    displayValue = String(value);
                  }

                  return (
                    <div key={key} className="flex justify-between py-2 px-3 bg-slate-900/50 rounded-lg">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-medium text-white">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500">스펙 정보가 없습니다.</p>
            )}
          </div>

          {/* 적용 로봇 목록 */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">적용 로봇</h2>
            {robotsUsingComponent && robotsUsingComponent.length > 0 ? (
              <div className="space-y-3">
                {robotsUsingComponent.map((item: any) => (
                  <Link
                    key={item.robot?.id || item.robotId}
                    href={`/humanoid-robots/${item.robot?.id || item.robotId}`}
                    className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Bot className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                          {item.robot?.name || '알 수 없는 로봇'}
                        </div>
                        <div className="text-sm text-slate-500">
                          {item.robot?.company?.name || ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {item.usageLocation && (
                        <span className="text-sm text-slate-500">
                          위치: {item.usageLocation}
                        </span>
                      )}
                      {item.quantity && item.quantity > 1 && (
                        <span className="ml-2 text-sm text-blue-400">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">이 부품을 사용하는 로봇이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
