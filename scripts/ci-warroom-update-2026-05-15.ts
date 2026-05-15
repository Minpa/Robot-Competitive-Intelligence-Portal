#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-15
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-15.ts
 *
 * This script inserts newly collected competitive intelligence data
 * into ci_monitor_alerts and competitive_alerts tables.
 * Deduplication is handled by checking existing headlines.
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-15) ──────────────────

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
    headline: 'Tesla Optimus V3 production lines being installed at Fremont with 10,000 unique parts per robot',
    summary: 'First-generation Optimus production lines are being installed at Fremont factory as of May 2026. V3 robot expected to be revealed late July/August 2026. Each Optimus has 10,000 unique parts across an entirely new production line, making initial output "quite slow" per Elon Musk.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Giga Texas Optimus factory foundation work progressing rapidly — May 13 drone footage confirms',
    summary: 'Drone footage from May 13, 2026 shows simultaneous construction across four major sites at Giga Texas Austin campus, including the E Advanced Chip Fab and foundation work for the dedicated Optimus robot manufacturing facility. Second factory targets summer 2027 production start.',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-optimus-factory-site-texas/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Tesla Optimus Gen 3: 37 DOF, 0.08mm hand positioning accuracy, 24-hour continuous operation',
    summary: 'Optimus Gen 3 showcased at AWE 2026 Shanghai features 37 degrees of freedom with hand positioning accuracy of 0.08mm, capable of continuous operation for up to 24 hours. Tesla calls it its first mass-production ready humanoid robot.',
    sourceName: 'China Robotics Daily / BotInfo',
    sourceUrl: 'https://botinfo.ai/articles/tesla-optimus',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics partners with Google DeepMind to integrate foundation models into Atlas',
    summary: 'Boston Dynamics announced a new partnership with Google DeepMind to integrate cutting-edge foundation models into Atlas for greater cognitive capabilities. This positions Atlas to advance beyond pre-programmed tasks into more generalized reasoning and adaptation.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Hyundai announces $26B US investment including 30,000-unit/year Atlas robotics factory by 2028',
    summary: 'Hyundai Motor Group announced a $26 billion investment in U.S. operations, including plans to build a robotics factory capable of producing 30,000 Atlas robots per year. Atlas will be deployed at the Hyundai Motor Group Metaplant America (HMGMA) in Georgia by 2028 for sequencing tasks.',
    sourceName: 'New Atlas / Hyundai Motor Group',
    sourceUrl: 'https://newatlas.com/ai-humanoids/boston-dynamics-production-atlas-hyundai/',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 production reaches 1 robot/hour — 24x throughput improvement in 120 days at BotQ',
    summary: 'Figure AI scaled Figure 03 production from 1 per day to 1 per hour, a 24x throughput improvement in under 120 days. CEO Brett Adcock confirmed 55 robots/week output. Monthly shipments doubling: ~60 (Feb) → ~120 (Mar) → ~240 (Apr). Over 350 Figure 03 units produced total.',
    sourceName: 'Figure AI / The AI Insider',
    sourceUrl: 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure AI Series C exceeds $1B at $39B valuation — NVIDIA, Intel Capital, Qualcomm participate',
    summary: 'Figure AI surpassed $1 billion in committed Series C funding at $39 billion post-money valuation. Led by Parkway Venture Capital with participation from NVIDIA, Intel Capital, Qualcomm Ventures, and Salesforce. Funds target BotQ production scaling, GPU infrastructure for Helix AI training.',
    sourceName: 'Figure AI / Sacra',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 System 0 AI enables autonomous stair/ramp/uneven terrain navigation via onboard vision',
    summary: 'Figure introduced perception-conditioned whole-body control for System 0 AI, enabling Figure 03 to autonomously navigate stairs, ramps, and uneven terrain using onboard stereo cameras without task-specific programming. 9,000+ actuators produced with 99.3% battery yield.',
    sourceName: 'Figure AI',
    sourceUrl: 'https://www.figure.ai/news',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree unveils GD01 mecha — world\'s first production manned mecha at $574K, May 12 2026',
    summary: 'Unitree unveiled GD01 on May 12, 2026: 2.7m tall piloted mecha, world\'s first production-ready manned mecha robot. Priced from CNY 3.9M (~$574K). Features bipedal walking and quadruped crawling modes with pilot cockpit. Founder Wang Xingxing demonstrated it smashing bricks.',
    sourceName: 'The Next Web / CnEVPost',
    sourceUrl: 'https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree CSAC mandatory IPO inspection on April 1 — standard process, not targeted regulatory concern',
    summary: 'China\'s CSAC randomly selected Unitree for mandatory on-site IPO inspection on April 1, 2026, 12 days after STAR Market application acceptance. Analysts confirm this is standard process (CASIC Space also selected simultaneously), not indicative of targeted regulatory concern.',
    sourceName: 'Rest of World / RobotToday',
    sourceUrl: 'https://robottoday.com/article/unitree-s-ipo-review-what-it-means-for-china-s-humanoid-robot-ipo-landscape',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'regulation',
    severity: 'info',
  },
  {
    headline: 'Unitree targets 10,000–20,000 humanoid shipments in 2026, up from 5,500 in 2025',
    summary: 'After shipping 5,500+ humanoid robots in 2025 (32.4% global market share), Unitree targets 10,000–20,000 humanoid shipments in 2026. The company dominates with 70% of global quadruped sales (23,700+ units in 2024). IPO filing targets $7B valuation.',
    sourceName: 'KraneShares / SCMP',
    sourceUrl: 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Toyota Canada signs commercial agreement for 7 Digit robots at TMMC Woodstock plant',
    summary: 'Toyota Motor Manufacturing Canada (TMMC) signed a commercial agreement with Agility Robotics in February 2026. Seven Digit robots allocated under a Robots-as-a-Service model at Woodstock plant, joining GXO, Schaeffler, and Amazon as Fortune 500 Digit customers.',
    sourceName: 'TechCrunch / Agility Robotics',
    sourceUrl: 'https://techcrunch.com/2026/02/19/toyota-hires-seven-agility-humanoid-robots-for-canadian-factory/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Digit passes OSHA-recognized safety field inspection at live warehouse — industry first for humanoids',
    summary: 'Agility Robotics\' Digit successfully passed an OSHA-recognized safety field inspection at an ecommerce customer\'s fulfillment site, marking the first time a commercial humanoid has met rigorous U.S. occupational safety standards in a live warehouse environment.',
    sourceName: 'Agility Robotics / RoboZaps',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'critical',
  },
  {
    headline: 'Digit deadlifts 29 kg in lab test, April 2026 — demonstrating enhanced full-body coordinated control',
    summary: 'In April 2026, Digit deadlifted 29 kg in a lab test demonstrating coordinated full-body control and improved stability for industrial tasks. Next-gen Digit expected with 50 lb payload, improved battery life, and enhanced manipulation capabilities.',
    sourceName: 'VnExpress / Agility Robotics',
    sourceUrl: 'https://e.vnexpress.net/news/tech/tech-news/us-humanoid-robot-digit-deadlifts-29-kg-5065835.html',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik raises $520M at $5B valuation — Series A extended to $935M total, B Capital & Google co-lead',
    summary: 'Apptronik raised $520M in funding at $5B valuation, extending Series A to $935M total. B Capital (chaired by Howard Morgan) and Google co-led. Funds target Austin expansion, new California office, and Apollo production scale-up for commercial deployment.',
    sourceName: 'CNBC / SiliconANGLE',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Apptronik-Jabil manufacturing partnership advances Apollo mass production capabilities',
    summary: 'Apptronik\'s partnership with Jabil, the global electronics manufacturing giant, continues to advance Apollo production. Jabil leverages its supply chain expertise to scale production. Combined with Mercedes-Benz and GXO pilots, this positions Apollo for H2 2026 commercial-scale deployment.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/apptronik-collaborates-with-jabil-to-produce-apollo-humanoid-robots/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'info',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO sells out entire first-year production (10,000+ units) in 5 days after launch',
    summary: '1X Technologies sold out its entire first-year NEO production capacity (over 10,000 units) in just five days after the October 28, 2025 launch. NEO Factory in Hayward spans 58,000 sq ft with 200+ employees and a 4-week CAD-to-robot iteration cycle.',
    sourceName: 'Bloomberg / GlobeNewsWire',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-04-30/humanoid-maker-1x-opens-us-factory-plans-to-make-10-000-home-robots-this-year',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: '1X building second factory in San Carlos, targeting 100,000 NEO units/year by end 2027',
    summary: '1X Technologies is building a second factory in San Carlos, California to scale production to 100,000 NEO units per year by end of 2027. First consumer shipments planned for 2026 from Hayward factory. NEO priced at $20,000 or $499/month subscription.',
    sourceName: 'Interesting Engineering / 1X',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/1x-humanoid-robot-neo-factory-california',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'info',
  },

  // ── Agibot ──
  {
    headline: 'Agibot declares 2026 "Deployment Year One" at APC 2026 — unveils 5 new hardware platforms',
    summary: 'At APC 2026 in April, AGIBOT CEO Edward Deng declared 2026 "Deployment Year One." Unveiled 5 new platforms: A3 humanoid (173cm/55kg, 10hr endurance, 10-sec battery swap), G2 Air mobile manipulator, D2 Max all-terrain quadruped. Eight foundational AI models under "One Body, Three Intelligences" architecture.',
    sourceName: 'PR Newswire / Humanoids Daily',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-declares-2026-deployment-year-one--at-apc-2026-accelerating-the-era-of-embodied-ai-productivity-302746171.html',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Agibot G2 achieves 99.9% success rate at 310 units/hour on Longcheer Technology production line',
    summary: 'AGIBOT G2 humanoid robots operating on live Longcheer Technology tablet production line achieve 99.9% success rate at 310 units/hour output in 24/7 production cycles. Plans to scale to 100 robots by Q3 2026 and expand into automotive, semiconductors, and energy.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Agibot signs global partnerships: Whale Cloud (Alibaba), Genting Malaysia, Singtel RaaS',
    summary: 'AGIBOT signed strategic partnerships with Whale Cloud (Alibaba subsidiary) for global deployment in 150+ markets, Genting Malaysia for Resorts World Genting hospitality integration, and Singtel for 5G-based Robots-as-a-Service (RaaS) in Singapore.',
    sourceName: 'PR Newswire / Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/deployment-year-one-agibot-unveils-massive-fleet-and-ai-model-stack-at-apc-2026',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot A3 humanoid specs: 173cm, 55kg, 10hr endurance, UWB centimeter-level swarm positioning',
    summary: 'AGIBOT A3: 173cm height, 55kg weight, uses lightweight magnesium/titanium/TPU materials at 0.218 kW/kg power-to-weight ratio. Features 10-hour ultra-long endurance, 10-second battery swap, UWB centimeter-level swarm positioning for synchronized 100-robot performances, shoulder tactile sensing, 360° multi-array microphones.',
    sourceName: 'Engineering.com / Agibot',
    sourceUrl: 'https://www.engineering.com/agibot-introduces-five-robotic-platforms-and-eight-ai-models/',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },
];

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Build lookup maps
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

    // 2. Insert ci_monitor_alerts (dedup by headline)
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

    // 3. Insert competitive_alerts for critical/warning severity items
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
    let insertedCompAlerts = 0;

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

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  ARGOS CI War Room Update Complete');
    console.log('========================================');
    console.log(`  Date: 2026-05-15`);
    console.log(`  ci_monitor_alerts  : ${insertedAlerts} inserted, ${skippedAlerts} skipped (duplicate)`);
    console.log(`  competitive_alerts : ${insertedCompAlerts} inserted`);
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
