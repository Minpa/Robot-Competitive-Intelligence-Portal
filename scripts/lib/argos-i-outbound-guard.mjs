/**
 * ARGOS_I 아웃바운드 가드 — ARGOS_I(사내) → ARGOS(외부) 요청에서 사내 정보가 나가지 않게 하는 1차 통제 (참고 구현).
 *
 * - 순수 JS, 외부 패키지 의존성 없음 (Node 내장 `node:crypto` 만). Node 18 이상.
 * - ARGOS_I 가 이 파일을 복사해서 쓴다. ARGOS 서버의 인바운드 가드(argos-i-inbound-guard.ts)와 같은 규칙·사유 코드를 쓴다.
 *   ARGOS 는 사내 코드명·사번의 실제 값을 알 수 없으므로 이 가드가 1차 통제이고 서버 가드는 최후 방어선이다.
 * - 사내 금지 목록(내부 도메인·패턴·용어)은 ARGOS_I 가 직접 운영한다. 이 파일에는 실제 값을 넣지 않는다.
 *
 * 동작
 *  1. 허용 필드 직렬화: 최상위·params 의 알려진 키만 남긴다. 제거한 키는 이름을 쓰지 않고 개수만 센다 (strict 면 차단).
 *  2. sourcePublic === true 필수: 값이 공개 자료에서 왔음을 호출자가 증명한다 (감사용 증명 필드).
 *  3. note 를 쓰면 사람 승인(approvedBy)이 필수다.
 *  4. URL(https·허용 호스트), 마커(이메일·사번·분류 라벨·내부 경로·용어·패턴·blob·숫자+단위)를 검사한다.
 *
 * 출력은 허용 직렬화 본문 또는 차단 사유 코드 목록뿐이다. 입력 값·키 이름은 반환하지 않는다.
 */

import { createHash } from 'node:crypto';

export const RULES_VERSION = 1;

export const REASON_CODES = [
  'unknown_key',
  'invalid_type_or_shape',
  'url_scheme',
  'url_host_not_allowed',
  'private_host',
  'internal_domain',
  'email_detected',
  'employee_id',
  'internal_host_name',
  'unc_or_file_path',
  'classification_label',
  'internal_pattern',
  'internal_term_hash',
  'blob_detected',
  'number_unit_in_note',
  'note_format',
  'source_not_public',
  'control_chars',
];

const STRUCTURAL = ['invalid_type_or_shape', 'source_not_public'];

export const DEFAULT_INTERNAL_DOMAINS = ['lge.com', 'lgecorp.com'];
export const PRIVATE_HOST_SUFFIXES = ['local', 'internal', 'corp', 'lan', 'intra'];
export const STATIC_ALLOWED_HOSTS = ['youtube.com', 'youtu.be', 'arxiv.org'];
export const CLASSIFICATION_STRONG = ['대외비', '극비', '社外秘', '机密', 'internal only', 'internal use only', 'do not distribute'];
export const CLASSIFICATION_WEAK = ['사내', '내부용', '내부 한정', '비공개', '기밀', '内部', 'confidential', 'internal use', 'proprietary', 'restricted', 'nda'];
export const NUMBER_UNIT_MULTI =
  'n\\s?[·.\\-]?\\s?m|nm|kgf|kg|mg|mm|cm|km|kwh|kw|mw|mv|ma|rpm|khz|mhz|ghz|hz|dof|db|°|%|usd|krw|eur|cny|jpy|달러|만원|원|억|wh|ah|mah|tops|fps|gb|mb|tb|ms|ns|kn';
