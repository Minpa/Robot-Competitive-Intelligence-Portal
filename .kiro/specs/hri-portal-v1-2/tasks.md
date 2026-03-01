# 구현 계획: HRI Portal v1.2

## 개요

기존 v1.0/v1.1 코드베이스를 확장하여 v1.2 신규/변경 기능을 구현합니다. 기존 구현(REQ-01~REQ-08 대부분, 경영진 대시보드 기본 탭 10개)은 이미 존재하므로, DB 스키마 변경 → 백엔드 서비스 확장 → 프론트엔드 대시보드 개선 → 에러 처리/캐시 통합 순서로 진행합니다.

## Tasks

- [x] 1. DB 스키마 변경 및 마이그레이션
  - [x] 1.1 Entity_Alias 테이블 추가
    - `packages/backend/src/db/schema.ts`에 `entityAliases` 테이블 정의 (id, entity_type, entity_id, alias_name, language, created_at)
    - `entityAliasesRelations` 관계 정의
    - Drizzle 마이그레이션 생성
    - _Requirements: 5.49_

  - [x] 1.2 pg_trgm 확장 활성화 및 GIN 인덱스 생성
    - SQL 마이그레이션 파일 생성: `CREATE EXTENSION IF NOT EXISTS pg_trgm`
    - GIN 인덱스 생성: `entity_aliases.alias_name`, `companies.name`, `humanoid_robots.name` (gin_trgm_ops)
    - _Requirements: 5.43, 5.49_

  - [x] 1.3 View_Cache 테이블 추가
    - `packages/backend/src/db/schema.ts`에 `viewCache` 테이블 정의 (id, view_name UNIQUE, data JSONB, cached_at, ttl_ms)
    - Drizzle 마이그레이션 생성
    - _Requirements: 11.101~11.109_

  - [x] 1.4 companies 테이블에 valuation_usd 컬럼 추가
    - `companies` 테이블 정의에 `valuationUsd: decimal('valuation_usd', { precision: 15, scale: 2 })` 추가
    - Drizzle 마이그레이션 생성
    - _Requirements: 7.60, 9.82_

  - [ ]* 1.5 Property 테스트: Segment Matrix 완전성 (Property 10)
    - **Property 10: Segment Matrix는 정확히 9개 셀(3 env × 3 locomotion)을 포함하며, 각 셀의 로봇 수가 실제 데이터와 일치**
    - **Validates: Requirements 4.27, 4.38, 9.83**
    - `packages/backend/src/__tests__/property/segment-matrix.property.test.ts` 생성

- [x] 2. Checkpoint — DB 마이그레이션 검증
  - Ensure all tests pass, ask the user if questions arise.
  - `npx drizzle-kit generate` 및 `npx drizzle-kit push` 실행하여 스키마 변경 적용 확인

