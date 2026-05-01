/**
 * Review service · vacuum-arm REQ-10
 *
 * Generates an engineering review from a product spec + analysis result.
 * Two-tier strategy:
 *
 *   1. Heuristic — deterministic rule-based pass over the analysis data.
 *      Always available, used when ANTHROPIC_API_KEY is unset or Claude
 *      fails. Doubles as the unit-test target.
 *   2. Claude API — if available, called with a JSON-only prompt and the
 *      heuristic output as a fallback contract. We keep the heuristic
 *      always-on because the demo must work without network.
 *
 * Spec: docs/designer/SPEC.md §8 REQ-10.
 */

import Anthropic from '@anthropic-ai/sdk';
import { actuatorService } from '../actuator.service.js';
import type {
  ManipulatorArmSpec,
  ProductConfig,
  RoomConfig,
} from './types.js';
import type { ArmStaticsResult, PayloadCurvePoint } from './statics.service.js';
import type { StabilityResult } from './stability.service.js';
import type {
  TargetReachabilityResult,
  TraversabilityResult,
} from './reachability.service.js';

export type Severity = 'high' | 'medium' | 'low';

/**
 * Structured patch for one-click apply on the frontend. The frontend maps
 * `kind` to the appropriate Zustand setter. Keep the union narrow so the
 * UI doesn't need to grow a giant switch.
 */
export type ReviewApplyPatch =
  | { kind: 'base.weightKg'; value: number }
  | { kind: 'base.diameterOrWidthCm'; value: number }
  | { kind: 'base.hasLiftColumn'; value: boolean }
  | { kind: 'base.heightCm'; value: number }
  | { kind: 'arm.upperArmLengthCm'; armIndex: number; value: number }
  | { kind: 'arm.forearmLengthCm'; armIndex: number; value: number }
  | { kind: 'payloadKg'; value: number };

export interface ReviewRecommendation {
  action: string;
  expected_effect: string;
  apply?: ReviewApplyPatch;
}

export interface ReviewIssue {
  severity: Severity;
  title: string;
  explanation: string;
  recommendations: ReviewRecommendation[];
}

export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
  source: 'claude' | 'heuristic';
  generatedAt: string;
  isMock: boolean;
}

export interface AnalysisSnapshot {
  arms: Array<{
    armIndex: number;
    statics: ArmStaticsResult;
    payloadCurve: PayloadCurvePoint[];
    endEffectorMaxPayloadKg: number;
    endEffectorPayloadOverLimit: boolean;
  }>;
  stability: StabilityResult | null;
  environment: {
    targets: TargetReachabilityResult[];
    traversability: TraversabilityResult;
  } | null;
}

export interface ReviewInput {
  product: ProductConfig;
  room: RoomConfig | null;
  payloadKg: number;
  analysis: AnalysisSnapshot;
}

const SEVERITY_RANK: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

/** Public entry point. Tries Claude, always falls back to heuristic. */
export async function generateReview(input: ReviewInput): Promise<ReviewResult> {
  const heuristic = generateHeuristicReview(input);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return heuristic;

  try {
    const claude = await callClaude(input, apiKey);
    if (!claude) return heuristic;
    return claude;
  } catch (err) {
    console.warn('[designer/vacuum-arm/review] Claude API failed, using heuristic:', err);
    return heuristic;
  }
}

// ─── heuristic ────────────────────────────────────────────────────────────