export const NUMBER_UNIT_SINGLE = 'g|m|w|v|a|n';
export const EMPLOYEE_ID_PATTERN = '(?<![a-z0-9])[a-z]{1,2}\\d{6,8}(?![a-z0-9])';
export const DEFAULT_INTERNAL_PATTERNS = ['(?<![a-z0-9])prj[-_]\\d{3,6}(?![a-z0-9])'];
export const HOST_NAME_PATTERNS = [
  '(?<![a-z0-9])[a-z0-9]+-(?:srv|svr|fs|nas|db|ldap|vpn|dc|ad)\\d{1,3}(?![a-z0-9])',
  '(?<![a-z0-9.-])[a-z0-9][a-z0-9-]*\\.(?:corp|intra|internal|lan)(?:\\.[a-z0-9-]+)*(?![a-z0-9-])',
  '(?<![a-z0-9.-])[a-z0-9][a-z0-9-]+\\.local(?![a-z0-9-])',
];
export const HOST_PORT_PATTERN = '(?<![a-z0-9.-])(?:[a-z]+-[a-z0-9-]+|[a-z]+\\d+):\\d{2,5}(?![a-z0-9])';
export const BLOB_BASE64_MIN = 40;
export const BLOB_HEX_MIN = 32;
export const NOTE_MAX_CHARS = 200;
export const BODY_MAX_BYTES = 8192;
export const BODY_MAX_DEPTH = 4;
export const BODY_MAX_KEYS = 30;
const TRACKING_PARAM_PREFIXES = ['utm_', 'mc_', 'pk_'];
const TRACKING_PARAMS = ['fbclid', 'gclid', 'dclid', 'msclkid', 'igshid', 'yclid', 'ref', 'ref_src', 'spm', 'cmpid'];

/** 패리티 테스트가 서버 쪽 상수와 대조하는 목록 */
export const RULE_CONSTANTS = {
  RULES_VERSION,
  REASON_CODES,
  DEFAULT_INTERNAL_DOMAINS,
  PRIVATE_HOST_SUFFIXES,
  STATIC_ALLOWED_HOSTS,
  CLASSIFICATION_STRONG,
  CLASSIFICATION_WEAK,
  NUMBER_UNIT_MULTI,
  NUMBER_UNIT_SINGLE,
  EMPLOYEE_ID_PATTERN,
  DEFAULT_INTERNAL_PATTERNS,
  HOST_NAME_PATTERNS,
  HOST_PORT_PATTERN,
  BLOB_BASE64_MIN,
  BLOB_HEX_MIN,
  NOTE_MAX_CHARS,
  BODY_MAX_BYTES,
  BODY_MAX_DEPTH,
  BODY_MAX_KEYS,
};

// ─────────────────────────────────────────────────────────────────────────────
// 해시·직렬화
// ─────────────────────────────────────────────────────────────────────────────

