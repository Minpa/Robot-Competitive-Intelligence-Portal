import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  OPUS_5_5_MODEL,
  HAIKU_5_5_MODEL,
  HAIKU_4_5_MODEL,
  MAX_NON_STREAMING_TOKENS,
  FAILURE_COOLDOWN_MS,
  resolveModelFromEnv,
  resolveReportModel,
  resolveLegacyReportModel,
  resolveTimelineModel,
  resolveFocusModel,
  resolveHandTopicModel,
  supportsEffort,
  effortParams,
  extractText,
  isRefusal,
  isMaxTokensStop,
  isInCooldown,
  warnOnAbnormalStop,
} from '../../services/anthropic-models.js';
import { INSIGHT_PROFILES } from '../../services/tech-trend-report.service.js';
import { INSIGHT_MAX_TOKENS } from '../../services/tech-trend-timeline-insight.service.js';
import { JUDGE_MAX_TOKENS, FOCUS_MODEL } from '../../services/tech-trend-analysis.service.js';
import { CLASSIFY_MAX_TOKENS, HAND_TOPIC_MODEL } from '../../services/hand-topic-classification.service.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('model env chains', () => {
  it('uses the code defaults when no env is set', () => {
    expect(resolveReportModel({})).toBe('claude-opus-5-5');
    expect(resolveTimelineModel({})).toBe('claude-opus-5-5');
    expect(resolveFocusModel({})).toBe('claude-haiku-5-5');
    expect(resolveHandTopicModel({})).toBe('claude-haiku-5-5');
    expect(resolveLegacyReportModel({})).toBe('claude-haiku-4-5-20251001');
    expect(OPUS_5_5_MODEL).toBe('claude-opus-5-5');
    expect(HAIKU_5_5_MODEL).toBe('claude-haiku-5-5');
    expect(HAIKU_4_5_MODEL).toBe('claude-haiku-4-5-20251001');
  });

  it('does not let the synthesis model leak into judging/classification', () => {
    const env = { TECH_TREND_REPORT_MODEL: 'claude-opus-5-5' };
    expect(resolveFocusModel(env)).toBe('claude-haiku-5-5');
    expect(resolveHandTopicModel(env)).toBe('claude-haiku-5-5');
    // 반대로 판정 모델 설정이 종합 모델로 번지지도 않는다
    const env2 = { TECH_TREND_FOCUS_MODEL: 'claude-haiku-4-5-20251001', HAND_TOPIC_MODEL: 'x-topic' };
    expect(resolveReportModel(env2)).toBe('claude-opus-5-5');
    expect(resolveTimelineModel(env2)).toBe('claude-opus-5-5');
  });

  it('timeline model: TECH_TREND_TIMELINE_MODEL > TECH_TREND_REPORT_MODEL > default', () => {
    expect(resolveTimelineModel({ TECH_TREND_REPORT_MODEL: 'r' })).toBe('r');
    expect(resolveTimelineModel({ TECH_TREND_REPORT_MODEL: 'r', TECH_TREND_TIMELINE_MODEL: 't' })).toBe('t');
  });

  it('hand-topic model: HAND_TOPIC_MODEL > TECH_TREND_FOCUS_MODEL > default', () => {
    expect(resolveHandTopicModel({ TECH_TREND_FOCUS_MODEL: 'f' })).toBe('f');
    expect(resolveHandTopicModel({ TECH_TREND_FOCUS_MODEL: 'f', HAND_TOPIC_MODEL: 'h' })).toBe('h');
  });

  it('report and focus models honour their own env', () => {
    expect(resolveReportModel({ TECH_TREND_REPORT_MODEL: 'custom-report' })).toBe('custom-report');
    expect(resolveFocusModel({ TECH_TREND_FOCUS_MODEL: 'custom-focus' })).toBe('custom-focus');
    expect(resolveLegacyReportModel({ TECH_TREND_REPORT_LEGACY_MODEL: 'legacy-x' })).toBe('legacy-x');
    // 신설 LEGACY 변수가 없으면 TECH_TREND_REPORT_MODEL 은 비-hand 에 영향을 주지 않는다
    expect(resolveLegacyReportModel({ TECH_TREND_REPORT_MODEL: 'claude-opus-5-5' })).toBe('claude-haiku-4-5-20251001');
  });

  it('ignores empty / whitespace-only values and trims', () => {
    expect(resolveModelFromEnv(['A', 'B'], 'def', { A: '', B: '  m  ' })).toBe('m');
    expect(resolveModelFromEnv(['A', 'B'], 'def', { A: '   ', B: '' })).toBe('def');
    expect(resolveTimelineModel({ TECH_TREND_TIMELINE_MODEL: ' ', TECH_TREND_REPORT_MODEL: '' })).toBe('claude-opus-5-5');
  });

  it('service constants equal the chain results under the test environment', () => {
    expect(FOCUS_MODEL).toBe(resolveFocusModel());
    expect(HAND_TOPIC_MODEL).toBe(resolveHandTopicModel());
  });

  it('analysis / classification sources do not reference the synthesis model env var', () => {
    for (const file of ['tech-trend-analysis.service.ts', 'hand-topic-classification.service.ts']) {
      const src = readFileSync(fileURLToPath(new URL(`../../services/${file}`, import.meta.url)), 'utf8');
      expect(src).not.toContain('TECH_TREND_REPORT_MODEL');
    }
  });
});

