# ARGOS ↔ ARGOS_I 일일 스냅샷 인터페이스 계약

> 이 문서만 읽고 ARGOS_I 수집기를 구현할 수 있도록 쓴 계약 문서다. 스키마 메이저 버전은 **1** 이다.
> ARGOS 는 매일 KST 07:00 에 그날까지 수집·분석한 **전체 데이터**를 영역별 Markdown + JSON 파일 묶음(번들)으로 만들어 두고, 사내 ARGOS_I 서버가 토큰 인증된 HTTPS 로 **가져간다(pull)**. ARGOS 가 먼저 보내는 일(push)은 없다.
> 단, **14절 초기 적재용 전체 DB 덤프는 이 원칙의 예외**다(원문 포함, 1회성, 사내 이전 한정).

## 목차

1. [개요](#1-개요)
2. [연결 정보](#2-연결-정보)
3. [인증](#3-인증)
4. [일정](#4-일정)
5. [엔드포인트 명세](#5-엔드포인트-명세)
6. [번들 구조](#6-번들-구조)
7. [공통 규약](#7-공통-규약)
8. [영역별 스키마](#8-영역별-스키마)
9. [수집기 구현 가이드](#9-수집기-구현-가이드)
10. [재시도·오류 처리](#10-재시도오류-처리)
11. [스키마 버전 정책](#11-스키마-버전-정책)
12. [데이터 이용 한도](#12-데이터-이용-한도)
13. [샘플 스크립트 · FAQ · 변경 이력](#13-샘플-스크립트--faq--변경-이력)
14. [초기 적재: 전체 DB 덤프](#14-초기-적재-전체-db-덤프)

---

## 1. 개요

### 1.1 목적

ARGOS 는 로봇 업계 경쟁 정보 포털이다. 이 계약은 ARGOS 가 수집·분석한 데이터를 사내 ARGOS_I 서버가 매일 한 번 통째로 받아 가는 방법을 정한다. 변경분(delta)이 아니라 **그날의 전체 스냅샷**이다.

### 1.2 방식

- **pull 전용**: ARGOS_I 가 ARGOS 의 HTTPS API 를 호출한다. ARGOS 는 ARGOS_I 쪽으로 연결하지 않는다.
- **하루 한 번 생성**: ARGOS 가 번들을 PostgreSQL 에 저장해 두고(30일 보존), API 가 그 번들을 내려준다. 요청할 때마다 새로 계산하지 않으므로 호출은 가볍고 같은 날의 여러 번 호출은 같은 내용을 받는다.
- **영역별 MD + JSON 쌍**: 같은 레코드 집합을 사람·LLM 이 읽는 Markdown(요약 + 핵심 열 표)과 기계가 읽는 JSON(전체 필드)으로 각각 담는다.

### 1.3 데이터의 성격

- 외부 공개 데이터와 ARGOS 의 **파생 분석**(규칙 계산, AI 생성 요약·시사점)만 담는다.
- **원문은 담지 않는다**: 기사 본문, 논문 초록, 영상 설명·자막, 규제 원문은 어디에도 없다. 링크로 원문에 접근한다 (12절).
- 개인 식별 정보(이메일, 담당자, 작성자·평가자), 사용자별 읽음 상태, 토큰·비용 같은 운영 정보는 담지 않는다.
- 예외: 초기 적재용 전체 DB 덤프(**14절**)는 원문을 포함한다. 일일 번들이 아니라 별도 엔드포인트이며 1회성이다.

### 1.4 용어

| 용어 | 뜻 |
|---|---|
| 번들(bundle) | 하루치 스냅샷 전체. 날짜(KST)당 1개. README.md + manifest.json + 영역별 MD/JSON 쌍 |
| 영역(area) | 번들 안의 데이터 묶음 하나 (예: `robots`, `videos`). kebab-case id. 영역당 `<id>.md`, `<id>.json` 한 쌍 |
| 스냅샷 | 수집 시작 시점(`asOf`) 기준의 최선 노력 사본. 트랜잭션 스냅샷이 아니라서, 수집 도중 바뀐 값은 영역마다 다른 시점으로 보일 수 있다 |
| 번들 식별자 | `bundleSha256` = `manifest.json` 바이트의 SHA-256. 번들 내용이 바뀌면(재생성) 값이 바뀐다 |

---

## 2. 연결 정보

| 항목 | 값 |
|---|---|
| Base URL | `https://robot-info-api.up.railway.app` |
| 전송 | **HTTPS 만** 사용한다 (HTTP 로 호출하지 않는다) |
| 기준 시간대 | KST (`Asia/Seoul`, UTC+9). JSON 의 시각은 모두 UTC ISO 8601 이고, MD 의 날짜·시각은 KST 다 |
| 번들 날짜 | 번들 **생성 시작 시각의 KST 달력 날짜** (`YYYY-MM-DD`). 예: 2026-10-29 07:00 KST 에 시작한 번들의 날짜는 `2026-10-29` |
| 과거 날짜 | 이미 지난 날짜를 새로 만들 수는 없다. 보존 기간(기본 30일) 안의 기존 번들만 받을 수 있다 |

---

## 3. 인증

### 3.1 방식

모든 `/api/argos-i/*` 요청에 헤더 한 가지만 쓴다.

```
Authorization: Bearer <TOKEN>
```

- **쿼리스트링 토큰은 지원하지 않는다**(URL 이 프록시·접근 로그에 남을 수 있다). `X-Ingest-Key` 헤더나 다른 API 키도 받지 않는다.
- 토큰은 256비트 hex 를 권장한다 (`openssl rand -hex 32`). **32자 미만이면 서버가 API 를 비활성화한다.**
- 인증은 항상 **존재 확인보다 먼저** 이뤄진다. 토큰이 없거나 틀리면 날짜·파일이 존재하든 말든 401 이다 (404 로 존재 여부를 알 수 없다).

### 3.2 토큰 수령·보관

1. ARGOS 운영자가 토큰을 만들어 ARGOS 백엔드 서비스의 환경변수 `ARGOS_I_EXPORT_TOKEN` 에 저장한다.
2. 같은 값을 **사내 시크릿 저장소**에 보관한다. 저장소(git)에 커밋하지 않고, 채팅·이메일에 평문으로 공유하지 않는다.
3. 수집기는 토큰을 환경변수로만 읽고, 명령행 인자(프로세스 목록에 보인다)·로그·오류 메시지에 쓰지 않는다.

### 3.3 응답 코드

| 상태 | 본문 | 뜻 | 수신 측 대응 |
|---|---|---|---|
| 200 | 본문 | 성공 | — |
| 304 | 없음 | `If-None-Match` 가 현재 ETag 와 같다 (인증 통과 후에만) | 정상. 로컬 사본이 최신 |
| 400 | `{"error":"invalid_date"}` | 날짜 형식 오류 또는 실존하지 않는 날짜 (`2026-13-40`) | 요청 수정. 재시도하지 않는다 |
| 400 | `{"error":"invalid_file"}` | 파일명이 허용 목록(`manifest.json`, `README.md`, `<영역>.md`, `<영역>.json`)에 맞지 않는다 | 요청 수정 |
| 401 | `{"error":"Unauthorized"}` + `WWW-Authenticate: Bearer` | 헤더 없음·스킴 오류·토큰 불일치 | **재시도 없이 즉시 알림** (토큰 교체·만료 확인) |
| 404 | `{"error":"no_bundle"}` | (`latest.zip`) 아직 번들이 하나도 없다 | 정해진 시각에 재시도 (10절) |
| 404 | `{"error":"not_found"}` | 해당 날짜의 번들·파일이 없거나 보존 기간 밖이다 | `bundles[]` 에 있는 날짜만 요청한다 |
| 429 | `{"error":"too_many_requests"}` + `Retry-After` | **인증에 실패한** 요청이 서버 전체 기준 분당 30회를 넘었다. 유효한 토큰의 요청은 영향받지 않는다 | `Retry-After` 만큼 기다린다. 토큰이 틀렸다면 먼저 고친다 |
| 503 | `{"error":"argos_i_export_disabled"}` | 서버에 토큰이 설정되지 않았거나 32자 미만이다 | **재시도 없이 즉시 알림** (ARGOS 운영자에게 문의) |
| 503 | `{"error":"busy"}` + `Retry-After: 5` | ZIP 을 동시에 2개까지만 조립한다. 초과했다 | `Retry-After` 후 재시도 |

그 밖의 5xx 는 일시 장애로 보고 지수 백오프로 재시도한다.

### 3.4 토큰 교체 절차 (무중단)

서버는 `ARGOS_I_EXPORT_TOKEN`(현재)과 `ARGOS_I_EXPORT_TOKEN_NEXT`(다음) 중 **하나만 맞아도** 통과시킨다.

1. 새 토큰을 만들어 ARGOS 에 `ARGOS_I_EXPORT_TOKEN_NEXT` 로 추가한다. (두 토큰 모두 유효)
2. ARGOS_I 의 시크릿 저장소를 새 토큰으로 바꾸고, 한 번 이상 정상 pull 이 되는지 확인한다.
3. ARGOS 에서 `ARGOS_I_EXPORT_TOKEN` 에 새 토큰을 넣고 `ARGOS_I_EXPORT_TOKEN_NEXT` 를 지운다. (이전 토큰 폐기)

---

## 4. 일정

| 시각 (KST) | 일 |
|---|---|
| 03:00 | 크롤러가 arXiv·GitHub·SEC·YouTube 등을 수집한다 |
| 04:00 / 05:30 | 영상 태깅 체인, 기술 트렌드 분석 파이프라인이 실행된다 (AI 분석) |
| **07:00** | **번들 생성 시작.** 위 상류 작업이 아직 돌고 있으면 최대 30분까지 기다렸다가 진행한다 (대기 시간이 넘으면 그대로 진행하고 `warnings` 에 `upstream_busy_timeout` 을 남긴다). 따라서 번들은 **최대 약 07:30~07:40 까지 늦게 완성될 수 있다** |
| **08:00 이후** | **권장 pull 시작 시각.** 번들이 아직 없으면 `latest.zip` 이 404 `no_bundle` 일 수 있다 (또는 어제 번들이 `latest` 다) |

- **월요일**: 주간 브리프가 월요일 08:00 KST 에 생성된다. 브리프가 성공하면 ARGOS 가 **같은 날짜의 번들을 자동으로 다시 만든다** (`reason: "weekly-brief"`, 같은 날짜 덮어쓰기). 그래서 월요일은 **09:00 KST 이후에 한 번 더 pull** 하고, **같은 날짜에서 `bundleSha256` 이 바뀌면 다시 내려받는다**.
- **수동 재생성**: 운영자가 화면에서 "지금 생성" 을 누르면 오늘 번들이 덮어쓰기된다. 마찬가지로 `bundleSha256` 이 바뀐다.
- **기동 캐치업**: 서버가 07:00 이후에 재기동되었고 오늘 번들이 없으면 자동 생성한다.
- **보존**: 기본 **30일** (오늘 포함 30개 날짜). 그보다 오래된 번들은 삭제되어 받을 수 없다. 누락된 날짜는 보존 기간 안에서만 보충할 수 있다.

---

## 5. 엔드포인트 명세

접두사 `/api/argos-i`. 모두 `GET` (그리고 `HEAD`), 인증 필요 (3절).

| Method / Path | 응답 |
|---|---|
| `GET /api/argos-i/manifest` | 번들 목록 (JSON) |
| `GET /api/argos-i/export/latest.zip` | 최신 번들 ZIP |
| `GET /api/argos-i/export/{YYYY-MM-DD}.zip` | 해당 날짜 번들 ZIP |
| `GET /api/argos-i/export/{YYYY-MM-DD}/{file}` | 번들 안의 파일 하나 |

### 5.1 `GET /api/argos-i/manifest`

가장 먼저 호출해 어떤 번들이 있는지, 로컬 사본이 최신인지 확인한다.

```json
{
  "schemaVersion": 1,
  "serverTime": "2026-10-29T00:05:12.345Z",
  "timezone": "Asia/Seoul",
  "retentionDays": 30,
  "scheduleHint": { "generateCronKst": "07:00", "recommendedPullAfterKst": "08:00" },
  "latest": {
    "date": "2026-10-29",
    "generatedAt": "2026-10-28T22:03:11.120Z",
    "asOf": "2026-10-28T22:00:02.004Z",
    "status": "ok",
    "reason": "cron",
    "fileCount": 60,
    "totalBytes": 9235699,
    "bundleSha256": "3e446b78d9cb5e866734ccef2759066f246f5716a52bb3ffa7ceeac2e6001758",
    "manifestUrl": "/api/argos-i/export/2026-10-29/manifest.json",
    "zipUrl": "/api/argos-i/export/2026-10-29.zip"
  },
  "bundles": [ /* latest 와 같은 형태, 날짜 내림차순, 최대 30개 */ ]
}
```

| 필드 | 설명 |
|---|---|
| `schemaVersion` | 번들 스키마 메이저 (11절). 지원하지 않는 값이면 파싱을 중단하고 알린다 |
| `serverTime` | 서버 시각 (UTC) |
| `retentionDays` | 보존 일수 |
| `latest` | 가장 최근 번들. **번들이 하나도 없으면 `null`** (이때 `bundles` 는 `[]`, 응답은 200) |
| `bundles[]` | 받을 수 있는 번들 목록 (날짜 내림차순, 최대 30개) |
| `bundles[].date` | 번들 날짜 (KST) |
| `bundles[].status` | `ok` 또는 `partial` (일부 선택 영역 실패. 7절·열거값 참조) |
| `bundles[].reason` | 생성 사유 `cron` / `startup` / `manual` / `weekly-brief` |
| `bundles[].fileCount` / `totalBytes` | 저장된 **모든 파일**(manifest.json 포함)의 수와 바이트 합 |
| `bundles[].bundleSha256` | 번들 식별자. 같은 날짜에서 이 값이 바뀌면 번들이 재생성된 것이다 |
| `bundles[].manifestUrl` / `zipUrl` | **상대 경로**. Base URL 뒤에 붙여 쓴다 |

헤더: `ETag: "<본문(serverTime 제외)의 sha256>"` — 번들이 바뀌지 않으면 호출마다 같은 값이다. `If-None-Match` 로 보내면 304 를 받는다.

### 5.2 `GET /api/argos-i/export/latest.zip` · `GET /api/argos-i/export/{date}.zip`

번들 전체를 ZIP 하나로 받는다. ZIP 안의 경로는 `argos-i/YYYY-MM-DD/<파일>` 이고, 순서는 `README.md`, `manifest.json`, 그 외 경로 오름차순이다.

- `latest.zip`: 번들이 없으면 404 `{"error":"no_bundle"}`.
- `{date}.zip`: 형식 오류·실존하지 않는 날짜는 400 `invalid_date`, 번들이 없거나 보존 기간 밖이면 404 `not_found`.

응답 헤더: `Content-Type: application/zip`, `Content-Disposition: attachment; filename="argos-i_YYYY-MM-DD.zip"`, `Content-Length`, `X-Argos-I-Export-Date: YYYY-MM-DD`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-cache`, **약한 ETag** `W/"<bundleSha256>"`.

- ZIP 바이트가 결정적이라는 보장은 없다. 내용 동일성은 **파일별 sha256**(manifest.json)으로 확인한다.
- `HEAD` 는 ZIP 을 조립하지 않고 헤더만 돌려준다. ZIP 에 대한 HEAD 응답은 헤더만 주며 Content-Length 는 0 이므로 크기 판단에 쓰지 말 것 (파일 크기 합은 5.1 목록 API 의 `bundles[].totalBytes` 또는 번들 내부 `manifest.json` 의 `totals.totalBytes`(manifest.json 제외) 참고. 둘 다 압축 전 바이트 합이며 ZIP 크기가 아니다).
- 동시에 ZIP 을 2개까지만 조립한다. 초과하면 503 `busy` + `Retry-After: 5`.

### 5.3 `GET /api/argos-i/export/{date}/{file}`

번들 안의 파일 하나를 받는다. `file` 은 아래 허용 목록 정규식에 맞아야 한다 (경로 이동 `..`, `%2F`, `%00`, 대문자 등은 400 `invalid_file`).

```
^(manifest\.json|README\.md|[a-z0-9][a-z0-9-]{0,48}\.(md|json))$
```

없는 파일이면 404 `not_found`.

| 헤더 | 값 |
|---|---|
| `Content-Type` | md: `text/markdown; charset=utf-8`, json: `application/json; charset=utf-8` |
| `Content-Length` | 파일 바이트 수 |
| `ETag` | **강한 ETag** `"<파일 sha256>"` (manifest.json 의 `files[].sha256` 과 같은 값) |
| `Content-Disposition` | `attachment; filename="<파일명>"` |
| `X-Argos-I-Export-Date` | 번들 날짜 |
| `X-Content-Type-Options` | `nosniff` |
| `Cache-Control` | `private, no-cache` (같은 날짜를 재생성하면 내용이 바뀔 수 있어 immutable 로 두지 않는다) |

`If-None-Match: "<sha256>"` 가 일치하면 304.

### 5.4 공통

- **Range 요청은 지원하지 않는다** (항상 전체 본문).
- 압축 전송(`Accept-Encoding`)은 서버/프록시 설정에 따르며, ZIP 자체는 deflate 로 압축되어 있다.
- 모든 오류 본문은 `{"error":"<코드>"}` 형식의 JSON 이다.

---

## 6. 번들 구조

### 6.1 경로 규칙

DB 와 단일 파일 API 의 경로는 날짜 폴더 기준 상대 경로이고, ZIP 내부와 사람이 부르는 논리 경로는 `argos-i/YYYY-MM-DD/<파일>` 이다.

```
argos-i/2026-10-29/
  README.md          번들 설명, 스키마 버전, 규약, 영역 목록과 상태
  manifest.json      파일 목록(경로·영역·형식·sha256·바이트·레코드 수), 영역 상태, 합계
  <영역>.md          사람/LLM 이 읽는 요약 + 핵심 열 표
  <영역>.json        기계가 읽는 전체 필드 (같은 레코드 집합)
```

### 6.2 `manifest.json`

압축형 JSON(들여쓰기 없음) + 끝 개행 1개. 키 순서는 고정이다.

```json
{
  "schemaVersion": 1,
  "bundleDate": "2026-10-29",
  "generatedAt": "2026-10-28T22:03:11.120Z",
  "asOf": "2026-10-28T22:00:02.004Z",
  "timezone": "Asia/Seoul",
  "status": "ok",
  "reason": "cron",
  "generator": { "name": "argos", "commit": "abc1234" },
  "warnings": [],
  "areas": [
    { "id": "robots", "titleKo": "휴머노이드 로봇", "priority": "P0", "status": "ok", "recordCount": 60,
      "areaSchemaVersion": 1, "sourceTables": ["humanoid_robots", "companies"], "files": ["robots.json", "robots.md"] }
  ],
  "files": [
    { "path": "README.md", "area": null, "format": "md", "sha256": "…64자 hex…", "byteSize": 4321, "recordCount": null },
    { "path": "robots.json", "area": "robots", "format": "json", "sha256": "…", "byteSize": 54947, "recordCount": 60 }
  ],
  "totals": { "fileCount": 59, "totalBytes": 9218118 }
}
```

| 필드 | 설명 |
|---|---|
| `schemaVersion` | 번들 스키마 메이저 |
| `bundleDate` | 번들 날짜 (KST) |
| `asOf` | 데이터 기준 시각(수집 시작, UTC). 영역마다 수집 도중 바뀐 값은 이 시각 이후일 수 있다 (최선 노력 스냅샷) |
| `generatedAt` | 모든 수집이 끝난 뒤 번들을 조립한 시각 (UTC) |
| `status` | `ok` = 모든 영역 정상, `partial` = 선택 영역(P1/P2) 일부 실패 |
| `reason` | `cron` / `startup` / `manual` / `weekly-brief` |
| `generator.commit` | ARGOS 배포 커밋 앞 7자 (없으면 `null`) |
| `warnings[]` | 코드 문자열. `area_failed:<영역id>`, `upstream_busy_timeout` |
| `areas[]` | 영역 목록. `status`: `ok` / `empty`(0건, 파일은 있음) / `failed`(선택 영역 수집·빌드 실패 → 파일 없음, `files: []`) |
| `areas[].priority` | `P0` 핵심(실패하면 번들 자체가 만들어지지 않는다) / `P1`, `P2` 선택 |
| `files[]` | **manifest.json 자신을 제외한** 모든 파일 (경로 오름차순) |
| `totals` | `files[]` 의 합. **manifest.json 은 제외**한다 |

> API(`manifest`)의 `fileCount`/`totalBytes` 는 manifest.json 까지 포함한 저장 파일 전체이므로 `totals.fileCount + 1` 과 같다.

### 6.3 무결성 검증

- **파일별**: `files[].sha256` = 해당 파일 **바이트**의 SHA-256 (소문자 hex), `files[].byteSize` = 바이트 수. 인코딩은 UTF-8(BOM 없음), 줄바꿈 LF, 파일 끝에 개행 1개.
- **번들별**: `bundleSha256` = `manifest.json` 바이트의 SHA-256. 단일 파일 API 로 받은 `manifest.json` 의 SHA-256 이 목록 API 의 `bundleSha256` 과 같아야 한다.
- 검증 순서: ① manifest.json 을 받아 `bundleSha256` 확인 → ② `files[]` 를 하나씩 받아 `byteSize`·`sha256` 확인 → ③ 전부 맞을 때만 로컬 교체.

---

## 7. 공통 규약

### 7.1 JSON 봉투

모든 `<영역>.json` 은 같은 최상위 키를 같은 순서로 가진다.

| 키 | 타입 | 설명 |
|---|---|---|
| `schemaVersion` | number | 번들 스키마 메이저 (1) |
| `areaSchemaVersion` | number | 영역별 스키마 버전. 영역 내부의 호환 변경을 독립적으로 알린다 |
| `area` | string | 영역 id |
| `bundleDate` | string | `YYYY-MM-DD` (KST) |
| `asOf` / `generatedAt` | string | ISO 8601 UTC (`...Z`) |
| `timezone` | string | `Asia/Seoul` |
| `recordCount` | number | **주 레코드 수.** MD 의 첫 번째 표 행 수와 같다 (8절에서 영역별 기준을 밝힌다). 단 `aggregations` 는 모든 표 행 수의 합 (8.22절) |
| `units` | object | 이 영역에서 쓰는 필드 이름 → 단위 사전 |
| `source` | object | `{ "tables": [...], "derivedFrom": [...] }` |
| `data` | object | 영역별 본문. 목록형은 `data.items[]`, 복합 영역은 이름 있는 키 (8절) |

### 7.2 값의 표기

- **시각**: ISO 8601 UTC, 밀리초 포함, 항상 `Z` 로 끝난다 (예: `2026-10-28T22:00:02.004Z`). **날짜 전용** 필드는 `YYYY-MM-DD` 문자열이다 (KST 변환 없음).
- **수치**: JSON number. 소수점은 `.`, 천 단위 구분 없음. 단위는 `units` 와 8절 표를 따른다 (`Nm`, `kg`, `cm`, `m/s`, `TOPS`, `USD`, `Wh`, `N`, `h`, 점수 1~10 등).
- **결측**: `null`. `NaN` 은 쓰지 않고, 값이 비어 있으면 빈 문자열(`""`) 대신 `null` 이다 (이름·제목처럼 원본에서 필수인 텍스트가 정제 후 비는 극히 드문 경우만 예외). 배열이 비어 있으면 `[]`.
- **불리언**: JSON `true` / `false` (MD 에서는 예/아니오).
- **텍스트**: HTML 태그는 제거하고 남은 꺾쇠는 전각(`＜` `＞`)으로 바꾼다. 길이 상한은 제목 500자, 요약 400자(뉴스 300자), 키 포인트·근거 문구 200자다. 넘으면 `…` 로 끝난다.
- **링크**: `https://` 이고 자격증명(`user:pass@`)이 없는 URL 만 담는다. 아니면 `null`. 논문 링크는 `arxiv.org` 만, 영상 썸네일은 `https://i.ytimg.com/` 만 허용한다.
- **키 순서**: 빌더가 고정한다. 구조가 가변인 pass-through 객체(캐시된 AI 분석물 등)는 키를 알파벳순으로 정렬한다.

### 7.3 정렬과 ID 안정성

- 모든 목록은 영역별 기본 정렬 + `id` 오름차순 타이브레이커로 정렬한다 (입력 순서와 무관). 8절에 영역별 정렬이 있다.
- `id` 는 UUID 문자열로 **날짜가 바뀌어도 같은 레코드는 같은 id** 다. 다만 원본이 삭제되면 사라질 수 있으므로 "이전 번들에 있던 id 가 오늘 없다" 는 삭제를 뜻할 수 있다. 일부 영역은 정수 id(serial)나 `slug`·`vendorKey` 같은 안정 키를 쓴다.
- 영역 간 조인 키: `robotId`(= `robots.items[].id`), `companyId`/`company.id`(= `companies.items[].id`), `componentId`(= `components.items[].id`), `arxivId`(논문), `videoId`(영상), CI 의 `slug`, `vendorKey`.

### 7.4 MD 와 JSON 의 관계

- 같은 영역의 MD 와 JSON 은 **같은 레코드 집합**이다. MD 는 핵심 열만 보여주고, 전체 필드는 JSON 이다.
- MD 의 날짜·시각은 KST, JSON 의 시각은 UTC 다. MD 표에서 결측은 `-`, 불리언은 예/아니오, 머리글에 단위가 있다 (`키(cm)`, `무게(kg)`, `점수 1~10` 등).
- MD 셀 안의 파이프(`|`)는 `¦` 로, 줄바꿈·탭은 공백으로, `<` `>` 는 `&lt;` `&gt;` 로 바뀐다. 셀은 최대 600자다.
- MD 의 링크는 `[제목](https://…)` 형태의 https 링크뿐이다.

### 7.5 결정론과 재생성

같은 데이터는 같은 순서·같은 바이트로 출력된다. 같은 날짜를 두 번 생성했을 때 영역 파일에서 달라지는 것은 아래뿐이다.

- 각 파일 안의 `asOf`, `generatedAt` (MD 에서는 `데이터 기준 시각` 줄, README 의 생성 시각)
- `manifest.json` (위 시각과 파일 해시가 바뀌므로) 과 그 해시인 `bundleSha256`
- 기준 시각 대비로 계산하는 `stale` 플래그(`tech-trends`, `event-briefs`)와 `overview` 의 신선도 관련 값이 48시간 경계를 넘나드는 경우

따라서 **영역 파일의 변경 감지는 `asOf`/`generatedAt` 을 무시하고 비교**하거나, 단순히 `bundleSha256` 이 달라지면 다시 받는다.

---

## 8. 영역별 스키마

번들에는 아래 29개 영역이 항상 들어 있다 (데이터가 0건이어도 파일 쌍은 있고 `recordCount: 0`, 선택 영역이 실패하면 `status: "failed"` 로 파일이 빠진다). **P0** 는 핵심 영역이라 하나라도 실패하면 번들 자체가 만들어지지 않는다.

| # | 영역 id | 이름 | 우선순위 | `recordCount` 기준 (MD 첫 번째 표) | 출처 테이블 |
|---|---|---|---|---|---|
| 1 | `overview` | 개요·신선도 | P0 | 영역별 현황 | `articles`, `companies`, `ci_freshness`, `data_migrations`, `view_cache` |
| 2 | `companies` | 기업 | P0 | 기업 목록 | `companies`, `workforce_data`, `talent_trends` |
| 3 | `robots` | 휴머노이드 로봇 | P0 | 로봇 목록 | `humanoid_robots`, `companies`, `body_specs`, `hand_specs`, `computing_specs`, `sensor_specs`, `power_specs`, `robot_components`, `components` |
| 4 | `components` | 부품 | P0 | 부품 목록 | `components`, `robot_components`, `humanoid_robots` |
| 5 | `actuator-map` | 액추에이터 포지션·공급망 맵 | P0 | 로봇별 액추에이터 포지션 | `humanoid_robots`, `body_specs`, `hand_specs`, `companies`, `robot_components`, `components`, `products`, `product_specs`, `ci_values` |
| 6 | `actuator-sourcing` | 액추에이터 조달 태세·채택 사례 | P0 | 로봇별 액추에이터 조달 태세 | `actuator_sourcing`, `actuator_adoptions`, `actuator_vendor_markets` |
| 7 | `robot-benchmark` | 로봇 Perfect 벤치마크 | P0 | 경쟁 로봇 × 축 현재 점수(1~10) | `ci_benchmark_axes`, `ci_competitors`, `ci_benchmark_scores` |
| 8 | `hand-benchmark` | 핸드 Perfect 벤치마크 | P0 | 핸드 × 축 현재 점수(1~10) | `hand_benchmark_axes`, `hand_competitors`, `hand_benchmark_scores` |
| 9 | `ci-matrix` | 경쟁사 CI 매트릭스 | P0 | 항목 × 경쟁사 값 (괄호는 신뢰 등급 A~F) | `ci_layers`, `ci_categories`, `ci_items`, `ci_competitors`, `ci_values`, `ci_freshness` |
| 10 | `ci-changes` | CI 변경 이력·모니터 알림 | P0 | 값 변경 이력 (최신순) | `ci_value_history`, `ci_values`, `ci_items`, `ci_categories`, `ci_layers`, `ci_competitors`, `ci_monitor_alerts` |
| 11 | `videos` | 영상 | P0 | 영상 목록 (발행일 최신순) | `articles` |
| 12 | `papers` | 논문 | P0 | 논문 목록 (발행일 최신순) | `articles` |
| 13 | `news` | 뉴스 | P0 | 뉴스 목록 (발행일 최신순) | `articles`, `companies`, `article_robot_tags` |
| 14 | `tech-trends` | 기술 트렌드 | P0 | 기술 축별 현황 | `view_cache`, `articles` |
| 15 | `weekly-briefs` | 주간 브리프 | P0 | 주간 브리프 목록 (최신 주 먼저) | `weekly_briefs` |
| 16 | `keywords` | 키워드 | P1 | 키워드 목록 | `keywords`, `keyword_stats` |
| 17 | `application-cases` | 적용 사례 | P1 | 적용 사례 목록 (시연일 최신순) | `application_cases`, `humanoid_robots`, `companies` |
| 18 | `scores` | 역량 점수 | P1 | 산업용 PoC 팩터 점수 | `poc_scores`, `rfm_scores`, `positioning_data`, `score_history`, `humanoid_robots` |
| 19 | `vision-cost` | 비전 센서 원가 | P1 | BOM 부품 단가 | `vision_sensor_bom_parts`, `vision_sensor_robot_costs` |
| 20 | `products` | 제품 | P1 | 제품 목록 | `products`, `product_specs`, `companies` |
| 21 | `competitive-alerts` | 경쟁 알림 | P1 | 경쟁 알림 (최신순) | `competitive_alerts`, `humanoid_robots` |
| 22 | `aggregations` | 집계 지표 | P1 | 모든 표(세그먼트·연도별·부품·키워드) 행 수의 합 | `application_cases`, `humanoid_robots`, `components`, `robot_components`, `keywords`, `keyword_stats`, `article_keywords` |
| 23 | `strategy-warroom` | 전략 워룸 | P2 | 파트너 | `partners`, `partner_evaluations`, `application_domains`, `domain_robot_fit`, `strategic_goals`, `strategic_briefings`, `humanoid_robots` |
| 24 | `lg-humanoid-models` | LG 휴머노이드 모델·EE 요구사항 | P2 | LG 휴머노이드 모델 | `humanoid_models`, `ee_categories`, `cell_ee_requirements` |
| 25 | `coverage-field-events` | 커버리지 현장 이벤트 | P2 | 현장 이벤트 (일자 최신순) | `coverage_field_events` |
| 26 | `regulations` | 규제·컴플라이언스 | P2 | 규제 | `regulations`, `regulatory_updates`, `compliance_checklist` |
| 27 | `event-briefs` | 이벤트 분석물 | P2 | 이벤트 분석물 | `view_cache` |
| 28 | `external-sources` | 외부 출처(GitHub·SEC·특허) | P2 | 외부 출처 목록 (발행일 최신순) | `articles` |
| 29 | `data-quality` | 데이터 품질 | P2 | 최신 데이터 감사 요약 | `data_audit_reports` |

각 영역 표의 "타입" 은 JSON 타입이고 `T[]` 는 배열, "null 가능" 은 값이 `null` 일 수 있는지다. 필드 이름이 `<axisKey>` 처럼 꺾쇠로 표기된 곳은 키가 데이터에 따라 달라지는 객체다.

### 8.0 열거값 사전

| 이름 | 값 | 의미 |
|---|---|---|
| 번들 `status` | `ok` / `partial` | 정상 / 선택 영역 일부 실패 |
| 영역 `status` (manifest, overview) | `ok` / `empty` / `failed` | 정상 / 0건 / 실패(파일 없음) |
| `reason` | `cron` / `startup` / `manual` / `weekly-brief` | 정기 / 기동 캐치업 / 수동 / 주간 브리프 성공 후 재생성 |
| `dataType` (robots) | `confirmed` / `forecast` | 공개 확정 정보 / ARGOS 전망 |
| 근거·신뢰 등급 (`confidence`, `grade`, `evidenceGrade`) | `A` … `D`, `F` | A 공식 ~ D 추정(CI). 자체 개발 확인은 A·B 만 인정. 비전 원가의 `reliabilityGrade`·`sourceReliability` 는 A~E |
| `posture` (actuator-sourcing) | `in_house` / `in_house_sells` / `external` / `unknown` | 자체 개발 / 자체 개발 + 외부 판매 / 외부 조달 / 확인 불가 |
| `kind` (actuator-sourcing) | `in_house_confirmed` / `in_house_presumed` / `external` / `mixed` / `unknown` | 세부 조달 유형 |
| `level` (공급 층) | `module` / `component` | 통합 관절·모듈 단위 / 모터·감속기 등 부품 단위 |
| `basis` (sourcing) | `regrade` / `derived` | 재판정 레코드 기준 / 보수적 폴백 |
| `basis` (edges) | `self` / `external` / `unverified` | 자체 확인 / 외부 조달 / 자체로 보이나 확인 불가 |
| `locomotion` | `bipedal` / `wheeled` / `hybrid` / `unknown` | 이동 방식 |
| 시장 세그먼트 | `tier1_oem` / `tier2_legged` / `research_edu` / `industrial_cobot` / `service` / `captive` / `other` | 공급사 대상 시장 |
| `autonomy` (videos) | `autonomous` / `teleoperated` / `assisted` / `unclear` | 로봇 자율성 수준 |
| `domainFocus.*.level` | `primary` / `secondary` / `none` | 도메인 관련성 판정 (none = 무관) |
| 기술 축 `techDomains` | `hand` / `rfm` / `actuator` / `expo` / `production` | 핸드 / 로봇 파운데이션 모델 / 액추에이터 / 전시회 / 양산 |
| `generatedBy` | `ai` / `rule` | AI 생성 / 규칙 기반 |

### 8.1 `overview` — 개요·신선도 (P0)

- 파일: `overview.md`, `overview.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `articles`, `companies`, `ci_freshness`, `data_migrations`, `view_cache` / 파생: 다른 영역 결과(recordCount·status)
- 정렬: areas: 우선순위·id / sources: source·productType / companyFreshness: 이름·id
- `recordCount` 기준: **영역별 현황** (MD 의 첫 번째 표) 의 행 수
- "분석이 오늘 반영됐는가" 를 판단하는 용도: `analysis.pipeline.finishedAt`, `sources[].lastCollectedAt`, `analysis.insightCaches[].cachedAt` 를 번들 날짜와 비교한다.
- 이 영역은 다른 영역의 결과를 합산하므로 `areas` 에는 overview 자신이 없다 (`recordCount` = 영역 수).

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `areas` | object[] | - | 아니오 | 레코드 배열 |
| `areas[].id` | string | - | 아니오 | 영역 id |
| `areas[].titleKo` | string | - | 아니오 | 한글 이름 |
| `areas[].priority` | string | - | 아니오 | P0 \| P1 \| P2 |
| `areas[].status` | string | - | 아니오 | ok \| empty \| failed |
| `areas[].recordCount` | number | 건 | 아니오 | 영역의 주 레코드 수 |
| `sources` | object[] | - | 아니오 | 레코드 배열 |
| `sources[].source` | string | - | 아니오 | articles.source |
| `sources[].productType` | string | - | 아니오 | articles.product_type |
| `sources[].count` | number | 건 | 아니오 | 해당 출처·유형의 articles 건수 |
| `sources[].lastCollectedAt` | string | ISO 8601 UTC | 아니오 | 가장 최근 수집 시각 |
| `companyFreshness` | object[] | - | 아니오 | 레코드 배열 |
| `companyFreshness[].companyId` | string | - | 아니오 | companies.id |
| `companyFreshness[].name` | string | - | 아니오 | 이름 |
| `companyFreshness[].articleCount` | number | 건 | 아니오 | 기업에 연결된 기사·영상 수 |
| `companyFreshness[].lastCollectedAt` | string | ISO 8601 UTC | 예 | 가장 최근 수집 시각 |
| `analysis` | object | - | 아니오 | 분석 반영 현황 |
| `analysis.pipeline` | object | - | 예 | 기술 트렌드 분석 파이프라인 마지막 실행 (없으면 null) |
| `analysis.pipeline.status` | string | - | 아니오 | ok \| partial \| skipped \| failed |
| `analysis.pipeline.reason` | string | - | 아니오 | cron \| startup \| manual |
| `analysis.pipeline.startedAt` | string | ISO 8601 UTC | 아니오 | 시작 시각 |
| `analysis.pipeline.finishedAt` | string | ISO 8601 UTC | 아니오 | 완료 시각 |
| `analysis.pipeline.durationMs` | number | ms | 아니오 | 소요 시간 |
| `analysis.pipeline.domains` | object[] | - | 아니오 | 도메인별 결과 (오류 요약만) |
| `analysis.pipeline.domains[].domain` | string | - | 아니오 | 도메인 (hand, actuator 등) |
| `analysis.pipeline.domains[].error` | string | - | 아니오 | 실패 시 오류 요약 (최대 200자) |
| `analysis.weeklyBrief` | object | - | 예 | 주간 브리프 마지막 시도 (없으면 null) |
| `analysis.weeklyBrief.weekStart` | string | YYYY-MM-DD | 아니오 | 주 시작일 (KST 월요일) |
| `analysis.weeklyBrief.outcome` | string | - | 아니오 | created \| skipped_exists \| skipped_locked \| failed |
| `analysis.weeklyBrief.status` | string | - | 아니오 | 상태 |
| `analysis.weeklyBrief.finishedAt` | string | ISO 8601 UTC | 아니오 | 완료 시각 |
| `analysis.ciLastVerifiedAt` | string | ISO 8601 UTC | 아니오 | CI 값 최종 검증 시각의 최댓값 |
| `analysis.insightCaches` | object[] | - | 아니오 | AI 분석물 캐시 저장 시각 목록 |
| `analysis.insightCaches[].key` | string | - | 아니오 | AI 분석물 캐시 키 |
| `analysis.insightCaches[].cachedAt` | string | ISO 8601 UTC | 아니오 | 분석물 캐시 저장 시각 |

### 8.2 `companies` — 기업 (P0)

- 파일: `companies.md`, `companies.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `companies`, `workforce_data`, `talent_trends`
- 정렬: 이름(대소문자 무시)·id, talentTrend 는 연도 오름차순
- `recordCount` 기준: **기업 목록** (MD 의 첫 번째 표) 의 행 수

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].name` | string | - | 아니오 | 이름 |
| `items[].country` | string | - | 아니오 | 국가 (원본 표기) |
| `items[].city` | string | - | 예 | 도시 |
| `items[].foundingYear` | number | 연도(서기) | 예 | 설립 연도 |
| `items[].category` | string | - | 아니오 | 기업 분류 (humanoid 등) |
| `items[].mainBusiness` | string | - | 예 | 주요 사업 |
| `items[].homepageUrl` | string | - | 예 | 홈페이지 https 링크 |
| `items[].description` | string | - | 예 | 큐레이션 설명 (최대 400자) |
| `items[].valuationUsd` | number | USD | 예 | 기업가치 |
| `items[].workforce` | object | - | 예 | 인력 데이터 (없으면 null) |
| `items[].workforce.totalHeadcountMin` | number | 명 | 아니오 | 총 인력 하한 |
| `items[].workforce.totalHeadcountMax` | number | 명 | 아니오 | 총 인력 상한 |
| `items[].workforce.humanoidTeamSize` | number | 명 | 아니오 | 휴머노이드 팀 규모 |
| `items[].workforce.jobDistribution` | object | 비율 | 아니오 | 직무 분포 (rd, software, controlAi, mechatronics, operations, business 중 있는 키) |
| `items[].workforce.recordedAt` | string | ISO 8601 UTC | 아니오 | 기록 시각 |
| `items[].workforce.source` | string | - | 아니오 | 출처 |
| `items[].talentTrend` | object[] | - | 아니오 | 연도별 인력 추이 (연도 오름차순) |
| `items[].talentTrend[].year` | number | 연도(서기) | 아니오 | 연도 |
| `items[].talentTrend[].totalHeadcount` | number | 명 | 아니오 | 총 인력 |
| `items[].talentTrend[].humanoidTeamSize` | number | 명 | 아니오 | 휴머노이드 팀 규모 |
| `items[].talentTrend[].jobPostingCount` | number | 건 | 아니오 | 채용 공고 수 |
| `items[].talentTrend[].source` | string | - | 아니오 | 출처 |

### 8.3 `robots` — 휴머노이드 로봇 (P0)

- 파일: `robots.md`, `robots.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `humanoid_robots`, `companies`, `body_specs`, `hand_specs`, `computing_specs`, `sensor_specs`, `power_specs`, `robot_components`, `components`
- 정렬: 이름·기업 이름·id, components 는 type·name
- `recordCount` 기준: **로봇 목록** (MD 의 첫 번째 표) 의 행 수
- 전망(`dataType: "forecast"`) 로봇은 ARGOS 의 예측이며 확정 정보가 아니다. 이미지 URL·설명 원문은 포함하지 않는다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].name` | string | - | 아니오 | 이름 |
| `items[].company` | object | - | 아니오 | 제조 기업 {id, name, country} |
| `items[].company.id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].company.name` | string | - | 아니오 | 이름 |
| `items[].company.country` | string | - | 아니오 | 국가 (원본 표기) |
| `items[].announcementYear` | number | 연도(서기) | 아니오 | 발표 연도 |
| `items[].announcementQuarter` | number | 분기(1~4) | 예 | 발표 분기 |
| `items[].status` | string | - | 아니오 | development \| poc \| commercial |
| `items[].purpose` | string | - | 아니오 | industrial \| home \| service |
| `items[].locomotionType` | string | - | 아니오 | bipedal \| wheeled \| hybrid |
| `items[].handType` | string | - | 아니오 | gripper \| multi_finger \| interchangeable |
| `items[].commercializationStage` | string | - | 아니오 | concept \| prototype \| poc \| pilot \| commercial |
| `items[].region` | string | - | 아니오 | north_america \| europe \| china \| japan \| korea \| other |
| `items[].dataType` | string | - | 아니오 | confirmed(확정) \| forecast(ARGOS 전망) |
| `items[].forecast` | object | - | 예 | 전망 로봇의 근거 (확정 로봇은 null) |
| `items[].body` | object | - | 예 | 신체 스펙 (없으면 null) |
| `items[].body.heightCm` | number | cm | 아니오 | 키 |
| `items[].body.weightKg` | number | kg | 아니오 | 무게 |
| `items[].body.payloadKg` | number | kg | 예 | 페이로드 |
| `items[].body.dofCount` | number | DoF | 예 | 전신 자유도 |
| `items[].body.maxSpeedMps` | number | m/s | 예 | 최고 속도 |
| `items[].body.operationTimeHours` | number | h | 예 | 연속 가동 시간 |
| `items[].hand` | object | - | 예 | 손 스펙 (없으면 null) |
| `items[].hand.handType` | string | - | 아니오 | 손 유형 |
| `items[].hand.fingerCount` | number | 개 | 예 | 손가락 수 |
| `items[].hand.handDof` | number | DoF | 예 | 손 자유도 |
| `items[].hand.gripForceN` | number | N | 예 | 그립력 |
| `items[].hand.isInterchangeable` | boolean | - | 아니오 | 엔드이펙터 교체 가능 여부 |
| `items[].computing` | object | - | 예 | 컴퓨팅 스펙 (없으면 null) |
| `items[].computing.mainSoc` | string | - | 아니오 | 메인 SoC 이름 |
| `items[].computing.topsMin` | number | TOPS | 아니오 | 연산 성능 하한 |
| `items[].computing.topsMax` | number | TOPS | 아니오 | 연산 성능 상한 |
| `items[].computing.architectureType` | string | - | 아니오 | onboard \| edge \| cloud \| hybrid |
| `items[].sensors` | object | - | 예 | 센서 스펙 (없으면 null) |
| `items[].sensors.cameras` | object[] | - | 아니오 | 카메라 구성 [{type, count, resolution?}] |
| `items[].sensors.cameras[].count` | number | 건 | 아니오 | 건수 |
| `items[].sensors.cameras[].type` | string | - | 아니오 | 유형 |
| `items[].sensors.depthSensor` | string | - | 아니오 | 뎁스 센서 모델 |
| `items[].sensors.lidar` | string | - | 예 | LiDAR 모델 |
| `items[].sensors.imu` | string | - | 아니오 | IMU 모델 |
| `items[].sensors.forceTorque` | string | - | 예 | 힘/토크 센서 |
| `items[].sensors.touchSensors` | object[] | - | 예 | 촉각 센서 [{location, type}] |
| `items[].power` | object | - | 예 | 전원 스펙 (없으면 null) |
| `items[].power.batteryType` | string | - | 아니오 | 배터리 종류 |
| `items[].power.capacityWh` | number | Wh | 아니오 | 배터리 용량 |
| `items[].power.operationTimeHours` | number | h | 아니오 | 연속 가동 시간 |
| `items[].power.chargingMethod` | string | - | 아니오 | fixed \| swappable \| both |
| `items[].components` | object[] | - | 아니오 | 탑재 부품 연결 (type, name 순) |
| `items[].components[].componentId` | string | - | 아니오 | components.id (영역 간 조인 키) |
| `items[].components[].type` | string | - | 아니오 | 유형 |
| `items[].components[].name` | string | - | 아니오 | 이름 |
| `items[].components[].vendor` | string | - | 아니오 | 공급사·제조사 이름 |
| `items[].components[].usageLocation` | string | - | 아니오 | head \| torso \| arm \| leg \| hand 등 |
| `items[].components[].quantity` | number | 개 | 아니오 | 수량 |
| `items[].updatedAt` | string | ISO 8601 UTC | 아니오 | 갱신 시각 |
| `items[].forecast.rationale` | string | - | 아니오 | 전망 근거 (최대 400자) |
| `items[].forecast.sources` | string[] | - | 아니오 | 전망 근거 출처 목록 (세미콜론으로 나뉜 원본을 분리, 각 최대 200자) |
| `items[].forecast.confidence` | string | - | 아니오 | high \| medium \| low |
| `items[].sensors.cameras[].resolution` | string | - | 아니오 | 해상도 |
| `items[].sensors.touchSensors[].location` | string | - | 아니오 | 위치 |
| `items[].sensors.touchSensors[].type` | string | - | 아니오 | 유형 |

### 8.4 `components` — 부품 (P0)

- 파일: `components.md`, `components.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `components`, `robot_components`, `humanoid_robots`
- 정렬: type·이름·id, linkedRobots 는 robotId
- `recordCount` 기준: **부품 목록** (MD 의 첫 번째 표) 의 행 수
- `analytics` 는 화면 차트와 같은 원천의 결정론적 집계다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].type` | string | - | 아니오 | actuator \| soc \| sensor \| power |
| `items[].name` | string | - | 아니오 | 이름 |
| `items[].vendor` | string | - | 예 | 공급사·제조사 이름 |
| `items[].specifications` | object | - | 예 | 부품 유형별 스펙 (키는 부품마다 다르다. 단위는 영역의 units 와 키 이름 접미사 Nm/kg/Wh/Rpm/Mm/Usd 를 따른다) |
| `items[].linkedRobots` | object[] | - | 아니오 | 이 부품을 쓰는 로봇 (robotId 오름차순) |
| `items[].linkedRobots[].robotId` | string | - | 아니오 | humanoid_robots.id (영역 간 조인 키) |
| `items[].linkedRobots[].usageLocation` | string | - | 아니오 | 탑재 위치 (head, torso, arm, leg, hand 등) |
| `items[].linkedRobots[].quantity` | number | 개 | 아니오 | 수량 |
| `analytics` | object | - | 아니오 | 화면 차트와 같은 원천의 집계 |
| `analytics.torqueDensity` | object[] | - | 아니오 | 액추에이터 토크 밀도 산점 (최대 토크·무게가 모두 있는 부품) |
| `analytics.torqueDensity[].componentId` | string | - | 아니오 | components.id |
| `analytics.torqueDensity[].name` | string | - | 아니오 | 이름 |
| `analytics.torqueDensity[].vendor` | string | - | 아니오 | 공급사·제조사 이름 |
| `analytics.torqueDensity[].weightKg` | number | kg | 아니오 | 무게 |
| `analytics.torqueDensity[].maxTorqueNm` | number | Nm | 아니오 | 최대 토크 |
| `analytics.torqueDensity[].torqueDensityNmPerKg` | number | Nm/kg | 아니오 | 최대 토크 / 무게 |
| `analytics.socPerformance` | object[] | - | 아니오 | SoC 전력-연산 산점 |
| `analytics.socPerformance[].componentId` | string | - | 아니오 | components.id |
| `analytics.socPerformance[].name` | string | - | 아니오 | 이름 |
| `analytics.socPerformance[].vendor` | string | - | 아니오 | 공급사·제조사 이름 |
| `analytics.socPerformance[].powerW` | number | W | 아니오 | 소비 전력 (powerConsumption 또는 tdpWatts 의 첫 수치) |
| `analytics.socPerformance[].tops` | number | TOPS | 아니오 | 연산 성능 |
| `analytics.socPerformance[].processNode` | string | - | 아니오 | 공정 노드 |
| `analytics.topsTimeline` | object[] | - | 아니오 | 발표 연도별 SoC 연산 성능 |
| `analytics.topsTimeline[].year` | number | 연도(서기) | 아니오 | 연도 |
| `analytics.topsTimeline[].avgTops` | number | TOPS | 아니오 | 해당 연도 발표 로봇에 탑재된 SoC 의 평균 연산 성능 |
| `analytics.topsTimeline[].maxTops` | number | TOPS | 아니오 | 해당 연도 최대 연산 성능 |
| `analytics.topsTimeline[].count` | number | 개 | 아니오 | 집계에 쓰인 SoC-로봇 연결 수 |
| `analytics.computingLocation` | object | - | 아니오 | SoC 위치 분포 {onboard, edge, cloud, hybrid} (개수) |
| `analytics.computingLocation.onboard` | number | 개 | 아니오 | 위치가 onboard 인 SoC 수 |
| `analytics.computingLocation.edge` | number | 개 | 아니오 | 위치가 edge 인 SoC 수 |
| `analytics.computingLocation.cloud` | number | 개 | 아니오 | 위치가 cloud 인 SoC 수 |
| `analytics.computingLocation.hybrid` | number | 개 | 아니오 | 위치가 hybrid 인 SoC 수 |

### 8.5 `actuator-map` — 액추에이터 포지션·공급망 맵 (P0)

- 파일: `actuator-map.md`, `actuator-map.json`
- `areaSchemaVersion`: 2
- 출처 테이블: `humanoid_robots`, `body_specs`, `hand_specs`, `companies`, `robot_components`, `components`, `products`, `product_specs`, `ci_values` / 파생: actuator-position-map(view_cache)
- 정렬: robots: 이름·id / suppliers: vendor·model / edges: robotId·vendor
- `recordCount` 기준: **로봇별 액추에이터 포지션** (MD 의 첫 번째 표) 의 행 수
- `areaSchemaVersion` 은 `ACTUATOR_MAP_SCHEMA_VERSION`(현재 2) 이다. 원본 맵의 `generatedAt`·`cached` 는 제거하고 번들 시각을 쓴다.
- 제어 난이도 지수는 서버가 계산하지 않는다. `difficultyDefault` 와 로봇별 입력값(`locomotion`, `dof`, `handDof`, `speed`)으로 수신 측이 산출한다: 지수 = 10 × Σ(가중치 × 정규화 값) / Σ가중치, 정규화는 보행(바퀴 0 · 하이브리드 0.5 · 이족 1), 전신 자유도(10→0, 50→1), 손 자유도(0→0, 24→1), 속도(0→0, 5m/s→1).

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `difficultyDefault` | object | - | 아니오 | 제어 난이도 지수 기본 가중치 (L 보행, D 전신 자유도, H 손 자유도, S 속도; 합 100). 지수는 서버가 계산하지 않는다 |
| `difficultyDefault.L` | number | 가중치 | 아니오 | 보행 방식 |
| `difficultyDefault.D` | number | 가중치 | 아니오 | 전신 자유도 |
| `difficultyDefault.H` | number | 가중치 | 아니오 | 손 자유도 |
| `difficultyDefault.S` | number | 가중치 | 아니오 | 최고 속도 |
| `typeOrder` | string[] | - | 아니오 | 구동 방식 라벨 표시 순서 |
| `segmentOrder` | string[] | - | 아니오 | 시장 세그먼트 표시 순서 |
| `stats` | object | 건 | 아니오 | 배열별 건수 집계 |
| `stats.robots` | number | 건 | 아니오 | 로봇 수 |
| `stats.complete` | number | 건 | 아니오 | 스펙 완전 로봇 수 |
| `stats.incomplete` | number | 건 | 아니오 | 스펙 불완전 로봇 수 |
| `stats.suppliers` | number | 건 | 아니오 | 공급 제품 수 |
| `stats.edges` | number | 건 | 아니오 | 공급 관계 수 |
| `stats.adoptions` | number | 건 | 아니오 | 채택 사례 수 |
| `robots` | object[] | - | 아니오 | 레코드 배열 |
| `robots[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `robots[].name` | string | - | 아니오 | 이름 |
| `robots[].company` | string | - | 아니오 | 기업 |
| `robots[].companyId` | string | - | 아니오 | companies.id (영역 간 조인 키) |
| `robots[].region` | string | - | 아니오 | na \| cn \| eu \| kr \| jp \| other |
| `robots[].locomotion` | string | - | 아니오 | bipedal \| wheeled \| hybrid \| unknown |
| `robots[].stage` | string | - | 아니오 | 개발 단계 |
| `robots[].year` | number | 연도(서기) | 아니오 | 연도 |
| `robots[].forecast` | boolean | - | 아니오 | 전망 로봇 여부 |
| `robots[].isLG` | boolean | - | 아니오 | LG 제품 여부 |
| `robots[].height` | number | cm | 예 | 키 |
| `robots[].weight` | number | kg | 예 | 무게 |
| `robots[].payload` | number | kg | 예 | 페이로드 |
| `robots[].dof` | number | DoF | 예 | 전신 자유도 |
| `robots[].handDof` | number | DoF | 예 | 손 자유도 |
| `robots[].speed` | number | m/s | 예 | 최고 속도 |
| `robots[].incomplete` | boolean | - | 아니오 | 핵심 값(자유도)이 비어 X축을 계산할 수 없는 로봇 |
| `robots[].actuators` | object[] | - | 아니오 | 레코드 배열 |
| `robots[].actuators[].name` | string | - | 아니오 | 이름 |
| `robots[].actuators[].vendor` | string | - | 아니오 | 공급사·제조사 이름 |
| `robots[].actuators[].inHouse` | boolean | - | 아니오 | 자체 개발 여부 |
| `robots[].actuators[].type` | string | - | 아니오 | 구동 방식 라벨 (typeOrder 값) |
| `robots[].actuators[].torqueNm` | number | Nm | 예 | 토크 |
| `robots[].actuators[].weightKg` | number | kg | 예 | 무게 |
| `robots[].actuators[].quantity` | number | 개 | 아니오 | 수량 |
| `robots[].actuators[].usageLocation` | string | - | 예 | 탑재 위치 (head, torso, arm, leg, hand 등) |
| `robots[].actuators[].source` | string | - | 아니오 | components(부품 조인) \| ci(CI 매트릭스 항목) |
| `robots[].actuators[].confidence` | string | - | 아니오 | 신뢰 등급 (A 공식 ~ D 추정(CI), F) |
| `robots[].actuatorTypeLabel` | string | - | 아니오 | 대표 구동 방식 라벨 |
| `robots[].actuatorTypeNote` | string | - | 아니오 | 라벨의 근거 |
| `robots[].price` | object | USD | 예 | 기록된 가격 범위 {min, max, conf 등급, src 출처} (없으면 null) |
| `robots[].price.min` | number | - | 아니오 | 하한 |
| `robots[].price.max` | number | - | 아니오 | 상한 |
| `robots[].price.conf` | string | - | 아니오 | 신뢰 등급 |
| `robots[].price.src` | string | - | 아니오 | 출처 설명 |
| `robots[].sources` | string[] | - | 아니오 | 출처 https 링크 목록 |
| `suppliers` | object[] | - | 아니오 | 레코드 배열 |
| `suppliers[].vendor` | string | - | 아니오 | 공급사·제조사 이름 |
| `suppliers[].country` | string | - | 아니오 | 국가 (원본 표기) |
| `suppliers[].model` | string | - | 아니오 | 생성 모델 식별자 (DB 값 그대로) |
| `suppliers[].type` | string | - | 아니오 | 액추에이터 유형 (원본 표기) |
| `suppliers[].peakTorqueNm` | number | Nm | 예 | 피크 토크 |
| `suppliers[].continuousTorqueNm` | number | Nm | 예 | 연속 토크 |
| `suppliers[].weightKg` | number | kg | 예 | 무게 |
| `suppliers[].diameterMm` | number | mm | 예 | 직경 |
| `suppliers[].priceUsd` | number | USD | 예 | 가격 |
| `suppliers[].status` | string | - | 예 | 상태 |
| `suppliers[].targetMarket` | string | - | 아니오 | 타깃 시장 |
| `suppliers[].source` | string | - | 아니오 | products \| components |
| `suppliers[].diameterRangeMm` | object | mm | 예 | 직경 범위 {min, max} |
| `suppliers[].diameterRangeMm.min` | number | - | 아니오 | 하한 |
| `suppliers[].diameterRangeMm.max` | number | - | 아니오 | 상한 |
| `suppliers[].integrationLevel` | string | - | 예 | 통합 수준 (motor_only, motor_gear, motor_gear_driver, fully_integrated 등) |
| `suppliers[].isLG` | boolean | - | 아니오 | LG 제품 여부 |
| `suppliers[].segment` | string | - | 아니오 | 대표 시장 세그먼트 |
| `suppliers[].segments` | string[] | - | 아니오 | 적중한 모든 시장 세그먼트 (우선순위 순) |
| `suppliers[].segmentBasis` | string | - | 아니오 | override \| vendor_segments \| adoptions \| keywords \| none |
| `suppliers[].adoptionIds` | string[] | - | 아니오 | 매칭된 채택 사례 id (actuator-sourcing 의 adoptions[].id) |
| `edges` | object[] | - | 아니오 | 레코드 배열 |
| `edges[].robotId` | string | - | 아니오 | humanoid_robots.id (영역 간 조인 키) |
| `edges[].robotName` | string | - | 아니오 | 로봇 이름 |
| `edges[].company` | string | - | 아니오 | 기업 |
| `edges[].vendor` | string | - | 아니오 | 공급사·제조사 이름 |
| `edges[].inHouse` | boolean | - | 아니오 | 자체 개발 엣지 여부 |
| `edges[].type` | string | - | 아니오 | 구동 방식 라벨 |
| `edges[].quantity` | number | 개 | 아니오 | 수량 |
| `edges[].confidence` | string | - | 아니오 | 신뢰 등급 (A 공식 ~ D 추정(CI), F) |
| `edges[].basis` | string | - | 아니오 | self(자체 확인) \| external(외부 조달) \| unverified(자체로 보이나 확인 불가) |
| `edges[].posture` | string | - | 아니오 | 엣지가 속한 로봇의 조달 태세 (in_house \| in_house_sells \| external \| unknown) |
| `edges[].role` | string | - | 예 | 공급 역할 |
| `edges[].level` | string | - | 아니오 | module \| component |

### 8.6 `actuator-sourcing` — 액추에이터 조달 태세·채택 사례 (P0)

- 파일: `actuator-sourcing.md`, `actuator-sourcing.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `actuator_sourcing`, `actuator_adoptions`, `actuator_vendor_markets` / 파생: actuator-position-map(view_cache)
- 정렬: sourcing: 로봇 이름·id / adoptions: id / vendorMarkets: vendorKey
- `recordCount` 기준: **로봇별 액추에이터 조달 태세** (MD 의 첫 번째 표) 의 행 수
- 근거 등급: A 공식 ~ D 추정(CI). 자체 개발 확인은 A·B 등급만 인정한다.
- `sourcing` 은 `actuator-map` 의 `robots[].sourcing` 과 같은 원천이며 추가 쿼리 없이 재사용한 것이다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `sourcing` | object[] | - | 아니오 | 레코드 배열 |
| `sourcing[].robotId` | string | - | 아니오 | humanoid_robots.id (영역 간 조인 키) |
| `sourcing[].robotName` | string | - | 아니오 | 로봇 이름 |
| `sourcing[].company` | string | - | 아니오 | 기업 |
| `sourcing[].forecast` | boolean | - | 아니오 | 전망 로봇 여부 |
| `sourcing[].posture` | string | - | 아니오 | in_house \| in_house_sells \| external \| unknown |
| `sourcing[].kind` | string | - | 아니오 | in_house_confirmed \| in_house_presumed \| external \| mixed \| unknown |
| `sourcing[].sellsExternally` | boolean | - | 예 | 외부 판매 여부 (불명이면 null) |
| `sourcing[].evidenceGrade` | string | - | 예 | 근거 등급 (A 공식 ~ D 추정) |
| `sourcing[].evidence` | object[] | - | 아니오 | 근거 목록 (claim 은 파생 요약 최대 200자, 원문 아님) |
| `sourcing[].evidence[].claim` | string | - | 아니오 | 근거 한 줄 |
| `sourcing[].evidence[].source` | string | - | 예 | 출처 |
| `sourcing[].evidence[].url` | string | - | 예 | https 링크 (https 가 아니거나 자격증명이 있으면 null) |
| `sourcing[].evidence[].grade` | string | - | 아니오 | 근거 등급 (A 공식 ~ D 추정) |
| `sourcing[].evidence[].date` | string | YYYY-MM-DD | 예 | 근거 날짜 |
| `sourcing[].externalVendors` | object[] | - | 아니오 | 외부 공급사 목록 |
| `sourcing[].externalVendors[].vendor` | string | - | 아니오 | 공급사·제조사 이름 |
| `sourcing[].externalVendors[].role` | string | - | 예 | 공급 역할 |
| `sourcing[].externalVendors[].grade` | string | - | 아니오 | 근거 등급 (A 공식 ~ D 추정) |
| `sourcing[].externalVendors[].url` | string | - | 예 | https 링크 (https 가 아니거나 자격증명이 있으면 null) |
| `sourcing[].externalVendors[].level` | string | - | 아니오 | module(통합 관절·모듈) \| component(모터·감속기 등 부품) |
| `sourcing[].componentSourcing` | boolean | - | 아니오 | 모듈은 자체 설계이고 모터·감속기 등 부품만 외부 조달 |
| `sourcing[].noteKo` | string | - | 예 | 한글 비고 (최대 400자) |
| `sourcing[].basis` | string | - | 아니오 | regrade(재판정 레코드 기준) \| derived(재판정 레코드 없음, 보수적 폴백) |
| `adoptions` | object[] | - | 아니오 | 레코드 배열 |
| `adoptions[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `adoptions[].robotName` | string | - | 아니오 | 로봇 이름 |
| `adoptions[].company` | string | - | 아니오 | 기업 |
| `adoptions[].country` | string | - | 예 | 국가 (원본 표기) |
| `adoptions[].segment` | string | - | 아니오 | humanoid_tier1 \| humanoid_tier2 \| research_platform \| service_robot \| quadruped \| exoskeleton \| robot_arm \| industrial |
| `adoptions[].marketSegment` | string | - | 아니오 | tier1_oem \| tier2_legged \| research_edu \| industrial_cobot \| service \| captive \| other |
| `adoptions[].level` | string | - | 아니오 | module \| component |
| `adoptions[].robotClass` | string | - | 아니오 | 로봇 종류 (quadruped 등) |
| `adoptions[].actuatorVendor` | string | - | 아니오 | 액추에이터 공급사 |
| `adoptions[].vendorKey` | string | - | 아니오 | 공급사 정규화 키 (조인용) |
| `adoptions[].actuatorModel` | string | - | 예 | 액추에이터 모델 |
| `adoptions[].usage` | string | - | 아니오 | 용도 (파생 요약 최대 200자) |
| `adoptions[].evidenceGrade` | string | - | 아니오 | 근거 등급 (A 공식 ~ D 추정) |
| `adoptions[].sources` | object[] | - | 아니오 | 출처 [{url, title}] (https 만) |
| `adoptions[].sources[].url` | string | - | 아니오 | https 링크 (https 가 아니거나 자격증명이 있으면 null) |
| `adoptions[].sources[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `adoptions[].noteKo` | string | - | 예 | 한글 비고 (최대 400자) |
| `adoptions[].year` | number | 연도(서기) | 아니오 | 연도 |
| `vendorMarkets` | object[] | - | 아니오 | 레코드 배열 |
| `vendorMarkets[].vendor` | string | - | 아니오 | 공급사·제조사 이름 |
| `vendorMarkets[].vendorKey` | string | - | 아니오 | 공급사 정규화 키 (조인용) |
| `vendorMarkets[].targetMarketsKo` | string[] | - | 아니오 | 공개 타깃 시장 (한글) |
| `vendorMarkets[].segments` | string[] | - | 예 | 시장 세그먼트 (불명이면 null) |
| `vendorMarkets[].grade` | string | - | 아니오 | 근거 등급 (A 공식 ~ D 추정) |
| `vendorMarkets[].url` | string | - | 아니오 | https 링크 (https 가 아니거나 자격증명이 있으면 null) |
| `sourcingStats` | object | 대 | 아니오 | 조달 태세 집계 (robots 는 전망 제외 로봇 수) |
| `sourcingStats.robots` | number | 대 | 아니오 | 전망 제외 로봇 수 |
| `sourcingStats.inHouse` | number | 대 | 아니오 | 자체 개발 |
| `sourcingStats.inHouseSells` | number | 대 | 아니오 | 자체 개발 + 외부 판매 |
| `sourcingStats.external` | number | 대 | 아니오 | 외부 조달 |
| `sourcingStats.externalMixed` | number | 대 | 아니오 | 외부 조달 중 혼합(mixed) |
| `sourcingStats.unknown` | number | 대 | 아니오 | 확인 불가 |
| `sourcingStats.unknownPresumed` | number | 대 | 아니오 | 확인 불가 중 자체 개발 추정 |
| `sourcingStats.regraded` | number | 대 | 아니오 | 재판정 기준 |
| `sourcingStats.derived` | number | 대 | 아니오 | 보수적 파생 |
| `sourcingStats.componentSourcing` | number | 대 | 아니오 | 부품 층만 외부 조달 |

### 8.7 `robot-benchmark` — 로봇 Perfect 벤치마크 (P0)

- 파일: `robot-benchmark.md`, `robot-benchmark.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `ci_benchmark_axes`, `ci_competitors`, `ci_benchmark_scores`
- 정렬: axes: 표시 순서·key / competitors: 표시 순서·slug
- `recordCount` 기준: **경쟁 로봇 × 축 현재 점수(1~10)** (MD 의 첫 번째 표) 의 행 수
- 점수 척도: 0~10 정수 (10 = 해당 축의 Perfect 정의 `perfectDef`). 비활성 경쟁 로봇은 제외한다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `axes` | object[] | - | 아니오 | 레코드 배열 |
| `axes[].key` | string | - | 아니오 | 축 키 (competitors[].scores 의 키) |
| `axes[].label` | string | - | 아니오 | 표시 이름 |
| `axes[].description` | string | - | 예 | 큐레이션 설명 (최대 400자) |
| `axes[].perfectDef` | string | - | 예 | 해당 축의 Perfect(10점) 정의 |
| `competitors` | object[] | - | 아니오 | 레코드 배열 |
| `competitors[].slug` | string | - | 아니오 | 경쟁 로봇 slug (안정 키) |
| `competitors[].name` | string | - | 아니오 | 이름 |
| `competitors[].manufacturer` | string | - | 아니오 | 제조사 |
| `competitors[].country` | string | - | 아니오 | 국가 (원본 표기) |
| `competitors[].stage` | string | - | 아니오 | 개발 단계 |
| `competitors[].scores` | object | - | 아니오 | 축 키 → 점수 객체 |
| `competitors[].scores.<axisKey>` | object | - | 아니오 | 축별 점수 |
| `competitors[].scores.<axisKey>.currentScore` | number | 점수 0~10 | 아니오 | 현재 점수 |
| `competitors[].scores.<axisKey>.targetScore` | number | 점수 0~10 | 아니오 | 목표 점수 |
| `competitors[].scores.<axisKey>.rationale` | string | - | 예 | 점수 근거 (최대 400자) |

### 8.8 `hand-benchmark` — 핸드 Perfect 벤치마크 (P0)

- 파일: `hand-benchmark.md`, `hand-benchmark.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `hand_benchmark_axes`, `hand_competitors`, `hand_benchmark_scores`
- 정렬: axes: 표시 순서·key / competitors: 표시 순서·slug
- `recordCount` 기준: **핸드 × 축 현재 점수(1~10)** (MD 의 첫 번째 표) 의 행 수
- 점수 척도: 0~10 정수. `rawValue` 는 원본 수치 문자열이다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `axes` | object[] | - | 아니오 | 레코드 배열 |
| `axes[].key` | string | - | 아니오 | 축 키 (competitors[].scores 의 키) |
| `axes[].label` | string | - | 아니오 | 표시 이름 |
| `axes[].description` | string | - | 예 | 큐레이션 설명 (최대 400자) |
| `axes[].perfectDef` | string | - | 예 | 해당 축의 Perfect(10점) 정의 |
| `axes[].unit` | string | - | 예 | 축의 원본 수치 단위 (DoF, kg, N, Hz, 채널, 비율) |
| `competitors` | object[] | - | 아니오 | 레코드 배열 |
| `competitors[].slug` | string | - | 아니오 | 핸드 slug (안정 키) |
| `competitors[].name` | string | - | 아니오 | 이름 |
| `competitors[].manufacturer` | string | - | 아니오 | 제조사 |
| `competitors[].country` | string | - | 아니오 | 국가 (원본 표기) |
| `competitors[].category` | string | - | 아니오 | dexterous \| industrial-5f |
| `competitors[].scores` | object | - | 아니오 | 축 키 → 점수 객체 |
| `competitors[].scores.<axisKey>` | object | - | 아니오 | 축별 점수 |
| `competitors[].scores.<axisKey>.currentScore` | number | 점수 0~10 | 아니오 | 현재 점수 |
| `competitors[].scores.<axisKey>.targetScore` | number | 점수 0~10 | 아니오 | 목표 점수 |
| `competitors[].scores.<axisKey>.rawValue` | string | - | 예 | 원본 수치 문자열 (예: "24 DoF") |
| `competitors[].scores.<axisKey>.rationale` | string | - | 예 | 점수 근거 (최대 400자) |

### 8.9 `ci-matrix` — 경쟁사 CI 매트릭스 (P0)

- 파일: `ci-matrix.md`, `ci-matrix.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `ci_layers`, `ci_categories`, `ci_items`, `ci_competitors`, `ci_values`, `ci_freshness`
- 정렬: 레이어·카테고리·항목: 표시 순서 / values: 경쟁 로봇 slug
- `recordCount` 기준: **항목 × 경쟁사 값 (괄호는 신뢰 등급 A~F)** (MD 의 첫 번째 표) 의 행 수
- MD 의 첫 번째 표는 항목(행) × 경쟁 로봇(열) 이며 `recordCount` 는 항목 수다. JSON 의 `layers → categories → items → values` 가 전체 필드다. 검수 대기열은 포함하지 않는다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `competitors` | object[] | - | 아니오 | 레코드 배열 |
| `competitors[].slug` | string | - | 아니오 | 경쟁 로봇 slug (values[].competitor 가 참조) |
| `competitors[].name` | string | - | 아니오 | 이름 |
| `competitors[].manufacturer` | string | - | 아니오 | 제조사 |
| `competitors[].country` | string | - | 아니오 | 국가 (원본 표기) |
| `competitors[].stage` | string | - | 아니오 | 개발 단계 |
| `layers` | object[] | - | 아니오 | 레코드 배열 |
| `layers[].slug` | string | - | 아니오 | 레이어 slug (hw, sw, data, biz, safety, ip) |
| `layers[].name` | string | - | 아니오 | 이름 |
| `layers[].categories` | object[] | - | 아니오 | 레코드 배열 |
| `layers[].categories[].name` | string | - | 아니오 | 이름 |
| `layers[].categories[].items` | object[] | - | 아니오 | 레코드 배열 |
| `layers[].categories[].items[].name` | string | - | 아니오 | 이름 |
| `layers[].categories[].items[].values` | object[] | - | 아니오 | 레코드 배열 |
| `layers[].categories[].items[].values[].competitor` | string | - | 아니오 | competitors[].slug |
| `layers[].categories[].items[].values[].value` | string | - | 아니오 | 값 (최대 400자) |
| `layers[].categories[].items[].values[].confidence` | string | 등급(A~F) | 아니오 | 신뢰 등급 (A 공식 ~ D 추정(CI), F) |
| `layers[].categories[].items[].values[].source` | string | - | 예 | 출처 설명 (최대 200자) |
| `layers[].categories[].items[].values[].sourceUrl` | string | - | 예 | 출처 https 링크 |
| `layers[].categories[].items[].values[].sourceDate` | string | YYYY-MM-DD | 예 | 출처 날짜 |
| `layers[].categories[].items[].values[].lastVerified` | string | ISO 8601 UTC | 예 | 마지막 검증 시각 |
| `freshness` | object[] | - | 아니오 | 레코드 배열 |
| `freshness[].layer` | string | - | 아니오 | layers[].slug |
| `freshness[].competitor` | string | - | 아니오 | competitors[].slug |
| `freshness[].lastVerified` | string | ISO 8601 UTC | 아니오 | 마지막 검증 시각 |
| `freshness[].nextReview` | string | ISO 8601 UTC | 예 | 다음 검토 예정 시각 |
| `freshness[].tier` | number | - | 아니오 | 1=주간, 2=월간, 3=분기 검토 |

### 8.10 `ci-changes` — CI 변경 이력·모니터 알림 (P0)

- 파일: `ci-changes.md`, `ci-changes.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `ci_value_history`, `ci_values`, `ci_items`, `ci_categories`, `ci_layers`, `ci_competitors`, `ci_monitor_alerts`
- 정렬: changedAt 내림차순·id
- `recordCount` 기준: **값 변경 이력 (최신순)** (MD 의 첫 번째 표) 의 행 수
- `history` 는 `changedAt` 내림차순이다. 담당자·검토자 필드는 포함하지 않는다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `history` | object[] | - | 아니오 | 레코드 배열 |
| `history[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `history[].changedAt` | string | ISO 8601 UTC | 아니오 | 변경 시각 |
| `history[].competitor` | string | - | 아니오 | 경쟁 로봇 이름 |
| `history[].layer` | string | - | 아니오 | 레이어 이름 |
| `history[].category` | string | - | 아니오 | 카테고리 이름 |
| `history[].item` | string | - | 아니오 | 항목 이름 |
| `history[].oldValue` | string | - | 예 | 이전 값 (최대 400자) |
| `history[].newValue` | string | - | 아니오 | 이후 값 (최대 400자) |
| `history[].oldConfidence` | string | - | 예 | 이전 신뢰 등급 |
| `history[].newConfidence` | string | - | 아니오 | 이후 신뢰 등급 |
| `history[].changeSource` | string | - | 아니오 | auto \| ai_assist \| manual |
| `history[].changeReason` | string | - | 예 | 변경 사유 (최대 200자) |
| `monitorAlerts` | object[] | - | 아니오 | 레코드 배열 |
| `monitorAlerts[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `monitorAlerts[].detectedAt` | string | ISO 8601 UTC | 아니오 | 감지 시각 |
| `monitorAlerts[].competitor` | string | - | 아니오 | 경쟁 로봇 이름 |
| `monitorAlerts[].layer` | string | - | 아니오 | 레이어 이름 |
| `monitorAlerts[].sourceName` | string | - | 아니오 | 출처 이름 |
| `monitorAlerts[].sourceUrl` | string | - | 아니오 | 출처 https 링크 |
| `monitorAlerts[].headline` | string | - | 아니오 | 알림 제목 |
| `monitorAlerts[].summary` | string | - | 아니오 | 요약 텍스트 (파생 요약, 원문 아님) |
| `monitorAlerts[].status` | string | - | 아니오 | pending \| reviewed \| applied \| dismissed |

### 8.11 `videos` — 영상 (P0)

- 파일: `videos.md`, `videos.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `articles` / 파생: extracted_metadata.aiTags, extracted_metadata.geminiAnalysis, extracted_metadata.domainFocus
- 정렬: publishedAt 내림차순(없으면 뒤)·id
- `recordCount` 기준: **영상 목록 (발행일 최신순)** (MD 의 첫 번째 표) 의 행 수
- `description`·자막·본문은 포함하지 않는다. `views` 는 수집 시점의 값이다.
- `trendingTop` 의 경과 일수는 발행일(KST)과 번들 날짜의 달력 일수 차이이며 같은 번들 날짜의 재생성은 같은 결과를 낸다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].videoId` | string | - | 예 | YouTube 영상 id (11자). videos.json 의 조인 키 |
| `items[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `items[].channel` | string | - | 예 | 채널 이름 |
| `items[].thirdParty` | boolean | - | 예 | 제3자 채널(제조사 공식 채널이 아님) 여부 |
| `items[].publishedAt` | string | ISO 8601 UTC | 예 | 발행 시각 |
| `items[].collectedAt` | string | ISO 8601 UTC | 아니오 | ARGOS 수집 시각 |
| `items[].url` | string | - | 예 | YouTube watch 링크 (youtube.com / youtu.be 의 https 만) |
| `items[].thumbnail` | string | - | 예 | https://i.ytimg.com/ 썸네일 URL 만 |
| `items[].views` | number | 회 | 예 | 조회수 (수집 시점의 값) |
| `items[].domain` | string | - | 예 | 수집 시 부여된 채널 도메인 (hand, actuator, rfm, robot, expo, production 등) |
| `items[].topics` | string[] | - | 아니오 | 주제 검색 수집 태그 목록 |
| `items[].aiTags` | object | - | 예 | AI 태깅 (없으면 null) |
| `items[].aiTags.taskTypes` | string[] | - | 아니오 | 작업 유형 태그 |
| `items[].aiTags.techTags` | string[] | - | 아니오 | 기술 태그 |
| `items[].aiTags.robots` | string[] | - | 아니오 | 등장 로봇 |
| `items[].aiTags.method` | string | - | 아니오 | 태깅 방식 |
| `items[].geminiAnalysis` | object | - | 예 | 영상 내용 상세 분석 (없으면 null) |
| `items[].geminiAnalysis.task` | string | - | 아니오 | 수행 작업 |
| `items[].geminiAnalysis.environment` | string | - | 아니오 | 환경 |
| `items[].geminiAnalysis.autonomy` | string | - | 아니오 | autonomous \| teleoperated \| assisted \| unclear |
| `items[].geminiAnalysis.robotCount` | number | 대 | 아니오 | 등장 로봇 수 |
| `items[].geminiAnalysis.durationSec` | number | 초 | 아니오 | 길이 |
| `items[].geminiAnalysis.capabilities` | string[] | - | 아니오 | 확인된 능력 목록 |
| `items[].geminiAnalysis.keyMoments` | object[] | - | 아니오 | 주요 장면 [{timestampSec, text}] (text 최대 200자) |
| `items[].geminiAnalysis.keyMoments[].timestampSec` | number | 초 | 아니오 | 영상 내 시각 |
| `items[].geminiAnalysis.keyMoments[].text` | string | - | 아니오 | 텍스트 |
| `items[].geminiAnalysis.summaryKo` | string | - | 아니오 | 한글 요약 (AI 생성, 최대 400자) |
| `items[].geminiAnalysis.analyzedAt` | string | ISO 8601 UTC | 아니오 | 분석 시각 |
| `items[].domainFocus` | object | - | 예 | 도메인 관련성 판정 {hand, actuator} 각 {level: primary\|secondary\|none, source: 판정 출처 코드} |
| `items[].domainFocus.hand` | object | - | 예 | {level: primary\|secondary\|none, source: 판정 출처 코드} (판정 없으면 null) |
| `items[].domainFocus.hand.level` | string | - | 아니오 | 단계·층 |
| `items[].domainFocus.hand.source` | string | - | 아니오 | 출처 |
| `items[].domainFocus.actuator` | object | - | 예 | {level: primary\|secondary\|none, source: 판정 출처 코드} (판정 없으면 null) |
| `items[].domainTopics` | object | - | 예 | 서브토픽 분류 {hand, actuator} 각 {topics, primary} |
| `items[].domainTopics.hand` | object | - | 아니오 | {topics[], primary} (분류 없으면 null) |
| `items[].domainTopics.hand.topics` | string[] | - | 아니오 | 서브토픽 목록 |
| `items[].domainTopics.hand.primary` | string | - | 아니오 | 대표 서브토픽 |
| `items[].domainTopics.actuator` | object | - | 예 | {topics[], primary} (분류 없으면 null) |
| `items[].techDomains` | string[] | - | 아니오 | 영상이 속하는 기술 축 (hand, rfm, actuator, expo, production) |
| `items[].domainFocus.actuator.level` | string | - | 아니오 | 단계·층 |
| `items[].domainFocus.actuator.source` | string | - | 아니오 | 출처 |
| `trendingTop` | object[] | - | 아니오 | 최근 7일(KST 달력) 발행·조회수 보유 영상 중 일평균 조회수 상위 10 |
| `trendingTop[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `trendingTop[].videoId` | string | - | 아니오 | YouTube 영상 id (11자) |
| `trendingTop[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `trendingTop[].channel` | string | - | 아니오 | 채널 이름 |
| `trendingTop[].url` | string | - | 아니오 | https 링크 (https 가 아니거나 자격증명이 있으면 null) |
| `trendingTop[].thumbnail` | string | - | 아니오 | https://i.ytimg.com/ 썸네일 URL |
| `trendingTop[].views` | number | 회 | 아니오 | 조회수 (수집 시점의 값) |
| `trendingTop[].growthViewsPerDay` | number | 회/일 | 아니오 | 일평균 조회수 증가 |
| `trendingTop[].publishedAt` | string | ISO 8601 UTC | 아니오 | 발행 시각 |

### 8.12 `papers` — 논문 (P0)

- 파일: `papers.md`, `papers.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `articles` / 파생: extracted_metadata.aiSummaryKo, extracted_metadata.domainFocus
- 정렬: publishedAt 내림차순·id
- `recordCount` 기준: **논문 목록 (발행일 최신순)** (MD 의 첫 번째 표) 의 행 수
- 논문 초록(arXiv `summary`)은 포함하지 않는다. AI 가 만든 한글 요약 `aiSummaryKo` 만 제공한다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].arxivId` | string | - | 아니오 | arXiv id (영역 간 조인 키) |
| `items[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `items[].authors` | string[] | - | 아니오 | 저자 (최대 20명, 각 80자) |
| `items[].publishedAt` | string | ISO 8601 UTC | 아니오 | 발행 시각 |
| `items[].collectedAt` | string | ISO 8601 UTC | 아니오 | ARGOS 수집 시각 |
| `items[].url` | string | - | 예 | arxiv.org 의 https 링크 (그 외 호스트는 null) |
| `items[].aiSummaryKo` | string | - | 예 | 한글 요약 (AI 생성, 최대 400자). 초록 원문은 포함하지 않는다 |
| `items[].domainFocus` | object | - | 예 | 도메인 관련성 판정 (videos 와 같은 형식) |
| `items[].domainFocus.hand` | object | - | 아니오 | {level: primary\|secondary\|none, source: 판정 출처 코드} (판정 없으면 null) |
| `items[].domainFocus.hand.level` | string | - | 아니오 | 단계·층 |
| `items[].domainFocus.hand.source` | string | - | 아니오 | 출처 |
| `items[].domainFocus.actuator` | object | - | 예 | {level: primary\|secondary\|none, source: 판정 출처 코드} (판정 없으면 null) |
| `items[].domainTopics` | object | - | 예 | 서브토픽 분류 (videos 와 같은 형식) |
| `items[].techDomains` | string[] | - | 아니오 | 논문이 속하는 기술 축 (hand, rfm, actuator) |

### 8.13 `news` — 뉴스 (P0)

- 파일: `news.md`, `news.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `articles`, `companies`, `article_robot_tags` / 파생: extracted_metadata.keyPoints, extracted_metadata.marketInsights
- 정렬: publishedAt(없으면 collectedAt) 내림차순·id
- `recordCount` 기준: **뉴스 목록 (발행일 최신순)** (MD 의 첫 번째 표) 의 행 수
- 기사 본문은 포함하지 않는다. `summary` 는 최대 300자의 요약이다. 영상·논문·GitHub·SEC·특허 출처는 제외한다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `items[].source` | string | - | 아니오 | 매체·출처 이름 |
| `items[].url` | string | - | 예 | https 링크 (https 가 아니거나 자격증명이 있으면 null) |
| `items[].publishedAt` | string | ISO 8601 UTC | 예 | 발행 시각 |
| `items[].collectedAt` | string | ISO 8601 UTC | 아니오 | ARGOS 수집 시각 |
| `items[].language` | string | - | 아니오 | 언어 코드 (en, ko 등) |
| `items[].category` | string | - | 아니오 | product \| technology \| industry \| other |
| `items[].productType` | string | - | 아니오 | robot \| rfm \| soc \| actuator \| none |
| `items[].company` | object | - | 예 | 연결된 기업 {id, name} (없으면 null) |
| `items[].company.id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].company.name` | string | - | 아니오 | 이름 |
| `items[].robotIds` | string[] | - | 아니오 | 연결된 로봇 id 목록 (humanoid_robots.id) |
| `items[].summary` | string | - | 예 | 요약 (최대 300자) |
| `items[].keyPoints` | string[] | - | 아니오 | 핵심 포인트 (각 최대 200자) |
| `items[].marketInsights` | string[] | - | 아니오 | 시장 인사이트 (각 최대 200자) |
| `items[].mentionedCompanies` | string[] | - | 아니오 | 언급된 기업 |
| `items[].mentionedRobots` | string[] | - | 아니오 | 언급된 로봇 |
| `items[].technologies` | string[] | - | 아니오 | 언급된 기술 |
| `items[].domainBadge` | string | - | 예 | actuator \| hand \| rfm \| production \| expo 중 처음 맞는 값 (없으면 null) |

### 8.14 `tech-trends` — 기술 트렌드 (P0)

- 파일: `tech-trends.md`, `tech-trends.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `view_cache`, `articles` / 파생: tech-trend-report:*, tech-trend-timeline:v1:*, tech-trend-timeline-insight:v2:*, video-trend-summary:v5, video-trend-summary:v6:*
- 정렬: 고정 순서 hand, rfm, actuator, expo, production
- `recordCount` 기준: **기술 축별 현황** (MD 의 첫 번째 표) 의 행 수
- `status` 가 `unavailable` 인 객체(`insights`·`timeline`·`timelineInsight`·`trendSummary`·`overallVideoTrendSummary`)에는 `status` 외의 필드가 없다.
- 시사점·요약·시계열 해설은 ARGOS 가 이미 생성해 캐시에 저장한 AI 분석물을 읽기 전용으로 내보낸다. 내보내기 중에 새로 생성하지 않으며, 캐시가 없으면 `{status: "unavailable"}` 이다.
- `recordCount` 는 항상 5(기술 축 수)다. `stale` 은 캐시 생성 후 48시간 초과 여부(번들의 `asOf` 기준)다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `domains` | object[] | - | 아니오 | 레코드 배열 |
| `domains[].id` | string | - | 아니오 | hand \| rfm \| actuator \| expo \| production |
| `domains[].label` | string | - | 아니오 | 화면 표시명 |
| `domains[].secondKind` | string | - | 아니오 | 보조 자료 종류: papers(논문) \| news(기사) |
| `domains[].stats` | object | - | 아니오 | 도메인 통계 |
| `domains[].stats.videoCount` | number | 건 | 아니오 | 도메인에 속하는 영상 수 |
| `domains[].stats.secondCount` | number | 건 | 아니오 | 도메인에 속하는 논문 또는 기사 수 |
| `domains[].stats.channelCount` | number | 곳 | 아니오 | 영상 채널 수 |
| `domains[].stats.topKeywords` | object[] | - | 아니오 | 영상 기술 태그 상위 10 [{term, count}] |
| `domains[].stats.topKeywords[].term` | string | - | 아니오 | 기술 태그 |
| `domains[].stats.topKeywords[].count` | number | 건 | 아니오 | 건수 |
| `domains[].insights` | object | - | 아니오 | 시사점 (AI 생성) {status, items[]}. status: ok \| unavailable |
| `domains[].insights.status` | string | - | 아니오 | ok \| unavailable |
| `domains[].insights.items` | object[] | - | 아니오 | 기간(days)별 캐시된 시사점 [{days, cacheVersion, headline, points[], keywords[], model, generatedAt, cachedAt, stale, generatedBy}] (days 오름차순) |
| `domains[].timeline` | object | - | 아니오 | 월별 서브토픽 시계열 {status, cachedAt, sourceGeneratedAt, period, scope, topics, buckets, heatmap, classification} (캐시가 없으면 {status:"unavailable"}) |
| `domains[].timeline.status` | string | - | 아니오 | ok \| unavailable |
| `domains[].timeline.cachedAt` | string | ISO 8601 UTC | 아니오 | 시계열 캐시 저장 시각 |
| `domains[].timeline.sourceGeneratedAt` | string | ISO 8601 UTC | 아니오 | 원본 캐시 본문이 기록한 생성 시각 |
| `domains[].timeline.period` | object | - | 아니오 | 집계 기간 {…} |
| `domains[].timeline.scope` | object | - | 아니오 | 집계 범위 (영상·논문 수 등) |
| `domains[].timeline.topics` | object[] | - | 아니오 | 서브토픽 정의·지표 목록 |
| `domains[].timeline.buckets` | object[] | - | 아니오 | 월별 버킷 [{month, partial, beforeCollection, papers, videos}] |
| `domains[].timeline.heatmap` | object | - | 아니오 | 월 × 서브토픽 히트맵 |
| `domains[].timeline.classification` | object | - | 아니오 | 분류 현황 요약 |
| `domains[].timelineInsight` | object | - | 아니오 | 시계열 해설 (AI 생성) {status, cachedAt, stale, generatedBy, insight} (없으면 {status:"unavailable"}) |
| `domains[].timelineInsight.status` | string | - | 아니오 | ok \| unavailable |
| `domains[].trendSummary` | object | - | 아니오 | 영상 트렌드 요약 {status, headline, points[{title, body}], text, generatedAt, cachedAt, stale, generatedBy} (없으면 {status:"unavailable"}) |
| `domains[].trendSummary.status` | string | - | 아니오 | ok \| unavailable |
| `domains[].trendSummary.headline` | string | - | 예 | 한 줄 요약 |
| `domains[].trendSummary.points` | object[] | - | 아니오 | 포인트 목록 |
| `domains[].trendSummary.text` | string | - | 아니오 | 텍스트 |
| `domains[].trendSummary.generatedAt` | string | ISO 8601 UTC | 아니오 | 생성 시각 |
| `domains[].trendSummary.cachedAt` | string | ISO 8601 UTC | 아니오 | 분석물 캐시 저장 시각 |
| `domains[].trendSummary.stale` | boolean | - | 아니오 | 캐시 생성 후 48시간 초과 여부 (기준 시각 대비) |
| `domains[].trendSummary.generatedBy` | string | - | 아니오 | ai=AI 생성, rule=규칙 기반 템플릿 |
| `overallVideoTrendSummary` | object | - | 아니오 | 전체 영상 트렌드 요약 (trendSummary 와 같은 형식) |
| `overallVideoTrendSummary.status` | string | - | 아니오 | ok \| unavailable |
| `overallVideoTrendSummary.headline` | string | - | 예 | 한 줄 요약 |
| `overallVideoTrendSummary.points` | object[] | - | 아니오 | 포인트 목록 |
| `overallVideoTrendSummary.text` | string | - | 아니오 | 텍스트 |
| `overallVideoTrendSummary.generatedAt` | string | ISO 8601 UTC | 아니오 | 생성 시각 |
| `overallVideoTrendSummary.cachedAt` | string | ISO 8601 UTC | 아니오 | 분석물 캐시 저장 시각 |
| `overallVideoTrendSummary.stale` | boolean | - | 아니오 | 캐시 생성 후 48시간 초과 여부 (기준 시각 대비) |
| `overallVideoTrendSummary.generatedBy` | string | - | 아니오 | ai=AI 생성, rule=규칙 기반 템플릿 |

### 8.15 `weekly-briefs` — 주간 브리프 (P0)

- 파일: `weekly-briefs.md`, `weekly-briefs.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `weekly_briefs`
- 정렬: weekStart 내림차순
- `recordCount` 기준: **주간 브리프 목록 (최신 주 먼저)** (MD 의 첫 번째 표) 의 행 수
- 모든 완료 주(ok/partial)를 최신 주 먼저 담는다. 토큰·비용·오류·통계는 포함하지 않는다. `areaSchemaVersion` 은 payload `schemaVersion` 이다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].weekStart` | string | YYYY-MM-DD | 아니오 | 주 시작일 (KST 월요일) |
| `items[].weekEnd` | string | YYYY-MM-DD | 아니오 | 주 종료일 (KST 일요일) |
| `items[].isoYear` | number | - | 아니오 | ISO 주 연도 |
| `items[].weekNumber` | number | - | 아니오 | ISO 주차 |
| `items[].status` | string | - | 아니오 | ok \| partial |
| `items[].generatedAt` | string | ISO 8601 UTC | 아니오 | 생성 시각 |
| `items[].model` | string | - | 아니오 | 생성 모델 식별자 (DB 값 그대로) |
| `items[].payload` | object | - | 아니오 | 주간 브리프 화면이 쓰는 구조 그대로 (키는 알파벳순). 하위 구조는 아래 표 참조 |
| `items[].payload.articles` | object[] | - | 아니오 | 기사 0~12건 [{id, title, source, publishedAt, url, summaryLine, domain}] |
| `items[].payload.ciChanges` | object[] | - | 아니오 | CI 변경 0~4건 [{id, company, robot, layer, item, before, after, confidence, sourceName, sourceUrl, changedAt}] |
| `items[].payload.ciSummary` | object | - | 아니오 | {updates, companies} |
| `items[].payload.header` | object | - | 아니오 | 주차·기간·집계 {weekStart, weekEnd, isoYear, weekNumber, periodStartAt, periodEndAt, generatedAt, counts{articles, videosNew, videosAnalyzed, papers, ciUpdates, alerts, newRobots?}, deltas{…전주 대비 %, 소수 1자리, 전주 0이면 null}} |
| `items[].payload.keyMessages` | object[] | - | 아니오 | 핵심 메시지 0~3건 [{id, candidateType, kind, headline, bigNumber{value, unit, caption}, delta?, basis, evidence[], note?, generatedBy: ai\|rule}] |
| `items[].payload.keywords` | object[] | - | 아니오 | 키워드 0~8건 [{keywordId, term, count, prevCount, deltaPct, direction: up\|down\|new\|flat}] |
| `items[].payload.meta` | object | - | 아니오 | {aiUsed, ruleBasedMessages, warnings[], truncated} |
| `items[].payload.papers` | object[] | - | 아니오 | 논문 0~8건 [{id, title, authors, publishedAt, url, arxivId, domain, summaryLine}] |
| `items[].payload.schemaVersion` | number | - | 아니오 | 주간 브리프 payload 스키마 버전 (현재 1) — areaSchemaVersion 과 같다 |
| `items[].payload.topVideo` | object | - | 아니오 | 대표 영상 (없으면 null) {id, title, channel, publishedAt, views, url, thumbnail, analyzed, domain, durationSec, analysisLine} |
| `items[].payload.videos` | object[] | - | 아니오 | 영상 0~8건 [{id, title, channel, publishedAt, views, url, thumbnail, analyzed, domain}] |

### 8.16 `keywords` — 키워드 (P1)

- 파일: `keywords.md`, `keywords.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `keywords`, `keyword_stats`
- 정렬: term·language·id
- `recordCount` 기준: **키워드 목록** (MD 의 첫 번째 표) 의 행 수
- 키워드 전체와 기간별 통계 전체를 담는다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].term` | string | - | 아니오 | 키워드·용어 |
| `items[].category` | string | - | 예 | 분류 |
| `items[].language` | string | - | 아니오 | 언어 코드 (en, ko 등) |
| `items[].stats` | object[] | - | 아니오 | 기간별 통계 (periodType 오름차순, periodStart 내림차순) |
| `items[].stats[].periodType` | string | - | 아니오 | week \| month |
| `items[].stats[].periodStart` | string | YYYY-MM-DD | 아니오 | 기간 시작일 |
| `items[].stats[].periodEnd` | string | YYYY-MM-DD | 아니오 | 기간 종료일 |
| `items[].stats[].count` | number | 건 | 아니오 | 기간 내 언급 건수 |
| `items[].stats[].delta` | number | 건 | 아니오 | 직전 기간 대비 증감 |
| `items[].stats[].deltaPercent` | number | % | 아니오 | 직전 기간 대비 증감률 |

### 8.17 `application-cases` — 적용 사례 (P1)

- 파일: `application-cases.md`, `application-cases.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `application_cases`, `humanoid_robots`, `companies`
- 정렬: demoDate 내림차순·id
- `recordCount` 기준: **적용 사례 목록 (시연일 최신순)** (MD 의 첫 번째 표) 의 행 수
- 영상 후보 큐(관리자 검수 대기)는 포함하지 않는다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].robot` | object | - | 아니오 | 로봇 {id, name} |
| `items[].robot.id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].robot.name` | string | - | 아니오 | 이름 |
| `items[].company` | object | - | 아니오 | 기업 {id, name} |
| `items[].company.id` | string | - | 예 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].company.name` | string | - | 예 | 이름 |
| `items[].environmentType` | string | - | 아니오 | factory \| warehouse \| retail \| healthcare \| hospitality \| home \| research_lab \| other |
| `items[].taskType` | string | - | 예 | assembly \| picking \| packing \| inspection \| delivery \| cleaning \| assistance \| other |
| `items[].taskDescription` | string | - | 예 | 작업 설명 (큐레이션, 최대 400자) |
| `items[].deploymentStatus` | string | - | 예 | concept \| pilot \| production |
| `items[].demoEvent` | string | - | 예 | 시연 행사 |
| `items[].demoDate` | string | YYYY-MM-DD | 예 | 시연일 |
| `items[].videoUrl` | string | - | 예 | 영상 https 링크 |
| `items[].notes` | string | - | 예 | 비고 (최대 400자) |
| `matrix` | object[] | - | 아니오 | 레코드 배열 |
| `matrix[].environmentType` | string | - | 아니오 | 환경 유형 |
| `matrix[].taskType` | string | - | 아니오 | 작업 유형 |
| `matrix[].count` | number | 건 | 아니오 | 환경×작업 사례 수 |
| `deploymentDistribution` | object[] | - | 아니오 | 레코드 배열 |
| `deploymentDistribution[].status` | string | - | 아니오 | 도입 단계 (없으면 "unknown") |
| `deploymentDistribution[].count` | number | 건 | 아니오 | 건수 |

### 8.18 `scores` — 역량 점수 (P1)

- 파일: `scores.md`, `scores.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `poc_scores`, `rfm_scores`, `positioning_data`, `score_history`, `humanoid_robots`
- 정렬: 로봇 이름·robotId (이력은 snapshotMonth 내림차순)
- `recordCount` 기준: **산업용 PoC 팩터 점수** (MD 의 첫 번째 표) 의 행 수
- `recordCount` 는 PoC 점수 행 수다 (RFM·포지셔닝·이력은 같은 JSON 의 다른 배열).

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `poc` | object[] | - | 아니오 | 레코드 배열 |
| `poc[].robotId` | string | - | 아니오 | humanoid_robots.id (영역 간 조인 키) |
| `poc[].robot` | string | - | 아니오 | 로봇 |
| `poc[].payload` | number | 점수 1~10 | 아니오 | 페이로드 |
| `poc[].operationTime` | number | 점수 1~10 | 아니오 | 가동 시간 |
| `poc[].fingerDof` | number | 점수 1~10 | 아니오 | 손가락 자유도 |
| `poc[].formFactor` | number | 점수 1~10 | 아니오 | 폼팩터 |
| `poc[].pocDeployment` | number | 점수 1~10 | 아니오 | PoC 배치 |
| `poc[].costEfficiency` | number | 점수 1~10 | 아니오 | 원가 효율 |
| `poc[].evaluatedAt` | string | ISO 8601 UTC | 아니오 | 평가 시각 |
| `rfm` | object[] | - | 아니오 | 레코드 배열 |
| `rfm[].robotId` | string | - | 아니오 | humanoid_robots.id (영역 간 조인 키) |
| `rfm[].robot` | string | - | 아니오 | 로봇 |
| `rfm[].rfmModelName` | string | - | 아니오 | RFM 모델 이름 |
| `rfm[].generality` | number | 점수 1~5 | 아니오 | 범용성 |
| `rfm[].realWorldData` | number | 점수 1~5 | 아니오 | 실세계 데이터 |
| `rfm[].edgeInference` | number | 점수 1~5 | 아니오 | 엣지 추론 |
| `rfm[].multiRobotCollab` | number | 점수 1~5 | 아니오 | 멀티로봇 협업 |
| `rfm[].openSource` | number | 점수 1~5 | 아니오 | 오픈소스 |
| `rfm[].commercialMaturity` | number | 점수 1~5 | 아니오 | 상용 성숙도 |
| `rfm[].evaluatedAt` | string | ISO 8601 UTC | 아니오 | 평가 시각 |
| `positioning` | object[] | - | 아니오 | 레코드 배열 |
| `positioning[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `positioning[].chartType` | string | - | 아니오 | rfm_competitiveness \| poc_positioning \| soc_ecosystem |
| `positioning[].robotId` | string | - | 아니오 | humanoid_robots.id (영역 간 조인 키) |
| `positioning[].robot` | string | - | 아니오 | 로봇 |
| `positioning[].label` | string | - | 아니오 | 표시 이름 |
| `positioning[].x` | number | - | 아니오 | 차트 X 값 (차트별 의미) |
| `positioning[].y` | number | - | 아니오 | 차트 Y 값 |
| `positioning[].bubbleSize` | number | - | 아니오 | 버블 크기 |
| `positioning[].colorGroup` | string | - | 아니오 | 색 그룹 |
| `history` | object[] | - | 아니오 | 레코드 배열 |
| `history[].robotId` | string | - | 아니오 | humanoid_robots.id (영역 간 조인 키) |
| `history[].robot` | string | - | 아니오 | 로봇 |
| `history[].snapshotMonth` | string | YYYY-MM | 아니오 | 스냅샷 월 |
| `history[].combinedScore` | number | 점 | 아니오 | 종합 점수 |

### 8.19 `vision-cost` — 비전 센서 원가 (P1)

- 파일: `vision-cost.md`, `vision-cost.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `vision_sensor_bom_parts`, `vision_sensor_robot_costs`
- 정렬: partType·partName / releaseYear·robotLabel
- `recordCount` 기준: **BOM 부품 단가** (MD 의 첫 번째 표) 의 행 수
- `recordCount` 는 BOM 부품 단가 행 수다. 모든 금액은 USD.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `bomParts` | object[] | - | 아니오 | 레코드 배열 |
| `bomParts[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `bomParts[].partName` | string | - | 아니오 | 부품 이름 |
| `bomParts[].partType` | string | - | 아니오 | camera \| lidar \| depth \| compute |
| `bomParts[].unitPriceMin` | number | USD | 아니오 | 최소 단가 |
| `bomParts[].unitPriceMax` | number | USD | 아니오 | 최대 단가 |
| `bomParts[].unitPriceMid` | number | USD | 아니오 | 중간 단가 |
| `bomParts[].priceUnit` | string | - | 아니오 | ea \| pair \| set (단가의 단위) |
| `bomParts[].sourceReliability` | string | - | 아니오 | 출처 신뢰 등급 (A~E) |
| `bomParts[].exampleRobot` | string | - | 아니오 | 대표 사례 로봇 |
| `robotCosts` | object[] | - | 아니오 | 레코드 배열 |
| `robotCosts[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `robotCosts[].robotLabel` | string | - | 아니오 | 표시 이름 |
| `robotCosts[].company` | string | - | 아니오 | 기업 이름 |
| `robotCosts[].releaseYear` | number | 연도(서기) | 아니오 | 출시(추정) 연도 |
| `robotCosts[].isForecast` | boolean | - | 아니오 | true=전망, false=실적 |
| `robotCosts[].cameraCostUsd` | number | USD | 아니오 | 카메라 원가 |
| `robotCosts[].lidarDepthCostUsd` | number | USD | 아니오 | LiDAR·Depth 원가 |
| `robotCosts[].computeCostUsd` | number | USD | 아니오 | 컴퓨트 원가 |
| `robotCosts[].totalCostUsd` | number | USD | 아니오 | 합계 원가 |
| `robotCosts[].performanceLevel` | number | P1~P5 (소수 허용) | 아니오 | 성능 수준 |
| `robotCosts[].reliabilityGrade` | string | - | 아니오 | 신뢰 등급 (A~E) |

### 8.20 `products` — 제품 (P1)

- 파일: `products.md`, `products.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `products`, `product_specs`, `companies`
- 정렬: 기업 이름·제품 이름·id
- `recordCount` 기준: **제품 목록** (MD 의 첫 번째 표) 의 행 수

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].company` | object | - | 아니오 | 기업 {id, name} |
| `items[].company.id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].company.name` | string | - | 아니오 | 이름 |
| `items[].name` | string | - | 아니오 | 이름 |
| `items[].series` | string | - | 아니오 | 시리즈 |
| `items[].type` | string | - | 아니오 | humanoid \| service \| logistics \| home \| soc \| actuator 등 |
| `items[].releaseDate` | string | YYYY-MM-DD | 예 | 출시일 |
| `items[].targetMarket` | string | - | 아니오 | 타깃 시장 |
| `items[].status` | string | - | 아니오 | announced \| available \| discontinued |
| `items[].spec` | object | - | 예 | 제품 스펙 (없으면 null) |
| `items[].spec.dof` | number | DoF | 예 | 자유도 |
| `items[].spec.payloadKg` | number | kg | 예 | 페이로드 |
| `items[].spec.speedMps` | number | m/s | 예 | 속도 |
| `items[].spec.batteryMinutes` | number | 분 | 예 | 배터리 시간 |
| `items[].spec.priceMin` | number | priceCurrency | 예 | 최저 가격 |
| `items[].spec.priceMax` | number | priceCurrency | 예 | 최고 가격 |
| `items[].spec.priceCurrency` | string | - | 아니오 | 통화 코드 (기본 USD) |
| `items[].spec.arms` | number | 개 | 예 | 팔 개수 |
| `items[].spec.hands` | string | - | 예 | none \| gripper \| 3finger \| 4finger \| 5finger |
| `items[].spec.mobility` | string | - | 예 | fixed \| wheel \| track \| quadruped \| biped |
| `items[].spec.heightCm` | number | cm | 예 | 키 |
| `items[].spec.dynamicSpecs` | object | - | 아니오 | 제품 유형별 동적 스펙 (SoC: tops=TOPS, npuTops=TOPS, tdpWatts=W; 액추에이터: torqueNm=Nm, rpmMax=rpm) |

### 8.21 `competitive-alerts` — 경쟁 알림 (P1)

- 파일: `competitive-alerts.md`, `competitive-alerts.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `competitive_alerts`, `humanoid_robots`
- 정렬: createdAt 내림차순·id
- `recordCount` 기준: **경쟁 알림 (최신순)** (MD 의 첫 번째 표) 의 행 수
- 읽음 여부·읽은 사용자는 사용자별 상태라 포함하지 않는다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].type` | string | - | 아니오 | score_spike \| mass_production \| funding \| partnership |
| `items[].severity` | string | - | 아니오 | 심각도 (info\|warning\|critical) |
| `items[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `items[].summary` | string | - | 아니오 | 요약 텍스트 (파생 요약, 원문 아님) |
| `items[].robot` | object | - | 아니오 | 관련 로봇 {id, name} (없으면 null) |
| `items[].robot.id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].robot.name` | string | - | 아니오 | 이름 |
| `items[].triggerData` | object | - | 아니오 | 알림 발생 근거 데이터 (구조는 type 마다 다르다) |
| `items[].createdAt` | string | ISO 8601 UTC | 아니오 | 생성 시각 |

### 8.22 `aggregations` — 집계 지표 (P1)

- 파일: `aggregations.md`, `aggregations.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `application_cases`, `humanoid_robots`, `components`, `robot_components`, `keywords`, `keyword_stats`, `article_keywords`
- 정렬: segments: caseCount 내림차순 / yearly: 연도 오름차순 / components: adoptionCount 내림차순 / keywords: articleCount 내림차순
- `recordCount` 기준: **모든 표(세그먼트·연도별·부품·키워드)의 행 수 합** (이 영역만 첫 번째 표가 아니라 MD 의 모든 표 행 수의 합이다)
- 대시보드 "전략 카드"(실시간 AI 생성)는 내보낼 수 없어 같은 원천의 결정론적 수치 집계로 대체한 영역이다. `recordCount` 는 세그먼트·연도별·부품·키워드 행 수의 합이므로, 세그먼트가 0건이어도 다른 표에 행이 있으면 `status: "ok"` 다 (`empty` 는 모든 표가 비었을 때만).

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `segments` | object[] | - | 아니오 | 레코드 배열 |
| `segments[].environment` | string | - | 아니오 | 환경 (없으면 "unknown") |
| `segments[].task` | string | - | 아니오 | 작업 (없으면 "unknown") |
| `segments[].locomotion` | string | - | 아니오 | 이동 방식 (없으면 "unknown") |
| `segments[].robotCount` | number | 대 | 아니오 | 로봇 수 |
| `segments[].caseCount` | number | 건 | 아니오 | 사례 수 |
| `yearly` | object[] | - | 아니오 | 레코드 배열 |
| `yearly[].year` | number | 연도(서기) | 아니오 | 연도 |
| `yearly[].launches` | number | 대 | 아니오 | 발표 로봇 수 |
| `yearly[].applications` | number | 건 | 아니오 | 적용 사례 수 |
| `components` | object[] | - | 아니오 | 레코드 배열 |
| `components[].componentId` | string | - | 아니오 | components.id |
| `components[].componentName` | string | - | 아니오 | 부품 이름 |
| `components[].componentType` | string | - | 아니오 | 부품 유형 |
| `components[].adoptionCount` | number | 대 | 아니오 | 채택 로봇 수 |
| `components[].avgPerformance` | object | - | 아니오 | 성능 수치 {torqueNm(Nm), topsMin(TOPS), topsMax(TOPS)} 중 있는 키 |
| `components[].avgPerformance.torqueNm` | number | Nm | 아니오 | 토크 |
| `keywords` | object[] | - | 아니오 | 키워드 목록 |
| `keywords[].keywordId` | string | - | 아니오 | keywords.id |
| `keywords[].term` | string | - | 아니오 | 키워드·용어 |
| `keywords[].articleCount` | number | 건 | 아니오 | 키워드 통계 합 + 기사 연결 수 (언급 건수 상위 500) |
| `components[].avgPerformance.topsMin` | number | TOPS | 아니오 | 연산 성능 하한 |
| `components[].avgPerformance.topsMax` | number | TOPS | 아니오 | 연산 성능 상한 |

### 8.23 `strategy-warroom` — 전략 워룸 (P2)

- 파일: `strategy-warroom.md`, `strategy-warroom.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `partners`, `partner_evaluations`, `application_domains`, `domain_robot_fit`, `strategic_goals`, `strategic_briefings`, `humanoid_robots`
- 정렬: 파트너·분야: 이름·id / 목표: deadline / 브리핑: createdAt 내림차순
- `recordCount` 기준: **파트너** (MD 의 첫 번째 표) 의 행 수
- LG 내부 평가·전략 성격의 데이터를 포함한다 (PM 결정). 평가자·작성자 식별 정보, AI 비용, 로고 URL 은 제외한다. `recordCount` 는 파트너 수다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `partners` | object[] | - | 아니오 | 레코드 배열 |
| `partners[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `partners[].name` | string | - | 아니오 | 이름 |
| `partners[].category` | string | - | 아니오 | component \| rfm \| data \| platform \| integration |
| `partners[].subCategory` | string | - | 예 | vision_sensor \| battery \| ai_chip \| actuator \| motor \| reducer \| force_sensor 등 |
| `partners[].country` | string | - | 아니오 | 국가 (원본 표기) |
| `partners[].description` | string | - | 아니오 | 큐레이션 설명 (최대 400자) |
| `partners[].websiteUrl` | string | - | 예 | 웹사이트 https 링크 |
| `partners[].techCapability` | number | 점수 1~10 | 아니오 | 기술 역량 |
| `partners[].lgCompatibility` | number | 점수 1~10 | 아니오 | LG 적합도 |
| `partners[].marketShare` | number | 비율 0~1 | 아니오 | 시장 점유율 |
| `partners[].evaluations` | object[] | - | 아니오 | 파트너 평가 (평가자 식별 정보 제외) |
| `partners[].evaluations[].techScore` | number | 점수 1~10 | 아니오 | 기술 |
| `partners[].evaluations[].qualityScore` | number | 점수 1~10 | 아니오 | 품질 |
| `partners[].evaluations[].costScore` | number | 점수 1~10 | 아니오 | 비용 |
| `partners[].evaluations[].deliveryScore` | number | 점수 1~10 | 아니오 | 납기 |
| `partners[].evaluations[].supportScore` | number | 점수 1~10 | 아니오 | 지원 |
| `partners[].evaluations[].overallScore` | number | 점수 1~10 | 아니오 | 평균 |
| `partners[].evaluations[].comments` | string | - | 아니오 | 평가 의견 (최대 400자) |
| `partners[].evaluations[].evaluatedAt` | string | ISO 8601 UTC | 아니오 | 평가 시각 |
| `applicationDomains` | object[] | - | 아니오 | 레코드 배열 |
| `applicationDomains[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `applicationDomains[].name` | string | - | 아니오 | 이름 |
| `applicationDomains[].marketSizeBillionUsd` | number | 십억 USD | 아니오 | 시장 규모 |
| `applicationDomains[].cagrPercent` | number | % | 아니오 | 연평균 성장률 |
| `applicationDomains[].somBillionUsd` | number | 십억 USD | 아니오 | 확보 가능 시장 |
| `applicationDomains[].keyTasks` | string[] | - | 아니오 | 핵심 작업 목록 |
| `applicationDomains[].entryBarriers` | string[] | - | 아니오 | 진입 장벽 목록 |
| `applicationDomains[].lgExistingBusiness` | number | 비율 0~1 | 아니오 | LG 기존 사업 비중 |
| `applicationDomains[].lgReadiness` | number | 비율 0~1 | 예 | LG 준비도 |
| `applicationDomains[].description` | string | - | 아니오 | 큐레이션 설명 (최대 400자) |
| `domainRobotFit` | object[] | - | 아니오 | 레코드 배열 |
| `domainRobotFit[].domainId` | string | - | 아니오 | applicationDomains[].id |
| `domainRobotFit[].robotId` | string | - | 아니오 | humanoid_robots.id (영역 간 조인 키) |
| `domainRobotFit[].robot` | string | - | 아니오 | 로봇 |
| `domainRobotFit[].fitScore` | number | 비율 0~1 | 아니오 | 적합도 |
| `domainRobotFit[].fitDetails` | object | - | 아니오 | 적합도 계산 상세 (구조 가변) |
| `domainRobotFit[].calculatedAt` | string | ISO 8601 UTC | 아니오 | 계산 시각 |
| `strategicGoals` | object[] | - | 아니오 | 레코드 배열 |
| `strategicGoals[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `strategicGoals[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `strategicGoals[].description` | string | - | 아니오 | 큐레이션 설명 (최대 400자) |
| `strategicGoals[].metricType` | string | - | 아니오 | poc_rank \| rfm_rank \| combined_rank \| partner_count \| domain_coverage \| custom |
| `strategicGoals[].targetValue` | number | 지표 단위 | 아니오 | 목표 값 |
| `strategicGoals[].currentValue` | number | 지표 단위 | 아니오 | 현재 값 |
| `strategicGoals[].deadline` | string | YYYY-MM-DD | 아니오 | 기한 |
| `strategicGoals[].status` | string | - | 아니오 | achieved \| on_track \| at_risk \| behind |
| `strategicGoals[].requiredActions` | string[] | - | 아니오 | 필요 조치 목록 |
| `strategicBriefings` | object[] | - | 아니오 | 레코드 배열 |
| `strategicBriefings[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `strategicBriefings[].lgRobotId` | string | - | 아니오 | humanoid_robots.id |
| `strategicBriefings[].robot` | string | - | 아니오 | 로봇 |
| `strategicBriefings[].triggerType` | string | - | 아니오 | manual \| scheduled |
| `strategicBriefings[].aiModel` | string | - | 아니오 | 브리핑 생성 모델 식별자 (DB 값 그대로) |
| `strategicBriefings[].createdAt` | string | ISO 8601 UTC | 아니오 | 생성 시각 |
| `strategicBriefings[].briefingData` | object | - | 아니오 | AI 브리핑 본문 (구조 가변, 문자열 각 최대 500자) |

### 8.24 `lg-humanoid-models` — LG 휴머노이드 모델·EE 요구사항 (P2)

- 파일: `lg-humanoid-models.md`, `lg-humanoid-models.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `humanoid_models`, `ee_categories`, `cell_ee_requirements`
- 정렬: 모델명 / eeCategories: displayOrder / cellRequirements: taskIdx·industryIdx·lv
- `recordCount` 기준: **LG 휴머노이드 모델** (MD 의 첫 번째 표) 의 행 수
- `recordCount` 는 모델 수다. 작성자 정보는 제외한다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `models` | object[] | - | 아니오 | 레코드 배열 |
| `models[].id` | number | 정수 | 아니오 | 모델 id (serial) |
| `models[].modelName` | string | - | 아니오 | 모델명 |
| `models[].codeName` | string | - | 아니오 | 코드명 |
| `models[].formFactor` | string | - | 아니오 | 폼팩터 |
| `models[].isPotential` | boolean | - | 아니오 | 잠재(미확정) 모델 여부 |
| `models[].releasePhase` | string | - | 아니오 | 출시 단계 |
| `models[].releaseTargetDate` | string | YYYY-MM-DD | 아니오 | 출시 목표일 |
| `models[].basicInfo` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].physical` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].locomotion` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].manipulation` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].perception` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].aiCompute` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].safety` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].commercial` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].eeOptions` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].customFields` | object | - | 아니오 | 탭별 스펙 JSON (구조 가변, 문자열 각 최대 300자) |
| `models[].notes` | string | - | 아니오 | 비고 (최대 400자) |
| `models[].updatedAt` | string | ISO 8601 UTC | 아니오 | 갱신 시각 |
| `eeCategories` | object[] | - | 아니오 | 레코드 배열 |
| `eeCategories[].code` | string | - | 아니오 | EE 카테고리 코드 (models[].eeOptions 의 키) |
| `eeCategories[].nameKo` | string | - | 아니오 | 한글 이름 |
| `eeCategories[].description` | string | - | 아니오 | 큐레이션 설명 (최대 400자) |
| `eeCategories[].benchmarkExamples` | string | - | 아니오 | 벤치마크 예시 |
| `eeCategories[].displayOrder` | number | 정수 | 아니오 | 표시 순서 |
| `cellRequirements` | object[] | - | 아니오 | 레코드 배열 |
| `cellRequirements[].taskIdx` | number | 정수 | 아니오 | 작업 인덱스 |
| `cellRequirements[].industryIdx` | number | 정수 | 아니오 | 산업 인덱스 |
| `cellRequirements[].lv` | number | 정수 | 아니오 | 레벨 |
| `cellRequirements[].tier1Codes` | string[] | - | 아니오 | 1순위 EE 코드 |
| `cellRequirements[].tier2Codes` | array | - | 아니오 | 2순위 EE 코드 |
| `cellRequirements[].tier3Codes` | array | - | 아니오 | 3순위 EE 코드 |
| `cellRequirements[].rationale` | string | - | 아니오 | 근거 문구 (최대 400자) |
| `cellRequirements[].benchmarkEe` | string | - | 아니오 | 벤치마크 EE |

### 8.25 `coverage-field-events` — 커버리지 현장 이벤트 (P2)

- 파일: `coverage-field-events.md`, `coverage-field-events.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `coverage_field_events`
- 정렬: eventDate 내림차순·id
- `recordCount` 기준: **현장 이벤트 (일자 최신순)** (MD 의 첫 번째 표) 의 행 수
- 서브셀의 현재 상태는 서브셀별 가장 최근 이벤트의 상태다. 작성자 정보는 제외한다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | number | 정수 | 아니오 | 이벤트 id (serial) |
| `items[].subcellKey` | string | - | 아니오 | 서브셀 키 ({cellId}-lv{lv}) |
| `items[].cellId` | string | - | 아니오 | 셀 id |
| `items[].lv` | number | 정수 | 아니오 | 레벨 |
| `items[].eventDate` | string | YYYY-MM-DD | 아니오 | 이벤트 일자 |
| `items[].kind` | string | - | 아니오 | visit \| poc-planned \| poc-active \| poc-milestone \| deployed \| note |
| `items[].status` | string | - | 아니오 | observed \| poc-planned \| poc-active \| deployed (이벤트 이후의 서브셀 상태) |
| `items[].site` | string | - | 아니오 | 현장 |
| `items[].source` | string | - | 아니오 | 출처 |
| `items[].note` | string | - | 아니오 | 메모 (최대 400자) |
| `items[].nextStep` | string | - | 예 | 다음 단계 (최대 400자) |
| `items[].priorityRank` | number | ★1~4 | 예 | 우선순위 (작을수록 우선) |
| `items[].createdAt` | string | ISO 8601 UTC | 아니오 | 생성 시각 |
| `items[].updatedAt` | string | ISO 8601 UTC | 아니오 | 갱신 시각 |

### 8.26 `regulations` — 규제·컴플라이언스 (P2)

- 파일: `regulations.md`, `regulations.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `regulations`, `regulatory_updates`, `compliance_checklist`
- 정렬: 지역·제목·id
- `recordCount` 기준: **규제** (MD 의 첫 번째 표) 의 행 수
- 규제 원문(`original_text`)·업로드 문서·체크리스트 담당자·증빙 파일·읽음 상태는 제외한다. `recordCount` 는 규제 수다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `regulations` | object[] | - | 아니오 | 레코드 배열 |
| `regulations[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `regulations[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `regulations[].titleKo` | null | - | 예 | 한글 이름 |
| `regulations[].category` | string | - | 아니오 | policy \| safety \| legal \| privacy |
| `regulations[].region` | string | - | 아니오 | korea \| us \| eu \| china \| international |
| `regulations[].jurisdiction` | null | - | 예 | 관할 (예: California, MIIT) |
| `regulations[].status` | string | - | 아니오 | active \| proposed \| draft \| repealed |
| `regulations[].effectiveDate` | string | YYYY-MM-DD | 예 | 시행일 |
| `regulations[].lastAmendedDate` | null | YYYY-MM-DD | 예 | 최종 개정일 |
| `regulations[].summary` | string | - | 아니오 | 요약 (AI 생성, 최대 400자). 규제 원문은 포함하지 않는다 |
| `regulations[].summaryKo` | string | - | 예 | 한글 요약 (최대 400자) |
| `regulations[].lgImpact` | string | - | 아니오 | critical \| high \| medium \| low \| none (AI 분석) |
| `regulations[].lgImpactAnalysis` | string | - | 예 | LG 영향 분석 (AI 생성, 최대 400자) |
| `regulations[].sourceUrl` | string | - | 아니오 | 출처 https 링크 |
| `regulations[].sourceName` | string | - | 예 | 출처 이름 |
| `regulations[].tags` | string[] | - | 아니오 | 태그 목록 |
| `updates` | object[] | - | 아니오 | 레코드 배열 |
| `updates[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `updates[].regulationId` | string | - | 예 | regulations[].id |
| `updates[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `updates[].titleKo` | null | - | 예 | 한글 이름 |
| `updates[].updateType` | string | - | 아니오 | new_regulation \| amendment \| enforcement \| proposal \| repeal \| guidance |
| `updates[].category` | string | - | 아니오 | 분류 |
| `updates[].region` | string | - | 아니오 | 지역 |
| `updates[].summary` | string | - | 아니오 | 요약 텍스트 (파생 요약, 원문 아님) |
| `updates[].summaryKo` | null | - | 예 | 한글 요약 (최대 400자) |
| `updates[].lgImpact` | string | - | 아니오 | critical \| high \| medium \| low \| none |
| `updates[].lgActionRequired` | string | - | 예 | 필요 조치 (최대 400자) |
| `updates[].sourceUrl` | null | - | 예 | 출처 https 링크 |
| `updates[].sourceName` | string | - | 예 | 출처 이름 |
| `updates[].publishedAt` | string | ISO 8601 UTC | 아니오 | 발행 시각 |
| `updates[].detectedAt` | string | ISO 8601 UTC | 아니오 | 감지 시각 |
| `checklist` | object[] | - | 아니오 | 레코드 배열 |
| `checklist[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `checklist[].regulationId` | string | - | 예 | regulations[].id |
| `checklist[].parentId` | null | - | 예 | 상위 항목 id |
| `checklist[].category` | string | - | 아니오 | 분류 |
| `checklist[].region` | string | - | 아니오 | 지역 |
| `checklist[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `checklist[].description` | string | - | 예 | 큐레이션 설명 (최대 400자) |
| `checklist[].priority` | string | - | 아니오 | critical \| high \| medium \| low |
| `checklist[].status` | string | - | 아니오 | not_started \| in_progress \| completed \| blocked \| na |
| `checklist[].dueDate` | string | YYYY-MM-DD | 예 | 기한 |
| `checklist[].progressPct` | number | % | 아니오 | 진행률 |
| `checklist[].notes` | string | - | 예 | 비고 (최대 400자) |
| `checklist[].industrialRegComparison` | string | - | 예 | 기존 산업용 규제와의 차이 (최대 400자) |
| `checklist[].industrialRegWhyDifferent` | string | - | 예 | 차이의 이유 (최대 400자) |
| `checklist[].industrialRegApproach` | string | - | 예 | 접근 방법 (최대 400자) |
| `checklist[].sortOrder` | number | - | 아니오 | 표시 순서 |

### 8.27 `event-briefs` — 이벤트 분석물 (P2)

- 파일: `event-briefs.md`, `event-briefs.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `view_cache` / 파생: event-trend-*, event-tech-insight-*, event-ces-insight-*
- 정렬: key 오름차순
- `recordCount` 기준: **이벤트 분석물** (MD 의 첫 번째 표) 의 행 수
- 행사별 AI 분석물 캐시를 읽기 전용으로 그대로 내보낸다. `recordCount` 는 분석물 수다.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].key` | string | - | 아니오 | 캐시 키 (event-trend-*, event-tech-insight-*, event-ces-insight-*) |
| `items[].kind` | string | - | 아니오 | trend \| tech-insight \| ces-insight |
| `items[].cachedAt` | string | ISO 8601 UTC | 아니오 | 분석물 캐시 저장 시각 |
| `items[].stale` | boolean | - | 아니오 | 캐시 생성 후 48시간 초과 여부 (기준 시각 대비) |
| `items[].data` | object | - | 아니오 | AI 분석물 본문 (구조는 kind·행사마다 다르다, 키 알파벳순, 문자열 각 최대 400자) |

### 8.28 `external-sources` — 외부 출처(GitHub·SEC·특허) (P2)

- 파일: `external-sources.md`, `external-sources.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `articles`
- 정렬: publishedAt 내림차순·id
- `recordCount` 기준: **외부 출처 목록 (발행일 최신순)** (MD 의 첫 번째 표) 의 행 수
- 메타데이터와 링크만 담는다 (본문·요약 없음).

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | UUID 문자열 (날짜 간 안정적, 원본이 삭제되면 사라질 수 있다) |
| `items[].title` | string | - | 아니오 | 제목 (HTML 태그 제거, 최대 500자) |
| `items[].source` | string | - | 아니오 | github \| sec_edgar \| patent |
| `items[].url` | string | - | 아니오 | https 링크 (https 가 아니거나 자격증명이 있으면 null) |
| `items[].publishedAt` | string | ISO 8601 UTC | 아니오 | 발행 시각 |
| `items[].collectedAt` | string | ISO 8601 UTC | 아니오 | ARGOS 수집 시각 |
| `items[].language` | string | - | 아니오 | 언어 코드 (en, ko 등) |
| `items[].category` | string | - | 아니오 | 분류 |
| `items[].company` | null | - | 예 | 연결된 기업 {id, name} (없으면 null) |

### 8.29 `data-quality` — 데이터 품질 (P2)

- 파일: `data-quality.md`, `data-quality.json`
- `areaSchemaVersion`: 1
- 출처 테이블: `data_audit_reports`
- 정렬: (1건)
- `recordCount` 기준: **최신 데이터 감사 요약** (MD 의 첫 번째 표) 의 행 수
- 최신 감사 리포트 1건의 요약 수치만 담는다 (리포트 본문 제외). 감사 기록이 없으면 `recordCount` 0.

`data` 의 필드 (경로는 `data` 기준, `[]` 는 배열 원소):

| 필드 | 타입 | 단위 | null 가능 | 설명 |
|---|---|---|---|---|
| `items` | object[] | - | 아니오 | 레코드 배열 |
| `items[].id` | string | - | 아니오 | 감사 리포트 id |
| `items[].auditedAt` | string | ISO 8601 UTC | 아니오 | 감사 실행 시각 |
| `items[].totalRobots` | number | 대 | 아니오 | 대상 로봇 수 |
| `items[].averageCompleteness` | number | % | 아니오 | 평균 완성도 |
| `items[].criticalCount` | number | 건 | 아니오 | 치명 이슈 수 |
| `items[].warningCount` | number | 건 | 아니오 | 경고 이슈 수 |


---

## 9. 수집기 구현 가이드

### 9.1 권장 흐름

```
1) GET /api/argos-i/manifest                      (If-None-Match 사용 가능)
2) latest == null            → "번들 없음" 으로 보고 정해진 시각에 재시도 (10절)
3) 로컬 <out>/<latest.date>/.complete 의 bundleSha256 == latest.bundleSha256
                             → "up to date", 종료
4) GET {latest.manifestUrl} → bundleSha256 검증 → files[] 파싱
5) 임시 디렉터리에 files[] 를 하나씩 받아 byteSize·sha256 검증
6) 모두 통과하면 <out>/<date> 로 원자적 교체(rename) → .complete 기록 → LATEST 갱신
```

`.complete` 에는 최소한 `bundleSha256` 을 저장한다. 검증이 끝나기 전에는 기존 사본을 건드리지 않는다.

### 9.2 당일 재생성 감지

같은 날짜에서 `bundleSha256` 이 바뀌면(수동 재생성, 월요일 주간 브리프 반영 재생성 등) **다시 내려받는다.** "오늘 날짜 폴더가 이미 있다" 는 이유로 건너뛰지 않는다.

### 9.3 누락일 보충

`bundles[]` 에 있는데 로컬에 없는(또는 `bundleSha256` 이 다른) 날짜를 오래된 순으로 받아 채운다. 보존 기간(기본 30일) 밖의 날짜는 받을 수 없으므로, 장기 이력이 필요하면 수신 측이 보관한다.

### 9.4 단일 파일 vs ZIP

| 상황 | 권장 |
|---|---|
| 일일 정기 pull, 전체를 받는다 | **ZIP** (`latest.zip` 한 번, 텍스트라 크게 압축된다) |
| 일부 영역만 필요하거나 변경된 파일만 갱신 | **단일 파일** (`files[].sha256` 이 로컬과 같은 파일은 건너뛴다. ETag/`If-None-Match` 도 가능) |
| 서버/프록시 제한으로 큰 응답이 어렵다 | 단일 파일 |

ZIP 은 내용 동일성을 `files[].sha256` 으로 검증한다 (ZIP 바이트 자체는 비결정적이다). `latest.zip` 을 받는 사이에 새 번들이 나올 수 있으므로, ZIP 안의 날짜 폴더(또는 `X-Argos-I-Export-Date`)를 기준으로 저장한다.

### 9.5 처리 시 주의

- **알 수 없는 필드·영역은 무시한다.** 필드 추가는 버전을 올리지 않는다 (11절).
- `status: "partial"` 번들에서는 `areas[].status == "failed"` 인 영역 파일이 없다. 그 영역은 이전 번들의 값을 쓰거나 비어 있는 것으로 처리한다.
- `recordCount: 0`/`status: "empty"` 는 정상이다 (파일은 있다).
- 시사점·요약 같은 AI 분석물은 `status: "unavailable"` 일 수 있다. `stale: true` 는 캐시 생성 후 48시간이 지난 값이다.
- URL 은 상대 경로(`manifestUrl`, `zipUrl`)와 절대 https 링크(데이터 안의 링크)를 구분한다. 데이터 안의 링크는 원문 접근용이며 ARGOS API 와 무관하다.

---

## 10. 재시도·오류 처리

| 상황 | 대응 |
|---|---|
| 429, 5xx, 네트워크 오류, 시간 초과 | **지수 백오프**: 2초, 4초, 8초, 16초 후 재시도, 최대 5회(총 5번 시도). `Retry-After` 헤더가 있으면 그 값을 따른다 |
| 401, 503 `argos_i_export_disabled` | **재시도하지 않고 즉시 알림.** 토큰 오류·비활성은 재시도로 해결되지 않는다 (인증 실패를 반복하면 429 로 막힌다) |
| 503 `busy` | `Retry-After` (5초) 후 재시도 |
| 404 `no_bundle` / `latest: null` | 번들이 아직 없다. **08:00 KST 부터 10분 간격으로 11:00 KST 까지** 재시도하고, 끝까지 없으면 알림 |
| 404 `not_found` (날짜·파일) | 보존 기간 밖이거나 없는 번들이다. `bundles[]` 에 있는 날짜만 요청한다 |
| 체크섬 불일치 | 그 파일을 **1회 재다운로드**하고, 그래도 다르면 실패로 알린다 (로컬 사본은 건드리지 않는다) |
| 304 | 정상 (최신). 본문이 없다 |

수집기가 비정상 종료하더라도 임시 디렉터리만 지우면 되도록, 항상 **임시 → 검증 → 원자적 교체** 순서를 지킨다.

---

## 11. 스키마 버전 정책

- **추가는 버전을 올리지 않는다**: 새 필드, 새 영역, 새 열거값은 `schemaVersion` 을 바꾸지 않는다. 수신 측은 **모르는 필드·영역을 무시**해야 한다.
- **파괴적 변경은 메이저를 올린다**: 필드 이름 변경·삭제, 타입 변경, 단위 변경, 의미 변경은 `schemaVersion` 메이저를 올리고, 이 문서의 변경 이력에 **적용일 14일 전에** 사전 공지한다.
- 수신 측은 **지원하지 않는 메이저**(`schemaVersion` 이 자신이 아는 값이 아님)를 받으면 **파싱을 중단하고 알린다.** 이전 사본을 그대로 유지한다.
- `areaSchemaVersion` 은 영역 하나의 내부 변경을 알린다. 영역별 값이 올라가면 해당 영역만 영향이 있다는 뜻이다 (예: `actuator-map` 은 맵 응답 스키마 버전 `ACTUATOR_MAP_SCHEMA_VERSION` 을 그대로 쓴다).
- 전환 기간에는 메이저가 다른 두 번들 형식을 동시에 제공하지 않는다. 공지된 적용일에 한 번에 바뀐다.

---

## 12. 데이터 이용 한도

- **원문 비포함**: 기사 본문, 논문 초록, 영상 설명·자막, 규제 원문은 포함하지 않는다. 원문이 필요하면 데이터 안의 **링크로 원문 출처에 접근**한다.
- 제공하는 것은 공개 메타데이터, 링크, 그리고 ARGOS 가 만든 파생물(규칙 집계, AI 가 생성한 요약·시사점·판정)이다. AI 생성물에는 `generatedBy`, 모델 식별자(`model`)를 표기하고 토큰·비용은 제외한다.
- **재배포 금지**: 사내 분석·검색·요약 용도로만 쓰고, 사외로 재배포하거나 공개하지 않는다.
- **썸네일**은 YouTube 썸네일 URL(`https://i.ytimg.com/...`)만 제공한다. 이미지·로고 파일/URL 은 포함하지 않는다.
- 개인 식별 정보, 사용자별 상태, 내부 운영 정보(토큰·비용·로그)는 포함하지 않는다.
- 일부 영역(`strategy-warroom`, `lg-humanoid-models`, `coverage-field-events`, `regulations`)은 LG 내부 평가·전략 성격의 데이터를 포함하므로 접근 권한을 제한해서 다룬다.
- 위 원칙(원문 비포함)은 일일 번들에 대한 것이다. 초기 적재용 전체 DB 덤프(**14절**)는 의도된 예외로 원문을 포함하며, 사내 이전 한정·외부 재배포 금지다.

---

## 13. 샘플 스크립트 · FAQ · 변경 이력

### 13.1 샘플 스크립트 사용법

저장소 루트의 `scripts/` 에 두 가지가 있다. 둘 다 토큰을 **환경변수로만** 받고 출력·로그에 남기지 않는다.

**`scripts/argos-i-pull.mjs`** (Node 18+, 외부 의존성 없음, 파일 단위 다운로드)

```bash
export ARGOS_I_EXPORT_TOKEN='<TOKEN>'
export ARGOS_I_OUT_DIR=/data/argos-i          # 기본 ./argos-i-data
node scripts/argos-i-pull.mjs                  # 최신 번들
node scripts/argos-i-pull.mjs --date 2026-10-28
node scripts/argos-i-pull.mjs --force          # 같은 번들이어도 다시 받는다
node scripts/argos-i-pull.mjs --help
```

**`scripts/argos-i-pull.sh`** (bash + curl + unzip + sha256sum, ZIP 흐름)

```bash
export ARGOS_I_EXPORT_TOKEN='<TOKEN>'
scripts/argos-i-pull.sh          # latest.zip → 해제 → manifest.json 의 files[] 로 sha256 -c → <out>/<date>/
```

환경변수: `ARGOS_I_BASE_URL`(기본 `https://robot-info-api.up.railway.app`), `ARGOS_I_EXPORT_TOKEN`(필수), `ARGOS_I_OUT_DIR`(기본 `./argos-i-data`).

종료 코드: `0` 성공 또는 이미 최신(up to date), `1` 일반 오류, `2` 인증 실패/비활성(401·503), `3` 번들 없음, `4` 체크섬 불일치(1회 재다운로드 후), `5` 재시도 소진.

성공하면 `<out>/<날짜>/` 에 번들 파일과 `.complete`(번들 식별자 기록)가 생기고 `<out>/LATEST` 가 최신 날짜로 바뀐다. 같은 번들을 다시 실행하면 `up to date` 로 종료한다.

권장 cron (사내 서버 시간대에 주의 — 아래는 서버가 KST 일 때):

```
0 8 * * *   /opt/argos-i/scripts/argos-i-pull.sh >> /var/log/argos-i-pull.log 2>&1
0 9 * * 1   /opt/argos-i/scripts/argos-i-pull.sh >> /var/log/argos-i-pull.log 2>&1   # 월요일: 주간 브리프 반영본
```

### 13.2 FAQ / 문제 해결

| 증상 | 원인·해결 |
|---|---|
| 계속 401 | 토큰 값(공백·개행 포함 여부)과 `Authorization: Bearer ` 접두를 확인한다. 토큰을 교체했다면 3.4절의 NEXT 절차를 쓴다. 틀린 토큰으로 반복하면 429 로 막힌다 |
| 503 `argos_i_export_disabled` | ARGOS 서버에 `ARGOS_I_EXPORT_TOKEN` 이 없거나 32자 미만이다. ARGOS 운영자에게 문의 |
| 08:00 에 `latest` 가 어제 날짜다 | 상류 작업이 늦어 07:30 이후에 완성되는 날이다. 10분 간격으로 재시도한다 (10절) |
| 같은 날짜인데 파일이 바뀌었다 | 수동 재생성 또는 월요일 주간 브리프 반영 재생성이다. `bundleSha256` 변경을 감지해 다시 받는다 |
| `status: "partial"` | 선택 영역 일부가 실패했다. `warnings` 의 `area_failed:<id>` 를 확인한다. 핵심(P0) 영역이 실패하면 번들이 만들어지지 않으므로 이전 번들이 `latest` 로 남는다 |
| ZIP 해제 후 sha256 이 다르다 | 전송 중 손상 가능성이 높다. 1회 재다운로드 후에도 다르면 알린다 (코드 4) |
| `tech-trends` 에 `unavailable` 이 많다 | AI 분석물이 아직 생성·캐시되지 않았다. 다음 번들에서 채워질 수 있다 |
| 영상 조회수가 화면과 다르다 | `views` 는 수집 시점의 값이다 |
| 한글이 깨진다 | 모든 파일은 UTF-8(BOM 없음)이다. 수신 측 인코딩을 확인한다 |
| 파일 크기가 큰가 | 일 번들은 보통 수 MB~수십 MB(압축 전)이며 ZIP 은 그보다 훨씬 작다. 서버가 100MB(기본) 를 넘는 번들은 만들지 않는다 |

### 13.3 변경 이력

| 날짜 | 스키마 | 내용 |
|---|---|---|
| 2026-10-28 | v1 | **최초 공개.** 영역 29개: `overview`, `companies`, `robots`, `components`, `actuator-map`, `actuator-sourcing`, `robot-benchmark`, `hand-benchmark`, `ci-matrix`, `ci-changes`, `videos`, `papers`, `news`, `tech-trends`, `weekly-briefs`, `keywords`, `application-cases`, `scores`, `vision-cost`, `products`, `competitive-alerts`, `aggregations`, `strategy-warroom`, `lg-humanoid-models`, `coverage-field-events`, `regulations`, `event-briefs`, `external-sources`, `data-quality`. 엔드포인트 4개(`manifest`, `latest.zip`, `{date}.zip`, `{date}/{file}`), Bearer 토큰 인증(NEXT 이중 토큰), 30일 보존, 월요일 주간 브리프 반영 재생성(`reason: "weekly-brief"`) |
| 2026-10-29 | 덤프 형식 v1 | **초기 적재용 전체 DB 덤프 추가**: 엔드포인트 2개(`full-db/manifest`, `full-db.zip`), 적재·pull 스크립트 3종(`argos-i-import-full-db.mjs`, `argos-i-pull-full-db.mjs`, `argos-i-pull-full-db.sh`). 일일 번들 스키마 변경 없음 (14절) |

파괴적 변경은 적용일 14일 전에 이 표에 "예고" 행으로 먼저 올린다.

---

## 14. 초기 적재: 전체 DB 덤프

> **이 절은 위의 "원문 미포함, 파생 데이터만" 원칙의 의도된 예외다.** 사내 ARGOS_I 서버를 처음 채울 때 **한 번만** 쓰는 전체 DB 덤프이며, 수집 **원문(기사 본문 등)이 포함**된다. 평소의 동기화는 일일 번들(1~13절)이 맡는다.

### 14.1 목적과 일일 번들과의 관계

| | 일일 번들 (1~13절) | 전체 DB 덤프 (14절) |
|---|---|---|
| 용도 | 매일 증분 참고 데이터 | **1회성 초기 적재** |
| 내용 | 영역별 파생 데이터, 원문 제외 | **원본 테이블 그대로**, 원문 포함 (`articles.content`, `summary` 등) |
| 형식 | 영역별 MD + JSON | 테이블별 JSONL + `schema.json` + `manifest.json` (스트리밍 ZIP) |
| 생성 | 매일 07:00 KST 생성·저장 | **요청할 때마다** 서버가 즉석에서 스트리밍 (저장하지 않음) |
| 활성화 | 항상 | `ARGOS_I_FULL_DB_ENABLED=true` 일 때만 |

- 같은 토큰(`ARGOS_I_EXPORT_TOKEN`, Bearer)을 쓴다.
- **사내 이전 한정, 외부 재배포 금지.** 덤프 파일은 원문을 담은 민감 데이터다. 저장소에 커밋하지 말고(`argos-i-full-db-data/` 는 `.gitignore` 대상), 전송은 HTTPS 로만 하며, 적재가 끝나면 안전하게 삭제한다.
- 저장소의 `packages/backend/src/db/clear-article-content.ts` 는 "저작권 보호를 위해 본문 및 AI 요약 제거"용 스크립트다. 이 덤프는 DB 에 남아 있는 `articles.content`·`summary` 를 그대로 내보내므로, 필요하면 정책 담당 확인을 거친다.

### 14.2 사전 준비 (ARGOS_I 쪽)

1. **같은 소스 버전을 체크아웃**하고 루트에서 `npm ci` 를 실행한다. 덤프의 `manifest.json` 에 `generator.commit`(앞 7자, Railway 배포일 때) 과 `schemaHint.latestDrizzleSql` 이 있다. 적재 스크립트는 `git rev-parse` 결과가 다르면 경고만 한다.
2. ARGOS_I 용 PostgreSQL DB 를 만든다 (확장은 `pg_trgm` 이 필요할 수 있으며 `db:migrate` 가 처리한다).
3. `DATABASE_URL=<ARGOS_I DB> npm run db:migrate` 를 실행한다.
4. 백엔드를 **`DISABLE_SCHEDULER=true`** 로 한 번 기동해 런타임 테이블(`ensure*`: ci_*, hand_*, actuator_*, weekly_briefs, coverage_*, data_migrations 등)을 만들고 **중지**한다. 이 기동은 시드 데이터도 넣는다(아래 "시드 충돌").
5. **규제·컴플라이언스 6개 테이블**(`regulations`, `regulatory_updates`, `regulatory_sources`, `regulatory_documents`, `compliance_checklist`, `compliance_progress_logs`)은 `db:migrate` 에도 기동 시 `ensure*` 에도 없다(ARGOS 운영 DB 에는 `drizzle-kit push` 로 만들어졌다). 대상에 없으면 적재 스크립트가 `table_missing` 으로 건너뛰고 종료 코드 4 를 낸다. 함께 옮기려면 임시 DB 에서 스키마를 만들어 이 6개만 복사한다.

   ```
   createdb argos_i_schema_tmp
   DATABASE_URL=postgres://.../argos_i_schema_tmp npm run db:migrate
   (cd packages/backend && DATABASE_URL=postgres://.../argos_i_schema_tmp npx drizzle-kit push:pg)
   pg_dump --schema-only -t regulations -t regulatory_updates -t regulatory_sources -t regulatory_documents \
           -t compliance_checklist -t compliance_progress_logs postgres://.../argos_i_schema_tmp | psql "$DATABASE_URL"
   dropdb argos_i_schema_tmp
   ```

   ⚠ ARGOS_I DB 자체에 `drizzle-kit push` 를 직접 실행하지 않는다. push 는 `ensure*` 가 만든 컬럼 타입(`timestamptz` 등)을 `schema.ts` 기준(`timestamp`)으로 바꾸려 하며, 타입이 다르면 적재 스크립트가 해당 테이블을 `type_mismatch` 로 건너뛴다.
6. **크롤러·스케줄러를 멈춘다.** ARGOS_I 에서는 `DISABLE_SCHEDULER=true` 로 운영하고, 적재 중에는 백엔드를 띄우지 않는다.
7. **시드 충돌과 `--mode truncate`:** 같은 소스로 기동한 백엔드는 기동 시 시드(`ci_*`, `hand_*`, coverage 등)가 **새 uuid** 로 행을 넣는데 `slug`·`key` 같은 유니크 키는 원본과 같다. 기본 모드(upsert, PK 기준)로 적재하면 유니크 위반으로 해당 테이블이 실패한다. **첫 적재는 `--mode truncate --yes` 를 쓴다.**
8. **계정은 옮기지 않는다.** `users` 는 제외되므로 ARGOS_I 에서 계정을 따로 만든다.

### 14.3 활성화

- Railway 의 backend 서비스 Variables 에 `ARGOS_I_FULL_DB_ENABLED=true` 를 설정한다 (자동 재배포).
- 꺼져 있으면 `full-db.zip` 은 인증 뒤에 `503 {"error":"full_db_disabled"}` 이고, `full-db/manifest` 는 `"enabled": false` 로 응답한다.
- **사용을 마치면 변수를 제거하거나 `false` 로 되돌린다.** 토큰이 유출되면 일일 번들보다 피해가 크므로 토큰 교체(3.4절)도 권장한다.
- 선택 변수: `ARGOS_I_FULL_DB_BATCH_ROWS`(기본 1000, 100~5000), `ARGOS_I_FULL_DB_TIMEOUT_MIN`(기본 60, 5~240), `ARGOS_I_FULL_DB_ZIP_LEVEL`(기본 6, 0~9, 0 이면 무압축).

### 14.4 엔드포인트

접두사 `/api/argos-i`, 인증은 3절과 같다(`Authorization: Bearer <TOKEN>`만 인정, 쿼리스트링 토큰은 무시되어 401).

#### `GET /api/argos-i/export/full-db/manifest` — 사전 확인

덤프를 만들지 않는다. 슬롯·락 없이 카탈로그만 읽는다. 스위치가 꺼져 있어도 200 이다.

| 쿼리 | 의미 |
|---|---|
| (기본) | 행 수는 `pg_class.reltuples` 추정(한 번도 분석되지 않았으면 `null`), 크기는 `pg_table_size`(heap+TOAST, 압축 전). `count(*)` 를 하지 않는다 |
| `exact=true` | 테이블별 `count(*)` (테이블당 10초 제한, 실패하면 추정값으로 대체하고 `rowCountKind:"estimate"`) |

응답(200, `Cache-Control: no-store`):

```json
{
  "enabled": true,
  "dumpFormatVersion": 1,
  "serverTime": "2026-10-29T03:00:00.000Z",
  "selection": { "supported": true, "param": "tables", "note": "..." },
  "hint": "...",
  "tables": [ { "name": "companies", "estimatedRows": 61, "rowCountKind": "estimate", "estimatedBytes": 65536, "loadByDefault": true } ],
  "excludedTables": [ { "name": "users", "reason": "accounts_and_password_hash" } ],
  "excludedColumns": [ { "table": "...", "column": "...", "pattern": "...", "reason": "name_rule:..." } ],
  "allowlistedColumns": [ { "table": "weekly_briefs", "column": "input_tokens", "pattern": "token" } ],
  "nullifiedFkColumns": [ { "table": "articles", "column": "submitted_by", "refTable": "users" } ],
  "scrubbedJsonColumns": [ { "table": "regulatory_sources", "column": "config" } ],
  "totals": { "estimatedRows": 0, "estimatedBytes": 0 },
  "zip32Risk": false,
  "inProgress": false
}
```

`tables` 는 적재 순서(`loadOrder`, FK 부모가 먼저)다. `zip32Risk` 는 추정 크기 합이 3 GiB 를 넘으면 `true`(→ `?tables=` 분할). `inProgress` 는 다른 덤프가 진행 중인지다.

#### `GET /api/argos-i/export/full-db.zip[?tables=a,b]` — 덤프

| 항목 | 값 |
|---|---|
| 쿼리 | `tables=a,b,c` (선택, 쉼표 구분, 이름 규칙 `^[a-z_][a-z0-9_]{0,62}$`). 알 수 없거나 제외된 이름은 400 `{"error":"invalid_tables","unknown":[...]}`. 지정해도 `schema.json` 은 전체 계획을 담고 `manifest.json` 의 `selection` 만 `"subset"` 이 된다. 순서는 항상 `loadOrder` |
| 성공 | 200, `Content-Type: application/zip`, `Content-Disposition: attachment; filename="argos-i-full-db_<YYYYMMDDTHHMMSSZ>.zip"`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Argos-I-Dump-Generated-At: <ISO UTC>` |
| 전송 방식 | `Content-Length` 없음(chunked). `ETag`·`Range` 미지원 (끊기면 처음부터 다시 받는다) |
| `HEAD` | 200 과 헤더만. DB 에 접속하지 않고 슬롯도 쓰지 않는다 |

오류 코드

| 코드 | 의미 | 본문 |
|---|---|---|
| 401 | 토큰 오류 (스위치가 꺼져 있어도 401) | `{"error":"Unauthorized"}` + `WWW-Authenticate: Bearer` |
| 429 | 인증 실패 누적(60초 30회 초과) | `{"error":"too_many_requests"}` + `Retry-After` |
| 503 | 토큰 미설정 | `{"error":"argos_i_export_disabled"}` |
| 503 | 인증은 통과했으나 스위치가 꺼짐 | `{"error":"full_db_disabled"}` |
| 400 | 잘못된 `tables` | `{"error":"invalid_tables","unknown":[...]}` |
| 409 | 다른 덤프가 진행 중 (**동시에 1개만**) | `{"error":"full_db_in_progress"}` + `Retry-After: 60` |
| 500 | 스트림 시작 전 실패 (DB 접속·스키마 조회) | `{"error":"full_db_failed"}` (내부 메시지는 싣지 않는다) |
| (스트림 중 실패) | 상태 코드를 바꿀 수 없다 | 연결이 끊기고 **`manifest.json` 이 없는 ZIP** 이 된다 → 14.11 |

덤프는 `REPEATABLE READ READ ONLY` 트랜잭션 하나(단일 스냅샷)에서 읽으므로, 덤프 중 크롤러가 써도 부모·자식 행이 어긋나지 않는다. 서버는 어디에도 쓰지 않는다(파일시스템·DB 모두). 전체 상한 시간(`ARGOS_I_FULL_DB_TIMEOUT_MIN`, 기본 60분)을 넘으면 스트림이 오류로 끝난다.

### 14.5 덤프 구조

```
argos-i-full-db/<YYYYMMDDTHHMMSSZ>/      (UTC)
  README.md             덤프 설명 (이 절의 요약)
  schema.json           테이블·컬럼·키·FK·시퀀스·적재 순서
  tables/<table>.jsonl  테이블별 데이터 (한 줄에 한 행)
  manifest.json         ZIP 의 마지막 엔트리: 행 수·바이트·sha256, 제외 목록
```

- JSONL: UTF-8, BOM 없음, LF, 한 줄에 한 행, 마지막 줄 끝에도 개행. 키 순서는 `schema.json` 의 컬럼 순서다. 행이 0건인 테이블도 빈 파일로 들어 있다. 문자 U+2028·U+2029 는 JSON 이스케이프 시퀀스(백슬래시 + `u2028` / `u2029`)로 쓰여 있어 `\n` 분할이 안전하다.
- `schema.json`: `dumpFormatVersion`(1), `generatedAt`, `loadOrder`(FK 부모 먼저, 같은 단계는 이름 순), `cycles`(FK 순환·자기참조 그룹, 현재 `[]`), `tables[]` = `{name, columns[{name, ordinalPosition, dataType, udtName, formatType, isNullable, default, isGenerated, isIdentity, identityGeneration, dumpEncoding}], primaryKey[], conflictTarget{kind, name, columns[]}, foreignKeys[{name, columns, refTable, refColumns, onDelete, refExcluded}], sequences[{column, sequenceName}], loadByDefault}`.
  - `conflictTarget`: PK 가 있으면 PK, 없으면 NOT NULL 컬럼만으로 된 비부분·비식 유니크 인덱스 중 이름 오름차순 첫 번째(예: `article_keywords`), 둘 다 없으면 `{kind:null}`.
- `manifest.json` 은 압축형(들여쓰기 없음)이며 스트리밍 중 누적된 값이다.

  | 필드 | 내용 |
  |---|---|
  | `dumpFormatVersion`, `generatedAt`, `finishedAt` | 형식 버전, 스냅샷 시각, 마지막 테이블 종료 시각 |
  | `snapshot` | `{isolation:"repeatable read", note}` |
  | `selection`, `selectedTables` | `"all"` / `"subset"` 과 담긴 테이블 목록 |
  | `generator` | `{name:"argos", commit}` (`RAILWAY_GIT_COMMIT_SHA` 앞 7자 또는 null) |
  | `schemaHint` | `{schemaFingerprintSha256, tableCount, columnCount, latestDrizzleSql, gitCommit}` — 정보 제공용 |
  | `tables[]` | `{name, path, rows, jsonlBytes, sha256, loadByDefault, loadOrderIndex}` (`loadOrder` 순). **`sha256`·`jsonlBytes` 는 압축 해제된 JSONL 기준**, `rows` 는 실제 직렬화한 줄 수 |
  | `excludedTables[]`, `excludedColumns[]`, `allowlistedColumns[]`, `nullifiedFkColumns[]`, `scrubbedJsonKeys[]`, `textFallbackColumns[]` | 14.7절 |
  | `totals` | `{tableCount, rows, jsonlBytes}` |
  | `files` | `{"README.md": sha256, "schema.json": sha256}` |

  ZIP 전체의 sha256 은 자기 참조라 넣을 수 없다. 필요하면 다운로드 후 직접 계산한다.

### 14.6 값 인코딩과 역변환 규칙

모든 테이블은 `schema.json` 의 `udtName` 으로 아래 규칙을 따른다 (`dumpEncoding` 에 이름이 있다). 적재 스크립트는 이 표의 역변환을 구현하고, INSERT 의 파라미터마다 **대상 DB 컬럼의 `format_type` 으로 명시 캐스트**한다(`$n::timestamp`, `$n::jsonb`, `$n::numeric(15,2)` ...).

| PG 타입 | JSONL 값 | 적재 파라미터 |
|---|---|---|
| bool | `true`/`false` | 그대로 |
| int2, int4 | JSON number | 그대로 |
| int8 | **문자열** `"9007199254740993"` | 문자열 그대로 (정밀도 보존) |
| numeric | **문자열** `"1234.50"`, 특수값 `"NaN"` | 문자열 그대로 (scale 보존) |
| float4, float8 | JSON number. NaN·±Infinity 는 문자열 `"NaN"`, `"Infinity"`, `"-Infinity"` | 그대로 |
| text, varchar, bpchar, uuid, name | 문자열 | 그대로 |
| date | `YYYY-MM-DD`, 무한값은 `"infinity"`, `"-infinity"` | 문자열 그대로 |
| timestamp (tz 없음) | `YYYY-MM-DDTHH:MM:SS[.ffffff]Z` | 문자열을 `::timestamp` 로 캐스트 |
| timestamptz | 같은 형식 (UTC) | 문자열을 `::timestamptz` 로 캐스트 |
| json, jsonb | JSON 값 그대로. SQL NULL 은 `null`, **JSON null 스칼라는 `{"$jsonNull":true}`** | `JSON.stringify` 한 문자열을 `::jsonb` 로 캐스트, 센티널은 `'null'` |
| bytea | `{"$bytea":"<base64>"}` | `Buffer.from(b64, 'base64')` |
| 배열 (`text[]` 등 text·varchar·bpchar·uuid·name·int2·int4·bool 요소) | JSON 배열 (요소 null 허용) | JS 배열 그대로, `::text[]` 등 캐스트 |
| 그 밖의 타입 (enum, inet, interval, time, tsvector, `numeric[]`, `jsonb[]`, `bytea[]`, `int8[]` ...) | `::text` 문자열 | 문자열을 `format_type` 으로 캐스트 (`manifest.textFallbackColumns` 에 기록) |

- **NULL** 은 모든 타입에서 JSON `null` 이다.
- **timestamp 규약:** `timestamp`(tz 없음)는 ARGOS 에서 UTC wall-clock 으로 저장된다. 값에 `Z` 를 붙여 내보내지만 PG 는 `timestamp` 에서 시간대 표기를 무시하므로 wall-clock 이 그대로 보존된다. **JS `Date` 로 읽지 말 것**(마이크로초가 잘리고 로컬 시간대로 어긋난다). 소수부는 원문 그대로이며 끝자리 0 은 PG 가 이미 생략한다. `timestamptz` 는 UTC 로 내보낸다.
- **node-pg 주의:** JS 배열 파라미터는 PG 배열로 직렬화되므로 jsonb 에는 반드시 `JSON.stringify` 한 문자열을 넘기고 캐스트한다.
- **jsonb 정밀도:** 파싱 후 재직렬화하므로 17자리를 넘는 정수와 소수의 끝자리 0(`1.50` → `1.5`)은 보존되지 않는다(jsonb 의미상 같은 값).
- 적재 INSERT 는 파라미터 상한(65535)을 넘지 않도록 행 수를 `min(배치, floor(60000/컬럼 수))` 로 낮춘다.

### 14.7 제외 항목

아래를 뺀 나머지는 **신규 테이블이 생겨도 자동으로 포함**된다. 블록리스트는 안전망이 아니다. 새 테이블을 추가하는 개발자는 `packages/backend/src/services/argos-i-full-db-config.ts` 의 `EXCLUDED_TABLES` 를 함께 검토한다.

| 구분 | 내용 |
|---|---|
| 제외 테이블 (`public` 의 기본 테이블 중) | `users`(계정·`password_hash`), `allowed_emails`, `audit_logs`, `ai_usage_logs`, `argos_i_exports`, `argos_i_export_files`. 이름이 `__drizzle` 로 시작하는 테이블과 `public` 외 스키마도 제외(방어용) |
| 제외 컬럼 (이름 규칙) | 컬럼명(소문자)에 `password`, `secret`, `token`, `api_key`, `apikey`, `credential` 이 들어가면 제외. 생성 컬럼(`GENERATED ALWAYS AS`)도 제외 |
| 규칙의 예외 (허용 목록) | LLM 토큰 사용량 컬럼 4개는 비밀이 아니므로 포함: `weekly_briefs.input_tokens`·`output_tokens`, `issue_ai_call_log.input_tokens`·`output_tokens` (`manifest.allowlistedColumns`) |
| 필수 컬럼이 제외되면 | NOT NULL 이고 기본값이 없는 컬럼이 제외되면 그 테이블 전체를 제외(`required_column_excluded:<컬럼>`). 그 테이블을 NOT NULL FK 로 참조하는 테이블도 연쇄 제외 |
| 제외 테이블을 가리키는 FK | nullable FK 컬럼은 **NULL 로 내보낸다**(`manifest.nullifiedFkColumns`). 현재 7개: `articles.submitted_by`, `pipeline_runs.triggered_by`, `partner_evaluations.evaluated_by`, `competitive_alerts.read_by`, `whatif_scenarios.created_by`, `strategic_goals.created_by`, `spec_change_logs.changed_by` |
| JSON 키 스크러빙 | `regulatory_sources.config`(jsonb)에서 키 이름이 위 컬럼 패턴 또는 `authorization`, `bearer`, `cookie`, `private_key` 를 포함하는 키를 **값째 재귀 제거**(대소문자 무시, `-`·공백은 `_` 로 취급). 제거 건수는 `manifest.scrubbedJsonKeys` |
| 적재 기본 제외 | `data_migrations` 는 덤프에 들어 있지만 `loadByDefault:false`("마커 키 충돌, ARGOS_I에서는 적재하지 말 것"). 적재 스크립트는 기본으로 건너뛴다 |

URL 컬럼(`crawl_targets.urls`·`patterns`, `regulatory_sources.url`, `issue_attachments.file_url`)은 그대로 포함한다. `user:pass@` 나 `?token=` 형태의 자격증명이 들어 있지 않은지는 ARGOS 운영자가 별도로 확인한다.

### 14.8 적재 절차

1. **받기** — pull 스크립트가 사전 확인, 스트리밍 저장, `unzip -t`, 압축 해제, 파일별 sha256·바이트 검증을 하고 최종 디렉터리를 출력한다.

   ```
   export ARGOS_I_EXPORT_TOKEN='<TOKEN>'
   node scripts/argos-i-pull-full-db.mjs            # 또는 scripts/argos-i-pull-full-db.sh
   # → .../argos-i-full-db-data/argos-i-full-db/<YYYYMMDDTHHMMSSZ>
   ```

   옵션: `--tables a,b`(분할 다운로드), `--keep-zip`, `--no-extract`(받아서 `unzip -t` 만), `--retries N`(기본 2, 처음부터 다시). 환경변수: `ARGOS_I_BASE_URL`, `ARGOS_I_EXPORT_TOKEN`, `ARGOS_I_FULL_DB_OUT_DIR`(기본 `./argos-i-full-db-data`). 압축 해제에는 시스템 `unzip` 이 필요하다.

   | 종료 코드 | 의미 |
   |---|---|
   | 0 | 성공 |
   | 1 | 일반 오류 (인자, 잘못된 tables, unzip 없음) |
   | 2 | 인증 실패·비활성 (401, 503 `argos_i_export_disabled`·`full_db_disabled`, `enabled:false`) |
   | 4 | 체크섬 불일치 또는 `manifest.json` 없음(불완전 ZIP) |
   | 5 | 재시도 소진 (429·5xx·네트워크) |
   | 6 | 다른 덤프가 진행 중 (409) |

2. **검증만** — `node scripts/argos-i-import-full-db.mjs <덤프 디렉터리> --verify-only` (DB 불필요). 모든 파일의 sha256·바이트를 `manifest.json` 과 대조한다.
3. **계획 보기** — `DATABASE_URL=<ARGOS_I DB> node scripts/argos-i-import-full-db.mjs <덤프 디렉터리> --dry-run` (DB 에는 읽기 쿼리만). 테이블별 적재/건너뜀, 행 수, 호환성 판정, FK 경고, TRUNCATE CASCADE 범위를 보여 준다.
4. **적재** — 저장소 루트에서 (`npm ci` 를 마친 상태, Node 18+, 의존성은 `pg`):

   ```
   DATABASE_URL=postgres://... node scripts/argos-i-import-full-db.mjs <덤프 디렉터리> --mode truncate --yes
   ```

   DB 접속 정보는 환경변수 `DATABASE_URL` 로만 받는다(인자로 받지 않는다). 비밀번호는 출력하지 않고 `호스트:포트/DB명` 만 출력한다.

   | 옵션 | 기본 | 설명 |
   |---|---|---|
   | `--mode upsert\|truncate` | upsert | upsert: PK(없으면 `conflictTarget`) 기준 `INSERT ... ON CONFLICT DO UPDATE`(비키 컬럼이 없으면 `DO NOTHING`). truncate: 테이블 단위 트랜잭션에서 `TRUNCATE ... CASCADE` 후 INSERT. **첫 적재는 truncate 권장** |
   | `--yes` | - | truncate 에 필수 (없으면 종료 코드 1) |
   | `--tables a,b` | 전체 | 지정 테이블만 (`loadOrder` 유지) |
   | `--skip a,b` | `data_migrations` | 건너뛸 테이블을 추가. `data_migrations` 는 `--tables` 에 명시했을 때만 경고와 함께 적재 |
   | `--dry-run` | 끔 | 쓰기 없이 계획만 출력 |
   | `--batch-rows N` | 500 | INSERT 당 행 수 (파라미터 60000개·8MiB 상한으로 자동 하향) |
   | `--defer-fk` | 끔 | `session_replication_role = replica` (슈퍼유저 필요, 종료 시 원복). FK 순환이 있을 때만 필요 (현재 순환 없음) |
   | `--verify-only` | 끔 | 체크섬 검증만 |
   | `--no-analyze` | 끔 | 적재 후 `ANALYZE` 생략 |
   | `--continue-on-error` | 끔 | 한 테이블이 실패해도 다음 테이블 진행 (기본은 즉시 중단) |

   동작: ① `manifest`/`schema` 형식 검증 ② **쓰기 전에** 전 파일 sha256 대조(하나라도 다르면 종료 코드 3) ③ 대상 스키마 조회와 테이블별 호환성 판정 ④ truncate 는 대상 DB 의 FK 로 CASCADE 범위를 계산해 적재 대상 밖 테이블이 비워질 것 같으면 **쓰기 전에 중단** ⑤ `loadOrder` 순서로 테이블 단위 트랜잭션(실패하면 그 테이블만 롤백) ⑥ `serial` 컬럼 시퀀스를 `setval`(행이 없으면 1 부터) ⑦ `ANALYZE` ⑧ 행 수 검증(truncate 는 manifest 와 같아야 하고, upsert 는 이상이면 정상) ⑨ 요약 표.

   호환성 판정으로 건너뛰는 사유: `table_missing`, `columns_missing:[...]`, `type_mismatch:[...]`(같은 컬럼의 `udt_name` 이 다름), `target_required_column_missing:[...]`(대상에만 있는 NOT NULL·기본값 없는 컬럼), `target_generated_columns:[...]`, `no_key_target_not_empty`(키 없는 테이블인데 upsert 이고 대상이 비어 있지 않음). 건너뛴 테이블을 FK 로 참조하는 테이블이 있으면 경고한다.

   | 종료 코드 | 의미 |
   |---|---|
   | 0 | 성공. 선택한 테이블을 모두 적재했고 행 수가 일치 |
   | 1 | 인자 오류, `--yes` 누락, 지원하지 않는 덤프 버전, `pg` 미설치, FK 순환(`--defer-fk` 필요), TRUNCATE CASCADE 범위 초과 |
   | 2 | DB 접속·권한 오류 (`--defer-fk` 권한 부족 포함) |
   | 3 | 체크섬/크기 불일치 또는 manifest 손상 (쓰기 전에 종료) |
   | 4 | 완료했으나 건너뛴 테이블이 있음 |
   | 5 | 테이블 적재 실패 (그 테이블은 롤백됨, 이전 테이블은 커밋됨 → 출력된 `--tables` 로 재개) |
   | 6 | 적재 후 행 수 불일치 (truncate 모드) |

   **트리거:** upsert 는 사용자 트리거를 적재 중 비활성화한다(테이블 트랜잭션 안에서 `ALTER TABLE ... DISABLE TRIGGER USER` → 적재 → `ENABLE TRIGGER USER`, 사용자 트리거가 있는 테이블에만, 같은 트랜잭션이라 실패하면 롤백되어 원복된다). **소유자 권한이 없으면** 비활성화하지 못하고 경고 한 줄("updated_at 트리거가 값을 덮어쓸 수 있음")만 출력한 채 계속하며, 이때 `updated_at` 류 컬럼이 `now()` 로 덮어써질 수 있다(영향: `coverage_field_events`, `humanoid_models`). truncate 모드는 UPDATE 가 없어 트리거를 건드리지 않는다. 테이블 소유자(보통 마이그레이션을 실행한 DB 사용자)로 실행한다.

   upsert 모드에서 유니크 위반(`23505`)이 나면 오류 줄에 "첫 적재라면 --mode truncate --yes 를 사용하세요" 가 덧붙는다. 행 데이터가 담긴 오류 상세(`detail`)는 출력하지 않는다.

5. **적재 후 점검**
   - 행 수: 요약 표의 `expected`/`count` 열이 같은지, 또는 `SELECT count(*) FROM <table>` 로 `manifest.json` 의 `rows` 와 대조한다.
   - 시퀀스: 새 행 삽입이 PK 충돌 없이 되는지 (`serial` 17개 테이블은 스크립트가 `setval` 한다). 직접 확인: `SELECT last_value, is_called FROM <table>_id_seq;`
   - 통계: 스크립트가 `ANALYZE` 했다(`--no-analyze` 가 아니라면).
   - 사용자 id: `users` 가 없으므로 `pm_*`, `issue_*`, `report_downloads.user_id` 등이 가리키는 사용자 id 는 ARGOS_I 계정과 자동으로 매핑되지 않는다(14.11).

### 14.9 소요·크기 주의

- 먼저 `full-db/manifest` 의 `totals.estimatedBytes`(압축 전)와 `zip32Risk` 를 본다. 압축 후에는 대략 1/4~1/6 이다. 가장 큰 테이블은 `articles` 다.
- 로컬 실측 예(합성 데이터, 같은 머신): 압축 전 441 MB(JSONL), ZIP 204 MB, 약 17초, 덤프 중 서버 RSS 증가 약 100 MB, `/health` 최대 지연 0.1초 미만. 실제 시간은 네트워크가 좌우한다.
- 받는 쪽 디스크는 ZIP + 해제본 + DB 를 합쳐 추정 크기의 3배 이상 여유를 둔다(pull 스크립트가 `fs.statfs` 로 경고).
- **서버 부하를 피하려고 KST 03:00(크롤러)·04:00(태깅)·05:30(파이프라인)·07:00(일일 번들) 전후는 피해서 실행한다.** 서버가 강제하지는 않는다.
- 덤프 시간 동안 읽기 전용 트랜잭션 하나가 열려 있어 vacuum 이 지연된다(다른 쓰기는 막지 않는다). 그래서 1회성 사용만 권장한다. 이 동안 `ALTER TABLE` 같은 DDL 은 대기할 수 있으므로 배포·마이그레이션은 덤프 후에 한다.
- **`zip32Risk` / 분할:** 서버의 ZIP 라이브러리는 ZIP64 를 쓰지 못한다. 엔트리 하나가 4 GiB-1 MiB, 전체가 4 GiB-16 MiB 를 넘으면 스트림이 오류로 끝난다(로그 `reason=zip32_limit`, `manifest.json` 없음). `--tables` 로 나눠 받는다. 예: `--tables articles` 와 나머지를 따로. 분할 덤프는 각각 완전한 ZIP 이며, 적재는 `--tables` 로 구간을 나눠 `loadOrder` 순서대로(부모 먼저) 한다.
- **프록시 응답 시간 제한:** Railway 프록시의 한 응답 최대 지속 시간은 확인하지 못했다(미확인). 배포 후 `full-db/manifest` 로 크기를 보고 첫 덤프를 실측하며, 시간 초과가 의심되면 `--tables` 로 분할한다. 서버는 전송 내내 바이트를 흘려 보내고(역압 기반), 느린 클라이언트도 전체 상한(기본 60분) 안에서는 끊지 않는다.
- 실패하면 **처음부터** 다시 받는다 (이어받기 없음). pull 스크립트는 `--retries` 만큼 자동으로 다시 시도한다.

### 14.10 1회성 권장과 사용 후 조치

1. 적재와 검증이 끝나면 ARGOS 의 `ARGOS_I_FULL_DB_ENABLED` 를 제거하거나 `false` 로 되돌린다.
2. 받은 덤프(ZIP, 해제본, 임시 스키마 DB)를 안전하게 삭제한다. 원문이 들어 있다.
3. 토큰을 교체한다(3.4절). 그 뒤의 동기화는 일일 번들(`argos-i-pull`)을 쓴다.

### 14.11 FAQ

| 증상 | 원인·해결 |
|---|---|
| 불완전한 ZIP 인지 어떻게 아나 | `unzip -t` 가 실패하거나 ZIP 에 `manifest.json` 이 없으면 전송 중 중단된 덤프다(상태 코드는 이미 200 이라 알릴 방법이 없다). 버리고 처음부터 다시 받는다. pull 스크립트는 종료 코드 4 로 알린다 |
| 409 `full_db_in_progress` | 다른 덤프가 진행 중이다(동시에 1개). `Retry-After`(60초) 뒤 다시 시도. 클라이언트가 끊은 덤프는 서버가 곧 정리한다. 종료 코드 6 |
| 429 | 인증 실패가 60초에 30회를 넘었다. 토큰을 확인하고 `Retry-After` 뒤 다시 시도 |
| 503 `full_db_disabled` | 서버에 `ARGOS_I_FULL_DB_ENABLED=true` 가 없다 (14.3) |
| 건너뛴 테이블이 있다 (종료 코드 4) | 소스 버전/스키마가 달라 `columns_missing`·`type_mismatch` 등이 났다. 14.2 의 같은 소스 버전을 쓰고, `ensure*` 로 만든 테이블에 `drizzle-kit push` 를 쓰지 않았는지 확인한다. 규제·컴플라이언스 6개 테이블이 `table_missing` 이면 14.2 의 5번 |
| upsert 재실행 후 `coverage_field_events`·`humanoid_models` 의 `updated_at` 이 바뀌었다 | 이 테이블들에는 `BEFORE UPDATE` 트리거(`updated_at = now()`)가 있다. upsert 는 사용자 트리거를 적재 중 비활성화하지만 **소유자 권한이 없으면** 그러지 못하고 경고만 출력하므로 값이 덮어써질 수 있다. 테이블 소유자 계정으로 `DATABASE_URL` 을 지정해 다시 실행하거나, 첫 적재처럼 `--mode truncate --yes` 를 쓴다 |
| 유니크 위반으로 실패 (종료 코드 5) | upsert 모드에서 기동 시 시드 행과 유니크 키가 충돌했다. `--mode truncate --yes` 로 다시 한다 |
| `regulatory_documents` 파일이 없다 | 업로드된 파일 **본체**는 ARGOS 컨테이너 디스크에 있고 DB 에 없다. 메타데이터 행만 이전되며 ARGOS_I 에는 파일이 없다 |
| `pm_*`, `issue_*` 의 사용자 id 가 어느 계정인지 모르겠다 | `users` 는 이전하지 않으므로 이 id 들은 ARGOS_I 에서 가리키는 계정이 없는 **고아 참조**다(FK 위반은 없다). ARGOS_I 에서 계정을 새로 만들며 기존 id 와 자동 매핑되지 않는다. `report_downloads.user_id`(varchar)는 이메일일 수 있다 |
| 개인정보성 데이터가 들어 있나 | `issue_ask_history.query`, `issue_comments.body`, `pm_updates.body`, `compliance_checklist.assignee`, 각종 `*_by` varchar 컬럼은 "모든 데이터" 요구에 따라 포함된다. 외부로 반출하지 않는다 |
| `ARGOS_I_FULL_DB_ENABLED` 가 `true` 인데 manifest 의 `estimatedRows` 가 `null` | 테이블이 아직 분석(`ANALYZE`)된 적이 없다. 추정치일 뿐이며 덤프에는 영향이 없다. 정확한 값은 `?exact=true` |
