import { describe, expect, it } from 'vitest';
import { parseBriefMarkdown, parseInline } from './brief-markdown';

describe('parseBriefMarkdown', () => {
  it('parses the allowed syntax only', () => {
    const blocks = parseBriefMarkdown('# 제목\n## 소제목\n\n- 항목 **강조** 끝\n문단');
    expect(blocks.map((b) => b.type)).toEqual(['h1', 'h2', 'gap', 'li', 'p']);
    const li = blocks[3]!;
    expect(li.type === 'li' && li.inlines).toEqual([
      { text: '항목 ', bold: false },
      { text: '강조', bold: true },
      { text: ' 끝', bold: false },
    ]);
  });

  it('keeps script tags, img onerror and javascript links as plain text (never as markup)', () => {
    const md = '# <script>alert(1)</script>\n- <img src=x onerror=alert(1)>\n[click](javascript:alert(1))';
    const blocks = parseBriefMarkdown(md);
    const texts = blocks.flatMap((b) => ('inlines' in b ? b.inlines.map((i) => i.text) : []));
    expect(texts.join('|')).toContain('<script>alert(1)</script>');
    // 파서 출력은 문자열뿐이다: HTML 문자열을 만들지 않는다
    expect(JSON.stringify(blocks)).not.toContain('__html');
    expect(blocks.every((b) => b.type !== 'gap' || Object.keys(b).length === 1)).toBe(true);
  });

  it('handles empty and non-string input', () => {
    expect(parseBriefMarkdown(undefined)).toEqual([]);
    expect(parseBriefMarkdown('')).toEqual([]);
    expect(parseInline('a ** b')).toEqual([{ text: 'a ** b', bold: false }]);
  });
});
