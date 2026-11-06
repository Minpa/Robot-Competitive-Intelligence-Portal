/**
 * 월간 브리프 마크다운 → 안전한 블록 구조.
 *
 * LLM 이 만든 마크다운을 HTML 문자열로 바꿔 dangerouslySetInnerHTML 에 넣지 않고,
 * 허용 문법(# / ## / - 목록 / **굵게** / 문단)만 구조로 파싱한다. 모든 텍스트는 React 텍스트 노드로만 렌더되므로
 * <script>, <img onerror>, javascript: 링크는 문자열 그대로 표시될 뿐 실행되지 않는다.
 */

export type BriefInline = { text: string; bold: boolean };

export type BriefBlock =
  | { type: 'h1'; inlines: BriefInline[] }
  | { type: 'h2'; inlines: BriefInline[] }
  | { type: 'li'; inlines: BriefInline[] }
  | { type: 'p'; inlines: BriefInline[] }
  | { type: 'gap' };

/** `**굵게**` 만 해석한다. 닫히지 않은 `**` 는 그대로 텍스트 */
export function parseInline(line: string): BriefInline[] {
  const out: BriefInline[] = [];
  let rest = line;
  while (rest.length > 0) {
    const start = rest.indexOf('**');
    if (start === -1) {
      out.push({ text: rest, bold: false });
      break;
    }
    const end = rest.indexOf('**', start + 2);
    if (end === -1) {
      out.push({ text: rest, bold: false });
      break;
    }
    if (start > 0) out.push({ text: rest.slice(0, start), bold: false });
    const inner = rest.slice(start + 2, end);
    if (inner) out.push({ text: inner, bold: true });
    rest = rest.slice(end + 2);
  }
  return out;
}

export function parseBriefMarkdown(markdown: unknown): BriefBlock[] {
  if (typeof markdown !== 'string' || !markdown) return [];
  const blocks: BriefBlock[] = [];
  let prevBlank = false;
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.trim() === '') {
      if (!prevBlank && blocks.length > 0) blocks.push({ type: 'gap' });
      prevBlank = true;
      continue;
    }
    prevBlank = false;
    let m: RegExpExecArray | null;
    if ((m = /^# (.+)$/.exec(line))) blocks.push({ type: 'h1', inlines: parseInline(m[1]!) });
    else if ((m = /^## (.+)$/.exec(line))) blocks.push({ type: 'h2', inlines: parseInline(m[1]!) });
    else if ((m = /^- (.+)$/.exec(line))) blocks.push({ type: 'li', inlines: parseInline(m[1]!) });
    else blocks.push({ type: 'p', inlines: parseInline(line) });
  }
  return blocks;
}
