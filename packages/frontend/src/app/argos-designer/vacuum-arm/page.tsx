'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { DesignerVacuumWorkbench } from '@/modules/designer/vacuum-arm';

type ReqStatus = 'live' | 'in-progress' | 'pending';

const REQUIREMENTS: Array<{ id: string; title: string; milestone: string; status: ReqStatus }> = [
  { id: 'REQ-1', title: '베이스 5변수 + 3D 시각화', milestone: 'M1 W3 ~ M2 W2', status: 'live' },
  { id: 'REQ-2', title: '팔 9변수 (1~2개)', milestone: 'M2 W1 ~ M2 W4', status: 'live' },
  { id: 'REQ-3', title: '작업 공간 메쉬', milestone: 'M2 W4 ~ M3 W1', status: 'live' },
  { id: 'REQ-4', title: '정역학 토크', milestone: 'M3 W1 ~ M3 W2', status: 'live' },
  { id: 'REQ-5', title: 'ZMP 안정성', milestone: 'M3 W2 ~ M3 W4', status: 'live' },
  { id: 'REQ-6', title: '2D 방 에디터', milestone: 'M2 W3 ~ M3 W2', status: 'live' },
  { id: 'REQ-7', title: '환경 도달성', milestone: 'M3 W3 ~ M4 W1', status: 'live' },
  { id: 'REQ-8', title: '후보 비교', milestone: 'M4 W1 ~ M4 W2', status: 'live' },
  { id: 'REQ-9', title: '변경 로그', milestone: 'M4 W2 ~ M4 W3', status: 'live' },
  { id: 'REQ-10', title: '검토 의견 + PDF', milestone: 'M4 W2 ~ M4 W4', status: 'in-progress' },
];

export default function ArgosDesignerVacuumArmPage() {
  const [minHeight, setMinHeight] = useState('calc(100vh - 64px)');

  useEffect(() => {
    const update = () => setMinHeight(`${window.innerHeight - 64}px`);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="-m-8 flex flex-col bg-designer-surface" style={{ minHeight }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-designer-rule bg-designer-surface-2 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/argos-designer/v1"
            className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted hover:text-designer-ink flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
            v1.0 (5 form factors)
          </Link>
          <div className="h-4 w-px bg-designer-rule" />
          <div className="flex flex-col">
            <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
              Prototype · Phase 1 PoC v1.2 · REQ-1~9 LIVE · vacuum-arm
            </span>
            <span className="mt-0.5 text-[17px] font-medium text-designer-ink">
              ARGOS-Designer · 청소기 + 매니퓰레이터 사양 수렴
            </span>
          </div>
        </div>
        <span className="border border-designer-rule bg-designer-card px-3 py-1.5 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
          Spec v1.2 · 2026-04-28
        </span>
      </div>

      {/* Mock Data Warning */}
      <div className="flex items-start gap-3 border-b border-designer-rule bg-[#FFF7E6] px-6 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-designer-risk" strokeWidth={2} />
        <div className="flex-1">
          <p className="text-[15px] font-medium text-designer-ink">
            모든 부품·치수 데이터는 100% Mock입니다.
          </p>
          <p className="mt-0.5 text-[15px] text-designer-muted">
            실 LG 부품 BOM, CLOiD 실 스펙, LG 가전 실 도면은 절대 입력 금지 (Phase 1 안전 가드레일). 모든 카탈로그 항목은{' '}
            <code className="font-mono text-[13px] text-designer-risk">is_mock=true</code> 플래그를 보장합니다.
          </p>
        </div>
      </div>

      {/* Workbench */}
      <DesignerVacuumWorkbench />

      {/* Roadmap */}
      <div className="border-t border-designer-rule bg-designer-surface px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
            Phase 1 Roadmap · v1.2 · 4 Months · 10 REQ
          </span>
          <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
            M4 W4 — 연구소장 5분 시연
          </span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {REQUIREMENTS.map((req) => (
            <RoadmapCard key={req.id} req={req} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* 로드맵 카드 — 상태별 시각언어 (spec §7):
 *   완료(live):    surface-2 채움 + rule 테두리 + 좌측 4px solid pass
 *   진행(in-progress): card 배경 + accent 1.5px 테두리 + 좌측 4px solid accent
 *   예정(pending): card 배경 + rule dashed 테두리 + 좌측 4px dashed muted
 */
function RoadmapCard({ req }: { req: { id: string; title: string; milestone: string; status: ReqStatus } }) {
  const isLive = req.status === 'live';
  const isInProgress = req.status === 'in-progress';

  const containerCls = [
    'relative pl-4 pr-3 py-3',
    isLive
      ? 'bg-designer-surface-2 border border-designer-rule'
      : isInProgress
        ? 'bg-designer-card border-[1.5px] border-designer-accent'
        : 'bg-designer-card border border-dashed border-designer-rule',
  ].join(' ');

  const leftBarCls = [
    'absolute left-0 top-0 bottom-0 w-1',
    isLive
      ? 'bg-designer-pass'
      : isInProgress
        ? 'bg-designer-accent'
        : 'border-l-2 border-dashed border-designer-muted',
  ].join(' ');

  const titleColor = isLive || isInProgress ? 'text-designer-ink' : 'text-designer-ink-2';

  return (
    <div className={containerCls}>
      <div className={leftBarCls} />
      <div className="flex items-center gap-2">
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-ink">
          {req.id}
        </span>
        {isLive ? (
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-designer-pass">
            · 완료
          </span>
        ) : isInProgress ? (
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-designer-accent">
            · 진행
          </span>
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-designer-muted">
            · 예정
          </span>
        )}
      </div>
      <p className={`mt-1.5 text-[15px] font-medium leading-snug ${titleColor}`}>{req.title}</p>
      <p className="mt-2 font-mono text-[11px] text-designer-muted">{req.milestone}</p>
    </div>
  );
}
