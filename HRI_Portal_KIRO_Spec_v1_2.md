# HRI Portal — KIRO 작업 스펙

**휴머노이드 로봇 인텔리전스 포털**

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.2 |
| 작성일 | 2026년 2월 28일 |
| 작성 목적 | 웹 포털 구현을 위한 기능 요구사항 및 기술 스펙 정의 |
| 대상 독자 | 개발팀, PM, 기술 검토자 |
| 분류 | 내부 기술 문서 — 비공개 |

---

## 1. 프로젝트 개요

휴머노이드 로봇 인텔리전스(HRI) 포털은 휴머노이드 로봇 산업의 시장 동향을 모니터링하고 심층 분석하는 웹 애플리케이션입니다. 본 문서는 KIRO 방법론에 따라 기능 요구사항, 기술 스펙, 데이터 모델, 구현 우선순위를 정의합니다.

### 1.1 핵심 가치 제안

- 경쟁사 제품 스펙 통합 카탈로그 — 24개+ 로봇 체계적 관리
- 시장 인텔리전스 대시보드 — 시장 규모, 투자 동향, 세그먼트 분석
- AI 기반 기사 분석 — NLP 엔진을 통한 자동 요약 및 엔티티 태깅
- PPT 리포트 자동 생성 — 임원 보고 자료 즉시 생성
- 역할 기반 접근 제어 — Admin / Analyst / Viewer 3단계 권한

### 1.2 대시보드 계층 구조 및 공존 전략

HRI Portal은 두 개의 독립적인 대시보드 페이지를 운영합니다. 기존 운영 대시보드(`/dashboard`)와 경영진 대시보드(`/executive`)는 별개 라우트로 공존하며, 백엔드 데이터 소스(AggregationService, InsightCardsService)를 공유합니다.

| 항목 | 운영 대시보드 (`/dashboard`) | 경영진 대시보드 (`/executive`) |
|------|------|------|
| 대응 요구사항 | REQ-04 | REQ-09 (신규) |
| 대상 사용자 | Analyst, Admin (운영/데이터 확인) | Viewer 이상 전 역할 (전략 의사결정) |
| 레이아웃 | 12-column 3-Row 그리드 (한 화면) | 탭 기반 10개 뷰 (GlobalFilterBar 공유) |
| 데이터 소스 | `/api/dashboard/*` (기존) | `/api/executive/*` (신규, AggregationService 공유) |
| 관계 | 독립 공존 — `/executive`는 `/dashboard`를 대체하지 않음. AggregationService와 InsightCardsService를 공유 백엔드로 사용하되, 각 대시보드는 자체 프론트엔드 컴포넌트와 API 엔드포인트를 가짐. ||

---

## 2. 기술 스택 및 아키텍처

| 레이어 | 기술 | 비고 |
|--------|------|------|
| Frontend | React 18 + TypeScript | Tailwind CSS, Recharts, React Query |
| Backend | FastAPI (Python 3.11) | RESTful API, WebSocket 지원 |
| Database | PostgreSQL 15 | Supabase 또는 자체 호스팅 |
| AI/NLP | Claude API (Anthropic) | claude-sonnet-4-6 모델 사용 |
| 인증 | Supabase Auth | JWT 토큰, 이메일 허용 목록 |
| 파일 저장 | AWS S3 / Supabase Storage | 이미지, 생성 PPTX 저장 |
| PPT 생성 | python-pptx (서버 사이드) | 다크/라이트 테마 지원 |
| 크롤러 | Python Celery + Redis | arXiv, SEC EDGAR, USPTO API |
| 배포 | Docker + AWS ECS | CI/CD: GitHub Actions |
| 모니터링 | Sentry + Datadog | 오류 추적 및 성능 모니터링 |

---

## 3. KIRO 기능 요구사항

각 요구사항은 KIRO(Key Implementation Requirements & Operations) 형식으로 정의됩니다. 모든 Acceptance Criteria는 SHALL 키워드를 포함한 검증 가능한 조건으로 작성됩니다.

### [REQ-01] 사용자 인증 및 역할 기반 접근 제어

> **User Story:** *시스템 관리자로서, 역할 기반 접근 제어를 통해 민감한 경쟁 인텔리전스 데이터를 보호하고 싶습니다.*

**Acceptance Criteria:**

