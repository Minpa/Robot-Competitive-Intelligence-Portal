'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import RobotEvolutionTimeline from '@/components/humanoid-trend/RobotEvolutionTimeline';

function RobotEvolutionContent() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">로봇 제품 진화 로드맵</h1>
          <p className="text-sm text-slate-400 mt-1">
            기업별 휴머노이드 로봇 제품 출시 이력과 발전 경로를 한 눈에 파악합니다
          </p>
        </div>

        {/* Timeline chart */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
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
