# Implementation Plan: 휴머노이드 동향 대시보드

## Overview

기존 HRI Portal 모노레포에 `/humanoid-trend` 대시보드 페이지를 추가합니다. 백엔드에 3개 신규 테이블(poc_scores, rfm_scores, positioning_data)과 HumanoidTrendService, Fastify 라우트를 구현하고, 프론트엔드에 6종 차트 컴포넌트(Recharts), Admin CRUD 패널, PPT 다운로드 기능을 구현합니다. TypeScript 기반으로 전체 구현하며, fast-check PBT로 13개 정확성 속성을 검증합니다.

## Tasks

- [x] 1. 데이터베이스 스키마 및 마이그레이션
  - [x] 1.1 Drizzle ORM 스키마에 신규 테이블 3개 추가
    - `packages/backend/src/db/schema.ts`에 `pocScores`, `rfmScores`, `positioningData` 테이블 정의
    - poc_scores: id, robot_id(FK), payload_score(1–10), operation_time_score(1–10), finger_dof_score(1–10), form_factor_score(1–10), poc_deployment_score(1–10), cost_efficiency_score(1–10), evaluated_at, created_at, updated_at
    - rfm_scores: id, robot_id(FK), rfm_model_name, generality_score(1–5), real_world_data_score(1–5), edge_inference_score(1–5), multi_robot_collab_score(1–5), open_source_score(1–5), commercial_maturity_score(1–5), evaluated_at, created_at, updated_at
    - positioning_data: id, chart_type(varchar), robot_id(FK nullable), label, x_value(decimal), y_value(decimal), bubble_size(decimal), color_group, metadata(jsonb), evaluated_at, created_at, updated_at
    - CASCADE delete FK 제약조건 설정
    - robot_id, chart_type 인덱스 생성
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Relations 정의 추가
    - pocScoresRelations, rfmScoresRelations, positioningDataRelations 정의
    - humanoidRobotsRelations에 pocScores, rfmScores, positioningData many 관계 추가
    - _Requirements: 1.4_

  - [x] 1.3 데이터베이스 마이그레이션 생성 및 실행
    - Drizzle Kit으로 마이그레이션 파일 생성
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2. 백엔드 서비스 — HumanoidTrendService 구현
  - [x] 2.1 HumanoidTrendService 클래스 생성 및 조회 메서드 구현
    - `packages/backend/src/services/humanoid-trend.service.ts` 생성
    - getPocScores(): humanoid_robots + companies JOIN으로 robotName, companyName 포함 반환, averageScore 계산 (6팩터 산술평균, 소수점 1자리)
    - getRfmScores(): humanoid_robots + companies JOIN으로 robotName, companyName 포함 반환
    - getPositioningData(chartType): chart_type 필터링, humanoid_robots LEFT JOIN
    - getBarSpecs(): body_specs, hand_specs, poc_scores JOIN 집계 — 모든 스펙 NULL인 로봇 제외
    - _Requirements: 1.1, 1.2, 1.3, 2.7, 7.34, 11.58, 11.59, 11.60, 11.61_

  - [x] 2.2 HumanoidTrendService CRUD 메서드 구현 (Admin)
    - createPocScore, updatePocScore, deletePocScore
    - createRfmScore, updateRfmScore, deleteRfmScore
    - createPositioningData, updatePositioningData, deletePositioningData
    - 각 CUD 작업 후 감사 로그 기록 (admin 이메일, 작업 유형, 엔티티 타입, 타임스탬프)
    - _Requirements: 10.52, 10.53, 10.54, 10.56, 11.62_

  - [x] 2.3 유효성 검증 로직 구현
    - validatePocScores: 6개 팩터 1–10 범위 검증, 범위 밖 시 VALIDATION_ERROR 반환
    - validateRfmScores: 6개 팩터 1–5 범위 검증, 범위 밖 시 VALIDATION_ERROR 반환
    - chart_type enum 검증: 'rfm_competitiveness' | 'poc_positioning' | 'soc_ecosystem' 외 거부
    - robot_id FK 존재 검증: 존재하지 않으면 INVALID_REFERENCE 반환
    - 존재하지 않는 레코드 수정/삭제 시 NOT_FOUND 반환
    - _Requirements: 10.55, 11.64_

  - [ ]* 2.4 Property test: 데이터 저장 라운드트립 (Property 1)
    - **Property 1: 데이터 저장 라운드트립**
    - 유효한 PoC_Score, RFM_Score, Positioning_Data를 create 후 read하면 모든 필드 값이 동일
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ]* 2.5 Property test: CASCADE 삭제 전파 (Property 2)
    - **Property 2: CASCADE 삭제 전파**
    - humanoid_robot 삭제 시 연관된 poc_scores, rfm_scores, positioning_data 모두 삭제
    - **Validates: Requirements 1.4**

  - [ ]* 2.6 Property test: PoC 평균 점수 계산 (Property 3)
    - **Property 3: PoC 평균 점수 계산**
    - 6개 PoC 팩터 점수(1–10)의 산술 평균이 소수점 1자리 반올림 값과 동일
    - **Validates: Requirements 2.7**

  - [ ]* 2.7 Property test: 점수 범위 유효성 검증 (Property 7)
    - **Property 7: 점수 범위 유효성 검증**
    - PoC 1–10 범위 밖, RFM 1–5 범위 밖, chart_type enum 밖 → API 거부 + 검증 오류 반환
    - **Validates: Requirements 10.52, 10.53, 10.54, 10.55**

  - [ ]* 2.8 Property test: 감사 로그 기록 (Property 8)
    - **Property 8: 감사 로그 기록**
    - Admin CUD 작업 후 감사 로그에 admin 이메일, 작업 유형, 엔티티 타입, 타임스탬프 존재
    - **Validates: Requirements 10.56**

  - [ ]* 2.9 Property test: 바 차트 데이터 정합성 (Property 11)
    - **Property 11: 바 차트 데이터 정합성**
    - body_specs/hand_specs/poc_scores 중 하나 이상 데이터 있는 로봇만 포함, 값 일치
    - **Validates: Requirements 7.34, 11.61**

