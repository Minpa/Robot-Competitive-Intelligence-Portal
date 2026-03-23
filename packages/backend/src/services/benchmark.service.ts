import { db } from '../db/index.js';
import { ciBenchmarkAxes, ciBenchmarkScores, ciCompetitors } from '../db/schema.js';
import { eq, and, asc, sql } from 'drizzle-orm';

class BenchmarkService {
  /**
   * Get full benchmark data: axes definitions + all scores per competitor
   */
  async getBenchmarkData() {
    // Get all axes ordered by sortOrder
    const rawAxes = await db.select().from(ciBenchmarkAxes).orderBy(asc(ciBenchmarkAxes.sortOrder));

    // Strip icon and any leading emoji from label
    const axes = rawAxes.map(a => ({
      ...a,
      icon: null,
      label: a.label.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]+\s*/u, ''),
    }));

    // Get all competitors (active)
    const competitors = await db.select().from(ciCompetitors)
      .where(eq(ciCompetitors.isActive, true))
      .orderBy(asc(ciCompetitors.sortOrder));

    // Get all scores
    const scores = await db.select().from(ciBenchmarkScores);

    // Group scores by competitor
    const scoresByCompetitor: Record<string, Record<string, { currentScore: number; targetScore: number; rationale: string | null }>> = {};
    for (const score of scores) {
      if (!scoresByCompetitor[score.competitorId]) {
        scoresByCompetitor[score.competitorId] = {};
      }
      scoresByCompetitor[score.competitorId]![score.axisKey] = {
        currentScore: score.currentScore,
        targetScore: score.targetScore,
        rationale: score.rationale,
      };
    }

    return {
      axes,
      competitors: competitors.map(c => ({
        ...c,
        scores: scoresByCompetitor[c.id] || {},
      })),
    };
  }

  /**
   * Update a single score
   */
  async updateScore(competitorId: string, axisKey: string, currentScore: number, targetScore: number) {
    // Check if exists
    const existing = await db.select().from(ciBenchmarkScores)
      .where(and(
        eq(ciBenchmarkScores.competitorId, competitorId),
        eq(ciBenchmarkScores.axisKey, axisKey),
      ));

    if (existing.length > 0) {
      await db.update(ciBenchmarkScores)
        .set({ currentScore, targetScore, updatedAt: new Date() })
        .where(and(
          eq(ciBenchmarkScores.competitorId, competitorId),
          eq(ciBenchmarkScores.axisKey, axisKey),
        ));
    } else {
      await db.insert(ciBenchmarkScores).values({
        competitorId,
        axisKey,
        currentScore,
        targetScore,
      });
    }
  }

  /**
   * Strip emoji icons from axis labels and null out icon column
   */
  async stripAxisIcons() {
    try {
      await db.execute(sql.raw(`
        UPDATE ci_benchmark_axes SET icon = NULL WHERE icon IS NOT NULL;
      `));
      // Strip leading emoji characters from labels
      const axes = await db.select().from(ciBenchmarkAxes);
      for (const axis of axes) {
        const cleaned = axis.label.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\u200d\ufe0f]+\s*/u, '');
        if (cleaned !== axis.label) {
          await db.update(ciBenchmarkAxes).set({ label: cleaned }).where(eq(ciBenchmarkAxes.id, axis.id));
        }
      }
    } catch (e) {
      console.log('stripAxisIcons (non-fatal):', (e as Error).message);
    }
  }

  /**
   * Ensure tables exist
   */
  async ensureTables() {
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS ci_benchmark_axes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(50) UNIQUE NOT NULL,
          icon VARCHAR(10),
          label VARCHAR(100) NOT NULL,
          description TEXT,
          perfect_def TEXT,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS ci_benchmark_scores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          competitor_id UUID NOT NULL REFERENCES ci_competitors(id) ON DELETE CASCADE,
          axis_key VARCHAR(50) NOT NULL,
          current_score INTEGER NOT NULL DEFAULT 0,
          target_score INTEGER NOT NULL DEFAULT 0,
          rationale TEXT,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(competitor_id, axis_key)
        );
        CREATE INDEX IF NOT EXISTS ci_benchmark_scores_competitor_idx ON ci_benchmark_scores(competitor_id);
        ALTER TABLE ci_benchmark_scores ADD COLUMN IF NOT EXISTS rationale TEXT;
      `));
    } catch (e) {
      console.log('Benchmark tables may already exist:', (e as Error).message);
    }
  }
}

export const benchmarkService = new BenchmarkService();
