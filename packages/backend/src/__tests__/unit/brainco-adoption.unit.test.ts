/**
 * BrainCo 채택 사례(demand-cases.json) 검증 + 데이터 키 변경 확인
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateAdoptionsFile, adoptionCaseKey, vendorKey } from '../../db/actuator-update.util.js';
import { computeActuatorDataKey, LOGIC_VERSION } from '../../db/apply-actuator-data-update.js';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db/seed-data/actuator-update');
const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'demand-cases.json'), 'utf-8')) as { caseCount: number; cases: Array<Record<string, unknown>> };
const validated = validateAdoptionsFile(raw);
const brainco = validated.file!.cases.filter((c) => vendorKey(c.actuatorVendor) === 'brainco');

describe('BrainCo adoption cases in demand-cases.json', () => {
  it('loads with no errors or warnings; header caseCount matches', () => {
    expect(validated.errors).toEqual([]);
    expect(validated.warnings).toEqual([]);
    expect(raw.caseCount).toBe(raw.cases.length);
  });

  it('adds BrainCo cases while the original 30 cases remain', () => {
    expect(brainco.length).toBeGreaterThanOrEqual(1);
    expect(validated.file!.cases.length - brainco.length).toBe(30);
    expect(validated.file!.cases[0]!.robotName).toBe('K-Bot'); // 기존 사례는 앞쪽에 그대로
  });

  it('case_key is unique across all cases', () => {
    const keys = validated.file!.cases.map((c) => adoptionCaseKey(c));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('Unitree G1 is an official option (grade A); H2 reseller-only cases are grade C', () => {
    const g1 = brainco.find((c) => c.robotName === 'G1' && c.company === 'Unitree Robotics')!;
    expect(g1).toBeTruthy();
    expect(g1.evidenceGrade).toBe('A');
    expect(g1.usage).toContain('공식 옵션');
    const h2 = brainco.filter((c) => c.robotName === 'H2' && c.company === 'Unitree Robotics');
    expect(h2.length).toBeGreaterThanOrEqual(1);
    for (const c of h2) {
      expect(c.evidenceGrade).toBe('C');
      expect(c.segment).toBe('humanoid_tier1');
      expect(c.level).toBe('module');
    }
    expect(h2.some((c) => /Revo 2/.test(c.actuatorModel ?? ''))).toBe(true);
    expect(h2.some((c) => /Revo 3 U21T/.test(c.actuatorModel ?? ''))).toBe(true);
  });

  it('every BrainCo case has sources, a hand usage, level=module, an A-C grade; excluded companies are absent', () => {
    for (const c of brainco) {
      expect(c.sources.length, c.robotName).toBeGreaterThan(0);
      expect(c.usage ?? '', c.robotName).toMatch(/핸드|hand/i);
      expect(c.level).toBe('module');
      expect(['A', 'B', 'C']).toContain(c.evidenceGrade);
      expect(c.actuatorVendor).toBe('BrainCo');
    }
    const companies = brainco.map((c) => c.company).join('|');
    expect(companies).not.toMatch(/AgiBot|Agibot|Galbot|Fourier/i);
  });
});

describe('actuator data key', () => {
  it('LOGIC_VERSION stays 2', () => {
    expect(LOGIC_VERSION).toBe(2);
  });

  it('changes when the BrainCo cases are added (before/after demand-cases.json) and keeps the format', () => {
    const after = computeActuatorDataKey(DATA_DIR);
    expect(after).toMatch(/^actuator-update:[0-9a-f]{12}$/);

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brainco-key-'));
    try {
      for (const f of ['robots.json', 'suppliers.json', 'sourcing-regrade.json']) fs.copyFileSync(path.join(DATA_DIR, f), path.join(tmp, f));
      const before = { ...raw, caseCount: 30, cases: raw.cases.filter((c) => vendorKey(String(c.actuatorVendor)) !== 'brainco') };
      fs.writeFileSync(path.join(tmp, 'demand-cases.json'), JSON.stringify(before, null, 2));
      const beforeKey = computeActuatorDataKey(tmp);
      expect(beforeKey).toMatch(/^actuator-update:[0-9a-f]{12}$/);
      expect(beforeKey).not.toBe(after);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
