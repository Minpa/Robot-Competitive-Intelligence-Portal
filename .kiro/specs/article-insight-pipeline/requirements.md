# 요구사항 문서

## 소개

기사 인사이트 파이프라인은 현재 3개의 분산된 기사 입력/분석 페이지(`/article-analyzer`, `/analysis`, `/analyze`)를 하나의 통합 페이지(`/insight-pipeline`)로 통합하는 기능이다. 두 가지 입력 모드(수동 붙여넣기, AI 기반 데이터 수집)를 탭으로 제공하며, 공통 인사이트 결과 패널을 통해 엔티티 추출·링킹·DB 저장을 수행한다. 사이드바 메뉴 구조도 함께 재편한다.

## 용어 정의

- **Pipeline_Page**: `/insight-pipeline` 경로의 통합 기사 인사이트 파이프라인 페이지
- **ManualPasteMode**: 기사 원문을 직접 붙여넣어 분석하는 탭 모드
- **AIAgentMode**: AI 에이전트가 검색·요약하여 구조화된 팩트를 반환하는 탭 모드
- **InsightPanel**: 두 탭 모두에서 공유하는 우측 분석 결과 패널
- **ArticleParser**: 기사 텍스트에서 엔티티/키워드/요약을 추출하는 기존 백엔드 서비스
- **EntityLinker**: 추출된 엔티티를 DB의 기존 엔티티와 fuzzy 매칭하는 기존 백엔드 서비스
- **ArticleDBWriter**: 기사 메타데이터와 엔티티 관계를 트랜잭션으로 DB에 저장하는 기존 백엔드 서비스
- **ExternalAIAgent**: ChatGPT/Claude API를 사용하여 외부 검색·요약을 수행하는 신규 백엔드 서비스
- **Sidebar**: 좌측 네비게이션 메뉴 컴포넌트
- **ExecutiveQuestion**: 경영진 대시보드의 10개 뷰에 대응하는 핵심 질문 목록
- **ParseOptions**: 분석 대상 토글 옵션 (회사, 제품·로봇, 부품, 적용 사례, 키워드, 요약)

## 요구사항

### 요구사항 1: 사이드바 메뉴 재구성

**사용자 스토리:** 사용자로서, 정리된 사이드바 메뉴를 통해 기사 분석 기능에 빠르게 접근하고 싶다.

#### 수용 기준

1. THE Sidebar SHALL 기사·이벤트 섹션에 "기사 인사이트 파이프라인" 항목을 `/insight-pipeline` 경로로 표시한다
2. THE Sidebar SHALL 기사·이벤트 섹션에 "엔티티 검토" 항목을 기존 `/review` 경로로 유지한다
3. THE Sidebar SHALL 기사·이벤트 섹션에서 기존 "기사 분석 도구", "기사 분석 파이프라인" 항목을 제거한다
4. THE Sidebar SHALL 리포트 섹션에 "경영진 대시보드", "월간 브리프", "PPT 리포트 빌더" 항목만 표시한다
5. THE Sidebar SHALL 리포트 섹션에서 "데이터 내보내기" 항목을 제거한다
6. THE Sidebar SHALL 관리 섹션에서 "데이터 수집" 항목을 제거한다

### 요구사항 2: 라우트 통합 및 리다이렉트

**사용자 스토리:** 사용자로서, 기존 URL로 접근해도 새 통합 페이지로 자동 이동되어 혼란 없이 사용하고 싶다.

#### 수용 기준

1. THE Pipeline_Page SHALL `/insight-pipeline` 경로에서 접근 가능하다
2. WHEN 사용자가 `/article-analyzer` 경로에 접근하면, THE Pipeline_Page SHALL `/insight-pipeline`으로 리다이렉트한다
3. WHEN 사용자가 `/analysis` 경로에 접근하면, THE Pipeline_Page SHALL `/insight-pipeline`으로 리다이렉트한다
4. WHEN 사용자가 `/analyze` 경로에 접근하면, THE Pipeline_Page SHALL `/insight-pipeline`으로 리다이렉트한다

### 요구사항 3: 통합 페이지 탭 구조

**사용자 스토리:** 사용자로서, 하나의 페이지에서 수동 입력과 AI 수집 모드를 탭으로 전환하며 사용하고 싶다.

#### 수용 기준

