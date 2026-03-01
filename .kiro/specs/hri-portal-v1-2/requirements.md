# 요구사항 문서 — HRI Portal v1.2

## 소개

HRI(Humanoid Robot Intelligence) Portal v1.2는 휴머노이드 로봇 산업의 시장 동향을 모니터링하고 심층 분석하는 웹 애플리케이션입니다. 본 문서는 v1.2에서 정의된 9개 기능 요구사항(REQ-01 ~ REQ-09)을 EARS 패턴 및 INCOSE 품질 규칙에 따라 재정의합니다.

핵심 가치 제안:
- 경쟁사 제품 스펙 통합 카탈로그 (24개+ 로봇 체계적 관리)
- 시장 인텔리전스 대시보드 (시장 규모, 투자 동향, 세그먼트 분석)
- AI 기반 기사 분석 (Claude API를 통한 자동 요약 및 엔티티 태깅)
- PPT 리포트 자동 생성 (pptxgenjs 서버사이드 생성)
- 역할 기반 접근 제어 (Admin / Analyst / Viewer 3단계 권한)

대시보드 공존 전략: 운영 대시보드(`/dashboard`, REQ-04)와 경영진 대시보드(`/executive`, REQ-09)는 독립 라우트로 공존하며, 백엔드 AggregationService 및 InsightCardsService를 공유합니다.

## 용어 사전

- **Portal**: HRI 휴머노이드 로봇 인텔리전스 포털 웹 애플리케이션 (Express.js + TypeScript 백엔드, Next.js + React 18 프론트엔드)
- **Humanoid_Robot**: 휴머노이드 로봇 제품 엔티티 (PostgreSQL + Drizzle ORM으로 관리)
- **Body_Spec**: 신장, 중량, DoF 등 신체 관련 스펙
- **Hand_Spec**: 타입, 손가락 수, Grip force 등 손 관련 스펙
- **Computing_Spec**: SoC, TOPS, 아키텍처 등 컴퓨팅 스펙
- **Sensor_Spec**: 카메라, 깊이 센서, LiDAR, IMU, 힘-토크 센서 등 센서 스펙
- **Power_Spec**: 배터리 타입, 용량(Wh), 충전 방식 등 전원 스펙
- **Catalog**: 로봇 카탈로그 페이지 — 필터링, 정렬, 카드 그리드 표시
- **Dashboard**: 운영 대시보드 (`/dashboard`) — 12-column 3-Row 그리드 레이아웃
- **Executive_Dashboard**: 경영진 대시보드 (`/executive`) — 탭 기반 10개 뷰
- **Segment_Matrix**: 환경(Industrial/Home/Service) × 이동방식(Bipedal/Wheeled/Hybrid) 2D 히트맵 (작업 유형은 드릴다운 차원)
- **SegmentDetailDrawer**: 히트맵 셀 클릭 시 열리는 슬라이드오버 패널 — 세그먼트 내 로봇 목록 표시
- **GlobalFilterBar**: 기간/지역/세그먼트 공통 필터 바 — 대시보드 전체 뷰에 적용
- **Article_Analyzer**: 기사 분석 도구 — Claude API 기반 AI 요약 및 엔티티 추출
- **NLP_Engine**: Claude API를 활용한 자연어 처리 엔진 (키워드 추출, AI 요약)
- **EntityLinker**: AI 추출 엔티티명을 DB 기존 엔티티와 fuzzy 매칭하는 모듈 (PostgreSQL pg_trgm + GIN 인덱스)
- **Entity_Alias**: 다국어 별칭 관리 테이블 (예: "Boston Dynamics" ↔ "보스턴 다이나믹스" ↔ "BD")
- **PPT_Generator**: 파워포인트 리포트 생성 서비스 (pptxgenjs, Node.js 서버사이드)
- **Content_Hash**: 기사 콘텐츠 중복 확인용 SHA-256 해시값
- **Allowed_Emails**: 로그인 허용된 이메일 주소 화이트리스트 테이블
- **AggregationService**: 운영/경영진 대시보드가 공유하는 데이터 집계 백엔드 서비스
- **InsightCardsService**: 인사이트 카드 데이터를 제공하는 공유 백엔드 서비스
- **TimelineTrendPanel**: 월별 이벤트/제품 발표를 이중 축(바+라인)으로 표시하는 경영진 뷰 패널
- **TalentProductScatterPanel**: 인력 규모(x) vs 제품 수(y) 산점도 — 버블 크기는 기업 가치 반영
- **TOPS**: Tera Operations Per Second — AI 추론 성능 단위
- **DoF**: Degrees of Freedom — 자유도
- **pg_trgm**: PostgreSQL trigram 유사도 검색 확장 모듈 — GIN 인덱스 기반 fuzzy 매칭 지원