- [x] 3. EntityAliasService 및 EntityLinker pg_trgm 확장
  - [x] 3.1 EntityAliasService 구현
    - `packages/backend/src/services/entity-alias.service.ts` 생성
    - `fuzzyMatch(query, entityType?)`: pg_trgm `similarity()` SQL 기반 매칭 (threshold ≥ 0.4, auto-match ≥ 0.7)
    - `createAlias`, `getAliasesByEntity`, `deleteAlias`, `bulkCreateAliases` CRUD 메서드
    - `packages/backend/src/services/index.ts`에 export 추가
    - _Requirements: 5.43, 5.49_

  - [x] 3.2 EntityLinkerService pg_trgm 마이그레이션
    - `packages/backend/src/services/entity-linker.service.ts`의 기존 Levenshtein `fuzzyMatch()` 메서드를 pg_trgm `similarity()` SQL 쿼리로 대체
    - Entity_Alias 테이블도 함께 검색하도록 확장 (`matchedVia: 'direct' | 'alias'` 필드 추가)
    - `LinkCandidate` 인터페이스에 `matchedVia`, `aliasName?` 필드 추가
    - 임계값 변경: auto-recommend 0.8 → 0.7, 최소 후보 0.3 → 0.4
    - _Requirements: 5.43, 5.49_

  - [ ]* 3.3 Property 테스트: Fuzzy 매칭 임계값 (Property 14)
    - **Property 14: isAutoMatch=true인 항목은 similarity ≥ 0.7, 모든 결과는 similarity ≥ 0.4, similarity < 0.4는 제외**
    - **Validates: Requirements 5.43**
    - `packages/backend/src/__tests__/property/entity-linker.property.test.ts` 생성

  - [ ]* 3.4 Property 테스트: 별칭 라운드트립 매칭 (Property 17)
    - **Property 17: createAlias(entity, alias) → fuzzyMatch(alias) 결과에 entity 포함**
    - **Validates: Requirements 5.49**
    - `packages/backend/src/__tests__/property/entity-alias.property.test.ts` 생성

  - [x] 3.5 Entity Alias API 라우트 추가
    - `packages/backend/src/routes/entity-aliases.ts` 생성
    - GET `/api/entity-aliases` (목록 조회, entityType/entityId 필터)
    - POST `/api/entity-aliases` (별칭 등록, Admin 전용)
    - DELETE `/api/entity-aliases/:aliasId` (별칭 삭제, Admin 전용)
    - POST `/api/entity-aliases/bulk` (벌크 등록, Admin 전용)
    - GET `/api/entity-aliases/fuzzy-match` (pg_trgm 매칭 테스트)
    - `packages/backend/src/index.ts`에 라우트 등록
    - _Requirements: 5.43, 5.49_

- [x] 4. ViewCacheService 구현
  - [x] 4.1 ViewCacheService 생성
    - `packages/backend/src/services/view-cache.service.ts` 생성
    - `VIEW_CACHE_CONFIGS` 상수 정의 (뷰별 TTL, staleBadge, fallbackType)
    - `getOrCompute<T>(viewName, compute)`: 인메모리 캐시 우선, TTL 만료 시 stale 데이터 + `isStale` 플래그 반환
    - `invalidate(viewName)`, `invalidateAll()` 메서드
    - 서버 재시작 시 view_cache 테이블에서 warm-up 로직
    - `packages/backend/src/services/index.ts`에 export 추가
    - _Requirements: 11.101~11.109_

  - [ ]* 4.2 Property 테스트: 캐시 폴백 + Stale 배지 (Property 29)
    - **Property 29: 캐시 가능한 뷰에서 API/DB 장애 시 마지막 캐시 값 반환, TTL 만료 시 isStale=true**
    - **Validates: Requirements 11.101, 11.102, 11.103, 11.104, 11.107, 11.108**
    - `packages/backend/src/__tests__/property/cache.property.test.ts` 생성

  - [ ]* 4.3 Property 테스트: 비캐시 폴백 타입 (Property 30)
    - **Property 30: Highlights는 'hide', scatter/trend는 'empty_retry', SegmentDetailDrawer는 'error_message'**
    - **Validates: Requirements 11.105, 11.106, 11.109**
    - `packages/backend/src/__tests__/property/cache.property.test.ts`에 추가

- [x] 5. Checkpoint — 백엔드 서비스 검증
  - Ensure all tests pass, ask the user if questions arise.
  - EntityAliasService, EntityLinkerService pg_trgm, ViewCacheService 동작 확인

