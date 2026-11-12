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
      "extractedMetadata": {                   // 임의 JSON (jsonb로 저장, 직렬화 16KB 이하, AI 산출물 예약 키는 제거됨)
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
- `summary`(2000자)/`content`(20000자)가 넘으면 같은 방식으로 **자동으로 잘라서 저장**하고
  `warnings[]`에 `{ index, field, truncatedFrom, truncatedTo }`를 남긴다.
- `extractedMetadata`는 JSON 직렬화 크기가 **16KB(16384바이트)** 를 넘으면 **해당 기사는 저장하지
  않고** `errors[]`에만 기록한다(잘라서 저장하면 구조가 깨지므로 truncate하지 않음).
- `extractedMetadata`의 **AI 산출물 예약 키**는 최상위에서 **제거하고 저장은 진행**한다. 제거할
  때마다 `warnings[]`에 `{ index, field: "extractedMetadata.<키>", removed: true, reason: "reserved_key" }`
  를 남긴다. 예약 키는 서버의 AI 배치(태깅·요약·영상 분석·토픽 분류·이벤트 브리프 등)만 쓰며,
  외부에서 심으면 배치를 우회하고 하류(주간 브리프, ARGOS_I 번들)에서 그대로 신뢰되기 때문이다.
  - 정확히 일치: `aiTags`, `aiSummaryKo`, `aiSummaryKoGeneratedAt`, `geminiAnalysis`,
    `geminiAnalyzedAt`, `geminiAnalysisAttempts`, `handTopics`, `handTopicsAttempts`,
    `domainTopics`, `domainTopicsAttempts`, `appCaseChecked`, `titleKo`, `eventBrief`, `cesDemo`,
    `domainFocus`
  - 접두사: `eventBrief_*`, `eventBriefAttempts_*`, `cesDemo_*`, `cesDemoAttempts_*`
  - 한국어 요약 등은 `summaryKo` 같은 다른 키로 넣으면 그대로 저장된다.
- 제목·요약·본문·알림 제목에 "이전 지시를 무시하라" 류의 문구가 있어도 **저장은 거부하지 않는다**.
  서버가 탐지 건수만 지표(`ops/status`의 `llmGuard`)로 기록하며, 저장된 텍스트는 이후 AI 배치에 보낼
  때마다 정제된 사본이 외부 자료(데이터)로만 전달된다.
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
    { "index": 0, "field": "title", "truncatedFrom": 512, "truncatedTo": 500 },
    { "index": 0, "field": "extractedMetadata.aiTags", "removed": true, "reason": "reserved_key" }
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
| `source` 에 사내 정보 표지가 있음 (아래 "사내 정보 차단") | 400 | `{ "error": "internal_data_rejected", "reasons": ["<코드>", ...] }` |

### 사내 정보 차단 (항목 단위 거부)

ARGOS 는 외부 클라우드이므로 사내 정보가 들어오면 안 된다. 각 `articles[]` 항목의 `url`, `title`, `summary` 와 `alerts[].title/summary` 에
인바운드 가드(`ingest` 프로파일, `docs/argos-i-interface.md` 15.7절)를 적용한다. 이메일, 내부 도메인, 내부 호스트명·경로, 운영자 패턴·용어 해시,
base64 덩어리, 그리고 **헤더·괄호 형태의 분류 라벨**(`[대외비]`, `Confidential —`, `Internal Only` 등)이 있으면 **그 항목만 저장하지 않고**
`errors[]` 에 `{ "index": N, "error": "internal_data_rejected:<코드>[,<코드>...]" }` 로 기록한다.

- 배치는 롤백·중단되지 않는다(나머지 항목은 평소대로 저장). 거부된 항목의 `title`/`url` 은 응답에 되돌려주지 않는다.
- 본문의 일반 단어(예: 뉴스의 "비공개", "기밀")나 숫자+단위는 거부하지 않는다.

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
