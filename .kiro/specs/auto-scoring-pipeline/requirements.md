# 요구사항 문서 — 자동 스코어링 파이프라인

## 소개

자동 스코어링 파이프라인은 HRI Portal의 휴머노이드 동향 대시보드(`/humanoid-trend`)에 표시되는 3개 테이블(`poc_scores`, `rfm_scores`, `positioning_data`)을 자동으로 채우는 백엔드 파이프라인이다. 현재 분석 파이프라인(클로드 AI 분석)은 기사, 회사, 제품, 키워드만 저장하며 스코어링 데이터를 생성하지 않아 대시보드 차트가 빈 상태로 표시된다.

본 파이프라인은 기존 DB 데이터(bodySpecs, handSpecs, computingSpecs, sensorSpecs, powerSpecs, applicationCases 등)와 기사 분석 결과를 입력으로 받아, 정의된 스코어링 루브릭에 따라 점수를 계산하고 3개 테이블에 자동 저장한다. 스코어링 기준(루브릭)은 대시보드 페이지에서 사용자에게 투명하게 공개된다.

## 용어 사전

- **Portal**: HRI 휴머노이드 로봇 인텔리전스 포털 웹 애플리케이션 (Fastify 백엔드, Next.js 프론트엔드)
- **Scoring_Pipeline**: 기존 DB 데이터를 기반으로 poc_scores, rfm_scores, positioning_data를 자동 계산하는 백엔드 서비스
- **Scoring_Rubric**: 각 점수 팩터의 계산 기준, 구간별 점수 매핑, 데이터 소스를 정의한 평가 기준표
- **PoC_Score**: 산업용 PoC 평가 6개 팩터 점수 (각 1–10 스케일) — payloadScore, operationTimeScore, fingerDofScore, formFactorScore, pocDeploymentScore, costEfficiencyScore
- **RFM_Score**: Robot Foundation Model 평가 6개 팩터 점수 (각 1–5 스케일) — generalityScore, realWorldDataScore, edgeInferenceScore, multiRobotCollabScore, openSourceScore, commercialMaturityScore
- **Positioning_Data**: 버블 차트용 포지셔닝 데이터 (rfm_competitiveness, poc_positioning, soc_ecosystem 3종)
- **Body_Specs**: 로봇 신체 스펙 테이블 (heightCm, weightKg, payloadKg, dofCount, maxSpeedMps, operationTimeHours)
- **Hand_Specs**: 로봇 손 스펙 테이블 (handType, fingerCount, handDof, gripForceN, isInterchangeable)
- **Computing_Specs**: 컴퓨팅 스펙 테이블 (mainSoc, topsMin, topsMax, architectureType)
- **Application_Cases**: 적용 사례 테이블 (environmentType, taskType, deploymentStatus)
- **Humanoid_Robot**: 휴머노이드 로봇 엔티티 (humanoid_robots 테이블)
- **Trend_Dashboard**: 휴머노이드 동향 대시보드 페이지 (`/humanoid-trend`)
- **Rubric_Panel**: 대시보드에서 스코어링 루브릭을 표시하는 UI 패널

## 요구사항

### 요구사항 1: PoC 점수 자동 계산 — 스코어링 루브릭 정의

**User Story:** 시장 분석가로서, 각 로봇의 PoC 6-Factor 점수가 명확한 기준에 따라 자동 계산되어 수동 입력 없이 대시보드에 표시되기를 원합니다.

#### 인수 조건

