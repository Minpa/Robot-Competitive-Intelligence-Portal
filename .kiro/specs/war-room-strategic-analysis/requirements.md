# 요구사항 문서 — v1.4 전략 워룸 / 전략 분석 레이어

## 소개

v1.4 전략 워룸(War Room)은 HRI Portal의 기존 스코어링 파이프라인(PoC/RFM) 위에 전략 분석 레이어를 구축하여, LG가 휴머노이드 시장에서 1등이 되기 위한 전략 수립·추적·실행 도구로 포털을 진화시키는 기능이다.

기존 Layer 1(데이터 & 스코어링) 위에 3개 레이어를 추가한다:
- **Layer 2 — 전략 분석**: LG 벤치마크, 파트너십, GAP 분석, 시계열 추이, 경쟁 알림
- **Layer 3 — 사업 전략**: 사업화 분야, 수익 모델, 로봇-분야 적합도
- **Layer 4 — 의사결정 지원**: What-If 시뮬레이터, 전략 목표, 투자 우선순위

또한 CLOiD(LG 휴머노이드 로봇) 데이터를 Admin이 웹 UI에서 직접 입력/수정할 수 있는 관리 페이지를 포함한다. CLOiD 스펙은 개발 단계에서 계속 변경되므로 쉽게 업데이트 가능해야 한다.

신규 DB 테이블 9종(partners, partner_robot_adoptions, partner_evaluations, application_domains, domain_robot_fit, score_history, competitive_alerts, whatif_scenarios, strategic_goals), 신규 API 24종+, 신규 페이지 6개(/war-room 및 하위 5개 탭)를 포함한다.

## 용어 사전

- **Portal**: HRI 휴머노이드 로봇 인텔리전스 포털 웹 애플리케이션 (Hono.js 백엔드, Next.js 프론트엔드)
- **War_Room**: 전략 워룸 — LG 벤치마크, 경쟁 분석, 파트너십, 사업화, 시뮬레이션을 통합하는 전략 분석 대시보드 (/war-room)
- **War_Room_Dashboard**: 전략 워룸 메인 대시보드 페이지 (/war-room)
- **Competitive_View**: 경쟁 분석 탭 — LG vs Top 5 오버레이, GAP 분석, 종합 순위 (/war-room/competitive)
- **Timeline_View**: 시계열 추이 탭 — 역량 변화 추이, 경쟁 알림 (/war-room/timeline)
- **Partner_View**: 전략 파트너십 탭 — 파트너 카드, 경쟁력 매트릭스, 채택 히트맵 (/war-room/partners)
- **Business_View**: 사업화 전략 탭 — 사업화 기회 매트릭스, 수익 모델 시뮬레이터 (/war-room/business)
- **Simulation_View**: 시뮬레이션 탭 — What-If 시뮬레이터, 전략 목표 트래커 (/war-room/simulation)
- **LG_Robot_Management**: CLOiD 데이터 관리 페이지 — Admin 전용 LG 로봇 스펙 입력/수정 UI
- **Scoring_Pipeline**: 기존 PoC/RFM 스코어링 파이프라인 (v1.4에서 5단계 확장)
- **Score_History**: 월별 스코어 스냅샷 테이블 — 시계열 추이 분석용
- **Competitive_Alert**: 경쟁 동향 알림 엔티티 — score_spike, mass_production, funding, partnership 유형
- **Partner**: 전략 파트너 엔티티 — component/rfm/data/platform/integration 카테고리
- **Partner_Robot_Adoption**: 파트너-로봇 채택 관계 엔티티
- **Partner_Evaluation**: 파트너 평가 엔티티 — 기술력, 시장점유율, LG 적합도 등
- **Application_Domain**: 사업화 분야 엔티티 — manufacturing, logistics, retail, healthcare, hospitality, home, agriculture, construction
- **Domain_Robot_Fit**: 로봇-분야 적합도 엔티티 — 각 로봇이 각 분야에 얼마나 적합한지 점수화
- **Whatif_Scenario**: What-If 시나리오 엔티티 — 스펙 파라미터 수정 후 재계산 결과 저장
- **Strategic_Goal**: 전략 목표 엔티티 — 7종 메트릭 타입, 목표 상태 자동 판정
- **GAP_Analysis**: LG 로봇과 경쟁사 Top 5 로봇 간 12팩터 격차 분석
- **CLOiD**: LG 휴머노이드 로봇 브랜드명
- **Admin**: 데이터 입력/수정, 전체 CRUD 권한을 가진 사용자
- **Analyst**: 조회 + 시나리오 생성 권한을 가진 사용자
- **Viewer**: /war-room 접근 불가 사용자