1. THE Pipeline_Page SHALL "기사 붙여넣기"와 "AI 기반 데이터 수집" 두 개의 탭을 상단에 표시한다
2. WHEN 사용자가 탭을 클릭하면, THE Pipeline_Page SHALL 해당 탭의 입력 모드로 전환한다
3. THE Pipeline_Page SHALL 좌측에 입력 영역, 우측에 InsightPanel을 배치하는 2컬럼 레이아웃을 사용한다

### 요구사항 4: 수동 붙여넣기 모드 (ManualPasteMode)

**사용자 스토리:** 사용자로서, 기사 원문을 붙여넣고 분석 옵션을 선택하여 엔티티를 추출하고 싶다.

#### 수용 기준

1. THE ManualPasteMode SHALL 기사 제목 입력 필드와 대형 텍스트 입력 영역을 제공한다
2. THE ManualPasteMode SHALL 분석 옵션 토글(회사, 제품·로봇, 부품, 적용 사례, 키워드, 요약)을 제공한다
3. WHEN 사용자가 분석 버튼을 클릭하면, THE ManualPasteMode SHALL ArticleParser를 호출하여 선택된 옵션에 따라 엔티티를 추출한다
4. WHEN ArticleParser가 결과를 반환하면, THE ManualPasteMode SHALL EntityLinker를 호출하여 DB 후보를 검색한다
5. WHEN 분석이 완료되면, THE ManualPasteMode SHALL InsightPanel에 구조화된 결과를 표시한다
6. IF 입력 텍스트가 20자 미만이면, THEN THE ManualPasteMode SHALL 분석을 거부하고 오류 메시지를 표시한다
7. WHEN "기사 붙여넣기" 탭이 선택되면, THE ManualPasteMode SHALL 탭 하단에 "이 기사에서 어떤 회사/제품/부품 정보를 추출할 수 있을까?" 안내 문구를 표시한다

### 요구사항 5: AI 기반 데이터 수집 모드 (AIAgentMode)

**사용자 스토리:** 사용자로서, 자연어 질문을 입력하면 AI가 여러 출처를 검색·요약하여 구조화된 인사이트를 제공받고 싶다.

#### 수용 기준

1. THE AIAgentMode SHALL 검색/질문 입력 필드를 상단에 제공한다
2. THE AIAgentMode SHALL 대상 유형 다중 선택(기업, 제품·로봇, 부품, 적용 사례, 키워드)을 제공한다
3. THE AIAgentMode SHALL 시간 범위 필터(예: 2025-2026)와 지역 필터(글로벌/특정 지역)를 제공한다
4. THE AIAgentMode SHALL AI 모델 선택(ChatGPT, Claude)을 제공한다
5. WHEN 사용자가 검색을 실행하면, THE AIAgentMode SHALL ExternalAIAgent를 호출하여 검색·요약을 수행한다
6. WHEN ExternalAIAgent가 결과를 반환하면, THE AIAgentMode SHALL ArticleParser와 EntityLinker를 통해 엔티티 메타데이터를 추출한다
7. WHEN 분석이 완료되면, THE AIAgentMode SHALL InsightPanel에 "여러 기사 요약" 형식으로 결과를 표시한다
8. THE AIAgentMode SHALL 기사 원문 텍스트를 저장하지 않고, 구조화된 팩트/메타데이터만 저장한다

### 요구사항 6: 경영진 질문 표시

**사용자 스토리:** 사용자로서, 경영진 대시보드의 핵심 질문을 참고하여 데이터 수집 방향을 잡고 싶다.

#### 수용 기준

1. WHEN "AI 기반 데이터 수집" 탭이 선택되면, THE Pipeline_Page SHALL 10개의 경영진 질문을 클릭 가능한 제안 목록으로 표시한다
2. WHEN 사용자가 경영진 질문을 클릭하면, THE AIAgentMode SHALL 해당 질문을 검색 입력 필드에 자동 입력한다
3. THE Pipeline_Page SHALL 경영진 질문 목록에 세그먼트 히트맵, 상용화 전환, 플레이어 확장, 가격·성능, 부품 채택, 키워드 포지션, 산업별 도입, 지역별 경쟁, 핵심 기술, Top 이벤트의 10개 질문을 포함한다

### 요구사항 7: 통합 인사이트 결과 패널 (InsightPanel)

**사용자 스토리:** 사용자로서, 입력 방식에 관계없이 동일한 구조의 결과 패널에서 추출된 엔티티를 확인하고 DB에 저장하고 싶다.

