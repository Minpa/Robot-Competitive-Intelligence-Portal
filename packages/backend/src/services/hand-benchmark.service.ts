/**
 * Hand Benchmark Service — 다지형 핸드 Perfect 대비 분석 (로봇 벤치마크와 독립).
 *
 * 패턴:
 *  - ensureTables(): boot-time CREATE TABLE IF NOT EXISTS
 *  - seedFromFile(): `seed-data/hand-benchmark-*.json` 전부를 파일명 정렬 순으로 읽어 반영
 *      · 기본(insert-only): 자연키(slug / axis key / (competitor, axis))가 없을 때만 insert. 기존 행은 건드리지 않는다.
 *        (`hand-benchmark-v1.json` 은 AI 파이프라인 `scripts/enrich-hand-specs.ts` 가 생성하는 동일 포맷)
 *      · `"mode": "upsert"` 파일: 파일 내용 해시 마커(`hand-benchmark:<파일명>:<sha12>`)가 없을 때 한 트랜잭션에서
 *        그 파일의 slug 만 insert/update 하고 마커를 기록한다. 파일 내용이 바뀌면 해시가 바뀌어 재적용되므로
 *        배포 후 점수·이름 정정이 DB 에 반영된다. 다른 파일(v1 등)의 slug 는 건드리지 않는다.
 *        파일당 마커는 최신 1개만 유지한다(적용 시 같은 파일의 이전 해시 마커를 지움) — 이전 내용으로 되돌려도(A→B→A) 재적용된다.
 *  - getBenchmarkData(): axes + competitors(+scores) 한방 조회
 *  - updateScore(): 인라인 편집용 upsert
 *
 * 새 핸드 추가 또는 점수 갱신은 JSON 파일을 commit + push → 다음 배포 부팅 시 자동 반영.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, dataMigrations } from '../db/index.js';
import { handBenchmarkAxes, handBenchmarkScores, handCompetitors } from '../db/schema.js';
import { eq, and, asc, like, sql } from 'drizzle-orm';
import { dataMigrationService } from './data-migration.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SeedAxis {
  key: string;
  label: string;
  description?: string;
  perfectDef?: string;
  unit?: string;
  sortOrder?: number;
}

interface SeedScore {
  axisKey: string;
  currentScore: number;
  targetScore: number;
  rawValue?: string;
  rationale?: string;
}

interface SeedCompetitor {
  slug: string;
  name: string;
  manufacturer: string;
  country?: string;
  category?: 'dexterous' | 'industrial-5f';
  imageUrl?: string | null;
  sortOrder?: number;
  scores: SeedScore[];
}

interface SeedFile {
  version: string;
  generatedAt: string;
  source: 'manual' | 'ai-pipeline';
  /** 'upsert' 이면 마커 기반 업서트 모드. 없으면 insert-only. */
  mode?: 'upsert';
  axes?: SeedAxis[];
  competitors: SeedCompetitor[];
}

/** 업서트 모드 마커 접두 (액추에이터 `actuator-update:` 와 분리) */
export const HAND_BENCHMARK_MARKER_PREFIX = 'hand-benchmark:';
/** 업서트 모드 동시 기동 직렬화용 advisory lock 키 (724301 액추에이터, 724302 주간 브리프와 구분) */
export const HAND_BENCHMARK_LOCK_KEY = 724303;

type HandTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface HandBenchmarkSeedResult {
  axes: number;
  competitors: number;
  scores: number;
  files: number;
  /** 업서트 모드에서 값이 바뀌어 update 된 competitors / scores 행 수 */
  updated?: { competitors: number; scores: number };
}

/** 업서트 마커 키: hand-benchmark:<파일명>:<sha256 12자(파일 원본 바이트)> */
export function computeHandBenchmarkMarkerKey(fileName: string, raw: Buffer | string): string {
  const sha = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 12);
  return `${HAND_BENCHMARK_MARKER_PREFIX}${fileName}:${sha}`;
}

