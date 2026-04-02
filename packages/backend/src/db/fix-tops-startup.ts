/**
 * Startup fix: correct TOPS values for robots with known inaccuracies.
 * NVIDIA Thor: actual 2000 TOPS, was seeded as 500.
 */

import { db, computingSpecs, humanoidRobots } from './index.js';
import { eq } from 'drizzle-orm';

const TOPS_FIXES: Record<string, { topsMin: number; topsMax: number }> = {
  'Figure 02': { topsMin: 1000, topsMax: 2000 },
  'Digit v3': { topsMin: 1000, topsMax: 2000 },
};

export async function fixTopsValues() {
  try {
    let updated = 0;
    for (const [robotName, fix] of Object.entries(TOPS_FIXES)) {
      const [robot] = await db
        .select({ id: humanoidRobots.id })
        .from(humanoidRobots)
        .where(eq(humanoidRobots.name, robotName))
        .limit(1);
      if (!robot) continue;

      const [spec] = await db
        .select({ topsMax: computingSpecs.topsMax })
        .from(computingSpecs)
        .where(eq(computingSpecs.robotId, robot.id))
        .limit(1);
      if (!spec) continue;

      const currentMax = Number(spec.topsMax);
      if (currentMax >= fix.topsMax) continue;

      await db.update(computingSpecs)
        .set({ topsMin: String(fix.topsMin), topsMax: String(fix.topsMax), updatedAt: new Date() })
        .where(eq(computingSpecs.robotId, robot.id));
      updated++;
    }

    if (updated > 0) {
      console.log(`[startup] Fixed TOPS for ${updated} robots`);
    }
  } catch (err) {
    console.error('[startup] TOPS fix failed (non-fatal):', err);
  }
}