1. THE Portal SHALL implement role-based access control with three distinct roles: Admin, Analyst, and Viewer.
2. WHEN a user attempts to log in, THE Portal SHALL verify the email against the Allowed_Emails list before granting access.
3. WHEN an Admin user accesses the system, THE Portal SHALL allow data entry, modification, and tag management functions.
4. WHEN an Analyst user accesses the system, THE Portal SHALL allow report creation and memo/insight addition, but restrict data modification.
5. WHEN a Viewer user accesses the system, THE Portal SHALL allow only search and dashboard viewing functions.
6. WHEN a user without appropriate role attempts restricted functions, THE Portal SHALL deny access and log the attempt.
7. THE Portal SHALL support session management with secure JWT token-based authentication with 24h expiry.

### [REQ-02] 휴머노이드 로봇 카탈로그

> **User Story:** *제품 관리자로서, 다양한 기준으로 휴머노이드 로봇을 필터링하고 비교하여 시장 현황을 파악하고 싶습니다.*

**Acceptance Criteria:**

8. THE Catalog SHALL organize Humanoid_Robot products with filtering by purpose: Industrial, Home, and Service.
9. THE Catalog SHALL support filtering by locomotion type: Bipedal, Wheeled, and Hybrid.
10. THE Catalog SHALL support filtering by hand type: Gripper, Multi_Finger_Hand, and Interchangeable.
11. THE Catalog SHALL support filtering by commercialization stage: Concept, Prototype, PoC, Pilot, and Commercial.
12. THE Catalog SHALL support filtering by region: North_America, Europe, China, Japan, Korea, and Other.
13. WHEN a user applies multiple filters, THE Catalog SHALL return results matching ALL applied filter criteria.
14. THE Catalog SHALL display results as product cards with key specifications visible.
15. THE Catalog SHALL support sorting by name, company, release year, and commercialization stage.
16. THE Catalog SHALL display a performance radar chart for each robot showing 6 key metrics.
17. WHEN a user performs a search query, THE Portal SHALL return results within 2 seconds.

### [REQ-03] 로봇 상세 스펙 페이지

> **User Story:** *R&D 엔지니어로서, 휴머노이드 로봇의 상세 스펙을 확인하여 벤치마킹에 활용하고 싶습니다.*

**Acceptance Criteria:**

18. WHEN displaying a Humanoid_Robot detail page, THE Portal SHALL show: name, company, announcement year, status.
19. WHEN displaying Body_Spec, THE Portal SHALL show: height (cm), weight (kg), payload (kg), DoF count, max speed (m/s), operation time.
20. WHEN displaying Hand_Spec, THE Portal SHALL show: hand type, finger count, hand DoF, grip force (N), interchangeability.
21. WHEN displaying Computing_Spec, THE Portal SHALL show: main SoC, TOPS range, architecture type.
22. WHEN displaying Sensor_Spec, THE Portal SHALL show: camera specs, depth sensor, LiDAR, IMU, force-torque sensors.
23. WHEN displaying Power_Spec, THE Portal SHALL show: battery type, capacity (Wh), operation time, charging method.
24. THE Portal SHALL allow Admin users to edit all specification fields inline.
25. THE Portal SHALL display related articles and news for each Humanoid_Robot.
26. THE Portal SHALL display a performance radar chart comparing the robot against segment averages.

### [REQ-04] 분석 대시보드

> **User Story:** *경영진으로서, 휴머노이드 로봇 시장의 주요 지표를 시각적으로 확인하여 전략적 의사결정에 활용하고 싶습니다.*

**Acceptance Criteria:**

27. THE Dashboard SHALL display a Segment_Matrix showing environment (Industrial / Home / Service) × task type × locomotion type as a multi-dimensional heatmap, with the primary view as environment × locomotion 2D grid and task type available as a drill-down dimension.
28. THE Dashboard SHALL provide a GlobalFilterBar component with period (date range), region, and segment filters that apply simultaneously to all charts and visualizations on the page.
29. THE Dashboard SHALL display a hand type distribution chart across all cataloged robots.
30. THE Dashboard SHALL display workforce size vs segment chart.
31. THE Dashboard SHALL display Top N humanoid players workforce comparison chart.
32. THE Dashboard SHALL display a global market forecast bar chart (2024~2030).
33. THE Dashboard SHALL display a regional market share pie chart.
34. THE Dashboard SHALL support both dark and light theme options.
35. THE Dashboard SHALL include a "This Week's Highlights" marquee section.
36. WHEN new data is added, THE Dashboard SHALL reflect updates within the next scheduled refresh cycle (≤24h).
37. WHEN insufficient data exists for any chart or visualization, THE Dashboard SHALL display an empty chart placeholder with an informational message indicating the required data type and minimum data count.
38. WHEN the Segment_Matrix has no robot data for a cell, THE Dashboard SHALL display the cell as zero-count with distinct visual styling (e.g., grayed-out) rather than omitting the cell.
39. WHEN a user clicks a Segment_Matrix cell, THE Dashboard SHALL open a SegmentDetailDrawer (slide-over panel) showing the list of robots in that segment with key specs, and the drawer SHALL be dismissible without losing the current filter state.

