#!/usr/bin/env node
/**
 * ARGOS_I → ARGOS 요청 CLI (참고 구현) — Node 18+, 외부 의존성 없음.
 *
 * ARGOS_I 가 ARGOS 에 공개 자료 추가(add_source)·분석(analyze)·정형 조회(query)를 요청하고 결과를 받아 가는 도구다.
 * `send` 는 전송 전에 반드시 아웃바운드 가드(scripts/lib/argos-i-outbound-guard.mjs)를 통과시킨다. 차단되면 네트워크 호출을 하지 않는다.
 * ARGOS 는 push 하지 않는다 — 결과는 `get`/`wait` 로 폴링하거나 일일 번들의 requests 영역으로 받는다.
 *
 * 사용법
 *   export ARGOS_I_REQUEST_TOKEN='<TOKEN>'    # 필수. 인자로 받지 않는다 (ps 에 노출 방지). pull 토큰(ARGOS_I_EXPORT_TOKEN)과 별개다
 *   node scripts/argos-i-request.mjs send request.json            # JSON 파일 (또는 `-` / 생략 = stdin)
 *   node scripts/argos-i-request.mjs send request.json --approved-by alice --strict
 *   node scripts/argos-i-request.mjs get <id>
 *   node scripts/argos-i-request.mjs list [--status needs_approval,queued] [--since 2026-11-01T00:00:00Z]
 *   node scripts/argos-i-request.mjs cancel <id>
 *   node scripts/argos-i-request.mjs wait <id> [--max-wait-min 30]
 *   node scripts/argos-i-request.mjs --help
 *
 * 요청 JSON 예 (sourcePublic 은 "값이 공개 자료에서 왔음"을 호출자가 증명하는 필드다 — 감사용)
 *   {"type":"add_source","params":{"kind":"arxiv","id":"2401.01234"},"sourcePublic":true}
 *
 * 환경변수
 *   ARGOS_I_BASE_URL                     기본 https://robot-info-api.up.railway.app
 *   ARGOS_I_REQUEST_TOKEN                필수 (Bearer 토큰)
 *   ARGOS_I_REQUEST_LOG                  JSON Lines 로그 경로. 기본 ./argos-i-requests.log.jsonl (시각·요청 id·종류·해시 앞 8자·결과 코드만)
 *   ARGOS_I_OUTBOUND_ALLOWED_HOSTS       추가 허용 호스트 (쉼표·공백 구분, 등록 도메인)
 *   ARGOS_I_OUTBOUND_INTERNAL_DOMAINS    사내 도메인 목록 (기본 도메인에 추가)
 *   ARGOS_I_OUTBOUND_PATTERNS            사내 금지 정규식 (개행 또는 ;; 구분)
 *   ARGOS_I_OUTBOUND_TERMS               사내 금지 용어 평문 (개행·쉼표 구분)
 *   ARGOS_I_OUTBOUND_TERM_HASHES         사내 금지 용어 sha256 목록
 *
 * 종료 코드
 *   0  성공 (wait 는 done)
 *   1  사용법·입력 오류
 *   2  아웃바운드 가드 차단 (전송 안 함)
 *   3  서버 4xx (재시도하지 않는다. 429 는 재시도 소진 후)
 *   4  서버 5xx·네트워크 오류 (재시도 소진 후)
 *   5  wait 타임아웃
 *   6  wait 에서 요청이 failed·rejected·cancelled 로 끝남
 *
 * 재시도: 네트워크·5xx·429 에 대해 1·2·4초 백오프로 최대 3회, 같은 Idempotency-Key(논리 요청당 UUID 자동 생성)를 재사용한다.
 * 토큰은 출력·로그에 쓰지 않는다. params 값과 note 는 로그에 쓰지 않는다.
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createOptions, guardOutbound } from './lib/argos-i-outbound-guard.mjs';

export const EXIT = { OK: 0, USAGE: 1, BLOCKED: 2, HTTP_4XX: 3, HTTP_5XX: 4, WAIT_TIMEOUT: 5, WAIT_FAILED: 6 };

const DEFAULT_BASE_URL = 'https://robot-info-api.up.railway.app';
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const TERMINAL = new Set(['done', 'failed', 'rejected', 'cancelled', 'unsupported']);
const KNOWN_TYPES = new Set(['add_source', 'analyze', 'query']);
const WAIT_START_MS = 30_000;
const WAIT_MAX_INTERVAL_MS = 300_000;
const WAIT_DEFAULT_TOTAL_MS = 30 * 60_000;

const USAGE = [
  'Usage:',
  '  node scripts/argos-i-request.mjs send [file|-] [--approved-by <user>] [--strict]',
  '  node scripts/argos-i-request.mjs get <id>',
  '  node scripts/argos-i-request.mjs list [--status a,b] [--since <ISO>]',
  '  node scripts/argos-i-request.mjs cancel <id>',
  '  node scripts/argos-i-request.mjs wait <id> [--max-wait-min <n>]',
  '',
  'Environment: ARGOS_I_REQUEST_TOKEN (required), ARGOS_I_BASE_URL, ARGOS_I_REQUEST_LOG,',
  '  ARGOS_I_OUTBOUND_ALLOWED_HOSTS / _INTERNAL_DOMAINS / _PATTERNS / _TERMS / _TERM_HASHES',
  'Never pass the token as an argument.',
].join('\n');

const splitList = (raw, sep) => (raw ?? '').split(sep).map((s) => s.trim()).filter(Boolean);

/** 환경변수에서 가드 옵션을 만든다 */
export function guardOptionsFromEnv(env, extra = {}) {
  return createOptions({
    allowedHosts: undefined,
    ...(env.ARGOS_I_OUTBOUND_ALLOWED_HOSTS ? { allowedHosts: [...new Set([...splitList(env.ARGOS_I_OUTBOUND_ALLOWED_HOSTS, /[\s,;]+/), 'youtube.com', 'youtu.be', 'arxiv.org'])] } : {}),
    internalDomains: splitList(env.ARGOS_I_OUTBOUND_INTERNAL_DOMAINS, /[\s,;]+/),
    patterns: splitList(env.ARGOS_I_OUTBOUND_PATTERNS, /\r?\n|;;/),
    terms: splitList(env.ARGOS_I_OUTBOUND_TERMS, /\r?\n|,/),
    termHashes: splitList(env.ARGOS_I_OUTBOUND_TERM_HASHES, /[\s,;]+/),
    ...extra,
  });
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict' || a === '--help' || a === '-h') flags[a.replace(/^-+/, '')] = true;
    else if (a.startsWith('--')) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`missing value for ${a}`);
      flags[a.slice(2)] = v;
      i += 1;
    } else positional.push(a);
  }
  return { positional, flags };
}

