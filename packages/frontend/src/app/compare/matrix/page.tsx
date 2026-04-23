'use client';

import { useState } from 'react';
import { useCiMatrix } from '@/hooks/useCiUpdate';
import { CiMatrixTable } from '@/components/ci-update/CiMatrixTable';
import { AddCompetitorModal } from '@/components/ci-update/AddCompetitorModal';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';

function MatrixContent() {
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const { data: matrixData, isLoading, error, mutate: mutateMatrix } = useCiMatrix();

  return (
    <div className="px-4 py-6 space-y-6 max-w-full overflow-hidden">
      <PageHeader
        titleKo="항목별 비교"
        titleEn="COMPARISON MATRIX"
        description="경쟁 로봇 간 주요 스펙 항목별 비교 매트릭스"
        actions={
          <>
            <button
              onClick={() => setShowAddCompetitor(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-info-soft/50 text-ink-700 text-sm hover:bg-ink-100 transition-colors"
            >
              <span>+</span>
              <span>경쟁사 추가</span>
            </button>
            <button
              onClick={() => mutateMatrix()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors"
            >
              <span>↻</span>
              <span>새로고침</span>
            </button>
          </>
        }
      />

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-ink-500 text-sm">CI 매트릭스 로딩 중...</div>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-20">
          <div className="text-red-400 text-sm">데이터 로드 실패. 서버 연결을 확인하세요.</div>
        </div>
      )}
      {matrixData && (
        <div className="bg-white rounded-xl border border-ink-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500">
              {matrixData.competitors.length}개 경쟁사 × {matrixData.layers.length}개 레이어
            </div>
          </div>
          <CiMatrixTable data={matrixData} onRefresh={() => mutateMatrix()} />
        </div>
      )}

      <AddCompetitorModal
        isOpen={showAddCompetitor}
        onClose={() => setShowAddCompetitor(false)}
        onSuccess={() => mutateMatrix()}
        existingSlugs={matrixData?.competitors.map((c) => c.slug) ?? []}
      />
    </div>
  );
}

export default function CompareMatrixPage() {
  return (
    <AuthGuard>
      <MatrixContent />
    </AuthGuard>
  );
}
