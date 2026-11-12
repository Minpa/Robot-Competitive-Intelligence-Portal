# ARGOS_I 가 구현할 것 — 요청 클라이언트 · 아웃바운드 가드 가이드

> 이 문서는 ARGOS_I 팀이 ARGOS 로 요청(자료 추가·분석·조회)을 보내는 클라이언트를 만들 때의 **구현 체크리스트**다. API 계약은 [`argos-i-interface.md`](./argos-i-interface.md) 15절에 있다.
> **이 문서·예시·메일 어디에도 토큰 값, 실제 사내 용어·코드명·사번을 쓰지 않는다.** 토큰은 별도 경로(사내 시크릿 저장소)로만 전달한다.

---

## 1. 문서 목적, 책임 분리, 한계

### 1.1 목적

ARGOS_I(사내)가 ARGOS(외부 클라우드)에 **구조화된 요청**을 보내고 결과를 받는 클라이언트를 구현한다. 요청 종류는 세 가지다.

| 종류 | 하는 일 |
|---|---|
| `add_source` | 공개 자료(YouTube 영상·채널, arXiv 논문, 공개 기사 URL)의 메타데이터를 ARGOS 에 추가 |
| `analyze` | 영상 분석, 회사·로봇 스펙 보강 후보 적재, 기술 트렌드 리포트 |
| `query` | 정형 조회(최근 동향, 액추에이터, 핸드 벤치마크, CI 변경 이력) — AI 호출 없음 |

### 1.2 가장 중요한 사실: ARGOS_I 의 아웃바운드 가드가 1차 통제다

**ARGOS 는 외부 클라우드이고, 사내 코드명이나 직원 ID 의 실제 값을 알 수 없다.** 그래서:

- **ARGOS_I 아웃바운드 가드 = 1차 통제.** ARGOS_I 만 금지 목록(내부 도메인·코드명·용어·사번 형식)의 실제 값을 안다. 사내 정보는 **ARGOS_I 에서 나가기 전에** 막아야 한다.
- **ARGOS 인바운드 가드 = 최후 방어선.** ARGOS 는 형태(이메일·사번 형태·분류 라벨·내부 경로·내부 호스트 형태)와 해시 목록으로만 판정한다. 일반 단어로 쓴 의미상의 사내 정보는 **어느 가드로도 탐지할 수 없다.**
- 따라서 ARGOS_I 는 가드에만 기대지 말고 **구조적 통제**를 지킨다: 자유 텍스트(`note`)는 사람 승인 후에만, 모든 파라미터는 공개 자료에서 온 id·slug·URL 만.

### 1.3 책임 분리

| 책임 | ARGOS_I | ARGOS |
|---|---|---|
| 금지 목록(내부 도메인·코드명·용어) 보유·운영 | **담당** (평문 사용 가능) | 해시·형태 정규식만 (평문 없음) |
| 사내 데이터 소스에서 복사된 값이 아님을 보장 | **담당** (호출 측 책임) | 불가능 |
| 전송 전 차단 | **담당** (1차) | 400 거부 (최후) |
| 요청 승인(`note`) | **담당** (사람 승인 UI) | 관리자가 승인 필요 종류를 승인 |
| 결과·거부 통계 | 폴링·번들로 수신 | 거부는 저장하지 않음 (해시·코드만) |

### 1.4 요청 사실 자체의 노출 (수용 필요)

요청을 보낸다는 사실 자체가 ARGOS_I 의 관심사(어떤 영상·회사·주제를 분석하는지)를 외부에 드러낸다. ARGOS 는 로그에 해시만 남기고 params 는 DB 에만 90일 보관하지만, **ARGOS 운영자에게는 보인다.** **경쟁 관련 민감한 관심 주제, 진행 중인 사업·제품과 직접 연결되는 대상은 요청하지 않는다.** 판단이 어려우면 보내지 않는다.

### 1.5 API 요약 (본문 기술)

| 호출 | 성공 응답 |
|---|---|
| `POST /api/argos-i/requests` | `201 {"id","status"}` (`query` 가 즉시 끝나면 `status:"done"` 과 `result` 포함). 같은 `Idempotency-Key`+같은 본문 재전송은 `200` 으로 원 응답 재생 |
| `GET /api/argos-i/requests/{id}` | `200 {"id","type","status","params","result","errorCode","approval":{"required","state"},"createdAt","startedAt","finishedAt"}` (`note` 없음) |
| `GET /api/argos-i/requests?status=&since=` | `200 {"items":[…],"count"}` — 최대 100건·최신순, `result` 대신 `hasResult`. `status` 는 쉼표 구분, `since` 는 ISO 8601 |
| `DELETE /api/argos-i/requests/{id}` | `queued`·`needs_approval` 만 `200 {"id","status":"cancelled"}`, 그 밖은 `409 not_cancellable` |

