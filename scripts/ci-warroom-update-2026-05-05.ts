#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-05
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-05.ts
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

// ── Collected Intelligence Data (2026-05-05) ──────────────────

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
    headline: 'Tesla ends Model S/X production at Fremont in May 2026, begins Optimus line conversion',
    summary: 'Last Model S and X rolled off Fremont line in early May 2026. Disassembly of existing line already underway. Optimus pilot production targeted for late July/August — a 4-month conversion timeline. Initial output will be "quite slow" with simple factory skills.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus V3 reveal delayed to late July 2026, coinciding with production start',
    summary: 'Optimus V3 unveil originally expected Q1 2026 pushed again. Musk stated V3 reveal will coincide with Fremont production start in late July to early August. No production volume target given for 2026.',
    sourceName: 'Electrek / Basenor',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Tesla Giga Texas North Campus: $5-10B investment for 5.2M sqft Optimus facility',
    summary: 'Permit documents reveal Tesla seeking to add over 5.2 million sqft of new building space at Giga Texas North Campus by end of 2026. Estimated $5-10B construction investment. Second-gen production line targeting 10M robots/year starting 2027.',
    sourceName: 'The Robot Report / Teslarati',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Atlas begins industrial deployment at Hyundai HMGMA Savannah, Georgia',
    summary: 'Boston Dynamics has begun the industrial deployment of production Atlas at Hyundai Motor Group Metaplant America (HMGMA) in Savannah, GA. Serves as blueprint for RMAC validation hub. AI models trained on manufacturing data targeting 99.9% reliability.',
    sourceName: 'Financial Content / Big Spring Herald',
    sourceUrl: 'https://business.bigspringherald.com/bigspringherald/article/tokenring-2026-1-21-industrial-evolution-boston-dynamics-electric-atlas-reports-for-duty-at-hyundais-georgia-metaplant',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Hyundai announces $26B US investment including 30,000-robot/year production factory',
    summary: 'Hyundai Motor Group announced $26 billion investment in U.S. operations including plans to build a new robotics factory capable of producing 30,000 robots per year. Atlas production specs: custom electric direct-drive actuators with 220 Nm/kg torque density.',
    sourceName: 'Automate.org / Hyundai',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Figure AI ──
  {
    headline: 'Figure BotQ factory achieves 1 robot per hour: 350+ Figure 03 units produced',
    summary: 'BotQ factory ramped from 1 Figure 03/day to 1/hour — a 24x throughput improvement in under 120 days. Over 350 Figure 03 units delivered. Custom software and 150+ networked workstations. CEO claims 1 robot every 90 minutes by April 2026.',
    sourceName: 'eWeek / Figure AI',
    sourceUrl: 'https://www.eweek.com/news/figure-03-humanoid-robot-production-helix-ai/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 specs finalized: 5\'8", 61kg, 20kg payload, 5hr battery with wireless charging',
    summary: 'Figure 03 stands 5\'8" tall, weighs 61kg, carries 20kg payloads at 1.2 m/s walking speed. Runs 5 hours on swappable 2.3 kWh battery with wireless inductive charging. Redesigned from ground up for mass manufacturing and home environments.',
    sourceName: 'Figure AI Official',
    sourceUrl: 'https://www.figure.ai/news/introducing-figure-03',
    competitorSlug: 'figure',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },
  {
    headline: 'Figure AI total funding reaches $1.9B at $39B valuation, targeting 100K robots over 4 years',
    summary: 'Total funding exceeds $1.9B. BotQ manufacturing facility operational, targeting 12,000 units annual capacity scaling to 100,000 robots over four years. Commercial deployments active with BMW (Spartanburg) and reportedly UPS.',
    sourceName: 'TechFundingNews / Sacra',
    sourceUrl: 'https://techfundingnews.com/figure-ai-to-grab-1-5b-funding-at-39-5b-valuation-eyes-to-produce-100000-robots-what-about-competition/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree G1 demonstrates roller skating, ice skating, and flips in April 2026 demo',
    summary: 'April 23 demo shows G1 gliding on roller skates and ice skates while performing front flips and single-leg spins. Hybrid design allows switching between walking and rolling. Demonstrates advanced balance control previously unseen in humanoid robots.',
    sourceName: 'eWeek / Interesting Engineering',
    sourceUrl: 'https://www.eweek.com/news/chinese-unitree-g1-humanoid-robot-skates-spins-flips-apac/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'Unitree IPO accepted for Shanghai STAR Market: $610M listing, 335% revenue growth',
    summary: 'Unitree IPO application accepted for Shanghai STAR Market. $610M listing planned for mid-2026 — first publicly traded Chinese humanoid robotics company. Revenue grew 335% YoY to ¥1.708B in 2025. Targets 20,000 humanoid shipments in 2026.',
    sourceName: 'KraneShares / TrendForce',
    sourceUrl: 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility developing next-gen Digit: 50 lb payload, ISO functional safety certification',
    summary: 'Next-generation Digit in development with payload capacity up to 50 lb (22.6 kg) and improved battery life. ISO functional safety certification targeted for mid-to-late 2026 — would make Digit the first humanoid cleared for cooperative work alongside humans with no physical barriers.',
    sourceName: 'Agility Robotics',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Digit surpasses 100,000 totes moved in commercial deployment, passes OSHA safety inspection',
    summary: 'Digit passed OSHA-recognized safety field inspection at an ecommerce customer fulfillment site (Nov 2025). Surpassed 100,000 totes moved in commercial operations. Fortune 500 customers now include GXO, Schaeffler, Amazon, Toyota, and Mercado Libre.',
    sourceName: 'Agility Robotics Official',
    sourceUrl: 'https://www.agilityrobotics.com/about/press',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik hires executive "dream team" from Waymo, Boston Dynamics, Amazon ahead of new robot reveal',
    summary: 'Apptronik poached veteran leadership from Waymo, Boston Dynamics, and Amazon to steer transition from pilot programs to mass-market commercialization. New robot set to debut in 2026. Commercial-scale Apollo deployment targeted for H2 2026.',
    sourceName: 'Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/apptronik-raids-tech-giants-for-executive-dream-team-ahead-of-new-robot-reveal',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X opens NEO Factory in Hayward, CA: America\'s first vertically integrated humanoid factory',
    summary: '1X NEO Factory opened April 30, 2026 in Hayward, California. 58,000 sqft facility with 200+ employees. America\'s first vertically integrated humanoid robot factory. Designs and manufactures motors, batteries, structures, transmission, sensors in-house.',
    sourceName: 'GlobeNewsWire / Bloomberg',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X NEO sold out 10,000 first-year capacity in 5 days, consumer shipments begin 2026',
    summary: 'Pre-orders launched Oct 28, 2025 and sold out entire first-year capacity (10,000+ units) in 5 days. Early Access: $20,000 with priority delivery in 2026. Subscription model: $499/month. Larger San Carlos facility planned for 100,000 units by 2027.',
    sourceName: 'TechFundingNews / Bloomberg',
    sourceUrl: 'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot declares 2026 "Deployment Year One" — 10,000th robot rolled out March 2026',
    summary: 'AGIBOT declared 2026 "Deployment Year One" at APC 2026. 10,000th robot rolled out in March — production accelerated from 1K to 5K to 10K in just 3 months (4x acceleration). Deployed across logistics, retail, hospitality, education, and manufacturing.',
    sourceName: 'PR Newswire / Robotics Tomorrow',
    sourceUrl: 'https://www.prnewswire.co.uk/news-releases/agibot-declares-2026-deployment-year-one--at-apc-2026-accelerating-the-era-of-embodied-ai-productivity-302746181.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Agibot unveils GO-2 ViLLA Foundation Model and SOP distributed learning system',
    summary: 'April 2026: Introduced 8 foundational AI products under "One Robotic Body, Three Intelligences" architecture. GO-2 (ViLLA) enables long-horizon task performance with Action Chain-of-Thought. SOP system allows fleet-wide continuous learning from real operations.',
    sourceName: 'PR Newswire / Agibot',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'TrendForce: Unitree and Agibot projected to capture ~80% of global humanoid market in 2026',
    summary: 'TrendForce projects China\'s humanoid robot output to surge 94% in 2026. Unitree and Agibot together expected to capture nearly 80% of total shipments. Morgan Stanley doubled 2026 China sales forecast to 28,000 units.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
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
            collectedAt: '2026-05-05T09:00:00Z',
          }),
        ]
      );
      insertedCompAlerts++;
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  ARGOS CI War Room Update Complete');
    console.log('========================================');
    console.log(`  Date: 2026-05-05`);
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
