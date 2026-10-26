/**
 * DEPRECATED (2026-10): 일일 메일 뉴스레터는 ARGOS 주간 브리프 페이지(/share/weekly)로 대체되었다.
 * 주간 브리프는 백엔드 서비스(packages/backend/src/services/weekly-brief.service.ts)가 매주 월 08:00 KST 에
 * 직전 월~일 구간으로 자동 발행하며, 메일은 더 이상 발송하지 않는다.
 * 이 파일(send-daily-newsletter.ts 가 사용하는 메일 발송 모듈)은 삭제하지 않고 남겨 둔다 — 메일 발송이 다시 필요하면 관련 환경 변수만 복구해 사용할 수 있다. 로직은 변경하지 않았다.
 */
/**
 * ARGOS Newsletter mail sender
 *  - Brevo HTTPS API (443) : sendWithBrevo  (Railway 등 SMTP 포트 차단 환경용)
 *  - Gmail SMTP            : sendWithRetry  (retry / port fallback / per-attempt hard deadline)
 *  - sendMail              : provider 에 따라 위 둘 중 하나를 호출하는 디스패처
 *
 * send-daily-newsletter.ts 에서 사용한다. 이 모듈은 import 해도 부작용이 없다
 * (main() 실행, process.exit, DB Pool 생성, 네트워크, 타이머 없음). 스모크: newsletter-mailer.smoke.ts
 */

import net from 'node:net';
import type { EventEmitter } from 'node:events';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

// ── Constants ───────────────────────────────────────────────
export const SMTP_HOST = 'smtp.gmail.com';
export const DEFAULT_ROUNDS = 3;
export const DEFAULT_WAIT_MS = 60_000;
export const DEFAULT_ATTEMPT_DEADLINE_MS = 30_000;

export const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
export const BREVO_ATTEMPT_TIMEOUT_MS = 30_000;
export const BREVO_MAX_ATTEMPTS = 3;
export const BREVO_WAIT_MS = 60_000;
export const SMTP_PROBE_TIMEOUT_MS = 5_000;
export const SMTP_PROBE_PORT = 465;
export const DEFAULT_SENDER_NAME = 'ARGOS War Room';

const MAX_LOGGED_TEXT = 200;

const SOCKET_TIMEOUT_MS = 30_000; // connectionTimeout / greetingTimeout / socketTimeout 공통
const DNS_TIMEOUT_MS = 10_000;

/** 재시도해도 성공할 수 없는(또는 계정 잠금 위험이 있는) 오류 코드 */
const FATAL_ERROR_CODES = new Set(['EAUTH', 'EENVELOPE', 'EMESSAGE']);

const LOG_PREFIX = '[ARGOS Newsletter]';
const MAIL_LOG_PREFIX = '[ARGOS Newsletter][mail]';

// ── Types ───────────────────────────────────────────────────
export interface SmtpStrategy {
  label: string;
  port: number;
  options: SMTPTransport.Options;
}

export interface RetryStep {
  /** 1부터 시작하는 전체 시도 번호 */
  attemptNo: number;
  /** 1부터 시작하는 라운드 번호 */
  round: number;
  /** strategies 배열 인덱스 */
  strategyIndex: number;
  /** 이 시도 직전 대기 시간(ms) */
  delayBeforeMs: number;
}

export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
}

/** nodemailer Transporter 중 이 모듈이 쓰는 부분만 */
export interface MailTransporter {
  sendMail(message: MailMessage): Promise<unknown>;
  close(): void;
}

export interface SendWithRetryParams {
  user: string;
  pass: string;
  message: MailMessage;
  rounds?: number;
  waitMs?: number;
  attemptDeadlineMs?: number;
  /** 주입용 (기본: nodemailer.createTransport) */
  createTransport?: (options: SMTPTransport.Options) => MailTransporter;
  /** 주입용 (기본: setTimeout 기반) */
  sleep?: (ms: number) => Promise<void>;
  /** 주입용 정보 로그 (기본: console.log) */
  log?: (line: string) => void;
  /** 주입용 오류 로그 (기본: console.error) */
  logError?: (line: string) => void;
  /** 주입용 시계 (기본: Date.now) */
  now?: () => number;
}

