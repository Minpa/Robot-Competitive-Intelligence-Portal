/**
 * Scoring Rubric Provider — Static Rubric Definitions
 *
 * Provides static rubric definitions for PoC, RFM, and Positioning scoring criteria.
 * These are served via API and displayed on the dashboard for transparency.
 * Rubric definitions are maintained alongside calculation logic for consistency.
 *
 * Requirements: 5.28, 5.29, 5.30, 6.33, 6.34, 6.35
 */

// ============================================
// Interfaces
// ============================================

export interface RubricFactor {
  factorName: string;      // 팩터명 (Korean)
  factorKey: string;       // field name in DB
  dataSource: string;      // 데이터 소스 설명
  scoreRange: string;      // 점수 구간 설명
  formula: string;         // 계산 공식 설명
}

export interface PositioningRubric {
  chartType: string;
  chartName: string;       // Korean name
  xAxis: { label: string; source: string };
  yAxis: { label: string; source: string };
  bubbleSize: { label: string; source: string };
  colorGroup?: { label: string; source: string };
}

// ============================================
// PoC Rubric (6 Factors, 1–10 scale)
// ============================================

/**
 * Returns the PoC 6-Factor scoring rubric definitions.
 *
 * Requirements: 5.28, 6.33
 */
export function getPocRubric(): RubricFactor[] {
  return [
    {
      factorName: '페이로드',
      factorKey: 'payloadScore',
      dataSource: 'bodySpecs.payloadKg',
      scoreRange: '0kg → 1점, 20kg 이상 → 10점 (선형 스케일)',
      formula: 'linearScale(payloadKg, maxValue=20, maxScore=10). 값 미상 시 1점 (추정)',
    },
    {
      factorName: '운용시간',
      factorKey: 'operationTimeScore',
      dataSource: 'bodySpecs.operationTimeHours',
      scoreRange: '0시간 → 1점, 8시간 이상 → 10점 (선형 스케일)',
      formula: 'linearScale(operationTimeHours, maxValue=8, maxScore=10). 값 미상 시 1점 (추정)',
    },
    {
      factorName: '핑거 DoF',
      factorKey: 'fingerDofScore',
      dataSource: 'handSpecs.handDof',
      scoreRange: '0 DoF → 1점, 24 DoF 이상 → 10점 (선형 스케일)',
      formula: 'linearScale(handDof, maxValue=24, maxScore=10). 값 미상 시 1점 (추정)',
    },
    {
      factorName: '폼팩터',
      factorKey: 'formFactorScore',
      dataSource: 'bodySpecs + handSpecs + locomotionType',
      scoreRange: '1점 ~ 10점 (가중 복합 점수)',
      formula: '(높이 170cm 유사도 × 0.3) + (DoF/40 정규화 × 0.3) + (핑거수/5 정규화 × 0.2) + (이족보행 보너스 × 0.2), 1–10 스케일링',
    },
    {
      factorName: 'PoC 배포',
      factorKey: 'pocDeploymentScore',
      dataSource: 'applicationCases.deploymentStatus',
      scoreRange: '1점 ~ 10점 (사례별 점수 합산, 최대 10)',
      formula: 'concept=1점, pilot=3점, production=5점 합산. 빈 사례 시 1점 (추정)',
    },
    {
      factorName: '가성비',
      factorKey: 'costEfficiencyScore',
      dataSource: 'bodySpecs + estimatedPriceUsd',
      scoreRange: '1점 ~ 10점',
      formula: '(payloadKg × operationTimeHours) / estimatedPriceUsd 정규화 (기준: 0.02). 가격 미상 시 5점 (추정)',
    },
  ];
}

// ============================================
// RFM Rubric (6 Factors, 1–5 scale)
// ============================================

/**
 * Returns the RFM 6-Factor scoring rubric definitions.
 *
 * Requirements: 5.29, 6.34
 */
