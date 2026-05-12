'use client';

import { useMemo, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { GripperListCard } from '@/components/gripper-registry/GripperListCard';
import {
  GRIPPER_CATEGORIES,
  getAppliedProcesses,
  getSectorOptions,
} from '@/components/gripper-registry/data';

const SORT_OPTIONS = [
  { value: 'processes-desc', label: '적용 공정 많은순' },
  { value: 'processes-asc', label: '적용 공정 적은순' },
  { value: 'name-asc', label: '카테고리 가나다순' },
];

function GripperRegistryContent() {
  const [sector, setSector] = useState<string>('all');
  const [sort, setSort] = useState('processes-desc');

  const sectorOptions = useMemo(() => getSectorOptions(), []);

  // 한 번 계산: 각 카테고리의 (전체) 적용 공정
  const allByCategory = useMemo(() => {
    return GRIPPER_CATEGORIES.map((cat) => ({
      cat,
      processes: getAppliedProcesses(cat.rawCategory),
    }));
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = allByCategory.map(({ cat, processes }) => ({
      cat,
      processes: sector === 'all' ? processes : processes.filter((p) => p.sectorName === sector),
    }));

    // 필터된 결과 0개 카테고리는 제외 (산업 필터 적용 시)
    if (sector !== 'all') {
      list = list.filter((row) => row.processes.length > 0);
    }

    switch (sort) {
      case 'processes-asc':
        list.sort((a, b) => a.processes.length - b.processes.length);
        break;
      case 'name-asc':
        list.sort((a, b) => a.cat.nameKr.localeCompare(b.cat.nameKr));
        break;
      case 'processes-desc':
      default:
        list.sort((a, b) => b.processes.length - a.processes.length);
    }
    return list;
  }, [allByCategory, sector, sort]);

  const totalProcesses = filteredAndSorted.reduce((sum, r) => sum + r.processes.length, 0);

  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <PageHeader
          module="TELEMETRY MODULE V4.3"
          titleKo="그리퍼 리스트"
          titleEn="GRIPPER REGISTRY"
          description="산업별·공정별 적용 검토한 그리퍼 카테고리 목록 — CLOiD 커버리지 분석 13개 셀 × 4Lv (총 52개 서브셀)에서 도출"
        />

        {/* Filter panel */}
        <div className="bg-white backdrop-blur rounded-xl border border-ink-100 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">산업 분야</label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-lg border-ink-200 bg-info-soft/50 text-ink-900 text-sm focus:border-info focus:ring-info"
              >
                <option value="all">전체</option>
                {sectorOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
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
            <div className="flex items-end">
              <p className="text-[11px] text-ink-500 leading-relaxed">
                <span className="font-semibold text-ink-700">{filteredAndSorted.length}개</span> 카테고리 ·{' '}
                <span className="font-semibold text-ink-700">{totalProcesses}개</span> 공정 적용
              </p>
            </div>
          </div>
        </div>

        {/* List */}
        {filteredAndSorted.length === 0 ? (
          <div className="text-center py-12 text-ink-500">선택한 산업에 적용 검토된 그리퍼가 없습니다.</div>
        ) : (
          <div className="space-y-4">
            {filteredAndSorted.map(({ cat, processes }) => (
              <GripperListCard key={cat.key} category={cat} processes={processes} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GripperRegistryPage() {
  return (
    <AuthGuard>
      <GripperRegistryContent />
    </AuthGuard>
  );
}
