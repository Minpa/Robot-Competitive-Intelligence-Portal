'use client';

import { ReactNode } from 'react';
import { StaleBadge } from './StaleBadge';
import { RetryButton } from './RetryButton';
import { EmptyChartPlaceholder } from './EmptyChartPlaceholder';

export type FallbackType = 'cache' | 'hide' | 'empty_retry' | 'error_message';

export interface ErrorFallbackWrapperProps {
  children: ReactNode;
  isError: boolean;
  isLoading: boolean;
  error?: Error | null;
  fallbackType: FallbackType;
  cachedData?: unknown;
  isStale?: boolean;
  cachedAt?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
}

/**
 * ErrorFallbackWrapper — React Query error state + ViewCacheConfig fallback branching.
 *
 * - 'cache': Show children with cached data + StaleBadge
 * - 'hide': Render nothing on error
 * - 'empty_retry': EmptyChartPlaceholder + RetryButton
 * - 'error_message': Error message + RetryButton
 *
 * Requirements: 11.101~11.109
 */
export function ErrorFallbackWrapper({
  children,
  isError,
  isLoading,
  error,
  fallbackType,
  cachedData,
  isStale,
  cachedAt,
  onRetry,
  emptyMessage,
}: ErrorFallbackWrapperProps) {
  // Loading state — show spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[120px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Error state — branch by fallbackType
  if (isError) {
    switch (fallbackType) {
      case 'cache':
        // If we have cached data, show children (caller renders with cached data) + StaleBadge
        if (cachedData !== undefined && cachedData !== null) {
          return (
            <div className="relative">
              {(isStale || true) && (
                <StaleBadge cachedAt={cachedAt ?? null} />
              )}
              {children}
            </div>
          );
        }
        // No cached data available — fall through to error message
        return (
          <div className="flex flex-col items-center justify-center min-h-[120px] gap-3">
            <p className="text-sm text-slate-400">데이터를 불러올 수 없습니다</p>
            {onRetry && <RetryButton onRetry={onRetry} />}
          </div>
        );

      case 'hide':
        return null;

      case 'empty_retry':
        return (
          <div className="space-y-3">
            <EmptyChartPlaceholder
              title="데이터 로드 실패"
              message={emptyMessage || '차트 데이터를 불러올 수 없습니다'}
              icon="⚠️"
            />
            {onRetry && (
              <div className="flex justify-center">
                <RetryButton onRetry={onRetry} />
              </div>
            )}
          </div>
        );

      case 'error_message':
        return (
          <div className="flex flex-col items-center justify-center min-h-[120px] gap-3 p-4">
            <div className="text-red-400 text-2xl">⚠️</div>
            <p className="text-sm text-red-300">
              {error?.message || '오류가 발생했습니다'}
            </p>
            {onRetry && <RetryButton onRetry={onRetry} />}
          </div>
        );

      default:
        return null;
    }
  }

  // Stale data indicator (non-error but stale)
  if (isStale) {
    return (
      <div className="relative">
        <StaleBadge cachedAt={cachedAt ?? null} />
        {children}
      </div>
    );
  }

  // Normal render
  return <>{children}</>;
}