1. WHEN a Humanoid_Robot has Body_Specs data, THE Scoring_Pipeline SHALL calculate payloadScore (1–10) by mapping payloadKg to a linear scale where 0 kg maps to 1 and 20 kg or above maps to 10.
2. WHEN a Humanoid_Robot has Body_Specs data, THE Scoring_Pipeline SHALL calculate operationTimeScore (1–10) by mapping operationTimeHours to a linear scale where 0 hours maps to 1 and 8 hours or above maps to 10.
3. WHEN a Humanoid_Robot has Hand_Specs data, THE Scoring_Pipeline SHALL calculate fingerDofScore (1–10) by mapping handDof to a linear scale where 0 DoF maps to 1 and 24 DoF or above maps to 10.
4. WHEN a Humanoid_Robot has Body_Specs and Hand_Specs data, THE Scoring_Pipeline SHALL calculate formFactorScore (1–10) by computing a weighted composite: (heightCm similarity to 170cm × 0.3) + (dofCount normalized to 40 max × 0.3) + (fingerCount normalized to 5 max × 0.2) + (bipedal locomotion bonus × 0.2), scaled to 1–10.
5. WHEN a Humanoid_Robot has Application_Cases data, THE Scoring_Pipeline SHALL calculate pocDeploymentScore (1–10) by counting deployment cases and mapping deploymentStatus: concept=1pt, pilot=3pt, production=5pt per case, capped at 10.
6. WHEN a Humanoid_Robot has Body_Specs and estimated price data, THE Scoring_Pipeline SHALL calculate costEfficiencyScore (1–10) by computing (payloadKg × operationTimeHours) / estimatedPriceUsd normalized to 1–10 scale, defaulting to 5 when price data is unavailable.
7. IF a Humanoid_Robot lacks the required spec data for a specific PoC factor, THEN THE Scoring_Pipeline SHALL assign a default score of 1 for that factor and mark the score as "estimated" in metadata.

### 요구사항 2: RFM 점수 자동 계산 — 스코어링 루브릭 정의

**User Story:** 기술 분석가로서, 각 로봇/RFM 모델의 6-Factor 역량 점수가 객관적 기준에 따라 자동 계산되기를 원합니다.

#### 인수 조건

8. WHEN a Humanoid_Robot has Application_Cases data, THE Scoring_Pipeline SHALL calculate generalityScore (1–5) by counting distinct taskType values: 1 type=1, 2 types=2, 3 types=3, 4 types=4, 5 or more types=5.
9. WHEN a Humanoid_Robot has associated articles with extractedMetadata, THE Scoring_Pipeline SHALL calculate realWorldDataScore (1–5) by analyzing article count and keyword mentions related to real-world testing: 0 mentions=1, 1–2=2, 3–5=3, 6–10=4, 11 or more=5.
10. WHEN a Humanoid_Robot has Computing_Specs data, THE Scoring_Pipeline SHALL calculate edgeInferenceScore (1–5) by mapping topsMax: 0–10 TOPS=1, 11–50=2, 51–200=3, 201–500=4, 501 or more TOPS=5.
11. WHEN a Humanoid_Robot has associated articles, THE Scoring_Pipeline SHALL calculate multiRobotCollabScore (1–5) by analyzing article content for multi-robot collaboration keywords: 0 mentions=1, 1–2=2, 3–5=3, 6–10=4, 11 or more=5.
12. WHEN a Humanoid_Robot has associated articles with extractedMetadata, THE Scoring_Pipeline SHALL calculate openSourceScore (1–5) by analyzing mentions of open-source frameworks, SDK availability, and community engagement: 0 indicators=1, 1=2, 2=3, 3=4, 4 or more indicators=5.
13. WHEN a Humanoid_Robot has commercializationStage data, THE Scoring_Pipeline SHALL calculate commercialMaturityScore (1–5) by mapping: concept=1, prototype=2, poc=3, pilot=4, commercial=5.
14. IF a Humanoid_Robot lacks the required data for a specific RFM factor, THEN THE Scoring_Pipeline SHALL assign a default score of 1 for that factor and mark the score as "estimated" in metadata.

### 요구사항 3: 포지셔닝 데이터 자동 생성

**User Story:** 시장 분석가로서, 3종 버블 차트의 포지셔닝 데이터가 기존 스펙과 점수 데이터로부터 자동 생성되기를 원합니다.

#### 인수 조건