### [REQ-05] 기사 분석 도구 (Article Analyzer)

> **User Story:** *데이터 분석가로서, 기사 원문을 붙여넣으면 AI가 자동으로 요약하고 관련 회사/제품을 태깅해주는 도구를 사용하고 싶습니다.*

**Acceptance Criteria:**

40. THE Article_Analyzer SHALL provide a text input area for pasting article content (max 50,000 chars).
41. WHEN article content is submitted, THE Article_Analyzer SHALL call Claude API to generate a structured summary within 10 seconds.
42. WHEN generating summary, THE Article_Analyzer SHALL extract: mentioned companies, products, key technologies, market insights.
43. WHEN companies or products are mentioned, THE Article_Analyzer SHALL suggest matching entities from database for tagging.
44. THE Article_Analyzer SHALL provide simultaneous access to the original text, AI summary, and extracted metadata without requiring navigation between views.
45. WHEN storing article, THE Portal SHALL generate Content_Hash (SHA-256) and check for duplicates.
46. WHEN duplicate Content_Hash is detected, THE Portal SHALL notify user and skip storage.
47. THE Portal SHALL store audit trail: submitter email, submission timestamp.
48. THE NLP_Engine SHALL support both Korean and English language processing.

### [REQ-06] PPT 리포트 생성

> **User Story:** *전략팀 멤버로서, 선택한 데이터와 차트를 파워포인트 형식으로 다운로드하여 경영진 프레젠테이션 자료를 만들고 싶습니다.*

**Acceptance Criteria:**

49. THE PPT_Generator SHALL allow users to select specific robots (checkbox list) for inclusion in the report.
50. THE PPT_Generator SHALL allow users to select specific charts and visualizations for inclusion.
51. WHEN generating a report, THE PPT_Generator SHALL create a downloadable .pptx file within 30 seconds.
52. THE PPT_Generator SHALL include a title slide with report name, logo, and generation date.
53. THE PPT_Generator SHALL include Executive Summary KPI slide with 5~6 key metrics.
54. THE PPT_Generator SHALL include selected charts rendered as high-resolution images.
55. THE PPT_Generator SHALL include data tables formatted for 16:9 presentation.
56. THE PPT_Generator SHALL support both dark and light theme templates.
57. THE Portal SHALL restrict PPT generation to Analyst and Admin users only.
58. THE PPT_Generator SHALL support Claude API integration for AI-generated commentary (Phase 2).

### [REQ-07] 회사 및 인력 규모 분석

> **User Story:** *시장 분석가로서, 휴머노이드 로봇 회사들의 인력 규모와 구성을 분석하여 경쟁력을 평가하고 싶습니다.*

**Acceptance Criteria:**

59. THE Portal SHALL store Company info: name, logo URL, country, city, founding year, main business, homepage.
60. THE Portal SHALL store Workforce_Data: total headcount range, estimated humanoid team size, job_distribution (JSON).
61. THE Portal SHALL categorize workforce by job function: R&D, Software, Control_AI, Mechatronics, Operations, Business.
62. THE Portal SHALL track TalentTrend: yearly headcount changes and job posting trends.
63. WHEN displaying company profile, THE Portal SHALL show workforce size card with headcount range.
64. WHEN displaying company profile, THE Portal SHALL show organization structure donut chart by job function.
65. WHEN displaying company profile, THE Portal SHALL show Talent Trend line chart with yearly progression.
66. THE Portal SHALL update workforce data monthly to quarterly with source citation.
67. WHEN workforce data is unavailable or incomplete for a company, THE Portal SHALL display a placeholder card stating "인력 데이터 미등록" with a last-updated timestamp, and hide the organization donut chart and trend line chart instead of rendering empty visualizations.

### [REQ-08] 부품 동향 분석

> **User Story:** *기술 분석가로서, 휴머노이드 로봇에 사용되는 핵심 부품의 동향을 파악하고 싶습니다.*

**Acceptance Criteria:**

