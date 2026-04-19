'use client';

const COMPANY_COLORS: Record<string, string> = {
  'Tesla': 'text-red-400',
  'Boston Dynamics': 'text-blue-400',
  'Figure AI': 'text-purple-400',
};

const RELIABILITY_COLORS: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-blue-400',
  D: 'text-ink-500',
  E: 'text-red-400',
};

export interface RobotCostRecord {
  id: string;
  robotLabel: string;
  companyName: string;
  releaseYear: number;
  isForecast: boolean;
  cameraDesc?: string;
  cameraCostUsd: number;
  lidarDepthDesc?: string;
  lidarDepthCostUsd: number;
  computeDesc?: string;
  computeCostUsd: number;
  totalCostUsd: number;
  performanceLevel: number;
  performanceNote?: string;
  reliabilityGrade: string;
}

interface Props {
  data: RobotCostRecord[];
}

function PerfBadge({ level }: { level: number }) {
  const color =
    level >= 5 ? 'bg-green-900 text-green-300' :
    level >= 4 ? 'bg-blue-900 text-blue-300' :
    level >= 3 ? 'bg-purple-900 text-purple-300' :
    level >= 2 ? 'bg-yellow-900 text-yellow-300' :
    'bg-ink-100 text-ink-500';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${color}`}>P{level}</span>
  );
}

export default function RobotCostTable({ data }: Props) {
  const companies = ['Tesla', 'Boston Dynamics', 'Figure AI'];
  const grouped = companies.map((c) => ({
    company: c,
    rows: data.filter((r) => r.companyName === c),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-200">
            <th className="text-left py-2 px-3 text-ink-500 font-medium">로봇</th>
            <th className="text-center py-2 px-3 text-ink-500 font-medium">연도</th>
            <th className="text-left py-2 px-3 text-ink-500 font-medium hidden md:table-cell">카메라</th>
            <th className="text-left py-2 px-3 text-ink-500 font-medium hidden lg:table-cell">LiDAR/Depth</th>
            <th className="text-left py-2 px-3 text-ink-500 font-medium hidden md:table-cell">컴퓨트</th>
            <th className="text-right py-2 px-3 text-ink-500 font-medium">합계</th>
            <th className="text-center py-2 px-3 text-ink-500 font-medium">성능</th>
            <th className="text-center py-2 px-3 text-ink-500 font-medium">신뢰</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ company, rows }) => (
            <>
              <tr key={`hdr-${company}`} className="bg-ink-100">
                <td colSpan={8} className={`py-1.5 px-3 text-xs font-bold ${COMPANY_COLORS[company] ?? 'text-ink-700'}`}>
                  {company}
                </td>
              </tr>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-ink-200 hover:bg-ink-100 transition-colors ${r.isForecast ? 'opacity-70' : ''}`}
                >
                  <td className="py-2 px-3">
                    <span className={`font-medium ${COMPANY_COLORS[r.companyName] ?? 'text-ink-900'}`}>
                      {r.robotLabel}
                    </span>
                    {r.isForecast && (
                      <span className="ml-2 text-[10px] text-ink-500 border border-ink-200 rounded px-1">전망</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center text-ink-700">{r.releaseYear}</td>
                  <td className="py-2 px-3 text-ink-500 text-xs hidden md:table-cell">{r.cameraDesc ?? '—'}</td>
                  <td className="py-2 px-3 text-ink-500 text-xs hidden lg:table-cell">{r.lidarDepthDesc ?? '—'}</td>
                  <td className="py-2 px-3 text-ink-500 text-xs hidden md:table-cell">{r.computeDesc ?? '—'}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-green-400 whitespace-nowrap">
                    ~${r.totalCostUsd.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <PerfBadge level={r.performanceLevel} />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-xs font-bold ${RELIABILITY_COLORS[r.reliabilityGrade] ?? 'text-ink-500'}`}>
                      [{r.reliabilityGrade}]
                    </span>
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-xs text-ink-500 px-2">
        ※ 모든 가격은 BOM 제조원가 추정치 [D]. 소프트웨어 제외. 대부분 [D] 데이터 기반 (별도 검증 필요).
      </div>
    </div>
  );
}
