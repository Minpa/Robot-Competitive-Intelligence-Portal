'use client';

import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { WeeklyBriefView } from '@/components/share/weekly/WeeklyBriefView';

export default function WeeklyBriefWeekPage() {
  const params = useParams();
  const raw = params.weekStart;
  const weekStart = decodeURIComponent(String(Array.isArray(raw) ? raw[0] : raw ?? ''));
  return (
    <AuthGuard>
      <WeeklyBriefView weekStart={weekStart} />
    </AuthGuard>
  );
}
