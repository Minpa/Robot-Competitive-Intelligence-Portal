/**
 * ARGOS_I 번들 ZIP 조립 — fflate 로 메모리에서만 만든다 (파일시스템에 쓰지 않는다. Railway 디스크는 휘발성).
 *
 * 항목 경로는 `argos-i/YYYY-MM-DD/<파일>` 이고, 순서는 호출자가 넘긴 순서(README.md, manifest.json, 그 외 경로 오름차순)를 따른다.
 * deflate 레벨 6. 항목 시각은 번들 날짜 00:00 UTC 로 고정해 같은 입력이면 같은 ZIP 바이트가 나온다.
 */

import { zipSync, type Zippable } from 'fflate';

export const ZIP_LEVEL = 6;
/** 동시에 ZIP 을 조립할 수 있는 요청 수 */
export const MAX_CONCURRENT_ZIPS = 2;

export interface ZipEntry {
  path: string;
  content: Uint8Array;
}

export function zipEntryPath(date: string, path: string): string {
  return `argos-i/${date}/${path}`;
}

export function buildBundleZip(date: string, entries: readonly ZipEntry[]): Buffer {
  const mtime = Date.parse(`${date}T00:00:00.000Z`);
  const zippable: Zippable = {};
  for (const e of entries) {
    zippable[zipEntryPath(date, e.path)] = [e.content, { level: ZIP_LEVEL, mtime }];
  }
  return Buffer.from(zipSync(zippable));
}
