'use client';

import { Suspense } from 'react';
import { TechTrendShareView } from '@/components/share/TechTrendShareView';

// useSearchParams(days 쿼리) 사용 — Next 14 빌드에서 Suspense 경계 필요
export default function TechTrendSharePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-500">로딩 중...</div>}>
      <TechTrendShareView />
    </Suspense>
  );
}