## 요구사항

### 요구사항 11: 전략 워룸 메인 대시보드 & LG 벤치마크

**User Story:** 전략 기획자로서, LG 휴머노이드 로봇의 시장 포지셔닝과 경쟁 현황을 한눈에 파악하여 전략적 의사결정에 활용하고 싶습니다.

#### 인수 조건

1. THE War_Room_Dashboard SHALL display an LG 종합 포지셔닝 카드 showing the selected LG robot's overall market position, ranking, and key competitive metrics.
2. THE War_Room_Dashboard SHALL display a 경쟁 동향 알림 패널 showing the 5 most recent Competitive_Alert entries with alert type, robot name, and summary.
3. THE War_Room_Dashboard SHALL display an LG vs Top 5 레이더 요약 RadarChart comparing the selected LG robot against the top 5 competitors across PoC 6-Factor scores.
4. THE War_Room_Dashboard SHALL display a 전략 파트너 핵심 요약 card showing the count of partners by category and top 3 partners by evaluation score.
5. THE War_Room_Dashboard SHALL display a 사업화 기회 상위 3개 card showing the top 3 Application_Domain entries ranked by lg_readiness multiplied by SOM.
6. THE War_Room_Dashboard SHALL display a 전략 목표 카드 showing the count of Strategic_Goal entries grouped by status (achieved, on_track, at_risk, behind).
7. THE War_Room_Dashboard SHALL provide a 5-tab navigation bar with tabs: 대시보드, 경쟁 분석, 파트너 전략, 사업 전략, 시뮬레이션.
8. THE War_Room_Dashboard SHALL provide an LG 로봇 선택 드롭다운 filtering robots where region is 'KR' AND company name contains 'LG', defaulting to CLOiD.
9. WHEN a user selects a different LG robot from the dropdown, THE War_Room_Dashboard SHALL refresh all dashboard cards and charts with data for the selected robot.
10. THE Competitive_View SHALL embed the existing PoC/RFM RadarChart and BubbleChart from the Trend_Dashboard with an LG vs Top 5 overlay highlighting the selected LG robot.
11. THE Competitive_View SHALL display a GAP 분석 12팩터 카드 grid showing the difference between the selected LG robot and the top competitor for each of the 12 scoring factors (6 PoC + 6 RFM).
12. WHEN displaying a GAP factor card, THE Competitive_View SHALL color-code the gap value: green when LG leads, red when LG trails, and gray when equal.
13. THE Competitive_View SHALL display an LG 종합 순위 카드 showing the selected LG robot's rank among all scored robots for PoC total, RFM total, and combined score.
14. WHEN a Viewer role user attempts to access /war-room, THE Portal SHALL deny access and redirect to the main dashboard with an access denied notification.
15. WHEN an Analyst role user accesses /war-room, THE Portal SHALL allow read-only access to all War_Room views and allow scenario creation in the Simulation_View.
16. WHEN an Admin role user accesses /war-room, THE Portal SHALL allow full CRUD operations across all War_Room features.
17. THE War_Room_Dashboard SHALL load all summary cards and charts within 3 seconds on initial page load.

### 요구사항 12: 시계열 추적 & 경쟁 동향 알림

**User Story:** 시장 분석가로서, 로봇들의 역량 변화 추이를 시계열로 추적하고 경쟁사의 주요 변화를 자동 알림으로 받아 시장 변화에 빠르게 대응하고 싶습니다.

#### 인수 조건

