# ARGOS-Designer — Phase 1 PoC 구현 스펙 (Claude Code용)

| 항목 | 내용 |
|---|---|
| **버전** | v1.2 |
| **작성일** | 2026-04-28 |
| **작성자** | 민파 (PM) |
| **개발자** | Claude Code (솔로 개발) |
| **기간** | 4개월 (M1~M4) |
| **데이터** | 100% Mock (실 BOM/스펙 절대 금지) |
| **배포** | ARGOS 외부 PoC (Railway) |
| **유즈케이스** | 로봇청소기 + 매니퓰레이터 1~2개 (Phase 1 한정) |

---

## v1.2 변경사항 요약

| 변경 | 내용 |
|---|---|
| **도구 정체성 재정의** | "의사결정 보조" → **"신제품 기획 단계 사전 사양 수렴 도구"** |
| **유즈케이스 좁힘** | 휴머노이드 5종 폼팩터 → **로봇청소기+팔 단일 유즈케이스** |
| **부품 모듈 정의** | 15종 사양 변수 (베이스 5 + 팔 9 + 페이로드 3) |
| **환경 시뮬 추가** | 방 평면도 + 가구 5종 + 바닥 장애물 + 타겟 마커 |
| **REQ 재구성** | 6개 → **10개** |
| **핵심 분석 로직 추가** | 정역학 토크 + ZMP 전복 안정성 + 베이스 통과 가능성 + 타겟 도달성 |
| **비교 모드 신설** | 사양 후보 A/B/C 정량 비교 (Trade-off Matrix) |
| **사양서 출력** | 개발팀 전달용 PDF Spec Sheet |
| **기능 표현 정정** | "갖고 놀다" 같은 표현 전면 제거, 정식 엔지니어링 용어로 통일 |

---

## 0. Claude Code 작업 가이드 (필수)

이 스펙은 Claude Code가 GitHub Issue 단위로 작업할 수 있도록 구조화되어 있다.

1. **REQ 단위로 PR 생성** — 각 REQ-N마다 별도 브랜치와 PR
2. **각 PR은 acceptance criteria 모두 통과해야 머지** — `pytest` (백엔드) + `vitest` (프론트) 통과 필수
3. **Mock 데이터만 사용** — 실 LG 부품 BOM, CLOiD 실 스펙, LG 가전 실 도면 모두 절대 금지. 위반 시 PR 즉시 리젝
4. **민파님 리뷰 후 머지** — 자동 머지 금지
5. **프론트는 ARGOS 기존 디자인 토큰 재사용** — 색상/폰트는 ARGOS 디자인 시스템 따름

**Claude Code가 막힐 때**: GitHub Issue에 `#question` 라벨 + `@minpa` 멘션. 추측으로 진행 금지.

**용어 규약** (이 스펙 전체에서 일관 사용):
- "사양 변수" (slider/dropdown으로 입력하는 값) — 절대 "옵션", "장난감 노브" 등으로 부르지 않음
- "공학적 분석" (계산 결과) — "피드백", "반응" 등으로 부르지 않음
- "사양 후보안" (저장된 구성) — "Save", "버전" 등으로 부르지 않음
- "사양 변경 로그" — "히스토리", "Tinker Trail" 등으로 부르지 않음
- "공학적 검토 의견" — "코칭", "조언" 등으로 부르지 않음

---

## 1. 프로젝트 개요

### 1.1 목적

신제품 기획 단계에서 부품 사양과 작동 환경을 함께 사전 시뮬레이션하여, 개발 착수 전 최적 사양을 수렴한다. 결과물은 개발팀에 전달할 확정 사양서.

### 1.2 비범위 (Phase 1 제외)

- 동적 경로계획 / 이동 시뮬 → Phase 2
- 충돌 회피 시뮬 → Phase 2
- 물리 엔진 (MuJoCo) 통합 → Phase 2
- URDF / MJCF export → Phase 2
- SolidWorks import → Phase 2
- 휴머노이드 폼팩터 (양족/4족) → Phase 3
- FoV / 카메라 시뮬 → Phase 3 (청소기+팔 유즈케이스에서는 차별점 약함)

### 1.3 성공 KPI (Phase 1 종료 시점)

| KPI | 목표값 |
|---|---|
| 주 사용자 (기획자/Task 리더) | 5명 이상 |
| 사용자 NPS | ≥ +30 |
| 사양 변경 검토 1건당 평균 시간 | 30분 이하 |
| 사양 후보 3개 이상 비교 실시 누적 | 30건 이상 |
| 연구소장 시연 5분 시나리오 통과 | Y |

---

## 2. 기술 스택 (ARGOS 기존 스택 재사용)

| 레이어 | 기술 | 비고 |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | ARGOS 동일 |
| 3D Rendering | Three.js + @react-three/fiber + @react-three/drei | 신규 도입 |
| 2D 평면도 (방 에디터) | React Konva (HTML5 Canvas) | 신규 도입 |
| State | Zustand | ARGOS 동일 |
| Styling | Tailwind CSS | ARGOS 동일 |
| Backend | FastAPI (Python 3.11+) | ARGOS 동일 |
| ORM | SQLAlchemy 2.x + Alembic | ARGOS 동일 |
| DB | PostgreSQL 15+ | ARGOS 동일 |
| AI 검토 의견 | Anthropic Claude API (claude-opus-4-7) | ARGOS 빌링 키 재사용 |
| PDF 생성 | ReportLab (Python) | 신규 도입 (사양서 출력) |
| 배포 | Railway (외부 PoC) | ARGOS 동일 |
| CI/CD | GitHub Actions → Railway 자동 배포 | ARGOS 동일 |
| Testing | pytest + vitest + playwright (E2E) | 신규 도입 |

