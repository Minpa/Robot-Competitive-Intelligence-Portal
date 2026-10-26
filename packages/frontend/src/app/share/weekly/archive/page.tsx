'use client';

import Link from 'next/link';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { WeeklyArchiveList } from '@/components/share/weekly/WeeklyArchiveList';

export default function WeeklyBriefArchivePage() {
  return (
    <AuthGuard>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <PageHeader
          module="Share · Weekly"
          titleKo="주간 브리프 아카이브"
          titleEn="Archive"
          description="최근 26주 브리프 목록입니다. 항목을 누르면 해당 주차 브리프로 이동합니다."
          actions={
            <Link
              href="/share/weekly"
              className="inline-flex items-center gap-1.5 border border-ink-200 bg-white px-3 py-2 text-[12px] font-medium text-ink-700 transition-colors hover:border-ink-400"
            >
              최신 브리프
            </Link>
          }
        />
        <WeeklyArchiveList />
      </div>
    </AuthGuard>
  );
}