/** Always-on heuristic review. Pure function, easy to unit test. */
export function generateHeuristicReview(input: ReviewInput): ReviewResult {
  const { product, payloadKg, analysis } = input;
  const issues: ReviewIssue[] = [];

  // 1. ZMP stability
  const zmp = analysis.stability;
  if (zmp && product.arms.length > 0) {
    if (!zmp.isStable) {
      const margin = zmp.marginToEdgeCm;
      issues.push({
        severity: 'high',
        title: 'ZMP가 풋프린트 밖 — 정적 전복 위험',
        explanation: `worst-case 자세에서 ZMP 마진 ${margin.toFixed(1)}cm로 음수. 베이스가 전방으로 넘어집니다.`,
        recommendations: buildZmpRecs(product, /*severe=*/ true),
      });
    } else if (zmp.marginToEdgeCm < 2.0) {
      issues.push({
        severity: 'medium',
        title: `ZMP 마진 부족 (${zmp.marginToEdgeCm.toFixed(1)}cm)`,
        explanation: `worst-case에서 ZMP가 풋프린트 가장자리에서 ${zmp.marginToEdgeCm.toFixed(1)}cm 안쪽. 권장 마진 ≥ 3cm.`,
        recommendations: buildZmpRecs(product, /*severe=*/ false),
      });
    }
  }

  // 2. Torque saturation per arm — uses peak torque margin (JointAnalysis.marginPct)
  product.arms.forEach((arm, idx) => {
    const a = analysis.arms[idx];
    if (!a) return;
    const sJoint = a.statics.joints.find((j) => j.jointName === 'shoulder');
    const eJoint = a.statics.joints.find((j) => j.jointName === 'elbow');
    if (sJoint && sJoint.overLimit) {
      const overPct = -sJoint.marginPct; // marginPct is negative when overLimit
      issues.push({
        severity: 'high',
        title: `팔 ${idx + 1} 어깨 액추에이터 토크 부족 (${overPct.toFixed(0)}% 초과)`,
        explanation: `요구 ${sJoint.requiredPeakTorqueNm.toFixed(1)}Nm, 피크 한계 ${sJoint.actuatorPeakTorqueNm.toFixed(1)}Nm. 지속 운용 시 발열/감속비 슬립.`,
        recommendations: buildTorqueRecs(arm, idx, payloadKg),
      });
    } else if (sJoint && sJoint.marginPct < 20) {
      issues.push({
        severity: 'medium',
        title: `팔 ${idx + 1} 어깨 액추에이터 마진 협소 (헤드룸 ${sJoint.marginPct.toFixed(0)}%)`,
        explanation: `요구 ${sJoint.requiredPeakTorqueNm.toFixed(1)}Nm가 피크 한계의 ${(100 - sJoint.marginPct).toFixed(0)}%. 안전 마진 ≥ 20% 권장.`,
        recommendations: buildTorqueRecs(arm, idx, payloadKg),
      });
    }
    if (eJoint && eJoint.overLimit) {
      const overPct = -eJoint.marginPct;
      issues.push({
        severity: 'high',
        title: `팔 ${idx + 1} 엘보 액추에이터 토크 부족 (${overPct.toFixed(0)}% 초과)`,
        explanation: `요구 ${eJoint.requiredPeakTorqueNm.toFixed(1)}Nm, 피크 한계 ${eJoint.actuatorPeakTorqueNm.toFixed(1)}Nm.`,
        recommendations: buildTorqueRecs(arm, idx, payloadKg),
      });
    }

    // End-effector payload limit
    if (a.endEffectorPayloadOverLimit) {
      issues.push({
        severity: 'medium',
        title: `팔 ${idx + 1} 엔드이펙터 페이로드 초과`,
        explanation: `현재 페이로드 ${payloadKg.toFixed(2)}kg가 EE 한계 ${a.endEffectorMaxPayloadKg.toFixed(2)}kg 초과.`,
        recommendations: [
          {
            action: `페이로드를 ${a.endEffectorMaxPayloadKg.toFixed(2)}kg 이하로 낮춤`,
            expected_effect: `EE 한계 내로 진입, 그립 안정성 확보`,
            apply: { kind: 'payloadKg', value: Math.max(0, a.endEffectorMaxPayloadKg - 0.05) },
          },
          {
            action: '더 큰 페이로드 등급의 엔드이펙터 SKU로 교체',
            expected_effect: '+0.5~1.0kg 헤드룸',
          },
        ],
      });
    }
  });

  // 3. Target reachability
  const env = analysis.environment;
  if (env && env.targets.length > 0) {
    const reached = env.targets.filter((t) => t.canReach).length;
    const reachPct = (reached / env.targets.length) * 100;
    if (reachPct < 100 && reachPct >= 50) {
      const failures = env.targets.filter((t) => !t.canReach);
      const reasons = countReasons(failures);
      issues.push({
        severity: reachPct < 70 ? 'high' : 'medium',
        title: `타겟 도달성 ${reachPct.toFixed(0)}% (${reached}/${env.targets.length})`,
        explanation: `미도달 ${failures.length}개. 주요 원인: ${reasons}. 사양·환경 매칭 재검토 필요.`,
        recommendations: buildReachRecs(product, failures, payloadKg),
      });
    } else if (reachPct < 50) {
      issues.push({
        severity: 'high',
        title: `타겟 도달성 심각 (${reachPct.toFixed(0)}%)`,
        explanation: `${env.targets.length}개 중 ${reached}개만 도달. 사양 자체가 환경과 불일치.`,
        recommendations: buildReachRecs(product, env.targets.filter((t) => !t.canReach), payloadKg),
      });
    }
  }

  // 4. Traversability
  if (env && env.traversability.coveragePct < 70 && env.traversability.coveragePct > 0) {
    issues.push({
      severity: env.traversability.coveragePct < 50 ? 'high' : 'medium',
      title: `통과 가능 영역 ${env.traversability.coveragePct.toFixed(0)}%`,
      explanation: `베이스 직경 ${product.base.diameterOrWidthCm.toFixed(0)}cm + 지상고 ${env.traversability.groundClearanceCm.toFixed(1)}cm로 ${env.traversability.blockedObstacleIndices.length}개 장애물에 막힘.`,
      recommendations: [
        {
          action: '베이스 지름을 5cm 줄여 통로 진입',
          expected_effect: `+10~15% 영역 확보, 좁은 가구 사이 진입 가능`,
          apply: {
            kind: 'base.diameterOrWidthCm',
            value: Math.max(25, product.base.diameterOrWidthCm - 5),
          },
        },
        {
          action: '리프트 컬럼 추가하여 낮은 장애물 회피 (단, 통과는 무관)',
          expected_effect: '높이 도달성 향상 (통과성과는 별개)',
        },
      ],
    });
  }

  // 5. Sort by severity
  issues.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);

  // Cap at 3 issues per spec ("가장 critical한 issue 3개 이내")
  const top = issues.slice(0, 3);
  const summary = synthesizeSummary(top, product, analysis);

  return {
    summary,
    issues: top,
    source: 'heuristic',
    generatedAt: new Date().toISOString(),
    isMock: true,
  };
}

