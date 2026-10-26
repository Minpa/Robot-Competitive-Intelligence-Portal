/**
 * anthropic-models — 기술 트렌드 리포트 계열 Claude 호출의 모델 선택/파라미터 공용 헬퍼
 *
 * 작업 그룹별 모델 기본값 체인 (그룹끼리 서로 상속하지 않는다):
 *  - 종합(시사점·시계열 해설):  Opus 5.5  — TECH_TREND_REPORT_MODEL / TECH_TREND_TIMELINE_MODEL
 *  - 주간 브리프 문장:          종합 그룹과 같은 기본값 — WEEKLY_BRIEF_MODEL → TECH_TREND_REPORT_MODEL → 기본값
 *  - 판정·분류:                Haiku 5.5 — TECH_TREND_FOCUS_MODEL / HAND_TOPIC_MODEL
 *  - 핸드 외 4개 도메인 시사점:  Haiku 4.5 — TECH_TREND_REPORT_LEGACY_MODEL (현행 유지)
 *
 * API 규칙 (Opus 5.5 / Haiku 5.5):
 *  - thinking 파라미터·budget_tokens·assistant prefill 을 보내지 않는다. 사고 깊이는 output_config.effort 로만 조절한다.
 *  - 비스트리밍 요청의 max_tokens 는 21,333 이하여야 한다 (초과 시 SDK가 스트리밍을 요구).
 *  - 응답에는 thinking 블록이 섞여 올 수 있으므로 type==='text' 블록만 합쳐 파싱한다.
 */

import type Anthropic from '@anthropic-ai/sdk';

// ─────────────────────────────────────────────────────────────────────────────
// 모델 ID / 상수
// ─────────────────────────────────────────────────────────────────────────────

export const OPUS_5_5_MODEL = 'claude-opus-5-5';
export const HAIKU_5_5_MODEL = 'claude-haiku-5-5';
export const HAIKU_4_5_MODEL = 'claude-haiku-4-5-20251001';

/** 비스트리밍 호출에서 SDK가 허용하는 max_tokens 상한 (초과하면 "Streaming is required" 예외) */
export const MAX_NON_STREAMING_TOKENS = 21_333;

/** Opus 호출 실패 후 같은 키로 재호출하지 않는 시간 */
export const FAILURE_COOLDOWN_MS = 10 * 60_000;

/** Opus 종합 호출의 요청 옵션 — thinking 이 길어질 수 있어 timeout 을 늘리고 재시도는 1회로 제한 */
export const OPUS_REQUEST_OPTIONS = { timeout: 240_000, maxRetries: 1 } as const;

// ─────────────────────────────────────────────────────────────────────────────
// env 체인
// ─────────────────────────────────────────────────────────────────────────────

export type EnvLike = Readonly<Record<string, string | undefined>>;

/** env 이름 목록을 앞에서부터 보며 첫 비어있지 않은 값(공백 제거)을 반환, 없으면 기본값 */
export function resolveModelFromEnv(names: readonly string[], fallback: string, env: EnvLike = process.env): string {
  for (const name of names) {
    const v = env[name]?.trim();
    if (v) return v;
  }
  return fallback;
}

/** (a) 핸드 30일 시사점 */
export function resolveReportModel(env: EnvLike = process.env): string {
  return resolveModelFromEnv(['TECH_TREND_REPORT_MODEL'], OPUS_5_5_MODEL, env);
}

/** (a') 핸드 외 도메인 시사점 — 현행 Haiku 4.5 유지 */
export function resolveLegacyReportModel(env: EnvLike = process.env): string {
  return resolveModelFromEnv(['TECH_TREND_REPORT_LEGACY_MODEL'], HAIKU_4_5_MODEL, env);
}

/** (b) 시계열 해설 */
export function resolveTimelineModel(env: EnvLike = process.env): string {
  return resolveModelFromEnv(['TECH_TREND_TIMELINE_MODEL', 'TECH_TREND_REPORT_MODEL'], OPUS_5_5_MODEL, env);
}

/** (b') 주간 브리프 요약 문장 — WEEKLY_BRIEF_MODEL → TECH_TREND_REPORT_MODEL → 종합 기본 모델 */
export function resolveWeeklyBriefModel(env: EnvLike = process.env): string {
  return resolveModelFromEnv(['WEEKLY_BRIEF_MODEL', 'TECH_TREND_REPORT_MODEL'], OPUS_5_5_MODEL, env);
}

/** (c) 핸드 관련성 판정 — 종합 그룹(TECH_TREND_REPORT_MODEL)을 상속하지 않는다 */
export function resolveFocusModel(env: EnvLike = process.env): string {
  return resolveModelFromEnv(['TECH_TREND_FOCUS_MODEL'], HAIKU_5_5_MODEL, env);
}