## 요구사항

### 요구사항 1: 사용자 인증 및 역할 기반 접근 제어 (REQ-01)

**User Story:** 시스템 관리자로서, 역할 기반 접근 제어를 통해 민감한 경쟁 인텔리전스 데이터를 보호하고 싶습니다.

#### 인수 조건

1. THE Portal SHALL implement role-based access control with three distinct roles: Admin, Analyst, and Viewer.
2. WHEN a user attempts to log in, THE Portal SHALL verify the email against the Allowed_Emails table in PostgreSQL before granting access.
3. WHEN an Admin user accesses the system, THE Portal SHALL allow data entry, modification, and tag management functions.
4. WHEN an Analyst user accesses the system, THE Portal SHALL allow report creation and memo/insight addition, but restrict data modification.
5. WHEN a Viewer user accesses the system, THE Portal SHALL allow only search and dashboard viewing functions.
6. WHEN a user without appropriate role attempts restricted functions, THE Portal SHALL deny access and log the attempt with user email, attempted action, and timestamp.
7. THE Portal SHALL support session management with custom JWT token-based authentication with 24-hour access token expiry and 14-day refresh token expiry.


### 요구사항 2: 휴머노이드 로봇 카탈로그 (REQ-02)

**User Story:** 제품 관리자로서, 다양한 기준으로 휴머노이드 로봇을 필터링하고 비교하여 시장 현황을 파악하고 싶습니다.

#### 인수 조건

8. THE Catalog SHALL organize Humanoid_Robot products with filtering by purpose: Industrial, Home, and Service.
9. THE Catalog SHALL support filtering by locomotion type: Bipedal, Wheeled, and Hybrid.
10. THE Catalog SHALL support filtering by hand type: Gripper, Multi_Finger_Hand, and Interchangeable.
11. THE Catalog SHALL support filtering by commercialization stage: Concept, Prototype, PoC, Pilot, and Commercial.
12. THE Catalog SHALL support filtering by region: North_America, Europe, China, Japan, Korea, and Other.
13. WHEN a user applies multiple filters, THE Catalog SHALL return results matching ALL applied filter criteria (AND logic).
14. THE Catalog SHALL display results as product cards in a 3-column grid with key specifications visible (name, company, stage badge, DoF, payload, SoC, radar mini chart).
15. THE Catalog SHALL support sorting by name, company, release year, and commercialization stage.
16. THE Catalog SHALL display a performance radar chart for each robot showing 6 key metrics.
17. WHEN a user performs a search query, THE Portal SHALL return results within 2 seconds for datasets up to thousands of records.

### 요구사항 3: 로봇 상세 스펙 페이지 (REQ-03)

**User Story:** R&D 엔지니어로서, 휴머노이드 로봇의 상세 스펙을 확인하여 벤치마킹에 활용하고 싶습니다.

#### 인수 조건