18. WHEN the Scoring_Pipeline completes a scoring run, THE Scoring_Pipeline SHALL create a Score_History snapshot record containing the robot_id, all 12 scoring factor values (6 PoC + 6 RFM), PoC total, RFM total, combined score, and the snapshot month (YYYY-MM format).
19. THE Scoring_Pipeline SHALL create Score_History snapshots on a monthly basis, storing one snapshot per robot per month.
20. THE Portal SHALL retain Score_History records for a minimum of 24 months.
21. THE Timeline_View SHALL display a 역량 변화 추이 LineChart with the X-axis as month and Y-axis as score value, supporting multi-robot and multi-factor selection.
22. THE Timeline_View SHALL provide a 로봇 멀티셀렉트 filter allowing users to select up to 10 robots for simultaneous comparison on the LineChart.
23. THE Timeline_View SHALL provide a 팩터 멀티셀렉트 filter allowing users to select specific scoring factors or totals (PoC total, RFM total, combined) for display.
24. THE Timeline_View SHALL render the LineChart within 2 seconds for up to 10 robots over 24 months of data.
25. WHEN the Scoring_Pipeline detects a score change of 20 percent or more for any single factor compared to the previous month, THE Scoring_Pipeline SHALL generate a Competitive_Alert of type "score_spike" with the robot name, factor name, old value, new value, and change percentage.
26. WHEN the Scoring_Pipeline detects a pocDeploymentScore increase of 2 or more points compared to the previous month, THE Scoring_Pipeline SHALL generate a Competitive_Alert of type "mass_production" with the robot name and deployment details.
27. WHEN the Scoring_Pipeline processes article keywords and detects matches for funding-related terms (funding, investment, Series A-F, IPO, valuation), THE Scoring_Pipeline SHALL generate a Competitive_Alert of type "funding" with the robot name, company name, and matched keywords.
28. WHEN the Scoring_Pipeline processes article keywords and detects matches for partnership-related terms (partnership, collaboration, joint venture, MOU, strategic alliance), THE Scoring_Pipeline SHALL generate a Competitive_Alert of type "partnership" with the robot name, company name, and matched keywords.
29. THE Timeline_View SHALL display a 경쟁 알림 패널 listing all Competitive_Alert entries sorted by creation date descending, with type icon, robot name, summary, and timestamp.
30. WHEN a user clicks on a Competitive_Alert entry, THE Timeline_View SHALL expand the alert to show full details including the triggering data and related robot link.
31. THE Timeline_View SHALL provide a 읽음 처리 toggle for each alert, and THE Portal SHALL persist the read status per user.
32. THE Timeline_View SHALL provide alert type filters (score_spike, mass_production, funding, partnership) to narrow the displayed alerts.

### 요구사항 13: 전략 파트너십 분석

**User Story:** 전략 기획자로서, 휴머노이드 로봇 생태계의 핵심 파트너를 카테고리별로 분석하고 LG에 최적인 파트너를 식별하여 파트너십 전략을 수립하고 싶습니다.

#### 인수 조건

33. THE Portal SHALL store Partner entities with fields: name, category (component, rfm, data, platform, integration), sub_category (vision_sensor, battery, ai_chip, actuator, motor, reducer, force_sensor for component category), country, description, website, and logo_url.
34. THE Portal SHALL store Partner_Robot_Adoption entities with fields: partner_id, robot_id, adoption_type, adoption_status, and notes.
35. THE Portal SHALL store Partner_Evaluation entities with fields: partner_id, evaluator_id, tech_capability (1-10), market_share (1-10), lg_compatibility (1-10), cost_competitiveness (1-10), supply_stability (1-10), overall_score (auto-calculated average), and evaluated_at.
36. THE Partner_View SHALL display a 카테고리별 탭 navigation with tabs: component, rfm, data, platform, integration.
37. WHEN the component category tab is selected, THE Partner_View SHALL display a 부품 서브카테고리 탭 navigation with tabs: vision_sensor, battery, ai_chip, actuator, motor, reducer, force_sensor.
38. THE Partner_View SHALL display Partner cards in a grid layout showing partner name, logo, category, country, overall evaluation score, and adoption count.
39. THE Partner_View SHALL display a 경쟁력 매트릭스 ScatterChart with X-axis as tech_capability and Y-axis as lg_compatibility, with bubble size representing market_share.
40. THE Partner_View SHALL display a 채택 히트맵 showing which robots have adopted which partners, with cell color intensity representing adoption_status (evaluating=light, adopted=medium, strategic=dark).
41. THE Partner_View SHALL display a 부품 영향도 분석 section for the component category showing how each component sub-category affects PoC and RFM scores.
42. WHEN the vision_sensor, battery, or ai_chip sub-category is selected, THE Partner_View SHALL display a 비교 테이블 showing key specifications of competing partners side by side.
43. THE Partner_View SHALL display an LG 부품 로드맵 타임라인 visualization showing planned component adoption milestones for the selected LG robot.
44. WHEN the Scoring_Pipeline executes, THE Scoring_Pipeline SHALL run a partner auto-matching step that identifies potential partners for each robot based on component compatibility and evaluation scores.
45. THE Portal SHALL provide 14 seed Partner records covering major component suppliers, AI platform providers, and integration partners in the humanoid robotics ecosystem.
46. THE Portal SHALL provide a GET /api/war-room/partners endpoint returning Partner list with filtering by category, sub_category, and country.
47. THE Portal SHALL provide a GET /api/war-room/partners/:id endpoint returning Partner detail with evaluations and robot adoptions.
48. THE Portal SHALL provide a POST /api/war-room/partners endpoint restricted to Admin role for creating new Partner records.
49. THE Portal SHALL provide a PUT /api/war-room/partners/:id endpoint restricted to Admin role for updating Partner records.
50. THE Portal SHALL provide a POST /api/war-room/partner-evaluations endpoint restricted to Admin and Analyst roles for submitting Partner evaluations.
51. THE Portal SHALL provide a GET /api/war-room/partner-adoptions endpoint returning the adoption matrix data for the heatmap visualization.

