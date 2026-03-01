// 기사 인사이트 파이프라인 공통 타입 정의

export interface AIAgentInput {
  query: string;
  targetTypes: string[];
  timeRange: { start: string; end: string };
  region: string;
  provider: 'chatgpt' | 'claude';
}

export interface EntityItem {
  name: string;
  type: string;
  confidence: number;
  context: string;
  linkedEntityId?: string;
}

export interface KeywordItem {
  term: string;
  relevance: number;
}

export interface LinkCandidate {
  entityId: string;
  entityName: string;
  entityType: string;
  similarityScore: number;
  isAutoRecommended: boolean;
  matchedVia: 'direct' | 'alias';
  aliasName?: string;
}

export interface SourceReference {
  domain: string;
  title: string;
}

export interface AnalysisResult {
  summary: string;
  entities: {
    companies: EntityItem[];
    products: EntityItem[];
    components: EntityItem[];
    applications: EntityItem[];
    keywords: KeywordItem[];
  };
  linkCandidates: Record<string, LinkCandidate[]>;
  sources?: SourceReference[];
}
