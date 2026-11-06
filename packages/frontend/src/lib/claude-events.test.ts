import { describe, expect, it } from 'vitest';
import { cleanEventText, safeEventUrl, validateEvent } from './claude-events';

describe('safeEventUrl', () => {
  it('accepts public https urls only', () => {
    expect(safeEventUrl('https://www.ces.tech/')).toBe('https://www.ces.tech/');
    for (const u of ['http://x.example.com', 'javascript:alert(1)', 'data:text/html,x', 'https://u:p@example.com', 'https://localhost/x', 'https://127.0.0.1', 'https://[::1]/', 'https://intranet/', 'not a url', '', 'https://example.com/' + 'a'.repeat(2000)]) {
      expect(safeEventUrl(u)).toBe('');
    }
    expect(safeEventUrl(42)).toBe('');
  });
});

describe('validateEvent', () => {
  it('drops bad urls and strips html from text fields', () => {
    const ev = validateEvent(
      { name: 'ICRA <script>alert(1)</script> 2027', type: '학회', date_start: '2027-05-01', url: 'javascript:alert(1)', tags: ['<b>AI</b>', 'robot'], location: 'Seoul <img src=x onerror=alert(1)>', country: '한국' },
      0,
    );
    expect(ev).not.toBeNull();
    expect(ev!.url).toBe('');
    expect(ev!.name).not.toMatch(/[<>]/);
    expect(ev!.location).not.toMatch(/[<>]/);
    expect(ev!.tags).toEqual(['AI', 'robot']);
  });
  it('keeps a valid https url', () => {
    const ev = validateEvent({ name: 'CES', type: '전시', date_start: '2027-01-05', url: 'https://www.ces.tech/' }, 0);
    expect(ev!.url).toBe('https://www.ces.tech/');
  });
  it('cleanEventText strips tags and caps length', () => {
    expect(cleanEventText('<b>a</b>  b', 10)).toBe('a b');
    expect(cleanEventText('x'.repeat(50), 10)).toHaveLength(10);
  });
});
