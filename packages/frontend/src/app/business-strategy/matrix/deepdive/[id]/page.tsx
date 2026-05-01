'use client';

import { notFound } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import DeepDiveContent from '@/components/entry-matrix/DeepDiveContent';
import DeepDiveProgress from '@/components/entry-matrix/DeepDiveProgress';
import { DEEP_DIVES } from '@/components/entry-matrix/data';

export default function DeepDivePage({ params }: { params: { id: string } }) {
  const rank = parseInt(params.id, 10);
  if (Number.isNaN(rank) || rank < 0 || rank >= DEEP_DIVES.length) {
    notFound();
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <DeepDiveContent rank={rank} />
        <DeepDiveProgress current={rank} />
      </div>
    </AuthGuard>
  );
}
