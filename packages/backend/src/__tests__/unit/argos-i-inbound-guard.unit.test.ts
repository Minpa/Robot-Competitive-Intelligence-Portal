/**
 * 인바운드 가드 — 공유 픽스처별 판정·사유 코드, 정규화 우회, 안정 정렬, 운영자 패턴·해시, 허용 호스트 제외, 인제스트 프로파일 규칙
 */
import { describe, it, expect } from 'vitest';
import {
  createGuardContext,
  filterAllowedHosts,
  guardIngestFields,
  guardRequest,
  hashTerm,
  normalizeText,
  scanText,
} from '../../services/argos-i-inbound-guard.js';
import { GUARD_REASON_CODES } from '../../services/argos-i-guard-rules.js';
import { guardCaseFile, inboundContextFromFixture } from '../fixtures/argos-i-guard-cases.js';

const ctx = inboundContextFromFixture();

describe('shared fixtures', () => {
  it.each(guardCaseFile.cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const r = guardRequest(c.request, ctx);
    expect(r.ok).toBe(c.expect.ok);
    if (r.ok) {
      expect(r.request).toEqual(c.expect.canonical);
      expect(r.hash8).toMatch(/^[0-9a-f]{8}$/);
    } else {
      expect(r.reasons).toEqual(c.expect.reasons);
      expect(r.kind).toBe(c.expect.kind);
    }
  });

  it('covers every one of the 18 reason codes', () => {
    const seen = new Set<string>();
    for (const c of guardCaseFile.cases) for (const r of c.expect.reasons) seen.add(r);
    expect([...GUARD_REASON_CODES].filter((r) => !seen.has(r))).toEqual([]);
  });

  it('the 16 spec reject fixtures are all rejected with internal_data_rejected semantics (kind=rejected)', () => {
    const rejects = guardCaseFile.cases.filter((c) => c.name.startsWith('reject:')).slice(0, 16);
    expect(rejects).toHaveLength(16);
    for (const c of rejects) expect(guardRequest(c.request, ctx)).toMatchObject({ ok: false, kind: 'rejected' });
  });
});

describe('reasons', () => {
  it('are returned in the stable order of the code list regardless of detection order', () => {
    const r = guardRequest(
      { type: 'analyze', params: { target: 'robot', slug: 'figure-02' }, note: 'hong@lge.com AB1234567 비공개', sourcePublic: true },
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const idx = r.reasons.map((c) => GUARD_REASON_CODES.indexOf(c));
      expect(idx).toEqual([...idx].sort((a, b) => a - b));
      expect(new Set(r.reasons).size).toBe(r.reasons.length);
    }
  });

  it('never contain input values or key names (only codes)', () => {
    const r = guardRequest({ type: 'query', params: { query: 'hand_benchmark_top' }, secretKeyName: 'secret-value', sourcePublic: true }, ctx);
    expect(JSON.stringify(r)).not.toContain('secretKeyName');
    expect(JSON.stringify(r)).not.toContain('secret-value');
  });

  it('hash8 is stable for the same body and differs for another', () => {
    const a = guardRequest({ type: 'x' }, ctx);
    const b = guardRequest({ type: 'x' }, ctx);
    const c = guardRequest({ type: 'y' }, ctx);
    expect(a.hash8).toBe(b.hash8);
    expect(a.hash8).not.toBe(c.hash8);
  });
});

describe('normalization', () => {
  it('NFKC, zero-width removal, entity and percent decoding (twice)', () => {
    expect(normalizeText('ＡＢ').lower).toBe('ab');
    expect(normalizeText('a\u200bb').lower).toBe('ab');
    expect(normalizeText('a&#64;b').lower).toBe('a@b');
    expect(normalizeText('a%2540b').lower).toBe('a@b');
  });

  it('restores [at]/(dot) forms in a separate copy and spaced at/dot in the aggressive copy', () => {
    const n = normalizeText('hong [at] lge (dot) com / kim at example dot org');
    expect(n.deob).toContain('hong@lge.com');
    expect(n.deob).not.toContain('kim@example');
    expect(n.deobAggressive).toContain('kim@example.org');
  });
});

