# 구현 계획: 자동 스코어링 파이프라인

## 개요

기존 DB 데이터(bodySpecs, handSpecs, computingSpecs, applicationCases 등)를 기반으로 poc_scores, rfm_scores, positioning_data를 자동 계산하는 백엔드 파이프라인과, 스코어링 루브릭을 투명하게 표시하는 프론트엔드 UI를 구현한다. 순수 함수 기반 계산 모듈 → 오케스트레이션 서비스 → API 라우트 → 분석 파이프라인 통합 → 프론트엔드 UI 순서로 점진적으로 구현한다.

## Tasks

- [x] 1. DB 마이그레이션 및 스키마 업데이트
  - [x] 1.1 poc_scores, rfm_scores 테이블에 metadata JSONB 컬럼 추가 마이그레이션 생성
    - `ALTER TABLE poc_scores ADD COLUMN metadata JSONB DEFAULT '{}'`
    - `ALTER TABLE rfm_scores ADD COLUMN metadata JSONB DEFAULT '{}'`
    - Drizzle ORM 스키마(`packages/backend/src/db/schema.ts`)에 metadata 컬럼 정의 추가
    - _요구사항: 8.44, 8.43, 1.7, 2.14_

- [x] 2. PoC 스코어링 순수 함수 모듈 구현
  - [x] 2.1 `packages/backend/src/services/scoring/poc-calculator.ts` 생성
    - `linearScale(value, maxValue, maxScore)` 유틸리티 함수 구현 — 값을 [0, maxValue] → [1, maxScore] 범위로 선형 매핑, 결과는 정수로 반올림, 클램핑 적용
    - `calculatePayloadScore(payloadKg)` — payloadKg를 0→1, 20+→10 선형 스케일로 매핑, null이면 score=1, estimated=true
    - `calculateOperationTimeScore(hours)` — operationTimeHours를 0→1, 8+→10 선형 스케일로 매핑
    - `calculateFingerDofScore(handDof)` — handDof를 0→1, 24+→10 선형 스케일로 매핑
    - `calculateFormFactorScore(heightCm, dofCount, fingerCount, locomotionType)` — 가중 복합 점수 (0.3+0.3+0.2+0.2=1.0), null 컴포넌트는 0 처리
    - `calculatePocDeploymentScore(cases)` — concept=1pt, pilot=3pt, production=5pt 합산, [1,10] 클램핑
    - `calculateCostEfficiencyScore(payloadKg, operationTimeHours, estimatedPriceUsd)` — 가격 null이면 5 반환, 유효하면 공식 적용
    - `calculatePocScores(specs: RobotWithSpecs)` — 전체 6-Factor 계산 및 PocScoreValues 반환
    - _요구사항: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ]* 2.2 PoC 계산기 속성 기반 테스트 작성 — Property 1: 선형 스케일 매핑 정확성
    - **Property 1: 선형 스케일 매핑 정확성**
    - **검증 대상: 요구사항 1.1, 1.2, 1.3**
    - `fast-check`로 임의의 양수 입력에 대해 linearScale 결과가 [1, maxScore] 범위 내 정수이고, v=0→1, v≥maxValue→maxScore 경계값 검증

  - [ ]* 2.3 PoC 계산기 속성 기반 테스트 작성 — Property 2: formFactorScore 가중치 합산 정확성
    - **Property 2: formFactorScore 가중치 합산 정확성**
    - **검증 대상: 요구사항 1.4, 1.7**
    - 임의의 heightCm, dofCount, fingerCount, locomotionType 조합에 대해 [1,10] 범위 정수 반환 및 null 처리 검증

  - [ ]* 2.4 PoC 계산기 속성 기반 테스트 작성 — Property 3: pocDeploymentScore 배포 사례 점수 합산
    - **Property 3: pocDeploymentScore 배포 사례 점수 합산**
    - **검증 대상: 요구사항 1.5, 1.7**
    - 임의의 deploymentStatus 리스트에 대해 concept=1, pilot=3, production=5 합산 및 [1,10] 클램핑 검증

  - [ ]* 2.5 PoC 계산기 속성 기반 테스트 작성 — Property 4: costEfficiencyScore 공식 정확성
    - **Property 4: costEfficiencyScore 공식 정확성**
    - **검증 대상: 요구사항 1.6, 1.7**
    - 임의의 payloadKg, operationTimeHours, estimatedPriceUsd 조합에 대해 null 가격→5, 유효 가격→공식 적용 검증

  - [ ]* 2.6 PoC 계산기 단위 테스트 작성
    - 각 팩터별 경계값 테스트 (0, 최대값, 최대값 초과, null)
    - 구체적 입력/출력 예시 검증
    - _요구사항: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 3. RFM 스코어링 순수 함수 모듈 구현
  - [x] 3.1 `packages/backend/src/services/scoring/rfm-calculator.ts` 생성
    - `calculateGeneralityScore(cases)` — distinct taskType 수: 1→1, 2→2, 3→3, 4→4, 5+→5
    - `calculateRealWorldDataScore(articleCount, keywords)` — real-world testing 키워드 매칭 수: 0→1, 1-2→2, 3-5→3, 6-10→4, 11+→5
    - `calculateEdgeInferenceScore(topsMax)` — TOPS 구간: 0-10→1, 11-50→2, 51-200→3, 201-500→4, 501+→5
    - `calculateMultiRobotCollabScore(keywords)` — multi-robot collaboration 키워드 매칭 수 기반 1–5
    - `calculateOpenSourceScore(keywords)` — open-source 관련 지표 수 기반 1–5
    - `calculateCommercialMaturityScore(stage)` — concept→1, prototype→2, poc→3, pilot→4, commercial→5
    - `calculateRfmScores(specs: RobotWithSpecs)` — 전체 6-Factor 계산 및 RfmScoreValues 반환
    - _요구사항: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14_

  - [ ]* 3.2 RFM 계산기 속성 기반 테스트 작성 — Property 5: generalityScore distinct taskType 카운트 매핑
    - **Property 5: generalityScore distinct taskType 카운트 매핑**
    - **검증 대상: 요구사항 2.8, 2.14**
    - 임의의 taskType 리스트에 대해 고유 카운트 → [1,5] 매핑 검증

  - [ ]* 3.3 RFM 계산기 속성 기반 테스트 작성 — Property 6: 키워드 카운트 기반 티어 매핑 정확성
    - **Property 6: 키워드 카운트 기반 티어 매핑 정확성**
    - **검증 대상: 요구사항 2.9, 2.11, 2.12, 2.14**
    - 임의의 키워드 리스트에 대해 0→1, 1-2→2, 3-5→3, 6-10→4, 11+→5 구간 매핑 검증

  - [ ]* 3.4 RFM 계산기 속성 기반 테스트 작성 — Property 7: edgeInferenceScore TOPS 구간 매핑
    - **Property 7: edgeInferenceScore TOPS 구간 매핑**
    - **검증 대상: 요구사항 2.10, 2.14**
    - 임의의 topsMax 값에 대해 TOPS 구간 매핑 및 null→1 검증

  - [ ]* 3.5 RFM 계산기 속성 기반 테스트 작성 — Property 8: commercialMaturityScore 카테고리 매핑
    - **Property 8: commercialMaturityScore 카테고리 매핑**
    - **검증 대상: 요구사항 2.13, 2.14**
    - 임의의 stage 문자열에 대해 카테고리 매핑 및 null/알 수 없는 값→1 검증

  - [ ]* 3.6 RFM 계산기 단위 테스트 작성
    - 각 팩터별 티어 경계값 테스트, 빈 키워드 리스트, null 입력
    - _요구사항: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14_