18. WHEN displaying a Humanoid_Robot detail page, THE Portal SHALL show: name, company, announcement year, status, region, and tags in a header section with breadcrumb navigation.
19. WHEN displaying Body_Spec, THE Portal SHALL show: height (cm), weight (kg), payload (kg), DoF count, max speed (m/s), and operation time in a dedicated spec tab.
20. WHEN displaying Hand_Spec, THE Portal SHALL show: hand type, finger count, hand DoF, grip force (N), and interchangeability in a dedicated spec tab.
21. WHEN displaying Computing_Spec, THE Portal SHALL show: main SoC, TOPS range, and architecture type in a dedicated spec tab.
22. WHEN displaying Sensor_Spec, THE Portal SHALL show: camera specs, depth sensor, LiDAR, IMU, and force-torque sensors in a dedicated spec tab.
23. WHEN displaying Power_Spec, THE Portal SHALL show: battery type, capacity (Wh), operation time, and charging method in a dedicated spec tab.
24. WHEN an Admin user views the detail page, THE Portal SHALL display an edit button enabling inline editing of all specification fields.
25. THE Portal SHALL display related articles and news for each Humanoid_Robot in a section below the spec tabs.
26. THE Portal SHALL display a performance radar chart comparing the robot against segment averages, with the segment average shown as a comparison overlay line.


### 요구사항 4: 분석 대시보드 (REQ-04)

**User Story:** 경영진으로서, 휴머노이드 로봇 시장의 주요 지표를 시각적으로 확인하여 전략적 의사결정에 활용하고 싶습니다.

#### 인수 조건

27. THE Dashboard SHALL display a Segment_Matrix showing environment (Industrial / Home / Service) × locomotion type (Bipedal / Wheeled / Hybrid) as a 2D heatmap primary view, with task type available as a drill-down dimension via dropdown filter.
28. THE Dashboard SHALL provide a GlobalFilterBar component with period (date range), region, and segment filters that apply simultaneously to all charts and visualizations on the page.
29. THE Dashboard SHALL display a hand type distribution chart across all cataloged robots using Recharts.
30. THE Dashboard SHALL display a workforce size vs segment chart using Recharts.
31. THE Dashboard SHALL display a Top N humanoid players workforce comparison chart using Recharts.
32. THE Dashboard SHALL display a global market forecast bar chart (2024~2030) using Recharts.
33. THE Dashboard SHALL display a regional market share pie chart using Recharts.
34. THE Dashboard SHALL support both dark (slate-900/950 backgrounds as default) and light theme options via Tailwind CSS.
35. THE Dashboard SHALL include a "This Week's Highlights" marquee section displaying recent news items.
36. WHEN new data is added, THE Dashboard SHALL reflect updates within the next scheduled refresh cycle (≤24 hours).
37. WHEN insufficient data exists for any chart or visualization, THE Dashboard SHALL display an empty chart placeholder with an informational message indicating the required data type and minimum data count.
38. WHEN the Segment_Matrix has no robot data for a cell, THE Dashboard SHALL display the cell as zero-count with distinct visual styling (grayed-out background) rather than omitting the cell.
39. WHEN a user clicks a Segment_Matrix cell, THE Dashboard SHALL open a SegmentDetailDrawer (slide-over panel) showing the list of robots in that segment with key specs, and the drawer SHALL be dismissible without losing the current filter state.

### 요구사항 5: 기사 분석 도구 — Article Analyzer (REQ-05)

**User Story:** 데이터 분석가로서, 기사 원문을 붙여넣으면 AI가 자동으로 요약하고 관련 회사/제품을 태깅해주는 도구를 사용하고 싶습니다.

#### 인수 조건

