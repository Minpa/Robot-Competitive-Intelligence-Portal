'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { DesignerVacuumWorkbench } from '@/modules/designer/vacuum-arm';

const REQUIREMENTS = [
  { id: 'REQ-1', title: '베이스 5변수 + 3D 시각화', milestone: 'M1 W3 ~ M2 W2', status: 'in-progress' },
  { id: 'REQ-2', title: '팔 9변수 (1~2개)', milestone: 'M2 W1 ~ M2 W4', status: 'pending' },
  { id: 'REQ-3', title: '작업 공간 메쉬', milestone: 'M2 W4 ~ M3 W1', status: 'pending' },
  { id: 'REQ-4', title: '정역학 토크', milestone: 'M3 W1 ~ M3 W2', status: 'pending' },
  { id: 'REQ-5', title: 'ZMP 안정성', milestone: 'M3 W2 ~ M3 W4', status: 'pending' },
  { id: 'REQ-6', title: '2D 방 에디터', milestone: 'M2 W3 ~ M3 W2', status: 'pending' },
  { id: 'REQ-7', title: '환경 도달성', milestone: 'M3 W3 ~ M4 W1', status: 'pending' },
  { id: 'REQ-8', title: '후보 비교', milestone: 'M4 W1 ~ M4 W2', status: 'pending' },
  { id: 'REQ-9', title: '변경 로그', milestone: 'M4 W2 ~ M4 W3', status: 'pending' },
  { id: 'REQ-10', title: '검토 의견 + PDF', milestone: 'M4 W2 ~ M4 W4', status: 'pending' },
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
    <div className="-m-8 flex flex-col bg-[#0a0a0a]" style={{ minHeight }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0f0f0f] px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/argos-designer/v1"
            className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={2.2} />
            v1.0 (5 form factors)
          </Link>
          <div className="h-4 w-px bg-white/15" />
          <div className="flex flex-col">
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-[#E63950]">
              Prototype · Phase 1 PoC v1.2 · REQ-1 · vacuum-arm
            </span>
            <span className="mt-0.5 text-[13px] font-medium text-white">
              ARGOS-Designer · 청소기 + 매니퓰레이터 사양 수렴
            </span>
          </div>
        </div>
        <span className="border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
          Spec v1.2 · 2026-04-28
        </span>
      </div>

      {/* Mock Data Warning */}
      <div className="flex items-start gap-3 border-b border-[#E63950]/30 bg-[#2a1a0d] px-6 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#E63950]" strokeWidth={2} />
        <div className="flex-1">
          <p className="text-[12px] font-medium text-white">
            모든 부품·치수 데이터는 100% Mock입니다.
          </p>
          <p className="mt-0.5 text-[11px] text-white/60">
            실 LG 부품 BOM, CLOiD 실 스펙, LG 가전 실 도면은 절대 입력 금지 (Phase 1 안전 가드레일). 모든 카탈로그 항목은{' '}
            <code className="font-mono text-[10px] text-[#E63950]">is_mock=true</code> 플래그를 보장합니다.
          </p>
        </div>
      </div>

      {/* Workbench */}
      <DesignerVacuumWorkbench />

      {/* Roadmap */}
      <div className="border-t border-white/10 bg-[#0a0a0a] px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-white/45">
            Phase 1 Roadmap · v1.2 · 4 Months · 10 REQ
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
            M4 W4 — 연구소장 5분 시연
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {REQUIREMENTS.map((req) => (
            <div
              key={req.id}
              className={[
                'border p-3 transition-colors',
                req.status === 'in-progress'
                  ? 'border-gold/50 bg-[#1a1408]'
                  : 'border-white/10 bg-[#0f0f0f]',
              ].join(' ')}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold">
                  {req.id}
                </span>
                {req.status === 'in-progress' ? (
                  <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#E63950]">
                    · live
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[11.5px] font-medium leading-snug text-white/85">
                {req.title}
              </p>
              <p className="mt-2 font-mono text-[9px] text-white/35">{req.milestone}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