interface FailureRecord {
  round: number;
  port: number;
  code: string;
}

export type MailProvider = 'brevo' | 'smtp';
export type MailProviderSetting = 'auto' | MailProvider;

export interface MailSender {
  name: string;
  email: string;
}

/** fetch 응답 중 이 모듈이 쓰는 부분만 */
export interface FetchResponseLike {
  status: number;
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal },
) => Promise<FetchResponseLike>;

/** SMTP 사전 진단 함수. 절대 throw 하지 않아야 한다. */
export type ProbeFn = () => Promise<void>;

export interface ProbeSocket extends EventEmitter {
  destroy(): unknown;
}

export type ProbeConnect = (options: { host: string; port: number }) => ProbeSocket;

export interface BrevoSendParams {
  apiKey: string;
  sender: MailSender;
  to: string[];
  subject: string;
  html: string;
  maxAttempts?: number;
  waitMs?: number;
  timeoutMs?: number;
  /** 주입용 (기본: globalThis.fetch) */
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
  logError?: (line: string) => void;
  now?: () => number;
}

export interface ProbeSmtpParams {
  host?: string;
  port?: number;
  timeoutMs?: number;
  /** 주입용 (기본: net.connect) */
  connect?: ProbeConnect;
  log?: (line: string) => void;
  logError?: (line: string) => void;
  now?: () => number;
}

export interface SendMailParams {
  provider: MailProvider;
  subject: string;
  html: string;
  to: string[];
  /** brevo: sender.name/email 그대로 사용. smtp: sender.name 만 사용하고 주소는 smtpUser 고정 */
  sender: MailSender;
  brevoApiKey?: string;
  smtpUser?: string;
  smtpPass?: string;
  brevoMaxAttempts?: number;
  brevoWaitMs?: number;
  brevoTimeoutMs?: number;
  smtpRounds?: number;
  smtpWaitMs?: number;
  smtpAttemptDeadlineMs?: number;
  /** 주입용 */
  fetchImpl?: FetchLike;
  probe?: ProbeFn;
  createTransport?: (options: SMTPTransport.Options) => MailTransporter;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
  logError?: (line: string) => void;
  now?: () => number;
}

// ── Pure builders ───────────────────────────────────────────
export function buildSmtpStrategies(user: string, pass: string): SmtpStrategy[] {
  const common = {
    host: SMTP_HOST,
    auth: { user, pass },
    connectionTimeout: SOCKET_TIMEOUT_MS,
    greetingTimeout: SOCKET_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    dnsTimeout: DNS_TIMEOUT_MS,
  };
  return [
    {
      label: '465/SSL',
      port: 465,
      options: { ...common, port: 465, secure: true },
    },
    {
      label: '587/STARTTLS',
      port: 587,
      options: { ...common, port: 587, secure: false, requireTLS: true },
    },
  ];
}

export function buildRetrySchedule(params: {
  rounds: number;
  strategyCount: number;
  waitMs: number;
}): RetryStep[] {
  const { rounds, strategyCount, waitMs } = params;
  const steps: RetryStep[] = [];
  for (let round = 1; round <= rounds; round++) {
    for (let strategyIndex = 0; strategyIndex < strategyCount; strategyIndex++) {
      steps.push({
        attemptNo: steps.length + 1,
        round,
        strategyIndex,
        // 라운드 2 이상의 첫 시도 직전에만 대기한다
        delayBeforeMs: round > 1 && strategyIndex === 0 ? waitMs : 0,
      });
    }
  }
  return steps;
}

/** 모든 시도가 데드라인까지 가고 모든 대기를 소화했을 때의 최악 소요 시간(ms) */
export function computeWorstCaseMs(schedule: RetryStep[], attemptDeadlineMs: number): number {
  return schedule.reduce((sum, step) => sum + step.delayBeforeMs + attemptDeadlineMs, 0);
}