40. THE Article_Analyzer SHALL provide a text input area for pasting article content with a maximum of 50,000 characters.
41. WHEN article content is submitted, THE Article_Analyzer SHALL call Claude API (claude-sonnet-4-6 model) via the Express.js backend to generate a structured summary within 10 seconds.
42. WHEN generating a summary, THE Article_Analyzer SHALL extract: mentioned companies, products, key technologies, and market insights as structured JSON.
43. WHEN companies or products are mentioned, THE EntityLinker SHALL suggest matching entities from the PostgreSQL database using pg_trgm trigram similarity — auto-match at threshold ≥ 0.7, candidate suggestion at threshold ≥ 0.4, with GIN index on company.name and humanoid_robot.name columns.
44. THE Article_Analyzer SHALL provide simultaneous access to the original text, AI summary, and extracted metadata in a split-panel layout without requiring navigation between views.
45. WHEN storing an article, THE Portal SHALL generate Content_Hash (SHA-256) and check for duplicates against the content_hash column (UNIQUE constraint) in PostgreSQL.
46. WHEN duplicate Content_Hash is detected, THE Portal SHALL notify the user with a message and skip storage.
47. THE Portal SHALL store audit trail for each article: submitter email and submission timestamp.
48. THE NLP_Engine SHALL support both Korean and English language processing via Claude API.
49. THE EntityLinker SHALL query the Entity_Alias table to support multilingual alias matching (e.g., "Boston Dynamics" ↔ "보스턴 다이나믹스" ↔ "BD"), with alias_name indexed via GIN for trigram search.


### 요구사항 6: PPT 리포트 생성 (REQ-06)

**User Story:** 전략팀 멤버로서, 선택한 데이터와 차트를 파워포인트 형식으로 다운로드하여 경영진 프레젠테이션 자료를 만들고 싶습니다.

#### 인수 조건

50. THE PPT_Generator SHALL allow users to select specific robots (checkbox list) for inclusion in the report.
51. THE PPT_Generator SHALL allow users to select specific charts and visualizations for inclusion via a slide selection panel (10 slide types).
52. WHEN generating a report, THE PPT_Generator SHALL create a downloadable .pptx file using pptxgenjs on the Express.js backend within 30 seconds.
53. THE PPT_Generator SHALL include a title slide with report name, logo, and generation date.
54. THE PPT_Generator SHALL include an Executive Summary KPI slide with 5~6 key metrics.
55. THE PPT_Generator SHALL include selected charts rendered as high-resolution images.
56. THE PPT_Generator SHALL include data tables formatted for 16:9 presentation aspect ratio.
57. THE PPT_Generator SHALL support both dark (slate-900/950) and light theme templates.
58. THE Portal SHALL restrict PPT generation to Analyst and Admin roles only, returning HTTP 403 for Viewer role requests.
59. THE PPT_Generator SHALL support Claude API integration for AI-generated commentary on slides (Phase 2 feature).

### 요구사항 7: 회사 및 인력 규모 분석 (REQ-07)

**User Story:** 시장 분석가로서, 휴머노이드 로봇 회사들의 인력 규모와 구성을 분석하여 경쟁력을 평가하고 싶습니다.

#### 인수 조건

60. THE Portal SHALL store Company information: name, logo URL, country, city, founding year, main business, homepage, and valuation (USD) in PostgreSQL via Drizzle ORM.
61. THE Portal SHALL store Workforce_Data: total headcount range, estimated humanoid team size, and job_distribution (JSONB) per company.
62. THE Portal SHALL categorize workforce by job function: R&D, Software, Control_AI, Mechatronics, Operations, and Business.
63. THE Portal SHALL track TalentTrend: yearly headcount changes and job posting trends per company.
64. WHEN displaying a company profile, THE Portal SHALL show a workforce size card with headcount range.
65. WHEN displaying a company profile, THE Portal SHALL show an organization structure donut chart by job function using Recharts.
66. WHEN displaying a company profile, THE Portal SHALL show a Talent Trend line chart with yearly progression using Recharts.
67. THE Portal SHALL update workforce data monthly to quarterly with source citation stored alongside the data.
68. WHEN workforce data is unavailable or incomplete for a company, THE Portal SHALL display a placeholder card stating "인력 데이터 미등록" with a last-updated timestamp, and hide the organization donut chart and trend line chart instead of rendering empty visualizations.


### 요구사항 8: 부품 동향 분석 (REQ-08)