> **구현 메모 (실제 ARGOS 스택 대응)**: 본 ARGOS 인스턴스는 Node.js + Fastify + TypeScript + Next.js로 운영 중. 위 표는 원안 그대로 보존하되, Phase 1 PoC 구현은 실제 스택을 따름:
> - Backend: Fastify + TypeScript (FastAPI 대신)
> - PDF 생성: pdfkit 또는 puppeteer (ReportLab 대신)
> - Testing: vitest (pytest 대신)
> - 그 외 항목(React, Three.js, Konva, Zustand, Tailwind, Claude API, Railway)은 원안과 동일

---

## 3. 디렉터리 구조

> **네임스페이스 결정**: v1.0(휴머노이드 5종 폼팩터) 모듈은 그대로 두고, v1.2는 `vacuum-arm/` 서브 네임스페이스에 격리. 추후 다른 로봇 유형(humanoid/quadruped 등)을 추가할 때도 같은 패턴.

```
packages/
├── frontend/src/
│   ├── modules/designer/                    # 기존 v1.0 (보존)
│   │   ├── components/{panels,viewport}/
│   │   ├── stores/, api/, types/
│   │   └── vacuum-arm/                      # 신규 v1.2
│   │       ├── components/
│   │       │   ├── viewport3d/
│   │       │   │   ├── RobotViewport.tsx     # Three.js 캔버스 (제품 + 환경 통합)
│   │       │   │   ├── VacuumBase.tsx
│   │       │   │   ├── ManipulatorArm.tsx
│   │       │   │   ├── EndEffector.tsx
│   │       │   │   ├── WorkspaceMesh.tsx     # 도달 가능 영역 메쉬
│   │       │   │   ├── ZMPOverlay.tsx        # 풋프린트 + ZMP 점
│   │       │   │   └── EnvironmentScene.tsx  # 가구·장애물 3D
│   │       │   ├── room-editor/                 # 2D 방 에디터
│   │       │   │   ├── RoomCanvas.tsx
│   │       │   │   ├── FurniturePalette.tsx
│   │       │   │   ├── ObstaclePalette.tsx
│   │       │   │   └── TargetMarkerEditor.tsx
│   │       │   ├── panels/
│   │       │   │   ├── SpecParametersPanel.tsx       # 좌측: 사양 변수 입력
│   │       │   │   ├── EngineeringAnalysisPanel.tsx  # 우측: 분석 결과
│   │       │   │   ├── EnvironmentPanel.tsx          # 환경 적합성
│   │       │   │   ├── CandidateComparisonPanel.tsx  # 후보안 비교
│   │       │   │   └── EngineeringReviewPanel.tsx    # 검토 의견
│   │       │   └── presets/
│   │       │       └── PresetSelector.tsx     # 빠른 시작 프리셋
│   │       ├── stores/designer-vacuum-store.ts
│   │       ├── api/designer-vacuum-api.ts
│   │       ├── types/{product,environment,analysis}.ts
│   │       └── index.ts
│   └── app/argos-designer/
│       ├── page.tsx                         # 기존 v1.0 (보존)
│       └── vacuum-arm/page.tsx              # 신규 v1.2 진입점
│
└── backend/src/
    ├── routes/designer/                     # 기존 v1.0 (보존)
    │   ├── form-factors.ts, sensors.ts, ...
    │   └── vacuum-arm/                      # 신규 v1.2 라우트 (prefix /api/designer/vacuum-arm)
    │       ├── index.ts
    │       ├── actuators.ts, end-effectors.ts
    │       ├── furniture.ts, obstacles.ts, target-objects.ts
    │       ├── room-presets.ts, scenarios.ts
    │       ├── analyze.ts, review.ts, match-actuators.ts
    │       ├── projects.ts, candidates.ts
    │       ├── compare.ts, revisions.ts
    │       └── spec-sheet.ts
    └── services/designer/
        ├── (기존 파일 보존)
        └── vacuum-arm/                      # 신규 v1.2 서비스
            ├── kinematics.service.ts        # FK, 도달 영역 계산
            ├── statics.service.ts            # 정역학 토크
            ├── stability.service.ts          # ZMP 전복 안정성
            ├── reachability.service.ts       # 환경 내 타겟 도달성
            ├── traversability.service.ts     # 베이스 통과 가능성
            ├── matching.service.ts           # 액추에이터 매칭
            ├── review.service.ts             # Claude API 검토 의견
            ├── spec-sheet.service.ts         # PDF 사양서 생성
            ├── types.ts
            └── mock-data/
                ├── actuators.json
                ├── end-effectors.json
                ├── room-presets.json     # 거실/주방/침실
                ├── furniture.json        # 5종 가구 + 표준 사이즈
                ├── obstacles.json        # 러그/문턱/케이블/장난감
                ├── target-objects.json   # 컵/리모컨/접시 등
                └── scenarios.json        # 5종 시나리오 프리셋

docs/designer/
├── SPEC.md (이 문서)
├── CONCEPT.md (1페이지 컨셉 페이퍼)
└── DEMO_SCENARIO.md (소장 시연 5분 시나리오)
```

---

## 4. 데이터 모델

### 4.1 PostgreSQL 테이블

