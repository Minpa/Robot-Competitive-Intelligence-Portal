#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-11-10
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-11-10.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-11-10) ──────────────────

interface CiAlert {
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  competitorSlug: string;
  layerSlug: string;
  confidence: 'A' | 'B' | 'C' | 'D' | 'E';
  category: 'partnership' | 'funding' | 'mass_production' | 'spec_update' | 'demo' | 'regulation';
  severity: 'info' | 'warning' | 'critical';
}

const alerts: CiAlert[] = [
  // ── Tesla Optimus ──
  {
    headline: 'Tesla officially begins Optimus production on high-volume Fremont line (Q3 2026)',
    summary: 'Tesla Q3 2026 shareholder update confirms Optimus production has begun on Fremont high-volume line, converting former Model S/X lines. First production-quality bots manufactured. Musk says reaching full capacity will take about a year, with external deliveries targeted end of 2027.',
    sourceName: 'Not a Tesla App / Tesla North',
    sourceUrl: 'https://notateslaapp.com/news/4866/tesla-officially-begins-optimus-robot-production',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Musk announces Tesla will likely rent Optimus robots rather than sell them (Nov 6, Baron Conference)',
    summary: 'At Baron Investment Conference on November 6, 2026, Musk stated Tesla will probably rent Optimus rather than sell it. Build cost reportedly starts near $30,000 per robot, targeting $20,000 over time. No rental prices or contract terms announced yet. Not a final policy decision.',
    sourceName: 'Not a Tesla App / ShiftDelete',
    sourceUrl: 'https://www.notateslaapp.com/news/4959/musk-tesla-will-rent-optimus-robots-instead-of-selling-them',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics unveils 13-DOF four-finger hand for Atlas, drops pinky for production ruggedness (Oct 2)',
    summary: 'Boston Dynamics unveiled a new 4-finger, 13-DOF hand for Atlas (up from 7 DOF previous design). Features 4-DOF opposable thumb, 3-DOF per finger, pressure-based tactile sensors. Pinky dropped to reduce cost, size, actuator count, and failure points. Designed for in-hand reorientation, tool use, and slip recovery. Named GR3.',
    sourceName: 'Robotics & Automation News / Interesting Engineering',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/10/02/boston-dynamics-unveils-new-four-finger-hand-for-atlas-humanoid-robot/105440/',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Boston Dynamics tests Atlas on wheels for whole-body control experiments (Nov 9)',
    summary: 'Boston Dynamics released video of Atlas moving on wheels attached to its ankles. Wheels are a controls experiment using a single adapter mounting a scooter rim. Same video shows Atlas performing pirouettes. Demonstrates advancing whole-body control capabilities.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/boston-dynamics-adds-wheels-to-atlas-humanoid-to-test-whole-body-control/',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI marks 1,000th Figure 03 humanoid built at BotQ factory (July 2026)',
    summary: 'Figure AI marked its 1,000th humanoid built at BotQ factory in July 2026. Production rate now at 1 robot/hour (24x improvement in under 120 days). Business customers include BMW and Catalyst Brands. Consumer sales not yet available.',
    sourceName: 'eWeek / Figure AI Official',
    sourceUrl: 'https://www.eweek.com/news/figure-03-humanoid-robot-production-helix-ai/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure 04 design locked; home lease model at ~$600/month announced by CEO Adcock',
    summary: 'CEO Brett Adcock confirmed Figure 04 design lock in mid-May 2026. Figure 04 aimed at home suitability and lower manufacturing cost. Car-lease-style subscription at ~$600/month announced for home market. TrendForce estimates small-batch consumer sales in 2027-2028. Figure 04 currently in assembly and testing.',
    sourceName: 'Wikipedia / ZeroHedge / TrendForce',
    sourceUrl: 'https://en.wikipedia.org/wiki/Figure_AI',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Newly built Figure 03 robots demonstrated walking on campus, dozens active at HQ (Nov 2-7)',
    summary: 'CEO Adcock posted footage of newly built Figure 03 robots walking across company campus after leaving BotQ (Nov 2-3). Follow-up video Nov 7 shows dozens of Figure 03s operating at headquarters. Demonstrates growing fleet size and autonomous mobility.',
    sourceName: 'Interesting Engineering / Humanoids Daily',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/figure-03-humanoids-take-campus-walk',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'demo',
    severity: 'info',
  },

  // ── Unitree ──
  {
    headline: 'Unitree debuts on Shanghai STAR Market (Aug 19) at ~$9B valuation — first pure humanoid robot IPO in China',
    summary: 'Unitree Robotics officially listed on Shanghai STAR Market on August 19, 2026. IPO approved July 3 after record 73-day review. Issued 40.45M shares (10% of enlarged capital). Subscriptions opened Aug 10. Valuation approximately $9B. First pure-play humanoid robotics IPO on STAR Market.',
    sourceName: 'Caixin Global / SSE Official / Mobile World Live',
    sourceUrl: 'https://english.sse.com.cn/news/newsrelease/voice/c/c_20260731_10827393.shtml',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree G1 cumulative production reaches 10,000-20,000 units (CEO statement Oct 22)',
    summary: 'Founder Wang Xingxing stated at October 22 conference that the G1 humanoid robot has rolled off production line roughly 10,000 to 20,000 units cumulatively since May 2024 launch. Also launched H2-X humanoid at the same event.',
    sourceName: 'BigGo Finance',
    sourceUrl: 'https://finance.biggo.com/news/1ddaa1e1-ec43-40b3-80d4-213790a46358',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Unitree launches H2-X next-gen humanoid and security researchers disclose Bluetooth vulnerability (CVE-2025-60250/60251)',
    summary: 'Unitree launched H2-X humanoid at October 2026 conference. Separately, security researchers disclosed UniPwn Bluetooth vulnerability (CVE-2025-60250/60251) affecting G1, H1, and B2 models. Firmware fixes rolling out. FCC placed foreign-produced robots on Covered List (July 28) but G1 existing FCC authorization maintains US market access.',
    sourceName: 'Robozaps / ZMProbots',
    sourceUrl: 'https://blog.robozaps.com/b/unitree-robotics',
    competitorSlug: 'unitree',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Robotics debuts on Nasdaq as AGLT — first pure-play humanoid IPO (Nov 5, 2026)',
    summary: 'Agility Robotics completed SPAC merger with Churchill Capital Corp XI on Nov 4, 2026. Trading began Nov 5 on Nasdaq under ticker AGLT/AGLTW. $2.5B pre-money valuation. ~$465M gross proceeds raised. Closed first day at $11.51. First publicly traded pure-play humanoid robotics company.',
    sourceName: 'TechCrunch / TechRepublic / SEC Filing',
    sourceUrl: 'https://techcrunch.com/2026/11/05/agility-is-the-first-pure-humanoid-robot-company-on-the-stock-market-are-you-buying/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Digit 5 launched as first cooperatively safe humanoid — no safety cages, $300M+ multi-year orders (Sep 15)',
    summary: 'Agility unveiled Digit 5 on Sep 15, 2026 — first humanoid engineered for cooperatively safe work at scale (no physical safety barriers needed). NVIDIA Halos safety system adopted. $300M+ committed multi-year orders. Nyobolt ultra-fast charging battery selected. 30+ companies in evaluation pipeline. Expanded GXO relationship and three new manufacturing customers.',
    sourceName: 'Forbes / Agility Robotics Official',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/09/15/agility-launches-digit-5-no-more-safety-cages-300-million-in-orders/',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Agility rebrands from "Agility Robotics" to "Agility" (March 5, 2026)',
    summary: 'Company officially rebranded from Agility Robotics to Agility on March 5, 2026. Revenue H1 2026 approximately $174K with operating loss ~$362.7M. AGCO signed pilot agreement for Hesston, Kansas plant (expected 2027). GXO has moved 100K+ totes with Digit since mid-2024.',
    sourceName: 'Wikipedia / MarketWatch',
    sourceUrl: 'https://en.wikipedia.org/wiki/Agility_Robotics',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik unveils Apollo 2 and opens 90,000 sqft Robot Park for humanoid data collection (June 30)',
    summary: 'Apptronik opened Robot Park — flagship 90,000 sqft data collection and training facility in Austin, TX. Unveiled Apollo 2 in bipedal and wheeled-base configurations. Data used to train Google DeepMind Gemini Robotics AI models. Apollo 3 targeted for mass-market commercialization starting 2027.',
    sourceName: 'Forbes / GlobeNewsWire / Robotics 24/7',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/06/30/apptronik-announces-robot-park-a-90000-square-foot-humanoid-data-factory-teases-new-robot/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO delivery status uncertain — no verified customer deliveries as of July 2026; teleoperator dependency noted',
    summary: 'As of July 2026, no independently verified customer delivery of NEO at home. Factory claims full production since April 30 but consumer review sites found no confirmed home delivery. Fortune review revealed all tasks in WSJ test run were teleoperated by "Turing" operators, not autonomous. Company targets late 2026 US deliveries, 2027 global.',
    sourceName: 'Fortune / Robozaps / Startup Fortune',
    sourceUrl: 'https://fortune.com/2026/02/26/humanoid-robot-that-will-do-chores-for-you-robotics-company-1x/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'C',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: '1X finalizes NEO hand design — in-house production of 10,000 hands targeted for 2026 (July)',
    summary: '1X Technologies finalized NEO hand design in July 2026. Company targets producing 10,000 hands in-house this year. Robot is 5\'6", ~66 lbs. Manufacturing at Hayward CA factory plus new San Carlos facility coming online later 2026. Targets 100,000 units/year by end 2027.',
    sourceName: 'Dezeen / 1X Official',
    sourceUrl: 'https://www.dezeen.com/2026/07/13/1x-technologies-neo-robot-hand/',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Agibot ──
  {
    headline: 'Agibot reaches 15,000th robot milestone and debuts A3 Ultra at WAIC 2026 (July)',
    summary: 'AGIBOT announced 15,000th cumulative robot shipped at WAIC 2026 (July 17-20). Launched A3 Ultra full-size humanoid: 174cm, 60kg, 51 DOF, powered by NVIDIA Thor. Supports battery swapping and autonomous charging. Named "Star Exhibit" at WAIC. Also launched X2 Edu, G2 Max, and OmniHand 3 Ultra-M.',
    sourceName: 'eWeek / Interesting Engineering / Gagadget',
    sourceUrl: 'https://www.eweek.com/news/agibot-a3-ultra-humanoid-robot-waic-2026-apac-china/',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Agibot G2 completes 6-day livestreamed factory trial at Longcheer with 99.99% success rate',
    summary: 'AGIBOT G2 completed 6-day continuous livestreamed trial at Longcheer Technology tablet plant. Achieved 99.99% success rate. First embodied AI deployment in consumer electronics precision manufacturing. Targeting 100 robots by Q3-Q4 2026. Expanding into automotive, semiconductors, and energy sectors.',
    sourceName: 'AI Business / Pulse.bot',
    sourceUrl: 'https://aibusiness.com/generative-ai/chinese-vendor-large-scale-embodied-ai-deployment',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Cross-industry: dual IPO milestone ──
  {
    headline: 'Humanoid robotics enters public markets: Agility (AGLT, Nasdaq Nov 5) and Unitree (STAR Market, Aug 19) both IPO in 2026',
    summary: 'Two pure-play humanoid robotics companies went public in 2026: Agility on Nasdaq (Nov 5, $2.5B) and Unitree on Shanghai STAR Market (Aug 19, ~$9B). Marks sector transition from private VC-funded to public market capital access. Agility first Western humanoid IPO; Unitree first Chinese humanoid IPO.',
    sourceName: 'TechCrunch / Caixin Global',
    sourceUrl: 'https://techcrunch.com/2026/11/05/agility-is-the-first-pure-humanoid-robot-company-on-the-stock-market-are-you-buying/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'info',
  },
];

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const competitorRows = await client.query('SELECT id, slug FROM ci_competitors');
    const competitorMap = new Map<string, string>();
    for (const row of competitorRows.rows) {
      competitorMap.set(row.slug, row.id);
    }

    const layerRows = await client.query('SELECT id, slug FROM ci_layers');
    const layerMap = new Map<string, string>();
    for (const row of layerRows.rows) {
      layerMap.set(row.slug, row.id);
    }

    let insertedAlerts = 0;
    let skippedAlerts = 0;

    for (const alert of alerts) {
      const dup = await client.query(
        'SELECT id FROM ci_monitor_alerts WHERE headline = $1',
        [alert.headline]
      );
      if (dup.rows.length > 0) {
        skippedAlerts++;
        console.log(`  ~ Skipped (duplicate): ${alert.headline.slice(0, 60)}...`);
        continue;
      }

      const competitorId = competitorMap.get(alert.competitorSlug) ?? null;
      const layerId = layerMap.get(alert.layerSlug) ?? null;

      await client.query(
        `INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())`,
        [alert.sourceName, alert.sourceUrl, alert.headline, alert.summary, competitorId, layerId]
      );
      insertedAlerts++;
    }

    let insertedCompAlerts = 0;

    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
    for (const alert of criticalAlerts) {
      const robotRow = await client.query(
        `SELECT hr.id FROM humanoid_robots hr
         JOIN companies c ON hr.company_id = c.id
         WHERE c.name ILIKE $1
         LIMIT 1`,
        [`%${alert.competitorSlug === 'optimus' ? 'Tesla' :
           alert.competitorSlug === 'atlas' ? 'Boston Dynamics' :
           alert.competitorSlug === 'figure' ? 'Figure' :
           alert.competitorSlug === 'digit' ? 'Agility' :
           alert.competitorSlug === 'neo' ? '1X' :
           alert.competitorSlug === 'apollo' ? 'Apptronik' :
           alert.competitorSlug === 'unitree' ? 'Unitree' :
           alert.competitorSlug === 'agibot' ? 'Agibot' : alert.competitorSlug}%`]
      );

      const robotId = robotRow.rows[0]?.id ?? null;

      const dup = await client.query(
        'SELECT id FROM competitive_alerts WHERE title = $1',
        [alert.headline]
      );
      if (dup.rows.length > 0) continue;

      const typeMap: Record<string, string> = {
        partnership: 'partnership',
        funding: 'funding',
        mass_production: 'mass_production',
        spec_update: 'score_spike',
        demo: 'score_spike',
        regulation: 'partnership',
      };

      await client.query(
        `INSERT INTO competitive_alerts (robot_id, type, severity, title, summary, trigger_data, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, false)`,
        [
          robotId,
          typeMap[alert.category] || 'partnership',
          alert.severity,
          alert.headline,
          alert.summary,
          JSON.stringify({
            source: alert.sourceName,
            sourceUrl: alert.sourceUrl,
            confidence: alert.confidence,
            collectedAt: new Date().toISOString(),
          }),
        ]
      );
      insertedCompAlerts++;
    }

    // Insert into ci_staging for review
    for (const alert of alerts) {
      const dup = await client.query(
        `SELECT id FROM ci_staging WHERE payload->>'headline' = $1`,
        [alert.headline]
      );
      if (dup.rows.length > 0) continue;

      await client.query(
        `INSERT INTO ci_staging (update_type, payload, source_channel, status, created_at)
         VALUES ($1, $2, 'auto_scan', 'pending', NOW())`,
        [
          alert.category,
          JSON.stringify({
            competitorSlug: alert.competitorSlug,
            layerSlug: alert.layerSlug,
            headline: alert.headline,
            summary: alert.summary,
            confidence: alert.confidence,
            sourceName: alert.sourceName,
            sourceUrl: alert.sourceUrl,
            collectedAt: '2026-11-10',
          }),
        ]
      );
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  ARGOS CI War Room Update Complete');
    console.log('========================================');
    console.log(`  Date: 2026-11-10`);
    console.log(`  ci_monitor_alerts  : ${insertedAlerts} inserted, ${skippedAlerts} skipped (duplicate)`);
    console.log(`  competitive_alerts : ${insertedCompAlerts} inserted`);
    console.log(`  ci_staging         : ${insertedAlerts} inserted`);
    console.log(`  Total collected    : ${alerts.length} items`);
    console.log('========================================\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