function buildZmpRecs(product: ProductConfig, severe: boolean): ReviewRecommendation[] {
  const recs: ReviewRecommendation[] = [];
  const targetWeight = severe
    ? Math.min(8, product.base.weightKg + 1.5)
    : Math.min(8, product.base.weightKg + 0.8);
  recs.push({
    action: `베이스 무게를 ${targetWeight.toFixed(1)}kg로 증가`,
    expected_effect: `ZMP 마진 +${severe ? '2~3' : '1~1.5'}cm 확보, 정적 안정성 회복`,
    apply: { kind: 'base.weightKg', value: targetWeight },
  });
  // arms[0]를 기준으로 forearm 단축 권고
  const longestArm = product.arms.reduce<{ idx: number; len: number } | null>((best, a, i) => {
    const len = a.upperArmLengthCm + a.forearmLengthCm;
    if (!best || len > best.len) return { idx: i, len };
    return best;
  }, null);
  if (longestArm) {
    const arm = product.arms[longestArm.idx]!;
    const newForearm = Math.max(15, arm.forearmLengthCm - 5);
    recs.push({
      action: `팔 ${longestArm.idx + 1} 전완을 ${newForearm.toFixed(0)}cm로 단축`,
      expected_effect: `리치 -5cm 손실 vs ZMP 마진 +1~2cm`,
      apply: {
        kind: 'arm.forearmLengthCm',
        armIndex: longestArm.idx,
        value: newForearm,
      },
    });
  }
  recs.push({
    action: `베이스 지름을 ${Math.min(40, product.base.diameterOrWidthCm + 3).toFixed(0)}cm로 확장 (풋프린트 확장)`,
    expected_effect: `풋프린트 가장자리 +1.5cm, ZMP 허용 영역 확대`,
    apply: {
      kind: 'base.diameterOrWidthCm',
      value: Math.min(40, product.base.diameterOrWidthCm + 3),
    },
  });
  return recs;
}

function buildTorqueRecs(
  arm: ManipulatorArmSpec,
  armIndex: number,
  payloadKg: number
): ReviewRecommendation[] {
  const recs: ReviewRecommendation[] = [];
  // Suggest a higher-torque actuator from the catalog
  const allActs = actuatorService.list();
  const stronger = allActs
    .filter((a) => a.continuousTorqueNm > 8)
    .sort((a, b) => b.continuousTorqueNm - a.continuousTorqueNm)[0];
  if (stronger) {
    recs.push({
      action: `어깨 액추에이터를 ${stronger.sku} (${stronger.continuousTorqueNm.toFixed(1)}Nm continuous)로 교체`,
      expected_effect: `토크 헤드룸 +${(stronger.continuousTorqueNm - 6).toFixed(1)}Nm`,
    });
  }
  // Reduce reach
  const newL2 = Math.max(15, arm.forearmLengthCm - 5);
  recs.push({
    action: `팔 ${armIndex + 1} 전완을 ${newL2.toFixed(0)}cm로 단축`,
    expected_effect: `요구 토크 -15~25%, 리치 -5cm 손실`,
    apply: { kind: 'arm.forearmLengthCm', armIndex, value: newL2 },
  });
  if (payloadKg > 0.3) {
    const newPayload = Math.max(0, payloadKg - 0.2);
    recs.push({
      action: `페이로드를 ${newPayload.toFixed(2)}kg로 낮춤`,
      expected_effect: `요구 토크 -10~15%`,
      apply: { kind: 'payloadKg', value: newPayload },
    });
  }
  return recs;
}