/** MAIL_PROVIDER 설정값 해석. 미설정/빈 값은 auto, 허용 외 값은 오류. */
export function parseMailProviderSetting(env: Record<string, string | undefined>): MailProviderSetting {
  const setting = (env.MAIL_PROVIDER?.trim() || 'auto').toLowerCase();
  if (setting !== 'auto' && setting !== 'brevo' && setting !== 'smtp') {
    throw new Error('MAIL_PROVIDER must be auto|brevo|smtp');
  }
  return setting;
}

/** auto: BREVO_API_KEY 가 있으면 brevo, 없으면 smtp. brevo 강제 시 키 검증은 호출측 몫. */
export function resolveMailProvider(env: Record<string, string | undefined>): MailProvider {
  const setting = parseMailProviderSetting(env);
  if (setting === 'smtp') return 'smtp';
  if (setting === 'brevo') return 'brevo';
  return env.BREVO_API_KEY?.trim() ? 'brevo' : 'smtp';
}

/** 쉼표 구분 수신자 문자열 -> 주소 배열. trim, 빈 값 제거. 0개이거나 '@' 없는 항목이 있으면 오류. */
export function parseRecipients(to: string | undefined): string[] {
  const list = (to ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  if (list.length === 0) throw new Error('No valid recipients (NEWSLETTER_TO is empty)');
  const bad = list.filter(s => !s.includes('@'));
  if (bad.length > 0) throw new Error(`Invalid recipient address (missing "@"): ${bad.join(', ')}`);
  return list;
}

/**
 * 발신자 파싱. `a@b.com` 또는 `Name <a@b.com>` / `"Name" <a@b.com>` 형태를 받는다.
 * 표시 이름 우선순위: name 인자 > from 에 포함된 이름 > 기본값.
 */
export function parseSender(from: string | undefined, name?: string): MailSender {
  const raw = (from ?? '').trim();
  const m = /^(.*?)<([^<>]+)>\s*$/.exec(raw);
  const email = (m ? m[2] : raw).trim();
  if (!email || !email.includes('@') || /\s/.test(email)) {
    throw new Error('Invalid sender address (NEWSLETTER_FROM / GMAIL_USER)');
  }
  const parsedName = m ? m[1].trim().replace(/^"(.*)"$/, '$1').trim() : '';
  return { name: name?.trim() || parsedName || DEFAULT_SENDER_NAME, email };
}

// ── Helpers ─────────────────────────────────────────────────
const defaultSleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const defaultCreateTransport = (options: SMTPTransport.Options): MailTransporter =>
  nodemailer.createTransport(options);

function createDeadlineError(ms: number): Error & { code: string } {
  const err = new Error(`Attempt exceeded hard deadline of ${ms}ms`) as Error & { code: string };
  err.code = 'EATTEMPTDEADLINE';
  return err;
}

/** 오류 객체에서 로그에 쓸 필드만 꺼낸다(전체 덤프 금지). 비밀번호가 메시지에 섞여도 가린다. */
function describeError(err: unknown, pass: string) {
  const e = (err ?? {}) as Record<string, unknown>;
  let message = typeof e.message === 'string' ? e.message : String(err);
  if (pass) message = message.split(pass).join('***');
  return {
    code: typeof e.code === 'string' ? e.code : undefined,
    command: typeof e.command === 'string' ? e.command : undefined,
    responseCode: typeof e.responseCode === 'number' ? e.responseCode : undefined,
    message,
  };
}

function isFatal(code: string | undefined, responseCode: number | undefined): boolean {
  return (code !== undefined && FATAL_ERROR_CODES.has(code)) || responseCode === 535;
}

// ── Orchestration ───────────────────────────────────────────
export async function sendWithRetry(params: SendWithRetryParams): Promise<void> {
  const {
    user,
    pass,
    message,
    rounds = DEFAULT_ROUNDS,
    waitMs = DEFAULT_WAIT_MS,
    attemptDeadlineMs = DEFAULT_ATTEMPT_DEADLINE_MS,
    createTransport = defaultCreateTransport,
    sleep = defaultSleep,
    log = (line: string) => console.log(line),
    logError = (line: string) => console.error(line),
    now = Date.now,
  } = params;

  const strategies = buildSmtpStrategies(user, pass);
  const schedule = buildRetrySchedule({ rounds, strategyCount: strategies.length, waitMs });
  const total = schedule.length;
  const failures: FailureRecord[] = [];

  for (const step of schedule) {
    if (step.delayBeforeMs > 0) {
      log(
        `${MAIL_LOG_PREFIX} round ${step.round - 1}/${rounds} exhausted; ` +
          `waiting ${step.delayBeforeMs / 1000}s before round ${step.round}/${rounds}`,
      );
      await sleep(step.delayBeforeMs);
    }

    const strategy = strategies[step.strategyIndex];
    const startedAt = now();
    let transporter: MailTransporter | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      transporter = createTransport(strategy.options);
      const sending = transporter.sendMail(message);
      // 데드라인으로 이미 실패 처리된 뒤 늦게 reject 되어도 unhandled rejection 이 나지 않게 한다
      sending.catch(() => undefined);

      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          // 먼저 연결을 끊고 실패 처리한다
          try {
            transporter?.close();
          } catch {
            /* close 실패는 무시 */
          }
          reject(createDeadlineError(attemptDeadlineMs));
        }, attemptDeadlineMs);
      });

      await Promise.race([sending, deadline]);

      log(
        `${LOG_PREFIX} Email sent to ${message.to} via ${SMTP_HOST}:${strategy.port} ` +
          `(${strategy.label}) on round ${step.round}/${rounds} (attempt ${step.attemptNo}/${total})`,
      );
      return;
    } catch (err) {
      const info = describeError(err, pass);
      const elapsed = now() - startedAt;
      failures.push({ round: step.round, port: strategy.port, code: info.code ?? 'n/a' });
      logError(
        `${MAIL_LOG_PREFIX} round ${step.round}/${rounds} port ${strategy.port} (${strategy.label}) FAILED ` +
          `code=${info.code ?? 'n/a'} command=${info.command ?? 'n/a'} elapsed=${elapsed}ms ` +
          `msg="${info.message}"`,
      );
      if (isFatal(info.code, info.responseCode)) {
        logError(`${MAIL_LOG_PREFIX} non-retryable error (${info.code ?? info.responseCode}); aborting retries`);
        break;
      }
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      try {
        transporter?.close();
      } catch {
        /* close 실패는 무시 */
      }
    }
  }

  const summary = failures.map(f => `r${f.round}/${f.port}:${f.code}`).join(', ');
  throw new Error(`Email send failed after ${failures.length} attempts: ${summary}`);
}

