/**
 * 주간 브리프 문구 용어집 — 백엔드/프론트 types/weekly-brief-wording.ts 동일성, 옛 분석 도구 말투가 남지 않았는지
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WEEKLY_WORDING, movementLabelKo } from '../../types/weekly-brief-wording.js';
import { POSITION_LABEL_KO } from '../../services/weekly-brief-position.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendFile = path.resolve(here, '../../types/weekly-brief-wording.ts');
const frontendFile = path.resolve(here, '../../../../frontend/src/types/weekly-brief-wording.ts');

function normalize(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/\s+/g, '');
}

function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe('weekly-brief wording contract', () => {
  it('backend and frontend copies are identical apart from comments and whitespace', () => {
    const be = normalize(fs.readFileSync(backendFile, 'utf-8'));
    const fe = normalize(fs.readFileSync(frontendFile, 'utf-8'));
    expect(be.length).toBeGreaterThan(500);
    expect(fe).toBe(be);
  });

  it('has none of the old analyst-tool wording in visible text', () => {
    const { jargonBanned: _b, jargonAlternatives: _a, ...visible } = WEEKLY_WORDING;
    const text = strings(visible).join('\n');
    for (const old of ['이번 주 결론', '격차', '리더 판단', '근거 자료', '우리 위치 미등록', '관측', '신호', '판정']) {
      expect(text, old).not.toContain(old);
    }
  });

  it('movementLabelKo follows the position x movement table', () => {
    const t = [
      ['competitor_ahead', 'competitor_closing', '차이가 더 벌어지는 중'],
      ['competitor_ahead', 'competitor_receding', '차이가 줄어드는 중'],
      ['we_ahead', 'competitor_closing', '경쟁사가 따라오는 중'],
      ['we_ahead', 'competitor_receding', '우리가 더 앞서는 중'],
      ['parity', 'competitor_closing', '경쟁사 쪽으로 기우는 중'],
      ['parity', 'competitor_receding', '우리 쪽으로 기우는 중'],
    ] as const;
    for (const [p, m, l] of t) expect(movementLabelKo(p, m)).toBe(l);
    for (const p of ['competitor_ahead', 'we_ahead', 'parity'] as const) {
      expect(movementLabelKo(p, 'steady')).toBe('큰 변화 없음');
      expect(movementLabelKo(p, 'first_seen')).toBe('이번 주 처음 확인');
    }
    expect(movementLabelKo(null, 'steady')).toBeNull();
    expect(movementLabelKo('parity', null)).toBeNull();
  });

  it('server labelKo tables come from the glossary', () => {
    expect(POSITION_LABEL_KO).toEqual(WEEKLY_WORDING.positions);
    });
});
