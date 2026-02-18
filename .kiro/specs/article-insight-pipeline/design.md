# 설계 문서: 기사 인사이트 파이프라인

## 개요

기사 인사이트 파이프라인은 3개의 분산된 기사 분석 페이지를 `/insight-pipeline` 하나로 통합한다. 두 가지 입력 모드(수동 붙여넣기, AI 기반 데이터 수집)를 탭으로 제공하며, 공통 InsightPanel을 통해 엔티티 추출·링킹·DB 저장을 수행한다.

핵심 설계 결정:
- 기존 백엔드 서비스(ArticleParser, EntityLinker, ArticleDBWriter)를 그대로 재사용
- ExternalAIAgent만 신규 서비스로 추가 (ChatGPT/Claude 듀얼 지원)
- 프론트엔드는 기존 컴포넌트를 재구성하여 통합 페이지 구축
- 기사 원문 저장 금지 정책을 AI 수집 모드에서 엄격히 적용

## 아키텍처

```mermaid
graph TB
    subgraph Frontend ["프론트엔드 (Next.js 14)"]
        PP[Pipeline_Page<br/>/insight-pipeline]
        MP[ManualPasteMode]
        AI[AIAgentMode]
        IP[InsightPanel]
        SB[Sidebar]
        
        PP --> MP
        PP --> AI
        PP --> IP
    end

    subgraph Backend ["백엔드 (Fastify)"]
        AR[/api/analysis/parse]
        LR[/api/analysis/link]
        SR[/api/analysis/save]
        AIS[/api/analysis/ai-search]
        
        APS[ArticleParserService]
        ELS[EntityLinkerService]
        DBW[ArticleDBWriterService]
        EAA[ExternalAIAgent<br/>신규]
    end

    subgraph DB ["PostgreSQL"]
        ART[(articles)]
        COM[(companies)]
        HR[(humanoidRobots)]
        CMP[(components)]
        KW[(keywords)]
    end

    MP -->|POST /parse| AR
    MP -->|POST /link| LR
    AI -->|POST /ai-search| AIS
    AI -->|POST /link| LR
    IP -->|POST /save| SR
    IP -->|POST /link/confirm| LR

    AR --> APS
    LR --> ELS
    SR --> DBW
    AIS --> EAA
    AIS --> APS
    AIS --> ELS

    ELS --> COM
    ELS --> HR
    ELS --> CMP
    ELS --> KW
    DBW --> ART
```

## 컴포넌트 및 인터페이스

### 1. Sidebar 수정

기존 `packages/frontend/src/components/layout/Sidebar.tsx`의 `navigationGroups` 배열을 수정한다.

변경 사항:
- 기사·이벤트 섹션: "기사 분석 도구", "기사 분석 파이프라인" 제거 → "기사 인사이트 파이프라인" (`/insight-pipeline`) 추가
- 리포트 섹션: "데이터 내보내기" 제거
- 관리 섹션: "데이터 수집" 제거

### 2. Pipeline_Page (메인 페이지)

경로: `packages/frontend/src/app/insight-pipeline/page.tsx`

```typescript
interface PipelinePageState {
  activeTab: 'manual' | 'ai-agent';
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  isSaving: boolean;
}
```

탭 전환 시 결과 패널은 유지하되, 입력 영역만 교체한다.

### 3. ManualPasteMode 컴포넌트

경로: `packages/frontend/src/components/insight-pipeline/ManualPasteMode.tsx`

```typescript
interface ManualPasteModeProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  isAnalyzing: boolean;
}

interface ManualPasteInput {
  title: string;
  rawText: string;
  options: ParseOptions;
}
```

처리 흐름: 텍스트 입력 → `POST /api/analysis/parse` → `POST /api/analysis/link` → InsightPanel에 결과 전달

### 4. AIAgentMode 컴포넌트

경로: `packages/frontend/src/components/insight-pipeline/AIAgentMode.tsx`

