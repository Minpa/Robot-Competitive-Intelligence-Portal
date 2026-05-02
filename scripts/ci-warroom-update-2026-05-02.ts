#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-02
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-02.ts
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

// ── Collected Intelligence Data (2026-05-02) ──────────────────

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
    headline: 'Tesla confirms Optimus production at Fremont starting late July 2026 (Q1 earnings call)',
    summary: 'During Q1 2026 earnings call, Musk confirmed Optimus pilot line starting late July/August at Fremont after last Model S/X rolls off in early May. Pilot line targets 1M units/year capacity. Over 10,000 unique components, none previously mass-produced.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus V3 reveal delayed again — now targeting mid-2026',
    summary: 'Gen 3 reveal originally expected Q1 2026 pushed to "probably middle of this year." Musk cited secrecy concerns: "competitors will analyze it frame by frame and copy everything we do." Increased operational secrecy around Optimus development.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Tesla commits $25B CapEx in 2026 for AI, robotaxi, and Optimus robotics',
    summary: 'Tesla announced $25B capital expenditure plan for 2026, covering AI infrastructure, robotaxi fleet, and Optimus humanoid robot production. Includes $5-10B estimated construction investment for 5.2M sqft expansion at Giga Texas North Campus.',
    sourceName: 'Intellectia.ai',
    sourceUrl: 'https://intellectia.ai/blog/tesla-25-billion-capex-ai-robotics-2026',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Tesla plans public Optimus sales by end 2027 at $20K-$30K (WEF announcement)',
    summary: 'At World Economic Forum in January 2026, Musk announced plans to sell Optimus to the public by end of 2027 at $20,000-$30,000. Zero Optimus robots currently doing "useful work" in Tesla factories — significant gap between ambition and execution.',
    sourceName: 'TechRepublic',
    sourceUrl: 'https://www.techrepublic.com/article/news-tesla-optimus-robot-launch-timeline/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Hyundai commits $26B to US operations including 30K-unit/year robotics factory',
    summary: 'Hyundai Motor Group announced $26B investment in US operations, including a new robotics factory capable of producing 30,000 robots per year by 2028. Atlas units trained at RMAC will start sequencing tasks at HMGMA by 2028, with assembly operations by 2030.',
    sourceName: 'Hyundai Motor Group',
    sourceUrl: 'https://www.hyundai.com/worldwide/en/newsroom/detail/hyundai-motor-group-announces-ai-robotics-strategy-to-lead-human-centered-robotics-era-at-ces-2026-0000001100',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Boston Dynamics RMAC facility opening in 2026 — all Atlas units fully committed',
    summary: 'Hyundai Robotics Metaplant Application Center (RMAC) set to open in 2026. All Atlas production units for 2026 already fully committed to RMAC and Google DeepMind. Additional customers planned for 2027 onward.',
    sourceName: 'Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 accompanies First Lady at White House Global Coalition Summit (March 2026)',
    summary: 'Figure 03 appeared at Fostering the Future Together Global Coalition Summit at the White House in March 2026, greeting attendees in multiple languages. Demonstrates significant political visibility and government relations progress.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Figure BotQ factory achieves 24x throughput: 1 robot/hour, 350+ Figure 03 units delivered',
    summary: 'BotQ facility ramped from 1 robot/day to 1 robot/hour in under 120 days — 24x throughput increase. Over 350 Figure 03 units delivered. End-of-line first-pass yield >80%, battery line at 99.3% yield over 500 packs. 150 networked workstations with custom MES software. Targeting 50K units/year capacity.',
    sourceName: 'Figure AI / eWeek',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure 02 completes 11-month BMW deployment: 90K parts loaded, 1,250+ runtime hours',
    summary: 'Figure 02 ran daily 10-hour shifts at BMW Spartanburg for 11 months, loading 90,000+ parts across 1,250+ runtime hours, contributing to 30,000+ X3 vehicles. Pilot now expanding to Leipzig, Germany.',
    sourceName: 'Figure AI',
    sourceUrl: 'https://www.figure.ai/news',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree IPO application formally accepted by Shanghai Stock Exchange (March 20, 2026)',
    summary: 'Shanghai Stock Exchange formally accepted Unitree IPO application for STAR Market on March 20, 2026. Seeking to raise CNY 4.2B (~$608M). Revenue grew 335% YoY in 2025 to 1.708B yuan; net profit soared 674%. Humanoids now 51.5% of revenue.',
    sourceName: 'Bloomberg / CNBC',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-03-20/chinese-robot-maker-unitree-seeks-610-million-in-shanghai-ipo',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree selected for mandatory IPO inspection by China Securities Association (April 1)',
    summary: 'China\'s Securities Association randomly selected Unitree Robotics for mandatory on-site IPO inspection on April 1, 2026 — just 12 days after STAR Market application acceptance. Standard regulatory process but may affect timeline.',
    sourceName: 'Gasgoo',
    sourceUrl: 'https://autonews.gasgoo.com/articles/news/unitree-robotics-ipo-reaches-key-milestone-2036052042919866369',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'regulation',
    severity: 'info',
  },
  {
    headline: 'Unitree H2 flagship priced at $29,900 — full humanoid lineup now spans $5,900-$29,900',
    summary: 'Unitree\'s humanoid lineup: R1 ($5,900 entry-level), G1 ($13,500-$27,000 mid-range research), H2 ($29,900 full-size industrial flagship). H2 is the company\'s most capable general-purpose humanoid for industrial applications.',
    sourceName: 'KraneShares / RobotToday',
    sourceUrl: 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'info',
  },
  {
    headline: 'TrendForce: Unitree + Agibot projected to capture ~80% of 2026 humanoid shipments',
    summary: 'TrendForce projects China\'s humanoid robot output to surge 94% in 2026. Unitree and AgiBot together are projected to account for nearly 80% of total global humanoid shipments. Unitree targeting 20,000 units (3.6x increase from 2025).',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Robotics secures OSHA-recognized safety approval for Digit',
    summary: 'Agility Robotics received OSHA-recognized safety approval, widening the gap between "demo" and "deployment." Pursuing ISO 25875, a new safety standard for "dynamically stable industrial mobile manipulators" specifically for humanoid robots.',
    sourceName: 'Humanoids Daily / Automation World',
    sourceUrl: 'https://www.humanoidsdaily.com/news/agility-robotics-secures-osha-recognized-safety-approval-widening-the-gap-between-demo-and-deployment',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'critical',
  },
  {
    headline: 'Next-gen Digit targets 50lb payload, improved battery, and ISO functional safety certification',
    summary: 'Agility developing next-gen Digit with 50lb (22.6kg) payload (43% increase), improved battery life, and ISO functional safety certification — would make Digit first humanoid cleared to work alongside people with no physical barriers. Target: mid-to-late 2026.',
    sourceName: 'Automation World',
    sourceUrl: 'https://www.automationworld.com/factory/robotics/article/55303585/agility-robotics-agility-robotics-digit-shows-promise-in-line-side-operations-with-new-iso-safety-standard-on-the-horizon',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik to debut new humanoid robot in 2026, expanding beyond Apollo',
    summary: 'CEO Jeff Cardenas confirmed Apptronik will use $520M funding to expand in Austin TX, open a new California office, and debut a "highly anticipated new robot" in 2026. Signals product line expansion beyond Apollo.',
    sourceName: 'CNBC / SiliconANGLE',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X opens NEO Factory in Hayward, CA — America\'s first vertically integrated humanoid factory',
    summary: '1X opened 58,000 sqft NEO Factory in Hayward, CA on April 30, 2026. America\'s first vertically integrated humanoid robot factory. Designed for 10,000 units in year one, scaling to 100,000+ units/year by 2027. In-house motors, batteries, electronics, sensors.',
    sourceName: 'Bloomberg / eWeek',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-04-30/humanoid-maker-1x-opens-us-factory-plans-to-make-10-000-home-robots-this-year',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X sells out entire first-year NEO production (10K+ units) in 5 days',
    summary: 'On October 28, 2025, 1X launched NEO to the world and sold out its entire first-year production capacity (10,000+ units) in just 5 days. Available at $20,000 Early Access or $499/month subscription. Three colors: Tan, Gray, Dark Brown.',
    sourceName: 'The Next Web / Digital Trends',
    sourceUrl: 'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'NEO powered by NVIDIA Jetson Thor — "robots building robots" initiative live',
    summary: 'NEO runs on NVIDIA Jetson Thor onboard computing and is trained using NVIDIA Isaac simulation framework. NEO units already working inside Hayward factory, handling logistics and stocking parts for human technicians — "robots building robots."',
    sourceName: 'Digital Trends / 1X',
    sourceUrl: 'https://www.digitaltrends.com/cool-tech/1x-shows-off-neo-humanoid-robot-helping-humans-make-more-of-its-kind/',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Agibot ──
  {
    headline: 'Agibot rolls out 10,000th humanoid robot — from 1K to 10K in 15 months',
    summary: 'Agibot surpassed 10,000-unit mark on March 28, 2026. Output climbed from 1,000 to 5,000 between Jan-Dec 2025, then from 5,000 to 10,000 by March 2026. Revenue surged 20x from 60M to 1.05B yuan in 2025.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Agibot declares 2026 "Deployment Year One" at APC 2026, unveils 4 new platforms + 8 AI models',
    summary: 'At 2026 Partner Conference (April 17), Agibot declared 2026 as "Deployment Year One." Unveiled AGIBOT A3 (173cm, 55kg, 10hr endurance) and three other platforms. Introduced 8 foundation models: GO-2 (ViLLA), GE-2 (World Action Model), Genie Sim 3.0.',
    sourceName: 'PR Newswire / Agibot',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Agibot "358" plan: targets 10B yuan revenue by 2027, 100B yuan by 2030',
    summary: 'Agibot\'s "358" strategic plan targets 10 billion yuan revenue by 2027 and 100 billion yuan by 2030. Currently at 1.05B yuan (2025). Partnership with Minth Group (78 factories worldwide) for European expansion — factories serve as real-world training grounds.',
    sourceName: 'Gasgoo',
    sourceUrl: 'https://autonews.gasgoo.com/articles/news/from-60-million-to-105-billion-to-a-100-billion-target-is-agibots-358-plan-ambition-or-a-bubble-2046210816838205440',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
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
            collectedAt: '2026-05-02T00:00:00.000Z',
          }),
        ]
      );
      insertedCompAlerts++;
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  ARGOS CI War Room Update Complete');
    console.log('========================================');
    console.log(`  Date: 2026-05-02`);
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