- [x] 3. Checkpoint — 백엔드 서비스 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. 백엔드 라우트 — Fastify API 엔드포인트
  - [x] 4.1 humanoid-trend 라우트 플러그인 생성
    - `packages/backend/src/routes/humanoid-trend.ts` 생성
    - GET `/api/humanoid-trend/poc-scores` — 인증 사용자, PoC 점수 전체 조회
    - GET `/api/humanoid-trend/rfm-scores` — 인증 사용자, RFM 점수 전체 조회
    - GET `/api/humanoid-trend/positioning/:chartType` — 인증 사용자, 차트 타입별 포지셔닝 데이터
    - GET `/api/humanoid-trend/bar-specs` — 인증 사용자, 바 차트 집계 데이터
    - _Requirements: 11.58, 11.59, 11.60, 11.61, 8.41_

  - [x] 4.2 Admin CRUD 라우트 구현
    - POST/PUT/DELETE `/api/humanoid-trend/poc-scores` — Admin 역할 제한
    - POST/PUT/DELETE `/api/humanoid-trend/rfm-scores` — Admin 역할 제한
    - POST/PUT/DELETE `/api/humanoid-trend/positioning` — Admin 역할 제한
    - 비-Admin 요청 시 HTTP 403 반환
    - DB 오류 시 HTTP 500 + 구조화된 에러 응답 + 서버 로그
    - _Requirements: 11.62, 11.64_

  - [x] 4.3 PPT export 라우트 구현
    - POST `/api/humanoid-trend/export-ppt` — Analyst, Admin 역할 제한
    - Viewer 요청 시 HTTP 403 + "리포트 다운로드는 Analyst 이상 권한이 필요합니다" 메시지
    - .pptx 바이너리 응답
    - _Requirements: 11.63, 9.50_

  - [x] 4.4 라우트를 Fastify 앱에 등록
    - 기존 라우트 등록 패턴에 따라 humanoid-trend 플러그인 등록
    - _Requirements: 8.36_

  - [ ]* 4.5 Property test: 역할 기반 접근 제어 (Property 6)
    - **Property 6: 역할 기반 접근 제어**
    - Viewer/Analyst/Admin 모두 GET 접근 가능, Admin만 POST/PUT/DELETE 가능, Analyst+Admin만 PPT export 가능, 권한 없는 요청은 HTTP 403
    - **Validates: Requirements 8.41, 9.42, 9.50, 11.62, 11.63**

  - [ ]* 4.6 Property test: API 응답에 JOIN 데이터 포함 (Property 9)
    - **Property 9: API 응답에 JOIN 데이터 포함**
    - GET poc-scores, rfm-scores 응답의 모든 레코드에 robotName, companyName이 비어있지 않은 문자열로 포함
    - **Validates: Requirements 11.58, 11.59**

  - [ ]* 4.7 Property test: 포지셔닝 데이터 차트 타입 필터링 (Property 10)
    - **Property 10: 포지셔닝 데이터 차트 타입 필터링**
    - GET /positioning/:chartType 응답의 모든 레코드 chartType이 요청 chartType과 동일
    - **Validates: Requirements 11.60**

