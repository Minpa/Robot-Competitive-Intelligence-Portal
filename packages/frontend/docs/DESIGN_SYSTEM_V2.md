# ARGOS v2 Design System

Consulting-report aesthetic (McKinsey / BCG / Bain 참고) 기반의 디자인 시스템.
플랫(no rounded corners, no heavy shadows) · 세리프 타이포 · 헤어라인 보더 · 무채색+브랜드 네이비+골드 악센트.

설치 위치
- 토큰: [packages/frontend/tailwind.config.js](../tailwind.config.js)
- 글로벌 스타일: [src/app/globals.css](../src/app/globals.css)
- UI 프리미티브: [src/components/ui/](../src/components/ui/)
- 레이아웃 셸: [src/components/layout/](../src/components/layout/)
- 차트 팔레트: [src/components/humanoid-trend/color-utils.ts](../src/components/humanoid-trend/color-utils.ts)

---

## 1. Color Tokens

모두 Tailwind 클래스로 사용 (`bg-*`, `text-*`, `border-*`). 숫자 접미사가 있는 토큰(`ink-*`)과 시맨틱 토큰(`brand`, `pos` 등)의 두 계열이 있다.

### 1.1 Ink Scale — 중립(그레이) 계열
테마의 모든 텍스트/보더/배경은 이 스케일에서 고른다.

| Token      | Hex       | 주 용도                              |
| ---------- | --------- | ------------------------------------ |
| `ink-50`   | `#F6F7F9` | 매우 옅은 표면 (hover, subtle zone)  |
| `ink-100`  | `#EDEFF3` | 구분선, 표 내부 경계                 |
| `ink-200`  | `#D9DDE4` | 카드/패널 보더 (기본 헤어라인)       |
| `ink-300`  | `#B4BBC7` | 표 헤더 보더, muted 구분자           |
| `ink-400`  | `#818A9B` | placeholder, 보조 메타               |
| `ink-500`  | `#5A6475` | 보조 텍스트, kicker 기본색           |
| `ink-600`  | `#3D4656` | 레이블, 표 본문 보조                 |
| `ink-700`  | `#2A3342` | 본문 텍스트                          |
| `ink-800`  | `#18202E` | 표 셀 텍스트, 강한 본문              |
| `ink-900`  | `#0B1E3A` | 제목, 숫자 강조 (브랜드 네이비와 동치) |

### 1.2 Surface
| Token         | Hex       | 용도                           |
| ------------- | --------- | ------------------------------ |
| `paper`       | `#F8F7F3` | 페이지 배경 (bg-paper)         |
| `white`       | `#FFFFFF` | 카드/패널 기본 배경            |

### 1.3 Brand / Accent
| Token         | Hex       | 용도                                         |
| ------------- | --------- | -------------------------------------------- |
| `brand`       | `#0B1E3A` | 사이드바, 다크 패널, 프라이머리 버튼         |
| `brand-ink`   | `#FFFFFF` | brand 위 텍스트                              |
| `brand-soft`  | `#15325B` | brand hover, 다크 패널 보더                  |
| `gold`        | `#B8892B` | 악센트(번호, 활성 탭 언더라인, kicker gold)  |
| `gold-soft`   | `#E7D9B2` | gold 태그/인사이트 배경                      |

### 1.4 Semantic (Status)
각 토큰은 본색(진함)과 `-soft`(옅음) 쌍으로 제공됨. 쌍 사용 규칙: **배경은 `*-soft`, 텍스트/보더/도트는 본색.**

| Pair               | 본색 Hex    | soft Hex    | 의미                   |
| ------------------ | ----------- | ----------- | ---------------------- |
| `pos` / `pos-soft` | `#2F7D5A`   | `#D8E9DF`   | 긍정/상승/완료         |
| `warn` / `warn-soft` | `#B38A1F` | `#F1E5C1`   | 주의/진행/대기         |
| `neg` / `neg-soft` | `#B0452A`   | `#EED4CA`   | 부정/하락/오류         |
| `info` / `info-soft` | `#1F4A7A` | `#D4E0EE`   | 정보/참고/인증         |

> 과거 `argos-*` 팔레트는 v2에서 모두 제거됨. 새 코드에 사용하지 말 것.

---

## 2. Typography

### 2.1 Font Stacks (CSS 변수 + Tailwind)
- `font-serif` → var(--font-serif) → **Source Serif 4**, Georgia, serif
  - 사용처: 페이지/섹션 제목, 큰 숫자 (KPI value)
- `font-sans` / `font-display` → var(--font-sans) → **Inter**, Pretendard, system-ui
  - 사용처: 본문, UI 기본
- `font-mono` → var(--font-mono) → **JetBrains Mono**, SF Mono, Menlo
  - 사용처: kicker, 레이블, 표 헤더, 브레드크럼, KPI delta, 버튼 텍스트

