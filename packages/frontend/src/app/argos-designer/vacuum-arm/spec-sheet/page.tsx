'use client';

/**
 * Spec sheet print page · REQ-10 Phase B
 *
 * Opened in a new tab as `/argos-designer/vacuum-arm/spec-sheet?candidateId=...`.
 * Pulls the candidate from localStorage (candidates store), POSTs to backend
 * `/spec-sheet` to assemble the payload (auto-runs review), then renders the
 * print-optimized view and triggers `window.print()` once for the user.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCandidatesStore } from '@/modules/designer/vacuum-arm/stores/candidates-store';
import { designerVacuumApi } from '@/modules/designer/vacuum-arm/api/designer-vacuum-api';
import { SpecSheetView } from '@/modules/designer/vacuum-arm/components/SpecSheetView';
import type { SpecSheetPayload } from '@/modules/designer/vacuum-arm/types/product';

function SpecSheetInner() {
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('candidateId');
  const candidates = useCandidatesStore((s) => s.candidates);
  const revisions = useCandidatesStore((s) => s.revisions);
  const candidate = candidates.find((c) => c.id === candidateId);

  const [data, setData] = useState<SpecSheetPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    if (!candidate) return;
    if (!candidate.analysis) {
      setError('이 후보에는 캐시된 분석 결과가 없습니다. 워크벤치에서 후보를 다시 저장하세요.');
      return;
    }
    let cancelled = false;
    designerVacuumApi
      .specSheet({
        product: candidate.product,
        payloadKg: candidate.payloadKg,
        room: candidate.room,
        analysis: candidate.analysis,
        candidateName: candidate.name,
        revisions: revisions.map((r) => ({
          parameterName: r.parameterName,
          oldValue: r.oldValue,
          newValue: r.newValue,
          changedAt: r.changedAt,
        })),
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [candidate, revisions]);

  // Once data is loaded, kick off the browser print dialog.
  useEffect(() => {
    if (data && !printed) {
      const id = setTimeout(() => {
        try {
          window.print();
        } catch {
          // user can hit Ctrl+P manually
        }
        setPrinted(true);
      }, 600);
      return () => clearTimeout(id);
    }
  }, [data, printed]);

  if (!candidateId) {
    return (
      <div style={{ padding: 32 }}>
        <h1>candidateId 누락</h1>
        <p>워크벤치 상단 후보 카드의 [PDF] 버튼으로 진입하세요.</p>
      </div>
    );
  }
  if (!candidate) {
    return (
      <div style={{ padding: 32 }}>
        <h1>후보를 찾을 수 없습니다</h1>
        <p>localStorage에 candidate {candidateId}가 없습니다.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <h1>사양서 생성 실패</h1>
        <p>{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ padding: 32 }}>
        <p>사양서 생성 중…</p>
      </div>
    );
  }

  return (
    <>
      {/* Floating action bar — hidden when printing */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          display: 'flex',
          gap: 8,
          zIndex: 100,
        }}
      >
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            border: '1px solid #b67d00',
            background: '#fdf3d6',
            color: '#5a4000',
            padding: '6px 12px',
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          PDF 다운로드
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          style={{
            border: '1px solid #999',
            background: 'white',
            color: '#333',
            padding: '6px 12px',
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          닫기
        </button>
      </div>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <SpecSheetView data={data} />
    </>
  );
}

export default function SpecSheetPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32 }}>로딩…</div>}>
      <SpecSheetInner />
    </Suspense>
  );
}