class UsageError extends Error {}

/**
 * CLI 본체 — 테스트에서 fetch·sleep·stdin·출력·시계를 주입한다.
 * @returns {Promise<number>} 종료 코드
 */
export async function run(argv, env = process.env, io = {}) {
  const out = io.stdout ?? ((s) => process.stdout.write(`${s}\n`));
  const err = io.stderr ?? ((s) => process.stderr.write(`${s}\n`));
  const fetchImpl = io.fetch ?? globalThis.fetch;
  const sleep = io.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = io.now ?? (() => new Date());
  const readStdin = io.readStdin ?? (async () => fs.readFileSync(0, 'utf8'));
  const readFile = io.readFile ?? ((p) => fs.readFileSync(p, 'utf8'));
  const appendLog = io.appendLog ?? ((line) => fs.appendFileSync(env.ARGOS_I_REQUEST_LOG || './argos-i-requests.log.jsonl', `${line}\n`));
  const uuid = io.uuid ?? randomUUID;

  /** 전송 로그 — 시각, 요청 id, 종류, 해시 앞 8자, 결과 코드만 (params 값·note·토큰은 쓰지 않는다) */
  const log = (entry) => {
    try {
      appendLog(JSON.stringify({ ts: now().toISOString(), id: entry.id ?? null, type: KNOWN_TYPES.has(entry.type) ? entry.type : null, hash8: entry.hash8 ?? null, result: entry.result }));
    } catch {
      // 로그 실패는 요청 결과에 영향을 주지 않는다
    }
  };

  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (e) {
    err(`${e.message}\n\n${USAGE}`);
    return EXIT.USAGE;
  }
  const { positional, flags } = parsed;
  const [cmd, arg] = positional;
  if (flags.help || flags.h || !cmd) {
    out(USAGE);
    return cmd || flags.help || flags.h ? EXIT.OK : EXIT.USAGE;
  }
  if (!['send', 'get', 'list', 'cancel', 'wait'].includes(cmd)) {
    err(`unknown command\n\n${USAGE}`);
    return EXIT.USAGE;
  }

  const token = (env.ARGOS_I_REQUEST_TOKEN ?? '').trim();
  const base = (env.ARGOS_I_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  /** HTTP 호출 (재시도 포함). 같은 헤더(Idempotency-Key 포함)를 모든 시도에 쓴다. */
  async function call(method, path, { body, idempotencyKey } = {}) {
    let attempt = 0;
    for (;;) {
      let res;
      try {
        res = await fetchImpl(`${base}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch {
        res = null; // 네트워크 오류 (메시지에 URL 이 들어 있을 수 있어 버린다)
      }
      const status = res ? res.status : 0;
      const retryable = status === 0 || status >= 500 || status === 429;
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) {
        let json = null;
        if (res) json = await res.json().catch(() => null);
        return { status, json };
      }
      let delay = RETRY_DELAYS_MS[attempt];
      const ra = res?.headers?.get?.('retry-after');
      if (status === 429 && ra && Number.isFinite(Number(ra))) delay = Math.max(delay, Math.min(60_000, Number(ra) * 1000));
      attempt += 1;
      await sleep(delay);
    }
  }

  const exitForStatus = (status) => (status >= 200 && status < 300 ? EXIT.OK : status >= 400 && status < 500 ? EXIT.HTTP_4XX : EXIT.HTTP_5XX);

  /** 응답 출력 + 종료 코드. 4xx 오류 본문은 코드만 담고 있다 */
  function finish(res, ctx) {
    const code = exitForStatus(res.status);
    const tag = res.status === 0 ? 'network_error' : `http_${res.status}${res.json?.error ? `:${String(res.json.error).slice(0, 40)}` : ''}`;
    log({ id: res.json?.id ?? ctx.id ?? null, type: ctx.type, hash8: ctx.hash8, result: tag });
    if (code === EXIT.OK) {
      out(JSON.stringify(res.json));
    } else {
      err(res.status === 0 ? 'network error (retries exhausted)' : `HTTP ${res.status}${res.json ? ` ${JSON.stringify(res.json)}` : ''}`);
      if (res.json?.error === 'internal_data_rejected') {
        err('서버 가드가 사내 정보 의심으로 거부했습니다. 재시도하지 말고 운영자에게 알리세요 (아웃바운드 가드를 점검해야 합니다).');
      }
    }
    return code;
  }

  if (!token) {
    err('ARGOS_I_REQUEST_TOKEN is not set');
    return EXIT.USAGE;
  }

  switch (cmd) {
    case 'send': {
      let text;
      try {
        text = !arg || arg === '-' ? await readStdin() : readFile(arg);
      } catch {
        err('cannot read the request file');
        return EXIT.USAGE;
      }
      let request;
      try {
        request = JSON.parse(text);
      } catch {
        err('request is not valid JSON'); // 입력 일부를 에코하지 않는다
        return EXIT.USAGE;
      }

      // 1) 아웃바운드 가드 — 차단 시 네트워크 호출을 하지 않는다
      const verdict = guardOutbound(request, guardOptionsFromEnv(env, { approvedBy: flags['approved-by'], strict: flags.strict === true, now: now() }));
      const type = request && typeof request === 'object' ? request.type : null;
      if (!verdict.ok) {
        const codes = [...verdict.reasons, ...verdict.outboundOnly];
        log({ type, hash8: verdict.hash8, result: `blocked:${codes.join(',') || verdict.kind}` });
        err(`BLOCKED (not sent): ${codes.join(', ') || verdict.kind}`);
        if (verdict.outboundOnly.includes('note_not_approved')) err('note 는 사람 승인이 필요합니다: --approved-by <사용자> (승인 UI 와 연동)');
        return EXIT.BLOCKED;
      }
      if (verdict.removedKeyCount > 0) err(`removed ${verdict.removedKeyCount} unknown key(s) before sending`);

      // 2) 전송 — 논리 요청당 하나의 멱등 키
      const key = uuid();
      const res = await call('POST', '/api/argos-i/requests', { body: verdict.body, idempotencyKey: key });
      return finish(res, { type: verdict.body.type, hash8: verdict.hash8 });
    }

    case 'get':
    case 'cancel': {
      if (!arg) {
        err(`${cmd} requires an id`);
        return EXIT.USAGE;
      }
      const res = await call(cmd === 'get' ? 'GET' : 'DELETE', `/api/argos-i/requests/${encodeURIComponent(arg)}`);
      return finish(res, { id: arg, type: res.json?.type ?? null, hash8: null });
    }

    case 'list': {
      const qs = new URLSearchParams();
      if (flags.status) qs.set('status', String(flags.status));
      if (flags.since) qs.set('since', String(flags.since));
      const res = await call('GET', `/api/argos-i/requests${[...qs].length ? `?${qs.toString()}` : ''}`);
      return finish(res, { type: null, hash8: null });
    }

    case 'wait': {
      if (!arg) {
        err('wait requires an id');
        return EXIT.USAGE;
      }
      const totalMs = flags['max-wait-min'] ? Number(flags['max-wait-min']) * 60_000 : WAIT_DEFAULT_TOTAL_MS;
      if (!Number.isFinite(totalMs) || totalMs <= 0) {
        err('--max-wait-min must be a positive number');
        return EXIT.USAGE;
      }
      const started = now().getTime();
      let interval = WAIT_START_MS;
      for (;;) {
        const res = await call('GET', `/api/argos-i/requests/${encodeURIComponent(arg)}`);
        if (res.status < 200 || res.status >= 300) return finish(res, { id: arg, type: null, hash8: null });
        const status = res.json?.status;
        if (TERMINAL.has(status)) {
          log({ id: arg, type: res.json?.type ?? null, hash8: null, result: `wait_${status}` });
          out(JSON.stringify(res.json));
          return status === 'done' ? EXIT.OK : EXIT.WAIT_FAILED;
        }
        err(status === 'needs_approval' ? '관리자 승인 대기 중 (needs_approval)' : `status=${status ?? 'unknown'}`);
        if (now().getTime() - started + interval > totalMs) {
          log({ id: arg, type: res.json?.type ?? null, hash8: null, result: 'wait_timeout' });
          err('wait timed out');
          return EXIT.WAIT_TIMEOUT;
        }
        await sleep(interval);
        interval = Math.min(WAIT_MAX_INTERVAL_MS, Math.round(interval * 1.5));
      }
    }
  }
  return EXIT.USAGE;
}

// 직접 실행일 때만 main 을 돈다 (import 해서 테스트할 때는 실행하지 않는다)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2)).then(
    (code) => process.exit(code),
    () => {
      console.error('unexpected error');
      process.exit(EXIT.HTTP_5XX);
    },
  );
}