- [x] 6. 운영 대시보드 개선 (REQ-04 변경사항)
  - [x] 6.1 Segment Matrix 2D 히트맵 개선
    - `packages/frontend/src/components/dashboard/SegmentHeatmapPanel.tsx` 수정
    - 기본 뷰를 environment(Industrial/Home/Service) × locomotion(Bipedal/Wheeled/Hybrid) 2D 히트맵으로 변경
    - task type은 드롭다운 필터를 통한 드릴다운 차원으로 제공
    - 데이터 없는 셀은 count=0 + 회색 배경(grayed-out)으로 표시 (셀 생략 금지)
    - _Requirements: 4.27, 4.38_

  - [x] 6.2 GlobalFilterBar 운영 대시보드 통합
    - `packages/frontend/src/components/dashboard/GlobalFilterBar.tsx` 수정
    - 기간(date range), 지역(region), 세그먼트(segment) 필터가 페이지 내 모든 차트에 동시 적용되도록 연결
    - 필터 변경 시 React Query 캐시 무효화로 500ms 이내 업데이트 (전체 페이지 리로드 없이)
    - _Requirements: 4.28_

  - [x] 6.3 SegmentDetailDrawer 개선
    - `packages/frontend/src/components/dashboard/SegmentDetailDrawer.tsx` 수정
    - 히트맵 셀 클릭 시 슬라이드오버 패널로 해당 세그먼트 로봇 목록 표시 (key specs: name, company, stage, DoF, payload, SoC)
    - 드로어 닫기 시 현재 필터 상태 유지
    - 빈 세그먼트 클릭 시 "해당 세그먼트에 등록된 로봇이 없습니다" 메시지 표시
    - _Requirements: 4.39, 9.84_

  - [x] 6.4 빈 데이터 상태(Empty State) 처리
    - 각 차트/시각화 컴포넌트에 데이터 0건 시 안내 메시지 표시 로직 추가
    - `packages/frontend/src/components/shared/EmptyChartPlaceholder.tsx` 생성 — 필요 데이터 타입 및 최소 데이터 수 안내
    - _Requirements: 4.37, 4.38_

  - [ ]* 6.5 Property 테스트: SegmentDetailDrawer 데이터 정확성 (Property 12)
    - **Property 12: 셀 클릭(env, locomotion) 시 표시되는 모든 로봇은 해당 env/locomotion을 가지며, 해당 조건의 모든 로봇이 포함**
    - **Validates: Requirements 4.39, 9.84**
    - `packages/backend/src/__tests__/property/segment-matrix.property.test.ts`에 추가

- [x] 7. 경영진 대시보드 백엔드 확장 (REQ-09)
  - [x] 7.1 ExecutiveDashboardService GlobalFilterParams 지원
    - `packages/backend/src/services/executive-dashboard.service.ts` 수정
    - `GlobalFilterParams` 인터페이스 추가 (period, region[], segment[])
    - 기존 10개 메서드에 `filters?: GlobalFilterParams` 파라미터 추가
    - ViewCacheService 통합: 각 메서드에서 `viewCacheService.getOrCompute()` 사용
    - _Requirements: 9.78, 9.79, 9.85_

  - [x] 7.2 Segment Heatmap API 확장
    - `getSegmentHeatmap(filters?)`: env × locomotion 2D 히트맵 + task type 드릴다운 데이터 반환
    - `getSegmentDrawerRobots(env, locomotion, taskType?)`: 셀 드릴다운 로봇 목록 반환
    - 빈 셀도 count=0으로 포함 (9개 셀 완전성 보장)
    - _Requirements: 9.83, 9.84, 9.86_

  - [x] 7.3 TimelineTrend API 구현
    - `getTimelineTrend(filters?)`: 월별 이벤트 수(바) + 누적 제품 수(라인) 이중축 데이터 반환
    - `TimelineTrendData` 인터페이스 (month, eventCount, cumulativeProducts)
    - 빈 기간은 "해당 기간 이벤트 없음" 표시자 포함
    - _Requirements: 9.81_

  - [x] 7.4 TalentProductScatter API 구현
    - `getTalentProductScatter(filters?)`: 인력 규모(x) vs 제품 수(y) + 기업 가치(버블 크기) 데이터 반환
    - `TalentProductScatterData` 인터페이스 (companyId, companyName, workforceSize, productCount, valuation, region)
    - workforce_data와 humanoid_robot 모두 보유한 회사만 포함
    - _Requirements: 9.82_

  - [x] 7.5 경영진 대시보드 API 라우트 확장
    - `packages/backend/src/routes/executive.ts` 수정
    - 모든 엔드포인트에 `?startDate=&endDate=&region=&segment=` 쿼리 파라미터 파싱 추가
    - 신규 엔드포인트 추가:
      - GET `/api/executive/overview` (KPI 카드 + 인사이트)
      - GET `/api/executive/segment-heatmap/:env/:locomotion/robots` (셀 드릴다운)
      - GET `/api/executive/timeline-trend`
      - GET `/api/executive/talent-product-scatter`
      - GET `/api/executive/market-forecast`
      - GET `/api/executive/regional-share`
      - GET `/api/executive/workforce-comparison`
      - GET `/api/executive/investment-flow`
      - GET `/api/executive/insight-hub`
    - 응답에 `isStale`, `cachedAt` 필드 포함 (ViewCacheService 연동)
    - _Requirements: 9.78~9.87_

  - [ ]* 7.6 Property 테스트: 타임라인 트렌드 집계 정확성 (Property 24)
    - **Property 24: 월별 이벤트 수는 실제 수와 일치, 누적 제품 수는 해당 월까지의 누적합과 일치**
    - **Validates: Requirements 9.81**
    - `packages/backend/src/__tests__/property/executive.property.test.ts` 생성

  - [ ]* 7.7 Property 테스트: TalentProduct 산점도 데이터 필터 (Property 25)
    - **Property 25: 포함된 모든 회사는 workforce_data + 최소 1개 humanoid_robot 보유, 둘 중 하나 없으면 제외**
    - **Validates: Requirements 9.82**
    - `packages/backend/src/__tests__/property/executive.property.test.ts`에 추가

