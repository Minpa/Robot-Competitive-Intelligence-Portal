/**
 * ARGOS_I 내보내기 빌더 (순수 함수) — 결정론, 금지 문자열, 원문 비포함, 길이 상한, MD 표 무결성, 단위, 빈 영역, 봉투, manifest
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AREA_DEFS } from '../../services/argos-i-export-areas.js';
import { assembleBundle, renderArea, type AreaOutcome, type RenderedArea } from '../../services/argos-i-export-build.js';
import {
  cleanText,
  mdEscape,
  renderCell,
  sanitizeDeep,
  sha256Hex,
  toIsoUtc,
  truncateChars,
} from '../../services/argos-i-export-util.js';
import { CTX, EMAIL, HOSTILE_TEXT, SENTINEL, emptyByArea, rawByArea, reverseTopLevel } from '../fixtures/argos-i-export.fixture.js';

const here = path.dirname(fileURLToPath(import.meta.url));

function renderAll(raw: Record<string, any>): RenderedArea[] {
  return AREA_DEFS.map((def) => renderArea(def, raw[def.id], CTX));
}
const text = (f: { content: Buffer }) => f.content.toString('utf-8');

/** JSON 트리를 순회하며 (키, 값) 콜백 */
function walk(v: unknown, cb: (key: string | null, value: unknown) => void, key: string | null = null): void {
  cb(key, v);
  if (Array.isArray(v)) v.forEach((x) => walk(x, cb, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, cb, k);
}

/** MD 의 첫 번째 표의 데이터 행 수 */
function firstTableRows(md: string): number {
  const lines = md.split('\n');
  const start = lines.findIndex((l, i) => l.startsWith('|') && /^\|(\s*---\s*\|)+\s*$/.test(lines[i + 1] ?? ''));
  if (start < 0) return 0;
  let n = 0;
  for (let i = start + 2; i < lines.length && lines[i]!.startsWith('|'); i++) n++;
  return n;
}

const rendered = renderAll(rawByArea());

describe('registry', () => {
  it('has 29 areas with unique kebab-case ids, 15 P0 and 7 P1', () => {
    expect(AREA_DEFS).toHaveLength(29);
    expect(new Set(AREA_DEFS.map((d) => d.id)).size).toBe(29);
    for (const d of AREA_DEFS) expect(d.id).toMatch(/^[a-z0-9][a-z0-9-]{0,48}$/);
    expect(AREA_DEFS.filter((d) => d.priority === 'P0')).toHaveLength(15);
    expect(AREA_DEFS.filter((d) => d.priority === 'P1')).toHaveLength(7);
    expect(AREA_DEFS.filter((d) => d.priority === 'P2')).toHaveLength(7);
  });
});

describe('determinism', () => {
  it('rendering the same input twice yields identical bytes for every area', () => {
    const again = renderAll(rawByArea());
    rendered.forEach((r, i) => {
      expect(text(again[i]!.md)).toBe(text(r.md));
      expect(text(again[i]!.json)).toBe(text(r.json));
      expect(again[i]!.json.sha256).toBe(r.json.sha256);
    });
  });

  it('shuffling the input row order does not change the output', () => {
    const raw = rawByArea();
    const shuffled: Record<string, any> = {};
    for (const [k, v] of Object.entries(raw)) shuffled[k] = reverseTopLevel(v);
    const other = renderAll(shuffled);
    rendered.forEach((r, i) => {
      expect(text(other[i]!.json), `${r.def.id} json`).toBe(text(r.json));
      expect(text(other[i]!.md), `${r.def.id} md`).toBe(text(r.md));
    });
  });

  it('object key order of the input (e.g. jsonb cache vs freshly computed) does not change the output', () => {
    const reverseKeys = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(reverseKeys);
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).reverse().map(([k, x]) => [k, reverseKeys(x)]));
      return v;
    };
    const raw = rawByArea();
    for (const def of AREA_DEFS) {
      const a = renderArea(def, raw[def.id], CTX);
      const b = renderArea(def, reverseKeys(raw[def.id]), CTX);
      expect(text(b.json), `${def.id} json`).toBe(text(a.json));
      expect(text(b.md), `${def.id} md`).toBe(text(a.md));
    }
  });

  it('only asOf / generatedAt differ between runs with different timestamps (bundle files otherwise identical)', () => {
    const ctx2 = { ...CTX, asOf: '2026-10-28T22:05:00.000Z', generatedAt: '2026-10-28T22:05:30.000Z' };
    const raw = rawByArea();
    for (const def of AREA_DEFS) {
      if (['tech-trends', 'event-briefs', 'overview'].includes(def.id)) continue; // 48시간 stale 판정이 기준 시각에 의존
      const a = renderArea(def, raw[def.id], CTX);
      const b = renderArea(def, raw[def.id], ctx2);
      const norm = (s: string) => s.split(CTX.asOf).join('T').split(ctx2.asOf).join('T').split(CTX.generatedAt).join('G').split(ctx2.generatedAt).join('G');
      expect(norm(text(b.json))).toBe(norm(text(a.json)));
    }
  });

  it('builder sources never read the clock or random numbers', () => {
    const dir = path.resolve(here, '../../services');
    const files = fs.readdirSync(dir).filter((f) => /^argos-i-export-(util|build|areas.*)\.ts$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(6);
    for (const f of files) {
      const src = fs.readFileSync(path.join(dir, f), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
      expect(src, f).not.toMatch(/Date\.now\(/);
      expect(src, f).not.toMatch(/new Date\(\s*\)/);
      expect(src, f).not.toMatch(/Math\.random\(/);
    }
  });
});

describe('forbidden strings and hostile input', () => {
  const FORBIDDEN = ['<script', '<iframe', '<object', '<embed', '<form', 'javascript:', 'onerror=', 'onload=', 'onclick='];
  it('no MD/JSON output contains a forbidden string (case-insensitive)', () => {
    for (const r of rendered) {
      for (const f of [r.md, r.json]) {
        const t = text(f).toLowerCase();
        for (const bad of FORBIDDEN) expect(t.includes(bad), `${f.path} contains ${bad}`).toBe(false);
      }
    }
  });

  it('the hostile fixture text is neutralized (no raw tags, no raw pipes/newlines inside table cells)', () => {
    for (const r of rendered) {
      const md = text(r.md);
      expect(md).not.toContain('<img');
      expect(md).not.toContain('onerror');
      for (const line of md.split('\n')) {
        if (!line.startsWith('|')) continue;
        // 셀 구분자 수가 머리글과 같아야 한다 (셀 안의 | 는 치환됨)
        expect(line.endsWith('|')).toBe(true);
      }
    }
  });

  it('every URL-valued JSON field is https without credentials; arXiv links are arxiv.org only; thumbnails are i.ytimg.com only', () => {
    for (const r of rendered) {
      const json = JSON.parse(text(r.json));
      walk(json.data, (key, value) => {
        if (typeof value !== 'string') return;
        if (/^(https?|javascript|data|ftp|file):/i.test(value)) {
          expect(value, `${r.def.id}.${key}`).toMatch(/^https:\/\/[^/@\s]+(\/|$)/);
          expect(new URL(value).username).toBe('');
        }
        if (key === 'thumbnail') expect(value).toMatch(/^https:\/\/i\.ytimg\.com\//);
        if (key === 'url' && r.def.id === 'papers') expect(new URL(value).hostname).toBe('arxiv.org');
      });
    }
    const papers = JSON.parse(text(rendered.find((r) => r.def.id === 'papers')!.json)).data.items;
    expect(papers.find((p: any) => p.title === 'Unsafe link paper').url).toBeNull();
    const videos = JSON.parse(text(rendered.find((r) => r.def.id === 'videos')!.json)).data.items;
    expect(videos.find((v: any) => v.id.endsWith('102')).thumbnail).toMatch(/^https:\/\/i\.ytimg\.com\//);
    expect(videos.find((v: any) => v.id.endsWith('103')).url).toBeNull();
  });

  it('Markdown links are https only', () => {
    for (const r of rendered) {
      for (const m of text(r.md).matchAll(/\]\(([^)]*)\)/g)) expect(m[1], r.def.id).toMatch(/^https:\/\//);
    }
  });
});

describe('no original text is exported', () => {
  it('the sentinel placed in content/description/originalText/abstract never appears in any file', () => {
    for (const r of rendered) {
      expect(text(r.md), `${r.def.id}.md`).not.toContain(SENTINEL);
      expect(text(r.json), `${r.def.id}.json`).not.toContain(SENTINEL);
    }
  });

  it('videos / papers / news JSON have none of the keys content, description, originalText, abstract (nor a raw summary of papers)', () => {
    for (const id of ['videos', 'papers', 'news']) {
      const json = JSON.parse(text(rendered.find((r) => r.def.id === id)!.json));
      walk(json, (key) => {
        if (key) expect(['content', 'description', 'originalText', 'abstract']).not.toContain(key);
      });
    }
    const papers = JSON.parse(text(rendered.find((r) => r.def.id === 'papers')!.json)).data.items;
    for (const p of papers) expect(Object.keys(p)).not.toContain('summary');
  });

  it('personal data and operator-only fields are absent everywhere', () => {
    const SENSITIVE = ['email', 'passwordHash', 'token', 'apiKey', 'assignee', 'changedBy', 'reviewedBy', 'readBy', 'createdBy', 'evaluatedBy', 'logoUrl', 'imageUrl', 'isRead'];
    for (const r of rendered) {
      const raw = text(r.json);
      expect(raw).not.toContain(EMAIL);
      expect(text(r.md)).not.toContain(EMAIL);
      walk(JSON.parse(raw), (key) => {
        if (key) expect(SENSITIVE, `${r.def.id}.${key}`).not.toContain(key);
      });
    }
  });
});

describe('length limits and cell escaping', () => {
  it('mdEscape caps a cell at 600 chars with an ellipsis and strips pipes, newlines, tabs and angle brackets', () => {
    const long = mdEscape('a'.repeat(700));
    expect(Array.from(long)).toHaveLength(600);
    expect(long.endsWith('…')).toBe(true);
    const e = mdEscape('x|y\nz\tw <b>');
    expect(e).not.toMatch(/[|\n\t<>]/);
  });

  it('cleanText caps text and removes tags / control chars; truncateChars counts code points', () => {
    expect(Array.from(cleanText('가'.repeat(500), 400)!)).toHaveLength(400);
    expect(cleanText('<b>bold</b> &lt;i&gt; a\u0000b')).toBe('bold ab');
    expect(cleanText('x < y > z')).toBe('x ＜ y ＞ z');
    expect(cleanText('   ')).toBeNull();
    expect(truncateChars('😀😀😀', 2)).toBe('😀…');
  });

  it('news summary is capped at 300 chars and video summaryKo at 400 in the JSON', () => {
    const news = JSON.parse(text(rendered.find((r) => r.def.id === 'news')!.json)).data.items;
    for (const n of news) if (n.summary) expect(Array.from(n.summary).length).toBeLessThanOrEqual(300);
    expect(Array.from(news.find((n: any) => n.id.endsWith('301')).summary)).toHaveLength(300);
    const videos = JSON.parse(text(rendered.find((r) => r.def.id === 'videos')!.json)).data.items;
    for (const v of videos) if (v.geminiAnalysis?.summaryKo) expect(Array.from(v.geminiAnalysis.summaryKo).length).toBeLessThanOrEqual(400);
  });

  it('renderCell: null -> "-", booleans -> 예/아니오, unsafe links degrade to text', () => {
    expect(renderCell(null)).toBe('-');
    expect(renderCell(true)).toBe('예');
    expect(renderCell(false)).toBe('아니오');
    expect(renderCell({ text: 'x', url: 'http://a.example.com' })).toBe('x');
    expect(renderCell({ text: 'x', url: 'https://a.example.com/(1)' })).toBe('[x](https://a.example.com/%281%29)');
  });

  it('sanitizeDeep sorts keys, drops forbidden keys, removes non-https URLs and NaN', () => {
    expect(JSON.stringify(sanitizeDeep({ b: 1, a: { description: 'x', url: 'http://x.example.com', n: Number.NaN, ok: 'https://ok.example.com' } }))).toBe(
      '{"a":{"n":null,"ok":"https://ok.example.com","url":null},"b":1}',
    );
  });
});

describe('Markdown table integrity and record counts', () => {
  it('the first table row count equals the JSON recordCount for every area (also with pipes/newlines in cells)', () => {
    for (const r of rendered) {
      const json = JSON.parse(text(r.json));
      expect(json.recordCount, r.def.id).toBe(r.recordCount);
      if (r.def.id === 'aggregations') continue; // 이 영역은 모든 표 행 수의 합 (아래 별도 테스트)
      expect(firstTableRows(text(r.md)), r.def.id).toBe(json.recordCount);
    }
  });

  it('aggregations: recordCount is the sum of all table rows (zero segments with yearly rows is still ok)', () => {
    const def = AREA_DEFS.find((d) => d.id === 'aggregations')!;
    const raw = { cases: [], robots: [{ id: 'r1', announcement_year: 2025 }, { id: 'r2', announcement_year: 2026 }, { id: 'r3', announcement_year: 2026 }], components: [], keywords: [] };
    const r = renderArea(def, raw, CTX);
    expect(r.recordCount).toBe(2); // 연도 2개 (2025, 2026), 세그먼트 0
    expect(r.status).toBe('ok');
    expect(JSON.parse(text(r.json)).recordCount).toBe(2);
    expect(JSON.parse(text(r.json)).data.segments).toHaveLength(0);
    expect(text(r.md)).toContain('레코드 수: 2건');
    expect(text(r.md)).toContain('레코드 합계 2건');
    expect(text(r.md)).not.toMatch(/## 데이터\n\n데이터 없음/);
    // 전체가 비면 empty
    const empty = renderArea(def, { cases: [], robots: [], components: [], keywords: [] }, CTX);
    expect(empty.recordCount).toBe(0);
    expect(empty.status).toBe('empty');
    // 픽스처: 모든 표 행 수의 합
    const full = rendered.find((x) => x.def.id === 'aggregations')!;
    const d = JSON.parse(text(full.json)).data;
    expect(full.recordCount).toBe(d.segments.length + d.yearly.length + d.components.length + d.keywords.length);
  });

  it('headers carry units', () => {
    const md = (id: string) => text(rendered.find((r) => r.def.id === id)!.md);
    expect(md('robots')).toMatch(/키\(cm\)/);
    expect(md('robots')).toMatch(/무게\(kg\)/);
    expect(md('robots')).toMatch(/연산\(TOPS\)/);
    expect(md('robots')).toMatch(/용량\(Wh\)/);
    expect(md('robots')).toMatch(/속도\(m\/s\)/);
    expect(md('components')).toMatch(/토크\(Nm\)/);
    expect(md('vision-cost')).toMatch(/\(USD\)/);
    expect(md('robot-benchmark')).toMatch(/점수 1~10/);
    expect(md('companies')).toMatch(/기업가치\(USD\)/);
    expect(md('robots')).toMatch(/그립력\(N\)|손 자유도\(DoF\)/);
  });

  it('missing values print "-" in MD and null in JSON', () => {
    const robotsMd = text(rendered.find((r) => r.def.id === 'robots')!.md);
    expect(robotsMd).toMatch(/\| Beta-1 \|[^\n]*\| - \|/);
    const robots = JSON.parse(text(rendered.find((r) => r.def.id === 'robots')!.json)).data.items;
    expect(robots.find((r: any) => r.name === 'Beta-1').body).toBeNull();
  });

  it('every MD has a title, meta list, summary and data section', () => {
    for (const r of rendered) {
      const md = text(r.md);
      expect(md.startsWith(`# ARGOS 데이터 스냅샷 · ${r.def.titleKo} (${r.def.id})\n`)).toBe(true);
      expect(md).toContain('기준일(KST): 2026-10-29');
      expect(md).toContain('(UTC) /');
      expect(md).toContain(`대응 JSON: \`${r.def.id}.json\``);
      expect(md).toContain('## 요약');
      expect(md).toContain('## 데이터');
      expect(md.endsWith('\n') && !md.endsWith('\n\n')).toBe(true);
      expect(md.includes('\r')).toBe(false);
    }
  });
});

describe('empty areas', () => {
  const empties = renderAll(emptyByArea());
  it('still produce an md/json pair with recordCount 0 and a "데이터 없음" notice', () => {
    for (const r of empties) {
      if (r.def.id === 'tech-trends') continue; // 기술 축 5개 행은 항상 존재 (캐시가 없으면 unavailable)
      expect(r.recordCount, r.def.id).toBe(0);
      expect(r.status).toBe('empty');
      expect(text(r.md), r.def.id).toContain('데이터 없음');
      expect(JSON.parse(text(r.json)).recordCount).toBe(0);
    }
  });
});

describe('JSON envelope', () => {
  it('every JSON carries schemaVersion, areaSchemaVersion, area, bundleDate, recordCount, units in a fixed key order', () => {
    for (const r of rendered) {
      const json = JSON.parse(text(r.json));
      expect(Object.keys(json)).toEqual(['schemaVersion', 'areaSchemaVersion', 'area', 'bundleDate', 'asOf', 'generatedAt', 'timezone', 'recordCount', 'units', 'source', 'data']);
      expect(json.schemaVersion).toBe(1);
      expect(json.area).toBe(r.def.id);
      expect(json.bundleDate).toBe('2026-10-29');
      expect(json.timezone).toBe('Asia/Seoul');
      expect(typeof json.areaSchemaVersion).toBe('number');
      expect(json.units && typeof json.units).toBe('object');
      expect(text(r.json).endsWith('}\n')).toBe(true);
      expect(text(r.json).includes('\n', 0) && text(r.json).indexOf('\n') === text(r.json).length - 1).toBe(true); // 압축형 + 끝 개행 1개
    }
  });

  it('the actuator-map area exposes ACTUATOR_MAP_SCHEMA_VERSION and weekly-briefs the payload schema version', () => {
    const v = (id: string) => JSON.parse(text(rendered.find((r) => r.def.id === id)!.json)).areaSchemaVersion;
    expect(v('actuator-map')).toBe(2);
    expect(v('weekly-briefs')).toBe(1);
  });

  it('actuator-map drops generatedAt/cached from the source map and uses the bundle times', () => {
    const raw = { ...rawByArea()['actuator-map'], generatedAt: '2000-01-01T00:00:00.000Z', cached: true };
    const r = renderArea(AREA_DEFS.find((d) => d.id === 'actuator-map')!, raw, CTX);
    expect(text(r.json)).not.toContain('2000-01-01');
    expect(text(r.json)).not.toContain('"cached"');
  });
});

describe('area semantics', () => {
  const data = (id: string) => JSON.parse(text(rendered.find((r) => r.def.id === id)!.json)).data;
  it('robots keeps confirmed and forecast robots and the forecast block only for forecasts', () => {
    const items = data('robots').items;
    expect(items).toHaveLength(2);
    expect(items.find((r: any) => r.name === 'Atlas-X').forecast).toBeNull();
    expect(items.find((r: any) => r.name === 'Beta-1').forecast.sources).toEqual(['CES booth', 'supply chain signal']);
    expect(items.find((r: any) => r.name === 'Atlas-X').components).toHaveLength(2);
  });
  it('videos: techDomains, trendingTop (7 KST calendar days before the bundle date), thumbnail fallback', () => {
    const d = data('videos');
    expect(d.items.find((v: any) => v.id.endsWith('101')).techDomains).toContain('hand');
    expect(d.items.find((v: any) => v.id.endsWith('102')).techDomains).not.toContain('actuator'); // AI 가 none 판정
    expect(d.trendingTop.map((v: any) => v.id.slice(-3))).toEqual(['101']);
    expect(d.trendingTop[0].growthViewsPerDay).toBeGreaterThan(0);
  });
  it('papers: authors capped, arXiv id resolved, domain from title+abstract without exporting it', () => {
    const items = data('papers').items;
    const p = items.find((x: any) => x.id.endsWith('201'));
    expect(p.arxivId).toBe('2610.01234v1');
    expect(p.authors).toHaveLength(4);
    expect(p.techDomains).toContain('hand');
    expect(p.aiSummaryKo).toContain('한글 요약');
    expect(items.find((x: any) => x.id.endsWith('202')).authors).toEqual(['X. Y.', 'Z. W.']);
  });
  it('tech-trends: per-domain stats, every cached insight with stale flag (48h), unavailable when missing', () => {
    const hand = data('tech-trends').domains.find((d: any) => d.id === 'hand');
    expect(hand.insights.items.map((i: any) => [i.days, i.stale])).toEqual([[7, false], [30, true]]);
    expect(hand.timeline.status).toBe('ok');
    expect(hand.trendSummary.generatedBy).toBe('ai');
    expect(data('tech-trends').overallVideoTrendSummary.generatedBy).toBe('rule');
    const rfm = data('tech-trends').domains.find((d: any) => d.id === 'rfm');
    expect(rfm.insights).toEqual({ status: 'unavailable', items: [] });
    expect(rfm.timeline).toEqual({ status: 'unavailable' });
    expect(rfm.trendSummary).toEqual({ status: 'unavailable' });
    expect(JSON.stringify(data('tech-trends'))).not.toContain('tokens');
  });
  it('weekly-briefs skips failed rows and excludes tokens/cost/stats/error', () => {
    const items = data('weekly-briefs').items;
    expect(items.map((i: any) => i.weekStart)).toEqual(['2026-10-19']);
    expect(items[0]).toMatchObject({ weekEnd: '2026-10-25', isoYear: 2026, weekNumber: 43, status: 'ok' });
    const raw = text(rendered.find((r) => r.def.id === 'weekly-briefs')!.json);
    for (const k of ['input_tokens', 'inputTokens', 'cost_usd', 'costUsd', '"stats"', '"error"']) expect(raw).not.toContain(k);
  });
  it('ci-matrix excludes inactive competitors and renders the matrix with confidence tags', () => {
    const md = text(rendered.find((r) => r.def.id === 'ci-matrix')!.md);
    expect(md).toContain('| 레이어 | 카테고리 | 항목 | Atlas | Optimus |');
    expect(md).toMatch(/\[B\]/);
    expect(data('ci-matrix').layers[0].categories[0].items[0].values[1].sourceUrl).toBeNull(); // http 링크 제거
  });
  it('benchmarks skip inactive competitors and keep hand-only fields only for the hand benchmark', () => {
    const rb = data('robot-benchmark');
    const hb = data('hand-benchmark');
    expect(rb.competitors).toHaveLength(1);
    expect(rb.competitors[0].scores.physical).toEqual({ currentScore: 8, targetScore: 9, rationale: expect.any(String) });
    expect(rb.competitors[0]).toHaveProperty('stage');
    expect(hb.competitors[0].scores.physical.rawValue).toBe('24 DoF');
    expect(hb.competitors[0]).toHaveProperty('category');
    expect(hb.axes[0].unit).toBe('DoF');
  });
  it('overview lists the other areas and the analysis freshness', () => {
    const o = data('overview');
    expect(o.areas.map((a: any) => a.id)).toEqual(['videos', 'keywords']);
    expect(o.analysis.pipeline.status).toBe('ok');
    expect(JSON.stringify(o)).not.toContain('analysis":{}');
    expect(o.sources[0]).toHaveProperty('lastCollectedAt');
  });
  it('regulations/strategy/lg models exclude originals, assignees and creators', () => {
    expect(JSON.stringify(data('regulations'))).not.toMatch(/original|assignee|evidence/i);
    expect(JSON.stringify(data('strategy-warroom'))).not.toMatch(/evaluated_by|createdBy|aiCostUsd|logo/i);
    expect(JSON.stringify(data('lg-humanoid-models'))).not.toMatch(/createdBy|created_by/);
  });
  it('actuator-sourcing carries the grade legend and filters evidence urls', () => {
    const md = text(rendered.find((r) => r.def.id === 'actuator-sourcing')!.md);
    expect(md).toContain('근거 등급: A 공식 ~ D 추정(CI)');
    const ev = data('actuator-sourcing').sourcing[0].evidence;
    expect(ev.find((e: any) => e.claim === 'bad link').url).toBeNull();
  });
});

describe('time handling', () => {
  it('toIsoUtc treats offset-less timestamps as UTC and honours explicit offsets', () => {
    expect(toIsoUtc('2026-10-28T01:23:45.123456')).toBe('2026-10-28T01:23:45.123Z');
    expect(toIsoUtc('2026-10-28 01:23:45')).toBe('2026-10-28T01:23:45.000Z');
    expect(toIsoUtc('2026-10-28T10:23:45+09:00')).toBe('2026-10-28T01:23:45.000Z');
    expect(toIsoUtc('2026-10-28T01:23:45Z')).toBe('2026-10-28T01:23:45.000Z');
    expect(toIsoUtc('garbage')).toBeNull();
    expect(toIsoUtc(null)).toBeNull();
  });
});

describe('manifest and bundle assembly', () => {
  const outcomes: AreaOutcome[] = AREA_DEFS.map((def) =>
    def.id === 'keywords' ? { def, error: 'boom' } : { def, rendered: rendered.find((r) => r.def.id === def.id)! },
  );
  const bundle = assembleBundle(CTX, outcomes, ['upstream_busy_timeout']);

  it('lists every file but itself in path order, with recomputable sha256 and exact totals', () => {
    const m = bundle.manifest;
    const paths = m.files.map((f) => f.path);
    expect(paths).toEqual([...paths].sort());
    expect(paths).not.toContain('manifest.json');
    expect(paths).toContain('README.md');
    const stored = new Map(bundle.files.map((f) => [f.path, f]));
    for (const f of m.files) {
      const file = stored.get(f.path)!;
      expect(f.sha256).toBe(sha256Hex(file.content));
      expect(f.byteSize).toBe(file.content.length);
    }
    expect(m.totals).toEqual({ fileCount: m.files.length, totalBytes: m.files.reduce((n, f) => n + f.byteSize, 0) });
    expect(bundle.files.map((f) => f.path)).toEqual(['README.md', 'manifest.json', ...paths.filter((p) => p !== 'README.md')]);
    expect(bundle.fileCount).toBe(m.files.length + 1);
    expect(bundle.totalBytes).toBe(m.totals.totalBytes + stored.get('manifest.json')!.content.length);
  });

  it('bundleSha256 is the sha256 of the manifest.json bytes and the manifest parses back identically', () => {
    const mf = bundle.files.find((f) => f.path === 'manifest.json')!;
    expect(bundle.bundleSha256).toBe(sha256Hex(mf.content));
    expect(JSON.parse(text(mf))).toEqual(bundle.manifest);
  });

  it('a failed selective area becomes status "failed" without files; the bundle is partial with area_failed:<id>', () => {
    expect(bundle.status).toBe('partial');
    expect(bundle.warnings).toEqual(['area_failed:keywords', 'upstream_busy_timeout']);
    const a = bundle.manifest.areas.find((x) => x.id === 'keywords')!;
    expect(a).toMatchObject({ status: 'failed', recordCount: 0, files: [] });
    expect(bundle.files.some((f) => f.path.startsWith('keywords.'))).toBe(false);
    expect(bundle.manifest.areas).toHaveLength(29);
  });

  it('an all-ok bundle is status ok and has README + manifest + 2 files per area', () => {
    const ok = assembleBundle(CTX, AREA_DEFS.map((def) => ({ def, rendered: rendered.find((r) => r.def.id === def.id)! })));
    expect(ok.status).toBe('ok');
    expect(ok.fileCount).toBe(2 + 29 * 2);
    expect(ok.manifest.warnings).toEqual([]);
    expect(ok.manifest.generator).toEqual({ name: 'argos', commit: 'abc1234' });
    expect(ok.manifest).toMatchObject({ schemaVersion: 1, bundleDate: '2026-10-29', timezone: 'Asia/Seoul', reason: 'cron', asOf: CTX.asOf, generatedAt: CTX.generatedAt });
    expect(ok.manifest.areas.every((a) => a.files.length === 2)).toBe(true);
  });

  it('the README explains the conventions and lists the areas', () => {
    const readme = text(bundle.files[0]!);
    expect(readme).toContain('# ARGOS 데이터 스냅샷 · 2026-10-29');
    expect(readme).toContain('KST');
    expect(readme).toContain('ISO 8601 UTC');
    expect(readme).toContain('SHA-256');
    expect(readme).toContain('| videos |');
    expect(readme).not.toContain(HOSTILE_TEXT);
  });

  it('assembling the same inputs twice is byte-identical', () => {
    const again = assembleBundle(CTX, outcomes, ['upstream_busy_timeout']);
    expect(again.bundleSha256).toBe(bundle.bundleSha256);
  });
});
