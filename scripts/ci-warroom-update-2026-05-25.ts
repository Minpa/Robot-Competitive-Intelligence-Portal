#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-25
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-25.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-25) ──────────────────

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
    headline: 'Tesla Optimus pilot production line first video revealed; Fremont conversion for 1M/year capacity underway',
    summary: 'A video surfacing May 21, 2026 offers the clearest look yet at Tesla\'s Optimus Gen 3 pilot production line at Fremont. Pilot production began Jan 21, 2026. Former Model S/X area being converted into a first-generation line designed for 1 million robots/year capacity, with mass production targeted late July/August 2026.',
    sourceName: 'Basenor / Electrek',
    sourceUrl: 'https://www.basenor.com/blogs/news/tesla-optimus-pilot-production-line-gets-first-look-on-video',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Giga Texas North Campus: 5.2M sq ft Optimus factory targeting 10M robots/year, $5–10B investment',
    summary: 'Permit documents reveal Tesla seeking to add 5.2 million sq ft at Giga Texas North Campus for a second-generation Optimus production line targeting 10 million robots per year (27,000/day). Estimated construction investment $5–10 billion. Site preparation underway, production expected summer 2027.',
    sourceName: 'The Robot Report / Teslarati',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus Gen 3 hand upgrade: 22-DOF hands with 50 actuators across both forearms, body retains Gen 2 frame',
    summary: 'Gen 3 label refers to an upgraded hand system, not an entirely new chassis. Robot retains Gen 2 body (173 cm, 57 kg) but gains significantly more capable hands with 22 degrees of freedom and 50 actuators across both forearms and hands. Musk warned initial production output will be "quite slow" with 10,000 unique parts.',
    sourceName: 'BotInfo / Electrek',
    sourceUrl: 'https://botinfo.ai/articles/tesla-optimus',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics ships production-ready Atlas; all 2026 units committed to Hyundai RMAC and Google DeepMind',
    summary: 'Boston Dynamics unveiled production-ready Atlas at CES January 2026 and began production at Boston HQ immediately. All 2026 deployments fully committed to Hyundai RMAC and Google DeepMind fleets. Hyundai Mobis supplies actuators with collaborative supply chain development.',
    sourceName: 'Automate.org / Engadget',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Hyundai $26B US investment includes 30,000-unit/year Atlas robot factory',
    summary: 'Hyundai Motor Group announced $26 billion investment in US operations, including a new robotics factory capable of producing 30,000 Atlas robots per year. Plans to deploy tens of thousands of robots into Hyundai\'s own manufacturing facilities. Factory completion targeted for 2028.',
    sourceName: 'New Atlas / Automate.org',
    sourceUrl: 'https://newatlas.com/ai-humanoids/boston-dynamics-production-atlas-hyundai/',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 robots sort 101,391 packages in 81-hour autonomous marathon — planned 8hr demo ran 10x longer',
    summary: 'Starting May 13, 2026, Figure AI livestreamed three Figure 03 robots in autonomous package sorting. Planned for 8 hours, the demo ran 81 hours with zero failures in the first 24 hours, sorting 101,391 packages (one every 3–4 seconds, 28,000+/day). Helix-02 AI ran entirely onboard with no teleoperation.',
    sourceName: 'Seoul Economic Daily / Medium / TechRadar',
    sourceUrl: 'https://en.sedaily.com/international/2026/05/17/figure-ai-robot-sorts-100000-packages-in-81-hours-without',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Figure AI production reaches 1 robot/hour at BotQ; 350+ Figure 03 units delivered, 80%+ first-pass yield',
    summary: 'Figure ramped manufacturing from 1 robot/day to 1 robot/hour in under four months at BotQ facility. Over 350 Figure 03 units delivered. Dedicated assembly lines, custom manufacturing software across 150+ workstations, first-pass yields above 80%. Plans to ship 100,000 humanoids over four years.',
    sourceName: 'The AI Insider / Interesting Engineering',
    sourceUrl: 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure System 0 AI gains perception-conditioned whole-body control for stairs, ramps, and uneven terrain',
    summary: 'Figure introduced perception-conditioned whole-body control in System 0 AI allowing Figure 03 to navigate stairs, ramps and uneven terrain using onboard stereo camera perception. Whole-body controller trained on 1,000+ hours of human motion data plus simulation across 200,000+ parallel environments.',
    sourceName: 'Figure AI Official',
    sourceUrl: 'https://www.figure.ai/news',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree unveils GD01: world\'s first mass-produced manned mecha robot at ¥3.9M ($650K), 2.8m tall transformable',
    summary: 'Unitree unveiled GD01 on May 12, 2026 — a 2.8-metre transformable mecha with human pilot cockpit. Walks on two legs, folds into quadruped in seconds, weighs ~500 kg with passenger, priced from ¥3.9M (~$650K). World\'s first mass-production manned mecha.',
    sourceName: 'CnEVPost / TNW / Interesting Engineering',
    sourceUrl: 'https://cnevpost.com/2026/05/12/unitree-unveils-manned-mecha-gd01/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree IPO targets $7B valuation on Shanghai STAR Market; shipped more humanoids than Tesla in 2025',
    summary: 'Unitree filed for IPO on Shanghai STAR Market seeking CNY 4.2B ($610M) at ~$7B valuation. Revenue 4.3x to ¥1.7B ($246M) in 2025 with net profit tripling. Shipped more humanoid robots than Tesla in 2025, holds 70% of quadruped market. Would be first pure-play robotics company to IPO.',
    sourceName: 'SCMP / KraneShares / TNW',
    sourceUrl: 'https://www.scmp.com/tech/article/3347611/inside-unitrees-landmark-ipo-what-know-about-chinas-humanoid-giant',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree H1 competes in Beijing E-Town Humanoid Half Marathon alongside 300 robots from 100+ teams',
    summary: 'Unitree H1 humanoid competed in the April 2026 Beijing E-Town Humanoid Half Marathon event alongside 300 robots from over 100 teams. Demonstrates bipedal locomotion endurance capability in real-world conditions.',
    sourceName: 'KraneShares / RoboHorizon',
    sourceUrl: 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'demo',
    severity: 'info',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Digit deployed at Mercado Libre San Antonio TX facility for commerce fulfillment',
    summary: 'Mercado Libre and Agility Robotics signed commercial agreement to integrate Digit humanoid robots into Mercado Libre\'s San Antonio, Texas facility for commerce fulfillment. Plans to explore additional use cases across Mercado Libre\'s warehouses in Latin America.',
    sourceName: 'Robotics 24/7 / Agility Robotics Official',
    sourceUrl: 'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agility Digit expands to 10 units at Toyota Canada (TMMC) following successful year-long pilot',
    summary: 'Toyota Motor Manufacturing Canada (TMMC) expanding from 3 pilot units to 10 commercial Digit robots for RAV4 production logistics (loading/unloading totes from automated tugger). First major automotive OEM RaaS deployment after year-long pilot.',
    sourceName: 'Robot Report / Yahoo Finance',
    sourceUrl: 'https://www.therobotreport.com/toyota-motor-manufacturing-canada-deploys-agility-robotics-digit-humanoids/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik $520M Series A extension at $5B valuation; total funding $935M with Google, John Deere, Qatar co-lead',
    summary: 'Apptronik raised $520M extension bringing total Series A to $935M at $5B valuation. Co-led by B Capital and Google. New investors include AT&T Ventures, John Deere, Qatar Investment Authority. Plans to expand in Austin, open California office, scale Apollo production.',
    sourceName: 'CNBC / The Robot Report',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Apptronik integrates Google DeepMind Gemini Robotics AI models into next-gen Apollo; Jabil manufacturing active',
    summary: 'Apptronik integrating Google DeepMind\'s Gemini Robotics AI foundation models into Apollo. Combined with Jabil manufacturing partnership for scale production. Ongoing pilots at Mercedes-Benz and GXO Logistics. Targets $1B in Apollo orders for 2027 at ~$80K/year per unit.',
    sourceName: 'Automate.org / CNBC',
    sourceUrl: 'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO Factory commences full-scale production May 1, 2026; 10,000/year capacity sold out in 5 days',
    summary: '1X NEO Factory (58,000 sq ft, 200+ employees) in Hayward CA commenced full-scale production May 1, 2026. America\'s first vertically integrated humanoid robot factory. Initial 10,000 unit/year capacity sold out in 5 days (Oct 28 launch). Scaling to 100,000+/year by end 2027 with new San Carlos factory.',
    sourceName: 'GlobeNewsWire / The Robot Report',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X NEO consumer pricing: $20,000 or $499/month subscription; NVIDIA Jetson Thor onboard, US deliveries 2026',
    summary: 'Each NEO unit features NVIDIA Jetson Thor as core brain (NEO Cortex) for real-time AI inference. In-house manufacturing of motors, batteries, structures, sensors. Consumer price $20,000 or $499/month. US consumer deliveries planned 2026, global expansion 2027.',
    sourceName: '1X Official / Business 2.0',
    sourceUrl: 'https://www.1x.tech/discover/neo-factory',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot A2 humanoid performs live calligraphy and dance at Jakarta cultural event with ASIX partnership',
    summary: 'On May 21, 2026, Agibot showcased A2 humanoid at Jakarta Indonesia cultural event in partnership with Indonesian AI accelerator ASIX. Robot performed live calligraphy ("Tea for Harmony"), dance, and real-time human interaction hosting duties.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/china-agibot-humanoid-robot-calligraphy-dance',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'Agibot unveils new generation embodied AI robots and models for real-world deployment (April 2026)',
    summary: 'Agibot unveiled next-generation embodied AI robots and foundation models designed for real-world industrial deployment. Launching Genie Sim 3.0 integrated with NVIDIA Isaac Sim. Adopting NVIDIA Isaac GR00T N foundation models for accelerated training.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/04/21/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-for-real-world-deployment/100781/',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agibot 10,000th robot rolled out March 2026; 5K→10K in 3 months (4x acceleration), IDC #1 global shipment volume',
    summary: 'AGIBOT reached 10,000 humanoid robot milestone on March 30, 2026. Scaling from 5,000 to 10,000 in just 3 months (4x production acceleration). IDC ranked AGIBOT first in total humanoid shipment volume globally. Plans to scale to 100 robots at Longcheer by Q3 2026.',
    sourceName: 'The Robot Report / Agibot Official',
    sourceUrl: 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
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
    console.log(`  Date: 2026-05-25`);
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
