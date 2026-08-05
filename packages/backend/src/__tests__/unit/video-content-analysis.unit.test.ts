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