// ── Brevo HTTPS API ─────────────────────────────────────────
/** 로그/오류 메시지용 정리: 비밀값 마스킹 -> 제어문자 공백화 -> 길이 제한 (마스킹이 먼저여야 잘린 키가 남지 않는다) */
function cleanText(text: string, secret: string, limit = MAX_LOGGED_TEXT): string {
  const masked = secret ? text.split(secret).join('***') : text;
  return masked.replace(/[\r\n\t]+/g, ' ').trim().slice(0, limit);
}

function parseJsonObject(text: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {}; // 프록시 오류 HTML 등 JSON 이 아닌 응답
  }
}

function brevoHint(status: number): string | undefined {
  if (status === 401) return 'API key invalid or IP restriction';
  if (status === 400) return 'sender not verified in Brevo Senders';
  return undefined;
}

/** 4xx 는 즉시 실패. 단 408(Request Timeout)·429(Too Many Requests)는 재시도. 5xx 도 재시도. */
function isRetryableStatus(status: number): boolean {
  if (status === 408 || status === 429) return true;
  if (status >= 400 && status < 500) return false;
  return true;
}

/** 시도 1회: 타임아웃은 응답 본문 읽기까지 포함한다(본문 스톨 방지). 타이머는 항상 해제한다. */
async function brevoRequest(
  fetchImpl: FetchLike,
  apiKey: string,
  body: string,
  timeoutMs: number,
): Promise<{ status: number; text: string }> {
  const ac = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          Object.assign(new Error(`Request exceeded timeout of ${timeoutMs}ms`), {
            name: 'AbortError',
            code: 'ETIMEDOUT_API',
          }),
        );
        ac.abort();
      }, timeoutMs);
    });
    const request = (async () => {
      const res = await fetchImpl(BREVO_ENDPOINT, {
        method: 'POST',
        headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body,
        signal: ac.signal,
      });
      return { status: res.status, text: await res.text() };
    })();
    // 타임아웃으로 먼저 실패 처리된 뒤 늦게 reject 되어도 unhandled rejection 이 나지 않게 한다
    request.catch(() => undefined);
    return await Promise.race([request, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function describeNetworkError(err: unknown, apiKey: string): { code: string; message: string } {
  const e = (err ?? {}) as { name?: unknown; code?: unknown; message?: unknown; cause?: { code?: unknown } };
  let code: string;
  if (e.name === 'AbortError') code = 'ETIMEDOUT_API';
  else if (typeof e.cause?.code === 'string') code = e.cause.code;
  else if (typeof e.code === 'string') code = e.code;
  else code = 'ENETWORK';
  const message = cleanText(typeof e.message === 'string' ? e.message : String(err), apiKey);
  return { code, message };
}

export async function sendWithBrevo(params: BrevoSendParams): Promise<void> {
  const {
    apiKey,
    sender,
    to,
    subject,
    html,
    maxAttempts = BREVO_MAX_ATTEMPTS,
    waitMs = BREVO_WAIT_MS,
    timeoutMs = BREVO_ATTEMPT_TIMEOUT_MS,
    sleep = defaultSleep,
    log = (line: string) => console.log(line),
    logError = (line: string) => console.error(line),
    now = Date.now,
  } = params;
  const fetchImpl =
    params.fetchImpl ?? ((globalThis as { fetch?: unknown }).fetch as FetchLike | undefined);
  if (!fetchImpl) throw new Error('global fetch is not available (Node 18+ required)');
  if (!apiKey) throw new Error('Brevo API key is required');
  if (to.length === 0) throw new Error('No recipients');

  const body = JSON.stringify({
    sender: { name: sender.name, email: sender.email },
    to: to.map(email => ({ email })),
    subject,
    htmlContent: html,
  });
  const failures: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      log(
        `${MAIL_LOG_PREFIX} brevo attempt ${attempt - 1}/${maxAttempts} failed; ` +
          `waiting ${waitMs / 1000}s before attempt ${attempt}/${maxAttempts}`,
      );
      await sleep(waitMs);
    }

    const startedAt = now();
    let result: { status: number; text: string };
    try {
      result = await brevoRequest(fetchImpl, apiKey, body, timeoutMs);
    } catch (err) {
      const info = describeNetworkError(err, apiKey);
      failures.push(`a${attempt}:${info.code}`);
      logError(
        `${MAIL_LOG_PREFIX} brevo attempt ${attempt}/${maxAttempts} FAILED code=${info.code} ` +
          `elapsed=${now() - startedAt}ms msg="${info.message}"`,
      );
      continue;
    }

    const json = parseJsonObject(result.text);
    if (result.status >= 200 && result.status <= 299) {
      const messageId = typeof json.messageId === 'string' ? cleanText(json.messageId, apiKey) : 'n/a';
      log(
        `${LOG_PREFIX} Email sent to ${to.join(',')} via Brevo API ` +
          `(messageId=${messageId || 'n/a'}) on attempt ${attempt}/${maxAttempts}`,
      );
      return;
    }

    const code = typeof json.code === 'string' ? cleanText(json.code, apiKey, 50) || 'n/a' : 'n/a';
    const message = typeof json.message === 'string' ? cleanText(json.message, apiKey) || 'n/a' : 'n/a';
    logError(
      `${MAIL_LOG_PREFIX} brevo attempt ${attempt}/${maxAttempts} FAILED status=${result.status} ` +
        `code=${code} elapsed=${now() - startedAt}ms msg="${message}"`,
    );
    if (!isRetryableStatus(result.status)) {
      const hint = brevoHint(result.status);
      logError(
        `${MAIL_LOG_PREFIX} non-retryable error (status ${result.status}); aborting retries` +
          (hint ? ` - hint: ${hint}` : ''),
      );
      throw new Error(
        `Email send failed (Brevo HTTP ${result.status} ${code}): ${message}` + (hint ? ` (hint: ${hint})` : ''),
      );
    }
    failures.push(`a${attempt}:${result.status}`);
  }

  throw new Error(`Email send failed after ${failures.length} attempts (brevo): ${failures.join(', ')}`);
}

