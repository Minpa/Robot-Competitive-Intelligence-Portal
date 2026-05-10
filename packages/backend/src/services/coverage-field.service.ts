/**
 * CLOiD 커버리지 sub-cell 현장 확인 / PoC / 배포 진행 이벤트 부트스트랩 서비스.
 *
 * 백엔드 부팅 시 (`index.ts` start()) 자동 호출 — 매 Railway 배포마다:
 *  1. coverage_field_events 테이블 자동 생성 (CREATE TABLE IF NOT EXISTS)
 *  2. seed-data/coverage-field-events-*.json 의 이벤트 일괄 import (idempotent)
 *
 * 새 방문/PoC 추가는 새 JSON 파일을 commit + push 하면 다음 배포 부팅 시 자동 반영.
 * Railway 대시보드에서 별도 명령 실행 불필요.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, coverageFieldEvents } from '../db/index.js';
import { sql, and, eq } from 'drizzle-orm';

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

class CoverageFieldService {
  /**
   * 테이블 + 인덱스 + 트리거 자동 생성. 존재하면 skip.
   * (drizzle migration 0021 과 동일한 DDL — DB 가 fresh 든 마이그레이트 됐든 무관)
   */
  async ensureTables(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS coverage_field_events (
          id SERIAL PRIMARY KEY,
          subcell_key VARCHAR(120) NOT NULL,
          cell_id VARCHAR(100) NOT NULL,
          lv INTEGER NOT NULL,
          event_date DATE NOT NULL,
          kind VARCHAR(32) NOT NULL,
          status VARCHAR(32) NOT NULL,
          site VARCHAR(200),
          source VARCHAR(300),
          note TEXT,
          next_step TEXT,
          priority_rank INTEGER,
          created_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          CONSTRAINT coverage_field_events_kind_check
            CHECK (kind IN ('visit', 'poc-planned', 'poc-active', 'poc-milestone', 'deployed', 'note')),
          CONSTRAINT coverage_field_events_status_check
            CHECK (status IN ('observed', 'poc-planned', 'poc-active', 'deployed')),
          CONSTRAINT coverage_field_events_lv_check
            CHECK (lv >= 1 AND lv <= 4)
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS coverage_field_events_subcell_idx ON coverage_field_events (subcell_key)`
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS coverage_field_events_cell_idx ON coverage_field_events (cell_id)`
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS coverage_field_events_date_idx ON coverage_field_events (event_date)`
      );
    } catch (err) {
      console.warn('[CoverageField] 테이블 생성 스킵 (이미 존재할 수 있음):', (err as Error).message);
    }
  }

  /**
   * `src/db/seed-data/coverage-field-events-*.json` 파일들을 읽어 이벤트 import.
   * (subcellKey, eventDate, kind, source) 단위로 idempotent — 재실행 안전.
   * 부팅 때마다 호출돼도 이미 있는 row 는 skip.
   */
  async seedFromFiles(): Promise<{ inserted: number; skipped: number; files: number }> {
    // dist/ 빌드 후에도 동작하도록 src/db/seed-data 경로 양쪽 시도
    const candidateDirs = [
      path.resolve(__dirname, '../db/seed-data'),
      path.resolve(__dirname, '../../src/db/seed-data'),
    ];
    const seedDir = candidateDirs.find((d) => fs.existsSync(d));
    if (!seedDir) {
      console.log('[CoverageField] seed-data 디렉터리 없음 — seed skip');
      return { inserted: 0, skipped: 0, files: 0 };
    }

    const files = fs
      .readdirSync(seedDir)
      .filter((f) => /^coverage-field-events-.*\.json$/.test(f))
      .sort();
    if (files.length === 0) return { inserted: 0, skipped: 0, files: 0 };

    let inserted = 0;
    let skipped = 0;

    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf-8')) as SeedFile;
      for (const ev of data.events) {
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

    return { inserted, skipped, files: files.length };
  }
}

export const coverageFieldService = new CoverageFieldService();
