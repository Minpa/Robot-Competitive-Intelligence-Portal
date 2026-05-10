// CLOiD 커버리지 sub-cell 현장 확인 / PoC / 배포 이벤트 시드.
//
// `seed-data/coverage-field-events-*.json` 들을 순서대로 읽어 coverage_field_events 에 insert.
// 같은 (subcellKey, eventDate, kind, source) 가 이미 있으면 skip — idempotent.
//
// 새 방문/PoC 이벤트는 새 JSON 파일을 추가하고 다시 실행하면 됨.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, coverageFieldEvents } from './index.js';
import { and, eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SeedEvent {
  subcellKey: string;
  cellId: string;
  lv: number;
  eventDate: string;
  kind: 'visit' | 'poc-planned' | 'poc-active' | 'poc-milestone' | 'deployed' | 'note';
  status: 'observed' | 'poc-planned' | 'poc-active' | 'deployed';
  site?: string;
  source?: string;
  note?: string;
  nextStep?: string;
  priorityRank?: number | null;
  createdBy?: string;
}

interface SeedFile {
  visit?: { date: string; site?: string; source?: string; description?: string };
  events: SeedEvent[];
}

async function seedFieldEvents() {
  const seedDir = path.join(__dirname, 'seed-data');
  if (!fs.existsSync(seedDir)) {
    console.log(`[field-events] no seed-data dir at ${seedDir} — nothing to seed`);
    return;
  }

  const files = fs
    .readdirSync(seedDir)
    .filter((f) => /^coverage-field-events-.*\.json$/.test(f))
    .sort();

  if (files.length === 0) {
    console.log('[field-events] no coverage-field-events JSON files found');
    return;
  }

  let inserted = 0;
  let skipped = 0;

  for (const file of files) {
    const fullPath = path.join(seedDir, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as SeedFile;
    console.log(`[field-events] processing ${file} — ${data.events.length} events`);
    if (data.visit) {
      console.log(`  visit: ${data.visit.date} @ ${data.visit.site ?? '-'}`);
    }

    for (const ev of data.events) {
      // Idempotency: skip if same (subcellKey, eventDate, kind, source) already exists.
      const existing = await db
        .select({ id: coverageFieldEvents.id })
        .from(coverageFieldEvents)
        .where(
          and(
            eq(coverageFieldEvents.subcellKey, ev.subcellKey),
            eq(coverageFieldEvents.eventDate, ev.eventDate),
            eq(coverageFieldEvents.kind, ev.kind),
            eq(coverageFieldEvents.source, ev.source ?? '')
          )
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await db.insert(coverageFieldEvents).values({
        subcellKey: ev.subcellKey,
        cellId: ev.cellId,
        lv: ev.lv,
        eventDate: ev.eventDate,
        kind: ev.kind,
        status: ev.status,
        site: ev.site ?? null,
        source: ev.source ?? null,
        note: ev.note ?? null,
        nextStep: ev.nextStep ?? null,
        priorityRank: ev.priorityRank ?? null,
        createdBy: ev.createdBy ?? null,
      });
      inserted++;
    }
  }

  console.log(`[field-events] done — inserted ${inserted}, skipped ${skipped}`);
}

seedFieldEvents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[field-events] seed failed:', err);
    process.exit(1);
  });