68. THE Portal SHALL track Actuator components: type, torque (Nm), speed (rpm), weight (kg), linked humanoid robots.
69. THE Portal SHALL track SoC/Computing components: vendor, TOPS rating, onboard/edge/cloud location.
70. THE Portal SHALL track Sensor components: sensor type, placement, specifications.
71. THE Portal SHALL track Power components: battery type, capacity (Wh), charging method.
72. WHEN displaying component detail, THE Portal SHALL show which Humanoid_Robot products use the component.
73. THE Portal SHALL support filtering components by type, vendor, and specification ranges.
74. THE Portal SHALL display a torque density vs weight scatter plot for actuators.
75. THE Portal SHALL display a TOPS trend chart over time for computing components.
76. WHEN fewer than 3 data points exist for a scatter plot or trend chart, THE Portal SHALL display the available data points with a notice: "충분한 데이터가 수집되면 트렌드가 표시됩니다 (최소 3건 필요)".

### [REQ-09] 경영진 대시보드 (Executive Dashboard)

> **User Story:** *경영진으로서, 분석 파이프라인이 생산한 인사이트를 탭 기반 전용 뷰에서 확인하고, 글로벌 필터로 기간/지역/세그먼트를 조절하여 전략적 의사결정에 활용하고 싶습니다.*
>
> **라우트:** `/executive` (기존 `/dashboard`와 독립 공존 — 섹션 1.2 참조)

**Acceptance Criteria:**

77. THE Executive_Dashboard SHALL provide a GlobalFilterBar with date range (period), region, and segment filters that persist across all tabs and apply simultaneously to every visualization on the page.
78. WHEN a filter is changed in the GlobalFilterBar, THE Executive_Dashboard SHALL update all visible charts within 500ms without full page reload.
79. THE Executive_Dashboard SHALL organize 10 views as horizontally navigable tabs: KPI Overview, Segment Heatmap, Market Forecast, Regional Share, Player Expansion, Workforce Comparison, Technology Radar, Investment Flow, Insight Hub, and Top Events.
80. THE Executive_Dashboard SHALL display a TimelineTrendPanel showing monthly events and product announcements on a dual-axis chart (left axis: event count bar, right axis: cumulative product line), with brush selection for date range zoom.
81. THE Executive_Dashboard SHALL display a TalentProductScatterPanel showing workforce size (x-axis) vs product count (y-axis) as an interactive scatter plot with bubble size representing company valuation, enabling identification of talent-intensive vs product-intensive players.
82. THE Segment Heatmap tab SHALL display a 3-dimensional heatmap (environment × task type × locomotion), with the primary view as environment × locomotion 2D grid and task type selectable via dropdown filter.
83. WHEN a user clicks a heatmap cell, THE Executive_Dashboard SHALL open a SegmentDetailDrawer (slide-over panel) showing the filtered list of robots in that segment with key specs, linkable to the robot detail page (REQ-03).
84. THE Executive_Dashboard SHALL consume data from the shared AggregationService and InsightCardsService used by /dashboard, ensuring data consistency between the two dashboards.
85. WHEN insufficient data exists for any executive view, THE Executive_Dashboard SHALL follow the per-view fallback strategy defined in section 8.4, displaying view-specific empty states rather than a generic error.
86. THE Executive_Dashboard SHALL be accessible to all authenticated users (Viewer, Analyst, Admin) with read-only access for Viewer role.

---

## 4. 데이터 모델 정의

### 4.1 Humanoid_Robot

| 필드명 | 데이터 타입 | 비고 |
|--------|-------------|------|
| robot_id | UUID | PK, auto-generated |
| name | VARCHAR(200) | NOT NULL |
| company_id | UUID | FK → Company |
| announcement_year | INTEGER | |
| status | VARCHAR(50) | active / discontinued |
| purpose | ENUM | Industrial / Home / Service |
| locomotion_type | ENUM | Bipedal / Wheeled / Hybrid |
| hand_type | ENUM | Gripper / Multi_Finger / Interchangeable |
| commercialization_stage | ENUM | Concept / Prototype / PoC / Pilot / Commercial |
| region | ENUM | North_America / Europe / China / Japan / Korea / Other |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | ON UPDATE NOW() |

### 4.2 Body_Spec