- [x] 5. Checkpoint — 백엔드 API 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. PPT 생성 서비스 확장
  - [x] 6.1 PPTGeneratorService에 humanoid_trend 템플릿 추가
    - `packages/backend/src/services/ppt-generator.service.ts` 수정
    - PPTTemplate 타입에 'humanoid_trend' 추가
    - addHumanoidTrendSlides 메서드 구현
    - 타이틀 슬라이드: "휴머노이드 동향 리포트" + 생성일 + Portal 로고
    - 차트 슬라이드 6개: 프론트엔드 base64 이미지 삽입, 이미지 없으면 데이터 테이블 폴백
    - 슬라이드 제목: "산업용 PoC 팩터별 역량 비교", "RFM 역량 비교", "RFM 경쟁력 포지셔닝 맵", "산업용 PoC 로봇 포지셔닝 맵", "TOPS × SoC 에코시스템 포지셔닝 맵", "산업 배치 핵심 스펙 비교"
    - dark/light 테마 지원
    - _Requirements: 9.43, 9.44, 9.45, 9.46, 9.47, 9.48_

  - [ ]* 6.2 Property test: PPT 슬라이드 구조 (Property 12)
    - **Property 12: PPT 슬라이드 구조**
    - 유효한 데이터로 PPT 생성 시 타이틀 1개 + 차트 6개 = 7개 이상 슬라이드, 제목 일치
    - **Validates: Requirements 9.43, 9.46**

  - [ ]* 6.3 Property test: PPT 테마 적용 (Property 13)
    - **Property 13: PPT 테마 적용**
    - 'dark' 또는 'light' 테마로 PPT 생성 시 배경색이 해당 테마와 일치
    - **Validates: Requirements 9.48**

