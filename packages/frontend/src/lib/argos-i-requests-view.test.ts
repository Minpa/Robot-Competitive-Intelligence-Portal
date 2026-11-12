import { describe, expect, it } from 'vitest';
import type { ArgosIAdminRequestItem } from '@/types/argos-i-requests';
import { formatKst } from './argos-i-export-view';
import { budgetGauge, canDecide, formatUsd, lastRunText, rejectRows, rejectWarning, statusBadge, summarizeParams, STATUS_FILTERS } from './argos-i-requests-view';

const item = (over: Partial<ArgosIAdminRequestItem> = {}): ArgosIAdminRequestItem => ({
  id: '00000000-0000-4000-8000-000000000001', type: 'analyze', status: 'queued', params: { target: 'robot', slug: 'figure-02' }, errorCode: null,
  approval: { required: false, state: 'not_required' }, createdAt: '2026-11-12T03:00:00.000Z', startedAt: null, finishedAt: null, hasResult: false,
  note: null, approvalReason: null, approvedBy: null, approvedAt: null, attempts: 0, costUsd: 0, costProvider: null, ...over,
});

describe('argos-i-requests-view', () => {
  it('statusBadge gives a Korean label and tone per status, and falls back for unknown values', () => {
    expect(statusBadge('needs_approval')).toEqual({ label: '승인 대기', tone: 'warn' });
    expect(statusBadge('done')).toEqual({ label: '완료', tone: 'ok' });
    expect(statusBadge('failed')).toEqual({ label: '실패', tone: 'error' });
    expect(statusBadge('queued').tone).toBe('info');
    expect(statusBadge('cancelled').tone).toBe('none');
    expect(statusBadge('weird')).toEqual({ label: 'weird', tone: 'none' });
  });

  it('canDecide is true only for needs_approval', () => {
    for (const s of ['queued', 'running', 'done', 'failed', 'rejected', 'cancelled', 'unsupported'] as const) expect(canDecide(item({ status: s }))).toBe(false);
    expect(canDecide(item({ status: 'needs_approval' }))).toBe(true);
  });

  it('the filter list highlights needs_approval first', () => {
    expect(STATUS_FILTERS[0]).toEqual({ value: 'needs_approval', label: '승인 대기' });
    expect(STATUS_FILTERS.map((f) => f.value)).toContain('all');
  });

  it('summarizeParams shows kind/target/query and slug·id·url·period compactly', () => {
    expect(summarizeParams({ target: 'robot', slug: 'figure-02' })).toBe('robot · figure-02');
    expect(summarizeParams({ target: 'topic', domain: 'hand', days: 30 })).toBe('topic · hand · 30일');
    expect(summarizeParams({ kind: 'arxiv', id: '2401.01234' })).toBe('arxiv · 2401.01234');
    expect(summarizeParams({ query: 'company_recent', company: 'lg-electronics', weeks: 4 })).toBe('company_recent · lg-electronics · 4주');
    const url = `https://example.com/${'a'.repeat(100)}`;
    const text = summarizeParams({ kind: 'article_url', url });
    expect(text.startsWith('article_url · https://example.com/')).toBe(true);
    expect(text.length).toBeLessThan(90);
    expect(summarizeParams(null)).toBe('-');
    expect(summarizeParams({})).toBe('-');
  });

  it('budgetGauge: percent capped at 100 with ok/warn/error tones', () => {
    expect(budgetGauge({ costUsd: 0.5, budgetUsd: 2 })).toEqual({ pct: 25, tone: 'ok', text: '$0.500 / $2.00' });
    expect(budgetGauge({ costUsd: 1.7, budgetUsd: 2 })).toMatchObject({ pct: 85, tone: 'warn' });
    expect(budgetGauge({ costUsd: 5, budgetUsd: 2 })).toMatchObject({ pct: 100, tone: 'error' });
    expect(budgetGauge({ costUsd: 0, budgetUsd: 0 })).toMatchObject({ pct: 0, tone: 'ok' });
    expect(budgetGauge({ costUsd: 0.1, budgetUsd: 0 })).toMatchObject({ pct: 100, tone: 'error' });
  });

  it('formatUsd', () => {
    expect(formatUsd(0)).toBe('$0.000');
    expect(formatUsd(1.234)).toBe('$1.23');
    expect(formatUsd(null)).toBe('-');
  });

  it('rejectWarning appears only when there are rejections in the last 7 days; rejectRows labels the codes', () => {
    expect(rejectWarning({ rejects7d: [], rejectTotal7d: 0 })).toBeNull();
    expect(rejectWarning(null)).toBeNull();
    expect(rejectWarning({ rejects7d: [{ reasonCode: 'email_detected', count: 2 }], rejectTotal7d: 2 })).toContain('아웃바운드 가드 점검');
    expect(rejectWarning({ rejects7d: [{ reasonCode: 'x', count: 3 }], rejectTotal7d: 0 })).toContain('3건');
    expect(rejectRows({ rejects7d: [{ reasonCode: 'email_detected', count: 2 }, { reasonCode: 'new_code', count: 1 }] })).toEqual([
      { code: 'email_detected', label: '이메일', count: 2 },
      { code: 'new_code', label: 'new_code', count: 1 },
    ]);
  });

  it('lastRunText', () => {
    expect(lastRunText(null, formatKst)).toBe('기록 없음');
    expect(lastRunText({ finishedAt: '2026-11-11T15:30:00.000Z', outcome: 'ok', processed: 2 }, formatKst)).toBe('2026-11-12 00:30 (KST) · 2건 처리');
    expect(lastRunText({ finishedAt: '2026-11-11T15:30:00.000Z', outcome: 'ok', processed: 0 }, formatKst)).toBe('2026-11-12 00:30 (KST)');
  });
});
