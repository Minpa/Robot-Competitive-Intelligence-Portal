#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-11-11
 * Previous update: 2026-11-10
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-11-11.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-11-11) ──────────────────

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
  // ── Agibot ──
  {
    headline: 'Agibot G2 completes 24-hour convenience store trial in Shanghai — 6 robots, 1,730 tasks, 4 of 6 pass (Nov 2-3)',
    summary: 'AGIBOT ran "Robots Never Clock Out" — a 24-hour livestreamed trial at an operating convenience store in Shanghai Xuhui (Nov 2-3). Six G2 wheeled humanoids collectively completed 1,730 tasks including stocking shelves, making coffee, cleaning, and customer interaction. Four of six passed the company\'s performance criteria; two assigned to cleaning and shelf inspection failed. Livestream drew 2M+ viewers. No detailed task log or failure rate published. Previous G2 trial at Longcheer factory reported 99.99% success rate (different context: controlled factory vs. open retail).',
    sourceName: 'GlobeNewsWire / Interesting Engineering / Gadget Review / Magica',
    sourceUrl: 'https://globenewswire.com/news-release/2026/11/08/3398006/0/en/six-agibot-g2-robots-complete-1-730-tasks-in-24-hour-shanghai-convenience-store-trial.html',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Agibot A3 and PrimeBOT Q1 registered as official speakers at Web Summit 2026 Lisbon (Nov 9-10)',
    summary: 'Forbes reports Agibot\'s A3 Ultra full-size humanoid and PrimeBOT Q1 were registered as official speakers at Web Summit 2026 in Lisbon (opened Nov 9). Agibot CEO publicly criticized competitors (Tesla, Figure, Unitree) on deployment claims. Agibot previously announced 20,000th cumulative robot shipped (Sep 2026). GO-3 Preview and Worken productivity framework introduced at Innovation Day (late Oct).',
    sourceName: 'Forbes / Web Summit',
    sourceUrl: 'https://www.forbes.com/sites/johnkoetsier/2026/11/10/robot-trash-talk-at-web-summit-as-agibot-disses-tesla-figure-unitree/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'demo',
    severity: 'info',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility S-1 filing reveals $174K revenue and $361.9M net loss for H1 2026 (filed Nov 10)',
    summary: 'Agility Robotics S-1 filing (Nov 10) discloses H1 2026 financials: total net sales $174,000, net loss $361.9M. Company began trading Nov 5 as AGLT at $11.51, dropped to $8.78 by Nov 9 (12.2% below $10 PIPE price). Management presenting at Cantor Convergence (Nov 11-12) and RBC Global Industrials (Nov 17). $2.5B pre-money valuation, ~$465M gross proceeds from SPAC merger.',
    sourceName: 'FourWeekMBA / Digitimes / SEC Filing',
    sourceUrl: 'https://fourweekmba.com/ai-agility-lost-361-9m-on-174k-in-sales-before-its-listing',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },
  {
    headline: 'Agility-GXO expand Digit deployment to 2 new US sites: Statesville NC and Lebanon TN (Oct 26)',
    summary: 'GXO and Agility announced (Oct 26) Digit humanoids will deploy to two additional GXO sites — Statesville, North Carolina and Lebanon, Tennessee. Operations expected early 2027 using Digit 4, transitioning to Digit 5. Georgia site has moved 100,000+ totes since June 2024 multi-year commercial agreement. Pipeline now 30+ prospective customers.',
    sourceName: 'GXO / SupplyChain247 / Robotics & Automation News',
    sourceUrl: 'https://mfn.se/all/a/gxo-logistics-inc/gxo-and-agility-robotics-expand-partnership-to-accelerate-deployment-of-humanoids-in-u-s-operations-d1cb6bba',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree stock surges 15%+ intraday, market cap reclaims RMB 300B (~$42B) on Nov 9',
    summary: 'Unitree Robotics shares jumped over 15% intraday on Nov 9 (STAR Market), reclaiming RMB 300 billion market cap (~$42B). Nine-month gross margin ~54% (down 5.7pp YoY). R&D and selling expenses both up 100%+. Strong retail/institutional interest in humanoid robotics theme following Agility US listing and sector momentum.',
    sourceName: 'Gasgoo AutoNews',
    sourceUrl: 'https://autonews.gasgoo.com/articles/news/unitree-robotics-rises-over-15-intraday-market-cap-reclaims-rmb-300-billion-2120034024957059072',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'info',
  },
  {
    headline: 'NVIDIA GR00T 2 Turbo runs directly on Unitree G1 via onboard Jetson Thor — 124ms per prediction',
    summary: 'NVIDIA\'s GR00T 2 Turbo robot learning framework runs directly on Unitree G1 using onboard Jetson Thor processor. Each prediction takes 124ms. Apple\'s open-sourced HALO autonomy system also tested on G1 with reported 91% individual task success rate. G1 emerging as default third-party humanoid testbed for major AI labs.',
    sourceName: 'Interesting Engineering / NVIDIA',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/nvidia-groot-2-human-robot-skill-transfer',
    competitorSlug: 'unitree',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics appoints Rohit Prasad (ex-Amazon Alexa/AGI SVP) as CEO effective Oct 7, 2026',
    summary: 'Rohit Prasad named Boston Dynamics CEO effective Oct 7 (announced Oct 6). Succeeds interim CEO Amanda McMaster (CFO) who served since Robert Playter left Feb 2026. Prasad was Amazon SVP/Head Scientist for Alexa and AGI, credited with Amazon Nova foundation models. Third CEO after founder Marc Raibert (1992-2020) and Playter. Appointment signals Hyundai\'s push toward physical AI commercialization. Board seat pending approval.',
    sourceName: 'Robotics 24/7 / AI Magazine / The Robot Report / Engineering.com',
    sourceUrl: 'https://www.robotics247.com/article/boston-dynamics-names-rohit-prasad-as-new-ceo',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI all-hands reveals 37.5M video training dataset and $3.5B+ Nscale/Vera Rubin compute deal for 2027',
    summary: 'Figure AI late-October all-hands meeting details emerged: training data collection reached 37.5M videos. $3.5B compute contract with Nscale planned for NVIDIA Vera Rubin hardware in 2027 (previously reported at $3.5B, sources now cite $6B+ expanded scope). Helix 2.5 model tested in 30 unfamiliar homes. Adcock described recent internal test as "among the most important moments" of his robotics career. Figure 04 in assembly/testing phase.',
    sourceName: 'Sina Finance / cnyes / The Decoder',
    sourceUrl: 'https://finance.sina.cn/stock/jdts/2026-10-30/detail-iniwzazq5519887.d.html',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Google DeepMind Gemini Robotics 2.5 achieves 96% success rate sorting metal parts with Apollo at Mercedes-Benz',
    summary: 'Google DeepMind\'s Gemini Robotics 2.5 tested with Apptronik Apollo 2 at Mercedes-Benz production lines in Hungary and Germany. Apollo 2 sorted metal parts from bins into assembly trays at 96% success rate. First disclosed metric for DeepMind-Apptronik partnership performance. Robot Park (Austin, 90,000 sqft) continues data collection feeding Gemini Robotics models. Apollo 3 targeted 2027.',
    sourceName: 'The Decoder / AI Business',
    sourceUrl: 'https://the-decoder.com/google-deepminds-gemini-robotics-2-5-scores-96-percent-sorting-metal-parts-in-a-mercedes-benz-assembly-pilot/',
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'partnership',
    severity: 'info',
  },

  // ── Tesla Optimus ──
  {
    headline: 'Tesla Optimus — no major new developments since Nov 10; rental model and Fremont production continue as reported',
    summary: 'No new Tesla Optimus announcements since Nov 10 update. Prior status: Musk confirmed rental model (Nov 6 Baron Conference), build cost ~$30K targeting $20K. Fremont high-volume line active, 20K/week target at least 1 year out. External sales 2027 H2. Forbes analysis (Nov 10) notes productivity claims require qualification. Gen 3 + AI5 chip 2027/Q1.',
    sourceName: 'Forbes / Not a Tesla App',
    sourceUrl: 'https://www.forbes.com/sites/robertszczerba/2026/11/10/tesla-may-rent-optimus-your-next-coworker-could-be-a-subscription/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'info',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO — no new developments since Nov 10; delivery status still unconfirmed, full production claimed since April 2026',
    summary: 'No new 1X Technologies announcements since Nov 10 update. Prior status: full-scale production at Hayward CA since April 2026. No independently verified customer home delivery as of early Nov 2026. Fortune review noted all WSJ test tasks were teleoperated by "Turing" operators. $20K Early Access or $499/month subscription. EQT 10K-unit deal (2026-2030). San Carlos second facility planned for 100K/year by end 2027.',
    sourceName: 'eWeek / Heise / The Robot Report',
    sourceUrl: 'https://www.eweek.com/news/1x-neo-humanoid-home-robot-2026/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'C',
    category: 'mass_production',
    severity: 'info',
  },

  // ── Cross-industry ──
  {
    headline: 'Gumi (South Korea) officials tour Agibot Shanghai factory — exploring humanoid manufacturing expansion',
    summary: 'South Korean delegation from Gumi city toured Agibot\'s outsourced robot production plant in Shanghai. Part of broader effort to expand Gumi\'s manufacturing base into humanoid robotics. Gumi is a major Korean manufacturing hub. Signals growing Korean government interest in humanoid robotics supply chain beyond Hyundai/BD.',
    sourceName: 'Seoul Economic Daily',
    sourceUrl: 'https://en.sedaily.com/society/2026/11/10/gumi-officials-tour-chinas-robot-hubs-to-expand',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'C',
    category: 'partnership',
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
            collectedAt: '2026-11-11',
          }),
        ]
      );
      insertedCompAlerts++;
    }

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
            collectedAt: '2026-11-11',
          }),
        ]
      );
    }

    // Update ci_freshness
    await client.query(`
      UPDATE ci_freshness
      SET last_verified = '2026-11-11'::timestamp,
          next_review = '2026-11-18'::timestamp
      WHERE competitor_id IN (SELECT id FROM ci_competitors WHERE is_active = true)
    `);

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  ARGOS CI War Room Update Complete');
    console.log('========================================');
    console.log(`  Date: 2026-11-11`);
    console.log(`  ci_monitor_alerts  : ${insertedAlerts} inserted, ${skippedAlerts} skipped (duplicate)`);
    console.log(`  competitive_alerts : ${insertedCompAlerts} inserted`);
    console.log(`  ci_staging         : ${insertedAlerts} inserted`);
    console.log(`  ci_freshness       : updated for all active competitors`);
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
