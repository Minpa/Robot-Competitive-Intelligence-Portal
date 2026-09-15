# Ingest Batch API — Spec

## 배경

매일 Claude Routine(외부 에이전트)이 웹 검색으로 경쟁사 뉴스를 수집해 PostgreSQL에 직접
INSERT해 왔다. 그 실행 환경에서는 DB로의 raw TCP 접속이 막혀 있어 저장이 되지 않는 문제가
있었다. 이 API는 대신 **인증된 HTTPS 요청**으로 기사(article)와 경쟁 알림(alert)을 저장할 수
있게 한다.

구현 위치: `packages/backend/src/routes/ingest.ts`, `packages/backend/src/routes/ingest-auth.ts`,
`packages/backend/src/services/ingest.service.ts`, `packages/backend/src/services/ingest-hash.util.ts`.
등록: `packages/backend/src/routes/index.ts`에서 `prefix: '/api/ingest'`.

## 엔드포인트

| Method | Path | 설명 |
|---|---|---|
| `POST` | `/api/ingest/articles` | 기사(+ 선택적 알림) 배치 저장. 최대 200건/요청 |
| `GET`  | `/api/ingest/health` | 연결/인증 확인용 (Routine이 본작업 전에 호출) |

두 엔드포인트 모두 인증이 필요하다.

## 인증

헤더 중 하나로 API 키를 전달한다:

```
Authorization: Bearer <INGEST_API_KEY>
```
또는
```
X-Ingest-Key: <INGEST_API_KEY>
```

- 서버에 `INGEST_API_KEY` 환경변수가 설정되어 있지 않으면, 키 값과 무관하게 **모든 요청이
  `503 { "error": "Ingest endpoint disabled" }`** 를 받는다.
- 키가 없거나 일치하지 않으면 **`401 { "error": "Unauthorized" }`**.
- 키 비교는 timing-safe(`crypto.timingSafeEqual`)로 수행한다. 길이가 다르면 즉시 불일치로
  처리한다(비교 없이 false).
- 키 값은 어떤 경우에도 서버 로그에 남지 않는다.

## 요청 (`POST /api/ingest/articles`)

```jsonc
{
  "source": "claude-routine-daily",   // 1~100자, 이 배치를 만든 주체 식별용 (기사 자체의 출처가 아님)
  "articles": [
    {
      "title": "Figure 03 unveils new 5-finger hand",
      "url": "https://example.com/figure-03-hand",
      "source": "TechCrunch",           // 기사 매체명 — articles.source 컬럼
      "publishedAt": "2026-09-15T00:00:00Z",  // ISO datetime 문자열 (Date 파싱 가능해야 함)
      "summary": "Figure AI announced ...",
      "content": "(optional) full text",
      "language": "en",                       // 생략 시 'en'
      "category": "product",                  // product|technology|industry|other, 생략 시 'other'
      "productType": "robot",                 // robot|rfm|soc|actuator|none, 생략 시 'none'
      "companyName": "Figure AI",              // 필수. 대소문자 무시하고 기존 회사와 매칭
      "companyCountry": "USA",                 // 신규 회사 생성 시 사용, 생략 시 'Unknown'
      "companyCategory": "robotics",           // 신규 회사 생성 시 사용, 생략 시 'robotics'
      "extractedMetadata": {                   // 임의 JSON (jsonb 그대로 저장)
        "confidence": "A",
        "mentionedRobots": ["Figure 03"],
        "keyPoints": ["5-finger hand", "..."],
        "summaryKo": "..."
      },
      "alerts": [
        {
          "type": "funding",                    // score_spike|mass_production|funding|partnership
          "severity": "warning",                 // info|warning|critical, 생략 시 'info'
          "title": "Figure AI raises Series C",
          "summary": "(optional)",
          "robotName": "Figure 03",              // humanoid_robots.name과 매칭 시도 (없으면 robotId=null)
          "triggerData": { "amountUsd": 100000000 }
        }
      ]
    }
  ]
}
```

### 필드 규칙

- `source`(top-level): 1~100자. 배치 발신 주체명. `competitive_alerts.trigger_data.source`에
  기록된다.
- `articles`: 최소 1건, **최대 200건**. 201건 이상이면 배치 전체가 거부된다(DB 변경 없음):
  `400 { "error": "Batch too large. Max 200 articles per request." }`
- 각 기사 항목은 **개별적으로** 검증된다 — 한 기사가 형식 오류여도 나머지 기사는 정상 처리된다.
  실패한 기사는 `errors[]`에 `{ index, title?, url?, error }` 형태로 기록된다.
- `title`(500자)/`source`(255자)가 넘으면 **자동으로 잘라서 저장**하고 `warnings[]`에
  `{ index, field, truncatedFrom, truncatedTo }`를 남긴다.
- `url`이 1000자를 초과하면 **해당 기사는 저장하지 않고** `errors[]`에만 기록한다(깨진 링크
  방지 목적, truncate하지 않음).
- `companyName`으로 기존 회사를 대소문자 무시하고 찾는다(`lower(name) = lower(companyName)`).
  없으면 새로 생성한다(`country`는 `companyCountry` 또는 `'Unknown'`, `category`는
  `companyCategory` 또는 `'robotics'`).
- 알림(`alerts`)은 **기사가 신규로 저장된 경우에만** 처리된다. 기사가 중복(아래 참고)으로
  건너뛰어지면 그 기사에 딸린 알림도 저장하지 않는다(재전송 시 알림 중복 방지).
