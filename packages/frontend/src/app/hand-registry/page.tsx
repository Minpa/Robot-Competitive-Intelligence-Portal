'use client';

import { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { HandCard } from '@/components/hands/HandCard';
import { useHandBenchmarkData } from '@/hooks/useCiUpdate';

const CATEGORY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'dexterous', label: '다지형' },
  { value: 'industrial-5f', label: '산업용 5지형' },
];

const COUNTRY_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: '한국', label: '한국' },
  { value: '중국', label: '중국' },
  { value: '영국', label: '영국' },
  { value: '독일', label: '독일' },
  { value: '캐나다', label: '캐나다' },
];

const SORT_OPTIONS = [
  { value: 'score-desc', label: '총점 높은순' },
  { value: 'score-asc', label: '총점 낮은순' },
  { value: 'dof-desc', label: 'DoF 높은순' },
  { value: 'name-asc', label: '이름 가나다순' },
];

function HandRegistryContent() {
  const { data, isLoading, error } = useHandBenchmarkData();
  const [category, setCategory] = useState('all');
  const [country, setCountry] = useState('all');
  const [sort, setSort] = useState('score-desc');

  const filteredAndSorted = useMemo(() => {
    if (!data) return [];
    let list = [...data.competitors];
    if (category !== 'all') list = list.filter((c) => c.category === category);
    if (country !== 'all') list = list.filter((c) => c.country === country);

    const totalOf = (h: (typeof list)[number]) =>
      data.axes.reduce((sum, ax) => sum + (h.scores[ax.key]?.currentScore || 0), 0);
    const dofOf = (h: (typeof list)[number]) => h.scores['dof']?.currentScore || 0;

    switch (sort) {
      case 'score-asc':
        list.sort((a, b) => totalOf(a) - totalOf(b));
        break;
      case 'dof-desc':
        list.sort((a, b) => dofOf(b) - dofOf(a));
        break;
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'score-desc':
      default:
        list.sort((a, b) => totalOf(b) - totalOf(a));
    }
    return list;
  }, [data, category, country, sort]);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <PageHeader
          module="TELEMETRY MODULE V4.2"
          titleKo="다지형 핸드 리스트"
          titleEn="HAND REGISTRY"
          description="등록된 다지형 핸드 / 산업용 5지형 제품 목록"
        />

        {/* 필터 패널 */}
        <div className="bg-white backdrop-blur rounded-xl border border-ink-100 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">제조국</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
              >
                {COUNTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">정렬</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Result count */}
        <p className="text-sm text-ink-500 mb-4">
          {isLoading ? '로딩 중...' : `총 ${filteredAndSorted.length}개의 핸드`}
        </p>

        {/* Loading / error / empty */}
        {isLoading && <div className="text-center py-12 text-ink-500">데이터 로딩 중...</div>}
        {error && <div className="text-center py-12 text-red-400">데이터 로드 실패</div>}
        {!isLoading && filteredAndSorted.length === 0 && (
          <div className="text-center py-12 text-ink-500">조건에 맞는 핸드가 없습니다.</div>
        )}

        {/* Cards grid */}
        {data && filteredAndSorted.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSorted.map((hand) => (
              <HandCard key={hand.id} hand={hand} axes={data.axes} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HandRegistryPage() {
  return (
    <AuthGuard>
      <HandRegistryContent />
    </AuthGuard>
  );
}
