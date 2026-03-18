'use client';

interface DeploymentStats {
  newDeployments30d: number;
  pocToProductionCount: number;
  failedCount: number;
}

interface HighlightCase {
  id: string;
  title: string;
  companyName: string;
  robotName: string;
  logoUrl?: string;
  description: string;
  status: string;
}

interface RecentDeploymentEventsCardProps {
  stats: DeploymentStats;
  highlights: HighlightCase[];
  onCaseClick?: (id: string) => void;
}

export function RecentDeploymentEventsCard({
  stats,
  highlights,
  onCaseClick,
}: RecentDeploymentEventsCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'production': return 'bg-green-500/15 text-green-400';
      case 'pilot': return 'bg-yellow-500/15 text-yellow-400';
      case 'poc': return 'bg-orange-500/15 text-orange-400';
      case 'expanding': return 'bg-blue-500/15 text-blue-400';
      default: return 'bg-slate-700 text-slate-400';
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      production: '상용',
      pilot: '파일럿',
      poc: 'PoC',
      expanding: '확대 중',
      ended: '종료',
    };
    return map[status] || status;
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-slate-100 mb-4">최근 적용·도입 이벤트</h2>

      {/* 요약 숫자 3개 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.newDeployments30d}</div>
          <div className="text-xs text-slate-400">30일 신규 적용</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{stats.pocToProductionCount}</div>
          <div className="text-xs text-slate-400">PoC→상용 전환</div>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.failedCount}</div>
          <div className="text-xs text-slate-400">실패/중단</div>
        </div>
      </div>

      {/* 임팩트 큰 사례 하이라이트 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300">🔥 주요 사례</h3>
        {highlights.length > 0 ? (
          highlights.slice(0, 2).map((highlight) => (
            <div
              key={highlight.id}
              className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
              onClick={() => onCaseClick?.(highlight.id)}
            >
              {/* 로고/아이콘 */}
              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600 flex-shrink-0">
                {highlight.logoUrl ? (
                  <img src={highlight.logoUrl} alt="" className="w-8 h-8 object-contain" />
                ) : (
                  <span className="text-lg">🤖</span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-slate-100 truncate">
                    {highlight.companyName}
                  </span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${getStatusColor(highlight.status)}`}>
                    {getStatusLabel(highlight.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{highlight.description}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">최근 주요 사례가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