export function getRfmRubric(): RubricFactor[] {
  return [
    {
      factorName: '범용성',
      factorKey: 'generalityScore',
      dataSource: 'applicationCases.taskType',
      scoreRange: '고유 작업유형 1개 → 1점, 2개 → 2점, 3개 → 3점, 4개 → 4점, 5개 이상 → 5점',
      formula: '고유 taskType 수를 카운트하여 1–5 매핑. 빈 사례 시 1점 (추정)',
    },
    {
      factorName: '실세계 데이터',
      factorKey: 'realWorldDataScore',
      dataSource: '기사 키워드 분석 (real-world, field test, 현장, 시연 등)',
      scoreRange: '매칭 0개 → 1점, 1–2개 → 2점, 3–5개 → 3점, 6–10개 → 4점, 11개 이상 → 5점',
      formula: '기사 키워드에서 실세계 테스트 관련 키워드 매칭 수 기반 티어 매핑. 기사 없을 시 1점 (추정)',
    },
    {
      factorName: '엣지 추론',
      factorKey: 'edgeInferenceScore',
      dataSource: 'computingSpecs.topsMax',
      scoreRange: '0–10 TOPS → 1점, 11–50 → 2점, 51–200 → 3점, 201–500 → 4점, 501+ → 5점',
      formula: 'topsMax 값을 TOPS 구간별로 매핑. 값 미상 시 1점 (추정)',
    },
    {
      factorName: '다중 로봇 협업',
      factorKey: 'multiRobotCollabScore',
      dataSource: '기사 키워드 분석 (multi-robot, fleet, swarm, 협업 등)',
      scoreRange: '매칭 0개 → 1점, 1–2개 → 2점, 3–5개 → 3점, 6–10개 → 4점, 11개 이상 → 5점',
      formula: '기사 키워드에서 다중 로봇 협업 관련 키워드 매칭 수 기반 티어 매핑',
    },
    {
      factorName: '오픈소스',
      factorKey: 'openSourceScore',
      dataSource: '기사 키워드 분석 (open-source, sdk, github, ros, community 등)',
      scoreRange: '지표 0개 → 1점, 1개 → 2점, 2개 → 3점, 3개 → 4점, 4개 이상 → 5점',
      formula: '기사 키워드에서 오픈소스 관련 지표 수 기반 매핑',
    },
    {
      factorName: '상용화 성숙도',
      factorKey: 'commercialMaturityScore',
      dataSource: 'humanoidRobots.commercializationStage',
      scoreRange: 'concept → 1점, prototype → 2점, poc → 3점, pilot → 4점, commercial → 5점',
      formula: 'commercializationStage 카테고리 매핑. 값 미상 시 1점 (추정)',
    },
  ];
}

// ============================================
// Positioning Rubric (3 Chart Types)
// ============================================

/**
 * Returns the positioning chart rubric definitions for all 3 chart types.
 *
 * Requirements: 5.30, 6.35
 */
export function getPositioningRubric(): PositioningRubric[] {
  return [
    {
      chartType: 'rfm_competitiveness',
      chartName: 'RFM 경쟁력 포지셔닝',
      xAxis: {
        label: '엣지 추론 점수',
        source: 'rfmScores.edgeInferenceScore (1–5)',
      },
      yAxis: {
        label: '범용성 점수',
        source: 'rfmScores.generalityScore (1–5)',
      },
      bubbleSize: {
        label: '상용화 성숙도',
        source: 'rfmScores.commercialMaturityScore (1–5)',
      },
    },
    {
      chartType: 'poc_positioning',
      chartName: 'PoC 포지셔닝',
      xAxis: {
        label: '폼팩터 점수',
        source: 'pocScores.formFactorScore (1–10)',
      },
      yAxis: {
        label: '페이로드 × 운용시간 / 10',
        source: 'pocScores.payloadScore × pocScores.operationTimeScore / 10',
      },
      bubbleSize: {
        label: '핑거 DoF 점수',
        source: 'pocScores.fingerDofScore (1–10)',
      },
    },
    {
      chartType: 'soc_ecosystem',
      chartName: 'SoC 에코시스템 포지셔닝',
      xAxis: {
        label: '아키텍처 유형',
        source: 'computingSpecs.architectureType (onboard=1, edge=2, cloud=3, hybrid=4)',
      },
      yAxis: {
        label: 'TOPS',
        source: 'computingSpecs.topsMax',
      },
      bubbleSize: {
        label: '적용사례 수',
        source: 'applicationCases.length (최소 1)',
      },
      colorGroup: {
        label: '지역',
        source: 'humanoidRobots.region (north_america=blue, china=orange, korea=pink, europe=green, japan=purple, other=gray)',
      },
    },
  ];
}
