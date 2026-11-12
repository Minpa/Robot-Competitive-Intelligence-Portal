/**
 * 아웃바운드 가드(scripts/lib/argos-i-outbound-guard.mjs) — 인바운드와 같은 공유 픽스처, 그리고 아웃바운드 고유 동작
 * (sourcePublic 누락 차단, note 승인 없으면 차단, 알 수 없는 키 제거)
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — 순수 JS(.mjs) 참고 구현을 직접 import 한다 (vitest 는 .mjs 를 그대로 실행한다)
import { createOptions, guardOutbound, hashTerm, REASON_CODES } from '../../../../../scripts/lib/argos-i-outbound-guard.mjs';
import { guardCaseFile } from '../fixtures/argos-i-guard-cases.js';

const o = guardCaseFile.options;
const options = (extra: Record<string, unknown> = {}) =>
  createOptions({
    allowedHosts: o.allowedHosts,
    internalDomains: o.internalDomains,
    patterns: o.patterns,
    termHashes: o.termHashes,
    approvedBy: 'reviewer',
    strict: true,
    now: new Date(o.now),
    ...extra,
  });

describe('shared fixtures (strict mode = same verdict as the server guard)', () => {
  it.each(guardCaseFile.cases.map((c) => [c.name, c] as const))('%s', (_n, c) => {
    const r = guardOutbound(c.request, options());
    expect(r.ok).toBe(c.expect.ok);
    if (r.ok) {
      expect(JSON.parse(r.canonicalJson)).toEqual(c.expect.canonical);
      expect(r.body.sourcePublic).toBe(true);
    } else {
      expect(r.reasons).toEqual(c.expect.reasons);
    }
  });

  it('declares all 18 reason codes', () => {
    expect(REASON_CODES).toHaveLength(18);
  });
});

describe('outbound-specific behaviour', () => {
  const base = { type: 'analyze', params: { target: 'robot', slug: 'figure-02' }, sourcePublic: true };

  it('blocks when sourcePublic is missing', () => {
    const r = guardOutbound({ type: 'analyze', params: base.params }, options());
    expect(r).toMatchObject({ ok: false, reasons: ['source_not_public'] });
  });

  it('blocks a note without human approval (approvedBy), passes with it', () => {
    const withNote = { ...base, note: '지난주 영상 후속 확인 요청' };
    const blocked = guardOutbound(withNote, options({ approvedBy: undefined }));
    expect(blocked).toMatchObject({ ok: false, kind: 'blocked', outboundOnly: ['note_not_approved'] });
    expect(guardOutbound(withNote, options({ approvedBy: ' reviewer ' })).ok).toBe(true);
  });

  it('removes unknown keys (counting them, never naming them) unless strict', () => {
    const r = guardOutbound({ ...base, projectX: 1, params: { ...base.params, extra: 2 } }, options({ strict: false }));
    expect(r.ok).toBe(true);
    expect(r.removedKeyCount).toBe(2);
    expect(JSON.stringify(r)).not.toContain('projectX');
    expect(JSON.stringify(r.body)).not.toContain('extra');
    const strict = guardOutbound({ ...base, projectX: 1 }, options({ strict: true }));
    expect(strict).toMatchObject({ ok: false, reasons: ['unknown_key'], removedKeyCount: 1 });
  });

  it('still blocks markers in values that would be sent (non-strict)', () => {
    const r = guardOutbound({ ...base, note: 'hong@lge.com' }, options({ strict: false }));
    expect(r).toMatchObject({ ok: false, reasons: ['internal_domain', 'email_detected'] });
  });

  it('plaintext terms and extra internal domains are supported on the client side', () => {
    const opts = createOptions({ terms: ['Falcon Nest'], internalDomains: ['corp-example.test'], approvedBy: 'r', now: new Date(o.now) });
    expect(guardOutbound({ ...base, note: 'falcon nest 확인' }, opts)).toMatchObject({ ok: false, reasons: ['internal_term_hash'] });
    expect(guardOutbound({ ...base, note: 'x.corp-example.test' }, opts)).toMatchObject({ ok: false, reasons: ['internal_domain'] });
    expect(hashTerm('Falcon Nest')).toBe(hashTerm('falcon  nest'));
  });

  it('output never contains input values', () => {
    const r = guardOutbound({ ...base, note: 'zzz-secret-note@lge.com' }, options());
    expect(JSON.stringify(r)).not.toContain('zzz-secret-note');
  });
});