**승인 플로우**: 기본 승인 대상은 `analyze:topic` 과 `add_source:youtube_channel` 이다. 이 요청은 `201` 로 `needs_approval` 이 되고, ARGOS 관리자가 승인하면 `queued` → 실행된다(7일 안에 승인되지 않으면 `rejected`/`approval_expired`). 일 예산·건수를 넘긴 analyze 도 `needs_approval`(사유 `budget_daily`)이 되며, 월 예산(Claude) 초과는 승인으로도 실행되지 않는다(`failed budget_monthly`).

### 1.6 요청 종류별 `params` (필수 봉투: `type`, `params`, `sourcePublic:true`, 선택 `note`)

| type | params | 형식·enum | 상한·기본 |
|---|---|---|---|
| `add_source` | `{kind:"youtube_video", id}` 또는 `{kind:"youtube_video", url}` (정확히 하나) | id 11자 `[A-Za-z0-9_-]`, url 은 `youtube.com/watch?v=`·`youtu.be/` | 승인 불필요 |
| | `{kind:"youtube_channel", id}` | `UC…`(24자) 또는 `@handle` | 1회성 최근 10건, **승인 필요** |
| | `{kind:"arxiv", id}` | `2401.01234`(+`v2`) 또는 `cs-ro/0701001` | 승인 불필요 |
| | `{kind:"article_url", url}` | https, 허용 호스트, 쿼리 200자 이하 | 제목·링크만 저장, 승인 불필요 |
| `analyze` | `{target:"video", id, force?}` | id 는 UUID 또는 YouTube 11자, `force` 기본 false | 승인 불필요 |
| | `{target:"company", slug}` / `{target:"robot", slug}` | 소문자 케밥 slug | 회사는 로봇 최대 5건 |
| | `{target:"topic", domain, days}` | domain: `hand`·`rfm`·`actuator`·`expo`·`production`, days: 7·14·30·60·90 | **승인 필요** |
| `query` | `{query:"company_recent", company, weeks?}` | weeks 1~8, 기본 8 | 항목 50 |
| | `{query:"robot_actuators", robot}` | slug | 항목 50 |
| | `{query:"hand_benchmark_top", limit?}` | limit 1~20, 기본 10 | 20 |
| | `{query:"actuator_suppliers_by_segment", segment}` | `tier1_oem`·`tier2_legged`·`research_edu`·`industrial_cobot`·`service`·`captive`·`other` | 항목 50 |
| | `{query:"ci_changes_since", since, company?, limit?}` | since `YYYY-MM-DD`(오늘 기준 90일 이내), limit 1~100, 기본 50 | 100 |

상세 계약은 interface 15.4절.

---

## 2. 구현 체크리스트

### ① 아웃바운드 가드 적용

- [ ] `scripts/lib/argos-i-outbound-guard.mjs` 를 복사해 모든 요청 경로에서 **전송 전에** 통과시킨다 (Node 18+, 외부 의존성 없음, `node:crypto` 만 사용). 가드를 우회하는 전송 경로를 만들지 않는다.
- [ ] 반환값이 차단이면 **네트워크 호출을 하지 않는다.** 로그에는 해시 앞 8자와 사유 코드만 남긴다.
- [ ] 허용 필드 직렬화: 알려진 키만 남긴다(나머지는 제거하고 **개수만** 센다, 키 이름은 기록하지 않는다). 엄격 모드(`strict`)에서는 차단한다.
- [ ] `sourcePublic: true` 가 없으면 전송하지 않는다.
- [ ] `note` 가 있으면 사람 승인 플래그(`approvedBy`)가 없을 때 차단한다.
- [ ] 규칙 목록과 사유 코드(아래 부록 A)는 ARGOS 서버와 같다. 규칙 버전 상수(`RULES_VERSION`)를 로그에 남기고, ARGOS 가 규칙을 바꾸면 이 문서와 함께 갱신 공지한다.
- [ ] **공개 URL 이 외부에서 해석되는지 검증하는 단계를 둔다(권고).** 사내 DNS 에서만 풀리는 이름, 사내망에서만 열리는 주소는 보내지 않는다.

### ② 요청 클라이언트 · 재시도 · 멱등키

