/**
 * VideoContentAnalysisService Unit Tests
 *
 * GEMINI_API_KEY가 설정되지 않은 경우의 no-op 동작과,
 * 공개 YouTube watch URL 검증 정규식(서비스와 동일 패턴)을 테스트한다.
 * DB 접근이 필요한 경로(getPending/analyzeOne 성공 케이스)는
 * 여기서는 GEMINI_API_KEY 미설정 no-op 분기로만 검증한다 (DB 연결 없이 동작 확인 가능).
 */

import { describe, it, expect, beforeAll } from 'vitest';

// GEMINI_API_KEY가 설정되지 않은 상태로 서비스를 로드해 no-op(client=null) 경로를 검증한다.
delete process.env.GEMINI_API_KEY;

describe('VideoContentAnalysisService (no GEMINI_API_KEY)', () => {
  let service: typeof import('../../services/video-content-analysis.service.js')['videoContentAnalysisService'];

  beforeAll(async () => {
    const mod = await import('../../services/video-content-analysis.service.js');
    service = mod.videoContentAnalysisService;
  });

  it('analyzeSingle returns ok:false without touching the database when API key missing', async () => {
    const result = await service.analyzeSingle('00000000-0000-0000-0000-000000000000');
    expect(result).toEqual({ ok: false, error: 'GEMINI_API_KEY not configured' });
  });

  it('run() is a no-op returning zeroed counts when API key missing', async () => {
    const result = await service.run();
    expect(result).toEqual({ analyzed: 0, failed: 0, skipped: 0 });
  });

  it('run() with an explicit limit still no-ops without a database call', async () => {
    const result = await service.run(5);
    expect(result).toEqual({ analyzed: 0, failed: 0, skipped: 0 });
  });
});

describe('parseAnalysis technicalAnalysis normalization', () => {
  let parseAnalysis: typeof import('../../services/video-content-analysis.service.js')['parseAnalysis'];

  beforeAll(async () => {
    const mod = await import('../../services/video-content-analysis.service.js');
    parseAnalysis = mod.parseAnalysis;
  });

  // parseAnalysis의 필수 파싱 대상 필드(task/environment/autonomy/capabilities/keyMoments/summaryKo)를
  // 최소한으로 채운 유효 JSON에 technicalAnalysis만 바꿔가며 검증한다.
  function baseJson(technicalAnalysis: Record<string, unknown>) {
    return JSON.stringify({
      task: '테스트 작업',
      environment: '테스트 환경',
      autonomy: 'autonomous',
      autonomyEvidence: '근거',
      robotCount: 1,
      durationSec: 10,
      capabilities: ['보행'],
      keyMoments: [{ timestampSec: 0, description: '시작' }],
      summaryKo: '요약',
      technicalAnalysis,
    });
  }

  it('caps string fields to their max length', () => {
    const result = parseAnalysis(
      baseJson({
        locomotion: 'a'.repeat(300),
        manipulation: '조작 설명',
        hardware: '',
        controlNotes: null,
        technicalHighlights: [],
        limitations: [],
        maturity: 'lab',
        maturityEvidence: 'e'.repeat(300),
      }),
      'gemini-flash-latest'
    );

    expect(result?.technicalAnalysis?.locomotion).toHaveLength(200);
    expect(result?.technicalAnalysis?.locomotion).toBe('a'.repeat(200));
    expect(result?.technicalAnalysis?.hardware).toBeNull();
    expect(result?.technicalAnalysis?.manipulation).toBe('조작 설명');
    expect(result?.technicalAnalysis?.controlNotes).toBeNull();
    expect(result?.technicalAnalysis?.maturityEvidence).toHaveLength(150);
    expect(result?.technicalAnalysis?.maturityEvidence).toBe('e'.repeat(150));
  });

  it('caps technicalHighlights to 4 items of 80 chars each', () => {
    const result = parseAnalysis(
      baseJson({
        locomotion: null,
        manipulation: null,
        hardware: null,
        controlNotes: null,
        technicalHighlights: ['h'.repeat(100), 'two', 'three', 'four', 'five'],
        limitations: [],
        maturity: 'unclear',
        maturityEvidence: null,
      }),
      'gemini-flash-latest'
    );

    expect(result?.technicalAnalysis?.technicalHighlights).toHaveLength(4);
    expect(result?.technicalAnalysis?.technicalHighlights?.[0]).toHaveLength(80);
    expect(result?.technicalAnalysis?.technicalHighlights?.[0]).toBe('h'.repeat(80));
  });

  it('caps limitations to 3 items', () => {
    const result = parseAnalysis(
      baseJson({
        locomotion: null,
        manipulation: null,
        hardware: null,
        controlNotes: null,
        technicalHighlights: [],
        limitations: ['one', 'two', 'three', 'four'],
        maturity: 'unclear',
        maturityEvidence: null,
      }),
      'gemini-flash-latest'
    );

    expect(result?.technicalAnalysis?.limitations).toHaveLength(3);
    expect(result?.technicalAnalysis?.limitations).toEqual(['one', 'two', 'three']);
  });

  it('falls back invalid maturity values to "unclear"', () => {
    const result = parseAnalysis(
      baseJson({
        locomotion: null,
        manipulation: null,
        hardware: null,
        controlNotes: null,
        technicalHighlights: [],
        limitations: [],
        maturity: 'invalid-value',
        maturityEvidence: null,
      }),
      'gemini-flash-latest'
    );

    expect(result?.technicalAnalysis?.maturity).toBe('unclear');
  });

  it('leaves technicalAnalysis undefined when the key is absent from the response', () => {
    const json = JSON.stringify({
      task: '테스트 작업',
      environment: '테스트 환경',
      autonomy: 'autonomous',
      capabilities: [],
      keyMoments: [],
      summaryKo: '요약',
    });
    const result = parseAnalysis(json, 'gemini-flash-latest');
    expect(result?.technicalAnalysis).toBeUndefined();
  });
});

