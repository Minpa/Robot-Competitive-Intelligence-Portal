/**
 * AC-23 — 데이터 커버리지 도입 후에도 ops status 의 반환 키와 파일은 그대로다.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

vi.mock('../../db/index.js', async () => {
  const schema = await import('../../db/schema.js');
  return { ...schema, db: {} };
});
vi.mock('../../services/scheduler.service.js', () => ({ schedulerService: { isTaskRunning: () => false } }));
vi.mock('../../services/data-migration.service.js', () => ({
  dataMigrationService: { listRecent: async () => [], has: async () => true, get: async () => null },
}));
vi.mock('../../db/apply-actuator-data-update.js', () => ({ computeActuatorDataKey: () => 'actuator-update:aaaaaaaaaaaa', resolveDefaultDataDir: () => '/d' }));

import { getOpsStatus } from '../../services/ops-status.service.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('ops status stays untouched', () => {
  it('getOpsStatus() returns exactly the pre-existing keys', async () => {
    const s = await getOpsStatus();
    expect(Object.keys(s)).toEqual(['generatedAt', 'config', 'dataMigrations', 'handBenchmarkMigrations', 'currentDataKey', 'pipeline', 'crawler', 'weeklyBrief', 'argosIExport', 'llmGuard']);
  });

  it('ops-status.service.ts and routes/admin.ts do not reference the coverage feature', () => {
    for (const f of ['../../services/ops-status.service.ts', '../../routes/admin.ts']) {
      expect(fs.readFileSync(path.resolve(here, f), 'utf8')).not.toMatch(/data-coverage|dataCoverage|DataCoverage/);
    }
  });
});