- [x] 4. 포지셔닝 데이터 생성 순수 함수 모듈 구현
  - [x] 4.1 `packages/backend/src/services/scoring/positioning-generator.ts` 생성
    - `generateRfmPositioning(rfmScore, robotName, companyName)` — xValue=edgeInferenceScore, yValue=generalityScore, bubbleSize=commercialMaturityScore, chartType='rfm_competitiveness'
    - `generatePocPositioning(pocScore, robotName, companyName)` — xValue=formFactorScore, yValue=(payloadScore×operationTimeScore/10), bubbleSize=fingerDofScore, chartType='poc_positioning'
    - `generateSocPositioning(computingSpec, applicationCaseCount, robotName, companyName, region)` — chartType='soc_ecosystem', colorGroup 매핑 (north_america→blue, china→orange, korea→pink)
    - `generateAllPositioning(pocScore, rfmScore, specs)` — 3종 포지셔닝 데이터 일괄 생성
    - label 형식: "{robotName} ({companyName})", metadata에 source score ID 및 계산 파라미터 포함
    - _요구사항: 3.15, 3.16, 3.17, 3.18, 3.19_

  - [ ]* 4.2 포지셔닝 생성기 속성 기반 테스트 작성 — Property 9, 10, 11: 포지셔닝 공식 정확성
    - **Property 9: RFM 경쟁력 포지셔닝 공식** — 검증 대상: 요구사항 3.15
    - **Property 10: PoC 포지셔닝 공식** — 검증 대상: 요구사항 3.16
    - **Property 11: SoC 에코시스템 포지셔닝 공식** — 검증 대상: 요구사항 3.17
    - 임의의 점수 조합에 대해 각 차트 타입별 xValue, yValue, bubbleSize, colorGroup 공식 정확성 검증

  - [ ]* 4.3 포지셔닝 생성기 속성 기반 테스트 작성 — Property 12: 포지셔닝 데이터 불변 조건
    - **Property 12: 포지셔닝 데이터 불변 조건**
    - **검증 대상: 요구사항 3.18, 3.19**
    - 모든 생성된 PositioningValues의 label 형식 "{robotName} ({companyName})" 및 metadata 구조 검증

