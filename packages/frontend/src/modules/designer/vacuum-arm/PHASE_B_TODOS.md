# ARGOS-Designer · Phase B 작업 리스트

Phase A (Day 1~3): kinematic tree + IK + 충돌 검사
Phase B (이 문서): mount 위치가 영향을 미치지만 아직 분석에 반영 안 된 항목들

---

## B-1. Effective navigation footprint (mount + arm 길이 통합)

**문제**: 현재 `traversability` 분석은 베이스 footprint(직경 35cm)만 고려.
실제로 팔이 펴진 상태로 주행하면 effective footprint = 베이스 + 팔이 뻗는 영역.

**구체 케이스**:
- mount=전면 + 팔 펴짐(L1+L2=47cm) → 정면 효과적 길이 ≈ 35 + 47 = 82cm
- 좁은 통로(60cm)는 베이스만 보면 통과 가능, 팔까지 보면 불가능
- 현재 분석: "통과 가능" (잘못된 낙관)

**구현**:
- `traversability.service.ts`에 effective footprint 계산 추가
- 팔 자세별 (folded / extended / worst-case)로 footprint 다르게 계산
- UI: "주행 시 권장 자세" 토글 (folded만 vs worst-case 포함)
- 통로 통과 검사 로직: 팔 자세 가정 + footprint expansion

**예상 작업량**: 1일

---

## B-2. 회전 sweep 검사 (제자리 회전 시 가구 충돌)

**문제**: 로봇이 제자리 회전하면 팔 끝이 원을 그림. 가구와 충돌 검사 안 됨.

**구체 케이스**:
- mount=전면 + 팔 펴짐 → 회전 반경 = mount offset(+12cm) + 팔(47cm) ≈ 59cm
- 가구가 60cm 거리에 있으면 회전 중 충돌
- 현재: 검사 안 함

**구현**:
- 회전 sweep radius 계산: mount offset + L1 + L2 (worst-case 자세 기준)
- 360° sweep arc를 가구/장애물 AABB와 교차 검사
- UI: "회전 안전 영역" 시각화 (방 3D 모드에서 빨간색 원으로 표시)
- "이 위치에서 회전 가능?" 분석 결과 패널에 추가

**예상 작업량**: 0.5일

---

## B-3. Mount 비대칭 회전 토크 / 관성

**문제**: mount=좌/우면 회전 축 기준 비대칭 → 회전 시 모터 토크 비대칭.

**구체 케이스**:
- mount=우측이면 팔 + 페이로드의 무게가 회전 축에서 +12cm 떨어진 곳에 위치
- 가속/감속 시 비대칭 관성 → 회전 모터 토크 불균등
- 현재: 회전 분석 자체 없음

**구현**:
- 베이스 회전 축(중심) 기준 inertia tensor 계산
- mount 위치별 inertia 차이를 분석 패널에 표시
- 권장 회전 가속도 (모터 한계 기준) 계산
- UI: "회전 가속 한계" 항목 추가

**예상 작업량**: 1일 (정확한 inertia는 복잡, 단순화 가능)

---

## B-4. Mount 위치별 ZMP 자세 시나리오 다양화

**문제**: 현재 ZMP는 worst-case (팔 수평 outward) 한 자세만 계산.
실제로는 팔이 다양한 위치로 갈 수 있고, 각 자세마다 ZMP 다름.

**구체 케이스**:
- mount=중앙 + 팔이 옆으로 90° → ZMP가 옆으로 shift
- mount=전면 + 팔이 뒤로 굴절 → ZMP가 뒤로 shift (전복 위험 ↑)
- 현재: 모든 자세를 outward라 가정

**구현**:
- 자세 변수 확장: `armPose` 슬라이더 값을 ZMP 계산에 입력
- "현재 자세 ZMP" vs "worst-case ZMP" 두 값 표시
- 자세 sweep 분석: 모든 가능 자세에서 최악 ZMP 찾기

**예상 작업량**: 1일

---

## B-5. Lift column 동적 분석

**문제**: 현재 lift column은 시각만 있음. 분석 영향 없음.

**구체 케이스**:
- Lift column 펴면 무게중심이 위로 이동 → ZMP는 그대로지만 전복 안정성은 떨어짐 (모멘트 ↑)
- Lift column 펴면 effective shoulder height 변경 → 도달성 변화
- 현재: lift column 시각만, 분석은 무시

**구현**:
- ZMP에 lift 펴짐 양 반영 (높이 ↑ → 모멘트 ↑)
- 도달성 분석에 lift column extension 포함

**예상 작업량**: 0.5일

---

## 우선순위 제안

| 항목 | 영향 | 작업량 | 우선순위 |
|---|---|---|---|
| B-1 (effective footprint) | 높음 — "이 좁은 곳 갈 수 있나" 핵심 질문 | 1일 | 1 |
| B-2 (회전 sweep) | 높음 — 제자리 회전 충돌 | 0.5일 | 2 |
| B-4 (자세별 ZMP) | 중 — 분석 정확성 | 1일 | 3 |
| B-3 (회전 비대칭) | 중 — 모터 선정에 영향 | 1일 | 4 |
| B-5 (lift column) | 낮음 — 현재 default off | 0.5일 | 5 |

---

## 사용 방법

이 문서는 작업 진입 시 참고용. 새 항목 추가하거나 완료된 항목은 `~~취소선~~` 처리.
관련 코드 위치:
- ZMP / 토크 계산: `lib/client-statics.ts`
- 환경 분석: backend `services/designer/vacuum-arm/{environment,stability,statics}.service.ts`
- Mount offset 상수: `types/product.ts` `MOUNT_OFFSET_RATIO`
