# Implementation Plan: 휴머노이드 로봇 인텔리전스 포털

## Overview

휴머노이드 로봇 인텔리전스 포털을 Express.js, Drizzle ORM, Next.js, React Query, Tailwind CSS, Recharts 기술 스택으로 구현합니다. 기존 기능을 유지하면서 기사 분석 도구, 적용 사례 관리, PPT 리포트 생성, 고급 시각화 기능을 추가합니다.

## Tasks

- [x] 1. 프로젝트 설정 및 데이터베이스 스키마
  - [x] 1.1 모노레포 구조 초기화
    - packages/backend, packages/frontend 디렉토리 구조 생성
    - TypeScript, ESLint, Prettier 설정
    - _Requirements: 12.1-12.4_
  
  - [x] 1.2 Drizzle ORM 스키마 정의
    - companies, humanoid_robots, body_specs, hand_specs, computing_specs, sensor_specs, power_specs 테이블
    - workforce_data, talent_trends, components, robot_components 테이블
    - application_cases, articles, keywords, article_keywords, keyword_stats 테이블
    - users 테이블
    - _Requirements: 13.1-13.13_
  
  - [x] 1.3 데이터베이스 마이그레이션 설정
    - Drizzle Kit 설정
    - 초기 마이그레이션 생성 및 실행
    - _Requirements: 13.1-13.13_

- [x] 2. 인증 및 권한 서비스
  - [x] 2.1 AuthService 구현
    - JWT 기반 인증 (login, logout, refreshToken)
    - Allowed_Emails 검증
    - _Requirements: 1.2, 1.7_
  
  - [ ]* 2.2 Property test: Email Allowlist Authentication
    - **Property 2: Email Allowlist Authentication**
    - **Validates: Requirements 1.2**
  
  - [x] 2.3 역할 기반 접근 제어 미들웨어
    - Admin, Analyst, Viewer 역할 정의
    - 권한 검증 미들웨어 구현
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  
  - [ ]* 2.4 Property test: Role-Based Permission Enforcement
    - **Property 1: Role-Based Permission Enforcement**
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**
  
  - [x] 2.5 접근 거부 로깅
    - 권한 없는 접근 시도 로깅
    - _Requirements: 1.6_
  
  - [ ]* 2.6 Property test: Unauthorized Access Denial and Logging
    - **Property 3: Unauthorized Access Denial and Logging**
    - **Validates: Requirements 1.6**

- [x] 3. Checkpoint - 인증 서비스
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 핵심 데이터 서비스
  - [x] 4.1 CompanyService 구현
    - CRUD 작업 (create, get, update, delete)
    - 필터링 및 페이지네이션
    - _Requirements: 5.1, 13.7_
  
  - [x] 4.2 WorkforceService 구현
    - WorkforceData CRUD
    - TalentTrend 추가 및 조회
    - JobDistribution 계산
    - _Requirements: 5.2, 5.3, 5.4, 5.8, 5.9, 13.8, 13.12_
  
  - [ ]* 4.3 Property test: Company & Workforce Data Round-Trip
    - **Property 16: Company Data Storage Round-Trip**
    - **Property 17: Workforce Data Storage Round-Trip**
    - **Validates: Requirements 5.1, 5.2, 5.3, 13.7, 13.8**
  
  - [x] 4.4 HumanoidRobotService 구현
    - CRUD 작업
    - 필터링 (purpose, locomotionType, handType, stage, region)
    - 정렬 (name, company, year, stage)
    - _Requirements: 3.1-3.8, 13.1_
  
  - [ ]* 4.5 Property test: Catalog Filter & Sort Correctness
    - **Property 10: Catalog Filter Correctness**
    - **Property 11: Catalog Sort Order Correctness**
    - **Validates: Requirements 3.6, 3.8**
  
  - [x] 4.6 SpecificationService 구현
    - BodySpec, HandSpec, ComputingSpec, SensorSpec, PowerSpec CRUD
    - 로봇 상세 정보 조회 (모든 스펙 포함)
    - _Requirements: 4.1-4.6, 13.2-13.6_
  
  - [ ]* 4.7 Property test: Robot Detail Data Completeness
    - **Property 13: Robot Detail Data Completeness**
    - **Validates: Requirements 4.1-4.6**