### 요구사항 14: 사업화 분야 분석 & 시장 기회 매핑

**User Story:** 사업 개발 담당자로서, 휴머노이드 로봇의 사업화 가능 분야를 분석하고 LG의 최적 진입 순서를 파악하여 사업화 전략을 수립하고 싶습니다.

#### 인수 조건

52. THE Portal SHALL store Application_Domain entities with fields: name, description, market_size_billion_usd, cagr_percent, som_billion_usd, key_tasks (JSON array), entry_barriers (JSON array), lg_existing_business (boolean), and lg_readiness (auto-calculated float 0-1).
53. THE Portal SHALL store Domain_Robot_Fit entities with fields: domain_id, robot_id, fit_score (1-10), fit_rationale, key_strengths (JSON array), key_gaps (JSON array), and evaluated_at.
54. THE Business_View SHALL display a 사업화 기회 매트릭스 ScatterChart with X-axis as lg_readiness (0-1) and Y-axis as som_billion_usd, with bubble size representing cagr_percent and label showing domain name.
55. WHEN the Scoring_Pipeline executes, THE Scoring_Pipeline SHALL calculate lg_readiness for each Application_Domain using the formula: (PoC factor fulfillment rate × 0.4) + (lg_existing_business bonus × 0.3) + (partner availability score × 0.3), normalized to 0-1 range.
56. THE Business_View SHALL display a 로봇-분야 적합도 히트맵 showing Domain_Robot_Fit scores for all robots across all domains, with cell color intensity representing fit_score.
57. THE Business_View SHALL display a CLOiD 최적 진입 순서 ranked list showing Application_Domain entries sorted by (lg_readiness × som_billion_usd) descending, with rationale for each ranking.
58. THE Business_View SHALL display a 수익 모델 시뮬레이터 with 3 revenue model templates: hardware_sales (unit price × volume), raas (monthly fee × subscribers × months), and b2b2c (platform fee + transaction commission).
59. WHEN a user selects a revenue model template, THE Business_View SHALL display editable input fields for the model parameters and calculate projected revenue in real-time on the client side.
60. THE Portal SHALL provide 8 seed Application_Domain records: manufacturing, logistics, retail, healthcare, hospitality, home, agriculture, construction, each with market_size, CAGR, SOM, and key_tasks data.
61. THE Portal SHALL provide a GET /api/war-room/domains endpoint returning Application_Domain list with lg_readiness and fit data.
62. THE Portal SHALL provide a GET /api/war-room/domains/:id endpoint returning Application_Domain detail with all Domain_Robot_Fit entries.
63. THE Portal SHALL provide a GET /api/war-room/domain-robot-fit endpoint returning the full fit matrix data for the heatmap visualization.
64. THE Portal SHALL provide a PUT /api/war-room/domains/:id endpoint restricted to Admin role for updating Application_Domain records.

