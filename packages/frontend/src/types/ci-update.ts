// CI Competitor
export interface CiCompetitor {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
  country: string | null;
  stage: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

// CI Layer
export interface CiLayer {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sortOrder: number;
}

// CI Category
export interface CiCategory {
  id: string;
  layerId: string;
  name: string;
  sortOrder: number;
}

// CI Item
export interface CiItem {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
}

// CI Value
export interface CiValue {
  id: string;
  competitorId: string;
  itemId: string;
  value: string | null;
  confidence: string;
  source: string | null;
  sourceUrl: string | null;
  sourceDate: string | null;
  lastVerified: string | null;
  updatedAt: string;
}

// CI Value History entry
export interface CiValueHistoryEntry {
  id: string;
  valueId: string;
  oldValue: string | null;
  newValue: string | null;
  oldConfidence: string | null;
  newConfidence: string | null;
  changeSource: string;
  changeReason: string | null;
  changedAt: string;
  changedBy: string | null;
}

// Full matrix structure (from API)
export interface CiMatrixData {
  competitors: CiCompetitor[];
  layers: CiLayerWithData[];
}

export interface CiLayerWithData extends CiLayer {
  categories: CiCategoryWithData[];
}

export interface CiCategoryWithData extends CiCategory {
  items: CiItemWithValues[];
}

export interface CiItemWithValues extends CiItem {
  values: Record<string, CiValue>; // keyed by competitorId
}

// Freshness summary
export interface CiFreshnessSummary {
  id: string;
  layerId: string;
  layerName: string;
  layerIcon: string | null;
  competitorId: string;
  competitorName: string;
  lastVerified: string | null;
  nextReview: string | null;
  tier: number;
  daysSinceVerified: number | null;
  status: 'fresh' | 'warning' | 'stale';
}

// Staging entry
export interface CiStagingEntry {
  id: string;
  updateType: string;
  payload: Record<string, unknown>;
  sourceChannel: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  appliedAt: string | null;
}

// Monitor alert
export interface CiMonitorAlert {
  id: string;
  sourceName: string | null;
  sourceUrl: string | null;
  headline: string;
  summary: string | null;
  competitorId: string | null;
  layerId: string | null;
  detectedAt: string;
  status: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

// Inline edit request
export interface CiValueUpdateRequest {
  value?: string;
  confidence?: string;
  source?: string;
  sourceUrl?: string;
  sourceDate?: string;
  changedBy?: string;
}

// New competitor request
export interface CiNewCompetitorRequest {
  slug: string;
  name: string;
  manufacturer: string;
  country?: string;
  stage?: string;
}

// === Perfect Robot Benchmark ===

export interface BenchmarkAxis {
  id: string;
  key: string;
  icon: string | null;
  label: string;
  description: string | null;
  perfectDef: string | null;
  sortOrder: number;
}

export interface BenchmarkCompetitorData {
  id: string;
  slug: string;
  name: string;
  manufacturer: string;
  country: string | null;
  stage: string | null;
  scores: Record<string, { currentScore: number; targetScore: number; rationale?: string | null }>;
}

export interface BenchmarkData {
  axes: BenchmarkAxis[];
  competitors: BenchmarkCompetitorData[];
}