| 필드명 | 데이터 타입 | 비고 |
|--------|-------------|------|
| spec_id | UUID | PK |
| robot_id | UUID | FK → Humanoid_Robot |
| height_cm | DECIMAL(5,1) | |
| weight_kg | DECIMAL(5,1) | |
| payload_kg | DECIMAL(5,1) | |
| dof_count | INTEGER | body DoF only |
| hand_dof | INTEGER | per hand |
| max_speed_mps | DECIMAL(4,2) | |
| operation_time_hours | DECIMAL(4,1) | |

### 4.3 Company

| 필드명 | 데이터 타입 | 비고 |
|--------|-------------|------|
| company_id | UUID | PK |
| name | VARCHAR(200) | NOT NULL |
| logo_url | TEXT | |
| country | VARCHAR(100) | |
| city | VARCHAR(100) | |
| founding_year | INTEGER | |
| main_business | TEXT | |
| homepage_url | TEXT | |
| valuation_usd | BIGINT | latest known valuation |

### 4.4 Article

| 필드명 | 데이터 타입 | 비고 |
|--------|-------------|------|
| article_id | UUID | PK |
| title | VARCHAR(500) | |
| source | VARCHAR(200) | |
| url | TEXT | UNIQUE |
| published_at | TIMESTAMP | |
| content | TEXT | original text (if entered) |
| summary | TEXT | AI-generated |
| language | CHAR(2) | ko / en |
| content_hash | CHAR(64) | SHA-256, UNIQUE |
| related_company_ids | JSONB | [] |
| related_robot_ids | JSONB | [] |
| extracted_metadata | JSONB | {} |
| submitted_by | UUID | FK → User |
| submitted_at | TIMESTAMP | |

### 4.5 Entity_Alias

| 필드명 | 데이터 타입 | 비고 |
|--------|-------------|------|
| alias_id | UUID | PK |
| entity_type | ENUM | company / robot |
| entity_id | UUID | FK → Company or Humanoid_Robot |
| alias_name | VARCHAR(300) | 별칭 (예: "BD", "보스턴 다이나믹스") |
| language | CHAR(2) | ko / en / zh (NULL = 전체) |

---

## 5. REST API 엔드포인트 정의

### 5.1 인증 (Auth)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/auth/login` | 이메일 로그인 (Allowed_Emails 검증) |
| POST | `/api/auth/logout` | 세션 종료 |
| GET | `/api/auth/me` | 현재 사용자 정보 |

### 5.2 로봇 카탈로그 (Robots)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/robots` | 목록 조회 (필터, 정렬, 페이지네이션) |
| GET | `/api/robots/{robot_id}` | 상세 조회 |
| POST | `/api/robots` | 신규 등록 (Admin) |
| PATCH | `/api/robots/{robot_id}` | 정보 수정 (Admin) |
| GET | `/api/robots/{robot_id}/specs` | 전체 스펙 조회 |
| PUT | `/api/robots/{robot_id}/specs/body` | Body Spec 수정 (Admin) |

### 5.3 기업 (Companies)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/companies` | 목록 조회 |
| GET | `/api/companies/{company_id}` | 상세 + 인력 데이터 |
| GET | `/api/companies/{company_id}/workforce` | 인력 트렌드 |
| POST | `/api/companies` | 신규 등록 (Admin) |

### 5.4 기사 분석 (Articles)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/articles/analyze` | AI 분석 요청 (Claude API 호출) |
| POST | `/api/articles` | 기사 저장 (분석 결과 포함) |
| GET | `/api/articles` | 목록 조회 |
| GET | `/api/articles/{article_id}` | 상세 조회 |

### 5.5 리포트 (Reports)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/reports/pptx` | PPT 생성 요청 (Analyst+) |
| GET | `/api/reports/{report_id}/download` | PPTX 파일 다운로드 |
| GET | `/api/reports` | 생성 리포트 목록 |

### 5.6 대시보드 (Dashboard)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/dashboard/kpis` | KPI 지표 (시장규모 등) |
| GET | `/api/dashboard/segment-matrix` | 세그먼트 매트릭스 |
| GET | `/api/dashboard/highlights` | 이번 주 하이라이트 |

### 5.7 경영진 대시보드 (Executive)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/executive/overview` | KPI 카드 + 인사이트 요약 |
| GET | `/api/executive/segment-heatmap` | 3D 세그먼트 히트맵 데이터 |
| GET | `/api/executive/segment-heatmap/{cell}/robots` | 셀 클릭 드릴다운 (SegmentDetailDrawer) |
| GET | `/api/executive/timeline-trend` | 월별 이벤트/제품 이중축 차트 |
| GET | `/api/executive/talent-product-scatter` | 인력 vs 제품 산점도 |
| GET | `/api/executive/player-expansion` | 플레이어 확장 추이 타임라인 |

