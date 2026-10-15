/**
 * ARGOS Newsletter SMTP sender (retry / port fallback / per-attempt hard deadline)
 *
 * send-daily-newsletter.ts 에서 사용한다. 이 모듈은 import 해도 부작용이 없다
 * (main() 실행, process.exit, DB Pool 생성 없음). 스모크: newsletter-mailer.smoke.ts
 */

import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

// ── Constants ───────────────────────────────────────────────
export const SMTP_HOST = 'smtp.gmail.com';
export const DEFAULT_ROUNDS = 3;
export const DEFAULT_WAIT_MS = 60_000;
export const DEFAULT_ATTEMPT_DEADLINE_MS = 30_000;

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