class HandBenchmarkService {
  async ensureTables(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS hand_competitors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          manufacturer VARCHAR(255) NOT NULL,
          country VARCHAR(100),
          category VARCHAR(50) DEFAULT 'dexterous',
          image_url VARCHAR(500),
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS hand_benchmark_axes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(50) UNIQUE NOT NULL,
          label VARCHAR(100) NOT NULL,
          description TEXT,
          perfect_def TEXT,
          unit VARCHAR(30),
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS hand_benchmark_scores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          competitor_id UUID NOT NULL REFERENCES hand_competitors(id) ON DELETE CASCADE,
          axis_key VARCHAR(50) NOT NULL,
          current_score INTEGER NOT NULL DEFAULT 0,
          target_score INTEGER NOT NULL DEFAULT 0,
          raw_value VARCHAR(100),
          rationale TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT hand_benchmark_scores_competitor_axis_uniq UNIQUE (competitor_id, axis_key)
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS hand_benchmark_scores_competitor_idx ON hand_benchmark_scores (competitor_id)`
      );
    } catch (err) {
      console.warn('[HandBenchmark] 테이블 생성 스킵:', (err as Error).message);
    }
  }

  /**
   * seed-data/hand-benchmark-*.json 을 파일명 정렬 순으로 읽어 반영한다.
   * - 기본(insert-only): axes key / competitors slug / scores (competitor_id, axis_key) 가 없을 때만 insert.
   *   이미 있으면 건너뛰고, imageUrl 이 비어 있을 때만 채운다.
   * - `"mode": "upsert"` 파일: applyUpsertFile() — 마커 + advisory lock + 단일 트랜잭션.
   */
  async seedFromFile(): Promise<HandBenchmarkSeedResult> {
    const candidateDirs = [
      path.resolve(__dirname, '../db/seed-data'),
      path.resolve(__dirname, '../../src/db/seed-data'),
    ];
    const seedDir = candidateDirs.find((d) => fs.existsSync(d));
    if (!seedDir) {
      return { axes: 0, competitors: 0, scores: 0, files: 0 };
    }

    const files = fs
      .readdirSync(seedDir)
      .filter((f) => /^hand-benchmark-.*\.json$/.test(f))
      .sort();
    if (files.length === 0) return { axes: 0, competitors: 0, scores: 0, files: 0 };

    let axesCount = 0;
    let compCount = 0;
    let scoreCount = 0;
    const updated = { competitors: 0, scores: 0 };

    for (const file of files) {
      const rawBuf = fs.readFileSync(path.join(seedDir, file));
      const data = JSON.parse(rawBuf.toString('utf-8')) as SeedFile;

      if (data.mode === 'upsert') {
        // 한 파일의 실패가 다른 파일 반영을 막지 않도록 격리한다 (마커는 트랜잭션과 함께 롤백되어 다음 기동에서 재시도).
        try {
          const r = await this.applyUpsertFile(file, rawBuf, data);
          compCount += r.competitors;
          scoreCount += r.scores;
          updated.competitors += r.updatedCompetitors;
          updated.scores += r.updatedScores;
        } catch (err) {
          console.warn(`[HandBenchmark] upsert 실패 (${file}):`, (err as Error).message);
        }
        continue;
      }

      // Upsert axes
      for (const ax of data.axes ?? []) {
        const existing = await db
          .select({ id: handBenchmarkAxes.id })
          .from(handBenchmarkAxes)
          .where(eq(handBenchmarkAxes.key, ax.key))
          .limit(1);
        if (existing.length === 0) {
          await db.insert(handBenchmarkAxes).values({
            key: ax.key,
            label: ax.label,
            description: ax.description ?? null,
            perfectDef: ax.perfectDef ?? null,
            unit: ax.unit ?? null,
            sortOrder: ax.sortOrder ?? 0,
          });
          axesCount++;
        }
      }

      // Upsert competitors + scores
      for (const comp of data.competitors) {
        let competitorId: string;
        const existingComp = await db
          .select({ id: handCompetitors.id, imageUrl: handCompetitors.imageUrl })
          .from(handCompetitors)
          .where(eq(handCompetitors.slug, comp.slug))
          .limit(1);

        if (existingComp.length === 0) {
          const inserted = await db
            .insert(handCompetitors)
            .values({
              slug: comp.slug,
              name: comp.name,
              manufacturer: comp.manufacturer,
              country: comp.country ?? null,
              category: comp.category ?? 'dexterous',
              imageUrl: comp.imageUrl ?? null,
              sortOrder: comp.sortOrder ?? 0,
            })
            .returning({ id: handCompetitors.id });
          competitorId = inserted[0]!.id;
          compCount++;
        } else {
          competitorId = existingComp[0]!.id;
          // Backfill imageUrl if missing in DB but present in seed
          if (!existingComp[0]!.imageUrl && comp.imageUrl) {
            await db
              .update(handCompetitors)
              .set({ imageUrl: comp.imageUrl, updatedAt: new Date() })
              .where(eq(handCompetitors.id, competitorId));
          }
        }

        for (const score of comp.scores) {
          const existingScore = await db
            .select({ id: handBenchmarkScores.id })
            .from(handBenchmarkScores)
            .where(
              and(
                eq(handBenchmarkScores.competitorId, competitorId),
                eq(handBenchmarkScores.axisKey, score.axisKey)
              )
            )
            .limit(1);

          if (existingScore.length === 0) {
            await db.insert(handBenchmarkScores).values({
              competitorId,
              axisKey: score.axisKey,
              currentScore: score.currentScore,
              targetScore: score.targetScore,
              rawValue: score.rawValue ?? null,
              rationale: score.rationale ?? null,
            });
            scoreCount++;
          }
        }
      }
    }

    const result: HandBenchmarkSeedResult = { axes: axesCount, competitors: compCount, scores: scoreCount, files: files.length };
    if (updated.competitors > 0 || updated.scores > 0) result.updated = updated;
    return result;
  }

  /**
   * `"mode": "upsert"` 파일 하나를 적용한다.
   * - 마커 `hand-benchmark:<파일명>:<sha12>` 가 있으면 아무것도 하지 않는다(재기동 멱등).
   * - 없으면 advisory lock(724303) 아래 단일 트랜잭션에서 마커를 재확인한 뒤, 파일에 있는 slug 만
   *   insert(없을 때) 또는 update(값이 달라졌을 때)하고 같은 트랜잭션에서 마커를 기록한다.
   * - 같은 파일의 이전 해시 마커는 같은 트랜잭션에서 지운다(파일당 최신 1개). 그래야 A→B→A 로 되돌린 내용도 다시 적용된다.
   * - 파일에 없는 slug(기존 v1 8종 등)와 axes 는 건드리지 않는다.
   * - 값이 같은 행은 update 하지 않아 updated_at 이 유지된다.
   */
  private async applyUpsertFile(
    file: string,
    raw: Buffer,
    data: SeedFile
  ): Promise<{ competitors: number; scores: number; updatedCompetitors: number; updatedScores: number; applied: boolean }> {
    const markerKey = computeHandBenchmarkMarkerKey(file, raw);
    const none = { competitors: 0, scores: 0, updatedCompetitors: 0, updatedScores: 0, applied: false };
    if (await dataMigrationService.has(markerKey)) return none;

    const startedAt = Date.now();
    const counters = { insertedCompetitors: 0, insertedScores: 0, updatedCompetitors: 0, updatedScores: 0 };
    const applied = await db.transaction(async (tx: HandTx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${HAND_BENCHMARK_LOCK_KEY})`);
      const marked = await tx.select({ key: dataMigrations.key }).from(dataMigrations).where(eq(dataMigrations.key, markerKey)).limit(1);
      if (marked.length > 0) return false;

