import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  recordInputGuard,
  recordOutputReject,
  createRejectCollector,
  getLlmGuardSnapshot,
  resetLlmGuardMetrics,
} from '../../services/llm-guard-metrics.js';
import { UNTRUSTED_DATA_NOTICE, UNTRUSTED_DATA_NOTICE_EN, composeSystemPrompt, makeDataBlockDelimiters } from '../../services/llm-guard-prompts.js';

describe('llm-guard-metrics', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetLlmGuardMetrics();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => logSpy.mockRestore());

  it('counts input guard results per point and logs one line per kind without any text', () => {
    recordInputGuard('video_tagging', [
      { truncated: true, hits: [{ category: 'override' }, { category: 'override' }] },
      { truncated: false, hits: [{ category: 'role' }] },
      { truncated: false, hits: [] },
    ]);
    const snap = getLlmGuardSnapshot();
    const c = snap.points.video_tagging!;
    expect(c.inputsSanitized).toBe(3);
    expect(c.truncated).toBe(1);
    expect(c.injectionFlagged).toEqual({ override: 1, role: 1 });
    expect(snap.totals.inputsSanitized).toBe(3);
    const lines = logSpy.mock.calls.map((a) => String(a[0]));
    expect(lines).toContain('[LlmGuard] point=video_tagging phase=input kind=truncated count=1');
    expect(lines).toContain('[LlmGuard] point=video_tagging phase=input kind=injection count=2');
  });

  it('counts output rejections and collects reasons', () => {
    recordOutputReject('paper_summary', 'url', 2);
    const col = createRejectCollector('paper_summary');
    col.onReject('leak', 'ko');
    col.onReject('leak', 'ko');
    col.flush();
    const c = getLlmGuardSnapshot().points.paper_summary!;
    expect(c.outputRejected).toEqual({ url: 2, leak: 2 });
    expect(c.fieldsDropped).toBe(4);
    expect(getLlmGuardSnapshot().recent.length).toBe(2);
    expect(logSpy).toHaveBeenCalledWith('[LlmGuard] point=paper_summary phase=output kind=leak count=2');
  });

  it('does nothing for empty or zero counts', () => {
    recordInputGuard('x', []);
    recordOutputReject('x', 'url', 0);
    expect(getLlmGuardSnapshot().points).toEqual({});
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('snapshot is a copy', () => {
    recordOutputReject('p', 'schema');
    const s = getLlmGuardSnapshot();
    s.points.p!.fieldsDropped = 99;
    expect(getLlmGuardSnapshot().points.p!.fieldsDropped).toBe(1);
  });
});

describe('llm-guard-prompts', () => {
  it('notice exists in both languages and composeSystemPrompt appends it', () => {
    expect(UNTRUSTED_DATA_NOTICE).toMatch(/무시/);
    expect(UNTRUSTED_DATA_NOTICE_EN).toMatch(/ignore/i);
    expect(composeSystemPrompt('rules', { lang: 'en' })).toContain(UNTRUSTED_DATA_NOTICE_EN);
    expect(composeSystemPrompt('rules', { webSearch: true, video: true })).toMatch(/웹 검색 결과[\s\S]*영상 속/);
  });
  it('delimiters carry the nonce', () => {
    const d = makeDataBlockDelimiters('abc123');
    expect(d.open).toContain('abc123');
    expect(d.close).toContain('abc123');
    expect(d.open).not.toBe(d.close);
  });
});
