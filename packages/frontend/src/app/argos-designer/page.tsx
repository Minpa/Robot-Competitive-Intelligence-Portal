'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DesignerWorkbench } from '@/modules/designer';

const REQUIREMENTS = [
  { id: 'REQ-1', title: '폼팩터 + 3D 뷰포트', milestone: 'M1 W3 ~ M2 W2', status: 'in-progress' },
  { id: 'REQ-2', title: '카메라 + FoV cone', milestone: 'M2 W3 ~ M3 W1', status: 'in-progress' },
  { id: 'REQ-3', title: 'DoF + 정역학 토크', milestone: 'M3 W1 ~ W3', status: 'in-progress' },
  { id: 'REQ-4', title: '페이로드 한계', milestone: 'M3 W3 ~ W4', status: 'in-progress' },
  { id: 'REQ-5', title: '부품 매칭 + 추천', milestone: 'M3 W4 ~ M4 W1', status: 'in-progress' },
  { id: 'REQ-6', title: '실패모드 코칭 (Claude)', milestone: 'M4 W1 ~ W2', status: 'in-progress' },
];

export default function ArgosDesignerPage() {
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
      <div className="flex items-center justify-between px-6 py-3 bg-[#0f0f0f] border-b border-white/10">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-[#E63950]">
            Prototype · Phase 1 PoC · REQ-1
          </span>
          <span className="text-[13px] font-medium text-white mt-0.5">
            ARGOS-Designer · Robot Configuration Sandbox
          </span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50 px-3 py-1.5 border border-white/15">
          Spec v1.0 · 2026-04-28
        </span>
      </div>

      {/* Mock Data Warning (Spec §10) */}
      <div className="flex items-start gap-3 px-6 py-3 bg-[#2a1a0d] border-b border-[#E63950]/30">
        <AlertTriangle className="w-4 h-4 text-[#E63950] shrink-0 mt-0.5" strokeWidth={2} />
        <div className="flex-1">
          <p className="text-[12px] font-medium text-white">
            모든 부품·프리셋·치수 데이터는 100% Mock입니다.
          </p>
          <p className="text-[11px] text-white/60 mt-0.5">
            실 LG 부품 BOM, CLOiD 실 스펙은 절대 입력 금지 (Phase 1 안전 가드레일). 모든 카탈로그 항목은{' '}
            <code className="font-mono text-[10px] text-[#E63950]">is_mock=true</code> 플래그를 보장합니다.
          </p>
        </div>
      </div>

      {/* Workbench (4-panel layout, populated via /modules/designer) */}
      <DesignerWorkbench />

      {/* Roadmap */}
      <div className="px-6 py-5 bg-[#0a0a0a] border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-white/45">
            Phase 1 Roadmap · 4 Months
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
            M4 W4 — 연구소장 시연
          </span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {REQUIREMENTS.map((req) => (
            <div
              key={req.id}
              className={[
                'border p-3 transition-colors',
                req.status === 'in-progress'
                  ? 'border-gold/50 bg-[#1a1408]'
                  : 'border-white/10 bg-[#0f0f0f] hover:border-white/25',
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
              <p className="mt-1 text-[11.5px] font-medium text-white/85 leading-snug">{req.title}</p>
              <p className="mt-2 font-mono text-[9px] text-white/35">{req.milestone}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
