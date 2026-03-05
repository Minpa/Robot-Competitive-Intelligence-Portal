import {
  db,
  scoreHistory,
} from '../db/index.js';
import { eq, and, inArray, gte } from 'drizzle-orm';

export interface ScoreHistoryEntry {
  robotId: string;
  snapshotMonth: string;
  pocScores: Record<string, number>;
  rfmScores: Record<string, number>;
  combinedScore: number;
}

class ScoreHistoryService {
  /**
   * Query score_history for given robot IDs, last N months, ordered by snapshotMonth ASC.
   * Requirements: 12.18, 12.20, 12.24
   */
  async getTimeSeries(robotIds: string[], months: number): Promise<ScoreHistoryEntry[]> {
    // Calculate the cutoff month (N months ago in YYYY-MM format)
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const cutoffMonth = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;

    const results = await db
      .select({
        robotId: scoreHistory.robotId,
        snapshotMonth: scoreHistory.snapshotMonth,
        pocScores: scoreHistory.pocScores,
        rfmScores: scoreHistory.rfmScores,
        combinedScore: scoreHistory.combinedScore,
      })
      .from(scoreHistory)
      .where(
        and(
          inArray(scoreHistory.robotId, robotIds),
          gte(scoreHistory.snapshotMonth, cutoffMonth)
        )
      )
      .orderBy(scoreHistory.snapshotMonth);

    return results.map((row) => ({
      robotId: row.robotId,
      snapshotMonth: row.snapshotMonth,
      pocScores: (row.pocScores as Record<string, number>) ?? {},
      rfmScores: (row.rfmScores as Record<string, number>) ?? {},
      combinedScore: Number(row.combinedScore ?? 0),
    }));
  }

  /**
   * Upsert monthly snapshot for a robot.
   * snapshotMonth = current YYYY-MM.
   * combinedScore = sum of all PoC scores + sum of all RFM scores.
   * UNIQUE constraint on (robot_id, snapshot_month) — check-then-update/insert pattern.
   * Requirements: 12.18, 12.19, 12.20, 12.24
   */
  async createSnapshot(
    robotId: string,
    pocScores: Record<string, number>,
    rfmScores: Record<string, number>
  ): Promise<void> {
    const now = new Date();
    const snapshotMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Calculate combinedScore = sum of all PoC scores + sum of all RFM scores
    const pocTotal = Object.values(pocScores).reduce((sum, v) => sum + (v ?? 0), 0);
    const rfmTotal = Object.values(rfmScores).reduce((sum, v) => sum + (v ?? 0), 0);
    const combinedScore = pocTotal + rfmTotal;

    // Check if a record already exists for this robot + month
    const existing = await db
      .select({ id: scoreHistory.id })
      .from(scoreHistory)
      .where(
        and(
          eq(scoreHistory.robotId, robotId),
          eq(scoreHistory.snapshotMonth, snapshotMonth)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      // Update existing record
      await db
        .update(scoreHistory)
        .set({
          pocScores,
          rfmScores,
          combinedScore: String(combinedScore),
        })
        .where(eq(scoreHistory.id, existing[0].id));
    } else {
      // Insert new record
      await db.insert(scoreHistory).values({
        robotId,
        snapshotMonth,
        pocScores,
        rfmScores,
        combinedScore: String(combinedScore),
      });
    }
  }
}

export const warRoomScoreHistoryService = new ScoreHistoryService();
