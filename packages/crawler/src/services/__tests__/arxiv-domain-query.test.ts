import { describe, it, expect } from 'vitest';
import {
  ACTUATOR_QUERIES,
  ACTUATOR_SUBTOPICS,
  ARXIV_DOMAIN_QUERIES,
  ARXIV_DOMAIN_SUBTOPICS,
  ARXIV_TOPIC_DOMAINS,
  collectedAtKey,
  collectorName,
  estimateDomainBackfill,
  isRelevantActuatorPaper,
  isRelevantDomainPaper,
  logTag,
  parseArxivDomain,
} from '../arxiv-domain-query.js';
import { HAND_QUERIES, HAND_SUBTOPICS, buildArxivUrl, estimateBackfill, isRelevantHandPaper } from '../arxiv-hand-query.js';

const Q = Object.fromEntries(ACTUATOR_QUERIES.map((q) => [q.id, q.query])) as Record<string, string>;
const ro = ['cs.RO'];

describe('ARXIV_DOMAIN_QUERIES', () => {
  it('lists hand and actuator, and hand reuses HAND_QUERIES by reference', () => {
    expect(ARXIV_TOPIC_DOMAINS).toEqual(['hand', 'actuator']);
    expect(ARXIV_DOMAIN_QUERIES.hand).toBe(HAND_QUERIES);
    expect(ARXIV_DOMAIN_SUBTOPICS.hand).toBe(HAND_SUBTOPICS);
    expect(ARXIV_DOMAIN_QUERIES.actuator).toBe(ACTUATOR_QUERIES);
  });

  it('actuator has exactly 4 queries with the same id scheme as hand', () => {
    expect(ACTUATOR_QUERIES).toHaveLength(4);
    expect(ACTUATOR_QUERIES.map((q) => q.id)).toEqual(['q1', 'q2', 'q3', 'q4']);
    expect(new Set(ACTUATOR_QUERIES.map((q) => q.key)).size).toBe(4);
  });

  it('pins cat:cs.RO on every actuator query, avoids wildcards, balances parentheses and quotes', () => {
    for (const q of ACTUATOR_QUERIES) {
      expect(q.query.startsWith('cat:cs.RO AND (')).toBe(true);
      expect(q.query).not.toContain('*');
      expect((q.query.match(/\(/g) ?? []).length).toBe((q.query.match(/\)/g) ?? []).length);
      expect((q.query.match(/"/g) ?? []).length % 2).toBe(0);
    }
  });

  it('covers the specified actuator concepts', () => {
    expect(Q.q1).toContain('abs:actuator');
    expect(Q.q1).toContain('abs:humanoid');
    expect(Q.q1).toContain('abs:quadruped');
    expect(Q.q2).toContain('quasi-direct-drive');
    expect(Q.q2).toContain('proprioceptive');
    expect(Q.q2).toContain('backdrivable');
    expect(Q.q3).toContain('harmonic drive');
    expect(Q.q3).toContain('strain wave');
    expect(Q.q3).toContain('cycloidal');
    expect(Q.q3).toContain('planetary');
    expect(Q.q4).toContain('series elastic');
    expect(Q.q4).toContain('variable stiffness');
    expect(Q.q4).toContain('linear actuator');
    expect(Q.q4).toContain('roller screw');
  });

  it('builds percent-encoded https export.arxiv.org URLs that round-trip', () => {
    for (const q of ACTUATOR_QUERIES) {
      const url = buildArxivUrl({ query: q.query });
      expect(new URL(url).hostname).toBe('export.arxiv.org');
      expect(url).not.toMatch(/[ "[\]]/);
      const raw = url.split('search_query=')[1]!.split('&')[0]!;
      expect(decodeURIComponent(raw)).toBe(`(${q.query})`);
    }
  });

  it('does not change the hand queries', () => {
    expect(HAND_QUERIES.map((q) => q.key)).toEqual([
      'q1-hand-core',
      'q2-sensing-actuation',
      'q3-grasp-gripper',
      'q4-teleop-sim2real-humanoid',
    ]);
  });
});

describe('ACTUATOR_SUBTOPICS mapping', () => {
  it('covers 10 subtopics', () => {
    expect(ACTUATOR_SUBTOPICS.map((s) => s.no)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('has each representative term inside every mapped query and uses every query at least once', () => {
    const used = new Set<string>();
    for (const s of ACTUATOR_SUBTOPICS) {
      expect(s.queryIds.length).toBeGreaterThan(0);
      for (const qid of s.queryIds) {
        used.add(qid);
        expect(Q[qid], `subtopic ${s.no} (${s.term}) in ${qid}`).toContain(s.term);
      }
    }
    expect([...used].sort()).toEqual(['q1', 'q2', 'q3', 'q4']);
  });
});

describe('isRelevantActuatorPaper - pass cases', () => {
  const pass: Array<[string, string, string[]?]> = [
    ['A quasi-direct-drive actuator for legged robots', ''],
    ['Design of a high torque density motor for humanoid joints', ''],
    ['Backdrivable harmonic drive joint with torque sensing', ''],
    ['Cycloidal reducer for compact robot joint modules', ''],
    ['A new control framework', 'We propose a series elastic actuator with variable stiffness for safe interaction.'],
    ['Roller screw linear actuators for a humanoid knee', ''],
    ['Proprioceptive actuation enables agile quadruped locomotion', ''],
    ['Planetary gearbox efficiency in robotic transmissions', ''],
    ['Hydraulic actuation for humanoid robots', '', ['cs.RO', 'eess.SY']],
  ];
  pass.forEach(([title, abs, cats], i) => {
    it(`passes #${i + 1}: ${title}`, () => {
      expect(isRelevantActuatorPaper({ title, abstract: abs, categories: cats ?? ro })).toBe(true);
    });
  });
});

describe('isRelevantActuatorPaper - reject cases', () => {
  const reject: Array<[string, string, string[]?]> = [
    ['Learning motor skills from human demonstrations', 'Motor learning for manipulation policies.'],
    ['Sensorimotor control for grasping', ''],
    ['Planetary rover path planning over rough terrain', ''],
    ['Low-latency data transmission for teleoperation', 'We reduce transmission delay over wireless links.'],
    ['Trajectory planning for quadruped locomotion', ''],
    ['Visual SLAM for indoor navigation', 'A feature-based pipeline.'],
    ['Quasi-direct-drive actuator design', '', ['eess.SY']],
    ['Motor imagery brain-computer interface for robot control', ''],
  ];
  reject.forEach(([title, abs, cats], i) => {
    it(`rejects #${i + 1}: ${title}`, () => {
      expect(isRelevantActuatorPaper({ title, abstract: abs, categories: cats ?? ro })).toBe(false);
    });
  });

  it('still passes when an idiom coexists with a real actuator keyword', () => {
    expect(
      isRelevantActuatorPaper({
        title: 'Motor skills with a quasi-direct-drive arm',
        abstract: 'Planetary rover inspired gearbox.',
        categories: ro,
      })
    ).toBe(true);
  });

  it('is case-insensitive and accepts cs.RO as a cross-list', () => {
    expect(isRelevantActuatorPaper({ title: 'ACTUATOR', abstract: null, categories: ['cs.LG', 'cs.RO'] })).toBe(true);
    expect(isRelevantActuatorPaper({ title: 'Actuator', abstract: '', categories: [] })).toBe(false);
  });

  it('is a superset of the report paperRegex for actuator on its own vocabulary', () => {
    const reportRegexSamples = [
      'actuator',
      'a motor',
      'gearbox',
      'harmonic drive',
      'gear transmission',
      'joint torque',
      'quasi-direct drive',
      'proprioceptive',
      'series elastic',
    ];
    for (const s of reportRegexSamples) {
      expect(isRelevantActuatorPaper({ title: s, abstract: '', categories: ro }), s).toBe(true);
    }
  });
});

describe('isRelevantDomainPaper', () => {
  it('delegates hand to isRelevantHandPaper and actuator to isRelevantActuatorPaper', () => {
    const handPaper = { title: 'Dexterous robot hand', abstract: '', categories: ro };
    const actPaper = { title: 'Quasi-direct-drive actuator', abstract: '', categories: ro };
    expect(isRelevantDomainPaper('hand', handPaper)).toBe(isRelevantHandPaper(handPaper));
    expect(isRelevantDomainPaper('hand', actPaper)).toBe(false);
    expect(isRelevantDomainPaper('actuator', actPaper)).toBe(true);
    expect(isRelevantDomainPaper('actuator', handPaper)).toBe(false);
  });
});

describe('domain helpers', () => {
  it('keeps the hand keys and tag unchanged, derives actuator ones', () => {
    expect(collectedAtKey('hand')).toBe('handCollectedAt');
    expect(collectorName('hand')).toBe('arxiv-hand');
    expect(logTag('hand')).toBe('ArxivHand');
    expect(collectedAtKey('actuator')).toBe('actuatorCollectedAt');
    expect(collectorName('actuator')).toBe('arxiv-actuator');
    expect(logTag('actuator')).toBe('ArxivActuator');
  });

  it('validates the domain input', () => {
    expect(parseArxivDomain('hand')).toEqual({ ok: true, domain: 'hand' });
    expect(parseArxivDomain('actuator')).toEqual({ ok: true, domain: 'actuator' });
    for (const bad of ['rfm', 'HAND', '', undefined, null, 1, ['hand'], {}]) {
      expect(parseArxivDomain(bad).ok, String(bad)).toBe(false);
    }
  });

  it('estimateDomainBackfill matches the hand estimate for 4 queries', () => {
    expect(estimateDomainBackfill(13, 4)).toEqual(estimateBackfill(13));
    expect(estimateDomainBackfill(13, ACTUATOR_QUERIES.length)).toEqual({ estimatedRequests: 130, estimatedMinutes: 13 });
  });
});