- [ ] `POST /api/argos-i/requests` 에 `Authorization: Bearer <요청 토큰>` 과 **논리 요청당 하나의 `Idempotency-Key`**(UUID 등 8~64자 `[A-Za-z0-9_-]`)를 보낸다.
- [ ] 네트워크 오류·5xx·429 는 1·2·4초 백오프로 최대 3회 재시도하되 **같은 `Idempotency-Key` 와 같은 본문**을 쓴다(중복 생성 방지). 429 는 `Retry-After` 를 따른다.
- [ ] **4xx 는 재시도하지 않는다**(429 제외). 특히 `400 internal_data_rejected` 는 재시도 금지(아래 3절).
- [ ] 요청 본문은 8KB 이하, `Content-Type: application/json`.
- [ ] 참고 구현: `scripts/argos-i-request.mjs` (종료 코드 0 성공 / 2 가드 차단 / 3 서버 4xx / 4 5xx·네트워크 / 5 wait 타임아웃 / 6 wait 에서 실패·거부·취소).

### ③ 폴링 · `wait`

- [ ] `GET /api/argos-i/requests/{id}` 를 30초에서 시작해 최대 5분 간격으로 늘려 가며 폴링한다(기본 총 30분). 종결 상태(`done`, `failed`, `rejected`, `cancelled`)에서 멈춘다.
- [ ] `needs_approval` 은 "ARGOS 관리자 승인 대기"로 표시한다(승인은 ARGOS 관리자가 한다, 최대 7일 후 자동 거부).
- [ ] `query` 는 보통 `201` 응답에 결과가 바로 온다(`status:"done"`). `queued` 로 오면 폴링한다.

### ④ 결과 적재 (GET 결과와 번들 `requests` 영역)

- [ ] 결과는 두 경로로 받을 수 있다: (a) `GET /api/argos-i/requests/{id}` 폴링, (b) 일일 번들의 `requests` 영역(최근 7일 종결 요청의 요약, 최대 500건, `note` 없음).
- [ ] **중복 처리**: 같은 요청 id 가 두 경로로 모두 들어온다. 요청 id 를 키로 upsert 한다. 번들은 매일 같은 요청을 7일간 다시 싣는다.
- [ ] 번들 스키마 버전은 올라가지 않는다(영역 추가). 모르는 필드·영역은 무시한다(interface 11절의 호환 규칙).
- [ ] 결과의 링크는 허용 호스트의 https 뿐이다. 받은 결과를 사내 시스템에 적재해도 ARGOS 로 **되돌려 보내지 않는다.**

### ⑤ 승인 UI (`note` 사람 승인)

- [ ] `note` 는 **한 줄 평문 200자 이내**. 숫자+단위(Nm·kg·원 등)·4자리 이상 숫자·URL·개행·코드·마크다운·HTML·이메일·사번 형태가 있으면 가드가 막는다.
- [ ] `note` 를 보내려면 **사람이 내용을 읽고 승인**해야 한다. 승인자 식별자를 가드 옵션(`approvedBy`)으로 넘기고, 승인 기록(누가·언제)을 ARGOS_I 에 남긴다. 승인 UI 가 없으면 `note` 를 쓰지 않는다.
- [ ] 자동 생성 텍스트(LLM 요약, 문서 발췌, 메일 본문 등)를 `note` 에 넣지 않는다.
- [ ] ARGOS 는 `note` 를 AI 에 넣지 않고 번들·GET 응답에도 싣지 않는다(관리자 목록에서만 보임). 그래도 **`note` 는 사내 정보 유출의 가장 큰 채널**이므로 꼭 필요할 때만 쓴다.

### ⑥ 토큰 보관 · 교체

- [ ] **요청 토큰(`ARGOS_I_REQUEST_TOKEN`)은 pull 토큰(`ARGOS_I_EXPORT_TOKEN`)과 별개의 값**이다. 같은 값을 쓰면 서버가 요청 API 를 비활성화한다.
- [ ] 사내 시크릿 저장소에만 보관한다. git·채팅·메일 평문 금지. 코드에서는 환경변수로만 읽고, **명령행 인자·로그·오류 메시지에 쓰지 않는다.**
- [ ] 교체(무중단): ARGOS 에 `ARGOS_I_REQUEST_TOKEN_NEXT` 추가 → ARGOS_I 저장소를 새 값으로 교체하고 호출 확인 → ARGOS 가 `ARGOS_I_REQUEST_TOKEN` 을 새 값으로 바꾸고 `_NEXT` 삭제.
- [ ] 401 은 즉시 알림(재시도 금지). 인증 실패가 분당 30회를 넘으면 서버가 429 로 막는다.