- [x] 5. Checkpoint - 핵심 데이터 서비스
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. 부품 및 적용 사례 서비스
  - [x] 6.1 ComponentService 구현
    - CRUD 작업
    - 타입별 필터링 (actuator, soc, sensor, power)
    - 로봇-부품 연결 관리
    - _Requirements: 6.1-6.7, 13.9_
  
  - [ ]* 6.2 Property test: Component Data & Association
    - **Property 21: Component Data Completeness**
    - **Property 22: Component-Robot Association**
    - **Validates: Requirements 6.1-6.5**
  
  - [x] 6.3 ApplicationCaseService 구현
    - CRUD 작업
    - 환경/작업 유형별 필터링
    - 시연 이벤트 관리
    - _Requirements: 8.1-8.5, 8.8, 13.13_
  
  - [ ]* 6.4 Property test: Application Case Data Completeness
    - **Property 29: Application Case Data Completeness**
    - **Validates: Requirements 8.1-8.3**

- [x] 7. 기사 분석 서비스
  - [x] 7.1 Content Hash 및 중복 검사 구현
    - SHA-256 해시 생성
    - 중복 콘텐츠 검사
    - _Requirements: 2.4, 2.5_
  
  - [ ]* 7.2 Property test: Content Hash Consistency & Duplicate Detection
    - **Property 6: Content Hash Consistency**
    - **Property 7: Duplicate Content Detection**
    - **Validates: Requirements 2.4, 2.5**
  
  - [x] 7.3 ArticleAnalyzerService 구현
    - AI 요약 생성 (외부 API 호출)
    - 메타데이터 추출 (회사, 제품, 기술, 인사이트)
    - 엔티티 매칭 및 태그 제안
    - _Requirements: 2-1.1-2-1.7_
  
  - [x] 7.4 ArticleService 구현
    - 기사 저장 (원문 + 요약 + 태그)
    - 감사 추적 (submittedBy, createdAt)
    - 로봇/회사별 기사 조회
    - _Requirements: 2.1-2.3, 2.9_
  
  - [ ]* 7.5 Property test: Article Storage & Audit Trail
    - **Property 5: Article Storage Round-Trip**
    - **Property 8: Article Submission Audit Trail**
    - **Property 9: Entity Tag Association Persistence**
    - **Validates: Requirements 2.1-2.3, 2.9, 2-1.5, 2-1.7**

- [x] 8. Checkpoint - 기사 분석 서비스
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. 키워드 추출 및 트렌드 분석
  - [ ] 9.1 KeywordExtractionService 구현
    - 한국어/영어 키워드 추출
    - 관련성 점수 계산
    - _Requirements: 9.1, 9.2_
  
  - [ ]* 9.2 Property test: Keyword Extraction Coverage
    - **Property 32: Keyword Extraction Coverage**
    - **Validates: Requirements 9.1, 9.2**
  
  - [ ] 9.3 KeywordStatsService 구현
    - 주간/월간 빈도 계산
    - Delta 및 변화율 계산
    - _Requirements: 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 9.4 Property test: Keyword Statistics Delta Calculation
    - **Property 33: Keyword Statistics Delta Calculation**
    - **Validates: Requirements 9.3-9.5**

- [ ] 10. 대시보드 서비스
  - [ ] 10.1 DashboardService 구현 - 세그먼트 분석
    - Segment Matrix (locomotion × purpose)
    - Hand Type Distribution
    - _Requirements: 7.1, 7.2_
  
  - [ ]* 10.2 Property test: Segment Matrix & Distribution Calculation
    - **Property 25: Segment Matrix Calculation**
    - **Property 26: Hand Type Distribution Calculation**
    - **Validates: Requirements 7.1, 7.2**
  
  - [ ] 10.3 DashboardService 구현 - 인력 분석
    - Workforce by Segment
    - Top N Players Workforce Comparison
    - Job Distribution Radar/Donut
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [ ]* 10.4 Property test: Top N Players Selection
    - **Property 27: Top N Players Selection**
    - **Validates: Requirements 7.4**
  
  - [ ] 10.5 DashboardService 구현 - 적용 사례 분석
    - Environment-Task Matrix
    - Deployment Status Distribution
    - Demo Timeline
    - _Requirements: 8.6, 8.7, 8.9_
  
  - [ ]* 10.6 Property test: Application Case Matrix & Distribution
    - **Property 30: Environment-Task Matrix Calculation**
    - **Property 31: Deployment Status Distribution**
    - **Validates: Requirements 8.6, 8.7**
  
  - [ ] 10.7 Weekly Highlights 구현
    - 신규 제품, 회사 업데이트, 트렌딩 토픽, 최근 시연
    - _Requirements: 7.8_
  
  - [ ]* 10.8 Property test: Weekly Highlights Recency
    - **Property 28: Weekly Highlights Recency**
    - **Validates: Requirements 7.8**

