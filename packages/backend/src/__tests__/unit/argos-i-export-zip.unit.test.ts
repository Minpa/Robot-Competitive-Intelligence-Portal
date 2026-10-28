/**
 * argos-i-export-zip — fflate 메모리 조립: 경로 규칙, 항목 순서, 라운드트립, 같은 입력 → 같은 바이트
 */
import { describe, it, expect } from 'vitest';
import { unzipSync } from 'fflate';
import { buildBundleZip, zipEntryPath } from '../../services/argos-i-export-zip.js';

const entries = [
  { path: 'README.md', content: Buffer.from('# hello\n') },
  { path: 'manifest.json', content: Buffer.from('{"a":1}\n') },
  { path: 'videos.json', content: Buffer.from(JSON.stringify({ x: 'ㅋ'.repeat(5000) }) + '\n') },
];

describe('buildBundleZip', () => {
  it('stores entries under argos-i/<date>/ in the given order and round-trips the bytes', () => {
    const zip = buildBundleZip('2026-10-29', entries);
    expect(zip.subarray(0, 2).toString()).toBe('PK');
    const out = unzipSync(new Uint8Array(zip));
    expect(Object.keys(out)).toEqual(['argos-i/2026-10-29/README.md', 'argos-i/2026-10-29/manifest.json', 'argos-i/2026-10-29/videos.json']);
    for (const e of entries) expect(Buffer.from(out[zipEntryPath('2026-10-29', e.path)]!).equals(e.content)).toBe(true);
  });

  it('is deterministic for the same input and compresses repetitive content', () => {
    const a = buildBundleZip('2026-10-29', entries);
    const b = buildBundleZip('2026-10-29', entries);
    expect(a.equals(b)).toBe(true);
    expect(a.length).toBeLessThan(entries.reduce((n, e) => n + e.content.length, 0));
  });
});
