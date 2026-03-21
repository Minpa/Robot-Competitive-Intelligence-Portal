'use client';

import { useState } from 'react';
import { useCiMatrix } from '@/hooks/useCiUpdate';
import { CiMatrixTable } from '@/components/ci-update/CiMatrixTable';
import { CiFreshnessPanel } from '@/components/ci-update/CiFreshnessPanel';
import { CiStagingPanel } from '@/components/ci-update/CiStagingPanel';
import { CiMonitorAlertsPanel } from '@/components/ci-update/CiMonitorAlertsPanel';
import { AddCompetitorModal } from '@/components/ci-update/AddCompetitorModal';
import { useQueryClient } from '@tanstack/react-query';

type TabId = 'matrix' | 'freshness' | 'staging' | 'alerts';

const tabs: { id: TabId; name: string; icon: string }[] = [
  { id: 'matrix', name: 'CI 매트릭스', icon: '📊' },
  { id: 'freshness', name: '데이터 신선도', icon: '🕐' },
  { id: 'staging', name: '스테이징 큐', icon: '📋' },
  { id: 'alerts', name: '모니터링 알림', icon: '🔔' },
];

export default function CiUpdatePage() {
  const [activeTab, setActiveTab] = useState<TabId>('matrix');
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const { data: matrixData, isLoading, error, mutate: mutateMatrix } = useCiMatrix();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    mutateMatrix();
    queryClient.invalidateQueries({ queryKey: ['ci-update', 'freshness'] });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">CI 데이터 업데이트</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            경쟁 인텔리전스 데이터 관리 — 인라인 편집, 신선도 추적, 스테이징 검증
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCompetitor(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
          >
            <span>+</span>
            <span>경쟁사 추가</span>
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-500 transition-colors"
          >
            <span>↻</span>
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-slate-700 pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-slate-800/50 text-blue-400 border-b-2 border-blue-500 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'matrix' && (
        <div>
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-400 text-sm">CI 매트릭스 로딩 중...</div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-20">
              <div className="text-red-400 text-sm">데이터 로드 실패. 서버 연결을 확인하세요.</div>
            </div>
          )}
          {matrixData && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-slate-400">
                  {matrixData.competitors.length}개 경쟁사 × {matrixData.layers.length}개 레이어
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span>신뢰도:</span>
                  <span className="text-green-400">A 확인</span>
                  <span className="text-blue-400">B 높음</span>
                  <span className="text-yellow-400">C 보통</span>
                  <span className="text-orange-400">D 낮음</span>
                  <span className="text-red-400">F 미확인</span>
                </div>
              </div>
              <CiMatrixTable data={matrixData} onRefresh={handleRefresh} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'freshness' && <CiFreshnessPanel />}

      {activeTab === 'staging' && <CiStagingPanel />}

      {activeTab === 'alerts' && <CiMonitorAlertsPanel />}

      {/* Add Competitor Modal */}
      <AddCompetitorModal
        isOpen={showAddCompetitor}
        onClose={() => setShowAddCompetitor(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