```typescript
interface AIAgentModeProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  isAnalyzing: boolean;
}

interface AIAgentInput {
  query: string;
  targetTypes: ('company' | 'product' | 'component' | 'application' | 'keyword')[];
  timeRange: { start: string; end: string };
  region: string;
  provider: 'chatgpt' | 'claude';
}
```

처리 흐름: 질의 입력 → `POST /api/analysis/ai-search` → (내부적으로 ArticleParser + EntityLinker) → InsightPanel에 결과 전달

### 5. InsightPanel 컴포넌트

경로: `packages/frontend/src/components/insight-pipeline/InsightPanel.tsx`

```typescript
interface InsightPanelProps {
  result: AnalysisResult | null;
  sourceType: 'manual' | 'ai-agent';
  onSave: (saveRequest: SaveRequest) => void;
  isSaving: boolean;
}

interface AnalysisResult {
  summary: string;
  entities: {
    companies: EntityItem[];
    products: EntityItem[];
    components: EntityItem[];
    applications: EntityItem[];
    keywords: KeywordItem[];
  };
  linkCandidates: Record<string, LinkCandidate[]>;
  sources?: SourceReference[];  // AI 모드에서만 사용
}

interface EntityItem {
  name: string;
  type: string;
  confidence: number;
  context: string;
  linkedEntityId?: string;  // 링킹 확정 시 설정
}

interface KeywordItem {
  term: string;
  relevance: number;
}

interface LinkCandidate {
  entityId: string;
  entityName: string;
  entityType: string;
  similarityScore: number;
  isAutoRecommended: boolean;
}

interface SourceReference {
  domain: string;
  title: string;
}
```

### 6. ExecutiveQuestions 컴포넌트

경로: `packages/frontend/src/components/insight-pipeline/ExecutiveQuestions.tsx`

```typescript
interface ExecutiveQuestionsProps {
  activeTab: 'manual' | 'ai-agent';
  onQuestionClick: (question: string) => void;
}
```

10개의 경영진 질문을 정적 데이터로 관리하며, AI 탭에서는 클릭 시 검색 입력 필드에 자동 입력한다.

### 7. ExternalAIAgent 백엔드 서비스

경로: `packages/backend/src/services/external-ai-agent.service.ts`

```typescript
interface AISearchRequest {
  query: string;
  targetTypes: string[];
  timeRange: { start: string; end: string };
  region: string;
  provider: 'chatgpt' | 'claude';
}

interface AISearchResponse {
  summary: string;
  facts: StructuredFact[];
  sources: SourceReference[];
}

interface StructuredFact {
  category: 'company' | 'product' | 'component' | 'application' | 'keyword';
  name: string;
  description: string;
  confidence: number;
}


class ExternalAIAgentService {
  async search(request: AISearchRequest): Promise<AISearchResponse>;
  private buildPrompt(request: AISearchRequest): string;
  private callOpenAI(prompt: string): Promise<string>;
  private callClaude(prompt: string): Promise<string>;
  private parseResponse(raw: string): AISearchResponse;
}
```

설계 결정:
- OpenAI와 Anthropic SDK를 각각 사용하여 provider별 분기
- 응답을 JSON 형식으로 강제하여 구조화된 팩트만 추출
- 기사 원문 텍스트는 프롬프트에서 명시적으로 제외 지시
- API 실패 시 1회 재시도 후 에러 반환

### 8. 리다이렉트 페이지

기존 3개 경로에 Next.js `redirect()` 사용:
- `packages/frontend/src/app/article-analyzer/page.tsx` → `/insight-pipeline`
- `packages/frontend/src/app/analysis/page.tsx` → `/insight-pipeline`
- `packages/frontend/src/app/analyze/page.tsx` → `/insight-pipeline`

### 9. 백엔드 API 라우트 확장

기존 `packages/backend/src/routes/analysis.ts`에 AI 검색 엔드포인트 추가:

```typescript
// POST /api/analysis/ai-search
fastify.post<{ Body: AISearchRequest }>('/ai-search', async (request, reply) => {
  // 1. ExternalAIAgent로 검색·요약
  // 2. 결과를 ArticleParser 형식으로 변환
  // 3. EntityLinker로 후보 검색
  // 4. 통합 결과 반환
});
```

