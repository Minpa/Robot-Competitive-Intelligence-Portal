/**
 * ARGOS_I weekly-briefs 영역 v3 — areaSchemaVersion 3, 핵심 메시지 표가 conclusions 를 읽음, 문자열 ≤400자, 금지 키 없음, 초안·편집자·이력 미포함
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ db: {} }));

import { AREA_DEFS } from '../../services/argos-i-export-areas.js';
import { renderArea } from '../../services/argos-i-export-build.js';
import { EXCLUDED_TABLES } from '../../services/argos-i-full-db-config.js';
import { buildExecPlan, finalizeExec } from '../../services/weekly-brief-compose-exec.js';
import { CTX } from '../fixtures/argos-i-export.fixture.js';
import { fakeExecAi, makeExecCollectedFull, REPORT_NOW } from '../fixtures/weekly-exec-collected.fixture.js';
import { applyEdits } from '../../services/weekly-brief-edit.js';

const plan = buildExecPlan(makeExecCollectedFull());
const payload = applyEdits(finalizeExec(plan, fakeExecAi(plan), REPORT_NOW).payload, {});
const def = AREA_DEFS.find((d) => d.id === 'weekly-briefs')!;

const raw = {
  rows: [
    { week_start: '2026-10-19', generated_at: '2026-10-25T20:00:00.000Z', status: 'ok', model: null, payload },
    { week_start: '2026-10-12', generated_at: '2026-10-18T20:00:00.000Z', status: 'ok', model: null, payload: { schemaVersion: 2, header: { counts: {} }, highlights: [{ headline: 'v2 헤드라인', generatedBy: 'ai' }] } },
  ],
};
const out = renderArea(def, raw, CTX);
const json = JSON.parse(out.json.content.toString('utf-8'));
const md = out.md.content.toString('utf-8');

function walk(v: unknown, cb: (key: string | null, value: unknown) => void, key: string | null = null): void {
  cb(key, v);
  if (Array.isArray(v)) v.forEach((x) => walk(x, cb, key));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, cb, k);
}

describe('weekly-briefs ARGOS_I area (v3)', () => {
  it('declares areaSchemaVersion 3 and reads weekly_briefs only (drafts are not a source)', () => {
    expect(json.areaSchemaVersion).toBe(3);
    expect(def.sourceTables).toEqual(['weekly_briefs']);
  });

  it('the key-message table reads v3 conclusions headline and generatedBy (keyMessages ?? highlights ?? conclusions)', () => {
    for (const c of payload.conclusions) expect(md).toContain(c.headline);
    expect(md).toContain('v2 헤드라인');
    expect(md).toMatch(/핵심 메시지/);
  });

  it('every string is <= 400 chars, there are no forbidden keys, and no empty strings survive', () => {
    const items = json.data.items as { payload: Record<string, unknown> }[];
    const v3 = items.find((i) => (i.payload as { schemaVersion?: number }).schemaVersion === 3)!;
    walk(v3.payload, (key, value) => {
      if (key && ['content', 'description', 'abstract', 'originalText'].includes(key)) throw new Error(`forbidden key ${key}`);
      if (typeof value === 'string') {
        expect(Array.from(value).length).toBeLessThanOrEqual(400);
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });

  it('keeps the v3 narrative intact through sanitizing (nothing is trimmed or dropped from conclusions)', () => {
    const items = json.data.items as { payload: any }[];
    const v3 = items.find((i) => i.payload.schemaVersion === 3)!;
    expect(v3.payload.conclusions).toHaveLength(payload.conclusions.length);
    expect(v3.payload.conclusions[0].lines.map((l: any) => l.text)).toEqual(payload.conclusions[0]!.lines.map((l) => l.text));
    expect(v3.payload.questions.map((q: any) => q.text)).toEqual(payload.questions.map((q) => q.text));
    expect(v3.payload.gaps.rows.length).toBe(payload.gaps.rows.length);
  });

  it('contains no editor, history, draft or publish bookkeeping', () => {
    const text = out.json.content.toString('utf-8') + md;
    for (const k of ['editedBy', 'edited_by', 'editRev', 'edit_rev', 'publishedBy', 'published_by', 'ai_payload', 'weekly_brief_drafts', 'publishState']) expect(text).not.toContain(k);
  });
});

describe('full DB dump', () => {
  it('excludes weekly_brief_drafts (unpublished drafts and editor identity)', () => {
    const t = EXCLUDED_TABLES.find((x) => x.name === 'weekly_brief_drafts');
    expect(t).toBeTruthy();
    expect(t!.reason).toMatch(/draft/);
  });
});
