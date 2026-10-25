/**
 * data_migrations — 데이터 적용/작업 완료 마커 저장소.
 *
 * 키 규약
 *  - `actuator-update:<sha12>`        : 액추에이터 데이터 적용 이력 (영구 보존, 한 번 쓰면 수정하지 않음)
 *  - `pipeline:last`                  : 일일 분석/분류 파이프라인 마지막 실행 결과 (upsert 덮어쓰기)
 *  - `arxiv-backfill:actuator:12m`    : 크롤러가 쓰는 actuator arXiv 12개월 백필 완료 마커
 * 정식 생성 경로는 런타임 ensureTable() (CREATE TABLE IF NOT EXISTS) — drizzle/0027 과 동일 DDL.
 */

import { desc, eq, like, sql } from 'drizzle-orm';
import { db, dataMigrations } from '../db/index.js';

export interface DataMigrationRow {
  key: string;
  appliedAt: Date;
  summary: Record<string, unknown>;
}

/** LIKE 와일드카드 이스케이프 */
function escapeLike(prefix: string): string {
  return prefix.replace(/[\\%_]/g, (c) => `\\${c}`);
}

class DataMigrationService {
  async ensureTable(): Promise<void> {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS data_migrations (
        key VARCHAR(200) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
        summary JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);
  }

  async get(key: string): Promise<DataMigrationRow | null> {
    const rows = await db.select().from(dataMigrations).where(eq(dataMigrations.key, key)).limit(1);
    return (rows[0] as DataMigrationRow | undefined) ?? null;
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  /** 있으면 applied_at/summary 를 덮어쓴다 (pipeline:last 용). */
  async upsert(key: string, summary: Record<string, unknown>): Promise<void> {
    await db
      .insert(dataMigrations)
      .values({ key, summary })
      .onConflictDoUpdate({ target: dataMigrations.key, set: { appliedAt: new Date(), summary } });
  }

  /** 최신순 */
  async listRecent(prefix: string | null = null, limit = 20): Promise<DataMigrationRow[]> {
    const base = db.select().from(dataMigrations);
    const q = prefix ? base.where(like(dataMigrations.key, `${escapeLike(prefix)}%`)) : base;
    return (await q.orderBy(desc(dataMigrations.appliedAt)).limit(limit)) as DataMigrationRow[];
  }
}

export const dataMigrationService = new DataMigrationService();
