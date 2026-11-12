/**
 * 문서 — argos-i-interface.md §15(15.1~15.11)·목차·변경 이력·토큰 2종, argos-i-client-guide.md 체크리스트 9항목·사유 코드 표,
 * 문서에 비밀값·모델 식별자·실제 사내 용어가 없는지 (AC-31)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { GUARD_REASON_CODES } from '../../services/argos-i-guard-rules.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const docs = path.resolve(here, '../../../../../docs');
const iface = fs.readFileSync(path.join(docs, 'argos-i-interface.md'), 'utf-8');
const guide = fs.readFileSync(path.join(docs, 'argos-i-client-guide.md'), 'utf-8');

describe('argos-i-interface.md', () => {
  it('has section 15 with 15.1 ~ 15.11, a TOC entry, and the 30th bundle area (8.30)', () => {
    for (let i = 1; i <= 11; i++) expect(iface, `15.${i}`).toMatch(new RegExp(`^### 15\\.${i} `, 'm'));
    expect(iface).toMatch(/^## 15\. 요청 인터페이스/m);
    expect(iface).toContain('15. [요청 인터페이스 (ARGOS_I → ARGOS)](#15-요청-인터페이스-argos_i--argos)');
    expect(iface).toMatch(/^### 8\.30 `requests`/m);
    expect(iface).toContain('아래 30개 영역');
    expect(iface).toMatch(/^\| 30 \| `requests` \|/m);
  });

  it('documents the two tokens (3.5), the additive change history without a schema bump, and the changelog entry', () => {
    expect(iface).toMatch(/^### 3\.5 토큰 2종/m);
    const row = iface.split('\n').find((l) => l.startsWith('| 2026-11-12 |'))!;
    expect(row).toContain('요청 인터페이스 추가');
    expect(row).toContain('requests');
    expect(row).toContain('schemaVersion');
    expect(row).toContain('올리지 않는다');
  });

  it('lists all 18 reason codes, the endpoints, the limits and the status machine', () => {
    for (const code of GUARD_REASON_CODES) expect(iface, code).toContain(`\`${code}\``);
    for (const needle of ['POST /api/argos-i/requests', 'GET /api/argos-i/requests/{id}', 'DELETE /api/argos-i/requests/{id}', 'Idempotency-Key', '8KB', '시간당 60건', '200건', 'needs_approval', 'budget_monthly', 'requests_suspended', 'internal_data_rejected']) {
      expect(iface, needle).toContain(needle);
    }
  });
});

describe('argos-i-client-guide.md', () => {
  it('opens with the responsibility split (outbound guard is the first line of control)', () => {
    const head = guide.slice(0, 3500);
    expect(head).toContain('1차 통제');
    expect(head).toContain('최후 방어선');
    expect(head).toContain('사내 코드명');
  });

  it('has the nine checklist items, the 18-code table, the error table, the do-not list and the questions to the ARGOS_I team', () => {
    for (const n of ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨']) expect(guide, n).toContain(`### ${n} `);
    for (const code of GUARD_REASON_CODES) expect(guide, code).toContain(`\`${code}\``);
    expect(guide).toMatch(/## 3\. 호출 절차와 오류 대응표/);
    expect(guide).toMatch(/## 4\. ARGOS_I 쪽에서 하면 안 되는 것/);
    expect(guide).toMatch(/### 부록 C\. ARGOS_I 팀에 확인이 필요한 질문/);
    expect(guide).toContain('영문 1~2자 + 숫자 6~8자');
    expect(guide).toContain('재시도 금지');
  });
});

describe('no secrets in the new docs', () => {
  // 인터페이스 문서는 기존 절에 샘플 해시 등이 있으므로 새로 쓴 15절만 본다
  for (const [name, text] of [['argos-i-interface.md §15', iface.slice(iface.indexOf('## 15. 요청 인터페이스'))], ['argos-i-client-guide.md', guide]] as const) {
    it(`${name}: no token-like strings, no model identifiers, no private IPs/hosts`, () => {
      expect(text).not.toMatch(/\b[A-Fa-f0-9]{40,}\b/); // 긴 hex/해시/토큰
      expect(text).not.toMatch(/Bearer\s+[A-Za-z0-9_-]{20,}/);
      expect(text).not.toMatch(/claude-[a-z0-9.-]+|gemini-[0-9a-z.-]+|gpt-[0-9a-z.-]+|\bopus[- ]?\d|\bhaiku[- ]?\d|\bsonnet[- ]?\d/i);
      expect(text).not.toMatch(/\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+(?:\.\d+)?\b/);
    });
  }
});
