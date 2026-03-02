# 요구사항 문서 — 휴머노이드 동향 대시보드

## 소개

휴머노이드 동향 대시보드는 HRI Portal 내 전용 페이지(`/humanoid-trend`)로, 휴머노이드 로봇 산업의 경쟁 인텔리전스 차트 6종을 웹에서 시각화하고 PPT 리포트로 다운로드할 수 있는 기능입니다. 산업용 PoC 팩터별 역량 비교, RFM 역량 비교, 포지셔닝 맵(버블 차트), SoC 에코시스템 맵, 핵심 스펙 바 차트 등 6개 슬라이드에 해당하는 차트를 제공합니다. 데이터는 PostgreSQL에 저장되며 Admin이 관리할 수 있습니다.

## 용어 사전

- **Portal**: HRI 휴머노이드 로봇 인텔리전스 포털 웹 애플리케이션 (Express.js 백엔드, Next.js 프론트엔드)
- **Trend_Dashboard**: 휴머노이드 동향 대시보드 페이지 (`/humanoid-trend`)
- **Radar_Chart**: 다축 레이더 차트 — 6개 축에 대한 역량 점수를 다각형으로 시각화
- **Bubble_Chart**: 버블 차트 — X축, Y축, 버블 크기의 3차원 데이터를 산점도 형태로 시각화
- **Bar_Chart**: 막대 차트 — 로봇별 단일 스펙 값을 수평/수직 막대로 비교
- **PoC_Factor**: 산업용 PoC 평가 6개 팩터 — 페이로드, 운용시간, 핑거 DoF, 폼팩터, PoC 배포, 가성비
- **RFM_Factor**: Robot Foundation Model 평가 6개 팩터 — 범용성, 실세계 데이터, 엣지 추론, 멀티로봇 협업, 오픈소스 개방성, 상용 성숙도
- **PoC_Score**: 로봇별 PoC 6-Factor 점수 데이터 (각 팩터 1~10 스케일)
- **RFM_Score**: 로봇/RFM 모델별 RFM 6-Factor 점수 데이터 (각 팩터 1~5 스케일)
- **Positioning_Data**: 버블 차트용 포지셔닝 데이터 (X값, Y값, 버블 크기, 라벨)
- **SoC_Ecosystem_Data**: TOPS × SoC 에코시스템 포지셔닝 데이터 (SoC 수준, TOPS, 출하 규모, 국가)
- **PPT_Generator**: 파워포인트 리포트 생성 서비스 (pptxgenjs, Express.js 서버사이드)
- **Admin**: 데이터 입력/수정 권한을 가진 사용자
- **Analyst**: 리포트 생성 권한을 가진 사용자
- **Viewer**: 대시보드 조회만 가능한 사용자

## 요구사항

### 요구사항 1: 휴머노이드 동향 데이터 모델

**User Story:** 개발자로서, 6종 차트에 필요한 평가 점수 및 포지셔닝 데이터를 체계적으로 저장하고 관리하고 싶습니다.

#### 인수 조건

1. THE Portal SHALL store PoC_Score entities with fields: robot_id (FK to humanoid_robots), payload_score (1–10), operation_time_score (1–10), finger_dof_score (1–10), form_factor_score (1–10), poc_deployment_score (1–10), cost_efficiency_score (1–10), and evaluated_at timestamp.
2. THE Portal SHALL store RFM_Score entities with fields: robot_id (FK to humanoid_robots), rfm_model_name, generality_score (1–5), real_world_data_score (1–5), edge_inference_score (1–5), multi_robot_collab_score (1–5), open_source_score (1–5), commercial_maturity_score (1–5), and evaluated_at timestamp.
3. THE Portal SHALL store Positioning_Data entities with fields: chart_type (enum: rfm_competitiveness, poc_positioning, soc_ecosystem), robot_id (FK to humanoid_robots, nullable), label, x_value (decimal), y_value (decimal), bubble_size (decimal), color_group (varchar), metadata (JSONB), and evaluated_at timestamp.
4. THE Portal SHALL enforce referential integrity between PoC_Score, RFM_Score, Positioning_Data and the humanoid_robots table via foreign key constraints with CASCADE delete.
5. THE Portal SHALL create database indexes on robot_id and chart_type columns for Positioning_Data to support query performance within 2 seconds.

### 요구사항 2: 산업용 PoC 팩터별 역량 비교 — 개별 레이더 차트

**User Story:** 시장 분석가로서, 각 휴머노이드 로봇의 산업용 PoC 6-Factor 역량을 개별 레이더 차트로 확인하여 로봇별 강약점을 파악하고 싶습니다.

#### 인수 조건

