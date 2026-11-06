/**
 * 데이터 커버리지 — 백엔드/프론트 types/data-coverage.ts 동일성, 픽스처 형상, 지표 레지스트리 완전성(AC-02, AC-03, AC-29)
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { coverageEmptySample, coverageOkSample, coveragePartialSample } from '../fixtures/data-coverage.fixture.js';
import { ALL_METRIC_IDS, SECTION_ORDER, TABLE_REGISTRY } from '../../services/data-coverage-sections.js';
import type { DataCoverageResponse } from '../../types/data-coverage.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendFile = path.resolve(here, '../../types/data-coverage.ts');
const frontendFile = path.resolve(here, '../../../../frontend/src/types/data-coverage.ts');

function normalize(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/\s+/g, '');
}

const ORDER = ['ingest', 'collectRun', 'analysis', 'aiCost', 'specs', 'quality', 'crawlTargets'];

/** §11 로드맵 "운영 실측 필요" 매핑표의 지표/표 ID */
const ROADMAP_IDS = [
  'ingest.byGroup', 'ingest.byProductType', 'ingest.byChannel', 'run.legal.bySource', 'run.youtube.skippedChannels', 'run.youtube.channelsSkipped',
  'run.config.youtubeApiKeyConfigured', 'run.quota.exhausted', 'run.quota.searchCalls', 'run.quota.estimatedUnits', 'ingest.zeroChannels90d',
  'specs.robots.total', 'specs.robots.confirmed', 'specs.robots.forecast', 'specs.components.countByType', 'specs.ci.emptyCells', 'specs.ci.emptyRate',
  'specs.ci.confidence', 'specs.ci.lowConfidenceRate', 'specs.ci.byLayer', 'specs.ciStaging.pending', 'specs.audit.staleRobotCount', 'specs.components.specKeys',
  'analysis.video.tagRate', 'analysis.video.heuristicRate', 'analysis.video.llmRate', 'analysis.gemini.scopeRate', 'analysis.gemini.scopePending',
  'analysis.gemini.scopeExhausted', 'analysis.gemini.byDomain', 'analysis.paper.rate', 'analysis.paper.rate30d', 'analysis.focus.hand.judged',
  'analysis.focus.actuator.rateApprox', 'analysis.topics.hand.rate', 'analysis.topics.actuator.classified', 'analysis.article.keyPointsRate', 'analysis.article.keyPoints30d',
  'cost.claude.usedMonth', 'cost.claude.limit', 'cost.claude.usedPct', 'cost.claude.projectedMonthEnd', 'cost.byProvider', 'cost.byTag',
  'analysis.video.untagged', 'analysis.paper.backlog', 'cost.backlogEta', 'specs.bodyFields', 'specs.handFields', 'specs.powerFields', 'specs.supplier.fields',
  'specs.robots.noBodySpecs', 'specs.sourcing.unconfirmed', 'specs.sourcing', 'specs.handBenchmark.competitors', 'quality.dup.urlNorm', 'quality.dup.arxivId',
  'quality.dup.videoId', 'quality.entityTitles.total', 'quality.bySource', 'quality.language', 'quality.autoCompanies.count', 'quality.autoCompanies.samples',
  'analysis.robotTagGap.videos', 'crawl.targets.total', 'crawl.jobsByStatus', 'run.collectors', 'run.lastFinishedAt', 'run.ageHours', 'analysis.gemini.summaryKoRate',
];

describe('type contract', () => {
  it('backend and frontend types/data-coverage.ts are identical apart from comments and whitespace', () => {
    const be = normalize(fs.readFileSync(backendFile, 'utf-8'));
    const fe = normalize(fs.readFileSync(frontendFile, 'utf-8'));
    expect(be.length).toBeGreaterThan(500);
    expect(fe).toBe(be);
  });
});