- 알림의 `type`이 화이트리스트(`score_spike|mass_production|funding|partnership`) 밖이면 그
  알림만 `errors[]`에 기록되고 저장하지 않는다(같은 기사의 다른 알림/기사 자체는 영향 없음).
- 알림의 `severity`가 화이트리스트(`info|warning|critical`) 밖이거나 생략되면 `'info'`로
  저장된다.
- 알림의 `robotName`은 `humanoid_robots.name`과 매칭을 시도한다: 대소문자 무시 정확 일치 →
  없으면 부분(포함) 일치 1건 → 그래도 없으면 `robotId = null`로 저장(알림 자체는 저장됨).
- `triggerData`에는 항상 `{ articleId, source: <top-level source> }`가 병합되어 저장된다.

## content_hash 규칙 (중복 판정)

```
content_hash = sha256( normalizeUrl(url) + '|' + dateOnlyUtc(publishedAt) )   // hex, 64자
```

- `normalizeUrl`: 앞뒤 공백 제거 → 소문자화 → `#fragment` 제거 → 끝 슬래시 제거.
- `dateOnlyUtc`: `publishedAt`의 UTC 기준 날짜만(`YYYY-MM-DD`) 사용 — 같은 날 발행된 동일 URL은
  시각이 달라도 같은 해시가 된다.
- 즉 **같은 URL + 같은 발행일(UTC)** 은 재전송해도 중복으로 판정되어 저장되지 않는다(`skipped`
  카운트만 증가). 발행일이 다르면(예: 다음날) 별도 row로 저장된다.
- `articles.content_hash`에는 DB 유니크 인덱스(`articles_content_hash_idx`)가 걸려 있으며,
  저장은 `onConflictDoNothing`으로 처리한다. **기존에 저장된 row의 content_hash는 소급
  변경하지 않는다.**

## 응답 (200 — 부분 실패 포함)

```jsonc
{
  "requestId": "b6e2...-uuid",
  "inserted": 3,
  "skipped": 1,
  "companiesCreated": 1,
  "alertsInserted": 2,
  "errors": [
    { "index": 4, "title": "...", "url": "...", "error": "url exceeds 1000 characters" }
  ],
  "warnings": [
    { "index": 0, "field": "title", "truncatedFrom": 512, "truncatedTo": 500 }
  ]
}
```

배치 요청 자체는 형식이 올바르면 부분 실패가 있어도 **HTTP 200**으로 응답한다(어떤 기사가
성공/실패했는지는 `errors`/`warnings`로 구분). 서버 로그에는 한 줄 요약만 남는다(키 값 없음):

```
[ingest] source=claude-routine-daily inserted=3 skipped=1 errors=1
```

## 응답 — 오류 케이스

| 상황 | 상태코드 | 본문 |
|---|---|---|
| `INGEST_API_KEY` 미설정 | 503 | `{ "error": "Ingest endpoint disabled" }` |
| 키 없음/불일치 | 401 | `{ "error": "Unauthorized" }` |
| `articles` 201건 이상 | 400 | `{ "error": "Batch too large. Max 200 articles per request." }` |
| 최상위 형식 오류(예: `articles`가 배열이 아님, `source` 누락) | 400 | `{ "error": "...", "issues": ["articles: ...", ...] }` |

## `GET /api/ingest/health`

```jsonc
{ "ok": true }
```

인증(키)이 필요하다. Routine이 본작업 전에 연결/키 유효성을 확인하는 용도.

## curl 예시

```bash
# 연결/키 확인
curl -sS \
  -H "Authorization: Bearer $INGEST_API_KEY" \
  https://robot-info-api.up.railway.app/api/ingest/health

# 기사 배치 저장
curl -sS -X POST \
  -H "Authorization: Bearer $INGEST_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @payload.json \
  https://robot-info-api.up.railway.app/api/ingest/articles
```

`payload.json` 예시는 위 "요청" 섹션 참고.

## 환경변수

| 변수 | 위치 | 설명 |
|---|---|---|
| `INGEST_API_KEY` | Railway `backend` 서비스 | 이 API를 사용하는 모든 클라이언트가 공유하는 비밀 키. 미설정 시 엔드포인트 전체가 503으로 비활성화된다. |
| `INGEST_API_KEY` | Routine 실행 환경(claude.ai Routines) | 위와 **동일한 값**을 설정해야 한다. |

키는 Railway 대시보드(backend 서비스 → Variables)와 Routine 설정 양쪽에 동일하게 등록한다.
키 값은 절대 로그/메일/커밋에 남기지 않는다.

## 제한사항 / 알려진 범위

- rate limiting은 v1 범위에서 미적용(요청 빈도 제한 없음).
- 기존 JWT 로그인 인증(`routes/auth.ts`)과는 완전히 별개의 인증 체계이며, 프런트엔드/관리자
  세션과 연동되지 않는다.
- 이 API는 `articles`/`companies`/`competitive_alerts` 테이블만 다룬다. DB 스키마 변경 없음.
- 기존에 이미 저장된 기사의 `content_hash`는 이 기능 도입으로 소급 재계산되지 않는다.
- `companyCategory`는 자유 텍스트 산업 분류(`robotics`/`automotive`/`electronics` 등)이며,
  기사의 `productType`(`robot|rfm|soc|actuator|none`)과는 **다른 개념**이다.

## 관련 문서

- `docs/ingest/ROUTINE_PROMPTS.md` — claude.ai Routines UI에 붙여넣을 개정 프롬프트 2종.