// ── SMTP 사전 진단 ──────────────────────────────────────────
/** smtp.gmail.com:465 TCP 연결을 1회만 시도해 차단 여부를 로그로 남긴다. 어떤 경우에도 throw 하지 않고 resolve 한다. */
export function probeSmtp(params: ProbeSmtpParams = {}): Promise<void> {
  const {
    host = SMTP_HOST,
    port = SMTP_PROBE_PORT,
    timeoutMs = SMTP_PROBE_TIMEOUT_MS,
    connect = (options: { host: string; port: number }): ProbeSocket => net.connect(options),
    log = (line: string) => console.log(line),
    logError = (line: string) => console.error(line),
    now = Date.now,
  } = params;

  return new Promise<void>(resolve => {
    const startedAt = now();
    let settled = false;
    let socket: ProbeSocket | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (failure?: string): void => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      try {
        socket?.destroy();
      } catch {
        /* destroy 실패는 무시 */
      }
      const ms = now() - startedAt;
      try {
        if (failure === undefined) {
          log(`${MAIL_LOG_PREFIX} SMTP probe ${host}:${port} OK (${ms}ms)`);
        } else {
          logError(
            `${MAIL_LOG_PREFIX} SMTP probe ${host}:${port} FAILED (${failure}, ${ms}ms) - ` +
              `Railway 아웃바운드 SMTP 차단 가능성. BREVO_API_KEY를 설정하면 HTTPS로 전송합니다.`,
          );
        }
      } catch {
        /* 로그 실패도 진단을 깨뜨리지 않는다 */
      }
      resolve();
    };
    const codeOf = (err: unknown): string => {
      const code = (err as { code?: unknown } | null | undefined)?.code;
      return typeof code === 'string' ? code : 'ERROR';
    };

    try {
      socket = connect({ host, port });
      socket.on('connect', () => finish());
      // finish 이후에도 리스너를 남겨 둬 destroy 후 늦게 오는 error 가 uncaught 가 되지 않게 한다
      socket.on('error', (err: unknown) => finish(codeOf(err)));
      timer = setTimeout(() => finish('timeout'), timeoutMs);
    } catch (err) {
      finish(codeOf(err));
    }
  });
}