### ⑦ 감사 로그

- [ ] 전송 로그(JSON Lines)에는 **시각, 요청 id, 종류, 해시 앞 8자, 결과 코드만** 남긴다. **params 값, `note`, 토큰, 응답 본문은 남기지 않는다.**
- [ ] 가드 차단도 기록한다(해시 앞 8자 + 사유 코드). 차단이 반복되면 호출 측 버그·정책 위반 신호이므로 알린다.
- [ ] 누가 요청을 만들었는지(사용자·시스템 식별자)는 **ARGOS_I 쪽 감사 로그에만** 둔다. ARGOS 로 보내지 않는다.

### ⑧ 금지 목록 운영

- [ ] 아래 세 가지 목록을 ARGOS_I 가 **직접 운영**한다(소유자·변경 절차·검토 주기를 정한다). 실제 값은 이 저장소·문서·메일에 쓰지 않는다.

| 목록 | 아웃바운드 가드 옵션 (CLI 환경변수) | ARGOS 쪽(운영자가 설정, 참고) |
|---|---|---|
| 내부 도메인 | `internalDomains` (`ARGOS_I_OUTBOUND_INTERNAL_DOMAINS`) | `ARGOS_I_INTERNAL_DOMAINS` (기본 `lge.com`·`lgecorp.com` + 추가분) |
| 코드명·사내 패턴(정규식) | `patterns` (`ARGOS_I_OUTBOUND_PATTERNS`, 개행 또는 `;;` 구분) | `ARGOS_I_INTERNAL_PATTERNS` (형태 정규식만) |
| 사내 용어 | `terms` 평문 (`ARGOS_I_OUTBOUND_TERMS`) 또는 `termHashes` (`ARGOS_I_OUTBOUND_TERM_HASHES`) | `ARGOS_I_INTERNAL_TERM_HASHES` (**sha256 해시만**, 평문 금지) |

- [ ] **변경 절차**: 목록을 바꾸면 ① ARGOS_I 가드 설정 갱신·배포 → ② **ARGOS 운영자에게 해시 목록 갱신을 요청**(해시만 전달) → ③ 변경 이력(날짜·사유, 값 제외)을 남긴다.
- [ ] **해시 목록 생성 방법**: 정규화 규칙은 "NFKC 후 소문자, 글자·숫자 이외를 구분자로 보고 토큰을 공백 한 칸으로 연결, UTF-8 sha256 hex" 이다. 서버는 본문의 **토큰 1개와 인접 2-gram** 의 해시를 목록과 대조한다. 가드 모듈의 `hashTerm` 이 같은 규칙으로 계산한다.
  ```
  node -e "import('./scripts/lib/argos-i-outbound-guard.mjs').then(m => console.log(m.hashTerm(process.argv[1])))" "<사내 용어>"
  ```
  여러 단어로 된 용어는 2-gram 해시, 3단어 이상이면 단어별로 나누어 등록한다(하이픈·밑줄은 구분자로 취급되어 `project-x` 와 `project x` 의 해시가 같다). 평문 목록은 ARGOS_I 에만 둔다.
- [ ] 목록에는 코드명뿐 아니라 **약어·별칭·옛 이름**도 넣는다. 일반 단어와 겹치는 코드명은 오탐을 감수할지 검토한다.

### ⑨ 테스트 케이스 (공유 픽스처 그대로 사용)

- [ ] ARGOS 저장소의 `packages/backend/src/__tests__/fixtures/argos-i-guard-cases.json`(가짜 값만)을 ARGOS_I 가드 테스트에 **그대로** 쓴다. 각 케이스는 `request` 와 기대 결과(`ok`, 사유 코드, 정규형)를 가진다. 옵션(`options`)은 아웃바운드 가드를 `strict: true`, `approvedBy` 지정으로 만들어 적용한다.
- [ ] 거부 픽스처: 이메일, 난독화 이메일(`[at]`·`[dot]`), 사번 형태, `[대외비]`·`Confidential – Internal Only`, UNC·드라이브·홈 경로, `http://10.x.x.x`, 내부 도메인 URL, 허용 외 호스트, `file:///`, 숫자+단위, 단가(만원), base64 120자, 알 수 없는 키 — 모두 차단돼야 한다.
- [ ] 통과 픽스처: `arxiv` 추가, `analyze/robot`, `query/company_recent`, 일반 `note`("지난주 영상 후속 확인 요청").
- [ ] 정규화 우회 케이스(전각 문자, 제로폭 문자, 퍼센트 인코딩)와 사유 코드의 **고정 정렬**도 확인한다.
- [ ] ARGOS_I 자체 금지 목록용 테스트 케이스는 **ARGOS_I 저장소에만** 둔다(실제 용어가 들어 있으므로 ARGOS 와 공유하지 않는다).