- [x] 5. 체크포인트 — 순수 함수 모듈 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

- [x] 6. 스코어링 루브릭 프로바이더 구현
  - [x] 6.1 `packages/backend/src/services/scoring/rubric-provider.ts` 생성
    - `getPocRubric()` — PoC 6-Factor 루브릭 정의 (팩터명, 데이터 소스, 점수 구간, 계산 공식)
    - `getRfmRubric()` — RFM 6-Factor 루브릭 정의
    - `getPositioningRubric()` — 3종 포지셔닝 차트 축 매핑 및 색상 그룹 정의
    - 루브릭 데이터는 계산 로직과 동일한 기준으로 정적 정의
    - _요구사항: 5.28, 5.29, 5.30, 6.33, 6.34, 6.35_

- [x] 7. ScoringPipelineService 오케스트레이션 서비스 구현
  - [x] 7.1 `packages/backend/src/services/scoring-pipeline.service.ts` 생성
    - `fetchRobotWithSpecs(robotId)` — 로봇 + bodySpec, handSpec, computingSpec, applicationCases, 기사 데이터 일괄 조회
    - `processRobot(robot, runId)` — 단일 로봇 스코어링 처리: PoC 계산 → RFM 계산 → 포지셔닝 생성, 각 단계별 PipelineLogger 로깅
    - `upsertScores(result)` — robotId 기준 poc_scores, rfm_scores, positioning_data upsert, evaluatedAt 타임스탬프 갱신
    - `runFullPipeline(triggeredBy?)` — 전체 로봇 순차 처리, 개별 로봇 트랜잭션 격리, 실패 시 에러 로그 후 계속 진행
    - `runForRobot(robotId, triggeredBy?)` — 단일 로봇 스코어링
    - `runForRobots(robotIds, triggeredBy?)` — 특정 로봇 목록 스코어링 (분석 파이프라인 트리거용)
    - `getLastRunStatus()` — 마지막 파이프라인 실행 상태 조회
    - 점수 범위 검증: PoC [1,10], RFM [1,5] — 범위 초과 시 DB 저장 거부
    - metadata.source='auto' 설정, 기존 수동 점수 덮어쓰기 시 previousValues 기록
    - _요구사항: 4.20, 4.21, 4.22, 4.23, 4.24, 4.25, 4.26, 8.43, 8.44, 8.45, 9.47, 9.48, 9.49_

  - [ ]* 7.2 ScoringPipelineService 속성 기반 테스트 작성 — Property 13: 파이프라인 오류 격리
    - **Property 13: 파이프라인 오류 격리**
    - **검증 대상: 요구사항 4.26**
    - 일부 실패하는 로봇 목록으로 파이프라인 실행 시 나머지 로봇 정상 완료 검증

  - [ ]* 7.3 ScoringPipelineService 속성 기반 테스트 작성 — Property 14: Upsert 멱등성
    - **Property 14: Upsert 멱등성**
    - **검증 대상: 요구사항 4.23, 8.43**
    - 동일 로봇에 파이프라인 2회 실행 시 레코드 수 불변 및 evaluatedAt 갱신 검증

  - [ ]* 7.4 ScoringPipelineService 속성 기반 테스트 작성 — Property 15, 16: 메타데이터 및 범위 검증
    - **Property 15: 자동 생성 점수의 source 메타데이터** — 검증 대상: 요구사항 8.44
    - **Property 16: 점수 범위 검증** — 검증 대상: 요구사항 9.49
    - 파이프라인 생성 점수의 metadata.source="auto" 및 PoC [1,10], RFM [1,5] 범위 검증

