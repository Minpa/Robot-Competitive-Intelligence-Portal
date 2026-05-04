'use client';

/**
 * DerivedSpecCard — 활성 타겟에서 자동 도출된 최소 요구 스펙.
 *
 * 사용자 워크플로우:
 *   1. 시나리오/방 에디터에서 타겟·가구 배치
 *   2. 이 카드가 자동으로 "이 동작을 다 통과하려면 어떤 spec이 필요한지" 산출
 *   3. 현재 spec과 비교 → 갭이 보이면 권고된 값으로 spec 조정
 *
 * 개발팀 핸드오프 PDF의 spec 섹션도 이 데이터를 사용.
 */

import { useQuery } from '@tanstack/react-query';
import { useDesignerVacuumStore } from '../../stores/designer-vacuum-store';
import { designerVacuumApi } from '../../api/designer-vacuum-api';
import {
  analyzeIKReachability,
  deriveSpecFromResults,
  type DerivedSpec,
} from '../../lib/ik-reachability';

const ACCENT = '#D4A22F';
const RISK = '#D63F6F';
const PASS = '#3F8C6E';

export function DerivedSpecCard() {
  const targetsQ = useQuery({
    queryKey: ['vacuum-arm', 'target-objects'],
    queryFn: () => designerVacuumApi.listTargetObjects(),
    staleTime: 5 * 60_000,
  });
  const endEffectorsQ = useQuery({
    queryKey: ['vacuum-arm', 'end-effectors'],
    queryFn: () => designerVacuumApi.listEndEffectors(),
    staleTime: 5 * 60_000,
  });

  const product = useDesignerVacuumStore((s) => s.product);
  const room = useDesignerVacuumStore((s) => s.room);
  const payloadKg = useDesignerVacuumStore((s) => s.payloadKg);
  const robotXCm = useDesignerVacuumStore((s) => s.robotXCm);
  const robotYCm = useDesignerVacuumStore((s) => s.robotYCm);
  const robotYawDeg = useDesignerVacuumStore((s) => s.robotYawDeg);

  const arm = product.arms[0];
  if (!arm || room.targets.length === 0) {
    return (
      <div className="border-t border-designer-rule pt-6 mt-6 space-y-2">
        <SectionLabel>Derived Spec · 동작 → 스펙 도출</SectionLabel>
        <p className="text-[15px] text-designer-muted leading-relaxed">
          타겟을 추가하면 동작에서 자동으로 최소 요구 스펙이 도출됩니다.
        </p>
      </div>
    );
  }

  const ee = endEffectorsQ.data?.endEffectors.find((e) => e.sku === arm.endEffectorSku);
  const ikResults = analyzeIKReachability({
    base: product.base,
    arm,
    endEffector: ee,
    targets: room.targets,
    targetCatalog: targetsQ.data?.targetObjects ?? [],
    payloadKg,
    robotXCm,
    robotYCm,
    robotYawDeg,
    roomWidthCm: room.widthCm,
    roomDepthCm: room.depthCm,
  });

  const derived = deriveSpecFromResults(ikResults);

  const currentReachCm = (arm.upperArmLengthCm + arm.forearmLengthCm);
  const currentShoulderHeightCm =
    product.base.heightCm +
    arm.shoulderHeightAboveBaseCm +
    (product.base.hasLiftColumn ? product.base.liftColumnMaxExtensionCm : 0);
  const currentPayloadKg = ee?.maxPayloadKg ?? 1.0;

  const passRate = derived.totalTargets > 0 ? (derived.passedTargets / derived.totalTargets) * 100 : 0;
  const overallStatus =
    passRate === 100
      ? { label: 'PASS', color: PASS }
      : passRate >= 50
        ? { label: 'WARN', color: ACCENT }
        : { label: 'FAIL', color: RISK };

  return (
    <div className="border-t border-designer-rule pt-6 mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <SectionLabel>Derived Spec · 동작 → 스펙 도출</SectionLabel>
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 border font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{ borderColor: overallStatus.color, color: overallStatus.color }}
        >
          <span className="block h-1 w-1 rounded-full" style={{ background: overallStatus.color }} />
          {overallStatus.label} {derived.passedTargets}/{derived.totalTargets}
        </span>
      </div>
      <p className="text-[13px] text-designer-muted leading-relaxed">
        활성 타겟 {derived.totalTargets}개에서 자동 도출된 최소 요구 스펙. 이 값들을 만족하면
        모든 타겟에 도달 가능합니다.
      </p>

      <div className="grid grid-cols-1 gap-2">
        <SpecRow
          label="L1 + L2 (팔 총 reach)"
          unit="cm"
          current={currentReachCm}
          required={derived.minTotalReachCm}
          higherIsBetter
        />
        <SpecRow
          label="어깨 높이 (베이스 + lift)"
          unit="cm"
          current={currentShoulderHeightCm}
          required={derived.minShoulderHeightCm}
          higherIsBetter
        />
        <SpecRow
          label="EE max payload"
          unit="kg"
          current={currentPayloadKg}
          required={derived.minPayloadKg}
          higherIsBetter
          decimals={2}
        />
        {derived.recommendCenterMount ? (
          <div className="border-l-4 border-designer-accent bg-designer-surface-2 pl-3 py-1.5">
            <p className="text-[13px] text-designer-ink">
              <span className="font-mono font-semibold mr-1" style={{ color: ACCENT }}>WARN</span>
              여러 타겟이 robot yaw 회전을 요구함 — <strong>mount=center</strong> 권장 (현재{' '}
              {arm.mountPosition})
            </p>
          </div>
        ) : null}
      </div>

      {/* 실패 분류 요약 */}
      {derived.totalTargets - derived.passedTargets > 0 ? (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-designer-rule">
          {derived.failureCounts.OUT_OF_REACH > 0 ? (
            <FailureChip label="reach 부족" count={derived.failureCounts.OUT_OF_REACH} />
          ) : null}
          {derived.failureCounts.HEIGHT_ABOVE > 0 ? (
            <FailureChip label="어깨 낮음" count={derived.failureCounts.HEIGHT_ABOVE} />
          ) : null}
          {derived.failureCounts.YAW_REQUIRED > 0 ? (
            <FailureChip label="yaw 회전 필요" count={derived.failureCounts.YAW_REQUIRED} />
          ) : null}
          {derived.failureCounts.PAYLOAD_OVER_EE > 0 ? (
            <FailureChip label="payload 초과" count={derived.failureCounts.PAYLOAD_OVER_EE} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.14em] text-designer-muted">
      {children}
    </span>
  );
}

function SpecRow({
  label,
  unit,
  current,
  required,
  higherIsBetter,
  decimals = 0,
}: {
  label: string;
  unit: string;
  current: number;
  required: number;
  higherIsBetter: boolean;
  decimals?: number;
}) {
  const meets = higherIsBetter ? current >= required : current <= required;
  const color = meets ? PASS : RISK;
  const delta = required - current;
  const deltaSign = delta >= 0 ? '+' : '';

  return (
    <div className="flex items-center justify-between gap-3 border border-designer-rule bg-designer-card px-3 py-2">
      <span className="text-[13px] text-designer-ink">{label}</span>
      <div className="flex items-baseline gap-3 font-mono tabular-nums">
        <span className="text-[13px] text-designer-muted">
          현재 {current.toFixed(decimals)}{unit}
        </span>
        <span className="text-[13px] text-designer-muted">→</span>
        <span className="text-[15px] font-semibold" style={{ color }}>
          ≥{required.toFixed(decimals)}{unit}
        </span>
        {!meets ? (
          <span className="text-[12px] font-semibold" style={{ color: RISK }}>
            (Δ {deltaSign}
            {delta.toFixed(decimals)})
          </span>
        ) : null}
      </div>
    </div>
  );
}

function FailureChip({ label, count }: { label: string; count: number }) {
  return (
    <div className="border border-designer-risk/40 bg-designer-card px-2 py-1 flex items-center justify-between">
      <span className="text-[12px] text-designer-ink-2">{label}</span>
      <span className="font-mono text-[13px] font-semibold tabular-nums" style={{ color: RISK }}>
        {count}
      </span>
    </div>
  );
}
