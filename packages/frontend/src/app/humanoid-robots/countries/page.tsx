'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Globe, ChevronRight } from 'lucide-react';

const REGION_LABELS: Record<string, { ko: string; flag: string }> = {
  north_america: { ko: '북미', flag: '🇺🇸' },
  europe: { ko: '유럽', flag: '🇪🇺' },
  china: { ko: '중국', flag: '🇨🇳' },
  japan: { ko: '일본', flag: '🇯🇵' },
  korea: { ko: '한국', flag: '🇰🇷' },
  other: { ko: '기타', flag: '🌍' },
};

export default function CountryListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['humanoid-robots', { limit: 500 }],
    queryFn: () => api.getHumanoidRobots({ limit: 500 }),
  });

  const grouped = useMemo(() => {
    if (!data?.items) return [];
    const map = new Map<string, any[]>();
    for (const robot of data.items) {
      const region = robot.region || 'other';
      if (!map.has(region)) map.set(region, []);
      map.get(region)!.push(robot);
    }
    const order = ['north_america', 'europe', 'china', 'japan', 'korea', 'other'];
    return order
      .filter(r => map.has(r))
      .map(r => ({ region: r, robots: map.get(r)! }));
  }, [data?.items]);

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="max-w-[1600px] mx-auto px-4 py-6">
          <PageHeader
            module="TELEMETRY MODULE V4.2"
            titleKo="국가별 로봇 리스트"
            titleEn="COUNTRY LIST"
            description="지역별로 분류된 휴머노이드 로봇 목록"
          />

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
              <p className="mt-4 text-ink-500">로딩 중...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">데이터를 불러오는 중 오류가 발생했습니다.</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-ink-100">
              <p className="text-ink-500">등록된 로봇이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map(({ region, robots }) => {
                const label = REGION_LABELS[region] || { ko: region, flag: '🌍' };
                return (
                  <div key={region} className="bg-white rounded-xl border border-ink-100 overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-ink-100 bg-ink-50/50">
                      <span className="text-xl">{label.flag}</span>
                      <h2 className="text-[15px] font-semibold text-ink-900">{label.ko}</h2>
                      <span className="ml-auto text-xs font-medium text-ink-400 bg-ink-100 px-2 py-0.5 rounded-full">
                        {robots.length}개
                      </span>
                    </div>
                    <div className="divide-y divide-ink-100">
                      {robots.map((robot: any) => (
                        <Link
                          key={robot.id}
                          href={`/humanoid-robots/${robot.id}`}
                          className="flex items-center gap-4 px-5 py-3 hover:bg-ink-50/50 transition-colors group"
                        >
                          {robot.imageUrl ? (
                            <img
                              src={robot.imageUrl}
                              alt={robot.name}
                              className="w-10 h-10 rounded-lg object-cover bg-ink-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-ink-100 flex items-center justify-center">
                              <Globe className="w-5 h-5 text-ink-300" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-ink-900 truncate">
                              {robot.name}
                            </div>
                            <div className="text-[11px] text-ink-500 truncate">
                              {robot.companyName || '—'}
                              {robot.announcedYear ? ` · ${robot.announcedYear}` : ''}
                            </div>
                          </div>
                          {robot.competitivenessScore != null && (
                            <div className="text-xs font-mono font-medium text-ink-600 bg-ink-50 px-2 py-1 rounded">
                              {robot.competitivenessScore}점
                            </div>
                          )}
                          <ChevronRight className="w-4 h-4 text-ink-300 group-hover:text-ink-500 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