describe('Public YouTube watch URL validation (same pattern as service)', () => {
  // video-content-analysis.service.ts 의 YOUTUBE_WATCH_URL_RE 와 동일한 패턴
  const YOUTUBE_WATCH_URL_RE = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i;

  it('accepts standard public watch URLs', () => {
    expect(YOUTUBE_WATCH_URL_RE.test('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(YOUTUBE_WATCH_URL_RE.test('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(YOUTUBE_WATCH_URL_RE.test('http://www.youtube.com/watch?v=abc-123_XYZ')).toBe(true);
  });

  it('rejects non-watch YouTube URLs and other domains', () => {
    expect(YOUTUBE_WATCH_URL_RE.test('https://youtu.be/dQw4w9WgXcQ')).toBe(false);
    expect(YOUTUBE_WATCH_URL_RE.test('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(false);
    expect(YOUTUBE_WATCH_URL_RE.test('https://example.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(YOUTUBE_WATCH_URL_RE.test('not a url')).toBe(false);
  });
});

describe('buildAnalysisPrompt / parseDomainFocus / parseAnalysis domainFocus', () => {
  let mod: typeof import('../../services/video-content-analysis.service.js');

  beforeAll(async () => {
    mod = await import('../../services/video-content-analysis.service.js');
  });

  const base = {
    task: '테스트 작업',
    environment: '테스트 환경',
    autonomy: 'autonomous',
    capabilities: ['보행'],
    keyMoments: [],
    summaryKo: '요약',
  };

  it('buildAnalysisPrompt() without args is identical to PROMPT_KO (scheduled batch unchanged)', () => {
    expect(mod.buildAnalysisPrompt()).toBe(mod.PROMPT_KO);
    expect(mod.PROMPT_KO.startsWith('이 영상은 로봇 데모 영상이다.')).toBe(true);
    expect(mod.PROMPT_KO.endsWith('JSON 객체만 응답하고 다른 텍스트는 포함하지 말라.')).toBe(true);
    expect(mod.PROMPT_KO).not.toContain('domainFocus');
  });

  it("buildAnalysisPrompt('hand') adds domainFocus rules and keeps JSON-only instruction", () => {
    const p = mod.buildAnalysisPrompt('hand');
    expect(p).not.toBe(mod.PROMPT_KO);
    expect(p).toContain('domainFocus');
    expect(p).toContain('primary');
    expect(p).toContain('secondary');
    expect(p).toContain('none');
    expect(p).toContain('실제 로봇 데모가 아닐 수도 있다');
    expect(p).toContain('JSON 객체만 응답하고 다른 텍스트는 포함하지 말라.');
    expect(p).toContain('자막 전문이나 장문 전사를 포함하지 말라');
  });

  it('parseDomainFocus parses valid values, normalizes case/space', () => {
    expect(mod.parseDomainFocus({ hand: 'primary', reason: '핸드 중심' })).toEqual({
      level: 'primary',
      reason: '핸드 중심',
    });
    expect(mod.parseDomainFocus({ hand: 'PRIMARY ', reason: 'x' })?.level).toBe('primary');
  });

  it('parseDomainFocus returns null for out-of-enum or non-object input', () => {
    expect(mod.parseDomainFocus({ hand: 'maybe', reason: 'x' })).toBeNull();
    expect(mod.parseDomainFocus({ reason: 'x' })).toBeNull();
    expect(mod.parseDomainFocus(null)).toBeNull();
    expect(mod.parseDomainFocus('primary')).toBeNull();
    expect(mod.parseDomainFocus([{ hand: 'primary' }])).toBeNull();
  });

  it('parseDomainFocus treats missing reason as empty string and caps reason at 120 chars', () => {
    expect(mod.parseDomainFocus({ hand: 'none' })).toEqual({ level: 'none', reason: '' });
    expect(mod.parseDomainFocus({ hand: 'secondary', reason: 'r'.repeat(200) })?.reason).toHaveLength(120);
  });

  it('parseAnalysis fills domainFocus when present', () => {
    const r = mod.parseAnalysis(
      JSON.stringify({ ...base, domainFocus: { hand: 'secondary', reason: '조작 구간 있음' } }),
      'm'
    );
    expect(r?.domainFocus).toEqual({ hand: 'secondary', reason: '조작 구간 있음' });
    expect(r?.summaryKo).toBe('요약');
  });

  it('parseAnalysis leaves domainFocus undefined when absent (regression)', () => {
    const r = mod.parseAnalysis(JSON.stringify(base), 'm');
    expect(r?.domainFocus).toBeUndefined();
    expect(r?.task).toBe('테스트 작업');
    expect(r?.capabilities).toEqual(['보행']);
  });

  it('parseAnalysis ignores bad domainFocus values and keeps the 400-char summary cap', () => {
    const r = mod.parseAnalysis(
      JSON.stringify({ ...base, summaryKo: 's'.repeat(500), domainFocus: { hand: 'dunno', reason: 'x' } }),
      'm'
    );
    expect(r?.domainFocus).toBeUndefined();
    expect(r?.summaryKo).toHaveLength(400);
  });

  it('isPublicYoutubeWatchUrl mirrors the watch-URL pattern', () => {
    expect(mod.isPublicYoutubeWatchUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(mod.isPublicYoutubeWatchUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(false);
    expect(mod.isPublicYoutubeWatchUrl(null)).toBe(false);
    expect(mod.MAX_ATTEMPTS).toBeGreaterThanOrEqual(1);
  });
});