```sql
-- ── 부품 카탈로그 ──
CREATE TABLE designer_actuators (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    vendor VARCHAR(100) NOT NULL,
    model_name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,                -- "QDD", "BLDC+Gear", "Servo"
    peak_torque_nm FLOAT NOT NULL,
    continuous_torque_nm FLOAT NOT NULL,
    max_speed_rpm FLOAT NOT NULL,
    weight_g FLOAT NOT NULL,
    diameter_mm FLOAT,
    price_usd_estimated FLOAT,
    backdrivable BOOLEAN DEFAULT TRUE,
    is_mock BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE designer_end_effectors (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,                -- "simple_gripper", "suction", "2finger", "3finger"
    weight_g FLOAT NOT NULL,
    max_payload_kg FLOAT NOT NULL,
    grip_width_mm_min FLOAT,
    grip_width_mm_max FLOAT,
    is_mock BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── 환경 카탈로그 ──
CREATE TABLE designer_furniture (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,                -- "sofa", "dining_table", "sink_counter", "desk", "chair"
    name VARCHAR(200) NOT NULL,
    width_cm FLOAT NOT NULL,
    depth_cm FLOAT NOT NULL,
    surface_height_cm FLOAT NOT NULL,         -- 윗면 높이 (좌석면 / 식탁 윗면 / 카운터 윗면)
    weight_kg FLOAT,                          -- 베이스 통과 시 부딪히면 안 됨
    is_mock BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE designer_obstacles (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,                -- "rug", "threshold", "cable", "toy"
    name VARCHAR(200) NOT NULL,
    height_cm FLOAT NOT NULL,                 -- 베이스가 넘을 수 있는지 판정용
    width_cm FLOAT NOT NULL,
    is_mock BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE designer_target_objects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,               -- "빈 컵", "리모컨", "접시", "장난감"
    weight_kg FLOAT NOT NULL,
    grip_width_mm FLOAT,                      -- 손이 잡을 수 있는 두께
    height_above_surface_cm FLOAT DEFAULT 0,  -- 가구 위 어느 높이에 놓였는지
    is_mock BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── 사용자 사양 후보안 ──
CREATE TABLE designer_spec_candidates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(200) NOT NULL,                -- "후보 A", "후보 B"
    project_id INTEGER REFERENCES designer_projects(id) ON DELETE CASCADE,
    product_config_json JSONB NOT NULL,        -- 베이스/팔/액추에이터/엔드이펙터
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE designer_projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    environment_config_json JSONB,             -- 방 평면도 + 가구 + 장애물 + 타겟
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE designer_evaluations (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES designer_spec_candidates(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES designer_projects(id) ON DELETE CASCADE,
    analysis_json JSONB NOT NULL,              -- 도달영역/토크/ZMP/타겟도달성
    review_text TEXT,                          -- Claude 검토 의견
    review_model VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE designer_revision_log (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES designer_spec_candidates(id) ON DELETE CASCADE,
    parameter_name VARCHAR(100) NOT NULL,      -- "L1", "shoulder_actuator", "arm_count"
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_candidates_user ON designer_spec_candidates(user_id);
CREATE INDEX idx_candidates_project ON designer_spec_candidates(project_id);
CREATE INDEX idx_evaluations_candidate ON designer_evaluations(candidate_id);
CREATE INDEX idx_revisions_candidate ON designer_revision_log(candidate_id);
```

### 4.2 핵심 Pydantic 스키마

> 실제 구현은 TypeScript 인터페이스 + Zod 스키마로 대응. 의미는 동일.

```python
# 원안 (참고용)
from pydantic import BaseModel, Field
from typing import Literal, Optional
from enum import Enum

class BaseShape(str, Enum):
    DISC = "disc"            # 원형 디스크 (LG 로보킹 형태)
    SQUARE = "square"        # 사각
    TALL_CYLINDER = "tall_cylinder"

class EndEffectorType(str, Enum):
    SIMPLE_GRIPPER = "simple_gripper"
    SUCTION = "suction"
    FINGER_2 = "2finger"
    FINGER_3 = "3finger"

class VacuumBaseSpec(BaseModel):
    shape: BaseShape
    height_cm: float = Field(ge=8, le=30)
    diameter_or_width_cm: float = Field(ge=25, le=40)
    weight_kg: float = Field(ge=3, le=8)
    has_lift_column: bool = False
    lift_column_max_extension_cm: float = Field(default=0, ge=0, le=30)

class ManipulatorArmSpec(BaseModel):
    mount_position: Literal["center", "front", "left", "right"]
    shoulder_height_above_base_cm: float = Field(ge=0, le=20)
    shoulder_actuator_sku: str
    upper_arm_length_cm: float = Field(ge=15, le=40)        # L1
    elbow_actuator_sku: str
    forearm_length_cm: float = Field(ge=15, le=40)          # L2
    wrist_dof: int = Field(ge=0, le=3)
    end_effector_sku: str

class ProductConfig(BaseModel):
    name: str
    base: VacuumBaseSpec
    arms: list[ManipulatorArmSpec] = Field(min_length=0, max_length=2)

# ── 환경 ──

class FurniturePlacement(BaseModel):
    furniture_id: int
    x_cm: float
    y_cm: float
    rotation_deg: float = 0

class ObstaclePlacement(BaseModel):
    obstacle_id: int
    x_cm: float
    y_cm: float
    rotation_deg: float = 0

class TargetMarker(BaseModel):
    target_object_id: int
    on_furniture_index: Optional[int] = None
    x_cm: float
    y_cm: float
    z_cm: float

class RoomConfig(BaseModel):
    preset: Optional[Literal["living_room", "kitchen", "bedroom"]] = None
    width_cm: float = Field(ge=200, le=1000)
    depth_cm: float = Field(ge=200, le=1000)
    furniture: list[FurniturePlacement]
    obstacles: list[ObstaclePlacement]
    targets: list[TargetMarker]

# ── 분석 결과 ──

class JointAnalysis(BaseModel):
    joint_name: str
    required_peak_torque_nm: float
    actuator_peak_torque_nm: float
    margin_pct: float
    over_limit: bool

class StabilityAnalysis(BaseModel):
    zmp_x_cm: float
    zmp_y_cm: float
    footprint_polygon_cm: list[list[float]]
    is_stable: bool
    margin_to_edge_cm: float

class TargetReachability(BaseModel):
    target_marker_index: int
    can_reach: bool
    reason: Optional[str] = None
    payload_margin_kg: float
    arm_used: Optional[int] = None

class TraversabilityMap(BaseModel):
    reachable_floor_area_cm2: float
    blocked_obstacles: list[int]
    coverage_pct: float

class AnalysisResult(BaseModel):
    workspace_max_reach_cm: float
    workspace_max_height_cm: float
    payload_at_max_reach_kg: float
    joints: list[JointAnalysis]
    stability: StabilityAnalysis
    targets: list[TargetReachability]
    traversability: TraversabilityMap
    estimated_total_price_usd: float
```

