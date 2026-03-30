'use client';

import { PerfectRobotBenchmark } from '@/components/ci-update/PerfectRobotBenchmark';
import { AuthGuard } from '@/components/auth/AuthGuard';

function BenchmarkContent() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="px-4 py-6 space-y-6 max-w-full overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-200">Perfect 대비 분석</h1>
          <p className="text-sm text-slate-400 mt-1">
            이상적 로봇 스펙 대비 각 경쟁사 제품의 차이점 및 LG 개발 필요 항목 분석
          </p>
        </div>

        <PerfectRobotBenchmark />
      </div>
    </div>
  );
}

export default function CompareBenchmarkPage() {
  return (
    <AuthGuard>
      <BenchmarkContent />
    </AuthGuard>
  );
}