      for (const comp of data.competitors) {
        const wanted = {
          name: comp.name,
          manufacturer: comp.manufacturer,
          country: comp.country ?? null,
          category: comp.category ?? 'dexterous',
          imageUrl: comp.imageUrl ?? null,
          sortOrder: comp.sortOrder ?? 0,
        };
        const existing = await tx.select().from(handCompetitors).where(eq(handCompetitors.slug, comp.slug)).limit(1);
        let competitorId: string;
        if (existing.length === 0) {
          const ins = await tx.insert(handCompetitors).values({ slug: comp.slug, ...wanted }).returning({ id: handCompetitors.id });
          competitorId = ins[0]!.id;
          counters.insertedCompetitors++;
        } else {
          const cur = existing[0]!;
          competitorId = cur.id;
          const changed =
            cur.name !== wanted.name ||
            cur.manufacturer !== wanted.manufacturer ||
            (cur.country ?? null) !== wanted.country ||
            (cur.category ?? null) !== wanted.category ||
            (cur.imageUrl ?? null) !== wanted.imageUrl ||
            (cur.sortOrder ?? 0) !== wanted.sortOrder;
          if (changed) {
            await tx.update(handCompetitors).set({ ...wanted, updatedAt: new Date() }).where(eq(handCompetitors.id, competitorId));
            counters.updatedCompetitors++;
          }
        }

        for (const score of comp.scores) {
          const wantedScore = {
            currentScore: score.currentScore,
            targetScore: score.targetScore,
            rawValue: score.rawValue ?? null,
            rationale: score.rationale ?? null,
          };
          const existingScore = await tx
            .select()
            .from(handBenchmarkScores)
            .where(and(eq(handBenchmarkScores.competitorId, competitorId), eq(handBenchmarkScores.axisKey, score.axisKey)))
            .limit(1);
          if (existingScore.length === 0) {
            await tx.insert(handBenchmarkScores).values({ competitorId, axisKey: score.axisKey, ...wantedScore });
            counters.insertedScores++;
          } else {
            const cur = existingScore[0]!;
            const changed =
              cur.currentScore !== wantedScore.currentScore ||
              cur.targetScore !== wantedScore.targetScore ||
              (cur.rawValue ?? null) !== wantedScore.rawValue ||
              (cur.rationale ?? null) !== wantedScore.rationale;
            if (changed) {
              await tx.update(handBenchmarkScores).set({ ...wantedScore, updatedAt: new Date() }).where(eq(handBenchmarkScores.id, cur.id));
              counters.updatedScores++;
            }
          }
        }
      }