**User Story:** 기술 분석가로서, 휴머노이드 로봇에 사용되는 핵심 부품의 동향을 파악하고 싶습니다.

#### 인수 조건

69. THE Portal SHALL track Actuator components: type, torque (Nm), speed (rpm), weight (kg), and linked Humanoid_Robot references in PostgreSQL.
70. THE Portal SHALL track SoC/Computing components: vendor, TOPS rating, and onboard/edge/cloud location.
71. THE Portal SHALL track Sensor components: sensor type, placement, and specifications.
72. THE Portal SHALL track Power components: battery type, capacity (Wh), and charging method.
73. WHEN displaying a component detail page, THE Portal SHALL show which Humanoid_Robot products use the component as a linked list navigable to robot detail pages (REQ-03).
74. THE Portal SHALL support filtering components by type, vendor, and specification ranges via query parameters on the Express.js API.
75. THE Portal SHALL display a torque density vs weight scatter plot for actuators using Recharts.
76. THE Portal SHALL display a TOPS trend chart over time for computing components using Recharts.
77. WHEN fewer than 3 data points exist for a scatter plot or trend chart, THE Portal SHALL display the available data points with a notice: "충분한 데이터가 수집되면 트렌드가 표시됩니다 (최소 3건 필요)".

### 요구사항 9: 경영진 대시보드 — Executive Dashboard (REQ-09)

**User Story:** 경영진으로서, 분석 파이프라인이 생산한 인사이트를 탭 기반 전용 뷰에서 확인하고, 글로벌 필터로 기간/지역/세그먼트를 조절하여 전략적 의사결정에 활용하고 싶습니다.

라우트: `/executive` (기존 `/dashboard`와 독립 공존 — AggregationService 및 InsightCardsService 공유)

#### 인수 조건

78. THE Executive_Dashboard SHALL provide a GlobalFilterBar with date range (period), region, and segment filters that persist across all tabs and apply simultaneously to every visualization on the page.
79. WHEN a filter is changed in the GlobalFilterBar, THE Executive_Dashboard SHALL update all visible charts within 500ms without full page reload, using React Query cache invalidation.
80. THE Executive_Dashboard SHALL organize 10 views as horizontally navigable tabs: KPI Overview, Segment Heatmap, Market Forecast, Regional Share, Player Expansion, Workforce Comparison, Technology Radar, Investment Flow, Insight Hub, and Top Events.
81. THE Executive_Dashboard SHALL display a TimelineTrendPanel showing monthly events and product announcements on a dual-axis Recharts chart (left axis: event count bar, right axis: cumulative product line), with brush selection for date range zoom.
82. THE Executive_Dashboard SHALL display a TalentProductScatterPanel showing workforce size (x-axis) vs product count (y-axis) as an interactive Recharts scatter plot with bubble size representing company valuation, enabling identification of talent-intensive vs product-intensive players.
83. THE Segment Heatmap tab SHALL display a 3-dimensional heatmap (environment × task type × locomotion), with the primary view as environment × locomotion 2D grid and task type selectable via dropdown filter.
84. WHEN a user clicks a heatmap cell, THE Executive_Dashboard SHALL open a SegmentDetailDrawer (slide-over panel) showing the filtered list of robots in that segment with key specs, linkable to the robot detail page (REQ-03).
85. THE Executive_Dashboard SHALL consume data from the shared AggregationService and InsightCardsService used by the operational Dashboard (`/dashboard`), ensuring data consistency between the two dashboards via shared Express.js service modules.
86. WHEN insufficient data exists for any executive view, THE Executive_Dashboard SHALL follow the per-view fallback strategy: KPI cards show "—" with "데이터 수집 중"; Segment Matrix shows zero-count cells grayed-out; market forecast shows "시장 데이터 업데이트 예정"; regional share shows "지역 데이터 미등록"; workforce charts show data for available companies with count of missing entries; highlights show "이번 주 등록된 뉴스가 없습니다"; scatter/trend charts with fewer than 3 points show available data with minimum count notice; TimelineTrend shows "해당 기간 이벤트 없음" for empty periods; TalentProduct scatter shows only companies with both workforce and product data; SegmentDetailDrawer shows "해당 세그먼트에 등록된 로봇이 없습니다" for empty cells.
87. THE Executive_Dashboard SHALL be accessible to all authenticated users (Viewer, Analyst, Admin) with read-only access for Viewer role.


