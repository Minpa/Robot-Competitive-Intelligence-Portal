/**
 * arXiv Atom(XML) 응답 파싱 — 순수 함수 모음 + 모듈 레벨 레이트리미터
 *
 * ArxivCollector(legal-data-collector.ts)와 ArxivHandCollector(arxiv-hand-collector.service.ts)가 공용으로 쓴다.
 * 공식 API(https://export.arxiv.org/api/query) 응답만 대상으로 하며 PDF/HTML 페이지는 다루지 않는다.
 */

/** 초록 발췌 길이(저장 상한). 전문은 저장하지 않는다. */
export const ARXIV_SUMMARY_MAX = 500;

/**
 * arXiv API ToU: 요청 간 최소 3초 간격, 단일 연결(직렬).
 * 이 상수는 ArxivCollector 와 ArxivHandCollector 가 모듈 레벨로 공유한다.
 */
export const ARXIV_MIN_INTERVAL_MS = 3000;

// ------------------------------------------------------------------
// 레이트리미터 (모듈 레벨 공유 — 직렬화 + 최소 3초 간격)
// ------------------------------------------------------------------

export interface RateLimiterDeps {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

let lastArxivRequestAt = 0;
let arxivChain: Promise<void> = Promise.resolve();

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * 다음 arXiv 요청 슬롯을 기다린다. 호출 순서대로 직렬 처리되며 직전 요청(시작/종료)으로부터
 * ARXIV_MIN_INTERVAL_MS 가 지나기 전에는 resolve 하지 않는다.
 */
export function waitArxivTurn(deps: RateLimiterDeps = {}): Promise<void> {
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? defaultSleep;
  const run = arxivChain.then(async () => {
    const elapsed = now() - lastArxivRequestAt;
    if (elapsed < ARXIV_MIN_INTERVAL_MS) await sleep(ARXIV_MIN_INTERVAL_MS - elapsed);
    lastArxivRequestAt = now();
  });
  arxivChain = run.catch(() => undefined);
  return run;
}

/** 요청이 끝난 시각을 기록해 간격을 응답 종료 기준으로도 보장한다. */
export function markArxivRequestDone(now: () => number = Date.now): void {
  lastArxivRequestAt = now();
}

/** 테스트 전용 — 모듈 레벨 상태 초기화 */
export function resetArxivRateLimiter(): void {
  lastArxivRequestAt = 0;
  arxivChain = Promise.resolve();
}

// ------------------------------------------------------------------
// Atom 파싱
// ------------------------------------------------------------------

/** 원문 그대로의 entry 필드 (기존 ArxivCollector 출력 동치성 유지용) */
export interface RawArxivEntry {
  id: string;
  title: string;
  summary: string | null;
  published: string | null;
}

export interface ArxivAtomEntry {
  /** <id> 원문 (예: http://arxiv.org/abs/2501.12345v2) — content_hash/url 의 기준 */
  id: string;
  /** 버전 제외 ID (예: 2501.12345, 구형 cs/0501001) */
  arxivId: string;
  /** 버전 접미사 (예: v2). 없으면 null */
  arxivVersion: string | null;
  /** 공백 정규화 + 엔티티 디코드 */
  title: string;
  /** 공백 정규화 + 엔티티 디코드 후 앞 500자 */
  summary: string;
  published: string | null;
  authors: string[];
  categories: string[];
  primaryCategory: string | null;
}

export interface ParsedArxivFeed {
  entries: ArxivAtomEntry[];
  /** opensearch:totalResults. 없으면 null */
  totalResults: number | null;
  /** HTTP 200 이지만 에러 entry(<id>가 arxiv.org/abs/ 패턴이 아님)가 들어있음 → 요청 실패로 취급 */
  hasError: boolean;
  errorMessage: string | null;
}

/** 기존 ArxivCollector.tag 와 동일한 정규식 */
function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m && m[1] ? m[1] : null;
}