6. THE Trend_Dashboard SHALL display individual Radar_Chart for each robot with 6 axes: 페이로드(Payload), 운용시간(Operating Time), 핑거 DoF(Finger DoF), 폼팩터(Form Factor), PoC 배포(PoC Deployment), 가성비(Cost Efficiency).
7. WHEN rendering each individual Radar_Chart, THE Trend_Dashboard SHALL display the robot name, company name, and average score (arithmetic mean of 6 factors, rounded to 1 decimal place) as a label.
8. THE Trend_Dashboard SHALL render individual Radar_Chart components in a responsive grid layout (3 columns on desktop, 2 columns on tablet, 1 column on mobile).
9. WHEN PoC_Score data is unavailable for a robot, THE Trend_Dashboard SHALL display a placeholder card with the message "PoC 평가 데이터 미등록" instead of an empty chart.
10. THE Trend_Dashboard SHALL use Recharts RadarChart component with consistent color coding per robot across all chart types.

### 요구사항 3: RFM 역량 비교 — 오버레이 레이더 차트

**User Story:** 기술 분석가로서, 7개 로봇/RFM 모델의 역량을 하나의 레이더 차트에 오버레이하여 한눈에 비교하고 싶습니다.

#### 인수 조건

11. THE Trend_Dashboard SHALL display a single Radar_Chart with all RFM-scored robots overlaid, using 6 axes: 범용성(Generality), 실세계 데이터(Real-world Data), 엣지 추론(Edge Inference), 멀티로봇 협업(Multi-robot Collaboration), 오픈소스 개방성(Open Source), 상용 성숙도(Commercial Maturity).
12. THE Trend_Dashboard SHALL assign a distinct color and legend entry to each robot/RFM model on the overlay Radar_Chart, with a maximum of 10 overlaid series.
13. WHEN a user hovers over a data point on the overlay Radar_Chart, THE Trend_Dashboard SHALL display a tooltip showing the robot name, RFM model name, and the score value for that axis.
14. THE Trend_Dashboard SHALL display a legend below the overlay Radar_Chart listing each robot with its assigned color and RFM model name in parentheses.
15. WHEN fewer than 2 RFM_Score records exist, THE Trend_Dashboard SHALL display the available data with a notice: "비교를 위해 최소 2개 이상의 RFM 데이터가 필요합니다."

### 요구사항 4: RFM 경쟁력 포지셔닝 맵 — 버블 차트

**User Story:** 경영진으로서, RFM 모델의 엣지 추론 역량과 범용성을 2차원 포지셔닝 맵으로 확인하여 경쟁 구도를 파악하고 싶습니다.

#### 인수 조건

16. THE Trend_Dashboard SHALL display a Bubble_Chart with X축: 엣지 추론 역량(On-Device Inference, scale 1–5), Y축: 범용성(Task Generality, scale 1–5), and bubble size representing 상용 성숙도(Commercial Maturity).
17. THE Trend_Dashboard SHALL label each bubble with the robot name and RFM model name.
18. WHEN a user hovers over a bubble, THE Trend_Dashboard SHALL display a tooltip showing robot name, RFM model name, edge inference score, generality score, and commercial maturity score.
19. THE Trend_Dashboard SHALL render axis labels in Korean with English subtitle in parentheses.
20. WHEN Positioning_Data of chart_type 'rfm_competitiveness' contains fewer than 2 records, THE Trend_Dashboard SHALL display the available data with a notice: "포지셔닝 비교를 위해 최소 2개 이상의 데이터가 필요합니다."

### 요구사항 5: 산업용 PoC 로봇 포지셔닝 맵 — 버블 차트

**User Story:** 시장 분석가로서, 로봇의 폼팩터(인체 유사도)와 산업 적합성을 2차원 포지셔닝 맵으로 확인하여 산업 배치 적합성을 평가하고 싶습니다.

#### 인수 조건

21. THE Trend_Dashboard SHALL display a Bubble_Chart with X축: 폼팩터/인체 유사도(Form Factor, scale ~4–11), Y축: 산업 적합성(페이로드×운용시간, scale ~0–10), and bubble size representing 핑거 DoF.
22. THE Trend_Dashboard SHALL label each bubble with the robot name and annotation showing P(payload), T(time), F(finger DoF) values.
23. WHEN a user hovers over a bubble, THE Trend_Dashboard SHALL display a tooltip showing robot name, form factor score, industrial fitness score, payload (kg), operation time (h), and finger DoF.
24. WHEN Positioning_Data of chart_type 'poc_positioning' contains fewer than 2 records, THE Trend_Dashboard SHALL display the available data with a notice: "포지셔닝 비교를 위해 최소 2개 이상의 데이터가 필요합니다."

