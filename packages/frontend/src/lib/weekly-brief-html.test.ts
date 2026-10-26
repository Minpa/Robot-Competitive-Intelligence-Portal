import { describe, expect, it } from 'vitest';
import type { WeeklyBriefResponse } from '@/types/weekly-brief';
import { POSTER_COLORS } from './weekly-brief-theme';
import { buildWeeklyBriefHtml, weeklyBriefFileName } from './weekly-brief-html';
import { makeArticle, makeEmptyBrief, makeFullBrief, makePartialBrief, makeVideo } from './weekly-brief-test-fixtures';

const META = { pageUrl: 'https://argos.example.com/share/weekly/2026-10-19' };

/** 명세 §7 금지 문자열 (대소문자 무시, 전체 출력 기준) */
const FORBIDDEN = [
  '<script',
  '<link',
  '@import',
  'url(',
  'http://',
  'javascript:',
  'data:',
  '<iframe',
  '<object',
  '<embed',
  '<form',
  'onerror',
  'onclick',
  'onload',
];

function expectClean(html: string) {
  const lower = html.toLowerCase();
  for (const f of FORBIDDEN) {
    expect(lower.includes(f), `금지 문자열 "${f}"`).toBe(false);
  }
  // src= 는 <img 안에서만
  const withoutImgs = html.replace(/<img\b[^>]*>/gi, '');
  expect(/\bsrc\s*=/i.test(withoutImgs), 'src= outside <img>').toBe(false);
  // 모든 img src 는 ytimg + referrerpolicy
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  for (const img of imgs) {
    const m = /\bsrc="([^"]*)"/.exec(img);
    expect(m, img).not.toBeNull();
    expect(m![1].startsWith('https://i.ytimg.com/'), m![1]).toBe(true);
    expect(img).toContain('referrerpolicy="no-referrer"');
    expect(img).toContain('loading="lazy"');
  }
  // 모든 href 는 https://
  for (const m of html.matchAll(/\bhref="([^"]*)"/gi)) {
    expect(m[1].startsWith('https://'), m[1]).toBe(true);
  }
  // 모든 <a 에는 target/rel
  for (const a of html.match(/<a\b[^>]*>/gi) ?? []) {
    expect(a).toContain('target="_blank"');
    expect(a).toContain('rel="noopener noreferrer"');
  }
}

describe('buildWeeklyBriefHtml', () => {
  it('기본 구조·중립 타이틀·헤더 메타', () => {
    const html = buildWeeklyBriefHtml(makeFullBrief(), META);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('<meta name="referrer" content="no-referrer">');
    expect(html).toContain('<title>ARGOS · 주간 브리프 2026-10-19 ~ 10-25 (Week 43)</title>');
    expect(html).toContain('<b>주간 브리프</b>');
    expect(html).toContain('2026-10-19 ~ 10-25 · Week 43');
    expect(html).toContain('Weekly Brief · Week 43');
    expect(html).toContain('생성 2026-10-26 08:05 KST');
    expect(html.match(/<style>/g)).toHaveLength(1);
    // 목업의 의미 기반 종합 문장 타이틀을 쓰지 않는다
    expect(html).not.toContain('내재화는 계속되고');
  });

  it('색은 테마 상수를 쓴다', () => {
    const html = buildWeeklyBriefHtml(makeFullBrief(), META);
    for (const c of Object.values(POSTER_COLORS)) expect(html.toLowerCase()).toContain(c.toLowerCase());
    expect(html).toContain('max-width:760px');
    expect(html).toContain('@media (max-width:640px)');
    expect(html).toContain('@media print');
    expect(html).toContain('print-color-adjust:exact');
  });

  it('모든 섹션 렌더 + 금지 문자열 0건', () => {
    const html = buildWeeklyBriefHtml(makeFullBrief(), META);
    expectClean(html);
    expect(html).toContain('CI 변화');
    expect(html).toContain('키워드 흐름');
    expect(html).toContain('이번 주 영상');
    expect(html).toContain('주요 기사');
    expect(html).toContain('이번 주 가장 많이 본 영상');
    expect(html).toContain('수집 시점 조회수');
    // 썸네일: topVideo 1 + videos 8
    expect((html.match(/<img\b/g) ?? []).length).toBe(9);
    expect(html).toContain('기사 187 (▲12%)');
    expect(html).toContain('신규 로봇 2');
    expect(html).toContain('조회 1.2M');
    expect(html).toContain('12:40');
    expect(html).toContain('+41');
    expect(html).toContain('QDD');
  });

  it('동일 입력 2회 출력이 바이트 단위로 동일', () => {
    const a = buildWeeklyBriefHtml(makeFullBrief(), META);
    const b = buildWeeklyBriefHtml(makeFullBrief(), META);
    expect(a).toBe(b);
  });

  it('빈 섹션은 통째로 생략하고 안내만 남긴다', () => {
    const html = buildWeeklyBriefHtml(makeEmptyBrief(), META);
    expectClean(html);
    for (const s of ['CI 변화', '키워드 흐름', '이번 주 영상', '주요 기사', '이번 주 가장 많이 본 영상']) {
      expect(html).not.toContain(s);
    }
    expect(html).not.toContain('<img');
    expect(html).toContain('이번 주 수집된 데이터가 부족합니다');
    expect(html).toContain('주간 브리프');
  });

  it('일부 섹션만 비면 그 섹션만 생략한다', () => {
    const b = makeFullBrief();
    b.payload.ciChanges = [];
    b.payload.articles = [];
    b.payload.topVideo = null;
    const html = buildWeeklyBriefHtml(b, META);
    expect(html).not.toContain('CI 변화');
    expect(html).not.toContain('주요 기사');
    expect(html).not.toContain('이번 주 가장 많이 본 영상');
    expect(html).toContain('키워드 흐름');
    expect(html).toContain('이번 주 영상');
    expect(html).not.toContain('이번 주 수집된 데이터가 부족합니다');
  });

  it('partial 이면 규칙 기반 문구를 포함하고 ok 이면 포함하지 않는다', () => {
    expect(buildWeeklyBriefHtml(makePartialBrief(), META)).toContain('일부 문장은 규칙 기반으로 생성되었습니다.');
    expect(buildWeeklyBriefHtml(makeFullBrief(), META)).not.toContain('규칙 기반');
  });

  it('푸터 고지문과 생성일', () => {
    const html = buildWeeklyBriefHtml(makeFullBrief(), META);
    expect(html).toContain('원문을 복제하지 않습니다');
    expect(html).toContain('조회수는 수집 시점 값입니다');
    expect(html).toContain('ARGOS · 2026-10-26');
  });

  it('파일명', () => {
    expect(weeklyBriefFileName(makeFullBrief())).toBe('ARGOS_WeeklyBrief_2026-10-19_W43.html');
  });
});