### 요구사항 10: 비기능 요구사항 (NFR)

**User Story:** 시스템 운영자로서, 포털이 성능, 보안, 확장성 기준을 충족하여 안정적으로 운영되기를 원합니다.

#### 인수 조건

88. THE Portal SHALL respond to search queries within 2 seconds for datasets containing up to thousands of records, with PostgreSQL index optimization on company_id, robot_id, and content_hash columns.
89. THE PPT_Generator SHALL complete .pptx file generation within 30 seconds.
90. THE Article_Analyzer SHALL complete Claude API analysis within 10 seconds.
91. THE Portal SHALL maintain API response p99 latency at 500ms or less.
92. THE Portal SHALL enforce HTTPS (TLS 1.3) across all communication channels.
93. THE Portal SHALL log all role-violation access attempts with user email, attempted action, and timestamp to an audit log table.
94. THE Portal SHALL apply signed download URLs with 1-hour validity for PPTX file downloads.
95. THE Portal SHALL support storage and querying of 1,000+ robot records, 50,000+ article records, and 100+ concurrent users.
96. THE Portal SHALL enforce quarterly refresh of robot and company data, and monthly-to-quarterly refresh of workforce data, with source citation required for all manual data entries.
97. THE Portal SHALL generate Content_Hash (SHA-256) for all articles and enforce uniqueness via database constraint to prevent duplicate storage.
98. THE Portal SHALL restrict automated data collection to public API metadata only (arXiv, SEC EDGAR, USPTO) and prohibit automatic article text scraping — manual input only.
99. THE Portal SHALL retain collection audit logs (target URL, collection timestamp) for 3 years.
100. THE Portal SHALL store AI-generated summaries separately from original article text, with AI summaries clearly marked as non-substitutes for original content.

### 요구사항 11: 대시보드 뷰별 에러 처리 및 캐시 전략 (NFR-Fallback)

**User Story:** 시스템 운영자로서, 데이터 부족이나 API 장애 시에도 대시보드가 의미 있는 폴백 상태를 표시하여 사용자 경험이 유지되기를 원합니다.

#### 인수 조건

101. WHEN an API or database failure occurs for KPI cards, THE Dashboard SHALL display the last cached value with a "stale" badge, using a cache TTL of 1 hour.
102. WHEN an API or database failure occurs for Segment_Matrix, THE Dashboard SHALL display the last cached matrix with a cache TTL of 24 hours.
103. WHEN an API or database failure occurs for market forecast or regional share charts, THE Dashboard SHALL display the last cached chart with a cache TTL of 7 days.
104. WHEN an API or database failure occurs for workforce comparison charts, THE Dashboard SHALL display the last cached value with a "stale" badge, using a cache TTL of 24 hours.
105. WHEN an API or database failure occurs for "This Week's Highlights", THE Dashboard SHALL hide the section entirely.
106. WHEN an API or database failure occurs for scatter plots or trend charts, THE Dashboard SHALL display an empty chart with a retry button.
107. WHEN an API or database failure occurs for TimelineTrendPanel, THE Executive_Dashboard SHALL display the last cached chart with a "stale" badge, using a cache TTL of 6 hours.
108. WHEN an API or database failure occurs for TalentProductScatterPanel, THE Executive_Dashboard SHALL display the last cached value with a "stale" badge, using a cache TTL of 24 hours.
109. WHEN an API or database failure occurs for SegmentDetailDrawer, THE Executive_Dashboard SHALL open the drawer with an error message and a retry button.
