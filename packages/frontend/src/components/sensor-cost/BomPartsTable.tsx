'use client';

const PART_TYPE_LABELS: Record<string, string> = {
  camera: '카메라',
  lidar: 'LiDAR',
  depth: 'Depth',
  compute: '컴퓨트',
};

const RELIABILITY_COLORS: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-blue-400',
  C: 'text-yellow-400',
  D: 'text-ink-500',
  E: 'text-red-400',
};

export interface BomPart {
  id: string;
  partName: string;
  partType: string;
  unitPriceMin: number;
  unitPriceMax: number;
  unitPriceMid: number;
  priceUnit: string;
  sourceBasis?: string;
  sourceReliability: string;
  exampleRobot?: string;
  notes?: string;
}

interface Props {
  data: BomPart[];
}

export default function BomPartsTable({ data }: Props) {
  // 타입별 그룹화
  const typeOrder = ['camera', 'depth', 'lidar', 'compute'];
  const grouped = typeOrder.map((type) => ({
    type,
    parts: data.filter((p) => p.partType === type),
  })).filter((g) => g.parts.length > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-200">
            <th className="text-left py-2 px-3 text-ink-500 font-medium">센서 부품</th>
            <th className="text-right py-2 px-3 text-ink-500 font-medium whitespace-nowrap">단가 범위</th>
            <th className="text-left py-2 px-3 text-ink-500 font-medium hidden md:table-cell">채택 근거</th>
            <th className="text-left py-2 px-3 text-ink-500 font-medium hidden lg:table-cell">대표 로봇</th>
            <th className="text-center py-2 px-3 text-ink-500 font-medium">신뢰도</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ type, parts }) => (
            <>
              <tr key={`header-${type}`} className="bg-ink-100">
                <td colSpan={5} className="py-1.5 px-3 text-xs font-bold text-ink-700 uppercase tracking-wide">
                  {PART_TYPE_LABELS[type] ?? type}
                </td>
              </tr>
              {parts.map((p) => (
                <tr key={p.id} className="border-b border-ink-200 hover:bg-ink-100 transition-colors">
                  <td className="py-2 px-3 text-ink-900">{p.partName}</td>
                  <td className="py-2 px-3 text-right font-mono text-ink-900 whitespace-nowrap">
                    <span className="text-green-400">
                      ${p.unitPriceMin}–{p.unitPriceMax}
                    </span>
                    <span className="text-ink-500 text-xs">/{p.priceUnit}</span>
                  </td>
                  <td className="py-2 px-3 text-ink-500 text-xs hidden md:table-cell">{p.sourceBasis ?? '—'}</td>
                  <td className="py-2 px-3 text-ink-500 text-xs hidden lg:table-cell">{p.exampleRobot ?? '—'}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`font-bold text-xs ${RELIABILITY_COLORS[p.sourceReliability] ?? 'text-ink-500'}`}>
                      [{p.sourceReliability}]
                    </span>
                  </td>
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-xs text-ink-500 px-2 space-y-0.5">
        <p>[A] 공개 검증됨 &nbsp;[B] TechInsights 분해 분석 &nbsp;[D] 업계 추정 &nbsp;[E] 미공개·추정</p>
        <p>※ 모든 가격은 BOM 제조원가 추정치. 소프트웨어·개발비 제외. 대부분 [D] 데이터 기반 (별도 검증 필요).</p>
      </div>
    </div>
  );
}
