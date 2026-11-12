/**
 * 요청 처리기 공용 타입. 처리기는 `params` 만 입력으로 받는다 — note 는 타입에도 없다.
 * 요청 문자열을 프롬프트에 직접 끼워 넣지 않고, id 를 DB 행으로 해석한 뒤 DB 내용으로 서비스를 호출한다.
 */

export const ERROR_CODES = [
  'provider_not_configured',
  'quota_exceeded',
  'not_found',
  'budget_daily',
  'budget_monthly',
  'timeout',
  'upstream_error',
  'invalid_target',
  'result_too_large',
] as const;
export type HandlerErrorCode = (typeof ERROR_CODES)[number];

export type CostProvider = 'claude' | 'gemini';

export type HandlerOutcome =
  | { ok: true; result: unknown; costUsd?: number; provider?: CostProvider | null }
  | { ok: false; code: HandlerErrorCode; transient?: boolean };

export const okOutcome = (result: unknown, costUsd = 0, provider: CostProvider | null = null): HandlerOutcome => ({ ok: true, result, costUsd, provider });
export const failOutcome = (code: HandlerErrorCode, transient = false): HandlerOutcome => ({ ok: false, code, transient });

/** 공급자(키)가 설정되지 않았을 때 던진다 → provider_not_configured */
export class ProviderNotConfiguredError extends Error {
  constructor(provider: string) {
    super(`provider_not_configured:${provider}`);
    this.name = 'ProviderNotConfiguredError';
  }
}

/** 공급자 일시 오류(네트워크·5xx) → 재시도 대상 upstream_error */
export class UpstreamError extends Error {
  constructor(public readonly transient: boolean = true) {
    super('upstream_error');
    this.name = 'UpstreamError';
  }
}

/** 공급자 쿼터 소진 → quota_exceeded (재시도 대상) */
export class QuotaExceededError extends Error {
  constructor() {
    super('quota_exceeded');
    this.name = 'QuotaExceededError';
  }
}

/** 호스트가 허용되지 않거나 사설 주소로 해석됨 → invalid_target */
export class TargetNotAllowedError extends Error {
  constructor() {
    super('target_not_allowed');
    this.name = 'TargetNotAllowedError';
  }
}

/** 오류 → 처리 결과 (메시지는 코드로만 변환하고 본문을 노출하지 않는다) */
export function outcomeFromError(err: unknown): HandlerOutcome {
  if (err instanceof ProviderNotConfiguredError) return failOutcome('provider_not_configured');
  if (err instanceof TargetNotAllowedError) return failOutcome('invalid_target');
  if (err instanceof QuotaExceededError) return failOutcome('quota_exceeded', true);
  if (err instanceof UpstreamError) return failOutcome('upstream_error', err.transient);
  return failOutcome('upstream_error', true);
}

export interface RequestHandler<P = Record<string, unknown>> {
  /** 호출 전 비용 추정 — 캐시 적중이면 0. 예산 게이트가 쓴다 */
  estimate?(params: P): Promise<{ costUsd: number; provider: CostProvider | null; claude: boolean }>;
  run(params: P): Promise<HandlerOutcome>;
}
