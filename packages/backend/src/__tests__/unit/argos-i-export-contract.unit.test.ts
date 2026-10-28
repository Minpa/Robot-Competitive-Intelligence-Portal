/**
 * 백엔드와 프론트의 types/argos-i-export.ts 가 (주석·공백을 제외하고) 동일한지 — 드리프트 방지
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ARGOS_I_EXPORT_SCHEMA_VERSION } from '../../types/argos-i-export.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendFile = path.resolve(here, '../../types/argos-i-export.ts');
const frontendFile = path.resolve(here, '../../../../frontend/src/types/argos-i-export.ts');

/** 블록 주석, 줄 주석, 공백을 모두 제거한 비교용 문자열 */
function normalize(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/\s+/g, '');
}

describe('argos-i-export type contract', () => {
  it('backend and frontend types/argos-i-export.ts are identical apart from comments and whitespace', () => {
    const be = normalize(fs.readFileSync(backendFile, 'utf-8'));
    const fe = normalize(fs.readFileSync(frontendFile, 'utf-8'));
    expect(be.length).toBeGreaterThan(500);
    expect(fe).toBe(be);
  });

  it('the schema version constant is 1', () => {
    expect(ARGOS_I_EXPORT_SCHEMA_VERSION).toBe(1);
  });
});