모두 [src/app/layout.tsx](../src/app/layout.tsx)에서 `next/font`로 로드되어 `<html>`에 CSS 변수로 주입됨.

### 2.2 자주 쓰는 타이포 레시피

| 역할                  | 클래스                                                                    |
| --------------------- | ------------------------------------------------------------------------- |
| Page title (H1)       | `font-serif text-[28px] font-semibold text-ink-900 tracking-tight`        |
| Section title (H2)    | `font-serif text-[26px] font-semibold text-ink-900 tracking-tight`        |
| Panel title (H3)      | `font-serif text-[17px] font-semibold text-ink-900 tracking-tight`        |
| Subsection (H4)       | `font-serif text-[15px] font-semibold text-ink-900`                       |
| KPI value             | `font-serif text-[32px] font-semibold text-ink-900 tracking-tight`        |
| Kicker (ALL CAPS)     | `font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-ink-500` |
| Section number        | `font-mono text-[11px] font-medium text-gold tracking-[0.2em]`            |
| Button text           | `font-mono text-[11px] font-semibold uppercase tracking-[0.18em]`         |
| Table header          | `font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500` |
| Table cell            | `text-[12.5px] text-ink-800`                                              |
| Body copy             | `text-[13px] text-ink-500 leading-relaxed`                                |

핵심 원칙: **제목=세리프, 레이블=모노 대문자 넓은 자간, 본문=sans**.

---

## 3. Shadows, Borders, Shape

- **Rounded corners 사용 안 함** — 모든 카드/패널/태그/버튼은 각진 사각형.
- **Shadow 거의 사용 안 함** — 필요 시 아래 두 가지만:
  - `shadow-report` — 매우 옅은 기본 엘리베이션
  - `shadow-report-lg` — 팝오버/드로어 레벨
- **Border는 헤어라인** — 기본은 `border-ink-200` (카드), `border-ink-100` (표 내부), `border-ink-300` (표 헤더).

---

## 4. UI Primitives

모두 `@/components/ui`에서 export. [index.ts](../src/components/ui/index.ts) 참고.

### `Kicker`
ALL CAPS 모노스페이스 레이블. 섹션/패널/인사이트 위에 얹는 소형 태그.
```tsx
<Kicker>Competitive Comparison</Kicker>
<Kicker tone="gold">Priority</Kicker>
```
Props: `tone?: 'default' | 'gold' | 'pos' | 'warn' | 'neg' | 'info'`

### `SectionHeader`
페이지 내 대형 섹션 헤더. 번호 + kicker + 세리프 타이틀 + 서브타이틀 + 우측 액션.
```tsx
<SectionHeader
  number="§ INTELLIGENCE · V4.2"
  kicker="Competitive Comparison"
  title="경쟁비교"
  subtitle="휴머노이드 로봇 산업의 경쟁 지형..."
  right={<PptDownloadButton />}
/>
```

### `Panel`
차트/테이블/모듈을 감싸는 기본 컨테이너. 헤더(kicker+title+subtitle+headerRight)와 footer 옵션. 3종 variant.
```tsx
<Panel kicker="RFM Capability" title="RFM 역량 비교" headerRight={<RubricPanel type="rfm" />}>
  <RfmOverlayRadar data={...} />
</Panel>
```
Props: `variant?: 'default' | 'muted' | 'dark'`, `padding?: 'default' | 'compact' | 'none'`

### `KpiTile`
단일 숫자 KPI 표시. 세리프 큰 값 + 모노 unit + 모노 delta(▲/▼/▬).
```tsx
<KpiTile label="Active Robots" value="248" unit="units" delta="+12" trend="up" context="QoQ" />
```

### `Tag`
상태/카테고리 배지. 시맨틱 톤별 `bg-*-soft + text-*` 쌍.
```tsx
<Tag tone="pos" dot>Active</Tag>
<Tag tone="gold" size="sm">Featured</Tag>
```
Props: `tone?: 'neutral' | 'brand' | 'gold' | 'pos' | 'warn' | 'neg' | 'info'`, `size?: 'sm' | 'md'`, `dot?: boolean`

### `DataTable`
표 컴포넌트. 컬럼 정의(align/width/mono/render) + 로우 배열. zebra 아닌 hover 표시.
```tsx
<DataTable
  columns={[
    { key: 'name', header: 'Robot' },
    { key: 'score', header: 'Score', align: 'right', mono: true },
  ]}
  rows={data}
  getRowKey={(r) => r.id}
  dense
/>
```

### `InsightBox`
사이드 쿼트/인사이트 박스. 좌측 2px 컬러 바 + kicker + 세리프 타이틀 + 본문.
```tsx
<InsightBox tone="gold" title="핵심 시사점" label="Insight">
  <p>...</p>
</InsightBox>
```

---

## 5. Layout Shell

