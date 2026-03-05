// ── Dashboard ──

export interface DashboardSummary {
  lgPositioning: LgPositioning | null;
  recentAlerts: CompetitiveAlertRecord[];
  partnerSummary: PartnerSummaryItem[];
  topDomains: TopDomainItem[];
  goalStatus: GoalStatusSummary;
}

export interface LgPositioning {
  robotName: string;
  pocTotal: number;
  rfmTotal: number;
  combinedScore: number;
  overallRank: number;
  totalRobots: number;
  positioningData: PositioningPoint[];
}

export interface PositioningPoint {
  chartType: string;
  xValue: number;
  yValue: number;
  bubbleSize: number;
  colorGroup: string | null;
}

export interface CompetitiveAlertRecord {
  id: string;
  robotId: string | null;
  type: string;
  severity: string | null;
  title: string;
  summary: string | null;
  triggerData: Record<string, unknown> | null;
  isRead: boolean;
  readBy: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PartnerSummaryItem {
  category: string;
  count: number;
}

export interface TopDomainItem {
  name: string;
  lgReadiness: number;
  somBillionUsd: number;
  opportunity: number;
}

export interface GoalStatusSummary {
  achieved: number;
  on_track: number;
  at_risk: number;
  behind: number;
}

// ── Competitive Analysis ──

export interface GapAnalysisResult {
  factors: GapFactorItem[];
  lgRanking: LgRanking;
}

export interface GapFactorItem {
  factorName: string;
  factorType: 'poc' | 'rfm';
  lgValue: number;
  topCompetitorValue: number;
  topCompetitorName: string;
  gap: number;
  color: 'green' | 'red' | 'gray';
}

export interface LgRanking {
  pocRank: number;
  rfmRank: number;
  combinedRank: number;
  totalRobots: number;
}

export interface CompetitiveOverlayResult {
  lgData: OverlayRobotData | null;
  top5Data: OverlayRobotData[];
}

export interface OverlayRobotData {
  robotId: string;
  robotName: string;
  companyName: string;
  positioning: PositioningPoint[];
  pocScores: Record<string, number>;
  rfmScores: Record<string, number>;
  combinedScore: number;
}

// ── Score History ──

export interface ScoreHistoryEntry {
  robotId: string;
  snapshotMonth: string;
  pocScores: Record<string, number>;
  rfmScores: Record<string, number>;
  combinedScore: number;
}

// ── Partners ──

export interface Partner {
  id: string;
  name: string;
  category: string;
  subCategory: string | null;
  country: string | null;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  techCapability: number | null;
  lgCompatibility: number | null;
  marketShare: number | null;
}

// ── Application Domains ──

export interface ApplicationDomain {
  id: string;
  name: string;
  marketSizeBillionUsd: number | null;
  cagrPercent: number | null;
  somBillionUsd: number | null;
  keyTasks: string[];
  entryBarriers: string[];
  lgExistingBusiness: number | null;
  lgReadiness: number | null;
  description: string | null;
}

// ── What-If Scenarios ──

export interface WhatifScenario {
  id: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  baseRobotId: string | null;
  parameterOverrides: Record<string, unknown>;
  calculatedScores: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ── Strategic Goals ──

export interface StrategicGoal {
  id: string;
  title: string;
  description: string | null;
  metricType: string;
  targetValue: number;
  currentValue: number | null;
  deadline: string | null;
  status: string | null;
  requiredActions: string[];
  createdBy: string | null;
}

// ── Spec Change Logs ──

export interface SpecChangeLog {
  id: string;
  robotId: string;
  changedBy: string | null;
  fieldName: string;
  tableName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
}

// ── LG Robot (full specs) ──

export interface LgRobotWithSpecs {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  status: string | null;
  region: string | null;
  locomotionType: string | null;
  handType: string | null;
  commercializationStage: string | null;
  purpose: string | null;
  updatedAt: string;
  bodySpec: Record<string, unknown> | null;
  handSpec: Record<string, unknown> | null;
  computingSpec: Record<string, unknown> | null;
  sensorSpec: Record<string, unknown> | null;
  powerSpec: Record<string, unknown> | null;
}

// ── LG Robot list item (simpler) ──

export interface LgRobotListItem {
  id: string;
  name: string;
  companyName: string;
  status: string | null;
  heightCm: string | null;
  weightKg: string | null;
  payloadKg: string | null;
  dofCount: number | null;
}


// ── Partner Detail (extended) ──

export interface PartnerEvaluation {
  id: string;
  evaluatedBy: string | null;
  techScore: number;
  qualityScore: number;
  costScore: number;
  deliveryScore: number;
  supportScore: number;
  overallScore: string | null;
  comments: string | null;
  evaluatedAt: string;
}

export interface PartnerAdoption {
  id: string;
  robotId: string;
  robotName: string;
  adoptionStatus: string;
  adoptedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PartnerDetail extends Partner {
  evaluations: PartnerEvaluation[];
  adoptions: PartnerAdoption[];
}

// ── Adoption Matrix ──

export interface AdoptionMatrixEntry {
  id: string;
  partnerId: string;
  partnerName: string;
  robotId: string;
  robotName: string;
  adoptionStatus: string;
  adoptedAt: string | null;
  notes: string | null;
}

// ── Domain Robot Fit ──

export interface DomainRobotFitEntry {
  id: string;
  domainId: string;
  domainName: string;
  robotId: string;
  robotName: string;
  fitScore: number | null;
}