- [x] 8. Checkpoint — 백엔드 API 검증
  - Ensure all tests pass, ask the user if questions arise.
  - 경영진 대시보드 API 엔드포인트 동작 확인, GlobalFilterParams 적용 확인

- [x] 9. 경영진 대시보드 프론트엔드 (REQ-09)
  - [x] 9.1 ExecutiveTabNav 및 페이지 리팩토링
    - `packages/frontend/src/app/executive/page.tsx` 수정
    - 10탭 수평 네비게이션 컴포넌트 (`ExecutiveTabNav`) 구현
    - 탭 목록: KPI Overview, Segment Heatmap, Market Forecast, Regional Share, Player Expansion, Workforce Comparison, Technology Radar, Investment Flow, Insight Hub, Top Events
    - GlobalFilterBar를 탭 상단에 배치하여 모든 탭에 공유
    - 탭 전환 시 필터 상태 유지
    - _Requirements: 9.78, 9.79, 9.80_

  - [x] 9.2 GlobalFilterBar 경영진 대시보드 통합
    - `packages/frontend/src/components/executive/GlobalFilterBar.tsx` 생성 (또는 기존 dashboard/GlobalFilterBar 재사용)
    - 기간(date range picker), 지역(multi-select), 세그먼트(multi-select) 필터
    - 필터 변경 시 React Query `queryKey`에 필터 값 포함하여 자동 refetch
    - 500ms 이내 업데이트 보장 (전체 페이지 리로드 없이)
    - _Requirements: 9.78, 9.79_

  - [x] 9.3 KPI Overview 탭 구현
    - `packages/frontend/src/components/executive/KPIOverviewTab.tsx` 생성
    - KPI 카드 4종 (총 로봇 수, 총 회사 수, 총 기사 수, 시장 규모) + 인사이트 요약
    - 데이터 부족 시 "—" + "데이터 수집 중" 표시
    - _Requirements: 9.80, 9.86_

  - [x] 9.4 Segment Heatmap 탭 구현
    - `packages/frontend/src/components/executive/SegmentHeatmapTab.tsx` 생성
    - env × locomotion 2D 히트맵 + task type 드롭다운 드릴다운
    - 셀 클릭 시 SegmentDetailDrawer 열기
    - 빈 셀은 0 카운트 + 회색 배경
    - _Requirements: 9.83, 9.84, 9.86_

  - [x] 9.5 TimelineTrendPanel 구현
    - `packages/frontend/src/components/executive/TimelineTrendPanel.tsx` 수정/확장
    - Recharts 이중축 차트: 좌축 이벤트 수(바), 우축 누적 제품 수(라인)
    - Brush 컴포넌트로 날짜 범위 줌 지원
    - 빈 기간 "해당 기간 이벤트 없음" 표시
    - _Requirements: 9.81_

  - [x] 9.6 TalentProductScatterPanel 구현
    - `packages/frontend/src/components/executive/TalentProductScatterPanel.tsx` 수정/확장
    - Recharts 산점도: x축 인력 규모, y축 제품 수, 버블 크기 기업 가치
    - 인력+제품 둘 다 있는 기업만 표시, 미등록 기업 수 안내
    - _Requirements: 9.82_

  - [x] 9.7 나머지 경영진 탭 구현 (Market Forecast, Regional Share, Player Expansion, Workforce Comparison, Technology Radar, Investment Flow, Insight Hub, Top Events)
    - 기존 `packages/frontend/src/app/executive/page.tsx`의 인라인 뷰 컴포넌트들을 독립 탭 컴포넌트로 분리
    - 각 탭에 GlobalFilterParams 연동
    - 각 탭에 뷰별 빈 데이터 상태 메시지 적용 (REQ-09 AC 86 폴백 테이블 참조)
    - Market Forecast: "시장 데이터 업데이트 예정"
    - Regional Share: "지역 데이터 미등록"
    - Workforce: 데이터 있는 기업만 + 미등록 수 표시
    - Top Events: "이번 주 등록된 뉴스가 없습니다"
    - _Requirements: 9.80, 9.86_

  - [ ]* 9.8 Property 테스트: 뷰별 폴백 전략 정확성 (Property 26)
    - **Property 26: 각 경영진 뷰에서 데이터 부족 시 정의된 폴백 메시지/동작이 적용**
    - **Validates: Requirements 9.86**
    - `packages/backend/src/__tests__/property/fallback.property.test.ts` 생성

  - [ ]* 9.9 Property 테스트: 경영진 대시보드 전 역할 접근 (Property 27)
    - **Property 27: 인증된 사용자(Viewer, Analyst, Admin) 모두 `/api/executive/*` 접근 허용, 미인증 시 401**
    - **Validates: Requirements 9.87**
    - `packages/backend/src/__tests__/property/executive.property.test.ts`에 추가