- [x] 8. 스코어링 파이프라인 API 라우트 구현
  - [x] 8.1 `packages/backend/src/routes/scoring-pipeline.ts` 생성
    - `POST /api/scoring-pipeline/run` — Admin 전용, 전체 로봇 재계산 트리거, ScoringPipelineService.runFullPipeline() 호출
    - `POST /api/scoring-pipeline/run/:robotId` — Admin 전용, 단일 로봇 재계산 트리거
    - `GET /api/scoring-pipeline/status` — Admin 전용, 마지막 실행 상태 반환
    - `GET /api/scoring-pipeline/rubric/poc` — 인증 사용자, PoC 루브릭 반환
    - `GET /api/scoring-pipeline/rubric/rfm` — 인증 사용자, RFM 루브릭 반환
    - `GET /api/scoring-pipeline/rubric/positioning` — 인증 사용자, 포지셔닝 루브릭 반환
    - 동시 실행 방지: 이미 실행 중이면 409 Conflict 반환
    - Fastify 라우트를 메인 서버에 등록
    - _요구사항: 4.20, 4.21, 6.33, 6.34, 6.35, 6.36_

  - [ ]* 8.2 API 라우트 단위 테스트 작성
    - 인증/권한 검증 (Admin 전용 엔드포인트)
    - 요청/응답 형식 검증
    - 동시 실행 방지 409 응답 검증
    - _요구사항: 4.20, 4.21, 6.33, 6.34, 6.35, 6.36_

- [x] 9. 체크포인트 — 백엔드 파이프라인 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

- [x] 10. 분석 파이프라인 자동 트리거 통합
  - [x] 10.1 `packages/backend/src/routes/analysis.ts` 수정 — `/api/analysis/save` 엔드포인트에 후처리 추가
    - 저장 완료 후 연결된 로봇 ID 추출
    - `scoringPipelineService.runForRobots(robotIds)` 비동기(fire-and-forget) 호출
    - `.catch(err => console.error('Auto-scoring failed:', err))` 에러 처리
    - _요구사항: 4.27a, 4.27c_

  - [x] 10.2 `packages/backend/src/routes/analyze.ts` 수정 — `/api/analyze/save` 엔드포인트에 후처리 추가
    - 저장 완료 후 연결된 로봇 ID 추출
    - `scoringPipelineService.runForRobots(robotIds)` 비동기(fire-and-forget) 호출
    - _요구사항: 4.27b, 4.27c_

