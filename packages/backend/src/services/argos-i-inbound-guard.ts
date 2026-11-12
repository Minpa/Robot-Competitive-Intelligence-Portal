/**
 * ARGOS_I 인바운드 가드 — ARGOS_I → ARGOS 방향으로 사내 정보가 들어오는 것을 막는 최후 방어선 (순수 함수).
 *
 * ⚠ 한계: ARGOS 는 사내 코드명이나 직원 ID 의 실제 값을 알 수 없다. 이 가드는 형태·표지·해시로만 판정하는
 *   최후 방어선이고, 1차 통제는 ARGOS_I 쪽 아웃바운드 가드(scripts/lib/argos-i-outbound-guard.mjs)다.
 *   의미상의 사내 정보(일반 단어로 쓴 사내 사실)는 탐지할 수 없으므로 구조적 통제(자유 텍스트는 note 하나,
 *   형식 검증, 승인)를 약화시키지 않는다.
 *
 * 프로파일
 *  - request : POST /api/argos-i/requests — 스키마 strict + URL 호스트 + 마커 전부
 *  - ingest  : POST /api/ingest/articles 항목 — 마커 일부(6·7·9·10·12·13·14번, 11번은 헤더·괄호형 + 강한 표현)
 *
 * 입출력은 사유 코드뿐이다. 입력 값·키 이름은 어디에도 싣지 않는다. I/O 와 로그 출력은 하지 않는다.
 */

import { decodeHtmlEntities, stripInvisible, charLength } from './llm-input-guard.js';
import {
  BLOB_BASE64_MIN,
  BLOB_HEX_MIN,
  BODY_MAX_BYTES,
  BODY_MAX_DEPTH,
  BODY_MAX_KEYS,
  CLASSIFICATION_STRONG,
  CLASSIFICATION_WEAK,
  EMPLOYEE_ID_PATTERN,
  GUARD_REASON_CODES,
  HOST_NAME_PATTERNS,
  HOST_PORT_PATTERN,
  NOTE_MAX_CHARS,
  NUMBER_UNIT_MULTI,
  NUMBER_UNIT_SINGLE,
  PRIVATE_HOST_SUFFIXES,
  STATIC_ALLOWED_HOSTS,
  STRUCTURAL_REASON_CODES,
  TRACKING_PARAMS,
  TRACKING_PARAM_PREFIXES,
  type GuardReasonCode,
} from './argos-i-guard-rules.js';
import {
  canonicalize,
  hash8Of,
  parseRequestEnvelope,
  sha256Hex,
  YT_VIDEO_ID_RE,
  type ParsedRequest,
} from './argos-i-requests-schema.js';
import { parseInternalDomains, parseInternalPatterns, parseTermHashes, type Env } from './argos-i-requests-config.js';

export type GuardProfile = 'request' | 'ingest';

export interface GuardContext {
  /** 허용 호스트(등록 도메인). 정확 일치 또는 하위 도메인만 통과한다 */
  allowedHosts: readonly string[];
  /** 소문자 도메인 */
  internalDomains: readonly string[];
  internalPatterns: readonly RegExp[];
  /** 사내 용어 sha256 hex 집합 */
  termHashes: ReadonlySet<string>;
  now?: Date;
}

export type GuardResult =
  | { ok: true; request: ParsedRequest; canonicalJson: string; payloadHash: string; hash8: string }
  | {
      ok: false;
      /** rejected: 사내 정보 의심(internal_data_rejected) / invalid: 형식 오류(invalid_request) / unsupported: v2 예약 type */
      kind: 'rejected' | 'invalid' | 'unsupported';
      reasons: GuardReasonCode[];
      hash8: string;
    };

/** 환경변수에서 가드 컨텍스트를 만든다 (허용 호스트는 호출자가 계산해서 넘긴다) */
export function createGuardContext(env: Env, allowedHosts: readonly string[] = STATIC_ALLOWED_HOSTS, now?: Date): GuardContext {
  const internalDomains = parseInternalDomains(env);
  return {
    allowedHosts: filterAllowedHosts(allowedHosts, internalDomains),
    internalDomains,
    internalPatterns: parseInternalPatterns(env).patterns,
    termHashes: parseTermHashes(env),
    now,
  };
}

/** 허용 호스트에서 내부 도메인(및 그 하위)을 항상 제외한다 */
export function filterAllowedHosts(hosts: readonly string[], internalDomains: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of hosts) {
    const h = raw.trim().toLowerCase().replace(/^\*?\./, '');
    if (!h) continue;
    if (internalDomains.some((d) => h === d || h.endsWith(`.${d}`))) continue;
    out.add(h);
  }
  return [...out];
}

