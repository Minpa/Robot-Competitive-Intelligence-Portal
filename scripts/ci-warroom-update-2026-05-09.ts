#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-09
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-09.ts
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

// ── Collected Intelligence Data (2026-05-09) ──────────────────

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
    headline: 'Tesla begins Fremont factory conversion for Optimus Gen 3 production line (May 2026)',
    summary: 'Tesla initiated a four-month conversion of its Fremont Model S/X production lines in early May 2026. Optimus Gen 3 production targeted for late July/August 2026. Initial output expected to be low-volume with 10,000 unique parts per robot. Long-term target: 1M units/year, with Giga Texas second-gen line targeting 10M units/year.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla invests $2B in xAI for Optimus AI algorithm development',
    summary: 'Tesla invested $2 billion in Musk\'s xAI to advance core algorithms for autonomous driving and humanoid robots. Deep strategic partnership to accelerate Optimus cognitive capabilities. Digital Optimus (Macrohard) AI agent project also announced.',
    sourceName: 'Teslarati / Multiple',
    sourceUrl: 'https://www.teslarati.com/tesla-xai-digital-optimus-explained/',
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Optimus Gen 3 specs: 37 DOF, 0.08mm hand accuracy, 24hr operation, Dojo chip AI',
    summary: 'Third-generation Optimus features 37 degrees of freedom, hand positioning accuracy of 0.08mm, capable of 24-hour continuous operation, and equipped with Dojo chip-powered AI enabling observational learning. Cost target under $20,000 at 1M units/year scale.',
    sourceName: 'TechRepublic / Multiple',
    sourceUrl: 'https://www.techrepublic.com/article/news-tesla-optimus-robot-launch-timeline/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Hyundai commits $26B US manufacturing investment including 30K Atlas/year robot factory',
    summary: 'Hyundai\'s $26 billion investment in US manufacturing includes a dedicated robotics factory capable of producing 30,000 Atlas units per year. All 2026 Atlas deployments are fully committed. Production started at Boston Dynamics HQ in Boston.',
    sourceName: 'Startup Fortune / Multiple',
    sourceUrl: 'https://startupfortune.com/hyundai-is-building-a-factory-to-make-30000-atlas-robots-a-year-and-the-fleet-economics-it-needs-to-justify-that-bet-are-the-most-important-numbers-in-industrial-ai/',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Atlas wins "Best Robot" at CES 2026 — CNET Group recognition',
    summary: 'Boston Dynamics Atlas won CNET Group\'s "Best Robot" award at CES 2026. Production-ready Atlas showcased with 56 DOF, 2.3m reach, 50kg lift capacity, 4hr battery with autonomous swap (<3min). First shipments to Hyundai RMAC and Google DeepMind.',
    sourceName: 'Hyundai Motor Group',
    sourceUrl: 'https://www.hyundaimotorgroup.com/en/news/CONT0000000000199186',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI ramps Figure 03 production to 1 robot/hour — 350+ units built, BotQ 12K/year capacity',
    summary: 'Figure AI increased Figure 03 production from one unit per day to one per hour in under four months, producing over 350 robots through its BotQ manufacturing facility. BotQ ramping to 12,000 units/year capacity. Figure 02 fleet retired after BMW deployment concluded.',
    sourceName: 'The AI Insider',
    sourceUrl: 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure AI Helix 02 achieves full-body autonomy — single neural system controls entire robot',
    summary: 'Helix 02, released January 2026, is a single unified visuomotor neural network controlling the full body from pixels. Three-layer architecture: S2 (reasoning), S1 (200Hz joint targets), S0 (1kHz balance/contact). Completed autonomous 4-minute dishwasher task — longest horizon autonomous humanoid task to date. May 2026: S0 now conditioned on camera perception with 3D world representation.',
    sourceName: 'Figure AI Official',
    sourceUrl: 'https://www.figure.ai/news/helix-02',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 specs: 5\'8", 61kg, 20kg payload, 5hr swappable battery, wireless charging',
    summary: 'Figure 03 stands 5\'8" (173cm), weighs 61kg, carries 20kg payloads at 1.2 m/s walking speed. Runs 5 hours on swappable 2.3kWh battery pack with wireless inductive floor pad charging. Full hardware/software redesign for mass manufacturing and home environments.',
    sourceName: 'Figure AI / Multiple',
    sourceUrl: 'https://blog.robozaps.com/b/figure-ai-review',
    competitorSlug: 'figure',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Unitree Robotics ──
  {
    headline: 'Unitree files $610M Shanghai IPO — 335% revenue growth, mid-2026 A-share listing expected',
    summary: 'Unitree filed for a $610M Shanghai IPO in March 2026, with 335% revenue growth YoY in 2025 (reaching ¥1.708 billion). Expected to become China\'s first publicly traded humanoid robotics company. Shipped 5,500+ humanoid robots in 2025, occupying 32.4% of the global humanoid market.',
    sourceName: 'CNBC / Rest of World',
    sourceUrl: 'https://www.cnbc.com/2026/03/20/unitree-plans-shanghai-ipo-testing-interest-in-humanoid-robots.html',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree G1 price drops to $16,000 base — 16 configurations available',
    summary: 'Unitree G1 humanoid robot now available from $16,000 base price (previously $17,990), with 16 different configurations ranging up to $73,900. Upending the robotics market with accessible pricing for universities, hobbyists, and small labs.',
    sourceName: 'RoboHorizon / BotInfo',
    sourceUrl: 'https://robohorizon.com/en-us/news/2026/04/unitree-g1-humanoid-drops-for-16000-upending-the-robotics-market/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree targets 20,000 humanoid shipments in 2026 — H2 and R1 models join lineup',
    summary: 'Four humanoid products: H1 (full-size), G1 (mid-size), R1 (compact), H2 (full-size general-purpose). Target 20,000 shipments in 2026, up from 5,500 in 2025. OmniXtreme control policy enables G1 backflips and breakdancing.',
    sourceName: 'eWeek / Drones Plus Robotics',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Digit pursuing ISO functional safety certification — first humanoid for barrier-free human co-work',
    summary: 'Agility is developing next-gen Digit with up to 50 lb payload and improved battery life, alongside ISO functional safety certification that would make Digit the first humanoid cleared to work cooperatively alongside people with no physical barriers. Targeted mid-to-late 2026.',
    sourceName: 'Agility Robotics / Blog',
    sourceUrl: 'https://www.agilityrobotics.com/content/digits-next-steps',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'critical',
  },
  {
    headline: 'Digit surpasses 100K totes at GXO — Toyota Canada, Mercado Libre deployments operational',
    summary: 'Digit moved over 100,000 totes at GXO Flowery Branch facility. Toyota Canada (Woodstock, 7+ units, RAV4 logistics) and Mercado Libre (San Antonio TX) commercial RaaS agreements are now operational. Fortune 500 customers: GXO, Schaeffler, Amazon, Toyota, Mercado Libre.',
    sourceName: 'Agility Robotics Official',
    sourceUrl: 'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik Apollo powered by Gemini 3 & Gemini Robotics — no retraining per environment',
    summary: 'Apollo is now powered by Google DeepMind\'s Gemini 3 and Gemini Robotics AI, enabling it to perform diverse real-world tasks without retraining for each environment. Robot can watch demonstrations, follow natural-language instructions, plan multi-step actions, and handle unfamiliar objects.',
    sourceName: 'Interesting Engineering / Multiple',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/us-startup-raises-funds-to-deploy-apollo',
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Apptronik planning new robot debut in 2026 — Austin expansion + California office',
    summary: 'Apptronik will use $935M funding to expand Austin TX HQ, open new California office, and scale Apollo production. A highly anticipated new robot set to debut in 2026. Pilots ongoing at Mercedes-Benz and GXO Logistics warehouses.',
    sourceName: 'CNBC / SiliconANGLE',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X opens NEO Factory in Hayward CA — 10K units sold out in 5 days, 100K target by 2027',
    summary: '1X Technologies opened America\'s first vertically integrated humanoid robot factory in Hayward, CA (58,000 sqft, 200+ employees) on April 30, 2026. First production batch of 10,000 units sold out within five days. Plans to scale to 100,000 units by 2027 with second plant in San Carlos.',
    sourceName: 'GlobeNewsWire / 1X Official',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'NEO specs: 66 lbs, 150 lb lift, 55 lb carry, 22dB noise, NVIDIA Jetson Thor brain',
    summary: 'NEO weighs 66 pounds, lifts over 150 lbs, carries 55 lbs. Noise level of 22dB (quieter than a refrigerator). Uses NVIDIA Jetson Thor as core of NEO Cortex brain for real-time AI inference. Priced at $20,000 or $499/month subscription.',
    sourceName: 'The Robot Report / 1X',
    sourceUrl: 'https://www.therobotreport.com/1x-begins-production-neo-humanoid-robots-at-hayward-california-facility/',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Agibot ──
  {
    headline: 'Agibot rolls out 10,000th humanoid robot — production doubled in 3 months',
    summary: 'Agibot reached 10,000th general-purpose embodied robot (Expedition A3) milestone in late March 2026. Production scaled from 1,000 to 5,000 to 10,000 units within three months. IDC ranked Agibot first in total shipment volume across entertainment, research, education, and manufacturing.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'TrendForce: China humanoid output to surge 94% in 2026 — Unitree+Agibot capture ~80% share',
    summary: 'TrendForce projects China\'s humanoid robot output to surge 94% in 2026. Unitree and Agibot expected to capture nearly 80% of market share. Agibot deploying globally: Europe, North America, Japan, South Korea, Southeast Asia, Middle East.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Agibot launches Genie Sim 3.0 simulation platform at CES 2026',
    summary: 'Agibot launched Genie Sim 3.0 robot simulation platform at CES 2026, alongside multiple "Best of CES" awards. "One Robotic Body, Three Intelligences" architecture integrating interaction, manipulation, locomotion. Operational across 8 commercial applications.',
    sourceName: 'PR Newswire',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibots-humanoid-robots-take-home-multiple-best-of-ces-2026-awards-following-us-debut-302663224.html',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Regulation / Standards (cross-cutting) ──
  {
    headline: 'ISO 25785-1 under development — dedicated safety standard for dynamically stable humanoid robots',
    summary: 'ISO working group developing ISO 25785-1, a new safety standard specifically for industrial robots requiring active control for stability (humanoids). Covers fall zone calculations, balance metrics. ISO 10218:2025 already in effect for industrial robots. Certification now covers applications, not just hardware.',
    sourceName: 'ISO / Multiple',
    sourceUrl: 'https://www.theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'warning',
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
            category: alert.category,
            collectedAt: '2026-05-09T00:00:00Z',
          }),
        ]
      );
      insertedCompAlerts++;
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  ARGOS CI War Room Update Complete');
    console.log('========================================');
    console.log(`  Date: 2026-05-09`);
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