### 요구사항 6: TOPS × SoC 에코시스템 포지셔닝 맵 — 버블 차트

**User Story:** 기술 분석가로서, 각 로봇의 SoC 에코시스템 수준과 AI 추론 성능(TOPS)을 비교하여 컴퓨팅 경쟁력을 평가하고 싶습니다.

#### 인수 조건

25. THE Trend_Dashboard SHALL display a Bubble_Chart with X축: SoC 에코시스템 수준(categorical scale from "CPU Only" to "Thor FP4 2070T+"), Y축: On-Robot AI 추론 TOPS(numeric scale 0–2070T), and bubble size representing 출하 규모(shipment volume).
26. THE Trend_Dashboard SHALL color-code bubbles by country: blue for US ([US]), orange for China ([CN]), and pink/red for Korea ([KR]).
27. THE Trend_Dashboard SHALL display a color legend indicating country mapping.
28. WHEN a user hovers over a bubble, THE Trend_Dashboard SHALL display a tooltip showing robot name, SoC name, TOPS value, shipment volume, and country.
29. WHEN Positioning_Data of chart_type 'soc_ecosystem' contains fewer than 2 records, THE Trend_Dashboard SHALL display the available data with a notice: "포지셔닝 비교를 위해 최소 2개 이상의 데이터가 필요합니다."

### 요구사항 7: 산업 배치 핵심 스펙 비교 — 바 차트 4종

**User Story:** R&D 엔지니어로서, 로봇별 핵심 스펙(페이로드, 운용시간, 핑거 DoF, PoC 배포 성숙도)을 막대 차트로 비교하여 벤치마킹하고 싶습니다.

#### 인수 조건

30. THE Trend_Dashboard SHALL display 4 Bar_Chart panels in a 2×2 grid layout: ① 페이로드(kg), ② 연속 운용시간(h), ③ 핸드 핑거 DoF, ④ 산업 PoC 배포 성숙도(x/10).
31. WHEN rendering each Bar_Chart, THE Trend_Dashboard SHALL display robot names on the category axis and numeric values on the value axis with unit labels.
32. THE Trend_Dashboard SHALL use consistent robot color coding across all 4 Bar_Chart panels matching the colors used in Radar_Chart and Bubble_Chart.
33. WHEN a user hovers over a bar, THE Trend_Dashboard SHALL display a tooltip showing the robot name, company name, and exact value with unit.
34. WHEN bar data is derived from existing body_specs and hand_specs tables, THE Trend_Dashboard SHALL query payload_kg from body_specs, operation_time_hours from body_specs, hand_dof from hand_specs, and poc_deployment_score from PoC_Score.
35. WHEN fewer than 2 robots have data for a specific Bar_Chart, THE Trend_Dashboard SHALL display the available data with a notice: "비교를 위해 최소 2개 이상의 로봇 데이터가 필요합니다."

### 요구사항 8: 대시보드 페이지 레이아웃 및 네비게이션

**User Story:** 사용자로서, 6종 차트를 체계적으로 탐색할 수 있는 전용 대시보드 페이지에 접근하고 싶습니다.

#### 인수 조건

36. THE Portal SHALL provide a dedicated route `/humanoid-trend` for the Trend_Dashboard page.
37. THE Portal SHALL include a navigation link to the Trend_Dashboard in the main sidebar menu with label "휴머노이드 동향".
38. THE Trend_Dashboard SHALL organize 6 chart sections in a vertically scrollable single-page layout with section anchors: PoC 레이더, RFM 레이더, RFM 포지셔닝, PoC 포지셔닝, SoC 에코시스템, 스펙 비교.
39. THE Trend_Dashboard SHALL provide a sticky section navigation bar at the top allowing users to jump to each chart section.
40. THE Trend_Dashboard SHALL support both dark (slate-900/950 backgrounds) and light theme options consistent with the Portal theme system.
41. THE Trend_Dashboard SHALL be accessible to all authenticated users (Viewer, Analyst, Admin) with read-only access.

### 요구사항 9: PPT 리포트 다운로드

**User Story:** 전략팀 멤버로서, 휴머노이드 동향 차트 6종을 파워포인트 형식으로 다운로드하여 경영진 프레젠테이션 자료를 만들고 싶습니다.

#### 인수 조건