- [x] 7. Checkpoint — PPT 서비스 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. 프론트엔드 — API 클라이언트 및 React Query 훅
  - [x] 8.1 API 클라이언트 확장
    - `packages/frontend/src/lib/api.ts`에 humanoid-trend 관련 메서드 추가
    - getHumanoidTrendPocScores, getHumanoidTrendRfmScores, getHumanoidTrendPositioning, getHumanoidTrendBarSpecs
    - createPocScore, updatePocScore, deletePocScore (Admin CRUD)
    - createRfmScore, updateRfmScore, deleteRfmScore (Admin CRUD)
    - createPositioningData, updatePositioningData, deletePositioningData (Admin CRUD)
    - exportHumanoidTrendPpt (Blob 반환)
    - _Requirements: 11.58, 11.59, 11.60, 11.61, 11.62, 11.63_

  - [x] 8.2 React Query 훅 생성
    - `packages/frontend/src/hooks/useHumanoidTrend.ts` 생성
    - usePocScores, useRfmScores, usePositioningData(chartType), useBarSpecs — staleTime 5분(300000ms)
    - useCreatePocScore, useUpdatePocScore, useDeletePocScore — optimistic update + invalidation
    - useCreateRfmScore, useUpdateRfmScore, useDeleteRfmScore — optimistic update + invalidation
    - useCreatePositioningData, useUpdatePositioningData, useDeletePositioningData — optimistic update + invalidation
    - 에러 시 toast 알림, optimistic update 실패 시 자동 롤백
    - _Requirements: 12.69, 12.70_

- [x] 9. 프론트엔드 — 유틸리티 및 타입 정의
  - [x] 9.1 TypeScript 타입 정의
    - PocScoreWithRobot, RfmScoreWithRobot, PositioningDataWithRobot, BarSpecData 인터페이스
    - PocScoreDto, RfmScoreDto, PositioningDataDto 입력 타입
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 9.2 색상 유틸리티 함수 구현
    - `packages/frontend/src/components/humanoid-trend/color-utils.ts` 생성
    - getRobotColor(robotId): 로봇 ID 기반 일관된 색상 반환 (차트 타입/호출 시점 무관)
    - getCountryColor(countryCode): US→blue, CN→orange, KR→pink/red 매핑
    - getDistinctColors(n): N개(≤10) 서로 다른 색상 배열 반환
    - _Requirements: 2.10, 3.12, 6.26, 7.32_

  - [ ]* 9.3 Property test: 로봇 색상 일관성 (Property 4)
    - **Property 4: 로봇 색상 일관성**
    - 동일 robotId에 대해 호출 시점/차트 타입 무관 동일 색상 반환, US→blue, CN→orange, KR→pink/red
    - **Validates: Requirements 2.10, 6.26, 7.32**

  - [ ]* 9.4 Property test: 고유 색상 할당 (Property 5)
    - **Property 5: 고유 색상 할당**
    - N개(≤10) 서로 다른 로봇/RFM 모델에 대해 오버레이 레이더 차트 색상이 모두 상이
    - **Validates: Requirements 3.12**

