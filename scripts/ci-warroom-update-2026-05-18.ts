#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-18
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-18.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-18) ──────────────────

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
    headline: 'Tesla breaks ground on Giga Texas Optimus factory: 10M units/year target, $5-10B investment',
    summary: 'Tesla is constructing a second-generation Optimus factory at Giga Texas with a long-term target of 10 million robots per year. Site preparation is underway with over 5.2 million sq ft of new building space planned for the North Campus by end of 2026. Estimated construction investment is $5-10 billion. Production at Giga Texas expected to begin summer 2027.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus V3 expected to have 10,000 unique parts; initial Fremont output will be "quite slow"',
    summary: 'Q1 2026 earnings call confirmed Optimus V3 has 10,000 unique parts across an entirely new production line at Fremont. Initial output will be quite slow with a few hundred units expected in 2026 before scaling to thousands in 2027. Consumer sales targeted for end of 2027 at $20,000-$30,000 price range.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Atlas production-ready version: 7.5 ft reach, 110 lb lift capacity, -4°F to 104°F operating range',
    summary: 'Production Atlas specs confirmed: reach up to 7.5 feet, ability to lift 110 pounds, operating temperature range from -4°F to 104°F (-20°C to 40°C). All 2026 deployments fully committed to Hyundai RMAC and Google DeepMind. Robot learns new tasks quickly and works autonomously with minimal supervision.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Hyundai Mobis to supply Atlas actuators; joint accelerated development and supply chain partnership',
    summary: 'Hyundai Mobis confirmed as actuator supplier for Atlas production units. The two organizations will work together to build a highly reliable component supply chain and accelerate actuator development and production pace. This secures a critical hardware dependency for Atlas scale-up.',
    sourceName: 'Boston Dynamics Official',
    sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-unveils-new-atlas-robot-to-revolutionize-industry/',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI deploys humanoid robots at BMW Leipzig: first Physical AI in European automotive production',
    summary: 'BMW confirmed deployment of humanoid robots at Plant Leipzig, Germany on Feb 27, 2026 — first Physical AI in European automotive production. Established Center of Competence for Physical AI in Production. Expansion planned to Munich, Regensburg, and Leipzig from Spartanburg success (30,000+ vehicles, 90,000+ parts, 1,250 hours).',
    sourceName: 'BMW Group Official',
    sourceUrl: 'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Figure AI livestreams 4 Helix-02 robots sorting packages for 40+ hours with zero failures',
    summary: 'Figure AI livestreamed four Helix-02 robots (Bob, Frank, Gary, and Rose) sorting small packages for nearly 40 hours with no reported failures. CEO Brett Adcock confirmed zero teleoperation or outside intervention. Demonstrates fleet-level autonomous reliability at extended durations beyond any previous public demonstration.',
    sourceName: 'TechRepublic / Bloomberg',
    sourceUrl: 'https://www.techrepublic.com/article/news-figure-robot-demo-tests-24-7-humanoid-fleet-work/',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Figure AI CEO outlines 2026 goals: robot-built robots in 24 months, superhuman hardware, home deployment',
    summary: 'CEO Brett Adcock outlined aggressive 2026 roadmap: deploy on production lines this year, achieve robot-built robots in 24 months, deliver superhuman speed/precision hardware upgrades, and enable home robots for long-horizon tasks in completely unseen environments by year-end. Longest autonomous task demo: 4-minute end-to-end kitchen dishwasher sequence.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/figure-ai-humanoids-24-hour-autonomous-run',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Unitree ──
  {
    headline: 'Unitree unveils GD01: world\'s first production-ready manned mecha, 2.8m tall, bipedal/quadruped transform, ¥3.9M',
    summary: 'Unitree unveiled the GD01 on May 15, 2026 — world\'s first production-ready manned mecha robot. Stands 2.8m tall, weighs 500kg with pilot, transforms between bipedal and quadrupedal modes within seconds. Cockpit for human operator. Starting price ¥3.9M ($573K). Positioned for rescue, inspection, and tourism applications.',
    sourceName: 'Caixin Global / SCMP',
    sourceUrl: 'https://www.caixinglobal.com/2026-05-15/unitree-unveils-worlds-first-production-ready-mecha-102444380.html',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Unitree IPO investment plan: scale to 75K humanoids and 115K quadrupeds/year within 5 years',
    summary: 'Unitree\'s IPO prospectus reveals investment plan to scale annual output to 75,000 humanoid robots and 115,000 quadrupeds within five years, with projected sales reaching 5.7 billion yuan. Company has been profitable every year since 2020. 32.4% global humanoid market share. Shanghai STAR Market listing expected mid-to-late 2026.',
    sourceName: 'KraneShares / TrendForce',
    sourceUrl: 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },
  {
    headline: 'Japan Airlines deploys Unitree-based humanoid robots at Haneda Airport: 3-year operational commitment',
    summary: 'Japan Airlines (JAL) deployed Unitree Robotics-based humanoid platforms at Tokyo Haneda Airport in May 2026, marking a 3-year operational commitment from a legacy carrier. Two units deployed at approximately $15,400/unit via GMO AI & Robotics partnership. First major aviation sector humanoid deployment in Japan.',
    sourceName: 'Humanoids Daily',
    sourceUrl: 'https://humanoid.press/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Robotics rebrands; RoboFab factory targets 10,000 Digit units annually',
    summary: 'Agility Robotics announced a corporate rebrand as part of its push toward mass commercialization. RoboFab manufacturing facility targeting production capacity of 10,000 Digit units annually. Currently generating revenue from commercial deployments. Customers include GXO Logistics, Schaeffler, Amazon, Toyota Canada, and Mercado Libre.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/humanoid-developer-agility-robotics-rebrands/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Next-gen Digit specs: 50 lb payload, improved battery; first humanoid cleared for barrier-free human collaboration',
    summary: 'Agility developing next-generation Digit with 50 lb payload capacity (up from 35 lb) and improved battery life. Upon achieving ISO functional safety certification (targeted mid-to-late 2026), Digit would become the first humanoid cleared to work cooperatively alongside people with no physical barriers required.',
    sourceName: 'Agility Robotics Official',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apollo specs confirmed: 6ft tall, 55 lb lift, 22-hour/day operation; new version tested for over a year',
    summary: 'Apollo production specs: nearly 6 feet tall, lifts up to 55 pounds, operates 22 hours/day 7 days/week. New Apollo version has been testing for over a year with public debut scheduled for 2026. Designed to fit preexisting human workspaces for warehouse labor and household tasks.',
    sourceName: 'CNBC / Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Apptronik expands partnerships: Mercedes-Benz, GXO, AT&T Ventures, John Deere, Qatar Investment Authority join',
    summary: 'New investors in $520M round include AT&T Ventures, John Deere, and Qatar Investment Authority (QIA), signaling industrial and sovereign interest. Active pilot deployments at Mercedes-Benz and GXO Logistics. Plans to expand Austin HQ and open new California office. Revenue-generating deployments underway.',
    sourceName: 'CNBC / SiliconANGLE',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X CEO declares NEO will be capable of "almost anything" autonomously at consumer delivery',
    summary: 'CEO Bernt Børnich expressed heightened confidence that NEO humanoid will be capable of attempting "almost anything" autonomously upon delivery to consumers later in 2026. Notable shift from earlier statements about needing human assistance. 4-week iteration cycle from CAD to finished robot. 200+ employees at NEO Factory.',
    sourceName: 'Notebookcheck / Humanoids Daily',
    sourceUrl: 'https://www.notebookcheck.net/1X-NEO-Household-robot-set-to-launch-by-the-end-of-2026-but-with-a-controversial-catch.1295772.0.html',
    competitorSlug: 'neo',
    layerSlug: 'sw',
    confidence: 'C',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: '1X NEO vertical integration: in-house motors, batteries, structures, sensors; 4-week design-to-production cycle',
    summary: '1X\'s NEO Factory operates as most vertically integrated humanoid factory in the US. Manufactures motors, batteries, structures, and sensors in-house. Factory OS manages every production stage in real-time. 4-week iteration cycle from CAD to functional robot. San Carlos facility planned for 100K+/year by end 2027.',
    sourceName: 'GlobeNewsWire / Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/one-roof-four-weeks-inside-1x-s-vertical-speed-hack-as-neo-ramps-for-2026-deliveries',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot unveils GO-2 embodied foundation model and Genie Sim 3.0 at Partner Conference',
    summary: 'AGIBOT introduced GO-2 (ViLLA Embodied Foundation Model) with Action Chain-of-Thought for long-horizon tasks, achieving SOTA on major benchmarks. Also launched GE-2 World Action Model for interactive simulation and Genie Sim 3.0 platform for natural-language digital twin generation. Full-stack "One Body Three Intelligences" architecture.',
    sourceName: 'PR Newswire / Robot Report',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agibot D2 Max quadruped robot launched for industrial inspection, security, and emergency response',
    summary: 'AGIBOT introduced D2 Max quadruped robot at 2026 Partner Conference, designed for field and industrial operations including inspection, security, and emergency response scenarios. Expands product portfolio beyond humanoids into ruggedized industrial quadrupeds.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/04/21/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-for-real-world-deployment/100781/',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },
  {
    headline: 'China humanoid output to surge 94% in 2026; Unitree and Agibot to capture ~80% market share',
    summary: 'TrendForce projects China\'s humanoid robot output will surge 94% in 2026. Unitree and AgiBot projected to capture nearly 80% of total shipments combined. AGIBOT ranked first globally in total humanoid shipment volume by IDC. Represents consolidation of Chinese market leadership in humanoid production.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
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
    console.log(`  Date: 2026-05-18`);
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
