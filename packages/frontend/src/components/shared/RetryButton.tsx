'use client';

interface RetryButtonProps {
  onRetry: () => void;
  label?: string;
}

/**
 * RetryButton — retry button for error fallback states.
 * Calls onRetry (typically queryClient.refetchQueries or query.refetch).
 *
 * Requirements: 11.106, 11.109
 */
export function RetryButton({ onRetry, label = '재시도' }: RetryButtonProps) {
  return (
    <button
      onClick={onRetry}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-300 bg-blue-500/15 border border-blue-500/30 rounded-lg hover:bg-blue-500/25 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {label}
    </button>
  );
}
