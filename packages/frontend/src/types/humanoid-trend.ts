// ── Response DTOs ──

export interface PocScoreWithRobot {
  id: string;
  robotId: string;
  robotName: string;
  companyName: string;
  payloadScore: number;
  operationTimeScore: number;
  fingerDofScore: number;
  formFactorScore: number;
  pocDeploymentScore: number;
  costEfficiencyScore: number;
  averageScore: number;
  evaluatedAt: string;
}

export interface RfmScoreWithRobot {
  id: string;
  robotId: string;
  robotName: string;
  companyName: string;
  rfmModelName: string;
  architectureScore: number; // 모델 아키텍처 & 학습 역량
  dataScore: number; // 데이터/실세계 테스트
  inferenceScore: number; // 엣지 추론 & 하드웨어
  openSourceScore: number; // 오픈소스·생태계
  maturityScore: number; // 상용성 & 설명 가능성
  evaluatedAt: string;
}

export interface PositioningDataWithRobot {
  id: string;
  chartType: string;
  robotId: string | null;
  robotName: string | null;
  label: string;
  xValue: number;
  yValue: number;
  bubbleSize: number;
  colorGroup: string | null;
  metadata: Record<string, unknown> | null;
  evaluatedAt: string;
}

export interface BarSpecData {
  robotId: string;
  robotName: string;
  companyName: string;
  payloadKg: number | null;
  operationTimeHours: number | null;
  handDof: number | null;
  pocDeploymentScore: number | null;
}

// ── Input DTOs ──

export interface PocScoreDto {
  robotId: string;
  payloadScore: number;
  operationTimeScore: number;
  fingerDofScore: number;
  formFactorScore: number;
  pocDeploymentScore: number;
  costEfficiencyScore: number;
}

export interface RfmScoreDto {
  robotId: string;
  rfmModelName: string;
  generalityScore: number;
  realWorldDataScore: number;
  edgeInferenceScore: number;
  multiRobotCollabScore: number;
  openSourceScore: number;
  commercialMaturityScore: number;
}

export interface PositioningDataDto {
  chartType: 'rfm_competitiveness' | 'poc_positioning' | 'soc_ecosystem';
  robotId?: string;
  label: string;
  xValue: number;
  yValue: number;
  bubbleSize: number;
  colorGroup?: string;
  metadata?: Record<string, unknown>;
}
