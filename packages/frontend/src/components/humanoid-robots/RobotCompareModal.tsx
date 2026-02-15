'use client';

import { X } from 'lucide-react';

interface Robot {
  id: string;
  name: string;
  companyName?: string;
  company?: { name: string };
  stage: string;
  salesStatus?: string;
  purpose: string;
  locomotionType: string;
  handType: string;
  announcedYear?: number;
  listPrice?: number;
  payload?: number;
  operatingHours?: number;
  weight?: number;
  height?: number;
  dof?: number;
  applicationCaseCount?: number;
  distinctEnvironmentsCount?: number;
  newsEventCount?: number;
}

interface RobotCompareModalProps {
  robots: Robot[];
  onClose: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  concept: '개념',
  prototype: '프로토타입',
  poc: 'PoC',
  pilot: '파일럿',
  commercial: '상용화',
};

const SALES_LABELS: Record<string, string> = {
  on_sale: '판매 중',
  coming_soon: '출시 예정',
  poc_only: 'PoC만',
  not_for_sale: '비매품',
};

const PURPOSE_LABELS: Record<string, string> = {
  industrial: '산업용',
  home: '가정용',
  service: '서비스용',
};

const LOCOMOTION_LABELS: Record<string, string> = {
  biped: '2족 보행',
  wheel: '휠베이스',
  hybrid: '하이브리드',
};

const HAND_LABELS: Record<string, string> = {
  gripper: '단순 그리퍼',
  multi_finger: '다지 손',
  modular: '교체형',
  none: '없음',
};

const SPEC_ROWS = [
  { key: 'companyName', label: '제조사', format: (v: any, r: Robot) => r.companyName || r.company?.name || '-' },
  { key: 'stage', label: '상용 단계', format: (v: string) => STAGE_LABELS[v] || v || '-' },
  { key: 'salesStatus', label: '판매 상태', format: (v: string) => SALES_LABELS[v] || v || '-' },
  { key: 'purpose', label: '용도', format: (v: string) => PURPOSE_LABELS[v] || v || '-' },
  { key: 'locomotionType', label: '이동 방식', format: (v: string) => LOCOMOTION_LABELS[v] || v || '-' },
  { key: 'handType', label: 'Hand 타입', format: (v: string) => HAND_LABELS[v] || v || '-' },
  { key: 'announcedYear', label: '발표 연도', format: (v: number) => v ? `${v}년` : '-' },
  { key: 'listPrice', label: '가격', format: (v: number) => v ? `~${(v / 1000).toFixed(0)}K USD` : '-' },
  { key: 'payload', label: '적재 용량', format: (v: number) => v ? `${v}kg` : '-' },
  { key: 'operatingHours', label: '연속 가동', format: (v: number) => v ? `${v}시간` : '-' },
  { key: 'height', label: '높이', format: (v: number) => v ? `${v}cm` : '-' },
  { key: 'weight', label: '무게', format: (v: number) => v ? `${v}kg` : '-' },
  { key: 'dof', label: '자유도(DoF)', format: (v: number) => v ? `${v}` : '-' },
  { key: 'applicationCaseCount', label: '적용 사례', format: (v: number) => `${v ?? 0}건` },
  { key: 'distinctEnvironmentsCount', label: '적용 환경', format: (v: number) => `${v ?? 0}개` },
  { key: 'newsEventCount', label: '기사/이벤트', format: (v: number) => `${v ?? 0}건` },
];

export function RobotCompareModal({ robots, onClose }: RobotCompareModalProps) {
  if (robots.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">로봇 비교 ({robots.length}개)</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* 비교 테이블 */}
        <div className="overflow-auto max-h-[calc(90vh-80px)]">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-slate-400 border-b border-slate-700 min-w-[120px]">
                  항목
                </th>
                {robots.map((robot) => (
                  <th
                    key={robot.id}
                    className="text-left p-3 text-sm font-semibold text-white border-b border-slate-700 min-w-[150px]"
                  >
                    {robot.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPEC_ROWS.map((row, idx) => (
                <tr key={row.key} className={idx % 2 === 0 ? 'bg-slate-800/30' : ''}>
                  <td className="p-3 text-sm text-slate-400 border-b border-slate-700/50">
                    {row.label}
                  </td>
                  {robots.map((robot) => (
                    <td
                      key={robot.id}
                      className="p-3 text-sm text-slate-200 border-b border-slate-700/50"
                    >
                      {row.format((robot as any)[row.key], robot)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