describe.each([
  ['ok', coverageOkSample],
  ['partial', coveragePartialSample],
  ['empty', coverageEmptySample],
] as const)('%s fixture shape', (_n, s: DataCoverageResponse) => {
  it('has exactly 7 sections in the fixed order', () => {
    expect(s.sections.map((x) => x.id)).toEqual(ORDER);
    expect(SECTION_ORDER.map((x) => x.id)).toEqual(ORDER);
  });

  it('metric ids are unique and every metric has the required fields', () => {
    const ids = s.sections.flatMap((x) => x.metrics.map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of s.sections.flatMap((x) => x.metrics)) {
      expect(Object.keys(m).sort()).toEqual(
        ['baseline', 'delta', 'denominator', 'errorMessage', 'goodDirection', 'id', 'kind', 'label', 'note', 'numerator', 'reason', 'severity', 'status', 'value'],
      );
      if (m.status === 'failed') {
        expect(m.value).toBeNull();
        expect(m.reason).not.toBeNull();
      }
      if (m.status === 'na') expect(m.value).toBeNull();
    }
  });

  it('tables respect the 50-row cap and have unique ids', () => {
    const ids = s.sections.flatMap((x) => x.tables.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of s.sections.flatMap((x) => x.tables)) {
      expect(t.rows.length).toBeLessThanOrEqual(50);
      expect(t.totalRows).toBeGreaterThanOrEqual(t.rows.length);
    }
  });

  it('survives a JSON round trip unchanged and stays under 200KB', () => {
    const json = JSON.stringify(s);
    expect(JSON.parse(json)).toEqual(s);
    expect(Buffer.byteLength(json)).toBeLessThan(200_000);
  });
});

describe('metric registry completeness', () => {
  const okIds = new Set(coverageOkSample.sections.flatMap((x) => x.metrics.map((m) => m.id)));
  const okTableIds = new Set(coverageOkSample.sections.flatMap((x) => x.tables.map((t) => t.id)));

  it('every registered metric id appears in the ok fixture (value, failed or na — never missing)', () => {
    for (const id of ALL_METRIC_IDS) expect(okIds.has(id), id).toBe(true);
    expect(okIds.size).toBe(ALL_METRIC_IDS.length);
  });

  it('every registered table id appears in the ok fixture', () => {
    for (const t of TABLE_REGISTRY) expect(okTableIds.has(t.id), t.id).toBe(true);
  });

  it('roadmap "운영 실측 필요" ids all exist (as a metric or a table)', () => {
    for (const id of ROADMAP_IDS) expect(okIds.has(id) || okTableIds.has(id), id).toBe(true);
  });

  it('the same metrics exist in the partial and empty fixtures (only status differs)', () => {
    for (const s of [coveragePartialSample, coverageEmptySample]) {
      const ids = new Set(s.sections.flatMap((x) => x.metrics.map((m) => m.id)));
      expect(ids).toEqual(okIds);
    }
  });

  it('collectRun is na with an explanatory note when collect:last is missing; other sections are unaffected', () => {
    const run = coverageEmptySample.sections.find((x) => x.id === 'collectRun')!;
    expect(run.status).toBe('na');
    expect(run.notes.join(' ')).toContain('collect:last');
    expect(run.metrics.every((m) => m.status === 'na' && m.reason === 'no_data')).toBe(true);
    expect(coverageEmptySample.sections.find((x) => x.id === 'aiCost')!.status).toBe('ok');
  });

  it('partial fixture isolates the failure to the failed query', () => {
    const p = coveragePartialSample;
    expect(p.partial).toBe(true);
    const gap = p.sections.find((x) => x.id === 'analysis')!.metrics.find((m) => m.id === 'analysis.video.tagRate')!;
    expect(gap.status).toBe('failed');
    expect(gap.reason).toBe('timeout');
    expect(p.sections.find((x) => x.id === 'ingest')!.status).toBe('ok');
    const eta = p.sections.find((x) => x.id === 'aiCost')!.tables.find((t) => t.id === 'cost.backlogEta')!;
    expect(eta.status).toBe('failed');
    expect(p.sections.find((x) => x.id === 'specs')!.tables.find((t) => t.id === 'specs.ci.byLayer')!.status).toBe('failed');
  });
});
