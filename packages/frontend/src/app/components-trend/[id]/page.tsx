'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Link from 'next/link';

const TYPE_LABELS: Record<string, string> = {
  actuator: '액추에이터',
  soc: 'SoC',
  sensor: '센서',
  power: '전원',
};

const SPEC_LABELS: Record<string, string> = {
  actuatorType: '액추에이터 타입',
  ratedTorqueNm: '정격 토크 (Nm)',
  maxTorqueNm: '최대 토크 (Nm)',
  speedRpm: '속도 (RPM)',
  weightKg: '무게 (kg)',
  integrationLevel: '통합 수준',
  builtInSensors: '내장 센서',
  processNode: '공정',
  topsMin: 'TOPS (최소)',
  topsMax: 'TOPS (최대)',
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !component) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">부품을 찾을 수 없습니다.</p>
            <Link href="/components-trend" className="text-blue-600 hover:underline">
              부품 목록으로 돌아가기
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const specs = component.specifications || {};

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* 헤더 */}
          <div className="mb-6">
            <Link href="/components-trend" className="text-blue-600 hover:underline text-sm">
              ← 부품 목록으로
            </Link>
          </div>

          {/* 기본 정보 카드 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <span className={`inline-block px-3 py-1 text-sm rounded-full mb-3 ${
                  component.type === 'actuator' ? 'bg-blue-100 text-blue-800' :
                  component.type === 'soc' ? 'bg-purple-100 text-purple-800' :
                  component.type === 'sensor' ? 'bg-green-100 text-green-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {TYPE_LABELS[component.type] || component.type}
                </span>
                <h1 className="text-3xl font-bold text-gray-900">{component.name}</h1>
                {component.vendor && (
                  <p className="text-lg text-gray-600 mt-2">{component.vendor}</p>
                )}
              </div>
            </div>
          </div>

          {/* 스펙 정보 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">상세 스펙</h2>
            {Object.keys(specs).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-gray-900">{displayValue}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">스펙 정보가 없습니다.</p>
            )}
          </div>

          {/* 적용 로봇 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">적용 로봇</h2>
            {robotsUsingComponent && robotsUsingComponent.length > 0 ? (
              <div className="space-y-3">
                {robotsUsingComponent.map((item: any) => (
                  <Link
                    key={item.robot?.id || item.robotId}
                    href={`/humanoid-robots/${item.robot?.id || item.robotId}`}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.robot?.name || '알 수 없는 로봇'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.robot?.company?.name || ''}
                      </div>
                    </div>
                    <div className="text-right">
                      {item.usageLocation && (
                        <span className="text-sm text-gray-500">
                          위치: {item.usageLocation}
                        </span>
                      )}
                      {item.quantity && item.quantity > 1 && (
                        <span className="ml-2 text-sm text-blue-600">
                          x{item.quantity}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">이 부품을 사용하는 로봇이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
