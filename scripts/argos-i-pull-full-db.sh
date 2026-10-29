#!/usr/bin/env bash
# ARGOS_I 전체 DB 덤프 pull (1회성 초기 적재용) — bash + curl + unzip + sha256sum.
#
# ARGOS 의 GET /api/argos-i/export/full-db.zip 을 받아 `unzip -t` 로 완전성을 확인하고, 풀어서 manifest.json 기준으로
# 테이블별 바이트·sha256 을 검증한 뒤 적재 스크립트(scripts/argos-i-import-full-db.mjs)에 넘길 디렉터리 경로를 출력한다.
# 일일 번들(argos-i-pull.sh)과는 별개다. 덤프에는 수집 원문이 포함되어 있다 — 사내 이전 한정, 외부 재배포 금지, 적재 후 삭제.
#
# 사용법
#   export ARGOS_I_EXPORT_TOKEN='<TOKEN>'                    # 필수. 환경변수로만 받는다 (ps 에 보이는 인자로 받지 않는다)
#   scripts/argos-i-pull-full-db.sh                          # 전체 덤프
#   scripts/argos-i-pull-full-db.sh --tables articles,companies   # 분할 다운로드 (zip32Risk 이거나 응답 시간 제한이 의심될 때)
#   scripts/argos-i-pull-full-db.sh --keep-zip               # 검증 후에도 ZIP 보관
#   scripts/argos-i-pull-full-db.sh --no-extract             # 받아서 unzip -t 만 (해제·sha256 검증 생략, ZIP 보관)
#   scripts/argos-i-pull-full-db.sh --retries 3              # 실패 시 처음부터 다시 받는 횟수 (기본 2)
#   scripts/argos-i-pull-full-db.sh --help
#
# 환경변수
#   ARGOS_I_BASE_URL          기본 https://robot-info-api.up.railway.app
#   ARGOS_I_EXPORT_TOKEN      필수 (Bearer 토큰)
#   ARGOS_I_FULL_DB_OUT_DIR   기본 ./argos-i-full-db-data  →  <out>/argos-i-full-db/<YYYYMMDDTHHMMSSZ>/
#
# 서버 쪽에서 ARGOS_I_FULL_DB_ENABLED=true 가 설정되어 있어야 한다 (아니면 종료 코드 2).
# 서버 부하를 피하려고 KST 03:00~07:30(크롤러·태깅·파이프라인·일일 번들) 시간대는 피한다.
#
# 종료 코드
#   0  성공 (마지막 줄에 적재 스크립트에 넘길 디렉터리 경로를 출력)
#   1  일반 오류 (잘못된 인자, tables, unzip 없음)
#   2  인증 실패·비활성 (401, 503 argos_i_export_disabled / full_db_disabled, enabled=false) — 재시도하지 않는다
#   4  체크섬 불일치 또는 manifest.json 없음(불완전 ZIP) — 재시도 소진 후
#   5  재시도 소진 (429 / 5xx / 네트워크)
#   6  다른 덤프가 진행 중 (409) — 잠시 뒤 다시 실행
#
# 토큰은 출력·로그에 남기지 않는다. manifest.json 은 압축형(공백 없음)이며 키 순서가 고정이라 jq 없이 grep 으로 읽는다.

set -euo pipefail

EXIT_GENERAL=1; EXIT_AUTH=2; EXIT_INTEGRITY=4; EXIT_RETRIES=5; EXIT_BUSY=6

log() { echo "[argos-i-pull-full-db.sh] $*"; }
die() { local code="$1"; shift; echo "[argos-i-pull-full-db.sh] ERROR: $*" >&2; exit "$code"; }

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'
}

TABLES=""
KEEP_ZIP=0
NO_EXTRACT=0
RETRIES=2
while [ $# -gt 0 ]; do
  case "$1" in
    --help|-h) usage; exit 0 ;;
    --keep-zip) KEEP_ZIP=1 ;;
    --no-extract) NO_EXTRACT=1 ;;
    --tables)
      [ $# -ge 2 ] || die "$EXIT_GENERAL" "--tables needs a value"
      TABLES="$2"; shift ;;
    --tables=*) TABLES="${1#--tables=}" ;;
    --retries)
      [ $# -ge 2 ] || die "$EXIT_GENERAL" "--retries needs a value"
      RETRIES="$2"; shift ;;
    --retries=*) RETRIES="${1#--retries=}" ;;
    *) die "$EXIT_GENERAL" "unknown argument: $1 (see --help)" ;;
  esac
  shift