## 데이터 모델

### 기존 모델 (변경 없음)

기존 DB 스키마의 `articles`, `companies`, `humanoidRobots`, `components`, `keywords` 테이블과 관계 테이블(`articleCompanies`, `articleRobotTags`, `articleComponents`, `articleApplications`, `articleKeywords`)을 그대로 사용한다.

### 프론트엔드 상태 모델

```typescript
// 파이프라인 페이지 전체 상태
interface PipelineState {
  activeTab: 'manual' | 'ai-agent';
  
  // ManualPasteMode 상태
  manualInput: {
    title: string;
    rawText: string;
    options: ParseOptions;
  };
  
  // AIAgentMode 상태
  aiInput: {
    query: string;
    targetTypes: string[];
    timeRange: { start: string; end: string };
    region: string;
    provider: 'chatgpt' | 'claude';
  };
  
  // 공통 결과 상태
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  error: string | null;
}
```

### ExternalAIAgent 응답 → ParseResult 변환

ExternalAIAgent의 `AISearchResponse`를 ArticleParser의 `ParseResult` 형식으로 변환하여 EntityLinker와의 호환성을 유지한다:

```typescript
function convertToParseResult(aiResponse: AISearchResponse): ParseResult {
  return {
    companies: aiResponse.facts
      .filter(f => f.category === 'company')
      .map(f => ({ name: f.name, type: 'company', confidence: f.confidence, context: f.description })),
    products: aiResponse.facts
      .filter(f => f.category === 'product')
      .map(f => ({ name: f.name, type: 'product', confidence: f.confidence, context: f.description })),
    components: aiResponse.facts
      .filter(f => f.category === 'component')
      .map(f => ({ name: f.name, type: 'component', confidence: f.confidence, context: f.description })),
    applications: aiResponse.facts
      .filter(f => f.category === 'application')
      .map(f => ({ name: f.name, type: 'application', confidence: f.confidence, context: f.description })),
    keywords: aiResponse.facts
      .filter(f => f.category === 'keyword')
      .map(f => ({ term: f.name, relevance: f.confidence })),
    summary: aiResponse.summary,
    detectedLanguage: 'ko',
  };
}
```

## 정확성 속성 (Correctness Properties)

*정확성 속성은 시스템의 모든 유효한 실행에서 참이어야 하는 특성 또는 동작이다. 속성은 사람이 읽을 수 있는 명세와 기계가 검증할 수 있는 정확성 보장 사이의 다리 역할을 한다.*


### Property 1: 분석 옵션에 따른 파싱 결과 필터링

*For any* 유효한 기사 텍스트(20자 이상)와 ParseOptions 조합에 대해, ArticleParser가 반환하는 결과에서 비활성화된 옵션의 카테고리는 빈 배열 또는 빈 문자열이어야 한다.

**Validates: Requirements 4.3**

### Property 2: 짧은 텍스트 입력 거부

*For any* 20자 미만의 문자열에 대해, ArticleParser.parse()는 에러를 발생시키고 ParseResult를 반환하지 않아야 한다.

**Validates: Requirements 4.6**

### Property 3: 기사 원문 미저장 정책

*For any* ExternalAIAgent 응답에 대해, 반환되는 AISearchResponse의 facts 배열에는 기사 원문 텍스트가 포함되지 않아야 하며, description 필드는 요약된 팩트만 포함해야 한다. 또한 저장 요청(ArticleSaveRequest)에도 원문 텍스트 필드가 존재하지 않아야 한다.

**Validates: Requirements 5.8, 7.7, 8.4**

### Property 4: AI 모델 프로바이더 라우팅

*For any* AISearchRequest에 대해, provider가 'chatgpt'이면 OpenAI API가 호출되고, provider가 'claude'이면 Anthropic API가 호출되어야 한다. 두 프로바이더가 동시에 호출되어서는 안 된다.

**Validates: Requirements 8.2, 8.3**

### Property 5: AISearchResponse → ParseResult 변환 정합성