- [x] 10. 에러 처리 및 폴백 통합 (REQ-11)
  - [x] 10.1 ErrorFallbackWrapper 공유 컴포넌트 구현
    - `packages/frontend/src/components/shared/ErrorFallbackWrapper.tsx` 생성
    - React Query `onError` + `ViewFallbackConfig` 기반 폴백 분기:
      - `'cache'`: 캐시된 데이터 표시 + StaleBadge
      - `'hide'`: children 렌더링 안 함
      - `'empty_retry'`: EmptyChartPlaceholder + RetryButton
      - `'error_message'`: 에러 메시지 + RetryButton
    - React Query `staleTime`, `gcTime`을 ViewCacheConfig TTL과 동기화
    - _Requirements: 11.101~11.109_

  - [x] 10.2 StaleBadge 및 RetryButton 컴포넌트 구현
    - `packages/frontend/src/components/shared/StaleBadge.tsx` 생성 — "stale" 배지 + 캐시 시각 표시
    - `packages/frontend/src/components/shared/RetryButton.tsx` 생성 — 재시도 버튼 + React Query refetch 연동
    - _Requirements: 11.101, 11.104, 11.106, 11.107, 11.108, 11.109_

  - [x] 10.3 운영 대시보드 뷰별 폴백 적용
    - KPI 카드: 장애 시 마지막 캐시 + stale 배지 (TTL 1h)
    - Segment Matrix: 장애 시 마지막 캐시 매트릭스 (TTL 24h)
    - 시장 전망/지역 점유율: 장애 시 마지막 캐시 (TTL 7d)
    - 인력 비교: 장애 시 마지막 캐시 + stale 배지 (TTL 24h)
    - This Week's Highlights: 장애 시 섹션 숨김
    - 산점도/트렌드: 장애 시 빈 차트 + 재시도 버튼
    - _Requirements: 11.101~11.106_

  - [x] 10.4 경영진 대시보드 뷰별 폴백 적용
    - TimelineTrend: 장애 시 마지막 캐시 + stale 배지 (TTL 6h)
    - TalentProduct Scatter: 장애 시 마지막 캐시 + stale 배지 (TTL 24h)
    - SegmentDetailDrawer: 장애 시 에러 메시지 + 재시도 버튼
    - 나머지 탭: 해당 뷰의 ViewCacheConfig에 따른 폴백 적용
    - _Requirements: 11.107, 11.108, 11.109_

  - [x] 10.5 백엔드 API 에러 응답에 캐시 메타데이터 추가
    - 모든 캐시 가능 엔드포인트 응답에 `isStale`, `cachedAt` 필드 포함
    - ViewCacheService 장애 시 stale 데이터 반환 로직 확인
    - _Requirements: 11.101~11.109_