done
[[ "$RETRIES" =~ ^[0-9]+$ ]] && [ "$RETRIES" -le 10 ] || die "$EXIT_GENERAL" "--retries must be an integer 0..10"
if [ -n "$TABLES" ]; then
  [[ "$TABLES" =~ ^[a-z_][a-z0-9_]{0,62}(,[a-z_][a-z0-9_]{0,62})*$ ]] || die "$EXIT_GENERAL" "--tables must be a comma-separated list of table names"
fi

[ -n "${ARGOS_I_EXPORT_TOKEN:-}" ] || die "$EXIT_AUTH" "ARGOS_I_EXPORT_TOKEN is not set"
for bin in curl unzip sha256sum; do
  command -v "$bin" >/dev/null 2>&1 || die "$EXIT_GENERAL" "required command not found: $bin"
done

BASE="${ARGOS_I_BASE_URL:-https://robot-info-api.up.railway.app}"
BASE="${BASE%/}"
OUT="${ARGOS_I_FULL_DB_OUT_DIR:-./argos-i-full-db-data}"
mkdir -p "$OUT"
WORK="$(mktemp -d "${OUT%/}/.tmp-pull.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

# 토큰은 curl 설정을 stdin 으로 넘겨 프로세스 인자에 노출하지 않는다.
# curl_get <path> <outfile> → HTTP 상태 코드를 HTTP_STATUS 에 둔다 (네트워크 오류·중간 끊김은 000)
HTTP_STATUS=""
curl_get() {
  local path="$1" out="$2" status
  status="$(printf 'header = "Authorization: Bearer %s"\n' "$ARGOS_I_EXPORT_TOKEN" |
    curl -sS -K - -o "$out" -D "$WORK/headers" -w '%{http_code}' "$BASE$path" 2>/dev/null)" || status="000"
  HTTP_STATUS="$status"
}

# 응답 본문(JSON)의 error 코드
error_code() { grep -o '"error":"[a-z_A-Z]*"' "$1" 2>/dev/null | head -1 | cut -d'"' -f4 || true; }

# 상태 코드 처리: 치명적이면 종료, 재시도 대상이면 RETRY_MSG 를 채우고 1 을 돌려준다
RETRY_MSG=""
RETRY_AFTER=""
handle_status() {
  local status="$1" body="$2" code
  case "$status" in
    200) return 0 ;;
    401) die "$EXIT_AUTH" "authentication failed (HTTP 401): check ARGOS_I_EXPORT_TOKEN" ;;
    503)
      code="$(error_code "$body")"
      if [ "$code" = "full_db_disabled" ]; then die "$EXIT_AUTH" "full DB dump is disabled on the server (set ARGOS_I_FULL_DB_ENABLED=true, then redeploy)"; fi
      die "$EXIT_AUTH" "export API is disabled on the server (ARGOS_I_EXPORT_TOKEN not configured)" ;;
    409) die "$EXIT_BUSY" "another full DB dump is in progress (HTTP 409): try again in a minute" ;;
    400) die "$EXIT_GENERAL" "bad request (HTTP 400, $(error_code "$body")): check --tables" ;;
    429|5??|000)
      RETRY_MSG="HTTP $status"
      RETRY_AFTER="$(grep -i '^retry-after:' "$WORK/headers" 2>/dev/null | head -1 | tr -dc '0-9' || true)"
      return 1 ;;
    *) die "$EXIT_GENERAL" "unexpected HTTP $status" ;;
  esac
}