### 요구사항 15: What-If 시뮬레이터 & 전략 목표 트래커

**User Story:** 전략 기획자로서, 로봇 스펙 변경이 경쟁력에 미치는 영향을 시뮬레이션하고 전략 목표 달성 현황을 추적하여 투자 우선순위를 결정하고 싶습니다.

#### 인수 조건

65. THE Portal SHALL store Whatif_Scenario entities with fields: name, description, base_robot_id, parameter_overrides (JSON object mapping spec field names to modified values), calculated_scores (JSON object with recalculated PoC and RFM scores), created_by, and created_at.
66. THE Simulation_View SHALL display a What-If 폼 with editable input fields for all scoreable spec parameters (payloadKg, operationTimeHours, handDof, fingerCount, heightCm, dofCount, locomotionType, topsMax, architectureType, commercializationStage) pre-populated with the selected LG robot's current values.
67. WHEN a user modifies spec parameters in the What-If form, THE Simulation_View SHALL recalculate all 12 scoring factors (6 PoC + 6 RFM) and positioning data on the client side within 500 milliseconds.
68. THE Simulation_View SHALL display a Before vs After comparison with a RadarChart overlay showing original scores and simulated scores side by side.
69. THE Simulation_View SHALL display a Before vs After BubbleChart showing the robot's position shift in the positioning chart.
70. THE Simulation_View SHALL display a Before vs After GAP 테이블 showing how the gap against the top competitor changes for each factor.
71. THE Simulation_View SHALL provide 6 프리빌트 시나리오 buttons: "Jetson Thor 탑재" (topsMax=800, architectureType=edge), "전고체 배터리" (operationTimeHours=16), "RoboSense AC2 센서" (sensor upgrade parameters), "보행 추가" (locomotionType=bipedal, maxSpeedMps=1.5), "양산 전환" (commercializationStage=commercial, pocDeploymentScore override), "가격 경쟁력" (estimatedPriceUsd reduction).
72. WHEN a user clicks a prebuilt scenario button, THE Simulation_View SHALL populate the What-If form with the scenario's parameter overrides and trigger recalculation.
73. THE Simulation_View SHALL provide a "시나리오 저장" button that persists the current What-If configuration as a Whatif_Scenario record.
74. THE Simulation_View SHALL provide a "시나리오 로드" dropdown listing saved Whatif_Scenario records for the current user.
75. THE Simulation_View SHALL provide a "시나리오 비교" mode allowing side-by-side comparison of up to 3 saved scenarios on a single RadarChart.
76. THE Portal SHALL store Strategic_Goal entities with fields: title, description, metric_type (one of: overall_rank, poc_factor, rfm_factor, market_share, partner_count, domain_entry, revenue_target), target_value, current_value, deadline, status (achieved, on_track, at_risk, behind), required_actions (JSON array), and created_at.
77. WHEN the Scoring_Pipeline executes, THE Scoring_Pipeline SHALL update the current_value of each Strategic_Goal by querying the latest scoring data matching the goal's metric_type.
78. WHEN the Scoring_Pipeline updates a Strategic_Goal, THE Scoring_Pipeline SHALL auto-determine the status: "achieved" when current_value meets or exceeds target_value, "on_track" when current_value is within 80 percent of target_value and deadline is in the future, "at_risk" when current_value is between 50 and 80 percent of target_value, and "behind" when current_value is below 50 percent of target_value or deadline has passed.
79. WHEN a Strategic_Goal status changes to "at_risk" or "behind", THE Scoring_Pipeline SHALL auto-generate required_actions suggestions based on the GAP analysis between current_value and target_value.
80. THE Simulation_View SHALL display a 전략 목표 관리 section listing all Strategic_Goal entries with status badges, progress bars, and deadline indicators.
81. THE Simulation_View SHALL display a 투자 우선순위 매트릭스 ScatterChart with X-axis as impact (score improvement potential) and Y-axis as feasibility (inverse of estimated cost/effort), with bubble labels showing the investment area name.
82. THE Portal SHALL provide a GET /api/war-room/scenarios endpoint returning Whatif_Scenario list for the current user.
83. THE Portal SHALL provide a POST /api/war-room/scenarios endpoint restricted to Analyst and Admin roles for saving new scenarios.
84. THE Portal SHALL provide a DELETE /api/war-room/scenarios/:id endpoint restricted to the scenario creator or Admin role.
85. THE Portal SHALL provide a GET /api/war-room/goals endpoint returning Strategic_Goal list with current status.
86. THE Portal SHALL provide a POST /api/war-room/goals endpoint restricted to Admin role for creating new Strategic_Goal records.
87. THE Portal SHALL provide a PUT /api/war-room/goals/:id endpoint restricted to Admin role for updating Strategic_Goal records.