### `Sidebar`
[src/components/layout/Sidebar.tsx](../src/components/layout/Sidebar.tsx)
- `w-60 bg-brand text-brand-ink`
- 세리프 ARGOS 워드마크, 모노 서브타이틀
- 활성 링크: 좌측 4px `border-l-gold` + bold

### `Header`
[src/components/layout/Header.tsx](../src/components/layout/Header.tsx)
- `h-14 bg-paper border-b border-ink-200`
- 모노 breadcrumbs (` › ` 구분)
- 활성 탭: 하단 2px `border-b-gold`
- 중앙 검색 (`h-8`), 우측 유저 뱃지

### `PageHeader` (및 헬퍼)
[src/components/layout/PageHeader.tsx](../src/components/layout/PageHeader.tsx)
- `PageHeader` — 모듈 라벨(gold mono) + 세리프 H1 + 서브타이틀 + 액션 슬롯
- `PrimaryButton` — `bg-brand text-white` 모노 버튼
- `SecondaryButton` — `bg-white border-ink-200` 모노 버튼
- `ArgosCard` — 얇은 `bg-white border-ink-200` 래퍼
- `SectionTitle` — 세리프 16px 섹션 헤드

---

## 6. Chart Palette

[color-utils.ts](../src/components/humanoid-trend/color-utils.ts)에 v2 팔레트 정의. Recharts 차트는 이 팔레트를 사용해야 함.

### `CHART_COLORS_V2` (8색)
```
#0B1E3A  brand navy
#B8892B  gold
#1F4A7A  info
#2F7D5A  pos
#B0452A  neg
#5A6475  ink-500
#B38A1F  warn
#15325B  brand soft
```

### `CHART_AXIS_V2`
- `stroke: '#D9DDE4'` (ink-200) — 축선
- `tick: '#5A6475'` (ink-500) — 눈금 텍스트
- `label: '#3D4656'` (ink-600) — 축 레이블
- `grid: '#EDEFF3'` (ink-100) — 그리드 라인
- `reference: '#B8892B'` (gold) — 기준선

### 헬퍼
- `getRobotColorV2(robotId)` — ID 해시로 결정적 색상 할당
- `getDistinctColorsV2(n)` — 앞에서 n개(≤8) 구분 색상

> 기존 `PALETTE` / `getRobotColor` / `getDistinctColors`는 v1 색상(비비드)이므로 신규 차트에서는 v2 버전 사용 권장.

---

## 7. Recipes — 자주 쓰는 조합

### 기본 카드
```tsx
<div className="bg-white border border-ink-200 p-5">
  <Kicker>Label</Kicker>
  <h3 className="font-serif text-[17px] font-semibold text-ink-900 mt-1.5">Title</h3>
  ...
</div>
```

### 다크 강조 패널
```tsx
<Panel variant="dark" kicker="Executive Summary" title="2025 Q4 Review">
  ...
</Panel>
```

### Status 태그 (hover 포함 없음 — 라벨 전용)
```tsx
<Tag tone="pos" dot>Deployed</Tag>
<Tag tone="warn">In Review</Tag>
<Tag tone="neg" dot>Blocked</Tag>
```

### Recharts 축 스타일
```tsx
<CartesianGrid stroke={CHART_AXIS_V2.grid} />
<XAxis stroke={CHART_AXIS_V2.stroke} tick={{ fill: CHART_AXIS_V2.tick, fontSize: 11 }} />
<YAxis stroke={CHART_AXIS_V2.stroke} tick={{ fill: CHART_AXIS_V2.tick, fontSize: 11 }} />
<ReferenceLine stroke={CHART_AXIS_V2.reference} strokeDasharray="3 3" />
```

---

## 8. Do / Don't

**Do**
- 토큰을 직접 사용 (`bg-paper`, `text-ink-900`, `border-ink-200`, `text-gold`)
- 세리프는 제목, 모노는 레이블/숫자 보조에만
- 헤어라인 보더로 시각 구조 형성

**Don't**
- `bg-argos-*`, `shadow-argos-*` 사용 (v2에서 제거됨)
- `rounded-lg` / `rounded-xl` 등 둥근 모서리 (플랫 디자인 원칙 위반)
- `shadow-md` 이상의 진한 그림자
- `text-white`를 밝은 배경 위에 직접 사용 (globals.css에서 ink-900로 리맵됨 — 색 있는 배경 위에서만 흰색 유지)
- 차트에 비비드 원색(#EF4444, #3B82F6 등) 하드코딩 — `CHART_COLORS_V2` 사용

---

## 9. 마이그레이션 히스토리

- **PR1** (c4e8b75) — v2 토큰 + 레이아웃 셸 + UI 프리미티브 7종 + humanoid-trend 파일럿
- **PR2** (af44094) — 나머지 ~138개 파일 일괄 치환, 레거시 `argos-*` 팔레트 제거, `shadow-argos-*` → `shadow-report*` 리네임
