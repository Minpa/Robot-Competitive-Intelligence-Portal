'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { SectionHeader, Tag } from '@/components/ui';
import SectionNav from '@/components/business-strategy/SectionNav';
import DomainOverview from '@/components/business-strategy/DomainOverview';
import CommonVsDifferent from '@/components/business-strategy/CommonVsDifferent';
import DomainMatrixExplorer from '@/components/business-strategy/DomainMatrixExplorer';
import ScoringLogic from '@/components/business-strategy/ScoringLogic';
import LgEntryRadar from '@/components/business-strategy/LgEntryRadar';
import CrossDomainCompare from '@/components/business-strategy/CrossDomainCompare';
import PhaseRoadmap from '@/components/business-strategy/PhaseRoadmap';
import Governance from '@/components/business-strategy/Governance';

function BusinessStrategyContent() {
  return (
    <div className="min-h-screen bg-paper">
      <SectionNav />

      <div className="max-w-[1400px] mx-auto px-4 py-8 space-y-10">
        <SectionHeader
          number="§ STRATEGY · V1.0"
          kicker="ARGOS Domain Expansion Spec"
          title="ARGOS 도메인 확장 — 4도메인 통합 사업 전략"
          subtitle="휴머노이드 진입성 매트릭스를 산업·상업·가정·물류 4개 도메인으로 확장하는 통합 데이터 구조와 Phase 로드맵. 작성 2026-04-30 / 로보틱스연구기획팀."
          right={
            <div className="flex items-center gap-2">
              <Tag tone="gold" dot>v1.0</Tag>
              <Tag tone="info">Executive Brief</Tag>
            </div>
          }
        />

        <DomainOverview />

        <CommonVsDifferent />

        <DomainMatrixExplorer />

        <ScoringLogic />

        <LgEntryRadar />

        <CrossDomainCompare />

        <PhaseRoadmap />

        <Governance />
      </div>
    </div>
  );
}

export default function BusinessStrategyPage() {
  return (
    <AuthGuard>
      <BusinessStrategyContent />
    </AuthGuard>
  );
}