- [ ] 11. Checkpoint - 대시보드 서비스
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. 내보내기 및 PPT 생성 서비스
  - [ ] 12.1 ExportService 구현
    - CSV 내보내기
    - Excel 내보내기
    - 필터 적용된 데이터 내보내기
    - _Requirements: 11.1, 11.4_
  
  - [ ]* 12.2 Property test: Export Filter Consistency
    - **Property 36: Export Filter Consistency**
    - **Validates: Requirements 11.4**
  
  - [ ] 12.3 PPTGeneratorService 구현
    - pptxgenjs 라이브러리 설정
    - 템플릿 구조 정의 (Market Overview, Company Deep Dive, Tech Components, Use Case)
    - _Requirements: 10.1-10.7_
  
  - [ ] 12.4 PPT 슬라이드 생성 구현
    - Title 슬라이드
    - 데이터 테이블 슬라이드
    - 차트 이미지 슬라이드
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [ ]* 12.5 Property test: PPT Generation Output
    - **Property 34: PPT Generation Output**
    - **Property 35: PPT Theme Consistency**
    - **Validates: Requirements 10.1-10.7**

- [ ] 13. Checkpoint - 내보내기 및 PPT 서비스
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Frontend - 프로젝트 설정
  - [x] 14.1 Next.js 프로젝트 초기화
    - TypeScript, Tailwind CSS 설정
    - React Query 설정
    - 라우팅 구조 설정
    - _Requirements: 7.6_
  
  - [x] 14.2 API 클라이언트 구현
    - 타입 안전한 API 클라이언트
    - 인증 토큰 관리
    - 에러 핸들링
    - _Requirements: 1.7_
  
  - [x] 14.3 레이아웃 및 네비게이션
    - 사이드바 네비게이션
    - 다크/라이트 테마 토글
    - 반응형 디자인
    - _Requirements: 7.6_

- [ ] 15. Frontend - 차트 컴포넌트
  - [ ] 15.1 Recharts 기반 차트 컴포넌트 구현
    - LineChart (Talent Trend, TOPS Timeline)
    - BarChart (Workforce Comparison)
    - ScatterChart (Torque vs Weight)
    - DonutChart (Job Distribution, Hand Type)
    - RadarChart (Robot Performance, Company Capability)
    - _Requirements: 3.9, 4.9, 5.5, 5.6, 5.7, 6.8, 6.9, 7.1-7.5_
  
  - [ ] 15.2 Heatmap 및 Matrix 컴포넌트
    - Segment Matrix Heatmap
    - Environment-Task Matrix
    - _Requirements: 7.1, 8.6_
  
  - [ ] 15.3 Timeline 컴포넌트
    - Demo Timeline (수평/수직)
    - _Requirements: 8.9_
  
  - [ ] 15.4 Infographic 컴포넌트
    - Sensor Stack Infographic
    - BOM Breakdown Infographic
    - _Requirements: 6.10_

- [ ] 16. Frontend - 카탈로그 페이지
  - [x] 16.1 로봇 카탈로그 목록 페이지
    - 제품 카드 그리드 뷰
    - 필터 패널 (purpose, locomotion, hand, stage, region)
    - 정렬 드롭다운
    - _Requirements: 3.1-3.8_
  
  - [x] 16.2 로봇 상세 페이지
    - 기본 정보 섹션
    - 스펙 탭 (Body, Hand, Computing, Sensor, Power)
    - 성능 레이더 차트
    - 관련 기사 목록
    - 적용 사례 테이블
    - _Requirements: 4.1-4.9_
  
  - [ ] 16.3 로봇 비교 기능
    - 다중 로봇 선택
    - 스펙 비교 테이블
    - 레이더 차트 오버레이
    - _Requirements: 3.9_

- [ ] 17. Frontend - 회사 및 인력 페이지
  - [ ] 17.1 회사 목록 페이지
    - 회사 카드 그리드
    - 국가/지역 필터
    - _Requirements: 5.1_
  
  - [ ] 17.2 회사 프로필 페이지
    - 회사 정보 카드
    - 인력 규모 카드 (headcount 범위)
    - 조직 구조 도넛 차트
    - Talent Trend 라인 차트
    - 휴머노이드 제품 목록
    - _Requirements: 5.1-5.7_

