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

const SEVERITY_STYLE: Record<Severity, { border: string; text: string; icon: typeof AlertCircle; label: string }> = {
  high: {
    border: 'border-designer-risk',
    text: 'text-designer-risk',
    icon: AlertCircle,
    label: 'HIGH',
  },
  medium: {
    border: 'border-designer-accent',
    text: 'text-designer-accent',
    icon: AlertTriangle,
    label: 'MEDIUM',
  },
  low: {
    border: 'border-designer-muted',
    text: 'text-designer-muted',
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
    <div className="border-t border-designer-rule bg-designer-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-3 text-left hover:bg-designer-surface-2"
      >
        <span className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-designer-muted" strokeWidth={2.2} />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-designer-muted" strokeWidth={2.2} />
          )}
          <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
            Engineering Review · REQ-10
          </span>
          {review ? (
            <span
              className={[
                'font-mono text-[11px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 border',
                review.source === 'claude'
                  ? 'border-designer-accent text-designer-accent'
                  : 'border-designer-rule text-designer-muted',
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
          className="bg-designer-ink px-3 py-1.5 font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-designer-ink-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {reviewMutation.isPending ? '검토 중…' : '검토 받기'}
        </button>
      </button>

      {open ? (
        <div className="px-6 pb-5">
          {!review && !reviewMutation.isPending ? (
            <p className="text-[15px] text-designer-muted">
              사양과 환경이 준비되면 [검토 받기] 버튼을 눌러 공학적 검토 의견을 받으십시오.
            </p>
          ) : null}

          {reviewMutation.isError ? (
            <div className="border-l-4 border-designer-risk bg-designer-card pl-3 py-2 text-[15px] text-designer-risk">
              검토 요청 실패: {(reviewMutation.error as Error).message}
            </div>
          ) : null}

          {review ? (
            <>
              <div className="border-l-4 border-designer-accent pl-4 py-2 mb-4">
                <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
                  진단 요약
                </span>
                <p className="mt-1.5 text-[17px] text-designer-ink leading-relaxed">{review.summary}</p>
              </div>

              {review.issues.length === 0 ? (
                <p className="text-[15px] text-designer-muted">
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
    <li className={['border-l-4 pl-4 py-2 bg-designer-card', style.border].join(' ')}>
      <div className="flex items-baseline gap-2">
        <Icon className={['h-4 w-4 shrink-0 self-center', style.text].join(' ')} strokeWidth={2.2} />
        <span className={['font-mono text-[13px] font-semibold uppercase tracking-[0.14em]', style.text].join(' ')}>
          {style.label}
        </span>
        <h4 className="text-[17px] font-medium text-designer-ink">{issue.title}</h4>
      </div>
      <p className="mt-1.5 text-[15px] text-designer-ink-2 leading-relaxed">{issue.explanation}</p>
      {issue.recommendations.length > 0 ? (
        <ul className="mt-3 space-y-2">
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
    <li className="flex items-start gap-3 border border-designer-rule bg-designer-surface-2 px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-designer-ink">{rec.action}</p>
        <p className="text-[13px] text-designer-muted mt-1">→ {rec.expected_effect}</p>
      </div>
      {rec.apply ? (
        applied ? (
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] flex items-center gap-1 text-designer-pass shrink-0 px-2 py-1">
            <Check className="h-3.5 w-3.5" strokeWidth={2.2} /> 적용됨
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onApply(applyKey, rec.apply!)}
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] bg-designer-accent px-2.5 py-1 text-designer-ink hover:bg-designer-accent/90 shrink-0 transition-colors"
          >
            이 권고 적용
          </button>
        )
      ) : (
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-designer-muted shrink-0 px-2 py-1">
          수동
        </span>
      )}
    </li>
  );
}
