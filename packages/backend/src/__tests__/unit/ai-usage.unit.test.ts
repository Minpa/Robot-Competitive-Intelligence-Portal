/**
 * ai-usage.service estimateCost 단위 테스트
 *
 * estimateCost는 export된 순수 함수이므로 db 연결 없이 테스트 가능하다.
 * 단, 단가 상수(GEMINI_PRICE_INPUT/OUTPUT)는 모듈 로드 시 1회 평가되므로,
 * env 오버라이드를 검증하는 케이스에서는 vi.stubEnv + vi.resetModules로
 * 모듈을 재로드해 확인한다.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { estimateCost, resolveClaudeMonthlyLimitUsd } from '../../services/ai-usage.service.js';

describe('estimateCost', () => {
  it('gemini-flash-latest — env 미설정 시 기본 단가 0.75/3.75 적용 (= gemini-3.7-flash)', () => {
    const cost = estimateCost({
      provider: 'gemini',
      model: 'gemini-flash-latest',
      webSearch: false,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.75 + 3.75, 6);
  });

  it('gemini-3.7-flash — env 미설정 시 동일 단가 0.75/3.75 적용', () => {
    const cost = estimateCost({
      provider: 'gemini',
      model: 'gemini-3.7-flash',
      webSearch: false,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.75 + 3.75, 6);
  });

  it('gemini-3.6-flash — 고정 단가 1.50/7.50 적용', () => {
    const cost = estimateCost({
      provider: 'gemini',
      model: 'gemini-3.6-flash',
      webSearch: false,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(1.5 + 7.5, 6);
  });

  describe('env 오버라이드 (GEMINI_PRICE_INPUT_PER_1M / GEMINI_PRICE_OUTPUT_PER_1M)', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('input만 오버라이드', async () => {
      vi.stubEnv('GEMINI_PRICE_INPUT_PER_1M', '2.5');
      vi.resetModules();
      const mod = await import('../../services/ai-usage.service.js');
      const cost = mod.estimateCost({
        provider: 'gemini',
        model: 'gemini-flash-latest',
        webSearch: false,
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(cost).toBeCloseTo(2.5 + 3.75, 6);
    });

    it('output만 오버라이드', async () => {
      vi.stubEnv('GEMINI_PRICE_OUTPUT_PER_1M', '10');
      vi.resetModules();
      const mod = await import('../../services/ai-usage.service.js');
      const cost = mod.estimateCost({
        provider: 'gemini',
        model: 'gemini-flash-latest',
        webSearch: false,
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(cost).toBeCloseTo(0.75 + 10, 6);
    });

    it('input/output 모두 오버라이드', async () => {
      vi.stubEnv('GEMINI_PRICE_INPUT_PER_1M', '2');
      vi.stubEnv('GEMINI_PRICE_OUTPUT_PER_1M', '9');
      vi.resetModules();
      const mod = await import('../../services/ai-usage.service.js');
      const cost = mod.estimateCost({
        provider: 'gemini',
        model: 'gemini-flash-latest',
        webSearch: false,
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(cost).toBeCloseTo(2 + 9, 6);
    });
  });

  it('provider gemini + 미등록 모델 — gemini 기본 단가(0.75/3.75) 적용 (3.0/15.0 아님)', () => {
    const cost = estimateCost({
      provider: 'gemini',
      model: 'gemini-unknown-model',
      webSearch: false,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(0.75 + 3.75, 6);
    expect(cost).not.toBeCloseTo(3.0 + 15.0, 6);
  });

  it('claude-haiku-4-5-20251001 — 1.00/5.00 적용', () => {
    const cost = estimateCost({
      provider: 'claude',
      model: 'claude-haiku-4-5-20251001',
      webSearch: false,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(1.0 + 5.0, 6);
  });

  it('webSearch=true + claude-haiku-4-5-20251001 — webSearchPerQuery 0.01 합산', () => {
    const cost = estimateCost({
      provider: 'claude',
      model: 'claude-haiku-4-5-20251001',
      webSearch: true,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(1.0 + 5.0 + 0.01, 6);
  });

  describe('회귀 — 기존 provider/모델 단가 유지', () => {
    it('claude-sonnet-4-20250514 — 3.0/15.0', () => {
      const cost = estimateCost({
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        webSearch: false,
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(cost).toBeCloseTo(3.0 + 15.0, 6);
    });

    it('gpt-4o-mini — 0.15/0.60', () => {
      const cost = estimateCost({
        provider: 'chatgpt',
        model: 'gpt-4o-mini',
        webSearch: false,
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(cost).toBeCloseTo(0.15 + 0.6, 6);
    });

    it('미등록 claude 모델 — 폴백 3.0/15.0', () => {
      const cost = estimateCost({
        provider: 'claude',
        model: 'claude-unknown-model',
        webSearch: false,
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
      });
      expect(cost).toBeCloseTo(3.0 + 15.0, 6);
    });
  });

  it('webSearch=true + claude-sonnet-4-20250514 — webSearchPerQuery 0.01 합산', () => {
    const cost = estimateCost({
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      webSearch: true,
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(3.0 + 15.0 + 0.01, 6);
  });
});

describe('Claude 5.5 pricing', () => {
  const million = { webSearch: false, inputTokens: 1_000_000, outputTokens: 1_000_000 } as const;

  it('claude-opus-5-5 — 입력 $4 / 출력 $20 (1M/1M = $24)', () => {
    expect(estimateCost({ provider: 'claude', model: 'claude-opus-5-5', ...million })).toBeCloseTo(24, 6);
    expect(
      estimateCost({ provider: 'claude', model: 'claude-opus-5-5', webSearch: false, inputTokens: 40_000, outputTokens: 12_000 })
    ).toBeCloseTo(0.16 + 0.24, 6);
  });

  it('claude-haiku-5-5 — 입력 $0.10 / 출력 $0.50 (1M/1M = $0.60)', () => {
    expect(estimateCost({ provider: 'claude', model: 'claude-haiku-5-5', ...million })).toBeCloseTo(0.6, 6);
  });

  it('두 신규 모델은 웹 검색 비용을 가산하지 않는다', () => {
    for (const model of ['claude-opus-5-5', 'claude-haiku-5-5']) {
      const withSearch = estimateCost({ provider: 'claude', model, ...million, webSearch: true });
      const without = estimateCost({ provider: 'claude', model, ...million });
      expect(withSearch).toBeCloseTo(without, 9);
    }
  });

  it('기존 항목과 폴백은 불변 — haiku-4-5 1.0/5.0, 미등록 claude 3.0/15.0', () => {
    expect(estimateCost({ provider: 'claude', model: 'claude-haiku-4-5-20251001', ...million })).toBeCloseTo(6, 6);
    expect(estimateCost({ provider: 'claude', model: 'claude-unregistered-xyz', ...million })).toBeCloseTo(18, 6);
  });

  it('미등록 claude 모델은 모델별로 한 번만 경고한다', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entry = { provider: 'claude', model: 'claude-warn-once-test', ...million } as const;
    estimateCost(entry);
    estimateCost(entry);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('resolveClaudeMonthlyLimitUsd', () => {
  it('기본값 50, CLAUDE_MONTHLY_LIMIT_USD(양수)가 있으면 그 값', () => {
    expect(resolveClaudeMonthlyLimitUsd({})).toBe(50);
    expect(resolveClaudeMonthlyLimitUsd({ CLAUDE_MONTHLY_LIMIT_USD: '120' })).toBe(120);
    expect(resolveClaudeMonthlyLimitUsd({ CLAUDE_MONTHLY_LIMIT_USD: '12.5' })).toBe(12.5);
  });
  it('비정상 값(빈 문자열·0·음수·문자)은 기본값 50', () => {
    for (const v of ['', '0', '-3', 'abc']) {
      expect(resolveClaudeMonthlyLimitUsd({ CLAUDE_MONTHLY_LIMIT_USD: v })).toBe(50);
    }
  });
});
