'use client';

import Link from 'next/link';
import { Grid3x3, Wrench, ArrowRight } from 'lucide-react';
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

        {/* 빠른 진입 — 진입성 매트릭스 / CLOiD 커버리지 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/business-strategy/matrix"
            className="group flex items-center gap-4 p-5 bg-white border border-[#E2DED4] hover:border-[#8B1538] hover:shadow-md transition-all"
            style={{ borderRadius: 8 }}
          >
            <div className="shrink-0 w-12 h-12 flex items-center justify-center rounded-md" style={{ backgroundColor: '#FAEAE7' }}>
              <Grid3x3 size={22} className="text-[#8B1538]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.16em] mb-0.5">
                Entry Matrix v11
              </p>
              <p className="font-medium text-[15px] text-[#1A1A1A] mb-0.5">진입성 매트릭스</p>
              <p className="text-[12.5px] text-[#5F5E5A] leading-snug">
                12 Top Task × 12 산업 — 144셀 진입 적합도 평가, 13개 진입 적합 셀 4-Lv 상세
              </p>
            </div>
            <ArrowRight size={18} className="text-[#888780] group-hover:text-[#8B1538] shrink-0" />
          </Link>

          <Link
            href="/business-strategy/cloid-coverage/v13"
            className="group flex items-center gap-4 p-5 bg-white border border-[#A50034] hover:shadow-md transition-all"
            style={{ borderRadius: 8 }}
          >
            <div className="shrink-0 w-12 h-12 flex items-center justify-center rounded-md" style={{ backgroundColor: '#FAEAE7' }}>
              <Wrench size={22} className="text-[#A50034]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10.5px] text-[#A50034] uppercase tracking-[0.16em] mb-0.5 font-semibold">
                Capability Gap · v1.3
              </p>
              <p className="font-medium text-[15px] text-[#1A1A1A] mb-0.5">CLOiD W/B 커버리지 분석</p>
              <p className="text-[12.5px] text-[#5F5E5A] leading-snug">
                52 sub-cell × 작업 종류·복잡도 매트릭스 + LG Captive 매핑 + 한국 협업 + 그리퍼 요구사항
              </p>
            </div>
            <ArrowRight size={18} className="text-[#A50034] group-hover:translate-x-1 transition-transform shrink-0" />
          </Link>
        </div>

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