- [ ] 18. Frontend - 부품 및 적용 사례 페이지
  - [x] 18.1 부품 목록 페이지
    - 타입별 탭 (Actuator, SoC, Sensor, Power)
    - 필터 패널
    - _Requirements: 6.1-6.6_
  
  - [ ] 18.2 부품 상세 페이지
    - 스펙 정보
    - 적용 로봇 목록
    - _Requirements: 6.5_
  
  - [x] 18.3 부품 동향 차트 페이지
    - 토크 밀도 vs 무게 산점도
    - TOPS 추이 라인 차트
    - 센서 스택 인포그래픽
    - _Requirements: 6.8, 6.9, 6.10_
  
  - [x] 18.4 적용 사례 페이지
    - 환경-작업 매트릭스 뷰
    - 배포 상태 분포 차트
    - 시연 타임라인
    - _Requirements: 8.4, 8.6, 8.7, 8.9_

- [ ] 19. Frontend - 대시보드 페이지
  - [x] 19.1 메인 대시보드
    - Summary Cards (총 로봇, 회사, 기사, 주간 변화)
    - Segment Matrix Heatmap
    - Hand Type Distribution Donut
    - _Requirements: 7.1, 7.2_
  
  - [x] 19.2 Talent Dashboard
    - Top N 인력 비교 Bar Chart
    - 직무 분포 Radar/Donut Chart
    - 인력 규모 vs 세그먼트 차트
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [ ] 19.3 Weekly Highlights 섹션
    - 신규 제품 카드
    - 회사 업데이트 목록
    - 트렌딩 토픽 태그
    - 최근 시연 타임라인
    - _Requirements: 7.8_

- [ ] 20. Frontend - 기사 분석 도구
  - [x] 20.1 기사 입력 페이지
    - 텍스트 입력 영역
    - AI 분석 버튼
    - _Requirements: 2-1.1_
  
  - [x] 20.2 분석 결과 표시
    - 원문/요약 나란히 표시
    - 추출된 메타데이터 (회사, 제품, 기술, 인사이트)
    - 태그 후보 선택 UI
    - _Requirements: 2-1.2, 2-1.3, 2-1.4, 2-1.6_
  
  - [x] 20.3 기사 저장 및 관리
    - 태그 확인 후 저장
    - 기사 목록 페이지
    - _Requirements: 2-1.5, 2-1.7_

- [ ] 21. Frontend - PPT 빌더
  - [x] 21.1 PPT 빌더 UI
    - 템플릿 선택 (Market Overview, Company Deep Dive, Tech Components, Use Case)
    - 포함할 항목 선택 (로봇, 회사, 차트)
    - 테마 선택 (Light/Dark)
    - _Requirements: 10.1, 10.2, 10.7_
  
  - [x] 21.2 슬라이드 미리보기
    - 선택된 슬라이드 미리보기
    - 순서 변경
    - _Requirements: 10.4, 10.5, 10.6_
  
  - [ ] 21.3 PPT 다운로드
    - 생성 요청 및 다운로드
    - _Requirements: 10.3_

- [ ] 22. Frontend - 관리자 패널
  - [ ] 22.1 데이터 입력/수정 UI
    - 로봇 추가/수정 폼
    - 회사 추가/수정 폼
    - 부품 추가/수정 폼
    - 적용 사례 추가/수정 폼
    - _Requirements: 1.3, 4.7, 6.7_
  
  - [ ] 22.2 내보내기 UI
    - CSV/Excel 내보내기 버튼
    - 필터 적용 상태 표시
    - _Requirements: 11.1, 11.4_

- [ ] 23. Checkpoint - Frontend 완료
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 24. 통합 테스트 및 최종 검증
  - [ ] 24.1 API 통합 테스트
    - 인증 플로우 테스트
    - CRUD 작업 테스트
    - 필터/정렬 테스트
    - _Requirements: 12.1-12.4_
  
  - [ ]* 24.2 Property test: Entity Storage Round-Trip
    - **Property 38: Entity Storage Round-Trip**
    - **Validates: Requirements 13.1-13.13**
  
  - [ ]* 24.3 Property test: API Error Resilience
    - **Property 37: API Error Resilience**
    - **Validates: Requirements 12.2, 12.3**

- [ ] 25. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - 모든 요구사항 커버리지 확인
  - 전체 통합 테스트 실행

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- PPT 생성은 pptxgenjs 라이브러리 사용, Claude API 연동은 향후 확장 예정
- 차트 컴포넌트는 Recharts 기반으로 구현