const sha256Hex = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : stableStringify(v))).join(',')}]`;
  const keys = Object.keys(value)
    .filter((k) => value[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function hash8Of(value) {
  let text = '';
  try {
    text = stableStringify(value);
  } catch {
    text = '';
  }
  return sha256Hex(text).slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// 정규화
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-control-regex
const INVISIBLE_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
const LONE_SURROGATE_RE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g;

const stripInvisible = (s) => s.replace(INVISIBLE_RE, '').replace(LONE_SURROGATE_RE, '');
const charLength = (s) => Array.from(s).length;

function nfkc(s) {
  try {
    return s.normalize('NFKC');
  } catch {
    return s;
  }
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&#(\d+);/g, (m, n) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function percentDecodeOnce(s) {
  return s.replace(/(?:%[0-9a-f]{2})+/gi, (m) => {
    try {
      return decodeURIComponent(m);
    } catch {
      return m;
    }
  });
}

function deobfuscate(lower, aggressive) {
  let t = lower.replace(/\s*[[({<]\s*(?:at|@)\s*[\])}>]\s*/g, '@').replace(/\s*[[({<]\s*(?:dot|\.)\s*[\])}>]\s*/g, '.');
  if (aggressive) t = t.replace(/\s+at\s+/g, '@').replace(/\s+dot\s+/g, '.');
  return t.replace(/\s*@\s*/g, '@').replace(/(?<=@[a-z0-9.-]*)\s*\.\s*(?=[a-z0-9])/g, '.');
}

export function normalizeText(raw) {
  let t = nfkc(raw);
  t = stripInvisible(t);
  t = decodeHtmlEntities(decodeHtmlEntities(t));
  t = percentDecodeOnce(percentDecodeOnce(t));
  t = nfkc(stripInvisible(t));
  const lower = t.toLowerCase();
  return { scan: t, lower, deob: deobfuscate(lower, false), deobAggressive: deobfuscate(lower, true) };
}

export function termTokens(text) {
  return nfkc(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** 사내 용어(토큰 또는 2-gram)의 해시. 서버의 ARGOS_I_INTERNAL_TERM_HASHES 에 넣을 값을 만들 때 쓴다 */
export function hashTerm(term) {
  return sha256Hex(termTokens(term).join(' '));
}

// ─────────────────────────────────────────────────────────────────────────────
// 규칙 컴파일
// ─────────────────────────────────────────────────────────────────────────────

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function labelRe(label) {
  const body = escapeRe(label.toLowerCase()).replace(/ /g, '\\s+');
  return /^[a-z ]+$/.test(label.toLowerCase()) ? `(?<![a-z0-9])${body}(?![a-z0-9])` : body;
}

const LABEL_STRONG = CLASSIFICATION_STRONG.map(labelRe).join('|');
const LABEL_WEAK = CLASSIFICATION_WEAK.map(labelRe).join('|');
const LABEL_ALL = `${LABEL_STRONG}|${LABEL_WEAK}`;

const RE = {
  email: /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/,
  classAll: new RegExp(LABEL_ALL, 'u'),
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
  numberUnit: new RegExp(`\\d(?:[.,]\\d+)?\\s*(?:${NUMBER_UNIT_MULTI})(?![a-z])|\\d(?:[.,]\\d+)?(?:${NUMBER_UNIT_SINGLE})(?![a-z])|\\$\\s*\\d`, 'u'),
  noteUrl: /(?:https?|ftp|file|wss?):\/\/|(?<![a-z0-9])www\./,
  mdLink: /\[[^\]]*\]\([^)]*\)/,
  htmlTag: /<\/?[a-z][^>]*>|<!--/i,
};

function hasInternalDomain(text, domains) {
  return domains.some((d) => new RegExp(`(?<![a-z0-9-])${escapeRe(d)}(?![a-z0-9-])`).test(text));
}

function hasBigNumber(lower) {
  const t = lower.replace(/(?<=\d),(?=\d{3}(?!\d))/g, '');
  for (const m of t.matchAll(/\d+/g)) {
    const run = m[0];
    if (run.length < 4) continue;
    if (run.length === 4 && /^(?:19|20)\d{2}$/.test(run)) continue;
    return true;
  }
  return false;
}

function hasTermHash(lower, hashes) {
  if (hashes.size === 0) return false;
  const tokens = termTokens(lower).slice(0, 2000);
  for (let i = 0; i < tokens.length; i++) {
    if (hashes.has(sha256Hex(tokens[i]))) return true;
    if (i + 1 < tokens.length && hashes.has(sha256Hex(`${tokens[i]} ${tokens[i + 1]}`))) return true;
  }
  return false;
}

/** note: 한 줄 평문 자유 텍스트 / param: 형식 검증된 필드 / url: URL 필드 */
function scanText(raw, ctx, kind) {
  const out = new Set();
  const n = normalizeText(raw);
  const forms = kind === 'note' ? [n.lower, n.deob, n.deobAggressive] : [n.lower, n.deob];

  if (stripInvisible(raw) !== raw) out.add('control_chars');
  if (kind !== 'param' && forms.some((f) => RE.email.test(f))) out.add('email_detected');
  if (forms.some((f) => hasInternalDomain(f, ctx.internalDomains))) out.add('internal_domain');
  if (ctx.internalPatterns.some((p) => p.test(n.lower) || p.test(n.scan))) out.add('internal_pattern');
  if (hasTermHash(n.lower, ctx.termHashes)) out.add('internal_term_hash');
  if (kind === 'param') return out;

  if (RE.hostNames.some((p) => p.test(n.lower)) || (kind === 'note' && RE.hostPort.test(n.lower))) out.add('internal_host_name');
  if (RE.fileScheme.test(n.lower) || (kind !== 'url' && (RE.unc.test(n.scan) || RE.drive.test(n.lower) || RE.homePath.test(n.lower)))) out.add('unc_or_file_path');
  if (kind === 'url' && RE.dataUri.test(n.lower)) out.add('blob_detected');
  if (kind === 'note') {
    if (RE.classAll.test(n.lower)) out.add('classification_label');
    if (RE.base64.test(n.scan) || RE.hex.test(n.scan) || RE.dataUri.test(n.lower)) out.add('blob_detected');
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
// URL
// ─────────────────────────────────────────────────────────────────────────────

const IPV4_RE = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function isPrivateHostName(host) {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h.startsWith('[') || h.includes(':')) return true;
  if (IPV4_RE.test(h)) return true;
  if (!h.includes('.')) return true;
  if (h === 'localhost' || h.endsWith('.localhost')) return true;
  return PRIVATE_HOST_SUFFIXES.some((s) => h.endsWith(`.${s}`));
}

function hostMatches(host, domains) {
  const h = host.toLowerCase().replace(/\.$/, '');
  return domains.some((d) => h === d || h.endsWith(`.${d}`));
}

function checkUrl(raw, ctx) {
  const codes = new Set();
  const s = nfkc(raw).trim();
  let url;
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

function canonicalArticleUrl(url) {
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

const YT_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function youtubeIdFromUrl(url) {
  const host = url.hostname.toLowerCase();
  let id = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0] ?? null;
  else if (host === 'youtube.com' || host.endsWith('.youtube.com')) id = url.pathname === '/watch' ? url.searchParams.get('v') : null;
  return id && YT_VIDEO_ID_RE.test(id) ? id : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 스키마 (서버의 zod strict 스키마와 같은 형식 규칙을 손으로 구현)
// ─────────────────────────────────────────────────────────────────────────────

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YT_CHANNEL_ID_RE = /^(?:UC[A-Za-z0-9_-]{22}|@[A-Za-z0-9._-]{3,30})$/;
const ARXIV_ID_RE = /^(?:\d{4}\.\d{4,5}(?:v\d+)?|[a-z]+(?:-[a-z]+)*\/\d{7}(?:v\d+)?)$/;
const TECH_DOMAINS = ['hand', 'rfm', 'actuator', 'expo', 'production'];
const TOPIC_DAYS = [7, 14, 30, 60, 90];
const MARKET_SEGMENTS = ['tier1_oem', 'tier2_legged', 'research_edu', 'industrial_cobot', 'service', 'captive', 'other'];
const RESERVED_TYPES = ['regenerate_brief', 'watch_register'];
const ENVELOPE_KEYS = ['type', 'params', 'note', 'sourcePublic'];
const KST_OFFSET_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;

const isObj = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v, re) => typeof v === 'string' && re.test(v);
const isInt = (v, min, max) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const kstYmd = (d) => new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);

function isValidYmd(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** 필드 명세: [허용 키 집합, 검증 함수(params) → 기본값이 채워진 객체 | null] */
function paramSpecs(now) {
  const today = kstYmd(now);
  const oldest = kstYmd(new Date(now.getTime() - 90 * DAY_MS));
  const withDefault = (v, d) => (v === undefined ? d : v);
  return {
    add_source: {
      youtube_video: {
        keys: ['kind', 'id', 'url'],
        check: (p) => ((p.id !== undefined) !== (p.url !== undefined) && (p.id === undefined || isStr(p.id, YT_VIDEO_ID_RE)) && (p.url === undefined || (typeof p.url === 'string' && p.url.length >= 1 && p.url.length <= 2048)) ? { ...p } : null),
      },
      youtube_channel: { keys: ['kind', 'id'], check: (p) => (isStr(p.id, YT_CHANNEL_ID_RE) ? { ...p } : null) },
      arxiv: { keys: ['kind', 'id'], check: (p) => (isStr(p.id, ARXIV_ID_RE) ? { ...p } : null) },
      article_url: { keys: ['kind', 'url'], check: (p) => (typeof p.url === 'string' && p.url.length >= 1 && p.url.length <= 2048 ? { ...p } : null) },
    },
    analyze: {
      video: {
        keys: ['target', 'id', 'force'],
        check: (p) =>
          typeof p.id === 'string' && (UUID_RE.test(p.id) || YT_VIDEO_ID_RE.test(p.id)) && (p.force === undefined || typeof p.force === 'boolean')
            ? { ...p, force: withDefault(p.force, false) }
            : null,
      },
      company: { keys: ['target', 'slug'], check: (p) => (isStr(p.slug, SLUG_RE) ? { ...p } : null) },
      robot: { keys: ['target', 'slug'], check: (p) => (isStr(p.slug, SLUG_RE) ? { ...p } : null) },
      topic: { keys: ['target', 'domain', 'days'], check: (p) => (TECH_DOMAINS.includes(p.domain) && TOPIC_DAYS.includes(p.days) ? { ...p } : null) },
    },
    query: {
      company_recent: {
        keys: ['query', 'company', 'weeks'],
        check: (p) => (isStr(p.company, SLUG_RE) && (p.weeks === undefined || isInt(p.weeks, 1, 8)) ? { ...p, weeks: withDefault(p.weeks, 8) } : null),
      },
      robot_actuators: { keys: ['query', 'robot'], check: (p) => (isStr(p.robot, SLUG_RE) ? { ...p } : null) },
      hand_benchmark_top: { keys: ['query', 'limit'], check: (p) => (p.limit === undefined || isInt(p.limit, 1, 20) ? { ...p, limit: withDefault(p.limit, 10) } : null) },
      actuator_suppliers_by_segment: { keys: ['query', 'segment'], check: (p) => (MARKET_SEGMENTS.includes(p.segment) ? { ...p } : null) },
      ci_changes_since: {
        keys: ['query', 'since', 'company', 'limit'],
        check: (p) =>
          typeof p.since === 'string' && isValidYmd(p.since) && p.since >= oldest && p.since <= today && (p.company === undefined || isStr(p.company, SLUG_RE)) && (p.limit === undefined || isInt(p.limit, 1, 100))
            ? { ...p, limit: withDefault(p.limit, 50) }
            : null,
      },
    },
  };
}

const SUBKEY_FIELD = { add_source: 'kind', analyze: 'target', query: 'query' };

/** 알려진 키만 남기고 나머지는 제거한다. 제거한 개수를 돌려준다 (이름은 돌려주지 않는다) */
function pickKnown(obj, keys) {
  const out = {};
  let removed = 0;
  for (const k of Object.keys(obj)) {
    if (keys.includes(k)) out[k] = obj[k];
    else removed += 1;
  }
  return { out, removed };
}

// ─────────────────────────────────────────────────────────────────────────────
// 본문 순회 (크기·깊이·문자열 수집)
// ─────────────────────────────────────────────────────────────────────────────

const WALK_NODE_BUDGET = 400;

function walk(body) {
  const m = { items: [], depth: 0, keys: 0, overflow: false };
  let nodes = 0;
  const visit = (v, depth, path) => {
    if (++nodes > WALK_NODE_BUDGET) {
      m.overflow = true;
      return;
    }
    m.depth = Math.max(m.depth, depth);
    if (typeof v === 'string') {
      const kind = path.length === 1 && path[0] === 'note' ? 'note' : path.length === 2 && path[0] === 'params' && path[1] === 'url' ? 'url' : 'param';
      m.items.push({ value: v, kind });
    } else if (Array.isArray(v)) {
      for (const e of v) visit(e, depth + 1, [...path, '[]']);
    } else if (v && typeof v === 'object') {
      for (const [k, e] of Object.entries(v)) {
        m.keys += 1;
        m.items.push({ value: k, kind: 'param' });
        visit(e, depth + 1, [...path, k]);
      }
    }
  };
  visit(body, 0, []);
  return m;
}

// ─────────────────────────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────────────────────────

function toRegexList(list) {
  const out = [];
  for (const p of list ?? []) {
    if (p instanceof RegExp) out.push(p);
    else if (typeof p === 'string' && p.length <= 200) {
      try {
        out.push(new RegExp(p, 'iu'));
      } catch {
        // 컴파일 오류 패턴은 건너뛴다
      }
    }
  }
  return out;
}

/**
 * 가드 옵션을 만든다.
 *  allowedHosts      ARGOS_I 측 정적 허용 호스트 목록 (등록 도메인, 서브도메인 포함 허용). 기본은 STATIC_ALLOWED_HOSTS
 *  internalDomains   ARGOS_I_OUTBOUND_INTERNAL_DOMAINS (기본 도메인 + 추가분)
 *  patterns          ARGOS_I_OUTBOUND_PATTERNS 정규식 문자열 목록 (기본 코드명 형태 패턴 + 추가분)
 *  terms             사내 용어 평문 목록 (ARGOS_I 는 평문 사용 가능)
 *  termHashes        사내 용어 sha256 목록
 */
export function createOptions(opts = {}) {
  const internalDomains = [...new Set([...DEFAULT_INTERNAL_DOMAINS, ...(opts.internalDomains ?? []).map((d) => String(d).toLowerCase().replace(/^\*?\./, ''))])];
  const allowed = (opts.allowedHosts ?? STATIC_ALLOWED_HOSTS)
    .map((h) => String(h).trim().toLowerCase().replace(/^\*?\./, ''))
    .filter((h) => h && !internalDomains.some((d) => h === d || h.endsWith(`.${d}`)));
  const hashes = new Set((opts.termHashes ?? []).map((h) => String(h).toLowerCase()));
  for (const t of opts.terms ?? []) {
    const tokens = termTokens(String(t));
    if (tokens.length > 0) hashes.add(sha256Hex(tokens.join(' ')));
  }
  return {
    allowedHosts: [...new Set(allowed)],
    internalDomains,
    internalPatterns: [...toRegexList(DEFAULT_INTERNAL_PATTERNS), ...toRegexList(opts.patterns)],
    termHashes: hashes,
    approvedBy: typeof opts.approvedBy === 'string' && opts.approvedBy.trim() ? opts.approvedBy.trim() : null,
    strict: opts.strict === true,
    now: opts.now instanceof Date ? opts.now : new Date(),
  };
}

const sortReasons = (set) => REASON_CODES.filter((c) => set.has(c));

/**
 * 요청 객체를 검사해 전송 가능한 본문을 만든다.
 * @returns {{ok:true, body:object, canonicalJson:string, payloadHash:string, hash8:string, removedKeyCount:number}
 *         | {ok:false, kind:'blocked'|'invalid'|'unsupported', reasons:string[], outboundOnly:string[], hash8:string, removedKeyCount:number}}
 */
export function guardOutbound(request, options) {
  const ctx = options && options.internalDomains ? options : createOptions(options);
  const hash8 = hash8Of(request);
  const reasons = new Set();
  const outboundOnly = [];
  let removedKeyCount = 0;

  // 1) 크기·깊이·키 수
  const m = walk(request);
  let bytes = 0;
  try {
    bytes = Buffer.byteLength(JSON.stringify(request) ?? '', 'utf8');
  } catch {
    bytes = Number.POSITIVE_INFINITY;
  }
  if (bytes > BODY_MAX_BYTES || m.depth > BODY_MAX_DEPTH || m.keys > BODY_MAX_KEYS || m.overflow) reasons.add('invalid_type_or_shape');

  // 2) 스키마 + 허용 필드 직렬화
  let unsupported = false;
  let parsed = null;
  if (!isObj(request)) {
    reasons.add('invalid_type_or_shape');
  } else {
    const top = pickKnown(request, ENVELOPE_KEYS);
    removedKeyCount += top.removed;
    if (top.removed > 0) reasons.add('unknown_key'); // strict 일 때만 결과에 반영한다 (아래)

    if (request.sourcePublic !== true) reasons.add('source_not_public');

    let note;
    if (request.note !== undefined) {
      if (typeof request.note !== 'string') reasons.add('invalid_type_or_shape');
      else note = request.note;
    }

    const type = request.type;
    if (typeof type === 'string' && SUBKEY_FIELD[type]) {
      const p = request.params;
      if (!isObj(p)) {
        reasons.add('invalid_type_or_shape');
      } else {
        const sub = p[SUBKEY_FIELD[type]];
        const spec = typeof sub === 'string' ? paramSpecs(ctx.now)[type][sub] : undefined;
        if (!spec) {
          reasons.add('invalid_type_or_shape');
        } else {
          const picked = pickKnown(p, spec.keys);
          removedKeyCount += picked.removed;
          if (picked.removed > 0) reasons.add('unknown_key');
          const checked = spec.check(picked.out);
          if (!checked) reasons.add('invalid_type_or_shape');
          else parsed = { type, params: checked, ...(note !== undefined ? { note: note.trim() } : {}) };
        }
      }
    } else if (typeof type === 'string' && RESERVED_TYPES.includes(type)) {
      unsupported = true;
    } else {
      reasons.add('invalid_type_or_shape');
    }
  }

  // non-strict: 제거된 알 수 없는 키는 사유로 삼지 않는다 (직렬화에서 이미 빠졌다)
  if (!ctx.strict) reasons.delete('unknown_key');
  const strictKeysToo = ctx.strict;

  // 3) URL
  let urlCheck = null;
  const p0 = isObj(request) && isObj(request.params) ? request.params : null;
  if (p0 && typeof p0.url === 'string' && request.type === 'add_source' && (p0.kind === 'youtube_video' || p0.kind === 'article_url')) {
    urlCheck = checkUrl(p0.url, ctx);
    for (const c of urlCheck.codes) reasons.add(c);
  }

  // 4) 마커 — 보내지 않을 값(제거되는 키)은 검사하지 않는다. strict 에서는 서버와 같게 키 이름까지 본다
  const scanItems = strictKeysToo ? m.items : parsed ? collectKept(parsed, request) : m.items;
  for (const item of scanItems) {
    for (const c of scanText(item.value, ctx, item.kind)) reasons.add(c);
  }

  // 5) note 는 사람 승인 필수
  if (isObj(request) && request.note !== undefined && !ctx.approvedBy) outboundOnly.push('note_not_approved');

  if (reasons.size === 0 && parsed && outboundOnly.length === 0) {
    let req = parsed;
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
      const canonical = { type: req.type, params: req.params, ...(req.note ? { note: req.note } : {}) };
      const canonicalJson = stableStringify(canonical);
      const payloadHash = sha256Hex(canonicalJson);
      return { ok: true, body: { ...canonical, sourcePublic: true }, canonicalJson, payloadHash, hash8: payloadHash.slice(0, 8), removedKeyCount };
    }
  }

  const list = sortReasons(reasons);
  const onlyStructural = list.every((c) => STRUCTURAL.includes(c));
  const kind = !onlyStructural || outboundOnly.length > 0 ? 'blocked' : unsupported ? 'unsupported' : 'invalid';
  return { ok: false, kind, reasons: list, outboundOnly, hash8, removedKeyCount };
}

/** 전송될 값(허용 키만)의 문자열 항목 — 키 이름은 전송되는 알려진 키뿐이라 검사 대상이 아니다 */
function collectKept(parsed, original) {
  const items = [];
  if (typeof parsed.note === 'string') items.push({ value: original.note, kind: 'note' });
  items.push({ value: parsed.type, kind: 'param' });
  for (const [k, v] of Object.entries(parsed.params)) {
    if (typeof v !== 'string') continue;
    items.push({ value: (original.params && original.params[k]) ?? v, kind: k === 'url' ? 'url' : 'param' });
  }
  return items;
}