- [x] 11. 최종 통합 및 와이어링
  - [x] 11.1 Sidebar 네비게이션 확인 및 라우트 연결
    - `packages/frontend/src/components/layout/Sidebar.tsx`에서 경영진 대시보드 링크 확인 (이미 `/executive` 존재)
    - 운영 대시보드(`/dashboard`)와 경영진 대시보드(`/executive`) 독립 공존 확인
    - _Requirements: 9.80, 9.87_

  - [x] 11.2 ArticleAnalyzerService EntityLinker pg_trgm 통합
    - `packages/backend/src/services/article-analyzer.service.ts` 수정
    - Claude API 분석 결과의 mentionedCompanies/mentionedRobots를 EntityLinkerService의 pg_trgm 매칭으로 연결
    - `AnalysisResult.entityLinks` 필드에 pg_trgm 매칭 결과 포함
    - _Requirements: 5.43, 5.49_

  - [ ]* 11.3 Property 테스트: Content Hash 결정성 (Property 15)
    - **Property 15: 동일 콘텐츠 → 동일 해시, 다른 콘텐츠 → 다른 해시, 중복 시 저장 거부**
    - **Validates: Requirements 5.45, 5.46**
    - `packages/backend/src/__tests__/property/deduplication.property.test.ts` 생성

  - [ ]* 11.4 Property 테스트: 빈 데이터 상태 표시 (Property 11)
    - **Property 11: 데이터 0건인 뷰에서 API 응답에 빈 상태 표시자(emptyState 플래그 또는 메시지) 포함**
    - **Validates: Requirements 4.37**
    - `packages/backend/src/__tests__/property/dashboard.property.test.ts` 생성

- [x] 12. 최종 Checkpoint — 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.
  - 운영 대시보드 Segment Matrix 2D 히트맵 + 드릴다운 동작 확인
  - 경영진 대시보드 10탭 + GlobalFilterBar 동작 확인
  - EntityLinker pg_trgm 매칭 + Entity_Alias 별칭 검색 동작 확인
  - ViewCacheService 캐시/폴백 동작 확인
  - 에러 폴백 시나리오 (stale 배지, 섹션 숨김, 재시도 버튼) 동작 확인

## Notes

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조합니다
- Checkpoint에서 점진적 검증을 수행합니다
- Property 테스트는 fast-check 라이브러리를 사용하여 보편적 정확성 속성을 검증합니다
- 기존 v1.0/v1.1 구현(REQ-01~REQ-08 대부분)은 이미 존재하므로, v1.2 신규/변경 기능에 집중합니다