---

## 3. 호출 절차와 오류 대응표

### 3.1 호출 절차

1. 호출자가 요청 객체를 만든다 — **값은 공개 자료에서 직접 얻은 id·slug·URL 만**.
2. 아웃바운드 가드를 통과시킨다. 차단이면 중단하고 사유 코드를 사람에게 보여 준다(입력 값은 보여 주지 않는다).
3. `note` 가 있으면 사람 승인을 받는다.
4. `POST /api/argos-i/requests` (+ `Idempotency-Key`).
5. `201` 이면 요청 id 를 저장한다. `status` 가 `done`(query 즉시 완료)이면 결과를 적재, `queued`·`needs_approval` 이면 폴링 또는 다음 번들로 결과를 받는다.

### 3.2 오류 대응표

| 상태 · `error` | 뜻 | ARGOS_I 의 대응 |
|---|---|---|
| 400 `internal_data_rejected` + `reasons` | **서버 가드가 사내 정보 의심으로 거부** (저장 안 됨) | **재시도 금지.** 운영자에게 즉시 알린다. 아웃바운드 가드를 통과했는데 서버가 거부한 것이므로 **가드 규칙·금지 목록이 뚫렸다는 신호**다. 같은 내용을 다시 보내지 말고 원인을 찾는다. 1시간에 5건이 쌓이면 ARGOS 가 요청 API 를 자동 중지한다 |
| 400 `invalid_request` + `reasons` | 형식 오류, `sourcePublic` 누락, 잘못된 `Idempotency-Key` | 요청을 고친다(재시도로 해결되지 않는다) |
| 400 `unsupported_type` | v2 예약 종류(`regenerate_brief`, `watch_register`) | v1 에서는 보낼 수 없다 |
| 401 | 토큰 없음·불일치(pull 토큰 포함) | 재시도 없이 즉시 알림. 토큰 교체·만료 확인 |
| 404 `not_found` | 요청 id 없음 | id 확인 |
| 409 `idempotency_conflict` | 같은 키에 다른 본문 | 새 키 생성(논리 요청이 다르다) |
| 409 `not_cancellable` | 이미 실행 중이거나 종결 | 결과를 폴링 |
| 413 `payload_too_large` | 8KB 초과 | 본문을 줄인다 |
| 429 `rate_limited` / `queue_full` | 시간당 60건 / 대기열 200건 | `Retry-After` 뒤 **같은 키** 로 재시도 |
| 503 `argos_i_requests_disabled` | 서버에서 비활성(토큰·플래그) | 즉시 알림(ARGOS 운영자에게 문의) |
| 503 `requests_suspended` | 거부 누적으로 자동 중지 | **보내지 않는다.** 원인 확인 후 ARGOS 관리자에게 해제 요청 |
| 5xx·네트워크 | 일시 장애 | 1·2·4초 백오프, 최대 3회, 같은 키 |

결과 상태 `failed` 의 `errorCode`: `provider_not_configured`(서버에 해당 키 없음 — ARGOS 운영자 문의), `quota_exceeded`·`upstream_error`(일시적, 나중에 다시), `not_found`(대상 없음·모호한 slug), `budget_monthly`(월 예산, 승인으로도 불가), `invalid_target`, `timeout`, `result_too_large`. `rejected` 는 `admin_rejected`(관리자 거부) 또는 `approval_expired`(7일 경과).

---

## 4. ARGOS_I 쪽에서 하면 안 되는 것