### 요구사항 16: CLOiD 데이터 관리 페이지

**User Story:** 관리자로서, CLOiD 및 기타 LG 로봇의 스펙 데이터를 웹 UI에서 직접 입력/수정하여 빠르게 변하는 개발 스펙을 최신 상태로 유지하고 싶습니다.

#### 인수 조건

88. THE Portal SHALL provide an LG_Robot_Management page accessible at /war-room/lg-robot-management, restricted to Admin role only.
89. THE LG_Robot_Management page SHALL display a list of all LG robots (region='KR' AND company ILIKE '%LG%') with name, status, and last updated timestamp.
90. THE LG_Robot_Management page SHALL provide a "새 LG 로봇 추가" button that opens a creation form for registering a new LG robot entity (e.g., CLOiD v2).
91. WHEN an Admin selects an LG robot from the list, THE LG_Robot_Management page SHALL display inline-editable forms for all spec categories: Body_Spec, Hand_Spec, Computing_Spec, Sensor_Spec, and Power_Spec.
92. THE LG_Robot_Management page SHALL display Body_Spec fields: heightCm (default 105-143 for CLOiD), weightKg (default 25-70), payloadKg (default 5), dofCount, maxSpeedMps (default 1.1), operationTimeHours (default 8-10), and locomotionType (default wheeled).
93. THE LG_Robot_Management page SHALL display Hand_Spec fields: handType, fingerCount (default 5 per hand), handDof (default 7 per arm × 2), gripForceN, and isInterchangeable.
94. THE LG_Robot_Management page SHALL display Computing_Spec fields: mainSoc (default "LG DQ-C2"), topsMin, topsMax, and architectureType (default "ARM-based onboard").
95. THE LG_Robot_Management page SHALL display Sensor_Spec fields: cameras (default "HD cameras"), depthSensor (default true), lidar, imu, forceTorque, and touchSensors.
96. THE LG_Robot_Management page SHALL display Power_Spec fields: batteryType, capacityWh, operationTimeHours (default 8-10), and chargingMethod.
97. WHEN an Admin saves changes to any spec field, THE Portal SHALL persist the changes to the corresponding database table and record the change in a change history log with the previous value, new value, changed_by, and changed_at.
98. THE LG_Robot_Management page SHALL display a 변경 이력 panel showing the chronological list of all spec changes for the selected robot, with field name, old value, new value, editor name, and timestamp.
99. WHEN an Admin saves CLOiD spec changes, THE Portal SHALL automatically trigger the Scoring_Pipeline for the updated robot to recalculate all scores.
100. THE LG_Robot_Management page SHALL provide CLOiD 초기값 pre-population: height 105-143cm (tilting), weight ~25-70kg, wheeled locomotion, arm DoF 7×2, fingers 5×2, payload ~5kg, operation 8-10 hours, max speed 4km/h (~1.1m/s), LG DQ-C2 chipset (ARM-based), HD cameras + depth sensors + environmental sensors, VLM+VLA (Physical AI), purpose Home, stage Concept/Prototype.
101. THE Portal SHALL provide a GET /api/war-room/lg-robots endpoint returning the list of LG robots with all spec data.
102. THE Portal SHALL provide a PUT /api/war-room/lg-robots/:id/specs endpoint restricted to Admin role for updating all spec categories of an LG robot in a single request.
103. THE Portal SHALL provide a GET /api/war-room/lg-robots/:id/history endpoint returning the change history log for a specific LG robot.
104. THE Portal SHALL provide a POST /api/war-room/lg-robots endpoint restricted to Admin role for creating a new LG robot entity with initial spec data.

