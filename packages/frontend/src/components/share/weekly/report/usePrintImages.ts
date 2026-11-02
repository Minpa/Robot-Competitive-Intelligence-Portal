'use client';

import { useEffect, type RefObject } from 'react';

/** 마운트 후 이 시간(ms)이 지나 한가해지면 썸네일을 미리 받는다. 그 전에는 loading="lazy" 그대로다 */
export const PRINT_WARMUP_DELAY_MS = 1500;

/**
 * 인쇄(PDF)에서 썸네일이 빠지지 않게 한다 (명세 9.5 위험).
 *
 * 화면의 썸네일은 loading="lazy" 이다. 그런데 인쇄는 화면 밖 lazy 이미지가 로드되기 전에 레이아웃을 끝내기 때문에(헤드리스 PDF 실측:
 * 12장 중 첫 화면 근처 3장만 출력) 아래로 한참 떨어진 썸네일이 PDF 에서 빠진다. `beforeprint` 에서 eager 로 바꿔도 로드가 늦어 소용없다.
 * 이미 로드가 끝난 이미지는 loading 속성을 lazy 로 되돌려도 그대로 인쇄된다(실측). 그래서
 *  1) 마운트 후 PRINT_WARMUP_DELAY_MS 가 지나면 아직 로드되지 않은 썸네일을 잠깐 eager 로 바꿔 받아 두고, 각 이미지가 로드되면 lazy 로 되돌린다.
 *  2) 그 전에 인쇄하는 경우를 위해 beforeprint 에서도 eager 로 바꾼다(afterprint 에서 되돌림).
 * 화면 렌더에는 영향이 없다. (정적 HTML 은 스크립트가 금지라 이 처리를 할 수 없다.)
 */
export function usePrintImages(rootRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const restore = (img: HTMLImageElement) => {
      if (img.dataset.printEager) {
        img.loading = 'lazy';
        delete img.dataset.printEager;
      }
    };
    const warm = () => {
      for (const img of Array.from(root.querySelectorAll<HTMLImageElement>('img[loading="lazy"]'))) {
        if (img.complete) continue;
        img.dataset.printEager = '1';
        img.addEventListener('load', () => restore(img), { once: true });
        img.addEventListener('error', () => restore(img), { once: true });
        img.loading = 'eager';
      }
    };
    const timer = window.setTimeout(warm, PRINT_WARMUP_DELAY_MS);

    const beforePrint = () => {
      for (const img of Array.from(root.querySelectorAll<HTMLImageElement>('img[loading="lazy"]'))) {
        img.dataset.printEager = '1';
        img.loading = 'eager';
      }
    };
    const afterPrint = () => {
      for (const img of Array.from(root.querySelectorAll<HTMLImageElement>('img[data-print-eager]'))) restore(img);
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, [rootRef]);
}
