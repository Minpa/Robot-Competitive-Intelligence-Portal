'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';

function ExecutiveDashboardContent() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-5xl">🚧</div>
        <h1 className="text-2xl font-bold text-white">경영진 대시보드</h1>
        <p className="text-slate-400">리뉴얼 준비 중입니다.</p>
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
