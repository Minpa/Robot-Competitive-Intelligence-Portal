/**
 * 도메인 관련성 판정(focus)·분류 대상 선정의 actuator 분기 — hand 프롬프트/동작 불변 검증 포함.
 */
import { describe, it, expect } from 'vitest';
import {
  ANALYZE_SUPPORTED_DOMAINS,
  buildFocusJudgePrompt,
  parseHaikuFocusBatch,
  selectJudgeTargets,
  geminiUsageTag,
  isFocusDomain,
  toFocusJudgeItem,
} from '../../services/tech-trend-analysis.service.js';
import { buildAnalysisPrompt, parseAnalysis, parseDomainFocus, PROMPT_KO } from '../../services/video-content-analysis.service.js';
import { filterByDomainFocus, hasDomainFocus, FOCUS_DOMAINS, type ArticleRow } from '../../services/tech-trend-report.service.js';
import {
  selectClassificationTargets,
  classifyUsageQuery,
  CLASSIFY_SUPPORTED_DOMAINS,
  getTopicClassificationService,
  handTopicClassificationService,
  actuatorTopicClassificationService,
  TopicClassificationService,
} from '../../services/hand-topic-classification.service.js';
import { ACTUATOR_TOPIC_VERSION } from '../../services/domain-topics.js';
import { HAND_TOPIC_VERSION } from '../../services/hand-topics.js';

function row(id: string, meta: Record<string, unknown> = {}, extra: Partial<ArticleRow> = {}): ArticleRow {
  return {
    id,
    title: `Video ${id}`,
    url: `https://www.youtube.com/watch?v=${id.padEnd(11, 'x')}`,
    productType: 'video',
    source: 'youtube',
    publishedAt: '2026-10-01T00:00:00.000Z',
    extractedMetadata: meta,
    ...extra,
  };
}

describe('focus domains', () => {
  it('analysis and report agree on hand + actuator', () => {
    expect(ANALYZE_SUPPORTED_DOMAINS).toEqual(['hand', 'actuator']);
    expect(FOCUS_DOMAINS).toEqual(['hand', 'actuator']);
    expect(isFocusDomain('actuator')).toBe(true);
    expect(isFocusDomain('rfm')).toBe(false);
    expect(hasDomainFocus('actuator')).toBe(true);
    expect(hasDomainFocus('expo')).toBe(false);
    expect(geminiUsageTag('hand')).toBe('[tech-trend-analysis:hand]');
    expect(geminiUsageTag('actuator')).toBe('[tech-trend-analysis:actuator]');
  });

  it("filterByDomainFocus('actuator') drops only actuator 'none' and leaves other domains untouched", () => {
    const rows = [
      row('none', { domainFocus: { actuator: { level: 'none' } } }),
      row('hand-none', { domainFocus: { hand: { level: 'none' } } }),
      row('prim', { domainFocus: { actuator: { level: 'primary' } } }),
      row('pend'),
    ];
    const act = filterByDomainFocus('actuator', rows);
    expect(act.kept.map((r) => r.id)).toEqual(['hand-none', 'prim', 'pend']);
    expect(act.excludedCount).toBe(1);
    const hand = filterByDomainFocus('hand', rows);
    expect(hand.kept.map((r) => r.id)).toEqual(['none', 'prim', 'pend']);
    expect(filterByDomainFocus('rfm', rows)).toEqual({ kept: rows, excludedCount: 0 });
  });
});

describe('Gemini focus prompt / parse (actuator)', () => {
  it('buildAnalysisPrompt() and (hand) are unchanged; (actuator) asks for domainFocus.actuator', () => {
    expect(buildAnalysisPrompt()).toBe(PROMPT_KO);
    const hand = buildAnalysisPrompt('hand');
    expect(hand).toContain('"hand": "primary|secondary|none');
    expect(hand).not.toContain('actuator');
    const act = buildAnalysisPrompt('actuator');
    expect(act).not.toBe(hand);
    expect(act).toContain('"actuator": "primary|secondary|none');
    expect(act).toContain('domainFocus.actuator 판정 기준');
    expect(act).toContain('실제 로봇 데모가 아닐 수도 있다');
    expect(act).toContain('JSON 객체만 응답하고 다른 텍스트는 포함하지 말라.');
    expect(act).toContain('자막 전문이나 장문 전사를 포함하지 말라');
    expect(act).toContain('애매하면 none이 아니라 secondary');
  });

  it('parseDomainFocus reads the requested domain key only', () => {
    expect(parseDomainFocus({ actuator: 'primary', reason: 'r' }, 'actuator')).toEqual({ level: 'primary', reason: 'r' });
    expect(parseDomainFocus({ actuator: 'primary', reason: 'r' })).toBeNull(); // 기본 hand
    expect(parseDomainFocus({ hand: 'primary', reason: 'r' }, 'actuator')).toBeNull();
    expect(parseDomainFocus({ actuator: 'maybe' }, 'actuator')).toBeNull();
  });

  it('parseAnalysis fills domainFocus under the actuator key when asked, hand by default', () => {
    const base = { task: 't', environment: 'e', autonomy: 'autonomous', capabilities: [], keyMoments: [], summaryKo: 's' };
    const text = JSON.stringify({ ...base, domainFocus: { actuator: 'secondary', reason: '관절 설명' } });
    expect(parseAnalysis(text, 'm', 'actuator')?.domainFocus).toEqual({ actuator: 'secondary', reason: '관절 설명' });
    expect(parseAnalysis(text, 'm')?.domainFocus).toBeUndefined();
    const handText = JSON.stringify({ ...base, domainFocus: { hand: 'primary', reason: 'x' } });
    expect(parseAnalysis(handText, 'm')?.domainFocus).toEqual({ hand: 'primary', reason: 'x' });
    expect(parseAnalysis(handText, 'm', 'actuator')?.domainFocus).toBeUndefined();
  });
});