### 요구사항 17: 스코어링 파이프라인 확장 (REQ-10 패치)

**User Story:** 시스템 운영자로서, 기존 스코어링 파이프라인이 전략 워룸에 필요한 추가 데이터(시계열, 알림, 적합도, 목표, 파트너 매칭)를 자동 생성하도록 확장되기를 원합니다.

#### 인수 조건

105. WHEN the Scoring_Pipeline completes the existing PoC/RFM scoring and positioning generation steps, THE Scoring_Pipeline SHALL execute 5 additional steps in sequence: Score_History snapshot, Competitive_Alert generation, Domain_Robot_Fit calculation, Strategic_Goal update, and Partner auto-matching.
106. WHEN executing the Score_History snapshot step, THE Scoring_Pipeline SHALL create or update a Score_History record for the current month containing all 12 factor scores, totals, and combined score for each processed robot.
107. WHEN executing the Competitive_Alert generation step, THE Scoring_Pipeline SHALL compare current scores against the previous month's Score_History and generate alerts for score_spike (20 percent or more change), mass_production (pocDeploymentScore increase of 2 or more points), funding (keyword match), and partnership (keyword match) conditions.
108. WHEN executing the Domain_Robot_Fit calculation step, THE Scoring_Pipeline SHALL calculate fit_score for each robot-domain pair based on the robot's PoC scores alignment with the domain's key_tasks requirements.
109. WHEN executing the Strategic_Goal update step, THE Scoring_Pipeline SHALL query the latest scoring data for each Strategic_Goal's metric_type and update current_value and status accordingly.
110. WHEN executing the Partner auto-matching step, THE Scoring_Pipeline SHALL identify potential partners for each robot by matching component requirements against Partner records with compatible sub_category and high evaluation scores.
111. THE Scoring_Pipeline SHALL log each of the 5 new steps in the pipelineStepLogs table with step name, input count, success count, failure count, and duration.
112. IF any of the 5 new pipeline steps fails for a specific robot, THEN THE Scoring_Pipeline SHALL log the error and continue processing the remaining steps and robots without halting.

### 요구사항 18: 전략 워룸 데이터 모델

**User Story:** 개발자로서, 전략 워룸에 필요한 9종 신규 DB 테이블이 명확하게 정의되어 효율적으로 구현하고 싶습니다.

#### 인수 조건

113. THE Portal SHALL create a partners table with columns: id (UUID PK), name (varchar), category (enum: component, rfm, data, platform, integration), sub_category (varchar nullable), country (varchar), description (text), website (varchar), logo_url (varchar), created_at (timestamp), and updated_at (timestamp).
114. THE Portal SHALL create a partner_robot_adoptions table with columns: id (UUID PK), partner_id (FK to partners), robot_id (FK to humanoid_robots), adoption_type (varchar), adoption_status (enum: evaluating, adopted, strategic), notes (text), and created_at (timestamp).
115. THE Portal SHALL create a partner_evaluations table with columns: id (UUID PK), partner_id (FK to partners), evaluator_id (varchar), tech_capability (integer 1-10), market_share (integer 1-10), lg_compatibility (integer 1-10), cost_competitiveness (integer 1-10), supply_stability (integer 1-10), overall_score (decimal auto-calculated), and evaluated_at (timestamp).
116. THE Portal SHALL create an application_domains table with columns: id (UUID PK), name (varchar), description (text), market_size_billion_usd (decimal), cagr_percent (decimal), som_billion_usd (decimal), key_tasks (jsonb), entry_barriers (jsonb), lg_existing_business (boolean), lg_readiness (decimal 0-1), and updated_at (timestamp).
117. THE Portal SHALL create a domain_robot_fit table with columns: id (UUID PK), domain_id (FK to application_domains), robot_id (FK to humanoid_robots), fit_score (integer 1-10), fit_rationale (text), key_strengths (jsonb), key_gaps (jsonb), and evaluated_at (timestamp).
118. THE Portal SHALL create a score_history table with columns: id (UUID PK), robot_id (FK to humanoid_robots), snapshot_month (varchar YYYY-MM format), poc_scores (jsonb containing all 6 PoC factor scores), rfm_scores (jsonb containing all 6 RFM factor scores), poc_total (decimal), rfm_total (decimal), combined_score (decimal), and created_at (timestamp), with a unique constraint on (robot_id, snapshot_month).
119. THE Portal SHALL create a competitive_alerts table with columns: id (UUID PK), alert_type (enum: score_spike, mass_production, funding, partnership), robot_id (FK to humanoid_robots), title (varchar), summary (text), details (jsonb), is_read (boolean default false), read_by (jsonb array), and created_at (timestamp).
120. THE Portal SHALL create a whatif_scenarios table with columns: id (UUID PK), name (varchar), description (text), base_robot_id (FK to humanoid_robots), parameter_overrides (jsonb), calculated_scores (jsonb), created_by (varchar), and created_at (timestamp).
121. THE Portal SHALL create a strategic_goals table with columns: id (UUID PK), title (varchar), description (text), metric_type (enum: overall_rank, poc_factor, rfm_factor, market_share, partner_count, domain_entry, revenue_target), target_value (decimal), current_value (decimal), deadline (date), status (enum: achieved, on_track, at_risk, behind), required_actions (jsonb), and created_at (timestamp).