- **가드를 우회하는 전송 경로**(curl 직접 호출, 다른 클라이언트)를 두지 않는다.
- **사내 데이터 소스(사내 DB·문서·메일·메신저)에서 값을 복사해 파라미터나 `note` 에 넣지 않는다.** URL·id·slug 는 공개 사이트에서 직접 확인한 것만 쓴다.
- `400 internal_data_rejected` 를 **자동 재시도하거나, 문구를 바꿔 다시 시도해** 가드를 우회하려 하지 않는다(서킷 브레이커가 걸린다).
- 사내 코드명·사번·내부 도메인의 **실제 값을 ARGOS 로 보내거나, ARGOS 운영자에게 평문으로 알려 주지 않는다.** 해시만 전달한다.
- **토큰을 로그·오류 메시지·명령행·메일·채팅에 쓰지 않는다.** pull 토큰과 요청 토큰을 같은 값으로 쓰지 않는다.
- `note` 를 사람 승인 없이 보내거나, 자동 생성 텍스트·문서 발췌를 `note` 에 넣지 않는다.
- 민감한 관심 주제(진행 중인 사업·제품과 직접 연결되는 대상)를 요청하지 않는다(1.4절).
- 요청 본문·`note`·결과를 감사 로그에 통째로 남기지 않는다(해시·코드·id 만).
- ARGOS 가 사내로 콜백·웹훅을 보내 줄 것을 기대하지 않는다(그런 기능은 없다). 결과는 폴링 또는 번들이다.
- 허용 호스트 밖의 URL(GitHub 저장소 등)로 `article_url` 을 우회하려 하지 않는다.

---

## 5. 부록

### 부록 A. 거부 사유 코드 표 (18개)

ARGOS_I 아웃바운드 가드와 ARGOS 인바운드 가드는 같은 코드를 쓴다. 응답·로그에는 코드만 나가고 입력 값·키 이름은 나가지 않는다.

| # | 사유 코드 | 탐지 대상 | 아웃바운드 처리 | ARGOS 처리 |
|---|---|---|---|---|
| 1 | `unknown_key` | 스키마에 없는 키 (최상위·params) | **제거**(개수만 기록), `strict` 면 차단 | 거부 |
| 2 | `invalid_type_or_shape` | 타입·범위·길이·형식 위반, 깊이>4, 키>30, 본문>8KB | 차단 | 거부 |
| 3 | `url_scheme` | `http:`·`file:`·`ftp:`·`data:`·`javascript:`, `user@`, 비표준 포트 | 차단 | 거부 |
| 4 | `url_host_not_allowed` | 허용 호스트 목록에 없는 호스트 | 차단 (ARGOS_I 측 정적 목록) | 거부 (서버 계산 목록) |
| 5 | `private_host` | 사설·루프백 IP, IP 리터럴 전체, `localhost`, 단일 라벨 호스트, `.local`·`.internal`·`.corp`·`.lan`·`.intra` | 차단 | 거부 |
| 6 | `internal_domain` | 내부 도메인이 URL·이메일·본문에 등장 | 차단 | 거부 |
| 7 | `email_detected` | 이메일 형태(난독화 복원 포함, 공개 도메인도) | 차단 | 거부 |
| 8 | `employee_id` | 사번·직원 ID 형태 | 차단 | `note` 에 기본 패턴, 운영자 패턴은 전체 |
| 9 | `internal_host_name` | `*-srv01`, `*.corp.*`, 호스트 토큰+포트 | 차단 | 거부 |
| 10 | `unc_or_file_path` | UNC·드라이브·`/home/`·`/Users/`·`/mnt/`·`~/`·`file://` | 차단 | 거부 |
| 11 | `classification_label` | 대외비·사내·내부용·내부 한정·비공개·기밀·극비, Confidential·Internal Only·Internal Use·Proprietary·Restricted·NDA·Do Not Distribute, 社外秘·内部·机密 | 차단 | 거부 |
| 12 | `internal_pattern` | 운영자 정규식·프로젝트 코드명 형태 | 차단 (`ARGOS_I_OUTBOUND_PATTERNS`) | 거부 (`ARGOS_I_INTERNAL_PATTERNS`) |
| 13 | `internal_term_hash` | 토큰·2-gram 의 sha256 이 해시 목록에 있음 | 차단 (평문·해시 모두 가능) | 거부 (해시만) |
| 14 | `blob_detected` | base64 40자+, hex 32자+, `data:` URI | 차단 | 거부 |
| 15 | `number_unit_in_note` | `note` 의 숫자+단위, 4자리 이상 숫자(19xx·20xx 연도 예외) | 차단 | `note` 에만 적용 |
| 16 | `note_format` | `note` 의 개행·URL·코드·마크다운 링크·HTML, 200자 초과 | 차단 | `note` 에만 적용 |
| 17 | `source_not_public` | `sourcePublic` 이 정확히 `true` 가 아님 | 전송 안 함 | 거부 (`invalid_request`) |
| 18 | `control_chars` | 비가시·제어·방향 제어 문자 | 차단 | 거부 |

아웃바운드에서만 쓰는 사유: `note_not_approved` (`note` 가 있는데 사람 승인 플래그가 없음). 서버 코드는 아니다.

