'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import RobotEvolutionTimeline from '@/components/humanoid-trend/RobotEvolutionTimeline';

function RobotEvolutionContent() {
  return (
    <div className="min-h-screen bg-slate-950 overflow-hidden">
      <div className="px-4 py-6 space-y-6 max-w-full overflow-hidden">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-200">로봇 제품 진화 로드맵</h1>
          <p className="text-sm text-slate-400 mt-1">
            기업별 휴머노이드 로봇 제품 출시 이력과 발전 경로를 한 눈에 파악합니다
          </p>
        </div>

        {/* Timeline chart — full width, no max-w constraint */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
          <RobotEvolutionTimeline />
        </div>
      </div>
    </div>
  );
}

export default function RobotEvolutionPage() {
  return (
    <AuthGuard>
      <RobotEvolutionContent />
    </AuthGuard>
  );
}