# 1) 사전 확인
curl_get "/api/argos-i/export/full-db/manifest" "$WORK/preview.json"
handle_status "$HTTP_STATUS" "$WORK/preview.json" || die "$EXIT_RETRIES" "cannot read the preview manifest ($RETRY_MSG)"
grep -q '"enabled":true' "$WORK/preview.json" || die "$EXIT_AUTH" "full DB dump is disabled on the server (enabled=false): set ARGOS_I_FULL_DB_ENABLED=true and redeploy"
N_TABLES="$(grep -o '"loadByDefault"' "$WORK/preview.json" | wc -l | tr -d ' ' || true)"
TOTALS="$(grep -o '"totals":{[^}]*}' "$WORK/preview.json" | head -1 || true)"
log "server: $N_TABLES tables, ${TOTALS:-totals unknown}"
if grep -q '"inProgress":true' "$WORK/preview.json"; then log "WARN: another dump looks to be in progress; a 409 is likely"; fi
if grep -q '"zip32Risk":true' "$WORK/preview.json"; then log "WARN: estimated size is above 3 GiB (ZIP32 limit risk): split the download with --tables a,b and repeat for the remaining tables"; fi
if [ -n "$TABLES" ]; then
  IFS=',' read -r -a WANT <<< "$TABLES"
  for t in "${WANT[@]}"; do
    grep -q "\"name\":\"$t\",\"estimatedRows\"" "$WORK/preview.json" || die "$EXIT_GENERAL" "unknown or excluded table: $t"
  done
fi

# 2) 다운로드 + 검증 (실패하면 처음부터 다시). 반환: 0 성공 / 1 재시도 가능 실패(RETRY_MSG, FAIL_KIND)
FAIL_KIND="retries"
DUMP_DIR=""
DUMP_TS=""
attempt() {
  local url_path="/api/argos-i/export/full-db.zip" zip="$WORK/full-db.zip" first last prefix lines n_listed
  [ -n "$TABLES" ] && url_path="$url_path?tables=$TABLES"
  rm -rf "$WORK/x" "$zip"
  log "downloading the ZIP (streamed to disk)..."
  curl_get "$url_path" "$zip"
  if ! handle_status "$HTTP_STATUS" "$zip"; then FAIL_KIND="retries"; return 1; fi
  log "downloaded $(( $(wc -c < "$zip") / 1000000 )) MB"

  if ! unzip -tq "$zip" >/dev/null 2>&1; then RETRY_MSG="unzip -t failed: the ZIP is incomplete or corrupt (the transfer was probably cut off)"; FAIL_KIND="integrity"; return 1; fi
  lines="$(unzip -Z1 "$zip")"
  last="$(printf '%s\n' "$lines" | tail -1)"
  if ! [[ "$last" =~ ^(argos-i-full-db/[0-9]{8}T[0-9]{6}Z)/manifest\.json$ ]]; then
    RETRY_MSG="manifest.json is missing from the ZIP: the dump was aborted on the server"; FAIL_KIND="integrity"; return 1
  fi
  prefix="${BASH_REMATCH[1]}"
  n_listed="$(printf '%s\n' "$lines" | grep -vc "^$prefix/" || true)"
  [ "$n_listed" = "0" ] || { RETRY_MSG="unexpected entries outside $prefix/"; FAIL_KIND="integrity"; return 1; }
  DUMP_TS="${prefix##*/}"
  if [ "$NO_EXTRACT" -eq 1 ]; then return 0; fi

  mkdir -p "$WORK/x"
  unzip -q -o "$zip" -d "$WORK/x" || die "$EXIT_GENERAL" "unzip failed"
  local dir="$WORK/x/$prefix"
  [ -f "$dir/manifest.json" ] || { RETRY_MSG="manifest.json is missing after extraction"; FAIL_KIND="integrity"; return 1; }
  grep -q '"dumpFormatVersion":1' "$dir/manifest.json" || die "$EXIT_GENERAL" "unsupported dumpFormatVersion; update the scripts"

  # manifest.json (압축형, 키 순서 고정): files.README.md / files.schema.json, tables[] = name,path,rows,jsonlBytes,sha256
  : > "$WORK/sums.txt"
  local readme_sha schema_sha
  readme_sha="$(grep -o '"README.md":"[0-9a-f]\{64\}"' "$dir/manifest.json" | head -1 | cut -d'"' -f4 || true)"
  schema_sha="$(grep -o '"schema.json":"[0-9a-f]\{64\}"' "$dir/manifest.json" | head -1 | cut -d'"' -f4 || true)"
  [ -n "$readme_sha" ] && [ -n "$schema_sha" ] || { RETRY_MSG="manifest.json has no README/schema checksums"; FAIL_KIND="integrity"; return 1; }
  printf '%s  %s\n%s  %s\n' "$readme_sha" "README.md" "$schema_sha" "schema.json" >> "$WORK/sums.txt"
  grep -o '"path":"tables/[a-z_][a-z0-9_]*\.jsonl","rows":[0-9]*,"jsonlBytes":[0-9]*,"sha256":"[0-9a-f]\{64\}"' "$dir/manifest.json" |
    sed -E 's/"path":"([^"]*)","rows":[0-9]*,"jsonlBytes":([0-9]*),"sha256":"([0-9a-f]*)"/\3  \1 \2/' > "$WORK/tables.txt" || true
  local sha path bytes actual bad=0 count=0
  while read -r sha path bytes; do
    count=$((count + 1))
    echo "$sha  $path" >> "$WORK/sums.txt"
    actual="$(wc -c < "$dir/$path" 2>/dev/null | tr -d ' ' || echo -1)"
    [ "$actual" = "$bytes" ] || { log "size mismatch: $path (expected $bytes, got $actual)"; bad=1; }
  done < "$WORK/tables.txt"
  local declared
  declared="$(grep -o '"totals":{"tableCount":[0-9]*' "$dir/manifest.json" | head -1 | grep -o '[0-9]*$' || echo -1)"
  [ "$declared" = "$count" ] || { log "manifest lists $declared tables but $count entries were parsed"; bad=1; }
  (cd "$dir" && sha256sum -c --quiet "$WORK/sums.txt" >/dev/null 2>&1) || bad=1
  if [ "$bad" -ne 0 ]; then RETRY_MSG="checksum mismatch"; FAIL_KIND="integrity"; return 1; fi
  log "verified $count tables (README.md, schema.json, tables/*.jsonl)"
  DUMP_DIR="$dir"
  return 0
}

