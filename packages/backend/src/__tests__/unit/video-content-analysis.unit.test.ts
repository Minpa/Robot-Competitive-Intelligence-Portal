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