function buildReachRecs(
  product: ProductConfig,
  failures: TargetReachabilityResult[],
  payloadKg: number
): ReviewRecommendation[] {
  const recs: ReviewRecommendation[] = [];
  const reasons = new Set(failures.map((f) => f.reason));
  if (reasons.has('HEIGHT_OUT_OF_REACH')) {
    if (!product.base.hasLiftColumn) {
      recs.push({
        action: '리프트 컬럼 추가 (스트로크 20cm)',
        expected_effect: '도달 높이 +20cm, 싱크 카운터/식탁 도달',
        apply: { kind: 'base.hasLiftColumn', value: true },
      });
    }
    let longestArmIdx = -1;
    let longestArmReach = 0;
    product.arms.forEach((a, i) => {
      const reach = a.upperArmLengthCm + a.forearmLengthCm;
      if (reach > longestArmReach) {
        longestArmIdx = i;
        longestArmReach = reach;
      }
    });
    const arm = longestArmIdx >= 0 ? product.arms[longestArmIdx] : undefined;
    if (arm) {
      const newL1 = Math.min(40, arm.upperArmLengthCm + 5);
      recs.push({
        action: `팔 ${longestArmIdx + 1} 상완을 ${newL1.toFixed(0)}cm로 연장`,
        expected_effect: '리치 +5cm, 도달 높이 +5cm',
        apply: { kind: 'arm.upperArmLengthCm', armIndex: longestArmIdx, value: newL1 },
      });
    }
  }
  if (reasons.has('PAYLOAD_LIMIT') || reasons.has('TORQUE_LIMIT')) {
    if (payloadKg > 0.2) {
      recs.push({
        action: `페이로드를 ${Math.max(0, payloadKg - 0.1).toFixed(2)}kg로 낮춤`,
        expected_effect: '토크/페이로드 마진 회복',
        apply: { kind: 'payloadKg', value: Math.max(0, payloadKg - 0.1) },
      });
    }
  }
  if (reasons.has('BASE_BLOCKED')) {
    recs.push({
      action: `베이스 지름을 ${Math.max(25, product.base.diameterOrWidthCm - 5).toFixed(0)}cm로 축소`,
      expected_effect: '좁은 가구 사이 진입 가능, 도달 가능 베이스 위치 ↑',
      apply: {
        kind: 'base.diameterOrWidthCm',
        value: Math.max(25, product.base.diameterOrWidthCm - 5),
      },
    });
  }
  return recs;
}

