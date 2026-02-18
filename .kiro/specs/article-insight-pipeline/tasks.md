# Implementation Plan: 기사 인사이트 파이프라인

## 개요

3개의 분산된 기사 분석 페이지를 `/insight-pipeline`으로 통합하고, ExternalAIAgent 서비스를 신규 생성하며, 사이드바 메뉴를 재구성한다. 기존 백엔드 서비스(ArticleParser, EntityLinker, ArticleDBWriter)를 재사용한다.

## Tasks

- [x] 1. 사이드바 메뉴 재구성 및 라우트 리다이렉트 설정
  - [x] 1.1 Sidebar 컴포넌트의 navigationGroups 수정
    - `packages/frontend/src/components/layout/Sidebar.tsx`의 navigationGroups 배열 수정
    - 기사·이벤트 섹션: "기사 분석 도구", "기사 분석 파이프라인" 제거 → "기사 인사이트 파이프라인" (`/insight-pipeline`, FlaskConical 아이콘) 추가
    - 리포트 섹션: "데이터 내보내기" 항목 제거
    - 관리 섹션: "데이터 수집" 항목 제거
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 1.2 기존 3개 페이지에 리다이렉트 설정
    - `packages/frontend/src/app/article-analyzer/page.tsx` → `redirect('/insight-pipeline')` 으로 교체
    - `packages/frontend/src/app/analysis/page.tsx` → `redirect('/insight-pipeline')` 으로 교체
    - `packages/frontend/src/app/analyze/page.tsx` → `redirect('/insight-pipeline')` 으로 교체
    - Next.js의 `redirect()` 함수 사용 (서버 컴포넌트)
    - _Requirements: 2.2, 2.3, 2.4_

- [x] 2. ExternalAIAgent 백엔드 서비스 생성
  - [x] 2.1 ExternalAIAgent 서비스 구현
    - `packages/backend/src/services/external-ai-agent.service.ts` 생성
    - AISearchRequest, AISearchResponse, StructuredFact 인터페이스 정의
    - OpenAI API 호출 (provider='chatgpt') 구현
    - Anthropic API 호출 (provider='claude') 구현 (@anthropic-ai/sdk 사용)
    - 프롬프트에 "기사 원문 텍스트 반환 금지, 구조화된 팩트만 반환" 지시 포함
    - JSON 응답 파싱 및 AISearchResponse 변환
    - API 키 미설정 시 명확한 에러 메시지 반환
    - API 실패 시 1회 재시도 로직
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 2.2 convertToParseResult 변환 함수 구현
    - AISearchResponse → ParseResult 변환 함수를 같은 파일에 export
    - facts 배열을 category별로 companies, products, components, applications, keywords로 분류
    - _Requirements: 8.7_
  - [ ]* 2.3 convertToParseResult 속성 테스트 작성
    - **Property 5: AISearchResponse → ParseResult 변환 정합성**
    - fast-check로 임의의 AISearchResponse 생성, 변환 후 카테고리별 항목 수 합이 원본 facts 수와 동일한지 검증
    - **Validates: Requirements 8.7**
  - [ ]* 2.4 EntityLinker 유사도 속성 테스트 작성
    - **Property 9: EntityLinker 유사도 점수 일관성**
    - fast-check로 임의의 문자열 쌍 생성, 범위(0~1), 항등성(a,a)=1.0, 대칭성(a,b)==(b,a) 검증
    - **Validates: Requirements 4.4, 5.6**

- [x] 3. 백엔드 API 라우트 확장
  - [x] 3.1 analysis 라우트에 ai-search 엔드포인트 추가
    - `packages/backend/src/routes/analysis.ts`에 `POST /ai-search` 엔드포인트 추가
    - ExternalAIAgent.search() 호출 → convertToParseResult() → EntityLinker.findCandidates() → 통합 결과 반환
    - 요청 바디: query, targetTypes, timeRange, region, provider
    - _Requirements: 10.4, 10.5_