// ─────────────────────────────────────────────────────────────────────────────
// 정규화
// ─────────────────────────────────────────────────────────────────────────────

function nfkc(s: string): string {
  try {
    return s.normalize('NFKC');
  } catch {
    return s;
  }
}

function percentDecodeOnce(s: string): string {
  return s.replace(/(?:%[0-9a-f]{2})+/gi, (m) => {
    try {
      return decodeURIComponent(m);
    } catch {
      return m;
    }
  });
}

export interface NormalizedText {
  /** NFKC + 비가시 문자 제거 + HTML 엔티티·퍼센트 디코드 (대소문자 유지) */
  scan: string;
  lower: string;
  /** 이메일 난독화 복원 사본 ([at], (dot) 등) */
  deob: string;
  /** 위에 더해 공백으로 띄운 ` at ` / ` dot ` 까지 복원한 사본 (request 프로파일 note 한정) */
  deobAggressive: string;
}

function deobfuscate(lower: string, aggressive: boolean): string {
  let t = lower
    .replace(/\s*[[({<]\s*(?:at|@)\s*[\])}>]\s*/g, '@')
    .replace(/\s*[[({<]\s*(?:dot|\.)\s*[\])}>]\s*/g, '.');
  if (aggressive) t = t.replace(/\s+at\s+/g, '@').replace(/\s+dot\s+/g, '.');
  return t.replace(/\s*@\s*/g, '@').replace(/(?<=@[a-z0-9.-]*)\s*\.\s*(?=[a-z0-9])/g, '.');
}

export function normalizeText(raw: string): NormalizedText {
  let t = nfkc(raw);
  t = stripInvisible(t);
  t = decodeHtmlEntities(decodeHtmlEntities(t));
  t = percentDecodeOnce(percentDecodeOnce(t));
  t = nfkc(stripInvisible(t));
  const lower = t.toLowerCase();
  return { scan: t, lower, deob: deobfuscate(lower, false), deobAggressive: deobfuscate(lower, true) };
}

