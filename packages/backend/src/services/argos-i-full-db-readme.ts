/**
 * ARGOS_I 전체 DB 덤프 — ZIP 안 README.md 본문 (정적 템플릿 + 생성 시각). 순수 함수.
 * 토큰·접속 정보·행 데이터는 넣지 않는다.
 */

import { FULL_DB_DUMP_FORMAT_VERSION } from './argos-i-full-db-config.js';

export interface FullDbReadmeContext {
  generatedAt: Date;
  selection: 'all' | 'subset';
  tableCount: number;
}

export function buildFullDbReadme(ctx: FullDbReadmeContext): string {
  const when = ctx.generatedAt.toISOString();
  const selectionLine =
    ctx.selection === 'all' ? '이 덤프는 포함 대상 테이블 전체를 담고 있다.' : '이 덤프는 `?tables=` 로 고른 일부 테이블만 담은 부분 덤프이다 (`manifest.json` 의 `selectedTables` 참조).';
  return `# ARGOS_I 초기 적재용 전체 DB 덤프

- 생성 시각(스냅샷, UTC): ${when}
- 덤프 형식 버전: ${FULL_DB_DUMP_FORMAT_VERSION}
- 테이블 수(이 파일에 담긴 수): ${ctx.tableCount}

${selectionLine}

## 1. 이 덤프의 성격

- **원문 포함, 사내 이전용, 1회성 초기 적재 전용**이다. 일일 번들(\`argos-i/YYYY-MM-DD/\`)은 "원문 제외, 파생 데이터만"이 원칙인데, 이 덤프는 그 원칙의 의도된 예외이다.
- 수집 원문(\`articles.content\` 등)이 들어 있다. **외부 재배포 금지**, 사내 ARGOS_I 서버로의 이전 목적으로만 사용한다.
- 적재가 끝나면 이 파일들을 안전하게 삭제한다.
- 증분 동기화가 아니다. 이후의 변경분은 일일 번들을 쓴다.

## 2. 구조와 파일 목록

\`\`\`
argos-i-full-db/<YYYYMMDDTHHMMSSZ>/      (UTC)
  README.md          이 파일
  schema.json        테이블·컬럼·FK·키·시퀀스·적재 순서(loadOrder)
  tables/<table>.jsonl   테이블별 데이터 (한 줄에 한 행, UTF-8, LF)
  manifest.json      ZIP 의 마지막 엔트리. 테이블별 행 수·바이트·sha256, 제외 목록
\`\`\`

- JSONL 의 키 순서는 \`schema.json\` 의 컬럼 순서이다. 행이 0건인 테이블도 빈 파일로 들어 있다.
- \`tables/\` 파일은 \`loadOrder\`(FK 부모가 먼저) 순서로 ZIP 에 기록되어 있다.

## 3. 값 인코딩 규칙 (요약)

| PG 타입 | JSONL 값 |
|---|---|
| bool, int2, int4 | JSON boolean / number |
| int8 | **문자열** (정밀도 보존) |
| numeric | **문자열** (scale 보존, 특수값 \`"NaN"\`) |
| float4, float8 | JSON number. NaN·±Infinity 는 문자열 \`"NaN"\`, \`"Infinity"\`, \`"-Infinity"\` |
| text, varchar, bpchar, uuid | 문자열 |
| date | \`YYYY-MM-DD\` (\`"infinity"\`, \`"-infinity"\` 가능) |
| timestamp (tz 없음) | \`YYYY-MM-DDTHH:MM:SS[.ffffff]Z\` — 저장값은 UTC wall-clock 이며 \`Z\` 는 표기일 뿐이다. 적재 시 \`::timestamp\` 로 캐스트한다 |
| timestamptz | 같은 형식 (UTC) |
| json, jsonb | JSON 값 그대로. SQL NULL 은 \`null\`, JSON null 스칼라는 \`{"$jsonNull":true}\` |
| bytea | \`{"$bytea":"<base64>"}\` |
| 배열 (\`text[]\` 등) | JSON 배열 |
| 그 밖의 타입 | \`::text\` 문자열 (schema.json 의 \`dumpEncoding: "text_cast"\`) |

NULL 은 모든 타입에서 JSON \`null\` 이다.

## 4. 제외 항목

\`manifest.json\` 의 \`excludedTables\`, \`excludedColumns\`, \`allowlistedColumns\`, \`nullifiedFkColumns\`, \`scrubbedJsonKeys\` 에 기록되어 있다.

- 제외 테이블: 계정(\`users\`), 가입 허용 이메일, 감사 로그, AI 사용 로그, 일일 번들 저장소.
- 제외 컬럼: 이름에 \`password\`, \`secret\`, \`token\`, \`api_key\`, \`apikey\`, \`credential\` 이 들어간 컬럼 (LLM 토큰 사용량 컬럼 4개는 허용 목록으로 포함).
- 제외 테이블(\`users\`)을 가리키는 FK 컬럼은 모두 NULL 로 내보냈다.
- \`regulatory_sources.config\` 는 비밀 이름의 JSON 키를 제거했다.
- \`users\` 가 없으므로 \`pm_*\`, \`issue_*\`, \`report_downloads.user_id\` 등의 사용자 id 는 ARGOS_I 에서 가리키는 계정이 없다.
- \`regulatory_documents\` 의 업로드 파일 본체는 DB 에 없으므로 메타데이터 행만 들어 있다.

## 5. data_migrations 는 적재하지 말 것

\`data_migrations\` 테이블은 덤프에 들어 있지만 \`manifest.json\` 에 \`loadByDefault: false\` 로 표시되어 있다. **마커 키 충돌, ARGOS_I에서는 적재하지 말 것.** 적재 스크립트는 기본으로 이 테이블을 건너뛴다.

## 6. 적재 절차 요약

1. ARGOS_I 서버에서 같은 소스 버전을 체크아웃하고 \`npm ci\` 한 뒤, DB 를 만들고 \`npm run db:migrate\` 후 백엔드를 \`DISABLE_SCHEDULER=true\` 로 한 번 기동해 런타임 테이블을 만든 다음 중지한다.
2. ZIP 을 풀면 \`argos-i-full-db/<ts>/\` 폴더가 나온다.
3. 저장소 루트에서:

\`\`\`
DATABASE_URL=postgres://... node scripts/argos-i-import-full-db.mjs ./argos-i-full-db/<ts> --dry-run
DATABASE_URL=postgres://... node scripts/argos-i-import-full-db.mjs ./argos-i-full-db/<ts> --mode truncate --yes
\`\`\`

첫 적재는 \`--mode truncate --yes\` 를 권장한다 (기동 시 시드가 만든 행과 유니크 키가 충돌한다). 자세한 옵션과 종료 코드는 \`docs/argos-i-interface.md\` 14절을 본다.

## 7. 무결성 검증

- \`unzip -t <파일>.zip\` 이 통과해야 하고, ZIP 에 \`manifest.json\` 이 있어야 완전한 덤프이다. \`manifest.json\` 이 없는 ZIP 은 전송 중 중단된 불완전 덤프이므로 버리고 다시 받는다.
- \`manifest.json\` 의 테이블별 \`rows\`, \`jsonlBytes\`, \`sha256\` 은 압축 해제된 JSONL 기준이다. \`README.md\`, \`schema.json\` 의 sha256 은 \`files\` 에 있다.
- 적재 스크립트는 쓰기 전에 모든 파일의 sha256 을 대조하고, 하나라도 다르면 종료 코드 3 으로 끝난다 (\`--verify-only\` 로 검증만 할 수 있다).
`;
}
