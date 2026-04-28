/**
 * Coaching service · REQ-6
 *
 * Two-path design:
 *   1. Primary: Claude API (claude-opus-4-7) with structured-JSON output.
 *   2. Fallback: deterministic rule-based diagnostic generator. Used when:
 *      - ANTHROPIC_API_KEY is missing
 *      - the API call throws or times out
 *      - the response can't be parsed as our schema
 *
 * The fallback is intentionally helpful — it inspects the evaluation result
 * and produces real, evidence-backed issues so the UI never shows "[no
 * coaching available]".
 */

import Anthropic from '@anthropic-ai/sdk';
import type { CoachingResponse, CoachingIssue, EvaluationResult } from './types.js';

const SYSTEM_PROMPT = `당신은 휴머노이드 로봇 설계 코치입니다. 사용자가 설계한 로봇 구성과 공학적 평가 결과를 보고, 한국어로 간결하게 실패모드와 개선안을 제시합니다.

응답은 반드시 다음 JSON 스키마를 따라야 합니다:
{
  "summary": "1~2문장 핵심 진단 (수치 포함)",
  "issues": [
    {
      "severity": "high|medium|low",
      "title": "문제 제목 (한 줄)",
      "explanation": "왜 문제인지 (수치 포함, 1~2문장)",
      "recommendations": ["권장사항 1", "권장사항 2"],
      "relatedId": "선택사항 — 관련 관절 또는 컴포넌트 id"
    }
  ]
}

원칙:
- 수치를 반드시 포함 ("18% 부족", "0.45m² 사각지대")
- 가장 critical한 issue 3개 이내
- 추측하지 말고 evaluation 데이터에 근거할 것
- 마크다운 코드 블록 없이 raw JSON만 반환`;

const MODEL = 'claude-opus-4-7';

class CoachingService {
  async coach(evaluation: EvaluationResult, language = 'ko'): Promise<CoachingResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return this.fallback(evaluation, 'ANTHROPIC_API_KEY missing');
    }

    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Language: ${language}\n\nEvaluation result:\n${JSON.stringify(evaluation, null, 2)}\n\n위 평가 결과를 분석해 JSON으로 응답하세요.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        return this.fallback(evaluation, 'no text block in response');
      }

      const cleaned = stripCodeFence(textBlock.text);
      const parsed = JSON.parse(cleaned) as { summary: string; issues: CoachingIssue[] };

      return {
        summary: parsed.summary,
        issues: parsed.issues.slice(0, 3),
        modelUsed: MODEL,
        isFallback: false,
        isMock: true,
      };
    } catch (err) {
      return this.fallback(
        evaluation,
        err instanceof Error ? err.message : 'unknown coaching error'
      );
    }
  }

  /**
   * Deterministic diagnostic generator. Inspects the evaluation and produces
   * issues based on torque headroom, payload margin, and FoV blind spots.
   */
  fallback(evaluation: EvaluationResult, reason: string): CoachingResponse {
    const issues: CoachingIssue[] = [];

    // ── Torque heuristic: highlight the joint with highest torque relative to peer median.
    const sortedTorques = [...evaluation.jointTorques].sort(
      (a, b) => b.requiredPeakTorqueNm - a.requiredPeakTorqueNm
    );
    const top = sortedTorques[0];
    const medianEntry = sortedTorques[Math.floor(sortedTorques.length / 2)];
    if (top && medianEntry) {
      const median = medianEntry.requiredPeakTorqueNm || 0.01;
      const ratio = top.requiredPeakTorqueNm / median;
      if (ratio > 2) {
        issues.push({
          severity: 'high',
          title: `${top.jointId} 토크 집중`,
          explanation: `${top.jointId} 관절의 요구 토크 ${top.requiredPeakTorqueNm.toFixed(1)} Nm는 다른 관절 중앙값의 ${ratio.toFixed(1)}배입니다. 단일 실패점이 됩니다.`,
          recommendations: [
            '해당 링크 길이를 0.85배로 축소해 모멘트를 줄이세요',
            'Tmotor-Mock AK10-9 또는 Unitree-Mock B1 hip 같은 고토크 액추에이터로 업그레이드하세요',
          ],
          relatedId: top.jointId,
        });
      }
    }

    // ── Payload margin
    const margin = evaluation.payloadLimit.payloadLimitKg - evaluation.payloadKg;
    if (margin < 1) {
      issues.push({
        severity: margin < 0 ? 'high' : 'medium',
        title: `페이로드 한계 여유 ${margin.toFixed(1)}kg`,
        explanation: `요청 페이로드 ${evaluation.payloadKg}kg 대비 한계 ${evaluation.payloadLimit.payloadLimitKg}kg (${evaluation.payloadLimit.limitingJointId} 관절 기준). 안전계수 ${evaluation.payloadLimit.safetyFactor}× 적용.`,
        recommendations: [
          `${evaluation.payloadLimit.limitingJointId}의 액추에이터 등급을 1단계 상향하세요`,
          '워크플로 설계 시 최대 페이로드를 한계의 70% 이하로 제한하세요',
        ],
        relatedId: evaluation.payloadLimit.limitingJointId,
      });
    }

    // ── FoV blind spot
    if (evaluation.fovCoverage && evaluation.fovCoverage.blindSpotAreaM2 > 1.0) {
      issues.push({
        severity: 'medium',
        title: '카메라 사각지대',
        explanation: `1m 반경 디스크에서 ${evaluation.fovCoverage.blindSpotAreaM2.toFixed(2)}m² 사각지대 (수평 커버리지 ${(evaluation.fovCoverage.horizontalCoverageRatio * 100).toFixed(0)}%).`,
        recommendations: [
          '가슴 위치 RGB-D 센서를 추가하세요',
          '광각(110° 이상) 스테레오 카메라로 교체를 검토하세요',
        ],
      });
    }

    // ── Default: all-good summary
    if (issues.length === 0) {
      issues.push({
        severity: 'low',
        title: '주요 한계 미발견',
        explanation: `현재 구성에서 토크·페이로드·FoV 모두 안전 마진을 확보했습니다. 페이로드 한계 ${evaluation.payloadLimit.payloadLimitKg}kg.`,
        recommendations: ['실 시나리오 데이터로 페이로드 분포를 확인해 마진을 재검토하세요'],
      });
    }

    const topSeverity = issues.find((i) => i.severity === 'high') ?? issues[0]!;
    const summary = `${topSeverity.title} — ${topSeverity.explanation.split(/[.。]/)[0]} (rule-based fallback: ${reason}).`;

    return {
      summary,
      issues: issues.slice(0, 3),
      modelUsed: 'rule-based-fallback',
      isFallback: true,
      isMock: true,
    };
  }
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();
  }
  return trimmed;
}

export const coachingService = new CoachingService();
