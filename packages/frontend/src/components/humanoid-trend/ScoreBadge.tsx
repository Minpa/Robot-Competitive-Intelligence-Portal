'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ScoreBadgeProps {
  metadata?: {
    source?: 'auto' | 'manual';
    estimatedFields?: string[];
  } | null;
  evaluatedAt?: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  payloadScore: '페이로드 점수',
  operationTimeScore: '운용시간 점수',
  fingerDofScore: '핑거 DoF 점수',
  formFactorScore: '폼팩터 점수',
  pocDeploymentScore: 'PoC 배포 점수',
  costEfficiencyScore: '가성비 점수',
  generalityScore: '범용성 점수',
  realWorldDataScore: '실환경 데이터 점수',
  edgeInferenceScore: '엣지 추론 점수',
  multiRobotCollabScore: '다중 로봇 협업 점수',
  openSourceScore: '오픈소스 점수',
  commercialMaturityScore: '상용화 성숙도 점수',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${day} ${h}:${min}`;
}

export default function ScoreBadge({ metadata, evaluatedAt }: ScoreBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const source = metadata?.source ?? 'manual';
  const estimatedFields = metadata?.estimatedFields ?? [];
  const hasEstimated = estimatedFields.length > 0;

  return (
    <div className="inline-flex items-center gap-1.5 text-xs">
      {/* 자동/수동 배지 */}
      <span
        className={
          source === 'auto'
            ? 'px-1.5 py-0.5 rounded font-medium bg-emerald-900/40 text-emerald-400'
            : 'px-1.5 py-0.5 rounded font-medium bg-blue-900/40 text-blue-400'
        }
      >
        {source === 'auto' ? '자동' : '수동'}
      </span>

      {/* 추정 필드 경고 아이콘 + 툴팁 */}
      {hasEstimated && (
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 cursor-help" />
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 w-48 px-2.5 py-2 rounded-lg bg-argos-surface text-argos-ink text-[11px] leading-relaxed shadow-lg">
              <p className="font-medium mb-1">데이터 부족으로 추정된 항목:</p>
              <ul className="space-y-0.5">
                {estimatedFields.map((field) => (
                  <li key={field}>• {FIELD_LABELS[field] ?? field}</li>
                ))}
              </ul>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-argos-border" />
            </div>
          )}
        </div>
      )}

      {/* 평가 시점 */}
      {evaluatedAt && (
        <span className="text-argos-muted">
          {formatDate(evaluatedAt)}
        </span>
      )}
    </div>
  );
}