/** (d) 서브토픽 분류 — 종합 그룹(TECH_TREND_REPORT_MODEL)을 상속하지 않는다 */
export function resolveHandTopicModel(env: EnvLike = process.env): string {
  return resolveModelFromEnv(['HAND_TOPIC_MODEL', 'TECH_TREND_FOCUS_MODEL'], HAIKU_5_5_MODEL, env);
}

/**
 * (d') 도메인별 서브토픽 분류 — hand 는 resolveHandTopicModel 과 동일.
 * 그 외 도메인은 `{DOMAIN}_TOPIC_MODEL` → HAND_TOPIC_MODEL → TECH_TREND_FOCUS_MODEL 순으로 보며 기본 Haiku 5.5.
 */
export function resolveDomainTopicModel(domain: string, env: EnvLike = process.env): string {
  if (domain === 'hand') return resolveHandTopicModel(env);
  return resolveModelFromEnv(
    [`${domain.toUpperCase()}_TOPIC_MODEL`, 'HAND_TOPIC_MODEL', 'TECH_TREND_FOCUS_MODEL'],
    HAIKU_5_5_MODEL,
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// effort
// ─────────────────────────────────────────────────────────────────────────────

export type EffortLevel = 'low' | 'medium' | 'high' | 'max';

/** output_config.effort 를 지원하는 모델인지 — claude-opus-5* / claude-haiku-5-5* 만 */
export function supportsEffort(model: string): boolean {
  return model.startsWith('claude-opus-5') || model.startsWith('claude-haiku-5-5');
}

export interface EffortParams {
  output_config?: Anthropic.Messages.OutputConfig;
}

/**
 * 요청 본문에 펼쳐 넣을 effort 파라미터. 지원 모델이 아니면(예: env 로 Haiku 4.5 를 지정) 빈 객체.
 * thinking 은 어떤 경우에도 반환하지 않는다.
 */
export function effortParams(model: string, effort: EffortLevel): EffortParams {
  return supportsEffort(model) ? { output_config: { effort } } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// 응답 처리
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentBlockLike {
  type: string;
  text?: string;
}

/** thinking 등 비텍스트 블록은 버리고 text 블록만 줄바꿈으로 이어 붙인다 */
export function extractText(content: ReadonlyArray<ContentBlockLike> | null | undefined): string {
  let combined = '';
  for (const block of content ?? []) {
    if (block.type === 'text' && typeof block.text === 'string') combined += block.text + '\n';
  }
  return combined;
}

export function isRefusal(stopReason: string | null | undefined): boolean {
  return stopReason === 'refusal';
}

export function isMaxTokensStop(stopReason: string | null | undefined): boolean {
  return stopReason === 'max_tokens';
}

/** 서비스가 의존하는 응답의 최소 형태 (SDK Message 와 테스트 가짜 응답 모두 만족) */
export interface MessageResponseLike {
  content: ReadonlyArray<ContentBlockLike>;
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number } | null;
}

export interface MessageRequestOptions {
  timeout?: number;
  maxRetries?: number;
}

/** 서비스가 의존하는 클라이언트의 최소 형태 — 실제 Anthropic 인스턴스와 테스트 가짜 모두 주입 가능 */
export interface AnthropicMessagesClient {
  messages: {
    create: (
      params: Anthropic.Messages.MessageCreateParamsNonStreaming,
      options?: MessageRequestOptions
    ) => Promise<MessageResponseLike>;
  };
}

/** max_tokens 잘림·refusal 을 경고 로그로 남긴다 (호출자가 별도로 실패 처리 여부를 결정) */
export function warnOnAbnormalStop(tag: string, model: string, response: MessageResponseLike): void {
  if (isRefusal(response.stop_reason)) {
    console.warn(`[${tag}] model refused the request (stop_reason=refusal, model=${model})`);
  } else if (isMaxTokensStop(response.stop_reason)) {
    console.warn(
      `[${tag}] response truncated at max_tokens (output_tokens=${response.usage?.output_tokens ?? 'unknown'}, model=${model})`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 실패 쿨다운 (순수 함수)
// ─────────────────────────────────────────────────────────────────────────────

/** 마지막 실패 시각으로부터 cooldownMs 이내면 true. 실패 기록이 없으면 false. */
export function isInCooldown(
  lastFailureAt: number | null | undefined,
  now: number,
  cooldownMs: number = FAILURE_COOLDOWN_MS
): boolean {
  if (lastFailureAt === null || lastFailureAt === undefined) return false;
  return now - lastFailureAt < cooldownMs;
}
