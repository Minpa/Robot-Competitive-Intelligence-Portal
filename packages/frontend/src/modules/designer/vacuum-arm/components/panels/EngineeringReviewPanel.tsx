'use client';

/**
 * EngineeringReviewPanel · REQ-10
 *
 * Bottom panel: [검토 받기] button → POST /review → severity cards.
 * Each recommendation gets [이 권고 적용] which dispatches a structured
 * patch back to the designer store.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import { designerVacuumApi } from '../../api/designer-vacuum-api';
import type {
  AnalyzeResponse,
  ReviewResult,
  ReviewIssue,
  ReviewRecommendation,
  ReviewApplyPatch,
  Severity,
} from '../../types/product';

interface EngineeringReviewPanelProps {
  analysis: AnalyzeResponse | null | undefined;
  isAnalyzing: boolean;
}

const SEVERITY_STYLE: Record<Severity, { bg: string; border: string; text: string; icon: typeof AlertCircle; label: string }> = {
  high: {
    bg: 'bg-[#1a0a0c]',
    border: 'border-[#E63950]',
    text: 'text-[#FF6B7A]',
    icon: AlertCircle,
    label: 'HIGH',
  },
  medium: {
    bg: 'bg-[#1a1408]',
    border: 'border-gold',
    text: 'text-gold',
    icon: AlertTriangle,
    label: 'MEDIUM',
  },
  low: {
    bg: 'bg-[#0c1018]',
    border: 'border-[#4A6FA5]',
    text: 'text-[#7BA0D6]',
    icon: Info,
    label: 'LOW',
  },
};

export function EngineeringReviewPanel({ analysis, isAnalyzing }: EngineeringReviewPanelProps) {
  const [open, setOpen] = useState(true);
  const [appliedKeys, setAppliedKeys] = useState<Set<string>>(new Set());

  const product = useDesignerVacuumStore((s) => s.product);
  const room = useDesignerVacuumStore((s) => s.room);
  const payloadKg = useDesignerVacuumStore((s) => s.payloadKg);

  const setBaseWeightKg = useDesignerVacuumStore((s) => s.setBaseWeightKg);
  const setBaseDiameterOrWidthCm = useDesignerVacuumStore((s) => s.setBaseDiameterOrWidthCm);
  const setHasLiftColumn = useDesignerVacuumStore((s) => s.setHasLiftColumn);
  const setBaseHeightCm = useDesignerVacuumStore((s) => s.setBaseHeightCm);
  const updateArm = useDesignerVacuumStore((s) => s.updateArm);
  const setPayloadKg = useDesignerVacuumStore((s) => s.setPayloadKg);

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!analysis) throw new Error('analysis missing');
      return designerVacuumApi.review(
        product,
        payloadKg,
        analysis,
        room.targets.length > 0 || room.obstacles.length > 0 ? room : null
      );
    },
    onSuccess: () => {
      setAppliedKeys(new Set());
    },
  });

  const review: ReviewResult | undefined = reviewMutation.data;
  const canReview = !!analysis && !isAnalyzing;

  const applyPatch = (key: string, patch: ReviewApplyPatch) => {
    switch (patch.kind) {
      case 'base.weightKg':
        setBaseWeightKg(patch.value);
        break;
      case 'base.diameterOrWidthCm':
        setBaseDiameterOrWidthCm(patch.value);
        break;
      case 'base.hasLiftColumn':
        setHasLiftColumn(patch.value);
        break;
      case 'base.heightCm':
        setBaseHeightCm(patch.value);
        break;
      case 'arm.upperArmLengthCm':
        updateArm(patch.armIndex, { upperArmLengthCm: patch.value });
        break;
      case 'arm.forearmLengthCm':
        updateArm(patch.armIndex, { forearmLengthCm: patch.value });
        break;
      case 'payloadKg':
        setPayloadKg(patch.value);
        break;
    }
    setAppliedKeys((prev) => new Set(prev).add(key));
  };

  return (
    <div className="border-t border-white/10 bg-[#0a0a0a]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-3 text-left hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-white/55" strokeWidth={2.2} />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-white/55" strokeWidth={2.2} />
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/65">
            Engineering Review · REQ-10
          </span>
          {review ? (
            <span
              className={[
                'font-mono text-[8.5px] uppercase tracking-[0.18em] px-1.5 py-0.5 border',
                review.source === 'claude'
                  ? 'border-gold/60 text-gold'
                  : 'border-white/20 text-white/55',
              ].join(' ')}
            >
              {review.source === 'claude' ? 'Claude' : 'Heuristic'}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!canReview) return;
            reviewMutation.mutate();
          }}
          disabled={!canReview || reviewMutation.isPending}
          className="border border-gold/40 bg-[#1a1408] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-gold hover:bg-[#231a0c] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {reviewMutation.isPending ? '검토 중…' : '검토 받기'}
        </button>
      </button>

      {open ? (
        <div className="px-6 pb-5">
          {!review && !reviewMutation.isPending ? (
            <p className="text-[11px] text-white/45">
              사양과 환경이 준비되면 [검토 받기] 버튼을 눌러 공학적 검토 의견을 받으십시오.
            </p>
          ) : null}

          {reviewMutation.isError ? (
            <div className="border border-[#E63950]/40 bg-[#1a0a0c] p-3 text-[11px] text-[#FF6B7A]">
              검토 요청 실패: {(reviewMutation.error as Error).message}
            </div>
          ) : null}

          {review ? (
            <>
              <div className="border-l-2 border-gold pl-3 py-1.5 mb-4">
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-gold/80">
                  진단 요약
                </span>
                <p className="mt-1 text-[12.5px] text-white leading-relaxed">{review.summary}</p>
              </div>

              {review.issues.length === 0 ? (
                <p className="text-[11px] text-white/55">
                  검토 결과 critical issue 없음 — 현재 사양은 안정 영역.
                </p>
              ) : (
                <ul className="space-y-3">
                  {review.issues.map((issue, idx) => (
                    <IssueCard
                      key={idx}
                      issue={issue}
                      issueIdx={idx}
                      appliedKeys={appliedKeys}
                      onApply={applyPatch}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function IssueCard({
  issue,
  issueIdx,
  appliedKeys,
  onApply,
}: {
  issue: ReviewIssue;
  issueIdx: number;
  appliedKeys: Set<string>;
  onApply: (key: string, patch: ReviewApplyPatch) => void;
}) {
  const style = SEVERITY_STYLE[issue.severity];
  const Icon = style.icon;
  return (
    <li className={['border-l-2 pl-3', style.border].join(' ')}>
      <div className="flex items-baseline gap-2">
        <Icon className={['h-3.5 w-3.5 shrink-0 self-center', style.text].join(' ')} strokeWidth={2.2} />
        <span className={['font-mono text-[9px] uppercase tracking-[0.22em]', style.text].join(' ')}>
          {style.label}
        </span>
        <h4 className="text-[12.5px] text-white">{issue.title}</h4>
      </div>
      <p className="mt-1 text-[11px] text-white/65 leading-relaxed">{issue.explanation}</p>
      {issue.recommendations.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {issue.recommendations.map((rec, ri) => (
            <RecRow
              key={ri}
              rec={rec}
              applyKey={`${issueIdx}-${ri}`}
              applied={appliedKeys.has(`${issueIdx}-${ri}`)}
              onApply={onApply}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function RecRow({
  rec,
  applyKey,
  applied,
  onApply,
}: {
  rec: ReviewRecommendation;
  applyKey: string;
  applied: boolean;
  onApply: (key: string, patch: ReviewApplyPatch) => void;
}) {
  return (
    <li className="flex items-start gap-2 border border-white/10 px-2.5 py-1.5">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white/85">{rec.action}</p>
        <p className="text-[10px] text-white/45 mt-0.5">→ {rec.expected_effect}</p>
      </div>
      {rec.apply ? (
        applied ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] flex items-center gap-1 text-gold shrink-0 px-1.5 py-0.5">
            <Check className="h-3 w-3" strokeWidth={2.2} /> 적용됨
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onApply(applyKey, rec.apply!)}
            className="font-mono text-[9px] uppercase tracking-[0.18em] border border-gold/50 bg-[#1a1408] px-2 py-0.5 text-gold hover:bg-[#231a0c] shrink-0 transition-colors"
          >
            이 권고 적용
          </button>
        )
      ) : (
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/30 shrink-0 px-1.5 py-0.5">
          수동
        </span>
      )}
    </li>
  );
}