15. WHEN PoC_Score and RFM_Score data exist for a Humanoid_Robot, THE Scoring_Pipeline SHALL generate rfm_competitiveness positioning data with xValue=edgeInferenceScore, yValue=generalityScore, bubbleSize=commercialMaturityScore.
16. WHEN PoC_Score data exists for a Humanoid_Robot, THE Scoring_Pipeline SHALL generate poc_positioning positioning data with xValue=formFactorScore, yValue=(payloadScore × operationTimeScore / 10), bubbleSize=fingerDofScore.
17. WHEN a Humanoid_Robot has Computing_Specs data, THE Scoring_Pipeline SHALL generate soc_ecosystem positioning data with xValue mapped from architectureType categorical scale, yValue=topsMax, bubbleSize derived from application case count, and colorGroup set by robot region (north_america=blue, china=orange, korea=pink).
18. THE Scoring_Pipeline SHALL set the label field of each Positioning_Data record to the format "{robotName} ({companyName})".
19. THE Scoring_Pipeline SHALL store source score IDs and calculation parameters in the metadata JSONB field of each Positioning_Data record for traceability.

### 요구사항 4: 파이프라인 실행 및 트리거

**User Story:** 시스템 운영자로서, 스코어링 파이프라인이 데이터 변경 시 자동으로 실행되고 수동 트리거도 가능하기를 원합니다.

#### 인수 조건

20. THE Portal SHALL provide a POST `/api/scoring-pipeline/run` endpoint restricted to Admin role that triggers a full scoring pipeline execution for all Humanoid_Robots.
21. THE Portal SHALL provide a POST `/api/scoring-pipeline/run/:robotId` endpoint restricted to Admin role that triggers scoring pipeline execution for a single Humanoid_Robot.
22. WHEN the scoring pipeline executes, THE Scoring_Pipeline SHALL process each Humanoid_Robot sequentially: calculate PoC scores, calculate RFM scores, then generate positioning data.
23. WHEN the scoring pipeline completes for a robot, THE Scoring_Pipeline SHALL upsert (insert or update) the calculated scores into poc_scores, rfm_scores, and positioning_data tables, preserving the evaluatedAt timestamp of the new calculation.
24. THE Scoring_Pipeline SHALL log each pipeline execution in the pipelineRuns table with status, duration, and robot count processed.
25. THE Scoring_Pipeline SHALL log each step (poc_scoring, rfm_scoring, positioning_generation) in the pipelineStepLogs table with input count, success count, failure count, and duration.
26. WHEN a scoring calculation fails for a specific robot, THE Scoring_Pipeline SHALL log the error for that robot and continue processing remaining robots without halting the pipeline.
27a. WHEN the "기사 인사이트 파이프라인" (AI 기반 데이터 수집 또는 기사 붙여넣기) saves new or updated entities (companies, humanoidRobots, bodySpecs, handSpecs, computingSpecs, applicationCases) to the database via `/api/analysis/save` or `/api/analyze/save`, THE Portal SHALL automatically trigger the Scoring_Pipeline for all Humanoid_Robots linked to the affected entities.
27b. WHEN the "AI 기반 데이터 수집" (`/api/analysis/ai-search`) completes entity linking and saves new robot-related data, THE Portal SHALL automatically trigger the Scoring_Pipeline for the specific Humanoid_Robots that were created or updated during that session.
27c. WHEN automatic scoring is triggered by the analysis pipeline, THE Scoring_Pipeline SHALL execute asynchronously (non-blocking) so that the analysis pipeline response is not delayed.

### 요구사항 5: 스코어링 루브릭 투명성 — 대시보드 UI

**User Story:** 대시보드 사용자로서, 각 점수가 어떤 기준으로 계산되었는지 투명하게 확인하여 점수의 신뢰성을 판단하고 싶습니다.

#### 인수 조건

27. THE Trend_Dashboard SHALL display a "평가 기준 보기" button in each chart section header that opens the Rubric_Panel for that chart type.
28. WHEN a user clicks the "평가 기준 보기" button for the PoC radar section, THE Rubric_Panel SHALL display a table showing each of the 6 PoC factors with columns: 팩터명, 데이터 소스, 점수 구간 (1–10 매핑 기준), 계산 공식.
29. WHEN a user clicks the "평가 기준 보기" button for the RFM radar section, THE Rubric_Panel SHALL display a table showing each of the 6 RFM factors with columns: 팩터명, 데이터 소스, 점수 구간 (1–5 매핑 기준), 계산 공식.
30. WHEN a user clicks the "평가 기준 보기" button for a bubble chart section, THE Rubric_Panel SHALL display the axis mapping definitions: X축 의미, Y축 의미, 버블 크기 의미, 색상 그룹 기준.
31. THE Rubric_Panel SHALL display the evaluatedAt timestamp for each robot's scores, indicating when the score was last calculated.
32. WHEN a score is marked as "estimated" due to missing data, THE Trend_Dashboard SHALL display a visual indicator (warning icon with tooltip) next to that score explaining which data was missing.

