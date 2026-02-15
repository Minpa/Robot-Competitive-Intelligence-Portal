'use client';

import Link from 'next/link';
import { Bot, Wrench, Newspaper, MapPin, DollarSign, Calendar, Weight, Clock } from 'lucide-react';

interface HumanoidRobotCardProps {
  robot: {
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
    applicationCaseCount?: number;
    distinctEnvironmentsCount?: number;
    newsEventCount?: number;
  };
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  showCheckbox?: boolean;
}

const STAGE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  concept: { label: '개념', bgColor: 'bg-slate-500/20', textColor: 'text-slate-400' },
  prototype: { label: '프로토타입', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  poc: { label: 'PoC', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
  pilot: { label: '파일럿', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400' },
  commercial: { label: '상용화', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
};

const SALES_STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string }> = {
  on_sale: { label: '판매 중', bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
  coming_soon: { label: '출시 예정', bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400' },
  poc_only: { label: 'PoC만', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  not_for_sale: { label: '비매품', bgColor: 'bg-slate-500/20', textColor: 'text-slate-400' },
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

const HAND_TYPE_LABELS: Record<string, string> = {
  gripper: '단순 그리퍼',
  multi_finger: '다지 손',
  modular: '교체형',
  none: '없음',
};

export function HumanoidRobotCard({ robot, isSelected, onSelect, showCheckbox }: HumanoidRobotCardProps) {
  const stageConfig = STAGE_CONFIG[robot.stage] || STAGE_CONFIG.concept;
  const salesConfig = SALES_STATUS_CONFIG[robot.salesStatus || 'not_for_sale'] || SALES_STATUS_CONFIG.not_for_sale;
  const companyName = robot.companyName || robot.company?.name || '';

  // 메타 텍스트 생성
  const metaText = [
    PURPOSE_LABELS[robot.purpose] || robot.purpose,
    LOCOMOTION_LABELS[robot.locomotionType] || robot.locomotionType,
    HAND_TYPE_LABELS[robot.handType] || robot.handType,
  ].filter(Boolean).join(' · ');

  // 스펙 텍스트 생성
  const specParts: string[] = [];
  if (robot.payload) specParts.push(`적재 ${robot.payload}kg`);
  if (robot.operatingHours) specParts.push(`연속 ${robot.operatingHours}h`);
  if (robot.listPrice) specParts.push(`약 ${(robot.listPrice / 1000).toFixed(0)}K USD`);
  if (robot.announcedYear) specParts.push(`발매: ${robot.announcedYear}년`);

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-slate-900/50 relative">
      {/* 체크박스 (비교 모드) */}
      {showCheckbox && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect?.(robot.id)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
          />
        </div>
      )}

      <Link href={`/humanoid-robots/${robot.id}`}>
        {/* 헤더: 제품명 + 배지들 */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-start justify-between gap-2">
            <div className={showCheckbox ? 'pl-6' : ''}>
              <h3 className="font-semibold text-white">{robot.name}</h3>
              <p className="text-sm text-slate-400">{companyName}</p>
            </div>
            <div className="flex flex-col gap-1 items-end shrink-0">
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${stageConfig.bgColor} ${stageConfig.textColor}`}>
                {stageConfig.label}
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${salesConfig.bgColor} ${salesConfig.textColor}`}>
                {salesConfig.label}
              </span>
            </div>
          </div>
        </div>

        {/* 메타 줄: 용도 · 이동방식 · Hand */}
        <div className="px-4 py-2 border-b border-slate-700/50">
          <p className="text-xs text-slate-400">{metaText}</p>
        </div>

        {/* 스펙/가격 줄 */}
        {specParts.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-700/50">
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              {robot.payload && (
                <span className="flex items-center gap-1">
                  <Weight className="w-3 h-3 text-blue-400" />
                  적재 {robot.payload}kg
                </span>
              )}
              {robot.operatingHours && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-green-400" />
                  연속 {robot.operatingHours}h
                </span>
              )}
              {robot.listPrice && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-yellow-400" />
                  ~{(robot.listPrice / 1000).toFixed(0)}K USD
                </span>
              )}
              {robot.announcedYear && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-400" />
                  {robot.announcedYear}년
                </span>
              )}
            </div>
          </div>
        )}

        {/* 인사이트 줄: 적용 사례, 환경, 기사/이벤트 */}
        <div className="px-4 py-3 flex flex-wrap gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1" title="적용 사례">
            <Wrench className="w-3.5 h-3.5 text-green-400" />
            사례 {robot.applicationCaseCount ?? 0}건
          </span>
          <span className="flex items-center gap-1" title="적용 환경">
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            환경 {robot.distinctEnvironmentsCount ?? 0}개
          </span>
          <span className="flex items-center gap-1" title="기사/이벤트">
            <Newspaper className="w-3.5 h-3.5 text-orange-400" />
            기사 {robot.newsEventCount ?? 0}건
          </span>
        </div>
      </Link>
    </div>
  );
}
