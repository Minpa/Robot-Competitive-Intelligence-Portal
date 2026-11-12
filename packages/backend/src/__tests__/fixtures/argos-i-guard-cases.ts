/**
 * argos-i-guard-cases.json 로더 — 인바운드·아웃바운드·패리티 테스트가 같은 픽스처를 쓴다 (가짜 값만).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { GuardContext } from '../../services/argos-i-inbound-guard.js';
import { filterAllowedHosts } from '../../services/argos-i-inbound-guard.js';
import { DEFAULT_INTERNAL_DOMAINS, DEFAULT_INTERNAL_PATTERNS } from '../../services/argos-i-guard-rules.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export interface GuardCase {
  name: string;
  request: unknown;
  expect: { ok: boolean; reasons: string[]; kind?: 'rejected' | 'invalid' | 'unsupported'; canonical?: unknown };
}

export interface GuardCaseFile {
  options: { now: string; allowedHosts: string[]; internalDomains: string[]; patterns: string[]; termHashes: string[] };
  cases: GuardCase[];
}

export const guardCaseFile: GuardCaseFile = JSON.parse(fs.readFileSync(path.join(here, 'argos-i-guard-cases.json'), 'utf-8'));

export function inboundContextFromFixture(): GuardContext {
  const o = guardCaseFile.options;
  const internalDomains = [...DEFAULT_INTERNAL_DOMAINS, ...o.internalDomains];
  return {
    allowedHosts: filterAllowedHosts(o.allowedHosts, internalDomains),
    internalDomains,
    internalPatterns: [...DEFAULT_INTERNAL_PATTERNS, ...o.patterns].map((p) => new RegExp(p, 'iu')),
    termHashes: new Set(o.termHashes),
    now: new Date(o.now),
  };
}
