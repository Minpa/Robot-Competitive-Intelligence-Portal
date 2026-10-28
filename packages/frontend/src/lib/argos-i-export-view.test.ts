import { describe, expect, it } from 'vitest';
import type { ArgosIExportLastRun } from '@/types/argos-i-export';
import { formatBytes, formatDurationMs, formatKst, summarizeLastRun } from './argos-i-export-view';

const run = (over: Partial<ArgosIExportLastRun> = {}): ArgosIExportLastRun => ({
  date: '2026-10-29', reason: 'cron', outcome: 'created', status: 'ok', startedAt: '2026-10-28T22:00:00.000Z', finishedAt: '2026-10-28T22:00:20.000Z',
  durationMs: 20_000, fileCount: 60, totalBytes: 9_235_699, warnings: [], error: null, ...over,
});

describe('argos-i-export-view', () => {
  it('formatKst converts UTC to KST regardless of the process time zone', () => {
    expect(formatKst('2026-10-28T22:00:00.000Z')).toBe('2026-10-29 07:00');
    expect(formatKst('2026-10-28T15:30:00Z')).toBe('2026-10-29 00:30');
    expect(formatKst(null)).toBe('-');
    expect(formatKst('garbage')).toBe('-');
  });

  it('formatBytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(9_235_699)).toBe('8.8 MB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5.0 GB');
    expect(formatBytes(null)).toBe('-');
    expect(formatBytes(-1)).toBe('-');
  });

  it('formatDurationMs', () => {
    expect(formatDurationMs(450)).toBe('450ms');
    expect(formatDurationMs(12_340)).toBe('12.3초');
    expect(formatDurationMs(125_000)).toBe('2분 5초');
    expect(formatDurationMs(undefined)).toBe('-');
  });

  it('summarizeLastRun maps outcomes to tones', () => {
    expect(summarizeLastRun(null)).toEqual({ tone: 'none', text: '실행 기록이 없습니다' });
    expect(summarizeLastRun(run())).toMatchObject({ tone: 'ok' });
    expect(summarizeLastRun(run({ status: 'partial', warnings: ['area_failed:keywords'] }))).toMatchObject({ tone: 'warn' });
    expect(summarizeLastRun(run({ warnings: ['upstream_busy_timeout'] }))).toMatchObject({ tone: 'warn' });
    const failed = summarizeLastRun(run({ outcome: 'failed', status: null, error: 'bundle_too_large' }));
    expect(failed.tone).toBe('error');
    expect(failed.text).toContain('bundle_too_large');
    expect(summarizeLastRun(run({ outcome: 'skipped_locked', status: null })).tone).toBe('warn');
  });
});
