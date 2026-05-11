/**
 * Hand Benchmark Service — 다지형 핸드 Perfect 대비 분석 (로봇 벤치마크와 독립).
 *
 * 패턴:
 *  - ensureTables(): boot-time CREATE TABLE IF NOT EXISTS
 *  - seedFromFile(): `seed-data/hand-benchmark-v1.json` 로부터 idempotent insert
 *      (AI 파이프라인 `scripts/enrich-hand-specs.ts` 가 생성하는 동일 포맷)
 *  - getBenchmarkData(): axes + competitors(+scores) 한방 조회
 *  - updateScore(): 인라인 편집용 upsert
 *
 * 새 핸드 추가 또는 점수 갱신은 JSON 파일을 commit + push → 다음 배포 부팅 시 자동 반영.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';
import { handBenchmarkAxes, handBenchmarkScores, handCompetitors } from '../db/schema.js';
import { eq, and, asc, sql } from 'drizzle-orm';

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
  imageUrl?: string;
  sortOrder?: number;
  scores: SeedScore[];
}

interface SeedFile {
  version: string;
  generatedAt: string;
  source: 'manual' | 'ai-pipeline';
  axes: SeedAxis[];
  competitors: SeedCompetitor[];
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
   * seed-data/hand-benchmark-*.json 을 읽어 axes/competitors/scores 를 idempotent 하게 삽입.
   * - axes: key 기준 upsert
   * - competitors: slug 기준 upsert
   * - scores: (competitor_id, axis_key) UNIQUE 기반 upsert
   */
  async seedFromFile(): Promise<{ axes: number; competitors: number; scores: number; files: number }> {
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

    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf-8')) as SeedFile;

      // Upsert axes
      for (const ax of data.axes) {
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

    return { axes: axesCount, competitors: compCount, scores: scoreCount, files: files.length };
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
