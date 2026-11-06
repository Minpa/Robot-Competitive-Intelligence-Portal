'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { ArgosCard } from '@/components/layout/PageHeader';
import {
  PARTIAL_LABEL,
  STALE_LABEL,
  cacheAgeLabel,
  compareSummary,
  defaultSectionOpen,
  formatKst,
  retryMessage,
} from '@/lib/data-coverage-view';
import { useDataCoverage } from './useDataCoverage';
import DataCoverageSection, { type RenderMetricAction } from './DataCoverageSection';

const SECTION_COUNT = 7;

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return desktop;
}

/**
 * 관리자 "데이터 커버리지" 카드 — 7개 구역(수집량, 수집 실행, 분석률, AI 비용, 스펙, 품질, 크롤 타깃)을 읽기 전용으로 보여 준다.
 * 자동 폴링은 없고, "새로고침" 은 POST /refresh (마지막 계산 후 30초 스로틀). renderAction 은 후속 백필 버튼용 자리이며 지금은 넘기지 않는다.
 */
export default function DataCoverageCard({ renderAction }: { renderAction?: RenderMetricAction }) {
  const x = useDataCoverage(true);
  const desktop = useIsDesktop();
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const d = x.data;

  return (
    <div data-testid="data-coverage-card" className="min-w-0">
      <ArgosCard>
        <div className="p-4 sm:p-6 border-b border-ink-200">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-info-soft rounded-md flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4 text-info" />
              </div>
              <h2 className="text-[15px] font-bold text-ink-900">
                데이터 커버리지 <span className="text-ink-400 font-semibold">/ Data Coverage</span>
              </h2>
            </div>

            {d && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-ink-600" data-testid="dc-generated-at">
                  {formatKst(d.generatedAt)} (KST)
                </span>
                <span className="inline-block px-2 py-0.5 rounded bg-ink-100 text-ink-700 font-semibold" data-testid="dc-cache-badge">
                  {cacheAgeLabel(d.cache)}
                </span>
                {d.cache.stale && <span className="inline-block px-2 py-0.5 rounded bg-warn-soft text-warn font-semibold">{STALE_LABEL}</span>}
                {d.partial && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neg-soft text-neg font-semibold" data-testid="dc-partial-badge">
                    <AlertTriangle className="w-3 h-3" />
                    {PARTIAL_LABEL}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 sm:ml-auto w-full sm:w-auto">
              {d && (
                <label className="flex flex-wrap items-center gap-2 text-[11px] text-ink-600 min-w-0">
                  <span className="font-semibold">비교 기준</span>
                  <select
                    value={x.compareTo ?? ''}
                    onChange={(e) => x.setCompareTo(e.target.value === '' ? null : e.target.value)}
                    disabled={d.compare.availableDates.length === 0}
                    data-testid="dc-compare-select"
                    className="min-h-[40px] max-w-full border border-ink-300 rounded-md bg-white px-2 text-[12px] text-ink-900 disabled:opacity-50"
                  >
                    <option value="">{d.compare.availableDates.length === 0 ? '스냅샷 없음' : '직전 스냅샷 (자동)'}</option>
                    {d.compare.availableDates.map((date) => (
                      <option key={date} value={date}>
                        {date}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={() => x.refresh()}
                disabled={x.refreshing || x.isLoading}
                data-testid="dc-refresh"
                className="flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 bg-brand hover:bg-brand-soft text-white text-[12px] font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {x.refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {x.refreshing ? '계산하는 중…' : '새로고침'}
              </button>
            </div>
          </div>

          {d && <div className="text-[11px] text-ink-500 mt-3" data-testid="dc-compare-summary">{compareSummary(d.compare)}</div>}
          {x.throttled && (
            <div className="text-[12px] text-warn mt-2" role="alert" data-testid="dc-throttled">
              {retryMessage(x.retryAfterSec)}
            </div>
          )}
          {x.refreshFailed && (
            <div className="text-[12px] text-neg mt-2" role="alert">
              새로고침에 실패했습니다. 잠시 후 다시 시도하세요.
            </div>
          )}
          <div className="sr-only" role="status" aria-live="polite" data-testid="dc-live">
            {x.announcement}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-3">
          {x.isLoading && (
            <div className="space-y-3" data-testid="dc-skeleton" aria-busy="true">
              {Array.from({ length: SECTION_COUNT }, (_, i) => (
                <div key={i} className="h-[44px] border border-ink-200 rounded-md bg-ink-50 animate-pulse" />
              ))}
            </div>
          )}

          {!x.isLoading && x.loadError && (
            <div className="flex flex-wrap items-center gap-3 text-[12px]" data-testid="dc-error">
              <span className="text-neg">
                {x.forbidden ? '관리자 권한이 필요합니다.' : `데이터 커버리지를 불러오지 못했습니다: ${x.loadError.message}`}
              </span>
              {!x.forbidden && (
                <button type="button" onClick={() => x.reload()} className="min-h-[40px] px-3 border border-ink-300 rounded-md text-ink-800 font-semibold hover:bg-ink-50">
                  다시 시도
                </button>
              )}
            </div>
          )}

          {d &&
            d.sections.map((s, i) => (
              <DataCoverageSection
                key={s.id}
                section={s}
                open={toggled[s.id] ?? defaultSectionOpen(i, desktop)}
                onToggle={() => setToggled((p) => ({ ...p, [s.id]: !(p[s.id] ?? defaultSectionOpen(i, desktop)) }))}
                renderAction={renderAction}
              />
            ))}
        </div>
      </ArgosCard>
    </div>
  );
}