> *모든 `/api/executive/*` 엔드포인트는 `?period=&region=&segment=` 쿼리 파라미터를 통해 GlobalFilterBar 필터 값을 수신합니다.*

---

## 6. 구현 우선순위 및 로드맵

### Phase 1 — MVP (4주)

**우선순위: P0 필수 기능**

- 역할 기반 인증 (REQ-01)
- 로봇 카탈로그 CRUD + 필터 (REQ-02)
- 로봇 상세 스펙 페이지 (REQ-03)
- 기본 대시보드 — 시장 규모, 세그먼트 (REQ-04)
- 수동 기사 입력 + 중복 방지 (REQ-05)

### Phase 2 — 핵심 기능 (4주)

**우선순위: P1 고우선순위**

- AI 기사 분석 — Claude API 연동 (REQ-05)
- PPT 리포트 생성 다크/라이트 (REQ-06)
- 기업 + 인력 분석 페이지 (REQ-07)
- 부품 동향 기본 (REQ-08)
- 키워드 트렌드 NLP (REQ-05 확장)
- 경영진 대시보드 — GlobalFilterBar, 10개 뷰 탭 (REQ-09)

### Phase 3 — 고도화 (4주)

**우선순위: P2 기능 강화**

- 적용 사례 타임라인 (REQ-08 확장)
- RFM 레이더/버블 차트 고급 시각화
- Claude API 활용 AI 코멘터리 PPT
- arXiv / SEC EDGAR 메타데이터 크롤러
- 데이터 내보내기 CSV / Excel
- 경영진 대시보드 고급 뷰: TimelineTrendPanel, TalentProductScatterPanel (REQ-09 확장)
- SegmentDetailDrawer 드릴다운 + 로봇 상세 연결 (REQ-09)

---

## 7. 비기능 요구사항 (Non-Functional Requirements)

### 7.1 성능

- 검색 쿼리 응답시간 ≤ 2초 (데이터셋 수천 건)
- PPT 생성 완료 시간 ≤ 30초
- Claude API 기사 분석 ≤ 10초
- API 응답 p99 ≤ 500ms

### 7.2 보안

- JWT 토큰 만료 24시간, Refresh Token 14일
- Allowed_Emails 화이트리스트 기반 인증
- HTTPS 전 구간 적용 (TLS 1.3)
- 역할 위반 접근 시도 전건 감사 로그 기록
- PPTX 파일 다운로드 URL 서명 토큰 적용 (1시간 유효)

### 7.3 확장성

- 로봇 데이터 1,000건 이상 지원
- 기사 데이터 50,000건 이상 지원
- 동시 사용자 100명 이상 지원
- PostgreSQL 인덱스 최적화 (company_id, robot_id, content_hash)

### 7.4 데이터 품질

- 로봇/기업 데이터 분기별 갱신 의무화
- 인력 데이터 월~분기 갱신
- Content_Hash(SHA-256) 기반 중복 방지
- 모든 수동 입력 데이터에 출처(source) 필드 필수

### 7.5 합법성

- 공개 API(arXiv, SEC EDGAR, USPTO) 메타데이터만 자동 수집
- 기사 원문 자동 스크래핑 금지 — 수동 입력만 허용
- 수집 대상 URL, 수집 시각 감사 로그 보존 (3년)
- AI 요약은 원문 대체 불가 — 별도 저장

---

## 8. Claude API 연동 스펙

본 포털은 Anthropic의 Claude API를 핵심 AI 엔진으로 활용합니다.

### 8.1 사용 모델

| 기능 | 모델 | 비고 |
|------|------|------|
| 기사 AI 분석 요약 | claude-sonnet-4-6 | max_tokens: 2000 |
| 엔티티 태깅 추출 | claude-sonnet-4-6 | JSON 구조화 출력 |
| PPT 코멘터리 생성 (Phase 2) | claude-sonnet-4-6 | max_tokens: 1000 |
| 키워드 트렌드 해석 | claude-haiku-4-5-20251001 | 고속 처리 필요 |

### 8.2 기사 분석 프롬프트 구조

```
System: "You are an expert analyst for the humanoid robotics industry. Analyze the provided article and extract structured information in JSON format."

User: "Article text: {article_text}

Extract:
1. summary: 3-5 sentence summary in Korean
2. mentioned_companies: list of company names
3. mentioned_robots: list of robot product names
4. key_technologies: list of technology keywords
5. market_insights: list of market trend statements

Respond ONLY with valid JSON."
```

