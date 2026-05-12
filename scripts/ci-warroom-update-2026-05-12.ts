#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-12
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-12.ts
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

// ── Collected Intelligence Data (2026-05-12) ──────────────────

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
    headline: 'Tesla pushes Optimus V3 reveal to mid-2026, aligned with Fremont production start',
    summary: 'During Q1 2026 earnings call (April 22), Elon Musk confirmed Optimus V3 reveal is pushed to closer to production start in late July/August 2026, rather than Q1 as previously planned. First-generation production lines are currently being installed at Fremont.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Hyundai plans Atlas deployment in car plants by 2028 for parts sequencing, component assembly by 2030',
    summary: 'Hyundai Motor Group outlined detailed Atlas deployment roadmap: 2028 deployment in car manufacturing plants for parts sequencing tasks, 2030 expansion to component assembly. Atlas will progressively take on repetitive motions, heavy loads, and complex operations.',
    sourceName: 'Automate.org / Hyundai Motor Group',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure BotQ factory achieves 1 robot/hour cycle time for Figure 03 mass production',
    summary: 'Figure\'s BotQ facility has successfully transitioned from prototype to production phase and demonstrated the one robot per hour cycle time needed for Figure 03 production targets. This marks the transition from R&D to scalable manufacturing.',
    sourceName: 'Figure AI',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 autonomously tidies bedroom in under 2 minutes with dual-robot coordination',
    summary: 'Figure AI released demo of two F.03 humanoid robots autonomously tidying a bedroom in under two minutes, including making a bed together without shared code for coordination. Demonstrates advanced multi-agent collaboration and household capability.',
    sourceName: 'eWeek',
    sourceUrl: 'https://www.eweek.com/news/figure-ai-humanoid-robots-bedroom-demo/',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Figure AI valuation reaches $39 billion with over $1.7B in venture funding raised',
    summary: 'Figure AI has raised over $1.7 billion in venture funding at a $39 billion valuation. Key investors include OpenAI, Microsoft, NVIDIA, Jeff Bezos, Amazon, and Intel Capital. CEO Brett Adcock targets Figure 03 "in select homes" by late 2026.',
    sourceName: 'RoboZaps / Multiple',
    sourceUrl: 'https://blog.robozaps.com/b/figure-ai-review',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree G1 ordained in Buddhist ceremony at Jogyesa Temple, South Korea — world first',
    summary: 'Unitree G1 humanoid robot participated in a Buddhist ordination ceremony at Jogyesa Temple in Seoul, South Korea on May 8, 2026 — believed to be the world\'s first religious ritual involving a robot. Highlights growing cultural acceptance and visibility of humanoid robots.',
    sourceName: 'TechNode',
    sourceUrl: 'https://technode.com/2026/05/08/south-korean-temple-ordains-chinas-unitree-g1-humanoid-robot-in-world-first-buddhist-ceremony/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'Unitree G1 deployed at Tokyo Haneda Airport with Japan Airlines for baggage handling',
    summary: 'G1 deployed for baggage and cargo handling at Tokyo Haneda Airport in partnership with Japan Airlines and GMO Internet Group. First commercial airport deployment for a humanoid robot, with trial runs planned through 2028.',
    sourceName: 'RoboHorizon',
    sourceUrl: 'https://robohorizon.com/en-us/news/2026/04/unitree-g1-humanoid-drops-for-16000-upending-the-robotics-market/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Unitree unveils G1-D variant with wheeled differential drive base for AI training data collection',
    summary: 'New G1-D variant replaces bipedal legs with a differential drive wheeled base while retaining the same upper body, arms, and manipulation capabilities. Designed specifically for data collection and AI training in environments where walking is not required.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/china-unitree-humanoid-robot',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },
  {
    headline: 'Unitree targets 20,000 humanoid robot shipments in 2026, nearly 4x the 5,500 shipped in 2025',
    summary: 'Unitree Robotics plans to ship around 20,000 humanoid robots in 2026, almost four times the 5,500 it shipped in 2025. The company reported 335% revenue growth year-over-year in 2025 (¥1.708B / ~$250M).',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Mercado Libre signs commercial agreement for Digit humanoid deployment in San Antonio, TX',
    summary: 'Mercado Libre, Latin America\'s leading commerce and fintech ecosystem, signed commercial agreement to deploy Agility Robotics\' Digit humanoid at its San Antonio, TX facility. Initial focus on commerce fulfillment tasks, with plans to explore additional logistics use cases in Latin America.',
    sourceName: 'Agility Robotics',
    sourceUrl: 'https://www.agilityrobotics.com/content/mercado-libre-and-agility-robotics-announce-commercial-agreement',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Toyota Canada deploys 7 Digit units at Woodstock RAV4 plant under Robots-as-a-Service agreement',
    summary: 'Toyota Motor Manufacturing Canada signed commercial agreement with Agility Robotics. Seven Digit units deploying at Woodstock, Ontario RAV4 plant under Robots-as-a-Service model — the first commercial humanoid deployment in Canadian automotive manufacturing.',
    sourceName: 'Agility Robotics / Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/02/20/toyota-canada-to-deploy-agility-robotics-humanoid-digit-in-manufacturing-operations/99011/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Digit passes OSHA-recognized NRTL safety inspection; Agility leads ISO 25875 standard development',
    summary: 'Digit has passed an OSHA-recognized Nationally Recognized Testing Lab (NRTL) field inspection, validating safety for deployment alongside human workers. Agility Robotics is spearheading ISO 25875, a new safety standard for "dynamically stable industrial mobile manipulators" — accepted for review with 3-4 year timeline.',
    sourceName: 'Humanoids Daily / Automation World',
    sourceUrl: 'https://www.humanoidsdaily.com/news/agility-robotics-secures-osha-recognized-safety-approval-widening-the-gap-between-demo-and-deployment',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik raises $520M extension at $5B valuation, total funding reaches $935M',
    summary: 'Apptronik raised a $520M extension round at $5B valuation with participation from Google. Total Series A funding now at $935M. Funds will be used to expand Austin HQ, open California office, and scale Apollo robot production.',
    sourceName: 'CNBC / TechCrunch',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO sells out entire first-year production capacity (10,000+ units) in just 5 days',
    summary: 'On October 28, 2025, 1X launched NEO publicly and sold out its entire first-year production capacity of over 10,000 units in just five days. Consumer price set at $20,000 or $499/month subscription. NEO Factory in Hayward, CA spans 58,000 sq ft with 200+ employees.',
    sourceName: '1X Technologies / Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/1x-goes-vertical-inside-the-hayward-factory-aiming-for-100-000-humanoids',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Agibot ──
  {
    headline: 'Agibot G2 achieves 310 units/hour throughput and 99.9% success rate on live tablet production line',
    summary: 'AGIBOT G2 robots on Longcheer Technology tablet line achieve throughput of 310 units/hour, cycle times of 19-20 seconds per task, and success rate exceeding 99.9%. Robots handle picking devices, placing into test fixtures, and sorting finished/defective units at MMIT stations.',
    sourceName: 'Interesting Engineering / The Robot Report',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agibot wins multiple "Best of CES 2026" awards with most complete humanoid portfolio at the show',
    summary: 'AGIBOT won multiple Best of CES 2026 awards following its US market debut. Recognized as having "the most complete and operationally mature humanoid robot portfolio at the show." Full lineup includes A2 (service), X2 (entertainment/research), G2 (industrial), and D1 (quadruped) series.',
    sourceName: 'PR Newswire / Agibot',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibots-humanoid-robots-take-home-multiple-best-of-ces-2026-awards-following-us-debut-302663224.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
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
    console.log(`  Date: 2026-05-12`);
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