---

## 5. API 엔드포인트

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/designer/vacuum-arm/actuators` | 액추에이터 카탈로그 (필터: type, min_torque, max_weight) |
| GET | `/api/designer/vacuum-arm/end-effectors` | 엔드이펙터 카탈로그 |
| GET | `/api/designer/vacuum-arm/furniture` | 가구 카탈로그 |
| GET | `/api/designer/vacuum-arm/obstacles` | 장애물 카탈로그 |
| GET | `/api/designer/vacuum-arm/target-objects` | 타겟 물체 카탈로그 |
| GET | `/api/designer/vacuum-arm/room-presets` | 방 프리셋 (거실/주방/침실) |
| GET | `/api/designer/vacuum-arm/scenarios` | 시나리오 프리셋 5종 |
| POST | `/api/designer/vacuum-arm/analyze` | 사양 + 환경 → 공학적 분석 |
| POST | `/api/designer/vacuum-arm/review` | Claude API 검토 의견 |
| POST | `/api/designer/vacuum-arm/match-actuators` | 토크 요구사항 → 추천 액추에이터 |
| GET/POST/DELETE | `/api/designer/vacuum-arm/projects` | 프로젝트 (환경 정의) CRUD |
| GET/POST/DELETE | `/api/designer/vacuum-arm/candidates` | 사양 후보안 CRUD |
| POST | `/api/designer/vacuum-arm/compare` | 후보 N개 비교 매트릭스 |
| GET | `/api/designer/vacuum-arm/revisions/:candidate_id` | 사양 변경 로그 |
| POST | `/api/designer/vacuum-arm/spec-sheet` | PDF 사양서 생성 |

### 5.1 핵심 엔드포인트: POST /api/designer/vacuum-arm/analyze

**Request**:
```json
{
  "product": { ... ProductConfig ... },
  "room": { ... RoomConfig ... }
}
```

**Response**: `AnalysisResult` (위 스키마)

**서비스 로직**:

1. `kinematics.service.ts` — 작업 공간 (도달 가능 3D 영역) 계산
   - 단순화: 어깨 위치를 중심으로 반지름 (L1+L2)인 구면 - (L1-L2 절댓값)인 구면 사이의 영역
   - 베이스 최대 도달 높이 = base.height + arm.shoulder_height + (L1+L2)
   - 베이스 최대 리치 = (L1+L2) - base.diameter/2
2. `statics.service.ts` — 정역학 토크 (worst-case 자세: 팔 수평 뻗음)
3. `stability.service.ts` — ZMP 전복 안정성 (정적, 팔이 가장 멀리 뻗은 worst-case)
4. `reachability.service.ts` — 각 타겟에 대한 도달 가능성 + 사유
5. `traversability.service.ts` — 베이스가 통과 가능한 바닥 영역 (장애물 높이/폭 비교)

응답 시간 목표: < 800ms (debounce 후)

### 5.2 POST /api/designer/vacuum-arm/compare

**Request**:
```json
{
  "candidate_ids": [1, 5, 8],
  "project_id": 3
}
```

**Response**:
```json
{
  "matrix": [
    {
      "metric": "max_reach_cm",
      "label": "최대 리치",
      "values": [55.0, 62.0, 70.0],
      "unit": "cm",
      "best_index": 2
    },
    {
      "metric": "stability_margin_cm",
      "label": "ZMP 마진",
      "values": [4.2, 2.1, 1.5],
      "unit": "cm",
      "best_index": 0
    }
  ],
  "winners_per_metric": { },
  "overall_recommendation": "후보 A는 ZMP 안정성 강점, 후보 C는 도달성 강점. 환경 내 타겟 도달성 기준으로는 C 우위, 안전 마진 기준으로는 A 우위."
}
```

### 5.3 POST /api/designer/vacuum-arm/spec-sheet

후보안 1개를 받아 PDF 사양서 생성. 페이지 구성:

1. 표제 (제품 이름, 후보 이름, 작성자, 날짜)
2. 부품 사양 표 (베이스/팔/액추에이터/엔드이펙터 모두 SKU 포함)
3. 공학적 분석 결과 (도달/토크/ZMP/페이로드)
4. 환경 적합성 표 (각 타겟 도달 가능 여부)
5. 검토 의견 (Claude 출력)
6. 부록: 사양 변경 로그 (선택)

PDF는 pdfkit/puppeteer로 생성, 응답으로 다운로드 URL 반환.

---

## 6. UI 레이아웃

### 6.1 전체 레이아웃 (3-Pane + 환경 모드 토글)

```
┌──────────────────────────────────────────────────────────────────┐
│ 상단 ─ 프로젝트명 / [3D 뷰] [방 에디터] / [후보 A] [후보 B] [비교] │
├──────────────┬───────────────────────────────┬──────────────────┤
│              │                               │                  │
│   좌측       │       3D 뷰포트 또는           │   우측           │
│              │       2D 방 에디터             │                  │
│   사양       │                               │   공학적 분석    │
│   변수       │   ─ 3D 뷰: 청소기+팔+환경      │                  │
│   입력       │      도달 영역 메쉬, ZMP       │   ─ 도달 영역    │
│              │   ─ 방 에디터: 가구·장애물     │   ─ 페이로드     │
│   ▼ 베이스   │      ·타겟 드래그 배치         │   ─ 관절 토크    │
│   ▼ 팔 1     │                               │   ─ ZMP 상태     │
│   ▼ 팔 2     │   변경 로그 ↗                 │   ─ 가격         │
│   ▼ 페이로드 │                               │                  │
│              │                               │   환경 적합성    │
│              │                               │   ─ 타겟 도달성  │
│              │                               │   ─ 통과 가능 영역│
└──────────────┴───────────────────────────────┴──────────────────┘
                  하단: 검토 의견 패널 (collapsible)
