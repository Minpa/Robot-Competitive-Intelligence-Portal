/**
 * 인바운드(TS)와 아웃바운드(.mjs) 가드의 규칙이 발산하지 않는지 확인한다.
 * 같은 공유 픽스처에 대해 판정·사유 코드·정규형이 일치해야 하고, 규칙 상수 목록도 같아야 한다.
 */
import { describe, it, expect } from 'vitest';
// @ts-expect-error — 순수 JS(.mjs) 참고 구현
import { createOptions, guardOutbound, RULE_CONSTANTS } from '../../../../../scripts/lib/argos-i-outbound-guard.mjs';
import { guardRequest } from '../../services/argos-i-inbound-guard.js';
import * as rules from '../../services/argos-i-guard-rules.js';
import { guardCaseFile, inboundContextFromFixture } from '../fixtures/argos-i-guard-cases.js';

const o = guardCaseFile.options;
const inCtx = inboundContextFromFixture();
const outOpts = createOptions({ allowedHosts: o.allowedHosts, internalDomains: o.internalDomains, patterns: o.patterns, termHashes: o.termHashes, approvedBy: 'reviewer', strict: true, now: new Date(o.now) });

describe('guard parity (same fixtures)', () => {
  it.each(guardCaseFile.cases.map((c) => [c.name, c] as const))('%s', (_n, c) => {
    const a = guardRequest(c.request, inCtx);
    const b = guardOutbound(c.request, outOpts);
    expect(b.ok).toBe(a.ok);
    expect(b.hash8).toBe(a.hash8);
    if (a.ok && b.ok) {
      expect(b.canonicalJson).toBe(a.canonicalJson);
      expect(b.payloadHash).toBe(a.payloadHash);
    } else if (!a.ok && !b.ok) {
      expect(b.reasons).toEqual(a.reasons);
    }
  });
});

describe('rule constants parity', () => {
  it('reason codes, labels, patterns and limits are identical', () => {
    expect(RULE_CONSTANTS.RULES_VERSION).toBe(rules.GUARD_RULES_VERSION);
    expect(RULE_CONSTANTS.REASON_CODES).toEqual([...rules.GUARD_REASON_CODES]);
    expect(RULE_CONSTANTS.DEFAULT_INTERNAL_DOMAINS).toEqual([...rules.DEFAULT_INTERNAL_DOMAINS]);
    expect(RULE_CONSTANTS.PRIVATE_HOST_SUFFIXES).toEqual([...rules.PRIVATE_HOST_SUFFIXES]);
    expect(RULE_CONSTANTS.STATIC_ALLOWED_HOSTS).toEqual([...rules.STATIC_ALLOWED_HOSTS]);
    expect(RULE_CONSTANTS.CLASSIFICATION_STRONG).toEqual([...rules.CLASSIFICATION_STRONG]);
    expect(RULE_CONSTANTS.CLASSIFICATION_WEAK).toEqual([...rules.CLASSIFICATION_WEAK]);
    expect(RULE_CONSTANTS.NUMBER_UNIT_MULTI).toBe(rules.NUMBER_UNIT_MULTI);
    expect(RULE_CONSTANTS.NUMBER_UNIT_SINGLE).toBe(rules.NUMBER_UNIT_SINGLE);
    expect(RULE_CONSTANTS.EMPLOYEE_ID_PATTERN).toBe(rules.EMPLOYEE_ID_PATTERN);
    expect(RULE_CONSTANTS.DEFAULT_INTERNAL_PATTERNS).toEqual([...rules.DEFAULT_INTERNAL_PATTERNS]);
    expect(RULE_CONSTANTS.HOST_NAME_PATTERNS).toEqual([...rules.HOST_NAME_PATTERNS]);
    expect(RULE_CONSTANTS.HOST_PORT_PATTERN).toBe(rules.HOST_PORT_PATTERN);
    expect(RULE_CONSTANTS.BLOB_BASE64_MIN).toBe(rules.BLOB_BASE64_MIN);
    expect(RULE_CONSTANTS.BLOB_HEX_MIN).toBe(rules.BLOB_HEX_MIN);
    expect(RULE_CONSTANTS.NOTE_MAX_CHARS).toBe(rules.NOTE_MAX_CHARS);
    expect(RULE_CONSTANTS.BODY_MAX_BYTES).toBe(rules.BODY_MAX_BYTES);
    expect(RULE_CONSTANTS.BODY_MAX_DEPTH).toBe(rules.BODY_MAX_DEPTH);
    expect(RULE_CONSTANTS.BODY_MAX_KEYS).toBe(rules.BODY_MAX_KEYS);
  });
});
