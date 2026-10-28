#!/usr/bin/env bash
# ARGOS_I 일일 스냅샷 pull (ZIP 흐름) — bash + curl + unzip + sha256sum.
#
# ARGOS 가 매일 KST 07:00 에 만드는 번들을 latest.zip 한 번으로 받아 압축을 풀고,
# 압축 해제된 manifest.json 의 files[] 기준으로 sha256 을 검증한 뒤 <out>/<날짜>/ 로 옮긴다. ARGOS 는 push 하지 않는다.
#
# 사용법
#   export ARGOS_I_EXPORT_TOKEN='<TOKEN>'     # 필수. 환경변수로만 받는다 (ps 에 보이는 인자로 받지 않는다)
#   scripts/argos-i-pull.sh                   # 최신 번들
#   scripts/argos-i-pull.sh --force           # 로컬에 같은 번들이 있어도 다시 받는다
#   scripts/argos-i-pull.sh --help
#
# 환경변수
#   ARGOS_I_BASE_URL      기본 https://robot-info-api.up.railway.app
#   ARGOS_I_EXPORT_TOKEN  필수 (Bearer 토큰)
#   ARGOS_I_OUT_DIR       기본 ./argos-i-data  →  <out>/<날짜>/...
#
# 권장 cron (사내 서버 시간대 주의 — 아래는 서버가 KST 일 때. 월요일은 주간 브리프 반영을 위해 09:00 KST 이후 한 번 더 실행)
#   0 8 * * *  /opt/argos-i/scripts/argos-i-pull.sh >> /var/log/argos-i-pull.log 2>&1
#   0 9 * * 1  /opt/argos-i/scripts/argos-i-pull.sh >> /var/log/argos-i-pull.log 2>&1
#
# 종료 코드
#   0  성공 또는 이미 최신(up to date)
#   1  일반 오류
#   2  인증 실패 / 비활성 (401 / 503) — 재시도하지 않는다
#   3  받을 번들 없음 (404 no_bundle)
#   4  체크섬 불일치 (1회 재다운로드 후에도)
#   5  재시도 소진 (429 / 5xx / 네트워크, 지수 백오프 2s·4s·8s·16s, 최대 5회)
#
# 토큰은 출력·로그에 남기지 않는다. manifest.json 의 files[] 항목은 키 순서가 고정이다
# ({"path","area","format","sha256","byteSize","recordCount"}) — jq 없이 grep 으로 읽는다.

set -euo pipefail

EXIT_GENERAL=1; EXIT_AUTH=2; EXIT_NO_BUNDLE=3; EXIT_CHECKSUM=4; EXIT_RETRIES=5
MAX_ATTEMPTS=5

log() { echo "[argos-i-pull.sh] $*"; }
die() { local code="$1"; shift; echo "[argos-i-pull.sh] ERROR: $*" >&2; exit "$code"; }

usage() {
  sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'
}

FORCE=0
for arg in "$@"; do
  case "$arg" in
    --help|-h) usage; exit 0 ;;
    --force) FORCE=1 ;;
    *) die "$EXIT_GENERAL" "unknown argument: $arg (see --help)" ;;
  esac
done

[ -n "${ARGOS_I_EXPORT_TOKEN:-}" ] || die "$EXIT_AUTH" "ARGOS_I_EXPORT_TOKEN is not set"
for bin in curl unzip sha256sum; do
  command -v "$bin" >/dev/null 2>&1 || die "$EXIT_GENERAL" "required command not found: $bin"
done

BASE="${ARGOS_I_BASE_URL:-https://robot-info-api.up.railway.app}"
BASE="${BASE%/}"
OUT="${ARGOS_I_OUT_DIR:-./argos-i-data}"
mkdir -p "$OUT"
WORK="$(mktemp -d "${OUT%/}/.tmp-pull.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

# 토큰은 curl 설정을 stdin 으로 넘겨 프로세스 인자에 노출하지 않는다.
# GET <path> <outfile> → HTTP 상태 코드를 HTTP_STATUS 에 둔다. 429/5xx/네트워크 오류는 지수 백오프(2·4·8·16초)로 재시도한다.
HTTP_STATUS=""
http_get() {
  local path="$1" out="$2" attempt status wait retry_after
  for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
    status="$(printf 'header = "Authorization: Bearer %s"\n' "$ARGOS_I_EXPORT_TOKEN" |
      curl -sS -K - -o "$out" -D "$WORK/headers" -w '%{http_code}' "$BASE$path" 2>/dev/null)" || status="000"
    case "$status" in
      200|404) HTTP_STATUS="$status"; return 0 ;;
      401|503) die "$EXIT_AUTH" "authentication failed or export disabled (HTTP $status)" ;;
      429|5??|000)
        if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
          wait=$((2 ** attempt))
          retry_after="$(grep -i '^retry-after:' "$WORK/headers" 2>/dev/null | head -1 | tr -dc '0-9' || true)"
          if [ -n "$retry_after" ] && [ "$retry_after" -gt 0 ] 2>/dev/null; then wait="$retry_after"; fi
          log "HTTP $status; retrying in ${wait}s (attempt $attempt/$MAX_ATTEMPTS)"
          sleep "$wait"
        fi
        ;;
      *) die "$EXIT_GENERAL" "unexpected HTTP $status for $path" ;;
    esac
  done
  die "$EXIT_RETRIES" "retries exhausted (last HTTP $status) for $path"
}