42. THE Trend_Dashboard SHALL provide a "PPT 다운로드" button accessible to Analyst and Admin roles.
43. WHEN a user clicks the PPT download button, THE PPT_Generator SHALL generate a .pptx file containing all 6 chart types as individual slides.
44. THE PPT_Generator SHALL render each chart as a high-resolution image (minimum 1920×1080 pixels) and embed the image into the corresponding slide.
45. THE PPT_Generator SHALL include a title slide with "휴머노이드 동향 리포트", generation date, and Portal logo.
46. THE PPT_Generator SHALL generate slide titles matching the chart section names: "산업용 PoC 팩터별 역량 비교", "RFM 역량 비교", "RFM 경쟁력 포지셔닝 맵", "산업용 PoC 로봇 포지셔닝 맵", "TOPS × SoC 에코시스템 포지셔닝 맵", "산업 배치 핵심 스펙 비교".
47. THE PPT_Generator SHALL complete .pptx file generation within 30 seconds.
48. THE PPT_Generator SHALL support both dark and light theme templates matching the current Portal theme.
49. WHEN PPT generation fails, THE Portal SHALL display an error message with a retry button and log the error with timestamp and user email.
50. WHEN a Viewer role user attempts PPT download, THE Portal SHALL deny access and display a message: "리포트 다운로드는 Analyst 이상 권한이 필요합니다."

### 요구사항 10: 데이터 관리 (Admin CRUD)

**User Story:** 관리자로서, 차트에 표시되는 평가 점수 및 포지셔닝 데이터를 입력, 수정, 삭제하여 최신 상태를 유지하고 싶습니다.

#### 인수 조건

51. WHEN an Admin user accesses the Trend_Dashboard, THE Portal SHALL display an "데이터 관리" button that opens a data management panel.
52. THE data management panel SHALL provide CRUD forms for PoC_Score: select robot, input 6 factor scores (1–10 range validation), and save.
53. THE data management panel SHALL provide CRUD forms for RFM_Score: select robot, input RFM model name, input 6 factor scores (1–5 range validation), and save.
54. THE data management panel SHALL provide CRUD forms for Positioning_Data: select chart type, select or input robot, input X/Y/bubble values, color group, and metadata.
55. WHEN an Admin submits score data with values outside the valid range, THE Portal SHALL reject the submission and display a validation error indicating the valid range.
56. WHEN an Admin updates or deletes data, THE Portal SHALL record the change in the audit log with admin email, action type, entity type, and timestamp.
57. THE data management panel SHALL display a table of existing records with edit and delete actions for each entry.

### 요구사항 11: API 엔드포인트

**User Story:** 프론트엔드 개발자로서, 차트 데이터를 조회하고 관리할 수 있는 RESTful API 엔드포인트를 사용하고 싶습니다.

#### 인수 조건

58. THE Portal SHALL provide GET `/api/humanoid-trend/poc-scores` endpoint returning all PoC_Score records with joined robot and company names.
59. THE Portal SHALL provide GET `/api/humanoid-trend/rfm-scores` endpoint returning all RFM_Score records with joined robot and company names.
60. THE Portal SHALL provide GET `/api/humanoid-trend/positioning/:chartType` endpoint returning Positioning_Data filtered by chart_type parameter.
61. THE Portal SHALL provide GET `/api/humanoid-trend/bar-specs` endpoint returning aggregated bar chart data (payload, operation time, finger DoF, PoC deployment score) for all robots with available data.
62. THE Portal SHALL provide POST, PUT, DELETE endpoints for PoC_Score, RFM_Score, and Positioning_Data restricted to Admin role, returning HTTP 403 for non-Admin requests.
63. THE Portal SHALL provide POST `/api/humanoid-trend/export-ppt` endpoint that generates and returns the .pptx file, restricted to Analyst and Admin roles.
64. WHEN an API request fails due to database error, THE Portal SHALL return HTTP 500 with a structured error response containing error code and message, and log the error details server-side.

### 요구사항 12: 비기능 요구사항

**User Story:** 시스템 운영자로서, 휴머노이드 동향 대시보드가 성능 및 사용성 기준을 충족하여 안정적으로 운영되기를 원합니다.

#### 인수 조건

65. THE Trend_Dashboard SHALL load all 6 chart sections within 3 seconds on initial page load for datasets containing up to 50 robots.
66. THE Trend_Dashboard SHALL render charts using Recharts library consistent with the existing Portal charting stack.
67. THE Trend_Dashboard SHALL implement responsive design supporting desktop (≥1280px), tablet (768–1279px), and mobile (<768px) viewports.
68. WHEN the browser window is resized, THE Trend_Dashboard SHALL re-render charts to fit the new viewport width within 300ms without data refetch.
69. THE Portal SHALL use React Query for data fetching with a cache TTL of 5 minutes for trend dashboard data to minimize redundant API calls.
70. THE Portal SHALL implement optimistic UI updates for Admin data management operations, reverting on server error.