- [x] 11. 프론트엔드 — ScoreBadge 컴포넌트 구현
  - [x] 11.1 `packages/frontend/src/components/humanoid-trend/ScoreBadge.tsx` 생성
    - "자동"/"수동" 배지 표시 (metadata.source 기반)
    - estimated 필드가 있으면 경고 아이콘 + 툴팁 표시 (누락 데이터 설명)
    - evaluatedAt 타임스탬프 표시
    - _요구사항: 5.31, 5.32, 8.46_

- [x] 12. 프론트엔드 — RubricPanel 컴포넌트 구현
  - [x] 12.1 `packages/frontend/src/components/humanoid-trend/RubricPanel.tsx` 생성
    - "평가 기준 보기" 버튼 클릭 시 모달/패널 표시
    - PoC 루브릭: 6개 팩터 테이블 (팩터명, 데이터 소스, 점수 구간, 계산 공식)
    - RFM 루브릭: 6개 팩터 테이블 (팩터명, 데이터 소스, 점수 구간, 계산 공식)
    - 포지셔닝 루브릭: 축 매핑 정의 (X축, Y축, 버블 크기, 색상 그룹)
    - `/api/scoring-pipeline/rubric/*` API 호출하여 데이터 로드
    - _요구사항: 5.27, 5.28, 5.29, 5.30_

  - [x] 12.2 `packages/frontend/src/app/humanoid-trend/page.tsx` 수정
    - 각 차트 섹션 헤더에 "평가 기준 보기" 버튼 추가
    - ScoreBadge 컴포넌트를 각 로봇 점수 옆에 통합
    - _요구사항: 5.27, 5.31, 5.32, 8.46_

- [x] 13. 프론트엔드 — ScoringPipelineAdmin 컴포넌트 구현
  - [x] 13.1 `packages/frontend/src/components/humanoid-trend/ScoringPipelineAdmin.tsx` 생성
    - 마지막 실행 상태, 타임스탬프, 처리된 로봇 수 표시
    - "전체 재계산" 버튼 — `POST /api/scoring-pipeline/run` 호출, 실행 중 프로그레스 표시
    - 로봇별 "재계산" 버튼 — `POST /api/scoring-pipeline/run/:robotId` 호출
    - 실행 중 버튼 비활성화 + "파이프라인 실행 중..." 상태 표시
    - 완료 시 요약 표시: 총 로봇 수, 성공, 실패, 소요 시간
    - 에러 발생 시 실패 로봇별 에러 상세 표시 (실패 단계, 에러 메시지)
    - _요구사항: 7.37, 7.38, 7.39, 7.40, 7.41, 7.42_

  - [x] 13.2 `packages/frontend/src/components/humanoid-trend/AdminDataPanel.tsx` 수정
    - ScoringPipelineAdmin 컴포넌트를 Admin 데이터 관리 패널에 통합
    - _요구사항: 7.37_

- [x] 14. React Query 캐시 무효화 연동
  - [x] 14.1 스코어링 파이프라인 실행 완료 후 React Query 캐시 무효화 로직 추가
    - ScoringPipelineAdmin에서 파이프라인 실행 완료 시 humanoid trend 관련 쿼리 키 무효화
    - `useHumanoidTrend` 훅 또는 관련 쿼리에서 자동 리프레시 트리거
    - _요구사항: 9.50_

- [x] 15. 최종 체크포인트 — 전체 통합 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의합니다.

## 참고 사항

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조합니다
- 체크포인트는 점진적 검증을 보장합니다
- 속성 기반 테스트는 `fast-check` 라이브러리를 사용하여 보편적 정확성 속성을 검증합니다
- 단위 테스트는 구체적 예시와 엣지 케이스를 검증합니다
