'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { Construction } from 'lucide-react';

function ExecutiveDashboardContent() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="flex justify-center"><Construction className="w-12 h-12 text-amber-400" /></div>
        <h1 className="text-2xl font-bold text-argos-ink">경영진 대시보드</h1>
        <p className="text-argos-muted">리뉴얼 준비 중입니다.</p>
      </div>
    </div>
  );
}

export default function ExecutiveDashboardPage() {
  return (
    <AuthGuard>
      <ExecutiveDashboardContent />
    </AuthGuard>
  );
}