### 요구사항 6: 스코어링 루브릭 API

**User Story:** 프론트엔드 개발자로서, 스코어링 루브릭 정보를 조회할 수 있는 API를 사용하여 대시보드에 평가 기준을 표시하고 싶습니다.

#### 인수 조건

33. THE Portal SHALL provide a GET `/api/scoring-pipeline/rubric/poc` endpoint returning the PoC scoring rubric definition including factor names, data sources, score ranges, and calculation formulas.
34. THE Portal SHALL provide a GET `/api/scoring-pipeline/rubric/rfm` endpoint returning the RFM scoring rubric definition including factor names, data sources, score ranges, and calculation formulas.
35. THE Portal SHALL provide a GET `/api/scoring-pipeline/rubric/positioning` endpoint returning the positioning data generation rules for all 3 chart types including axis mappings and color group definitions.
36. THE Portal SHALL provide a GET `/api/scoring-pipeline/status` endpoint restricted to Admin role returning the last pipeline execution status, timestamp, processed robot count, and per-step statistics.

### 요구사항 7: 파이프라인 실행 결과 및 Admin UI

**User Story:** 관리자로서, 파이프라인 실행 상태를 모니터링하고 필요 시 수동으로 재실행할 수 있기를 원합니다.

#### 인수 조건

37. WHEN an Admin accesses the Trend_Dashboard, THE Portal SHALL display a "스코어링 파이프라인" 섹션 in the Admin data management panel showing the last execution status, timestamp, and processed robot count.
38. THE Admin panel SHALL provide a "전체 재계산" button that triggers POST `/api/scoring-pipeline/run` and displays a progress indicator during execution.
39. THE Admin panel SHALL provide a per-robot "재계산" button next to each robot's score data that triggers POST `/api/scoring-pipeline/run/:robotId`.
40. WHEN the scoring pipeline is currently running, THE Admin panel SHALL disable the trigger buttons and display "파이프라인 실행 중..." status.
41. WHEN the scoring pipeline completes, THE Admin panel SHALL display a summary: total robots processed, success count, failure count, and total duration.
42. IF the scoring pipeline encounters errors, THEN THE Admin panel SHALL display the error details for each failed robot with the specific step that failed and the error message.

### 요구사항 8: 데이터 정합성 및 충돌 해결

**User Story:** 시스템 운영자로서, 자동 계산된 점수와 수동 입력된 점수 간의 충돌이 명확하게 관리되기를 원합니다.

#### 인수 조건

43. WHEN the scoring pipeline calculates scores for a robot that already has manually entered scores, THE Scoring_Pipeline SHALL overwrite the existing scores with the newly calculated values and record the previous values in the audit log.
44. THE Scoring_Pipeline SHALL add a source field to each score record metadata indicating "auto" for pipeline-generated scores and "manual" for Admin-entered scores.
45. WHEN an Admin manually edits a score after auto-calculation, THE Portal SHALL update the source field to "manual" and record the change in the audit log.
46. THE Trend_Dashboard SHALL display a badge ("자동" or "수동") next to each robot's score indicating the data source.

### 요구사항 9: 비기능 요구사항

**User Story:** 시스템 운영자로서, 스코어링 파이프라인이 성능 및 안정성 기준을 충족하여 안정적으로 운영되기를 원합니다.

#### 인수 조건

47. THE Scoring_Pipeline SHALL complete a full scoring run for up to 50 robots within 30 seconds.
48. THE Scoring_Pipeline SHALL execute each robot's scoring calculation as an independent database transaction, ensuring partial failures do not affect other robots' scores.
49. THE Scoring_Pipeline SHALL validate all calculated scores against the defined ranges (PoC: 1–10, RFM: 1–5) before persisting to the database, rejecting out-of-range values.
50. THE Portal SHALL invalidate React Query cache for humanoid trend data after a scoring pipeline execution completes, triggering automatic data refresh on the dashboard.