*For any* 유효한 AISearchResponse에 대해, convertToParseResult 함수를 적용하면 모든 facts가 올바른 카테고리(companies, products, components, applications, keywords)로 분류되어야 하며, 원본 facts의 총 개수와 변환된 ParseResult의 모든 카테고리 항목 수의 합이 동일해야 한다.

**Validates: Requirements 8.7**

### Property 6: 엔티티 카테고리 분류 및 액션 버튼

*For any* AnalysisResult에 대해, InsightPanel은 엔티티를 정확히 5개 카테고리(회사/기관, 제품·로봇, 부품, 적용 사례, 키워드)로 분류해야 하며, 각 엔티티 항목에는 "DB에 추가"와 "기존 엔티티와 연결" 두 개의 액션이 제공되어야 한다.

**Validates: Requirements 7.2, 7.3**

### Property 7: AI 모드 출처 정보 표시 형식

*For any* AIAgentMode 결과의 SourceReference에 대해, 표시되는 출처 정보는 domain과 title 필드만 포함해야 하며, 원문 URL이나 본문 내용을 포함해서는 안 된다.

**Validates: Requirements 7.6**

### Property 8: 중복 기사 감지

*For any* 동일한 contentHash를 가진 두 개의 저장 요청에 대해, ArticleDBWriter는 첫 번째 요청만 성공하고 두 번째 요청은 isNew=false를 반환해야 한다.

**Validates: Requirements 9.1**

### Property 9: EntityLinker 유사도 점수 일관성

*For any* 두 문자열 a, b에 대해, EntityLinker.calculateSimilarity(a, b)는 0.0~1.0 범위의 값을 반환해야 하며, calculateSimilarity(a, a)는 항상 1.0을 반환해야 한다. 또한 calculateSimilarity(a, b) === calculateSimilarity(b, a)이어야 한다 (대칭성).

**Validates: Requirements 4.4, 5.6**

## 에러 처리

| 에러 상황 | 처리 방식 |
|-----------|----------|
| 입력 텍스트 20자 미만 | 프론트엔드에서 버튼 비활성화 + 백엔드에서 400 에러 반환 |
| OpenAI API 키 미설정 | ExternalAIAgent에서 명확한 에러 메시지 반환, 프론트엔드에서 토스트 알림 |
| Anthropic API 키 미설정 | 동일하게 에러 메시지 반환 |
| API 호출 실패 | 1회 재시도 후 실패 시 에러 메시지 반환 |
| 중복 기사 감지 | InsightPanel에 경고 배너 표시, 저장 버튼 비활성화 |
| EntityLinker DB 조회 실패 | 빈 후보 목록 반환, 수동 입력 허용 |
| 트랜잭션 저장 실패 | 전체 롤백, 에러 메시지 표시 |
| 네트워크 오류 | Tanstack Query의 자동 재시도 + 에러 상태 표시 |

## 테스트 전략

### 단위 테스트

- ExternalAIAgent의 프롬프트 빌드 로직
- convertToParseResult 변환 함수
- EntityLinker.calculateSimilarity 유사도 계산
- 프론트엔드 상태 관리 (탭 전환, 입력 검증)

### 속성 기반 테스트 (Property-Based Testing)

라이브러리: `fast-check` (이미 프로젝트에 설치됨)

각 속성 테스트는 최소 100회 반복 실행하며, 설계 문서의 Property 번호를 태그로 참조한다.

태그 형식: `Feature: article-insight-pipeline, Property {N}: {property_text}`

- Property 1: ParseOptions 필터링 검증
- Property 2: 짧은 텍스트 거부 검증
- Property 5: AISearchResponse → ParseResult 변환 정합성
- Property 8: 중복 기사 감지
- Property 9: EntityLinker 유사도 점수 일관성 (범위, 항등성, 대칭성)

### 통합 테스트

- 수동 모드 전체 파이프라인: 텍스트 입력 → 파싱 → 링킹 → 저장
- AI 모드 전체 파이프라인: 질의 → AI 검색 → 변환 → 링킹 → 저장
- 리다이렉트 동작 검증
- 사이드바 메뉴 구조 검증