### 요구사항 19: 전략 워룸 API 엔드포인트

**User Story:** 프론트엔드 개발자로서, 전략 워룸의 모든 데이터를 조회/생성/수정할 수 있는 RESTful API를 사용하여 UI를 구현하고 싶습니다.

#### 인수 조건

122. THE Portal SHALL provide a GET /api/war-room/dashboard endpoint returning aggregated summary data for the War_Room_Dashboard: LG positioning, recent alerts, top partners, top domains, and goal status counts.
123. THE Portal SHALL provide a GET /api/war-room/competitive/:robotId endpoint returning GAP analysis data, LG ranking, and overlay chart data for the Competitive_View.
124. THE Portal SHALL provide a GET /api/war-room/score-history endpoint with query parameters robot_ids (comma-separated) and months (integer, default 24) returning Score_History time series data.
125. THE Portal SHALL provide a GET /api/war-room/alerts endpoint with query parameters type (filter by alert_type) and is_read (filter by read status) returning Competitive_Alert list sorted by created_at descending.
126. THE Portal SHALL provide a PUT /api/war-room/alerts/:id/read endpoint for marking a Competitive_Alert as read by the current user.
127. THE Portal SHALL provide a GET /api/war-room/investment-priority endpoint returning the investment priority matrix data with impact and feasibility scores for each potential investment area.
128. THE Portal SHALL apply role-based access control to all /api/war-room/* endpoints: Viewer receives 403 Forbidden, Analyst receives read access plus scenario creation, Admin receives full CRUD access.
129. THE Portal SHALL return consistent JSON error responses with status code, error type, and descriptive message for all /api/war-room/* endpoints.

### 요구사항 20: 비기능 요구사항

**User Story:** 시스템 운영자로서, 전략 워룸이 성능, 보안, 사용성 기준을 충족하여 안정적으로 운영되기를 원합니다.

#### 인수 조건

130. THE War_Room_Dashboard SHALL complete initial page load with all summary cards and charts rendered within 3 seconds.
131. THE Simulation_View SHALL complete What-If score recalculation on the client side within 500 milliseconds of parameter change.
132. THE Timeline_View SHALL render the LineChart within 2 seconds for up to 10 robots over 24 months of Score_History data.
133. THE Portal SHALL enforce role-based access: Viewer role receives 403 when accessing any /war-room page or /api/war-room/* endpoint, Analyst role has read access plus scenario creation, Admin role has full CRUD.
134. THE Portal SHALL retain Score_History records for a minimum of 24 months before allowing archival or deletion.
135. THE Portal SHALL apply the existing dark theme (slate-950) consistently across all War_Room pages and components.
136. THE Portal SHALL invalidate React Query cache for war-room data after any scoring pipeline execution or data modification, triggering automatic UI refresh.
137. THE Portal SHALL validate all user inputs on War_Room forms (partner evaluations, scenario parameters, strategic goals) with appropriate type checking and range validation before persisting to the database.
138. WHEN the extended Scoring_Pipeline (with 5 new steps) executes for up to 50 robots, THE Scoring_Pipeline SHALL complete within 60 seconds including all original and new steps.
