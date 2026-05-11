'use client';

import { PerfectHandBenchmark } from '@/components/ci-update/PerfectHandBenchmark';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';

function HandBenchmarkContent() {
  return (
    <div className="px-4 py-6 space-y-6 max-w-full overflow-hidden">
      <PageHeader
        titleKo="Hand Perfect 대비 분석"
        titleEn="HAND BENCHMARK"
        description="이상적 다지형 핸드 스펙 대비 시장 8종 (Shadow / Allegro / Tesollo / Inspire / PaXini / LinkerHand / Sanctuary / Schunk) 차이점 분석"
      />
      <PerfectHandBenchmark />
    </div>
  );
}

export default function CompareHandBenchmarkPage() {
  return (
    <AuthGuard>
      <HandBenchmarkContent />
    </AuthGuard>
  );
}