```

### 6.2 핵심 컴포넌트

| 컴포넌트 | 책임 |
|---|---|
| `RobotViewport` | 3D 캔버스. 제품 + 환경 동시 렌더. config 변경 시 자동 갱신 (debounce 200ms) |
| `RoomCanvas` | 2D 평면도. 가구·장애물·타겟 드래그 배치 (React Konva) |
| `FurniturePalette` | 5종 가구 드래그 가능 카드 |
| `ObstaclePalette` | 장애물 드래그 가능 카드 |
| `TargetMarkerEditor` | 타겟 위치/높이 편집 |
| `SpecParametersPanel` | 좌측 사양 변수 입력 (15종 변수, 섹션별 collapse) |
| `EngineeringAnalysisPanel` | 우측 분석 결과 (recharts) |
| `EnvironmentPanel` | 환경 적합성 (타겟별 ✅/⚠️/❌, 통과 가능 영역 %) |
| `CandidateComparisonPanel` | 후보 비교 매트릭스 |
| `EngineeringReviewPanel` | Claude 검토 의견 |
| `RevisionLog` | 변경 이력 (좌측 하단) |
| `PresetSelector` | 빠른 시작 — 시나리오 5종 |

---

## 7. Mock 데이터 시드

### 7.1 액추에이터 (12종)

Tmotor: AK80-9 / AK10-9 / AK60-6
Maxon: EC-i 40 / EC-i 52
Unitree: A1 hip / A1 knee / B1 joint
Generic-Mock: SmallServo / MediumServo / LargeServo / ExtraLightServo

### 7.2 엔드이펙터 (4종)

- SimpleGripper-Mock (단순 집게, 0.3kg max)
- SuctionCup-Mock (흡착, 1.0kg max, 평면 한정)
- TwoFinger-Mock (2지 핑거, 0.8kg max)
- ThreeFinger-Mock (3지 핑거, 1.5kg max)

### 7.3 가구 (5종 × 가변 사이즈)

| 타입 | 표준 윗면 높이 | 비고 |
|---|---|---|
| sofa | 45cm | 좌석면 |
| dining_table | 75cm | 식탁 윗면 |
| sink_counter | 90cm | 카운터 윗면 |
| desk | 73cm | 책상 윗면 |
| chair | 45cm | 의자 좌석면 |

### 7.4 장애물 (4종)

| 타입 | 높이 | 폭 | 비고 |
|---|---|---|---|
| rug | 1.5cm | 가변 | 두꺼운 러그 |
| threshold | 2.0cm | 5cm | 문턱 |
| cable | 0.5cm | 2cm | 전선 |
| toy | 5~15cm | 가변 | 장난감 |

### 7.5 타겟 물체 (8종)

| 이름 | 무게 | grip width |
|---|---|---|
| 빈 컵 | 0.2kg | 70mm |
| 리모컨 | 0.15kg | 50mm |
| 빈 접시 | 0.4kg | 200mm (가장자리) |
| 휴대폰 | 0.2kg | 75mm |
| 책 | 0.5kg | 30mm |
| 양말 | 0.05kg | 가변 |
| 페트병 | 0.5kg | 65mm |
| 장난감 자동차 | 0.3kg | 80mm |

### 7.6 방 프리셋 (3종)

- **거실 (Living Room)** — 5m × 4m, 소파 1개, 식탁 0~1개, 의자 0~2개, 러그 1개
- **주방 (Kitchen)** — 4m × 3m, 싱크대 1개, 식탁 1개, 의자 4개, 문턱 1개
- **침실 (Bedroom)** — 4m × 3.5m, 책상 1개, 의자 1개, 러그 1개 (간소)

### 7.7 시나리오 5종

| 시나리오 | 환경 | 타겟 |
|---|---|---|
| **A. 바닥 정리** | 거실 + 장난감 3개 + 양말 2개 (바닥) | 양말×2, 장난감 자동차×1 |
| **B. 소파 위 회수** | 거실 + 소파 + 리모컨 1개 (소파 위) | 리모컨, 휴대폰 |
| **C. 식탁 위 컵 회수** | 거실 + 식탁 + 컵 2개 | 빈 컵×2 |
| **D. 식탁 정리 (양손)** | 주방 + 식탁 + 접시 4개, 컵 4개 | 접시×4, 컵×4 |
| **E. 싱크대 식기 정리** | 주방 + 싱크대 + 접시 (90cm 높이) | 접시 (싱크대 → 식기세척기 이동) |

---

## 8. REQ-N 단위 작업 분해 (Claude Code Issue)

전체 10개 REQ. 각 REQ는 별도 브랜치/PR.

### REQ-1: 사양 변수 입력 패널 + 청소기 베이스 3D 시각화
**브랜치**: `feat/req-1-spec-params-base`
**기간**: M1 W3 ~ M2 W2 (4주)

**Acceptance Criteria**:
- [ ] 좌측 SpecParametersPanel UI 구현 (베이스 5변수 + 빈 팔 섹션)
- [ ] 슬라이더/드롭다운 변경 시 store 즉시 갱신
- [ ] 3D 뷰포트에 베이스 폼·높이·직경 즉시 반영 (단순 박스/실린더)
- [ ] OrbitControls 동작
- [ ] vitest: 슬라이더 변경 → store 변경 검증
- [ ] vitest (백엔드): GET 카탈로그 엔드포인트 응답 스키마 검증

---

### REQ-2: 매니퓰레이터 팔 추가 (1~2개) + 사양 변수 + 3D 표시
**브랜치**: `feat/req-2-manipulator-arm`
**기간**: M2 W1 ~ M2 W4 (4주)

**Acceptance Criteria**:
- [ ] 팔 0/1/2개 토글 동작
- [ ] 팔 9변수(어깨 위치, L1, L2, DOF, 액추에이터×2, 엔드이펙터) 입력
- [ ] 3D 뷰포트에 팔이 베이스 위에 즉시 렌더 (실린더+박스 단순 모델)
- [ ] 액추에이터/엔드이펙터 SKU 드롭다운에 mock_data 카탈로그 연동
- [ ] 팔 2개 시 좌우 마운트 위치 선택

---

### REQ-3: 작업 공간 3D 메쉬 시각화 (도달 가능 영역)
**브랜치**: `feat/req-3-workspace-mesh`
**기간**: M2 W4 ~ M3 W1 (2주)

**Acceptance Criteria**:
- [ ] 어깨 기준 sphere (L1+L2) - sphere(|L1-L2|) 영역을 반투명 메쉬로 표시
- [ ] 팔 2개면 두 영역 모두 표시 (색상 구분)
- [ ] 사양 변경 시 메쉬 자동 갱신 (debounce 200ms)
- [ ] 메쉬 투명도 토글 가능
- [ ] vitest: 도달 영역 계산 함수 단위 테스트 (수기 계산 대비 ±5%)

---

### REQ-4: 정역학 토크 + 페이로드 ↔ 리치 트레이드오프
**브랜치**: `feat/req-4-statics-payload`
**기간**: M3 W1 ~ M3 W2 (2주)

**Acceptance Criteria**:
- [ ] 우측 EngineeringAnalysisPanel에 관절별 토크 바차트 (recharts)
- [ ] 페이로드 ↔ 리치 트레이드오프 곡선 (recharts LineChart)
- [ ] 한계 초과 관절 빨강 강조
- [ ] `POST /api/designer/vacuum-arm/analyze` 응답에 joints 배열 포함
- [ ] vitest: 단순 2-link arm 케이스 토크 계산 ±5% 검증

**계산식** (`statics.service.ts`):
```ts
function shoulderTorque(L1: number, L2: number, mPayload: number, mUpperArm: number, mForearm: number): number {
  // 팔 수평 뻗은 worst-case
  const g = 9.81;
  // 상완 무게중심: 어깨에서 L1/2
  const momentUpperArm = mUpperArm * g * (L1 / 2);
  // 전완 무게중심: 어깨에서 L1 + L2/2
  const momentForearm = mForearm * g * (L1 + L2 / 2);
  // 페이로드: 어깨에서 L1 + L2
  const momentPayload = mPayload * g * (L1 + L2);
  return momentUpperArm + momentForearm + momentPayload; // Nm
}

