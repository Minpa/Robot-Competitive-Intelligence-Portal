'use client';

import { useQuery } from '@tanstack/react-query';
import { api, GlobalFilterParams } from '@/lib/api';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  Legend,
} from 'recharts';
import { EmptyChartPlaceholder } from '../shared/EmptyChartPlaceholder';
import { ErrorFallbackWrapper } from '../shared/ErrorFallbackWrapper';

interface TalentProductScatterTabProps {
  filters: GlobalFilterParams;
}

interface ScatterDataPoint {
  companyId: string;
  companyName: string;
  workforceSize: number;
  productCount: number;
  valuation: number;
  region: string;
}

const regionColors: Record<string, string> = {
  north_america: '#3b82f6',
  europe: '#22c55e',
  china: '#ef4444',
  japan: '#f59e0b',
  korea: '#a855f7',
  other: '#6b7280',
};

const regionLabels: Record<string, string> = {
  north_america: '북미',
  europe: '유럽',
  china: '중국',
  japan: '일본',
  korea: '한국',
  other: '기타',
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="font-medium text-white mb-2">{d.companyName}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">인력 규모</span>
          <span className="text-white">{d.workforceSize?.toLocaleString()}명</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">제품 수</span>
          <span className="text-white">{d.productCount}개</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">기업 가치</span>
          <span className="text-white">${(d.valuation / 1e6).toFixed(0)}M</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">지역</span>
          <span className="text-white">{regionLabels[d.region] || d.region}</span>
        </div>
      </div>
    </div>
  );
}

export function TalentProductScatterTab({ filters }: TalentProductScatterTabProps) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['exec-talent-product', filters],
    queryFn: () => api.getExecutiveTalentProductScatter(filters),
    staleTime: 86_400_000, // 24h — synced with ViewCacheConfig talent_product TTL
    gcTime: 86_400_000,
  });

  const companies: ScatterDataPoint[] = data?.companies || data || [];
  const excludedCount = data?.excludedCount ?? 0;
  const isStale = data?.isStale === true;
  const cachedAt = data?.cachedAt ?? null;

  return (
    <ErrorFallbackWrapper
      isError={isError}
      isLoading={isLoading}
      error={error as Error}
      fallbackType="cache"
      cachedData={companies.length > 0 ? companies : undefined}
      isStale={isStale || (isError && companies.length > 0)}
      cachedAt={cachedAt}
      onRetry={() => refetch()}
    >
      {(!companies || companies.length === 0) ? (
        <EmptyChartPlaceholder
          title="인력-제품 데이터 없음"
          message="인력과 제품 데이터를 모두 보유한 기업이 없습니다"
          icon="👥"
          dataType="회사"
          minDataCount={1}
        />
      ) : (
        <TalentProductScatterContent
          companies={companies}
          excludedCount={excludedCount}
        />
      )}
    </ErrorFallbackWrapper>
  );
}

function TalentProductScatterContent({
  companies,
  excludedCount,
}: {
  companies: ScatterDataPoint[];
  excludedCount: number;
}) {

  // Group by region for coloring
  const regionGroups = companies.reduce<Record<string, ScatterDataPoint[]>>((acc, c) => {
    const r = c.region || 'other';
    if (!acc[r]) acc[r] = [];
    acc[r].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>👥</span> 인력 규모 vs 제품 수
          </h3>
          <p className="text-xs text-slate-400 mt-1">버블 크기 = 기업 가치 · 인력+제품 보유 기업만 표시</p>
        </div>
        {excludedCount > 0 && (
          <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
            미등록 기업 {excludedCount}개 제외
          </span>
        )}
      </div>

      <div className="bg-slate-800/30 rounded-xl p-4" style={{ height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              type="number"
              dataKey="workforceSize"
              name="인력 규모"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#475569' }}
              label={{ value: '인력 규모 (명)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="productCount"
              name="제품 수"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={{ stroke: '#475569' }}
              label={{ value: '제품 수', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }}
            />
            <ZAxis
              type="number"
              dataKey="valuation"
              range={[60, 400]}
              name="기업 가치"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            {Object.entries(regionGroups).map(([region, points]) => (
              <Scatter
                key={region}
                name={regionLabels[region] || region}
                data={points}
                fill={regionColors[region] || '#6b7280'}
                fillOpacity={0.7}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