describe('operator configuration', () => {
  it('internal domains, patterns and term hashes come from env; invalid patterns are skipped', () => {
    const c = createGuardContext({
      ARGOS_I_INTERNAL_DOMAINS: 'corp-example.test',
      ARGOS_I_INTERNAL_PATTERNS: 'omega-\\d+;;(unclosed\n',
      ARGOS_I_INTERNAL_TERM_HASHES: `${hashTerm('falcon')},not-a-hash`,
    });
    expect(c.internalDomains).toEqual(expect.arrayContaining(['lge.com', 'lgecorp.com', 'corp-example.test']));
    expect(scanText('omega-77', c, 'request', 'note').has('internal_pattern')).toBe(true);
    expect(scanText('falcon', c, 'request', 'param').has('internal_term_hash')).toBe(true);
    expect(scanText('mail.corp-example.test', c, 'request', 'note').has('internal_domain')).toBe(true);
    expect(c.termHashes.size).toBe(1);
  });

  it('term hashes are computed on lowercase alphanumeric tokens joined by one space', () => {
    expect(hashTerm('Project-X')).toBe(hashTerm('project x'));
    expect(hashTerm('KESTREL')).toBe(hashTerm('kestrel'));
  });

  it('internal domains are always removed from the allowed hosts', () => {
    expect(filterAllowedHosts(['arxiv.org', 'lge.com', 'wiki.lge.com', 'LGECORP.com'], ['lge.com', 'lgecorp.com'])).toEqual(['arxiv.org']);
    const c = createGuardContext({ ARGOS_I_EXTRA_ALLOWED_HOSTS: 'lge.com' }, ['arxiv.org', 'lge.com']);
    expect(c.allowedHosts).toEqual(['arxiv.org']);
  });

  it('format-validated params only get domain/pattern/hash rules (no employee-id false positive on slugs)', () => {
    const c = createGuardContext({});
    const r = guardRequest({ type: 'analyze', params: { target: 'robot', slug: 'ab1234567' }, sourcePublic: true }, c);
    expect(r.ok).toBe(true);
  });
});

describe('ingest profile', () => {
  const c = createGuardContext({});
  const codes = (v: string, kind: 'url' | 'free' = 'free') => guardIngestFields([{ value: v, kind }], c);

  it('rejects emails, internal domains, host names, paths, patterns and blobs', () => {
    expect(codes('contact hong@lge.com')).toEqual(expect.arrayContaining(['internal_domain', 'email_detected']));
    expect(codes('build-srv01 is down')).toContain('internal_host_name');
    expect(codes('see C:\\Users\\kim\\a.xlsx')).toContain('unc_or_file_path');
    expect(codes('PRJ-1234 update')).toContain('internal_pattern');
    expect(codes('x'.repeat(10) + 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9w')).toContain('blob_detected');
    expect(codes('https://intranet.lge.com/x', 'url')).toContain('internal_domain');
  });

  it('rejects header/bracket classification labels and strong phrases but not plain news words', () => {
    expect(codes('[대외비] 신제품 계획')).toEqual(['classification_label']);
    expect(codes('Confidential — roadmap')).toEqual(['classification_label']);
    expect(codes('Internal Only')).toEqual(['classification_label']);
    expect(codes('[Confidential] roadmap')).toEqual(['classification_label']);
    expect(codes('회사는 계약 내용을 비공개로 했다')).toEqual([]);
    expect(codes('The firm kept the terms confidential and restricted exports')).toEqual([]);
    expect(codes('Proprietary software maker adds 12kg payload and 2000 units')).toEqual([]);
  });

  it('does not apply the number/unit, employee-id or private-host rules (request-only)', () => {
    expect(codes('토크 120Nm, 단가 300만원, AB1234567, 10.1.2.3')).toEqual([]);
  });

  it('ignores URLs inside text when looking for blobs, and non-string values', () => {
    expect(codes('read https://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/bbbb')).toEqual([]);
    expect(guardIngestFields([{ value: 12, kind: 'free' }, { value: undefined, kind: 'url' }], c)).toEqual([]);
  });
});