### 8.3 엔티티 링킹 (EntityLinker) Fuzzy 매칭 전략

AI 분석 결과에서 추출된 기업/제품명을 기존 데이터베이스 엔티티와 매칭할 때, 오타나 약칭으로 인한 불일치를 처리하기 위해 fuzzy 매칭을 적용합니다.

| 항목 | 결정 사항 | 근거 |
|------|-----------|------|
| 매칭 엔진 | PostgreSQL pg_trgm 확장 (DB 레벨) | 엔티티 수 1,000건 이하에서 DB 인덱스 활용이 효율적, 별도 서비스 불필요 |
| 유사도 알고리즘 | Trigram 유사도 (`similarity()`) | 한글/영문 혼합 환경에서 Levenshtein 대비 부분 일치에 강점 |
| 임계값 | 자동 매칭 ≥ 0.7, 후보 제안 ≥ 0.4 | 0.7 이상은 높은 신뢰도 자동 처리, 0.4~0.7은 사용자 확인 요청 |
| 인덱스 | GIN 인덱스 (company.name, humanoid_robot.name) | trigram 검색 성능 최적화를 위해 GIN 인덱스 필수 |
| 별칭(Alias) 지원 | entity_aliases 테이블 별도 운영 | "Boston Dynamics" ↔ "보스턴 다이나믹스" ↔ "BD" 등 다국어 별칭 관리 |

### 8.4 대시보드 뷰별 에러 처리 및 폴백 전략

각 대시보드 뷰는 데이터 부족, API 장애 등 에러 상황에서 뷰별 특성에 맞는 폴백(fallback) 동작을 수행합니다.

| 뷰 | 데이터 부족 시 | API/DB 장애 시 | 캐시 TTL |
|----|---------------|---------------|----------|
| KPI 카드 (4종) | "—" 표시 + "데이터 수집 중" | 마지막 캐시 값 표시 + stale 배지 | 1h |
| Segment Matrix | 빈 셀은 0 표시 + 회색 처리 | 마지막 캐시 매트릭스 표시 | 24h |
| 시장 전망 바 차트 | "시장 데이터 업데이트 예정" 안내 | 마지막 캐시 차트 표시 | 7d |
| 지역별 시장 점유율 | "지역 데이터 미등록" 표시 | 마지막 캐시 차트 표시 | 7d |
| 인력 비교 차트 | 데이터 있는 기업만 표시 + 미등록 수 안내 | 마지막 캐시 값 + stale 배지 | 24h |
| This Week's Highlights | "이번 주 등록된 뉴스가 없습니다" | 섹션 숨김 처리 | 1h |
| 토크 밀도 Scatter Plot | 3건 미만 시 점만 표시 + 최소 3건 안내 | 빈 차트 + 재시도 버튼 | 24h |
| TOPS 트렌드 라인 | 3건 미만 시 점만 표시 + 최소 3건 안내 | 빈 차트 + 재시도 버튼 | 24h |
| TimelineTrend 이중축 | 기간 내 이벤트 0건 시 빈 차트 + "해당 기간 이벤트 없음" | 마지막 캐시 차트 + stale 배지 | 6h |
| TalentProduct Scatter | 인력+제품 둘 다 있는 기업만 표시 + 미등록 수 안내 | 마지막 캐시 값 + stale 배지 | 24h |
| SegmentDetail Drawer | 셀 데이터 0건 시 "해당 세그먼트에 등록된 로봇이 없습니다" | Drawer 열림 + 에러 메시지 + 재시도 | N/A |

---

## 9. 용어 사전 (Glossary)