// ── Dispatcher ──────────────────────────────────────────────
export async function sendMail(params: SendMailParams): Promise<void> {
  const {
    provider,
    subject,
    html,
    to,
    sender,
    log = (line: string) => console.log(line),
    logError = (line: string) => console.error(line),
  } = params;

  if (provider === 'brevo') {
    if (!params.brevoApiKey) throw new Error('BREVO_API_KEY is required for provider=brevo');
    await sendWithBrevo({
      apiKey: params.brevoApiKey,
      sender,
      to,
      subject,
      html,
      maxAttempts: params.brevoMaxAttempts,
      waitMs: params.brevoWaitMs,
      timeoutMs: params.brevoTimeoutMs,
      fetchImpl: params.fetchImpl,
      sleep: params.sleep,
      log,
      logError,
      now: params.now,
    });
    return;
  }

  if (!params.smtpUser || !params.smtpPass) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD are required for provider=smtp');
  }
  // 진단 실패는 전송을 막지 않는다 (probe 가 throw 해도 무시)
  try {
    await (params.probe ?? (() => probeSmtp({ log, logError })))();
  } catch {
    /* 진단은 best-effort */
  }
  await sendWithRetry({
    user: params.smtpUser,
    pass: params.smtpPass,
    message: {
      from: `"${sender.name.replace(/["\r\n]/g, '')}" <${params.smtpUser}>`,
      to: to.join(', '),
      subject,
      html,
    },
    rounds: params.smtpRounds,
    waitMs: params.smtpWaitMs,
    attemptDeadlineMs: params.smtpAttemptDeadlineMs,
    createTransport: params.createTransport,
    sleep: params.sleep,
    log,
    logError,
    now: params.now,
  });
}