describe('악성 입력', () => {
  const XSS = '<img src=x onerror=alert(1)>"';

  function evil(): WeeklyBriefResponse {
    const b = makeFullBrief();
    const p = b.payload;
    p.keyMessages[0].headline = XSS;
    p.keyMessages[0].bigNumber.caption = XSS;
    p.keyMessages[0].basis = XSS;
    p.keyMessages[0].note = XSS;
    p.keyMessages[0].evidence[0].title = XSS;
    p.keyMessages[0].evidence[0].label = XSS;
    p.keyMessages[0].evidence[0].url = 'javascript:alert(1)';
    p.keyMessages[0].evidence[1].url = 'http://news.example.com/x';
    p.topVideo!.title = XSS;
    p.topVideo!.channel = XSS;
    p.topVideo!.analysisLine = XSS;
    p.topVideo!.url = 'javascript:alert(1)';
    p.topVideo!.thumbnail = 'javascript:alert(1)';
    p.ciChanges[0].company = XSS;
    p.ciChanges[0].item = XSS;
    p.ciChanges[0].after = XSS;
    p.ciChanges[0].before = XSS;
    p.ciChanges[0].sourceName = XSS;
    p.ciChanges[0].sourceUrl = 'http://example.com/insecure';
    p.ciChanges[1].sourceUrl = 'https://user:pass@example.com/cred';
    p.keywords[0].term = XSS;
    p.keywords[1].term = XSS;
    p.videos[0] = makeVideo(1, { title: XSS, channel: XSS, url: 'https://evil.example.com/watch?v=1', thumbnail: 'https://evil.example.com/a.jpg' });
    p.videos[1] = makeVideo(2, { url: 'http://www.youtube.com/watch?v=2', thumbnail: 'http://i.ytimg.com/vi/2/mqdefault.jpg' });
    p.videos[2] = makeVideo(3, { url: 'javascript:alert(1)', thumbnail: 'data:image/png;base64,AAAA' });
    p.articles[0] = makeArticle(0, { title: XSS, source: XSS, summaryLine: XSS, url: 'javascript:alert(1)' });
    p.articles[1] = makeArticle(1, { url: 'http://news.example.com/x' });
    p.articles[2] = makeArticle(2, { url: 'https://user:pass@news.example.com/x' });
    p.articles[3] = makeArticle(3, { url: 'https://news.example.com/redirect?u=javascript:alert(1)' });
    p.articles[4] = makeArticle(4, { title: 'Robot data: a study; see http://example.com and url(x) onload onclick', url: 'https://news.example.com/ok' });
    return b;
  }

  it('XSS 페이로드는 이스케이프되고 금지 문자열이 출력에 없다', () => {
    const html = buildWeeklyBriefHtml(evil(), META);
    expectClean(html);
    expect(html).toContain('&lt;img');
    expect(html).toContain('&quot;');
    expect(html).not.toMatch(/<img[^>]*src=x/i);
    expect(html).not.toContain('alert(1)>');
  });

  it('javascript: / http:// / 자격증명 / 허용되지 않은 호스트는 링크·이미지로 나오지 않는다', () => {
    const html = buildWeeklyBriefHtml(evil(), META);
    expect(html).not.toContain('evil.example.com');
    expect(html).not.toContain('user:pass');
    expect(html).not.toContain('news.example.com/x');
    expect(html).not.toContain('example.com/insecure');
    expect(html).not.toContain('redirect?u=');
    // 정상 URL 은 유지
    expect(html).toContain('https://news.example.com/ok');
    // 텍스트로는 남는다 (링크만 제거)
    expect(html).toContain('Robot headline number 1');
  });

  it('썸네일이 안전하지 않은 영상은 빈 플레이스홀더', () => {
    const b = makeFullBrief();
    b.payload.topVideo = null;
    b.payload.videos = [makeVideo(1, { thumbnail: 'https://evil.example.com/a.jpg' }), makeVideo(2)];
    const html = buildWeeklyBriefHtml(b, META);
    expect((html.match(/<img\b/g) ?? []).length).toBe(1);
    expect(html).toContain('thw ph');
    expectClean(html);
  });

  it('본문에 우연히 금지 토큰이 있어도 폭 없는 공백으로 끊어 출력에서 제거한다', () => {
    const b = makeFullBrief();
    b.payload.articles[0] = makeArticle(0, { title: 'Robot data: new http://x.example onload javascript:foo' });
    const html = buildWeeklyBriefHtml(b, META);
    expectClean(html);
    expect(html.replace(/​/g, '')).toContain('Robot data: new http://x.example onload javascript:foo');
  });
});