describe('Haiku focus judge (actuator)', () => {
  const items = [toFocusJudgeItem(row('a', { geminiAnalysis: { summaryKo: 'x' } }))];

  it('hand prompt is unchanged (default) and actuator prompt uses the actuator key and criteria', () => {
    const hand = buildFocusJudgePrompt(items);
    expect(hand).toBe(buildFocusJudgePrompt(items, 'hand'));
    expect(hand).toContain('로봇 핸드/그리퍼/손 조작 기술 리포트');
    expect(hand).toContain('"hand":"primary|secondary|none"');
    const act = buildFocusJudgePrompt(items, 'actuator');
    expect(act).toContain('로봇 액추에이터/모터/감속기/관절 구동계 기술 리포트');
    expect(act).toContain('"actuator":"primary|secondary|none"');
    expect(act).not.toContain('"hand":');
    expect(act).toContain('애매하면');
    expect(act).toContain('"results"');
    expect(act).toContain('[영상 1건]');
    expect(act).toContain('<cite>');
  });

  it('parseHaikuFocusBatch reads the domain key', () => {
    const ids = new Set(['a', 'b']);
    const text = JSON.stringify({ results: [{ id: 'a', actuator: 'primary', reason: 'r' }, { id: 'b', hand: 'none', reason: 'r' }] });
    expect(parseHaikuFocusBatch(text, ids, 'actuator')).toEqual([{ id: 'a', level: 'primary', reason: 'r' }]);
    expect(parseHaikuFocusBatch(text, ids)).toEqual([{ id: 'b', level: 'none', reason: 'r' }]);
  });

  it('selectJudgeTargets(actuator) ignores hand judgements', () => {
    const analyzed = { geminiAnalysis: { summaryKo: 'x' } };
    const rows = [
      row('needs', { ...analyzed, domainFocus: { hand: { level: 'primary' } } }),
      row('done', { ...analyzed, domainFocus: { actuator: { level: 'secondary' } } }),
      row('raw'),
    ];
    expect(selectJudgeTargets(rows, 'actuator').map((r) => r.id)).toEqual(['needs']);
    expect(selectJudgeTargets(rows).map((r) => r.id)).toEqual(['done']);
  });
});

describe('classification targets (actuator)', () => {
  const paper = (id: string, meta: Record<string, unknown> = {}): ArticleRow => ({
    id,
    title: `Paper ${id}`,
    source: 'arxiv',
    publishedAt: '2026-09-01T00:00:00Z',
    extractedMetadata: meta,
  });
  const actStored = { topics: ['motor_design'], primary: 'motor_design', classifiedAt: 'x', version: ACTUATOR_TOPIC_VERSION };
  const handStored = { topics: ['sim2real'], primary: 'sim2real', classifiedAt: 'x', version: HAND_TOPIC_VERSION };

  it('uses domainTopics.actuator / domainTopicsAttempts.actuator / domainFocus.actuator', () => {
    const rows = [
      paper('done', { domainTopics: { actuator: actStored } }),
      paper('hand-only', { handTopics: handStored }), // 핸드 분류만 있으면 actuator 대상
      paper('old', { domainTopics: { actuator: { ...actStored, version: 0 } } }),
      paper('tired', { domainTopicsAttempts: { actuator: 3 } }),
      paper('hand-tired', { handTopicsAttempts: 3 }), // 핸드 시도 횟수는 무관
      row('none', { domainFocus: { actuator: { level: 'none' } } }),
      row('hand-none', { domainFocus: { hand: { level: 'none' } } }),
    ];
    const { targets, skippedExcluded } = selectClassificationTargets(rows, { cap: 100, domain: 'actuator' });
    expect(targets.map((r) => r.id).sort()).toEqual(['hand-none', 'hand-only', 'hand-tired', 'old']);
    expect(skippedExcluded).toBe(1);
    // 같은 행을 hand 로 선정하면 결과가 다르다 (기본값 hand 유지)
    const hand = selectClassificationTargets(rows, { cap: 100 });
    expect(hand.targets.map((r) => r.id).sort()).toEqual(['done', 'none', 'old', 'tired']);
    expect(hand.skippedExcluded).toBe(1);
  });

  it('exposes per-domain services and tags', () => {
    expect(CLASSIFY_SUPPORTED_DOMAINS).toEqual(['hand', 'actuator']);
    expect(getTopicClassificationService('hand')).toBe(handTopicClassificationService);
    expect(getTopicClassificationService('actuator')).toBe(actuatorTopicClassificationService);
    expect(handTopicClassificationService.domain).toBe('hand');
    expect(actuatorTopicClassificationService.domain).toBe('actuator');
    expect(new TopicClassificationService().domain).toBe('hand');
    expect(classifyUsageQuery('hand', 15)).toBe('[hand-topic] hand 15건');
    expect(classifyUsageQuery('actuator', 10)).toBe('[actuator-topic] actuator 10건');
    expect(handTopicClassificationService.getStatus()).toMatchObject({ running: false, total: 0 });
    expect(actuatorTopicClassificationService.getStatus()).toMatchObject({ running: false, total: 0 });
  });
});
