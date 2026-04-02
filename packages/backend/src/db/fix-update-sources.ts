/**
 * Startup fix: add sourceUrl to existing regulatory updates that are missing them.
 */
import { db } from './index.js';
import { regulatoryUpdates } from './schema.js';
import { sql } from 'drizzle-orm';

const URL_FIXES: { titleMatch: string; sourceUrl: string; sourceName: string }[] = [
  {
    titleMatch: '%R&D 방향%',
    sourceUrl: 'https://www.irobotnews.com/news/articleView.html?idxno=35621',
    sourceName: 'IRobot News',
  },
  {
    titleMatch: '%Intelligence Rating%',
    sourceUrl: 'https://www.miit.gov.cn',
    sourceName: 'MIIT',
  },
  {
    titleMatch: '%Unitree G1%',
    sourceUrl: 'https://spectrum.ieee.org/unitree-g1-data-privacy',
    sourceName: 'IEEE Spectrum',
  },
];

export async function fixUpdateSources() {
  try {
    for (const fix of URL_FIXES) {
      await db.update(regulatoryUpdates)
        .set({ sourceUrl: fix.sourceUrl, sourceName: fix.sourceName })
        .where(sql`${regulatoryUpdates.title} LIKE ${fix.titleMatch} AND (${regulatoryUpdates.sourceUrl} IS NULL OR ${regulatoryUpdates.sourceUrl} = '')`);
    }
  } catch (err) {
    console.error('[startup] Fix update sources failed (non-fatal):', err);
  }
}