#### 수용 기준

1. THE InsightPanel SHALL 2~3줄의 핵심 요약을 한국어로 표시한다
2. THE InsightPanel SHALL 엔티티 그룹을 회사/기관, 제품·로봇, 부품, 적용 사례, 키워드 카테고리로 분류하여 표시한다
3. THE InsightPanel SHALL 각 엔티티 항목에 "DB에 추가" 버튼과 "기존 엔티티와 연결" 버튼을 제공한다
4. WHEN "기존 엔티티와 연결" 버튼을 클릭하면, THE InsightPanel SHALL EntityLinker의 자동 추천 후보를 표시한다
5. WHEN "DB에 추가" 버튼을 클릭하면, THE InsightPanel SHALL EntityLinker를 통해 신규 엔티티를 생성한다
6. WHEN AIAgentMode의 결과를 표시할 때, THE InsightPanel SHALL 출처 정보를 "참고 출처 요약 (도메인 + 제목)" 형태의 메모로만 표시한다
7. THE InsightPanel SHALL 원문 콘텐츠를 저장하지 않고 구조화된 메타데이터만 저장한다

### 요구사항 8: ExternalAIAgent 백엔드 서비스

**사용자 스토리:** 개발자로서, ChatGPT/Claude API를 통해 외부 검색·요약을 수행하는 백엔드 서비스를 사용하고 싶다.

#### 수용 기준

1. THE ExternalAIAgent SHALL 사용자 질의, 대상 유형, 시간 범위, 지역, AI 모델 선택을 입력으로 받는다
2. WHEN ChatGPT 모델이 선택되면, THE ExternalAIAgent SHALL OpenAI API(OPENAI_API_KEY)를 사용하여 검색·요약을 수행한다
3. WHEN Claude 모델이 선택되면, THE ExternalAIAgent SHALL Anthropic API(ANTHROPIC_API_KEY)를 사용하여 검색·요약을 수행한다
4. THE ExternalAIAgent SHALL 구조화된 팩트/메타데이터와 참고 출처 요약만 반환하고, 기사 원문 텍스트를 반환하지 않는다
5. IF API 키가 설정되지 않은 경우, THEN THE ExternalAIAgent SHALL 명확한 오류 메시지를 반환한다
6. IF API 호출이 실패하면, THEN THE ExternalAIAgent SHALL 1회 재시도 후 오류 메시지를 반환한다
7. THE ExternalAIAgent SHALL 응답을 ArticleParser의 ParseResult 형식과 호환되는 구조로 반환한다

### 요구사항 9: 기사 저장 및 중복 방지

**사용자 스토리:** 사용자로서, 분석된 기사를 DB에 저장할 때 중복을 방지하고 엔티티 관계를 함께 저장하고 싶다.

#### 수용 기준

1. WHEN 사용자가 저장을 요청하면, THE ArticleDBWriter SHALL content_hash를 기반으로 중복 여부를 확인한다
2. IF 중복 기사가 감지되면, THEN THE InsightPanel SHALL 중복 경고를 표시하고 저장을 방지한다
3. WHEN 저장이 실행되면, THE ArticleDBWriter SHALL 기사 메타데이터와 모든 엔티티 관계를 단일 트랜잭션으로 저장한다
4. WHEN 저장이 성공하면, THE InsightPanel SHALL 성공 메시지를 표시하고 입력 상태를 초기화한다

### 요구사항 10: 백엔드 API 라우트 통합

**사용자 스토리:** 개발자로서, 통합된 API 라우트를 통해 파이프라인의 모든 기능에 접근하고 싶다.

#### 수용 기준

1. THE Pipeline_Page SHALL `/api/analysis/parse` 엔드포인트를 통해 기사 파싱을 요청한다
2. THE Pipeline_Page SHALL `/api/analysis/link` 엔드포인트를 통해 엔티티 링킹을 요청한다
3. THE Pipeline_Page SHALL `/api/analysis/save` 엔드포인트를 통해 기사 저장을 요청한다
4. THE Pipeline_Page SHALL 신규 `/api/analysis/ai-search` 엔드포인트를 통해 AI 기반 검색·요약을 요청한다
5. WHEN ExternalAIAgent 결과를 처리할 때, THE Pipeline_Page SHALL 동일한 `/api/analysis/link` 엔드포인트를 재사용하여 엔티티 링킹을 수행한다