- [x] 10. 프론트엔드 — 차트 컴포넌트 구현
  - [x] 10.1 PocRadarSection 컴포넌트 구현
    - `packages/frontend/src/components/humanoid-trend/PocRadarSection.tsx` 생성
    - Recharts RadarChart로 로봇별 개별 레이더 차트 렌더링
    - 6축: 페이로드, 운용시간, 핑거 DoF, 폼팩터, PoC 배포, 가성비
    - 로봇명, 회사명, 평균 점수(소수점 1자리) 라벨 표시
    - 반응형 그리드: 데스크톱 3열, 태블릿 2열, 모바일 1열
    - 데이터 없는 로봇: "PoC 평가 데이터 미등록" 플레이스홀더 카드
    - 일관된 로봇 색상 코딩 적용
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 10.2 RfmOverlayRadar 컴포넌트 구현
    - `packages/frontend/src/components/humanoid-trend/RfmOverlayRadar.tsx` 생성
    - Recharts RadarChart로 전체 RFM 모델 오버레이 레이더 차트 렌더링
    - 6축: 범용성, 실세계 데이터, 엣지 추론, 멀티로봇 협업, 오픈소스 개방성, 상용 성숙도
    - 최대 10개 시리즈, 각각 고유 색상 + 범례
    - 호버 시 툴팁: 로봇명, RFM 모델명, 해당 축 점수
    - 차트 하단 범례: 로봇명 + 색상 + RFM 모델명(괄호)
    - 2개 미만 시 안내 메시지 표시
    - _Requirements: 3.11, 3.12, 3.13, 3.14, 3.15_

  - [x] 10.3 RfmBubbleChart 컴포넌트 구현
    - `packages/frontend/src/components/humanoid-trend/RfmBubbleChart.tsx` 생성
    - Recharts ScatterChart + ZAxis로 버블 차트 렌더링
    - X축: 엣지 추론 역량(1–5), Y축: 범용성(1–5), 버블 크기: 상용 성숙도
    - 버블 라벨: 로봇명 + RFM 모델명
    - 호버 툴팁: 로봇명, RFM 모델명, 엣지 추론, 범용성, 상용 성숙도 점수
    - 축 라벨: 한국어(영어 부제)
    - 2개 미만 시 안내 메시지
    - _Requirements: 4.16, 4.17, 4.18, 4.19, 4.20_

  - [x] 10.4 PocBubbleChart 컴포넌트 구현
    - `packages/frontend/src/components/humanoid-trend/PocBubbleChart.tsx` 생성
    - X축: 폼팩터/인체 유사도(~4–11), Y축: 산업 적합성(~0–10), 버블 크기: 핑거 DoF
    - 버블 라벨: 로봇명 + P/T/F 어노테이션
    - 호버 툴팁: 로봇명, 폼팩터, 산업 적합성, 페이로드(kg), 운용시간(h), 핑거 DoF
    - 2개 미만 시 안내 메시지
    - _Requirements: 5.21, 5.22, 5.23, 5.24_

  - [x] 10.5 SocBubbleChart 컴포넌트 구현
    - `packages/frontend/src/components/humanoid-trend/SocBubbleChart.tsx` 생성
    - X축: SoC 에코시스템 수준(categorical), Y축: TOPS(0–2070T), 버블 크기: 출하 규모
    - 국가별 색상: US→blue, CN→orange, KR→pink/red
    - 색상 범례 표시
    - 호버 툴팁: 로봇명, SoC명, TOPS, 출하 규모, 국가
    - 2개 미만 시 안내 메시지
    - _Requirements: 6.25, 6.26, 6.27, 6.28, 6.29_

  - [x] 10.6 SpecBarCharts 컴포넌트 구현
    - `packages/frontend/src/components/humanoid-trend/SpecBarCharts.tsx` 생성
    - Recharts BarChart로 2×2 그리드 레이아웃
    - 4종: ① 페이로드(kg), ② 연속 운용시간(h), ③ 핸드 핑거 DoF, ④ 산업 PoC 배포 성숙도(x/10)
    - 카테고리 축: 로봇명, 값 축: 단위 라벨 포함
    - 일관된 로봇 색상 코딩
    - 호버 툴팁: 로봇명, 회사명, 정확한 값 + 단위
    - 2개 미만 시 안내 메시지
    - _Requirements: 7.30, 7.31, 7.32, 7.33, 7.34, 7.35_

- [x] 11. 프론트엔드 — 페이지 레이아웃 및 네비게이션
  - [x] 11.1 SectionNav 컴포넌트 구현
    - `packages/frontend/src/components/humanoid-trend/SectionNav.tsx` 생성
    - sticky 섹션 네비게이션 바 (상단 고정)
    - 6개 섹션 앵커: PoC 레이더, RFM 레이더, RFM 포지셔닝, PoC 포지셔닝, SoC 에코시스템, 스펙 비교
    - 클릭 시 해당 섹션으로 스크롤
    - _Requirements: 8.38, 8.39_

  - [x] 11.2 휴머노이드 동향 페이지 구현
    - `packages/frontend/src/app/humanoid-trend/page.tsx` 생성
    - 6개 차트 섹션 수직 스크롤 레이아웃
    - SectionNav 상단 배치
    - dark/light 테마 지원 (slate-900/950 배경)
    - 반응형 디자인: 데스크톱(≥1280px), 태블릿(768–1279px), 모바일(<768px)
    - 리사이즈 시 300ms 내 차트 재렌더링 (데이터 재요청 없이)
    - _Requirements: 8.36, 8.38, 8.40, 12.65, 12.66, 12.67, 12.68_

  - [x] 11.3 사이드바 네비게이션에 "휴머노이드 동향" 링크 추가
    - `packages/frontend/src/components/layout/Sidebar.tsx` 수정
    - '분석' 그룹에 { name: '휴머노이드 동향', href: '/humanoid-trend', icon: TrendingUp } 추가
    - _Requirements: 8.37_

