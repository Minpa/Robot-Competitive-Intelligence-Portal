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
  generalityScore: number;
  realWorldDataScore: number;
  edgeInferenceScore: number;
  multiRobotCollabScore: number;
  openSourceScore: number;
  commercialMaturityScore: number;
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