### 부록 B. 규칙 요약 (참고 구현과 서버가 같은 규칙)

- **정규화(검사 전)**: NFKC(전각·반각 통일) → 비가시 문자 제거 → HTML 엔티티 디코드 → 퍼센트 디코드(최대 2회) → 소문자화. 이메일 난독화(`[at]`, `(at)`, `[dot]`, `(dot)`, `note` 한정 공백 `at`·`dot`)를 복원한 사본을 함께 검사한다.
- **구조 우선**: 형식 검증이 가능한 필드(slug·uuid·enum·11자 YouTube id·arXiv id·숫자 범위)는 정규식 전체 일치로 통과 여부를 정한다. 사번 형태 등 오탐 위험이 있는 규칙은 `note` 에만 적용한다.
- **`note` 의 숫자 규칙**: 숫자 뒤에 오는 단위(Nm·kg·mm·cm·W·V·A·rpm·Hz·DoF·dB·°·%·USD·$·원·만원·억 등)와 4자리 이상 숫자를 막는다(자사 제품 스펙·가격 수치 유입 방지). 연도(1900~2099)는 허용한다.
- **URL**: https 전용, 허용 호스트(정확 일치 또는 등록 도메인의 하위 도메인)만. 쿼리 200자 이하, 추적 파라미터(`utm_*`, `fbclid`, `gclid` 등)와 프래그먼트는 제거한 정규형으로 보낸다. YouTube URL 은 11자 id 로 변환된다.
- **허용 호스트**: `youtube.com`·`youtu.be`·`arxiv.org`(하위 포함) 외에 ARGOS_I 가 필요한 공개 도메인을 정적 목록으로 직접 관리한다(`ARGOS_I_OUTBOUND_ALLOWED_HOSTS`). 서버는 자기 크롤 대상·RSS 도메인·운영자 추가 도메인을 쓰므로, 서버가 거부하는 호스트도 있을 수 있다(`failed invalid_target`).
- **LG 단어**: "LG"·"LG Electronics" 자체는 차단 대상이 아니다(공개 경쟁 정보로 다루는 회사). slug `lg-electronics` 는 정상이다.

### 부록 C. ARGOS_I 팀에 확인이 필요한 질문

아래는 **임시값**으로 구현되어 있다. 확인 후 알려 주면 규칙을 조정한다(**실제 값 자체는 알려 주지 않아도 된다 — 형식만**).

1. **사번·직원 ID 형식은?** 현재 임시 기본 패턴은 "영문 1~2자 + 숫자 6~8자"(대소문자 무시, `note` 한정)이다. 실제 자릿수·접두사 규칙·구분자(하이픈 등), 협력사·외주 ID 형식이 다르면 알려 주세요. (예시 형식 설명만, 실제 번호는 불필요)
2. **내부 도메인 목록이 기본값(`lge.com`, `lgecorp.com`) 외에 더 있나?** (계열사·사내 서비스 도메인의 **개수와 형태**. 전체 목록을 문서·메일로 보낼 필요는 없고 ARGOS_I 가 직접 운영하면 된다.)
3. **프로젝트 코드명 형태는?** 현재 기본 형태는 `PRJ-숫자` 계열뿐이다. 실제 코드명의 **형식**(접두사·길이·문자 종류)을 알려 주면 서버 정규식에 추가한다(값 불필요).
4. **`note` 를 실제로 쓸 계획인가?** 쓰지 않을 계획이면 ARGOS 에서 사실상 비활성(사람 승인 UI 없음)으로 두는 것이 가장 안전하다. 쓴다면 승인 UI 담당·승인 기록 방식을 알려 주세요.
5. **요청 사실 노출(1.4절)을 수용하는가?** 요청 목록·종류에 민감한 관심 주제가 포함되지 않도록 하는 사전 점검 절차가 있는가?
6. **허용 호스트가 추가로 필요한가?** (예: 특정 공개 뉴스·논문 사이트) 서버 쪽은 운영자가 환경변수로 추가한다.
7. **결과를 어느 경로로 받을 계획인가?** (폴링 / 일일 번들 `requests` 영역 / 둘 다) 번들만 쓰면 결과가 최대 하루 늦는다.

### 부록 D. 환경변수 표

**ARGOS_I 쪽 (참고 CLI `scripts/argos-i-request.mjs`)**