function countReasons(failures: TargetReachabilityResult[]): string {
  const counts = new Map<string, number>();
  for (const f of failures) counts.set(f.reason, (counts.get(f.reason) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}×${v}`)
    .join(', ');
}

function synthesizeSummary(
  issues: ReviewIssue[],
  product: ProductConfig,
  analysis: AnalysisSnapshot
): string {
  if (issues.length === 0) {
    const armCount = product.arms.length;
    if (armCount === 0) {
      return '팔 미장착 베이스. 본 도구는 팔 장착 시 공학적 분석을 수행합니다.';
    }
    const zmpStr = analysis.stability
      ? `ZMP 마진 ${analysis.stability.marginToEdgeCm.toFixed(1)}cm`
      : 'ZMP 미산출';
    return `현재 사양은 안정 영역 — ${zmpStr}, 토크/페이로드 마진 충분. 추가 권고 없음.`;
  }
  const high = issues.filter((i) => i.severity === 'high').length;
  const med = issues.filter((i) => i.severity === 'medium').length;
  const headline = issues[0]?.title ?? '';
  if (high > 0) {
    return `심각 ${high}건${med > 0 ? `·중간 ${med}건` : ''} — ${headline}. 머지 전 해결 필요.`;
  }
  return `중간 위험 ${med}건 — ${headline}. 권고 적용 시 시연 가능 수준.`;
}

// ─── Claude API ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 로봇 제품 사양 검토자입니다.
사용자가 제출한 제품 사양과 환경에서의 공학적 분석 결과를 보고,
한국어로 간결하게 사양상의 약점과 개선 권고를 제시합니다.

응답 형식 (JSON만, 다른 텍스트 금지):
{
  "summary": "1-2문장 핵심 진단",
  "issues": [
    {
      "severity": "high|medium|low",
      "title": "문제 제목",
      "explanation": "왜 문제인지 (수치 포함, 1-2문장)",
      "recommendations": [
        {"action": "권고 1", "expected_effect": "예상 효과 (수치)"}
      ]
    }
  ]
}

원칙:
- 수치 필수 ("18% 부족", "ZMP 마진 1.2cm")
- 가장 critical한 issue 3개 이내
- 추측 금지, analysis 데이터 근거
- 톤: 정중하나 단호하게 (검토자 톤, "함께 살펴보면 좋을 것 같습니다" 같은 모호한 표현 금지)`;

async function callClaude(input: ReviewInput, apiKey: string): Promise<ReviewResult | null> {
  const client = new Anthropic({ apiKey });
  const userPayload = compactInputForClaude(input);

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `다음 분석 데이터를 바탕으로 검토 의견을 JSON으로만 응답하십시오.\n\n${JSON.stringify(userPayload, null, 2)}`,
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return null;
  const parsed = parseClaudeJson(textBlock.text);
  if (!parsed) return null;

  return {
    summary: parsed.summary,
    issues: parsed.issues.slice(0, 3),
    source: 'claude',
    generatedAt: new Date().toISOString(),
    isMock: true,
  };
}

function compactInputForClaude(input: ReviewInput): unknown {
  const { product, room, payloadKg, analysis } = input;
  return {
    product: {
      name: product.name,
      base: product.base,
      arms: product.arms.map((a, i) => ({ index: i, ...a })),
    },
    payloadKg,
    room: room
      ? {
          widthCm: room.widthCm,
          depthCm: room.depthCm,
          targetCount: room.targets.length,
          obstacleCount: room.obstacles.length,
          furnitureCount: room.furniture.length,
        }
      : null,
    analysis: {
      stability: analysis.stability
        ? {
            isStable: analysis.stability.isStable,
            marginToEdgeCm: analysis.stability.marginToEdgeCm,
          }
        : null,
      arms: analysis.arms.map((a) => ({
        index: a.armIndex,
        joints: a.statics.joints.map((j) => ({
          joint: j.jointName,
          requiredPeakTorqueNm: j.requiredPeakTorqueNm,
          actuatorPeakTorqueNm: j.actuatorPeakTorqueNm,
          marginPct: j.marginPct,
          overLimit: j.overLimit,
        })),
        endEffectorMaxPayloadKg: a.endEffectorMaxPayloadKg,
        endEffectorPayloadOverLimit: a.endEffectorPayloadOverLimit,
      })),
      environment: analysis.environment
        ? {
            targetReachPct:
              (analysis.environment.targets.filter((t) => t.canReach).length /
                Math.max(1, analysis.environment.targets.length)) *
              100,
            failureReasons: countReasons(
              analysis.environment.targets.filter((t) => !t.canReach)
            ),
            traversabilityPct: analysis.environment.traversability.coveragePct,
          }
        : null,
    },
  };
}

interface ClaudeReviewShape {
  summary: string;
  issues: ReviewIssue[];
}

function parseClaudeJson(raw: string): ClaudeReviewShape | null {
  // Claude sometimes wraps JSON in ```json ... ``` blocks
  const fenced = raw.match(/```(?:json)?\s*([\s\S]+?)```/);
  const candidate = (fenced && fenced[1]) ? fenced[1] : raw;
  // Find the first { and last } as a fallback
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  const slice = candidate.slice(start, end + 1);
  try {
    const obj = JSON.parse(slice) as Partial<ClaudeReviewShape>;
    if (!obj || typeof obj.summary !== 'string' || !Array.isArray(obj.issues)) {
      return null;
    }
    // Validate severity values, drop broken entries
    const cleaned = obj.issues
      .filter((i): i is ReviewIssue => {
        if (!i || typeof i !== 'object') return false;
        const issue = i as ReviewIssue;
        return (
          (issue.severity === 'high' ||
            issue.severity === 'medium' ||
            issue.severity === 'low') &&
          typeof issue.title === 'string' &&
          typeof issue.explanation === 'string' &&
          Array.isArray(issue.recommendations)
        );
      })
      .map((i) => ({
        ...i,
        recommendations: i.recommendations.filter(
          (r) => r && typeof r.action === 'string' && typeof r.expected_effect === 'string'
        ),
      }));
    return { summary: obj.summary, issues: cleaned };
  } catch {
    return null;
  }
}

export const reviewService = {
  generate: generateReview,
  generateHeuristic: generateHeuristicReview,
};