function elbowTorque(L2: number, mPayload: number, mForearm: number): number {
  const g = 9.81;
  const momentForearm = mForearm * g * (L2 / 2);
  const momentPayload = mPayload * g * L2;
  return momentForearm + momentPayload;
}
```

---

### REQ-5: ZMP 전복 안정성 시각화 ⭐
**브랜치**: `feat/req-5-zmp-stability`
**기간**: M3 W2 ~ M3 W4 (3주)

**Acceptance Criteria**:
- [ ] 3D 뷰포트에 베이스 풋프린트 다각형(원/사각) 평면 오버레이
- [ ] ZMP 점 표시 (베이스 중심 기준 좌표)
- [ ] ZMP가 풋프린트 안 = 초록 / 경계 5cm 이내 = 노랑 / 밖 = 빨강
- [ ] 우측 패널에 "ZMP 마진 X.X cm" 표시
- [ ] 사양/환경 변경 시 즉시 갱신
- [ ] vitest: ZMP 계산 단위 테스트 (수기 계산 케이스 5건)

**계산식** (`stability.service.ts`):
```ts
function computeZmp(productConfig, payloadKg: number, payloadPositionXyz): { x: number; y: number } {
  // 정적 ZMP — 팔이 가장 멀리 뻗었을 때 worst-case
  const masses: number[] = [];
  const positions: Array<[number, number]> = []; // 베이스 중심 기준

  // 베이스
  masses.push(productConfig.base.weightKg);
  positions.push([0, 0]);

  for (const arm of productConfig.arms) {
    // 어깨 액추에이터
    const actuatorMass = getActuatorWeight(arm.shoulderActuatorSku) / 1000;
    masses.push(actuatorMass);
    positions.push([shoulderX, shoulderY]);
    // 상완 + 팔꿈치 + 전완 + 엔드이펙터 + 페이로드 …
  }

  const totalMass = masses.reduce((a, b) => a + b, 0);
  const zmpX = masses.reduce((s, m, i) => s + m * positions[i][0], 0) / totalMass;
  const zmpY = masses.reduce((s, m, i) => s + m * positions[i][1], 0) / totalMass;
  return { x: zmpX, y: zmpY };
}