- [x] 4. Checkpoint - 백엔드 서비스 및 API 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. 프론트엔드 통합 페이지 구축
  - [x] 5.1 공통 타입 및 API 클라이언트 확장
    - `packages/frontend/src/lib/api.ts`에 `aiSearch(request: AIAgentInput)` 메서드 추가
    - AnalysisResult, EntityItem, KeywordItem, LinkCandidate, SourceReference 타입을 별도 파일 또는 인라인으로 정의
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 5.2 ExecutiveQuestions 컴포넌트 구현
    - `packages/frontend/src/components/insight-pipeline/ExecutiveQuestions.tsx` 생성
    - 10개 경영진 질문을 정적 데이터로 정의
    - AI 탭에서는 클릭 가능한 제안 목록으로 표시, 클릭 시 onQuestionClick 콜백 호출
    - 수동 탭에서는 안내 문구만 표시
    - _Requirements: 6.1, 6.2, 6.3, 4.7_
  - [x] 5.3 InsightPanel 컴포넌트 구현
    - `packages/frontend/src/components/insight-pipeline/InsightPanel.tsx` 생성
    - 요약 섹션 (2~3줄 한국어 요약)
    - 5개 엔티티 그룹 (회사/기관, 제품·로봇, 부품, 적용 사례, 키워드) 카드 렌더링
    - 각 엔티티에 "DB에 추가" / "기존 엔티티와 연결" 버튼
    - "기존 엔티티와 연결" 클릭 시 LinkCandidate 목록 드롭다운 표시
    - AI 모드 결과 시 출처 정보 (domain + title) 메모 표시
    - 중복 경고 배너, 저장 성공 메시지
    - 다크 테마 (slate-950 배경, violet/blue 액센트)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 9.2, 9.4_
  - [x] 5.4 ManualPasteMode 컴포넌트 구현
    - `packages/frontend/src/components/insight-pipeline/ManualPasteMode.tsx` 생성
    - 기사 제목 입력 필드, 대형 텍스트 입력 영역
    - 6개 분석 옵션 토글 (회사, 제품·로봇, 부품, 적용 사례, 키워드, 요약)
    - 분석 버튼: api.parseArticle() → api.linkEntities() → onAnalysisComplete 콜백
    - 20자 미만 입력 시 버튼 비활성화 + 안내 메시지
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 5.5 AIAgentMode 컴포넌트 구현
    - `packages/frontend/src/components/insight-pipeline/AIAgentMode.tsx` 생성
    - 검색/질문 입력 필드
    - 대상 유형 다중 선택 (기업, 제품·로봇, 부품, 적용 사례, 키워드)
    - 시간 범위 필터 (시작/종료 연도), 지역 필터
    - AI 모델 선택 (ChatGPT / Claude)
    - 검색 버튼: api.aiSearch() → onAnalysisComplete 콜백
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  - [x] 5.6 Pipeline_Page 메인 페이지 조립
    - `packages/frontend/src/app/insight-pipeline/page.tsx` 생성
    - 탭 UI ("기사 붙여넣기" / "AI 기반 데이터 수집")
    - 탭 전환 시 ManualPasteMode / AIAgentMode 교체
    - ExecutiveQuestions 컴포넌트 탭 하단 배치
    - InsightPanel 우측 배치 (2컬럼 레이아웃)
    - 저장 로직: api.saveAnalysis() 호출
    - AuthGuard 래핑
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 9.3_

- [x] 6. Checkpoint - 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있음
- 기존 백엔드 서비스(ArticleParser, EntityLinker, ArticleDBWriter)는 수정 없이 재사용
- fast-check 라이브러리가 이미 프로젝트에 설치되어 있음
- 프론트엔드 스타일링은 기존 다크 테마(slate-950, violet/blue 액센트)를 따름
- ANTHROPIC_API_KEY 환경 변수를 .env에 추가 필요