- [x] 12. 프론트엔드 — Admin 데이터 관리 패널
  - [x] 12.1 AdminDataPanel 컴포넌트 구현
    - `packages/frontend/src/components/humanoid-trend/AdminDataPanel.tsx` 생성
    - Admin 역할일 때만 "데이터 관리" 버튼 표시
    - 모달/드로어 형태의 데이터 관리 패널
    - PoC_Score CRUD 폼: 로봇 선택, 6개 팩터 점수 입력 (1–10 범위 검증)
    - RFM_Score CRUD 폼: 로봇 선택, RFM 모델명, 6개 팩터 점수 입력 (1–5 범위 검증)
    - Positioning_Data CRUD 폼: 차트 타입 선택, 로봇 선택/입력, X/Y/버블 값, 색상 그룹, 메타데이터
    - 기존 레코드 테이블 + 편집/삭제 액션
    - 범위 밖 값 제출 시 검증 오류 표시
    - optimistic update 적용, 실패 시 롤백 + 에러 toast
    - _Requirements: 10.51, 10.52, 10.53, 10.54, 10.55, 10.57, 12.70_

- [x] 13. 프론트엔드 — PPT 다운로드 기능
  - [x] 13.1 PptDownloadButton 컴포넌트 구현
    - `packages/frontend/src/components/humanoid-trend/PptDownloadButton.tsx` 생성
    - Analyst, Admin 역할에만 "PPT 다운로드" 버튼 표시
    - Viewer 역할 시 접근 거부 메시지: "리포트 다운로드는 Analyst 이상 권한이 필요합니다"
    - 클릭 시 차트 이미지 캡처 (html2canvas 등) → base64 배열로 POST body 전송
    - 로딩 상태 표시
    - 생성 실패 시 에러 메시지 + 재시도 버튼 + 에러 로그 (타임스탬프, 이메일)
    - 현재 테마(dark/light) 전달
    - _Requirements: 9.42, 9.44, 9.47, 9.48, 9.49, 9.50_

- [x] 14. Checkpoint — 프론트엔드 전체 검증
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. 통합 및 최종 연결
  - [x] 15.1 전체 컴포넌트 연결 및 데이터 흐름 검증
    - 페이지에서 6개 차트 컴포넌트 + SectionNav + AdminDataPanel + PptDownloadButton 통합
    - React Query 캐싱 동작 확인 (5분 TTL)
    - Admin CRUD → 차트 자동 갱신 (invalidation) 확인
    - 에러 처리 흐름 확인: 네트워크 오류 시 React Query 자동 재시도(3회), toast 알림
    - _Requirements: 8.36, 8.38, 12.65, 12.69, 12.70_

- [x] 16. Final Checkpoint — 전체 통합 검증
  - Ensure all tests pass, ask the user if questions arise.
  - 모든 요구사항(70개 인수 조건) 커버리지 확인
  - 전체 통합 테스트 실행

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (13 properties)
- TypeScript 기반 전체 구현, fast-check PBT 라이브러리 사용
- 기존 모노레포 구조(packages/frontend, packages/backend)를 따름
- PPT 생성은 기존 PPTGeneratorService 확장 방식
