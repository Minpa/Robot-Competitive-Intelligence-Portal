import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  POSTER_COLORS,
  POSTER_DURATION_BG,
  POSTER_TAILWIND_KEYS,
  POSTER_THUMB_GRADIENT,
  POSTER_THUMB_GRADIENT_FROM,
  POSTER_THUMB_GRADIENT_TO,
  POSTER_WHITE,
} from './weekly-brief-theme';

const require = createRequire(import.meta.url);

describe('weekly-brief-theme', () => {
  const config = require(path.resolve(__dirname, '../../tailwind.config.js'));
  const poster = config.theme.extend.colors.poster as Record<string, string>;

  it('팔레트 상수가 tailwind.config.js 의 poster 값과 일치한다', () => {
    for (const key of Object.keys(POSTER_COLORS) as (keyof typeof POSTER_COLORS)[]) {
      const twKey = POSTER_TAILWIND_KEYS[key];
      expect(poster[twKey], `poster.${twKey}`).toBe(POSTER_COLORS[key]);
    }
  });

  it('poster 그룹은 정확히 7개 값이다 (범위 한정)', () => {
    expect(Object.keys(poster)).toHaveLength(7);
    expect(Object.keys(POSTER_COLORS)).toHaveLength(7);
  });

  it('작은 글자 색(fg-2, fg-3)은 poster 배경 위에서 AA(4.5:1) 이상이다', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    expect(ratio(POSTER_COLORS.fg, POSTER_COLORS.base)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(POSTER_COLORS.fg2, POSTER_COLORS.base)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(POSTER_COLORS.fg3, POSTER_COLORS.base)).toBeGreaterThanOrEqual(4.5);
    // 카드·필 위에는 fg / fg-2 만 쓴다
    expect(ratio(POSTER_COLORS.fg, POSTER_COLORS.card)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(POSTER_COLORS.fg2, POSTER_COLORS.card)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(POSTER_COLORS.fg, POSTER_COLORS.pill)).toBeGreaterThanOrEqual(4.5);
  });

  it('보조 색 상수(썸네일 그라디언트·흰색·길이 배지 배경)가 존재하고 형식이 맞다', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    expect(POSTER_THUMB_GRADIENT_FROM).toMatch(hex);
    expect(POSTER_THUMB_GRADIENT_TO).toMatch(hex);
    expect(POSTER_WHITE).toMatch(hex);
    expect(POSTER_THUMB_GRADIENT).toBe(`linear-gradient(135deg,${POSTER_THUMB_GRADIENT_FROM},${POSTER_THUMB_GRADIENT_TO})`);
    expect(POSTER_DURATION_BG).toMatch(/^rgba\(\d+,\d+,\d+,(0?\.\d+|1)\)$/);
  });

  it('컴포넌트·HTML 빌더에 하드코딩된 hex/Tailwind 임의 색이 없다', () => {
    const files = [
      '../components/share/weekly/VideoThumbGrid.tsx',
      '../components/share/weekly/WeeklyBriefView.tsx',
      './weekly-brief-html.ts',
    ];
    for (const f of files) {
      const src = readFileSync(path.resolve(__dirname, f), 'utf8');
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
      expect(src, f).not.toMatch(/(?:bg|from|to|text|border)-\[#/);
    }
  });
});
