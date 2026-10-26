'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { WeeklyBriefView } from '@/components/share/weekly/WeeklyBriefView';

export default function WeeklyBriefLatestPage() {
  return (
    <AuthGuard>
      <WeeklyBriefView />
    </AuthGuard>
  );
}
