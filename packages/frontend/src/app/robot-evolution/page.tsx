'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import RobotEvolutionTimeline from '@/components/humanoid-trend/RobotEvolutionTimeline';
import { PageHeader, ArgosCard } from '@/components/layout/PageHeader';

function RobotEvolutionContent() {
  return (
    <div className="min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <PageHeader
          module="FLEET MODULE V4.2"
          titleKo="로봇 제품 진화 로드맵"
          titleEn="EVOLUTION TIMELINE"
          description="기업별 휴머노이드 로봇 제품 출시 이력과 발전 경로를 한눈에 파악합니다."
        />

        <ArgosCard className="p-4 overflow-hidden">
          <RobotEvolutionTimeline />
        </ArgosCard>
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