| 변수 | 필수 | 설명 |
|---|---|---|
| `ARGOS_I_BASE_URL` | 아니오 | ARGOS API 주소 (기본: 운영 주소, 문서 2절) |
| `ARGOS_I_REQUEST_TOKEN` | **예** | 요청 토큰 (비밀 저장소에서 주입, 인자 금지) |
| `ARGOS_I_REQUEST_LOG` | 아니오 | JSON Lines 로그 경로 (기본 `./argos-i-requests.log.jsonl`) |
| `ARGOS_I_OUTBOUND_ALLOWED_HOSTS` | 아니오 | 추가 허용 호스트(등록 도메인). 기본 정적 목록에 더해진다 |
| `ARGOS_I_OUTBOUND_INTERNAL_DOMAINS` | 아니오 | 사내 도메인 (기본 `lge.com`·`lgecorp.com` 에 추가) |
| `ARGOS_I_OUTBOUND_PATTERNS` | 아니오 | 사내 금지 정규식 (개행 또는 `;;` 구분) |
| `ARGOS_I_OUTBOUND_TERMS` | 아니오 | 사내 금지 용어 평문 (개행·쉼표 구분) |
| `ARGOS_I_OUTBOUND_TERM_HASHES` | 아니오 | 사내 금지 용어 sha256 |

**ARGOS 쪽 (운영자가 Railway Variables 에 설정 — 참고. 값은 문서·메일에 쓰지 않는다)**

| 변수 | 기본 | 설명 |
|---|---|---|
| `ARGOS_I_REQUESTS_ENABLED` | 꺼짐 | `true` 여야 요청 API·폴러가 동작 |
| `ARGOS_I_REQUEST_TOKEN` / `_NEXT` | 없음 | 요청 토큰 (32자 이상, pull 토큰과 다른 값) |
| `ARGOS_I_REQUESTS_REQUIRE_APPROVAL` | `analyze:topic,add_source:youtube_channel,watch_register` | 승인 필요 종류 (`type` 또는 `type:서브키`, 쉼표 구분) |
| `ARGOS_I_REQUESTS_DAILY_BUDGET_USD` | `2` | 일 예산(KST) |
| `ARGOS_I_REQUESTS_DAILY_MAX_ANALYZE` | `30` | 일 analyze 건수 상한 |
| `ARGOS_I_REQUESTS_COST_VIDEO_USD` / `_TOPIC_USD` / `_SPEC_USD` | `0.1` / `0.5` / `0.01` | 종류별 추정 비용 (운영 중 실측으로 조정) |
| `ARGOS_I_INTERNAL_DOMAINS` | (기본 도메인 2개) | 내부 도메인 추가 |
| `ARGOS_I_INTERNAL_PATTERNS` | 없음 | 형태 정규식 (개행 또는 `;;`) |
| `ARGOS_I_INTERNAL_TERM_HASHES` | 없음 | 사내 용어 sha256 (평문 금지) |
| `ARGOS_I_EXTRA_ALLOWED_HOSTS` | 없음 | 추가 허용 호스트 |
| `YOUTUBE_API_KEY` | 없음 | YouTube 메타 조회(`add_source` youtube 종류). 없으면 `provider_not_configured` |
| `CRON_ARGOS_I_REQUESTS` / `DISABLE_ARGOS_I_REQUESTS` | 매분 / 없음 | 폴러 주기 / 킬 스위치 |

### 부록 E. 샘플 명령

```bash
# 토큰은 환경변수로만 (인자·로그·셸 히스토리에 남기지 않는다)
export ARGOS_I_REQUEST_TOKEN="$(사내-시크릿-저장소-조회-명령)"

# 요청 파일 (값은 공개 자료의 id·slug 만)
cat > request.json <<'JSON'
{"type":"add_source","params":{"kind":"arxiv","id":"2401.01234"},"sourcePublic":true}
JSON

# 전송 (가드 차단 시 네트워크 호출 없이 종료 코드 2)
node scripts/argos-i-request.mjs send request.json

# 결과 확인 / 대기 / 취소 / 목록
node scripts/argos-i-request.mjs get <요청-id>
node scripts/argos-i-request.mjs wait <요청-id>
node scripts/argos-i-request.mjs cancel <요청-id>
node scripts/argos-i-request.mjs list --status needs_approval,queued

# note 는 사람 승인(승인자 지정) 후에만
node scripts/argos-i-request.mjs send request-with-note.json --approved-by <승인자-식별자>
```

---

*이 문서의 §1~2 가 ARGOS_I 팀에 보내는 안내 메일 본문의 원천이다. 메일에는 토큰·금지 목록의 실제 값을 넣지 않는다.*