describe('effortParams', () => {
  it('sends output_config.effort for Opus 5.x and Haiku 5.5', () => {
    expect(effortParams('claude-opus-5-5', 'high')).toEqual({ output_config: { effort: 'high' } });
    expect(effortParams('claude-haiku-5-5', 'low')).toEqual({ output_config: { effort: 'low' } });
    expect(supportsEffort('claude-opus-5-5')).toBe(true);
    expect(supportsEffort('claude-haiku-5-5')).toBe(true);
  });

  it('returns an empty object for other models (e.g. Haiku 4.5 override)', () => {
    expect(effortParams('claude-haiku-4-5-20251001', 'low')).toEqual({});
    expect(effortParams('claude-sonnet-4-20250514', 'high')).toEqual({});
    expect(supportsEffort('claude-haiku-4-5-20251001')).toBe(false);
  });

  it('never includes a thinking parameter', () => {
    for (const m of ['claude-opus-5-5', 'claude-haiku-5-5', 'claude-haiku-4-5-20251001']) {
      const params = effortParams(m, 'high') as Record<string, unknown>;
      expect(params).not.toHaveProperty('thinking');
      expect(JSON.stringify(params)).not.toContain('budget_tokens');
    }
  });
});

describe('response helpers', () => {
  it('extractText joins only text blocks and skips thinking blocks', () => {
    const text = extractText([
      { type: 'thinking' },
      { type: 'text', text: '{"a":' },
      { type: 'redacted_thinking' },
      { type: 'text', text: '1}' },
    ]);
    expect(text).toBe('{"a":\n1}\n');
    expect(extractText(undefined)).toBe('');
    expect(extractText([])).toBe('');
  });

  it('detects refusal and max_tokens stop reasons', () => {
    expect(isRefusal('refusal')).toBe(true);
    expect(isRefusal('end_turn')).toBe(false);
    expect(isRefusal(null)).toBe(false);
    expect(isMaxTokensStop('max_tokens')).toBe(true);
    expect(isMaxTokensStop('refusal')).toBe(false);
  });

  it('warnOnAbnormalStop logs only for refusal / max_tokens', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnOnAbnormalStop('T', 'm', { content: [], stop_reason: 'end_turn' });
    expect(warn).not.toHaveBeenCalled();
    warnOnAbnormalStop('T', 'm', { content: [], stop_reason: 'max_tokens', usage: { output_tokens: 6000 } });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain('6000');
    warnOnAbnormalStop('T', 'm', { content: [], stop_reason: 'refusal' });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('isInCooldown', () => {
  const T0 = 1_000_000;
  it('is false when there is no recorded failure', () => {
    expect(isInCooldown(undefined, T0)).toBe(false);
    expect(isInCooldown(null, T0)).toBe(false);
  });
  it('is true within 10 minutes of the last failure and false afterwards', () => {
    expect(FAILURE_COOLDOWN_MS).toBe(600_000);
    expect(isInCooldown(T0, T0 + 1)).toBe(true);
    expect(isInCooldown(T0, T0 + FAILURE_COOLDOWN_MS - 1)).toBe(true);
    expect(isInCooldown(T0, T0 + FAILURE_COOLDOWN_MS)).toBe(false);
    expect(isInCooldown(T0, T0 + FAILURE_COOLDOWN_MS + 5000)).toBe(false);
  });
  it('accepts a custom cooldown', () => {
    expect(isInCooldown(T0, T0 + 500, 1000)).toBe(true);
    expect(isInCooldown(T0, T0 + 1000, 1000)).toBe(false);
  });
});

describe('max_tokens budgets', () => {
  it('keeps both Opus calls under the SDK non-streaming limit (21,333)', () => {
    expect(MAX_NON_STREAMING_TOKENS).toBe(21_333);
    expect(INSIGHT_PROFILES.rich.maxTokens).toBe(16_000);
    expect(INSIGHT_MAX_TOKENS).toBe(20_000);
    expect(INSIGHT_PROFILES.rich.maxTokens).toBeLessThanOrEqual(MAX_NON_STREAMING_TOKENS);
    expect(INSIGHT_MAX_TOKENS).toBeLessThanOrEqual(MAX_NON_STREAMING_TOKENS);
  });
  it('gives the Haiku 5.5 judge and classifier 6000 tokens (thinking tokens count)', () => {
    expect(JUDGE_MAX_TOKENS).toBe(6000);
    expect(CLASSIFY_MAX_TOKENS).toBe(6000);
  });
});