# 1) 목록 manifest → 최신 번들 날짜와 bundleSha256 (latest 객체는 중첩 중괄호가 없다)
http_get "/api/argos-i/manifest" "$WORK/list.json"
[ "$HTTP_STATUS" = "200" ] || die "$EXIT_NO_BUNDLE" "no bundle available"
LATEST_OBJ="$(grep -o '"latest":{[^}]*}' "$WORK/list.json" || true)"
[ -n "$LATEST_OBJ" ] || die "$EXIT_NO_BUNDLE" "no bundle available yet (latest is null)"
DATE="$(echo "$LATEST_OBJ" | grep -o '"date":"[0-9-]*"' | head -1 | cut -d'"' -f4)"
BUNDLE_SHA="$(echo "$LATEST_OBJ" | grep -o '"bundleSha256":"[0-9a-f]*"' | head -1 | cut -d'"' -f4)"
[ -n "$DATE" ] && [ -n "$BUNDLE_SHA" ] || die "$EXIT_GENERAL" "cannot parse the manifest response"

# 2) 이미 같은 번들이면 종료
if [ "$FORCE" -eq 0 ] && [ -f "$OUT/$DATE/.complete" ] && grep -q "\"bundleSha256\":\"$BUNDLE_SHA\"" "$OUT/$DATE/.complete" 2>/dev/null; then
  log "up to date: $DATE (${BUNDLE_SHA:0:12})"
  exit 0
fi

# 3) latest.zip 다운로드 → 압축 해제 → files[] 기준 sha256 검증 (불일치면 1회 재다운로드)
verify_zip() {
  rm -rf "$WORK/x" && mkdir -p "$WORK/x"
  http_get "/api/argos-i/export/latest.zip" "$WORK/latest.zip"
  [ "$HTTP_STATUS" = "200" ] || die "$EXIT_NO_BUNDLE" "no bundle available (latest.zip 404)"
  unzip -q -o "$WORK/latest.zip" -d "$WORK/x" || return 1
  local dir
  dir="$(find "$WORK/x/argos-i" -mindepth 1 -maxdepth 1 -type d | head -1)"
  [ -n "$dir" ] && [ -f "$dir/manifest.json" ] || return 1
  ZIP_DATE="$(basename "$dir")"
  ZIP_DIR="$dir"
  ZIP_BUNDLE_SHA="$(sha256sum "$dir/manifest.json" | cut -d' ' -f1)"   # 번들 식별자 = manifest.json 바이트의 sha256
  # 파일별 sha256 (manifest 의 files[] 항목: path, area, format, sha256 순서)
  grep -o '"path":"[^"]*","area":[^,]*,"format":"[a-z]*","sha256":"[0-9a-f]*"' "$dir/manifest.json" |
    sed -E 's/"path":"([^"]*)".*"sha256":"([0-9a-f]*)"/\2  \1/' > "$WORK/sums.txt"
  [ -s "$WORK/sums.txt" ] || return 1
  # manifest 에 없는 파일이 ZIP 에 있으면 안 된다 (manifest.json 제외)
  local n_listed n_actual
  n_listed="$(wc -l < "$WORK/sums.txt")"
  n_actual="$(find "$dir" -maxdepth 1 -type f ! -name manifest.json | wc -l)"
  [ "$n_listed" -eq "$n_actual" ] || return 1
  (cd "$dir" && sha256sum -c --quiet "$WORK/sums.txt" >/dev/null 2>&1)
}

if ! verify_zip; then
  log "checksum mismatch; downloading once more"
  verify_zip || die "$EXIT_CHECKSUM" "checksum mismatch in latest.zip"
fi
FINAL_DATE="$ZIP_DATE"
[ "$FINAL_DATE" = "$DATE" ] || log "a newer bundle appeared while pulling ($DATE -> $FINAL_DATE)"

# 4) 원자적 이동 + .complete 기록
printf '{"date":"%s","bundleSha256":"%s","pulledAt":"%s"}\n' "$FINAL_DATE" "$ZIP_BUNDLE_SHA" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$ZIP_DIR/.complete"
if [ -d "$OUT/$FINAL_DATE" ]; then mv "$OUT/$FINAL_DATE" "$WORK/old-$FINAL_DATE"; fi
mv "$ZIP_DIR" "$OUT/$FINAL_DATE"
printf '%s\n' "$FINAL_DATE" > "$OUT/.LATEST.tmp" && mv "$OUT/.LATEST.tmp" "$OUT/LATEST"
log "pulled $FINAL_DATE: $(find "$OUT/$FINAL_DATE" -maxdepth 1 -type f ! -name .complete | wc -l) files, bundle=${ZIP_BUNDLE_SHA:0:12}"
