/**
 * 회사·로봇 slug — DB 에 slug 컬럼이 없으므로 이름에서 파생한다 (소문자 케밥 케이스).
 * 예: "LG Electronics" → lg-electronics, "Figure 02" → figure-02.
 * 로봇은 이름 slug 외에 `<회사 slug>-<이름 slug>` 형태도 허용한다. 일치가 둘 이상이면 모호하므로 null 이다.
 */

export function slugify(name: string): string {
  let s = name;
  try {
    s = s.normalize('NFKD');
  } catch {
    // 정규화 실패 시 원문 사용
  }
  return s
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** 이름 목록 중 slug 가 정확히 하나의 행과만 일치하면 그 행, 없거나 모호하면 null */
export function matchBySlug<T>(rows: readonly T[], slug: string, slugsOf: (row: T) => string[]): T | null {
  const hits = rows.filter((r) => slugsOf(r).includes(slug));
  return hits.length === 1 ? hits[0]! : null;
}