/** 기존 ArxivCollector.parse 와 동일한 entry 추출 규칙(id && title 이 있는 entry 전부, 에러 entry 포함) */
export function parseRawArxivEntries(xml: string): RawArxivEntry[] {
  const items: RawArxivEntry[] = [];
  const regex = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const entry = m[1] ?? '';
    const id = tag(entry, 'id');
    const title = tag(entry, 'title');
    if (id && title) {
      items.push({
        id,
        title,
        summary: tag(entry, 'summary'),
        published: tag(entry, 'published'),
      });
    }
  }
  return items;
}

export function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&'); // 이중 디코드 방지를 위해 마지막
}

function normalizeText(s: string): string {
  return decodeXmlEntities(s).replace(/\s+/g, ' ').trim();
}

/**
 * <id> 에서 arXiv ID 와 버전을 분리한다.
 * http/https, 신형(2501.01234v2), 구형(cs/0501001v1) 모두 처리. abs URL 이 아니면 null.
 */
export function splitArxivId(idOrUrl: string): { arxivId: string; version: string | null } | null {
  const m = idOrUrl.trim().match(/arxiv\.org\/abs\/(.+?)\s*$/i);
  if (!m || !m[1]) return null;
  const rest = m[1];
  const v = rest.match(/^(.+?)(v\d+)$/);
  if (v && v[1] && v[2]) return { arxivId: v[1], version: v[2] };
  return { arxivId: rest, version: null };
}

function attr(tagText: string, name: string): string | null {
  const m = tagText.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m && m[1] !== undefined ? m[1] : null;
}

/** Atom 피드 전체 파싱. 에러 entry 는 entries 에서 제외하고 hasError 로 표시한다. */
export function parseArxivAtom(xml: string): ParsedArxivFeed {
  const totalMatch = xml.match(/<opensearch:totalResults[^>]*>\s*(\d+)\s*<\/opensearch:totalResults>/);
  const totalResults = totalMatch && totalMatch[1] ? parseInt(totalMatch[1], 10) : null;

  const entries: ArxivAtomEntry[] = [];
  let hasError = false;
  let errorMessage: string | null = null;

  const regex = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const body = m[1] ?? '';
    const id = (tag(body, 'id') ?? '').trim();
    const split = splitArxivId(id);
    if (!split) {
      // 에러 entry: <id>http://arxiv.org/api/errors#...</id>, title "Error"
      hasError = true;
      errorMessage = normalizeText(tag(body, 'summary') ?? tag(body, 'title') ?? id) || id || 'unknown arXiv error entry';
      continue;
    }
    const rawTitle = tag(body, 'title');
    if (!rawTitle) continue;

    const authors: string[] = [];
    const authorRe = /<author>([\s\S]*?)<\/author>/g;
    let a;
    while ((a = authorRe.exec(body)) !== null) {
      const name = tag(a[1] ?? '', 'name');
      if (name) {
        const n = normalizeText(name);
        if (n) authors.push(n);
      }
    }

    const categories: string[] = [];
    const catRe = /<category\b[^>]*>/g;
    let c;
    while ((c = catRe.exec(body)) !== null) {
      const term = attr(c[0], 'term');
      if (term && !categories.includes(term)) categories.push(term);
    }
    const primaryTag = body.match(/<arxiv:primary_category\b[^>]*>/);
    const primaryCategory = (primaryTag ? attr(primaryTag[0], 'term') : null) ?? categories[0] ?? null;

    entries.push({
      id,
      arxivId: split.arxivId,
      arxivVersion: split.version,
      title: normalizeText(rawTitle),
      summary: normalizeText(tag(body, 'summary') ?? '').substring(0, ARXIV_SUMMARY_MAX),
      published: (tag(body, 'published') ?? '').trim() || null,
      authors,
      categories,
      primaryCategory,
    });
  }

  return { entries, totalResults, hasError, errorMessage };
}
