'use client';

import { useState } from 'react';
import { useCiMatrix } from '@/hooks/useCiUpdate';
import { CiMatrixTable } from '@/components/ci-update/CiMatrixTable';
import { CiFreshnessPanel } from '@/components/ci-update/CiFreshnessPanel';
import { CiStagingPanel } from '@/components/ci-update/CiStagingPanel';
import { CiMonitorAlertsPanel } from '@/components/ci-update/CiMonitorAlertsPanel';
import { AddCompetitorModal } from '@/components/ci-update/AddCompetitorModal';
import { PerfectRobotBenchmark } from '@/components/ci-update/PerfectRobotBenchmark';
import { useQueryClient } from '@tanstack/react-query';

type TabId = 'matrix' | 'freshness' | 'staging' | 'alerts' | 'benchmark';

const tabs: { id: TabId; name: string; icon: string }[] = [
  { id: 'matrix', name: 'CI 매트릭스', icon: '' },
  { id: 'freshness', name: '데이터 신선도', icon: '' },
  { id: 'staging', name: '스테이징 큐', icon: '' },
  { id: 'alerts', name: '모니터링 알림', icon: '' },
  { id: 'benchmark', name: 'Perfect Robot', icon: '' },
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
          <h2 className="text-xl font-bold text-ink-900">CI 데이터 업데이트</h2>
          <p className="text-sm text-ink-500 mt-0.5">
            경쟁 인텔리전스 데이터 관리 — 인라인 편집, 신선도 추적, 스테이징 검증
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCompetitor(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ink-100 text-ink-700 text-sm hover:bg-ink-200 transition-colors"
          >
            <span>+</span>
            <span>경쟁사 추가</span>
          </button>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-info !text-white text-sm hover:bg-info transition-colors"
          >
            <span>↻</span>
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-ink-200 pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-info border-b-2 border-info font-medium'
                : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100'
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
              <div className="text-ink-500 text-sm">CI 매트릭스 로딩 중...</div>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-20">
              <div className="text-neg text-sm">데이터 로드 실패. 서버 연결을 확인하세요.</div>
            </div>
          )}
          {matrixData && (
            <div className="bg-white rounded-xl border border-ink-200 p-4 shadow-report">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-ink-500">
                  {matrixData.competitors.length}개 경쟁사 × {matrixData.layers.length}개 레이어
                </div>
                <div className="flex items-center gap-3 text-[10px] text-ink-400">
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

      {activeTab === 'benchmark' && <PerfectRobotBenchmark />}

      {/* Add Competitor Modal */}
      <AddCompetitorModal
        isOpen={showAddCompetitor}
        onClose={() => setShowAddCompetitor(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
