'use client';

interface KpiCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  isLoading?: boolean;
}

export function KpiCard({
  title,
  value,
  previousValue,
  icon = '📊',
  color = 'blue',
  isLoading = false,
}: KpiCardProps) {
  const delta = previousValue !== undefined ? value - previousValue : undefined;
  const deltaPercent = previousValue && previousValue > 0 
    ? ((value - previousValue) / previousValue * 100).toFixed(1)
    : undefined;

  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    green: 'from-green-500/10 to-green-600/5 border-green-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
  };

  const iconBgClasses = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/20 text-orange-400',
  };

  if (isLoading) {
    return (
      <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4 animate-pulse`}>
        <div className="h-4 bg-slate-700 rounded w-2/3 mb-3" />
        <div className="h-8 bg-slate-700 rounded w-1/2 mb-2" />
        <div className="h-3 bg-slate-700 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-4 hover:shadow-lg transition-shadow`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {title}
        </span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${iconBgClasses[color]}`}>
          {icon}
        </span>
      </div>

      {/* Value */}
      <div className="text-3xl font-bold text-white mb-1">
        {value.toLocaleString()}
      </div>

      {/* Delta */}
      {delta !== undefined && (
        <div className="flex items-center gap-1 text-xs">
          {delta > 0 ? (
            <>
              <span className="text-green-400 flex items-center">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                +{delta}
              </span>
              <span className="text-slate-500">전주 대비</span>
              {deltaPercent && <span className="text-green-400">(+{deltaPercent}%)</span>}
            </>
          ) : delta < 0 ? (
            <>
              <span className="text-red-400 flex items-center">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {delta}
              </span>
              <span className="text-slate-500">전주 대비</span>
              {deltaPercent && <span className="text-red-400">({deltaPercent}%)</span>}
            </>
          ) : (
            <>
              <span className="text-slate-400 flex items-center">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                변화 없음
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
