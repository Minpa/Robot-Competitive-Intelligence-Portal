'use client';

import { PerfectRobotBenchmark } from '@/components/ci-update/PerfectRobotBenchmark';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';

function BenchmarkContent() {
  return (
    <div className="px-4 py-6 space-y-6 max-w-full overflow-hidden">
      <PageHeader
        titleKo="Perfect 대비 분석"
        titleEn="BENCHMARK ANALYSIS"
        description="이상적 로봇 스펙 대비 각 경쟁사 제품의 차이점 및 LG 개발 필요 항목 분석"
      />

      <PerfectRobotBenchmark />
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
