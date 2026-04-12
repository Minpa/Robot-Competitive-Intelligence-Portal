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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-argos-chip/50 text-argos-inkSoft text-sm hover:bg-argos-bgAlt transition-colors"
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
          <div className="text-argos-muted text-sm">CI 매트릭스 로딩 중...</div>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-20">
          <div className="text-red-400 text-sm">데이터 로드 실패. 서버 연결을 확인하세요.</div>
        </div>
      )}
      {matrixData && (
        <div className="bg-argos-surface rounded-xl border border-argos-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-argos-muted">
              {matrixData.competitors.length}개 경쟁사 × {matrixData.layers.length}개 레이어
            </div>
            <div className="flex items-center gap-3 text-[10px] text-argos-faint">
              <span>신뢰도:</span>
              <span className="text-green-400">A 확인</span>
              <span className="text-blue-400">B 높음</span>
              <span className="text-yellow-400">C 보통</span>
              <span className="text-orange-400">D 낮음</span>
              <span className="text-red-400">F 미확인</span>
            </div>
          </div>
          <CiMatrixTable data={matrixData} onRefresh={() => mutateMatrix()} />
        </div>
      )}

      <AddCompetitorModal
        isOpen={showAddCompetitor}
        onClose={() => setShowAddCompetitor(false)}
        onSuccess={() => mutateMatrix()}
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