/** 용어 해시용 정규화 — 소문자, 글자·숫자 이외를 구분자로 보고 토큰을 공백 하나로 잇는다 */
export function termTokens(text: string): string[] {
  return nfkc(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** 사내 용어(토큰 또는 2-gram)의 해시. ARGOS_I_INTERNAL_TERM_HASHES 에 넣을 값을 만들 때 쓴다 */
export function hashTerm(term: string): string {
  return sha256Hex(termTokens(term).join(' '));
}

// ─────────────────────────────────────────────────────────────────────────────
// 컴파일된 규칙
// ─────────────────────────────────────────────────────────────────────────────

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function labelRe(label: string): string {
  const body = escapeRe(label.toLowerCase()).replace(/ /g, '\\s+');
  return /^[a-z ]+$/.test(label.toLowerCase()) ? `(?<![a-z0-9])${body}(?![a-z0-9])` : body;
}

const LABEL_STRONG = CLASSIFICATION_STRONG.map(labelRe).join('|');
const LABEL_WEAK = CLASSIFICATION_WEAK.map(labelRe).join('|');
const LABEL_ALL = `${LABEL_STRONG}|${LABEL_WEAK}`;

const RE = {
  email: /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/,
  classStrong: new RegExp(LABEL_STRONG, 'u'),
  classAll: new RegExp(LABEL_ALL, 'u'),
  classBracket: new RegExp(`[\\[({<【「『（［][^\\])}>】」』）］\\n]{0,24}?(?:${LABEL_ALL})[^\\])}>】」』）］\\n]{0,24}?[\\])}>】」』）］]`, 'u'),
  classHeader: new RegExp(`(?:^|\\n)\\s*(?:${LABEL_ALL})\\s*(?:[:：\\-–—―|]|$)`, 'u'),
  employeeId: new RegExp(EMPLOYEE_ID_PATTERN, 'u'),
  hostNames: HOST_NAME_PATTERNS.map((p) => new RegExp(p, 'u')),
  hostPort: new RegExp(HOST_PORT_PATTERN, 'u'),
  unc: /\\\\[^\s\\]+\\[^\s]+/,
  drive: /(?<![a-z0-9])[a-z]:(?:\\|\/(?!\/))/,
  homePath: /(?:^|[\s"'(=[,;])(?:~|\/home|\/users|\/mnt)\//,
  fileScheme: /(?<![a-z0-9])file:\/\//,
  base64: new RegExp(`[A-Za-z0-9+/=]{${BLOB_BASE64_MIN},}`),
  hex: new RegExp(`[0-9a-fA-F]{${BLOB_HEX_MIN},}`),
  dataUri: /data:[a-z]+\/[a-z0-9.+-]+\s*[;,]/,
  ipv4: /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/,
  localhost: /(?<![a-z0-9])localhost(?![a-z0-9])/,
  numberUnit: new RegExp(
    `\\d(?:[.,]\\d+)?\\s*(?:${NUMBER_UNIT_MULTI})(?![a-z])|\\d(?:[.,]\\d+)?(?:${NUMBER_UNIT_SINGLE})(?![a-z])|\\$\\s*\\d`,
    'u',
  ),
  noteUrl: /(?:https?|ftp|file|wss?):\/\/|(?<![a-z0-9])www\./,
  mdLink: /\[[^\]]*\]\([^)]*\)/,
  htmlTag: /<\/?[a-z][^>]*>|<!--/i,
  urlInText: /https?:\/\/\S+/gi,
};

function hasInternalDomain(text: string, domains: readonly string[]): boolean {
  return domains.some((d) => new RegExp(`(?<![a-z0-9-])${escapeRe(d)}(?![a-z0-9-])`).test(text));
}

function hasBigNumber(lower: string): boolean {
  const t = lower.replace(/(?<=\d),(?=\d{3}(?!\d))/g, '');
  for (const m of t.matchAll(/\d+/g)) {
    const run = m[0];
    if (run.length < 4) continue;
    if (run.length === 4 && /^(?:19|20)\d{2}$/.test(run)) continue;
    return true;
  }
  return false;
}

function hasTermHash(lower: string, hashes: ReadonlySet<string>): boolean {
  if (hashes.size === 0) return false;
  const tokens = termTokens(lower).slice(0, 2000);
  for (let i = 0; i < tokens.length; i++) {
    if (hashes.has(sha256Hex(tokens[i]!))) return true;
    if (i + 1 < tokens.length && hashes.has(sha256Hex(`${tokens[i]} ${tokens[i + 1]}`))) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 텍스트 스캔
// ─────────────────────────────────────────────────────────────────────────────

/** note: 한 줄 평문 자유 텍스트 / param: 형식 검증된 필드 / url: URL 필드 / free: 인제스트 제목·요약류 */
export type FieldKind = 'note' | 'param' | 'url' | 'free';

export function scanText(raw: string, ctx: GuardContext, profile: GuardProfile, kind: FieldKind): Set<GuardReasonCode> {
  const out = new Set<GuardReasonCode>();
  const req = profile === 'request';
  const n = normalizeText(raw);
  const forms = req && kind === 'note' ? [n.lower, n.deob, n.deobAggressive] : [n.lower, n.deob];

  if (req && stripInvisible(raw) !== raw) out.add('control_chars');

  if (kind !== 'param' && forms.some((f) => RE.email.test(f))) out.add('email_detected');
  if (forms.some((f) => hasInternalDomain(f, ctx.internalDomains))) out.add('internal_domain');
  if (ctx.internalPatterns.some((p) => p.test(n.lower) || p.test(n.scan))) out.add('internal_pattern');
  if (hasTermHash(n.lower, ctx.termHashes)) out.add('internal_term_hash');

  if (kind === 'param') return out;

  if (RE.hostNames.some((p) => p.test(n.lower)) || (req && kind === 'note' && RE.hostPort.test(n.lower))) out.add('internal_host_name');
  if (RE.fileScheme.test(n.lower) || (kind !== 'url' && (RE.unc.test(n.scan) || RE.drive.test(n.lower) || RE.homePath.test(n.lower)))) out.add('unc_or_file_path');

  if (kind === 'free') {
    // 인제스트는 헤더·괄호 형태만 (본문 속 단독 표현은 뉴스 문장일 수 있어 거부하지 않는다)
    if (RE.classBracket.test(n.lower) || RE.classHeader.test(n.lower)) out.add('classification_label');
  } else if (kind === 'note' && RE.classAll.test(n.lower)) {
    out.add('classification_label');
  }

  if (kind === 'url' && RE.dataUri.test(n.lower)) out.add('blob_detected');
  if (kind === 'note' || kind === 'free') {
    // 인제스트 본문의 일반 URL 경로를 오탐하지 않도록 URL 은 빼고 본다
    // 일반 문장(긴 단어·반복 문자)을 오탐하지 않도록, 인제스트는 숫자·기호가 섞인 긴 연속 문자열만 blob 으로 본다 (note 는 명세대로 길이만 본다)
    const blobText = kind === 'free' ? n.scan.replace(RE.urlInText, ' ') : n.scan;
    const longRun = (re: RegExp): boolean => {
      const m = new RegExp(re.source, 'g');
      for (const hit of blobText.matchAll(m)) if (kind !== 'free' || /[\d+/=]/.test(hit[0])) return true;
      return false;
    };
    if (longRun(RE.base64) || longRun(RE.hex) || RE.dataUri.test(n.lower)) out.add('blob_detected');
  }

  if (req && kind === 'note') {
    if (RE.employeeId.test(n.lower)) out.add('employee_id');
    if (RE.ipv4.test(n.lower) || RE.localhost.test(n.lower)) out.add('private_host');
    if (RE.numberUnit.test(n.lower) || hasBigNumber(n.lower)) out.add('number_unit_in_note');
    const t = nfkc(raw);
    if (/[\r\n]/.test(t) || RE.noteUrl.test(n.lower) || t.includes('`') || RE.mdLink.test(t) || RE.htmlTag.test(t) || charLength(t) > NOTE_MAX_CHARS) {
      out.add('note_format');
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL 검사
// ─────────────────────────────────────────────────────────────────────────────

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

export function isPrivateHostName(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h.startsWith('[') || h.includes(':')) return true; // IPv6 리터럴
  if (IPV4_RE.test(h)) return true; // IP 리터럴은 공개 IP 도 거부
  if (!h.includes('.')) return true; // 단일 라벨 (intranet 등)
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  return PRIVATE_HOST_SUFFIXES.some((s) => h.endsWith(`.${s}`));
}

export function hostMatches(host: string, domains: readonly string[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  return domains.some((d) => h === d || h.endsWith(`.${d}`));
}

export interface UrlCheck {
  codes: Set<GuardReasonCode>;
  url?: URL;
}

export function checkUrl(raw: string, ctx: GuardContext): UrlCheck {
  const codes = new Set<GuardReasonCode>();
  const s = nfkc(raw).trim();
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    codes.add(/^[a-z][a-z0-9+.-]*:/i.test(s) ? 'url_scheme' : 'invalid_type_or_shape');
    return { codes };
  }
  if (url.protocol !== 'https:') codes.add('url_scheme');
  if (url.username || url.password) codes.add('url_scheme');
  if (url.port && url.port !== '443') codes.add('url_scheme');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host) {
    if (isPrivateHostName(host)) codes.add('private_host');
    if (hostMatches(host, ctx.internalDomains)) codes.add('internal_domain');
    if (!hostMatches(host, ctx.allowedHosts)) codes.add('url_host_not_allowed');
  }
  return { codes, url };
}

/** article_url 정규형: https, 소문자 호스트, 프래그먼트·추적 파라미터 제거, 쿼리 200자 이하. 실패 시 null */
export function canonicalArticleUrl(url: URL): string | null {
  const u = new URL(url.toString());
  u.hash = '';
  u.hostname = u.hostname.toLowerCase();
  const kept = new URLSearchParams();
  for (const [k, v] of u.searchParams) {
    const kl = k.toLowerCase();
    if (TRACKING_PARAMS.includes(kl) || TRACKING_PARAM_PREFIXES.some((p) => kl.startsWith(p))) continue;
    kept.append(k, v);
  }
  const query = kept.toString();
  if (query.length > 200) return null;
  return `https://${u.host}${u.pathname}${query ? `?${query}` : ''}`;
}

/** YouTube watch / youtu.be URL 에서 11자 id 를 뽑는다. 정규형이 아니면 null */
export function youtubeIdFromUrl(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0] ?? null;
  else if (host === 'youtube.com' || host.endsWith('.youtube.com')) id = url.pathname === '/watch' ? url.searchParams.get('v') : null;
  return id && YT_VIDEO_ID_RE.test(id) ? id : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 요청 본문 가드
// ─────────────────────────────────────────────────────────────────────────────

interface WalkItem {
  value: string;
  kind: FieldKind;
}

interface Measure {
  items: WalkItem[];
  depth: number;
  keys: number;
  overflow: boolean;
}

const WALK_NODE_BUDGET = 400;

/** 본문의 모든 문자열 값과 키 이름을 모은다. 키 이름은 param 종류로 스캔한다 (이름 자체는 어디에도 싣지 않는다) */
function walk(body: unknown): Measure {
  const m: Measure = { items: [], depth: 0, keys: 0, overflow: false };
  let nodes = 0;
  const visit = (v: unknown, depth: number, path: string[]): void => {
    if (++nodes > WALK_NODE_BUDGET) {
      m.overflow = true;
      return;
    }
    m.depth = Math.max(m.depth, depth);
    if (typeof v === 'string') {
      const kind: FieldKind = path.length === 1 && path[0] === 'note' ? 'note' : path.length === 2 && path[0] === 'params' && path[1] === 'url' ? 'url' : 'param';
      m.items.push({ value: v, kind });
    } else if (Array.isArray(v)) {
      for (const e of v) visit(e, depth + 1, [...path, '[]']);
    } else if (v && typeof v === 'object') {
      for (const [k, e] of Object.entries(v as Record<string, unknown>)) {
        m.keys += 1;
        m.items.push({ value: k, kind: 'param' });
        visit(e, depth + 1, [...path, k]);
      }
    }
  };
  visit(body, 0, []);
  return m;
}

function sortReasons(set: Set<GuardReasonCode>): GuardReasonCode[] {
  return GUARD_REASON_CODES.filter((c) => set.has(c));
}

export function guardRequest(body: unknown, ctx: GuardContext): GuardResult {
  const hash8 = hash8Of(body);
  const reasons = new Set<GuardReasonCode>();
  const now = ctx.now ?? new Date();

  // 1) 크기·깊이·키 수
  const m = walk(body);
  let bytes = 0;
  try {
    bytes = Buffer.byteLength(JSON.stringify(body) ?? '', 'utf8');
  } catch {
    bytes = Number.POSITIVE_INFINITY;
  }
  if (bytes > BODY_MAX_BYTES || m.depth > BODY_MAX_DEPTH || m.keys > BODY_MAX_KEYS || m.overflow) reasons.add('invalid_type_or_shape');

  // 2) 스키마 (strict)
  const parsed = parseRequestEnvelope(body, now);
  for (const r of parsed.reasons) reasons.add(r);

  // 3) URL 호스트 — 스키마 통과 여부와 무관하게 params.url 이 문자열이면 검사한다
  let urlCheck: UrlCheck | null = null;
  const b = body as Record<string, unknown> | null;
  const p = b && typeof b === 'object' && !Array.isArray(b) ? (b.params as Record<string, unknown> | undefined) : undefined;
  if (p && typeof p === 'object' && !Array.isArray(p) && typeof p.url === 'string' && b?.type === 'add_source' && (p.kind === 'youtube_video' || p.kind === 'article_url')) {
    urlCheck = checkUrl(p.url, ctx);
    for (const c of urlCheck.codes) reasons.add(c);
  }

  // 4) 마커 탐지 (값과 키 이름 모두)
  for (const item of m.items) {
    for (const c of scanText(item.value, ctx, 'request', item.kind)) reasons.add(c);
  }

  if (reasons.size === 0 && parsed.value) {
    let req = parsed.value;
    if (urlCheck?.url) {
      if (req.params.kind === 'youtube_video' && typeof req.params.url === 'string') {
        const id = youtubeIdFromUrl(urlCheck.url);
        if (!id) reasons.add('invalid_type_or_shape');
        else req = { ...req, params: { kind: 'youtube_video', id } };
      } else if (req.params.kind === 'article_url') {
        const canon = canonicalArticleUrl(urlCheck.url);
        if (!canon) reasons.add('invalid_type_or_shape');
        else req = { ...req, params: { kind: 'article_url', url: canon } };
      }
    }
    if (reasons.size === 0) {
      const c = canonicalize(req);
      return { ok: true, request: c.canonical, canonicalJson: c.canonicalJson, payloadHash: c.payloadHash, hash8: c.payloadHash.slice(0, 8) };
    }
  }

  const list = sortReasons(reasons);
  const onlyStructural = list.every((c) => (STRUCTURAL_REASON_CODES as readonly string[]).includes(c));
  const kind = !onlyStructural ? 'rejected' : parsed.unsupported ? 'unsupported' : 'invalid';
  return { ok: false, kind, reasons: list, hash8 };
}

// ─────────────────────────────────────────────────────────────────────────────
// 인제스트 프로파일
// ─────────────────────────────────────────────────────────────────────────────

export interface IngestGuardField {
  value: unknown;
  kind: 'url' | 'free';
}

/** 인제스트 항목(또는 source)의 문자열 필드들을 검사해 사유 코드를 안정 정렬로 돌려준다. 문자열이 아닌 값은 무시한다 */
export function guardIngestFields(fields: readonly IngestGuardField[], ctx: GuardContext): GuardReasonCode[] {
  const out = new Set<GuardReasonCode>();
  for (const f of fields) {
    if (typeof f.value !== 'string' || f.value === '') continue;
    for (const c of scanText(f.value.slice(0, 20_000), ctx, 'ingest', f.kind)) out.add(c);
  }
  return sortReasons(out);
}