      const filePrefix = `${HAND_BENCHMARK_MARKER_PREFIX}${file}:`;
      await tx.delete(dataMigrations).where(like(dataMigrations.key, `${filePrefix.replace(/[\\%_]/g, (c) => `\\${c}`)}%`));
      await tx
        .insert(dataMigrations)
        .values({
          key: markerKey,
          summary: {
            file,
            version: data.version,
            competitors: data.competitors.map((c) => c.slug),
            counters,
            durationMs: Date.now() - startedAt,
          },
        })
        .onConflictDoNothing();
      return true;
    });

    if (!applied) return none;
    console.log(
      `[HandBenchmark] upsert ${file} applied: hands +${counters.insertedCompetitors} ~${counters.updatedCompetitors}, scores +${counters.insertedScores} ~${counters.updatedScores}`
    );
    return {
      competitors: counters.insertedCompetitors,
      scores: counters.insertedScores,
      updatedCompetitors: counters.updatedCompetitors,
      updatedScores: counters.updatedScores,
      applied: true,
    };
  }

  async getBenchmarkData() {
    const axes = await db.select().from(handBenchmarkAxes).orderBy(asc(handBenchmarkAxes.sortOrder));
    const competitors = await db
      .select()
      .from(handCompetitors)
      .where(eq(handCompetitors.isActive, true))
      .orderBy(asc(handCompetitors.sortOrder));
    const scores = await db.select().from(handBenchmarkScores);

    const scoresByCompetitor: Record<
      string,
      Record<string, { currentScore: number; targetScore: number; rawValue: string | null; rationale: string | null }>
    > = {};
    for (const s of scores) {
      if (!scoresByCompetitor[s.competitorId]) scoresByCompetitor[s.competitorId] = {};
      scoresByCompetitor[s.competitorId]![s.axisKey] = {
        currentScore: s.currentScore,
        targetScore: s.targetScore,
        rawValue: s.rawValue,
        rationale: s.rationale,
      };
    }

    return {
      axes,
      competitors: competitors.map((c) => ({
        ...c,
        scores: scoresByCompetitor[c.id] || {},
      })),
    };
  }

  async updateScore(competitorId: string, axisKey: string, currentScore: number, targetScore: number) {
    const existing = await db
      .select()
      .from(handBenchmarkScores)
      .where(and(eq(handBenchmarkScores.competitorId, competitorId), eq(handBenchmarkScores.axisKey, axisKey)));

    if (existing.length > 0) {
      await db
        .update(handBenchmarkScores)
        .set({ currentScore, targetScore, updatedAt: new Date() })
        .where(and(eq(handBenchmarkScores.competitorId, competitorId), eq(handBenchmarkScores.axisKey, axisKey)));
    } else {
      await db.insert(handBenchmarkScores).values({ competitorId, axisKey, currentScore, targetScore });
    }
  }
}

export const handBenchmarkService = new HandBenchmarkService();