function marginToFootprint(zmpX: number, zmpY: number, footprintPolygon): number {
  // 다각형 변까지의 최단거리. 다각형 밖이면 음수
  ...
}
```

---

### REQ-6: 2D 방 에디터 (가구·장애물·타겟 배치) ⭐
**브랜치**: `feat/req-6-room-editor`
**기간**: M2 W3 ~ M3 W2 (4주, REQ-3과 병행 가능)

**Acceptance Criteria**:
- [ ] 상단 [방 에디터] 탭 클릭 시 2D 평면도 표시
- [ ] 방 사이즈 입력 (width/depth)
- [ ] 가구 5종 팔레트 → 평면도 드래그 배치
- [ ] 가구 클릭 → 위치/회전/사이즈 편집
- [ ] 장애물 4종 동일 워크플로우
- [ ] 타겟 마커 추가 (특정 가구 위 X cm 또는 바닥 X,Y,Z)
- [ ] [3D 뷰] 탭 전환 시 환경 3D 렌더
- [ ] 방 프리셋 3종 로드 가능
- [ ] React Konva로 구현
- [ ] vitest: 가구 드래그/배치 컴포넌트 테스트

---

### REQ-7: 환경 내 타겟 도달성 + 베이스 통과 가능성 분석 ⭐
**브랜치**: `feat/req-7-environment-analysis`
**기간**: M3 W3 ~ M4 W1 (3주)

**Acceptance Criteria**:
- [ ] 우측 EnvironmentPanel — 각 타겟에 대해 ✅/⚠️/❌ + 사유 표시
- [ ] 통과 가능 바닥 영역 % 표시
- [ ] 3D 뷰포트에 통과 가능 영역 반투명 청록 오버레이
- [ ] 사양 또는 환경 변경 시 즉시 갱신
- [ ] `POST /api/designer/vacuum-arm/analyze` 응답에 targets[], traversability 포함
- [ ] vitest: 5개 시나리오 케이스 자동 검증

**계산 로직** (`reachability.service.ts`):
```ts
function evaluateTargetReachability(product, room, target) {
  // 각 타겟에 대해 도달 가능성 평가
  const baseCanApproach = traversabilityCheck(product.base, room.obstacles, target.x, target.y);
  if (!baseCanApproach) return { canReach: false, reason: '베이스 통과 불가' };

  const armMaxHeight = computeMaxHeight(product);
  if (target.zCm > armMaxHeight) {
    return { canReach: false, reason: `리치 부족 (${armMaxHeight.toFixed(0)}cm < ${target.zCm}cm)` };
  }

  const zmpStable = checkZmpAtTarget(product, target);
  if (!zmpStable) return { canReach: false, reason: 'ZMP 한계 (전복 위험)' };

  const targetWeight = getTargetWeight(target.targetObjectId);
  const payloadOk = checkPayloadAtTarget(product, target, targetWeight);
  if (!payloadOk) return { canReach: false, reason: '토크 한계 (페이로드 초과)' };

  return { canReach: true, reason: 'OK', payloadMarginKg: ... };
}
```

---

### REQ-8: 사양 후보안 저장 + N개 비교 매트릭스 ⭐
**브랜치**: `feat/req-8-candidate-comparison`
**기간**: M4 W1 ~ M4 W2 (2주)

**Acceptance Criteria**:
- [ ] 상단 [후보 A] [후보 B] 버튼 → 현재 구성 저장
- [ ] [비교] 버튼 → 후보 N개 비교 매트릭스 모달
- [ ] 매트릭스: 행=메트릭, 열=후보, 최우 셀 강조
- [ ] 메트릭 6종 이상 (max_reach, max_height, payload_at_max, zmp_margin, target_reach_pct, total_price)
- [ ] `POST /api/designer/vacuum-arm/compare` 동작
- [ ] 우승 메트릭 카운트로 종합 추천 멘트 자동 생성

---

### REQ-9: 사양 변경 로그 (Revision Log)
**브랜치**: `feat/req-9-revision-log`
**기간**: M4 W2 ~ M4 W3 (1주)

**Acceptance Criteria**:
- [ ] 좌측 하단 변경 로그 패널 (collapsible)
- [ ] 사양 변수 변경 시마다 designer_revision_log에 자동 기록
- [ ] 각 항목 클릭 시 그 시점 사양으로 복원
- [ ] 최근 20건만 표시 (오래된 것 토글)

---

### REQ-10: Claude API 검토 의견 + PDF 사양서 출력 ⭐
**브랜치**: `feat/req-10-review-spec-sheet`
**기간**: M4 W2 ~ M4 W4 (3주)

**Acceptance Criteria**:
- [ ] 하단 EngineeringReviewPanel — [검토 받기] 버튼
- [ ] Claude API 응답을 severity 카드(high/medium/low)로 표시
- [ ] 각 권고 항목에 [이 권고 적용] 버튼 (사양 자동 수정)
- [ ] [사양서 출력 PDF] 버튼 → pdfkit/puppeteer 생성 → 다운로드
- [ ] PDF 6페이지 구성 (5.3 참조)
- [ ] vitest: Claude API mock으로 응답 파싱 검증
- [ ] vitest: PDF 생성 성공 검증

**Claude 프롬프트** (`review.service.ts`):
```ts
const SYSTEM_PROMPT = `당신은 로봇 제품 사양 검토자입니다.
사용자가 제출한 제품 사양과 환경에서의 공학적 분석 결과를 보고,
한국어로 간결하게 사양상의 약점과 개선 권고를 제시합니다.

응답 형식 (JSON):
{
  "summary": "1-2문장 핵심 진단",
  "issues": [
    {
      "severity": "high|medium|low",
      "title": "문제 제목",
      "explanation": "왜 문제인지 (수치 포함, 1-2문장)",
      "recommendations": [
        {"action": "권고 1", "expected_effect": "예상 효과 (수치)"}
      ]
    }
  ]
}

원칙:
- 수치 필수 ("18% 부족", "ZMP 마진 1.2cm")
- 가장 critical한 issue 3개 이내
- 추측 금지, analysis 데이터 근거
- 톤: 정중하나 단호하게 (검토자 톤, "함께 살펴보면 좋을 것 같습니다" 같은 모호한 표현 금지)
`;
```

---

## 9. 보안 가드레일 (Phase 1 절대 위반 금지)

1. `is_mock=true` 컬럼이 없는 부품/가구 데이터는 DB 입력 불가 (Pydantic/Zod validator)
2. CLOiD 실 스펙 / LG 가전 실 도면 / 협력사 BOM commit 시 pre-commit hook 차단
3. `.env`에 LG 사내 키/시크릿 절대 금지 — Railway 환경변수만 사용
4. GitHub repo는 Private, 외부 collaborator 추가 금지
5. Railway 프로젝트는 ARGOS 본 프로젝트와 분리 (`designer-poc` 별도)
6. 사용자 입력 데이터는 7일 후 자동 삭제 (cron + delete projects/candidates older than 7d)

---

## 10. 마일스톤 + 게이트

| 마일스톤 | 시점 | Go 조건 |
|---|---|---|
| ◆ M1 W4 — REQ v1.2 fix | 4주차 | 인터뷰 7명 완료, REQ-1~10 acceptance criteria 합의 |
| ◆ M2 W4 — Visual MVP | 8주차 | REQ-1, REQ-2, REQ-3, REQ-6 머지 (제품+환경 시각화) |
| ◆ M3 W4 — Engineering 완성 | 12주차 | REQ-4, REQ-5, REQ-7 머지 (분석 로직) |
| ◆ M4 W4 — 연구소장 시연 | 16주차 | REQ-8, REQ-9, REQ-10 머지, 5분 시연 통과, 시연 영상 녹화 |

---

## 11. 연구소장 시연 5분 시나리오 (M4 W4)

| 시간 | 시연 |
|---|---|
| 0:00–0:30 | 시나리오 C(식탁 위 컵 회수) 로드. 거실 평면도 + 청소기+팔 1개 |
| 0:30–1:30 | 식탁 위 컵 타겟 → ⚠️ "리치 부족 53cm". 팔 길이 슬라이더 +20% → ✅ 변경 |
| 1:30–2:30 | 시나리오 D(식탁 정리, 양손)로 전환. 후보 A 저장 |
| 2:30–3:30 | 후보 B = 팔 2개 + 강한 액추에이터. 비교 매트릭스 → 후보 B는 페이로드 우위, 후보 A는 가격·ZMP 우위 |
| 3:30–4:30 | 시나리오 E(싱크대 90cm) → ❌ "ZMP 한계, 베이스 리프트 컬럼 30cm 권고" 검토 의견 자동 생성 |
| 4:30–5:00 | [사양서 출력 PDF] → 6페이지 사양서 다운로드. *"이 PDF가 개발팀에 전달됩니다"* |

---

## 12. Out of Scope (Phase 1 절대 안 함)

- 동적 시뮬 (forward dynamics, contact)
- 경로계획·이동 시뮬
- 충돌 회피 시뮬
- MuJoCo 물리 엔진 통합
- URDF/MJCF export
- SolidWorks/CATIA import
- 휴머노이드 폼팩터
- 멀티 사용자 협업 워크스페이스
- 사내 AD 인증

---

## 13. 변경 이력

| 버전 | 날짜 | 변경 내용 |
|---|---|---|
| v1.0 | 2026-04-28 | 최초 작성 (휴머노이드 5종 폼팩터, 6 REQ) |
| v1.1 | 2026-04-28 | 청소기+팔 단일 유즈케이스로 좁힘, ZMP 추가 |
| v1.2 | 2026-04-28 | 사양 수렴 도구로 정체성 정정 + 환경 시뮬 추가, 10 REQ로 재구성 |
