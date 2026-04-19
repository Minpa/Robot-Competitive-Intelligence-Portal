'use client';

import { Factory, Warehouse, ShoppingBag, Building2, Hotel, Home, FlaskConical, MoreHorizontal } from 'lucide-react';

interface ApplicationCase {
  id: string;
  title: string;
  status: 'poc' | 'production' | 'pilot' | 'expanding' | 'ended';
  environment: string;
  spaceType?: string;
  taskType: string;
  robotName: string;
  robotType?: string;
  companyName: string;
  description?: string;
  robotCount?: number;
  lineCount?: number;
  costSavingPercent?: number;
  robotImages?: string[];
}

interface ApplicationCaseCardProps {
  caseData: ApplicationCase;
  onClick?: () => void;
}

const ENVIRONMENT_ICONS: Record<string, React.ReactNode> = {
  factory: <Factory className="w-4 h-4" />,
  warehouse: <Warehouse className="w-4 h-4" />,
  retail: <ShoppingBag className="w-4 h-4" />,
  healthcare: <Building2 className="w-4 h-4" />,
  hospitality: <Hotel className="w-4 h-4" />,
  home: <Home className="w-4 h-4" />,
  research_lab: <FlaskConical className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

const ENVIRONMENT_LABELS: Record<string, string> = {
  factory: '공장',
  warehouse: '물류센터',
  retail: '리테일',
  healthcare: '병원',
  hospitality: '호텔',
  home: '가정',
  research_lab: '연구소',
  other: '기타',
};

const TASK_LABELS: Record<string, string> = {
  assembly: '조립',
  picking: '피킹',
  packing: '포장',
  inspection: '검사',
  delivery: '배송',
  cleaning: '청소',
  assistance: '보조',
  transport: '운반',
  service: '서비스',
  other: '기타',
};

const ROBOT_TYPE_LABELS: Record<string, string> = {
  humanoid: '휴머노이드',
  arm: '팔형 로봇',
  amr: 'AMR',
  other: '기타',
};

export function ApplicationCaseCard({ caseData, onClick }: ApplicationCaseCardProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'production':
        return { label: '상용', color: 'bg-green-500/15 text-green-400 border-green-500/30' };
      case 'pilot':
        return { label: '파일럿', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' };
      case 'poc':
        return { label: 'PoC', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
      case 'expanding':
        return { label: '확대 중', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
      case 'ended':
        return { label: '종료', color: 'bg-ink-100 text-ink-500 border-ink-200' };
      default:
        return { label: status, color: 'bg-ink-100 text-ink-500 border-ink-200' };
    }
  };

  const statusConfig = getStatusConfig(caseData.status);

  return (
    <div
      className="bg-white rounded-lg border border-ink-200 p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* 헤더: 제목 + 상태 배지 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-ink-900 line-clamp-2 flex-1">
          {caseData.title}
        </h3>
        <span className={`px-2 py-1 text-xs font-medium rounded border flex-shrink-0 ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* 메타 정보 줄 */}
      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        {/* 환경 */}
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-ink-100 rounded text-ink-700" title="환경">
          {ENVIRONMENT_ICONS[caseData.environment] || ENVIRONMENT_ICONS.other}
          {ENVIRONMENT_LABELS[caseData.environment] || caseData.environment}
        </span>
        
        {/* 적용 공간 */}
        {caseData.spaceType && (
          <span className="px-2 py-1 bg-purple-500/15 text-purple-400 rounded" title="적용 공간">
            {caseData.spaceType}
          </span>
        )}
        
        {/* 작업 유형 */}
        <span className="px-2 py-1 bg-blue-500/15 text-blue-400 rounded" title="작업 유형">
          {TASK_LABELS[caseData.taskType] || caseData.taskType}
        </span>
        
        {/* 적용 로봇 */}
        <span className="px-2 py-1 bg-green-500/15 text-green-400 rounded" title="적용 로봇">
          {caseData.robotName}
        </span>
        
        {/* 로봇 유형 */}
        {caseData.robotType && (
          <span className="px-2 py-1 bg-orange-500/15 text-orange-400 rounded" title="로봇 유형">
            {ROBOT_TYPE_LABELS[caseData.robotType] || caseData.robotType}
          </span>
        )}
      </div>

      {/* 설명·효과 요약 줄 */}
      <div className="flex items-start justify-between gap-4">
        {/* 설명 텍스트 */}
        <p className="text-sm text-ink-500 line-clamp-2 flex-1">
          {caseData.description || '상세 설명이 없습니다.'}
        </p>

        {/* KPI 배지들 */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {caseData.robotCount && (
            <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-400 text-xs rounded whitespace-nowrap">
              로봇 {caseData.robotCount}대
            </span>
          )}
          {caseData.lineCount && (
            <span className="px-2 py-0.5 bg-teal-500/15 text-teal-400 text-xs rounded whitespace-nowrap">
              라인 {caseData.lineCount}개
            </span>
          )}
          {caseData.costSavingPercent && (
            <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs rounded whitespace-nowrap">
              비용 -{caseData.costSavingPercent}%
            </span>
          )}
        </div>
      </div>

      {/* 로봇 썸네일 */}
      {caseData.robotImages && caseData.robotImages.length > 0 && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-ink-200">
          {caseData.robotImages.slice(0, 3).map((img, i) => (
            <div
              key={i}
              className="w-12 h-12 bg-ink-100 rounded overflow-hidden group relative"
            >
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