MAX_ATTEMPTS=$((RETRIES + 1))
OK=0
for n in $(seq 1 "$MAX_ATTEMPTS"); do
  if attempt; then OK=1; break; fi
  log "$RETRY_MSG (attempt $n/$MAX_ATTEMPTS)"
  if [ "$n" -lt "$MAX_ATTEMPTS" ]; then
    wait=$((5 * n))
    if [ -n "$RETRY_AFTER" ] && [ "$RETRY_AFTER" -gt 0 ] 2>/dev/null; then wait=$(( RETRY_AFTER > 120 ? 120 : RETRY_AFTER )); fi
    log "restarting from scratch in ${wait}s"
    sleep "$wait"
  fi
done
if [ "$OK" -ne 1 ]; then
  if [ "$FAIL_KIND" = "integrity" ]; then die "$EXIT_INTEGRITY" "$RETRY_MSG; giving up after $MAX_ATTEMPTS attempt(s)"; fi
  die "$EXIT_RETRIES" "$RETRY_MSG; giving up after $MAX_ATTEMPTS attempt(s)"
fi

# 3) 최종 위치로 이동
if [ "$NO_EXTRACT" -eq 1 ]; then
  FINAL_ZIP="$OUT/argos-i-full-db_${DUMP_TS}.zip"
  mv "$WORK/full-db.zip" "$FINAL_ZIP"
  log "ZIP verified with unzip -t (not extracted): $FINAL_ZIP"
  echo "$FINAL_ZIP"
  exit 0
fi
mkdir -p "$OUT/argos-i-full-db"
FINAL_DIR="$OUT/argos-i-full-db/$DUMP_TS"
rm -rf "$FINAL_DIR"
mv "$DUMP_DIR" "$FINAL_DIR"
if [ "$KEEP_ZIP" -eq 1 ]; then
  mv "$WORK/full-db.zip" "$OUT/argos-i-full-db_${DUMP_TS}.zip"
  log "kept ZIP: $OUT/argos-i-full-db_${DUMP_TS}.zip"
fi
log "done. This data contains original text: internal use only; delete the files after loading."
log "next: DATABASE_URL=<ARGOS_I DB> node scripts/argos-i-import-full-db.mjs $FINAL_DIR --dry-run"
echo "$FINAL_DIR"