| 용어 | 정의 |
|------|------|
| HRI Portal | 휴머노이드 로봇 인텔리전스 포털 웹 애플리케이션 |
| Humanoid_Robot | 휴머노이드 로봇 제품 엔티티 |
| Body_Spec | 신장, 중량, DoF 등 신체 관련 스펙 |
| Hand_Spec | 타입, 손가락 수, Grip force 등 손 관련 스펙 |
| Computing_Spec | SoC, TOPS, 아키텍처 등 컴퓨팅 스펙 |
| Segment_Matrix | 환경 × 작업 유형 × 이동 방식 3차원 분석 매트릭스 (기본 뷰: 환경 × 이동 방식 2D) |
| Content_Hash | 기사 콘텐츠 중복 확인용 SHA-256 해시값 |
| NLP_Engine | 키워드 추출 및 AI 요약을 위한 자연어 처리 엔진 (Claude API) |
| PPT_Generator | 파워포인트 리포트 생성 서비스 (python-pptx) |
| Allowed_Emails | 로그인 허용된 이메일 주소 화이트리스트 |
| KIRO | Key Implementation Requirements & Operations — 요구사항 정의 방법론 |
| TOPS | Tera Operations Per Second — AI 추론 성능 단위 |
| DoF | Degrees of Freedom — 자유도 |
| RaaS | Robot as a Service — 로봇 구독 서비스 모델 |
| RFM | Robot Foundation Model — 로봇 기반 AI 모델 |
| Fleet AI | 다중 로봇 간 실시간 학습 공유 시스템 |
| EntityLinker | AI 추출 엔티티명을 DB 기존 엔티티와 fuzzy 매칭하는 모듈 |
| pg_trgm | PostgreSQL trigram 유사도 검색 확장 모듈 — GIN 인덱스 기반 fuzzy 매칭 지원 |
| GlobalFilterBar | 기간/지역/세그먼트 공통 필터 바 — 경영진 대시보드 전체 뷰에 적용 |
| TimelineTrendPanel | 월별 이벤트/제품 발표를 이중 축(바+라인)으로 표시하는 경영진 뷰 패널 |
| TalentProductScatterPanel | 인력 규모(x) vs 제품 수(y) 산점도 — 버블 크기는 기업 가치 반영 |
| SegmentDetailDrawer | 히트맵 셀 클릭 시 열리는 슬라이드오버 패널 — 세그먼트 내 로봇 목록 표시 |
| AggregationService | 운영/경영진 대시보드가 공유하는 데이터 집계 백엔드 서비스 |

---

## 10. UI 화면 와이어프레임

본 섹션은 HRI Portal의 5개 주요 화면에 대한 UI 와이어프레임을 제공합니다. 각 화면은 역할 기반 접근 제어(REQ-01)를 반영하며, 사용자 경험(UX) 설계 기준으로 활용됩니다.

### WF-01 | 대시보드 (Dashboard)

REQ-04 대응 화면. 상단 KPI 카드 4종(시장 규모, 등록 로봇, 분석 기업, 수집 아티클), 글로벌 HRI 시장 전망 바 차트(2024-2030), 세그먼트 매트릭스 히트맵(환경 × 이동방식), 지역별 시장 점유율, 주요 뉴스 하이라이트로 구성됩니다.

### WF-02 | 로봇 카탈로그 (Robot Catalog)

REQ-02 대응 화면. 좌측 필터 사이드바(목적, 이동방식, 개발단계, 지역), 상단 검색바 및 정렬, 3열 카드 그리드로 구성됩니다. 각 카드에는 로봇 이미지, 이름/제조사, 개발단계 배지, 주요 스펙(DoF/탑재/SoC), RFM 레이더 미니 차트, 상세보기/비교 추가 버튼이 포함됩니다.

### WF-03 | 로봇 상세 페이지 (Robot Detail)

REQ-03 대응 화면. 브레드크럼 네비게이션, 로봇명/제조사/연도/지역/태그 헤더(Admin 편집 버튼 포함), 좌측 컬럼에 로봇 이미지와 RFM 레이더(세그먼트 평균 비교선 포함), 우측 컬럼에 신체/손/컴퓨팅/센서/전원 스펙 탭, 하단 관련 아티클 목록으로 구성됩니다.

### WF-04 | 아티클 분석 (Article Analysis)

REQ-05 대응 화면. 좌측 패널에 URL 입력 또는 직접 텍스트 입력, 언어 선택(한국어/영어/중국어), AI 분석 실행/수동 저장 버튼, Claude AI 분석 결과(요약, 언급 기업 배지, 키워드 태그, 신뢰도 바, 관련 로봇/기업)가 포함됩니다. 우측 패널에는 아티클 목록과 AI요약/수동입력 필터가 표시됩니다.

### WF-05 | PPT 리포트 생성 (Report Generator)

REQ-06 대응 화면. 좌측 패널에 리포트 제목 입력, 포함 슬라이드 선택(10종), 다크/라이트 테마 선택, PPT 생성 버튼이 있습니다. 우측 상단은 슬라이드 미리보기(드래그 순서 변경 지원), 우측 하단은 생성 이력(상태, 테마, 다운로드 버튼 포함)으로 구성됩니다.

---

*— 문서 끝 —*
