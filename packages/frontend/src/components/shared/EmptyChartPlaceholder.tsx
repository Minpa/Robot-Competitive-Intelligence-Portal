'use client';

interface EmptyChartPlaceholderProps {
  title?: string;
  message?: string;
  icon?: string;
  dataType?: string;
  minDataCount?: number;
}

export function EmptyChartPlaceholder({
  title = '데이터 없음',
  message = '표시할 데이터가 없습니다',
  icon = '📭',
  dataType,
  minDataCount,
}: EmptyChartPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl p-8">
      <span className="text-4xl mb-3">{icon}</span>
      <h4 className="text-sm font-semibold text-slate-300 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 text-center">{message}</p>
      {dataType && minDataCount != null && (
        <p className="text-xs text-slate-600 mt-3">
          필요 데이터: {dataType} {minDataCount}건 이상
        </p>
      )}
    </div>
  );
}
