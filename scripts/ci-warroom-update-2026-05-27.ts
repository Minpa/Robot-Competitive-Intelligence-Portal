#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-27
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-27.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-27) ──────────────────

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
    headline: 'Tesla Giga Texas permit filings reveal $5-10B Optimus factory with 5.2M sq ft and 10M units/year capacity',
    summary: 'Permit documents filed with Travis County reveal Tesla plans a massive 5.2 million square foot dedicated Optimus factory at Giga Texas with an investment of $5-10 billion. The facility is designed for an eventual capacity of 10 million humanoid robots per year. A second-generation production line is expected to begin production in 2027.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'EU Machinery Regulation 2026/1234 mandates rigorous conformity assessments for humanoid robots in shared workspaces',
    summary: 'The European Union\'s upcoming Machinery Regulation (EU) 2026/1234 will mandate rigorous conformity assessments for robots operating in shared workspaces, including real-time emergency stop functions and fail-safe torque limits. ISO 13482 amendments are also anticipated, requiring force-limited joints, redundant torque sensors, and emergency stop protocols akin to automotive Functional Safety (ISO 26262). Impacts all humanoid manufacturers targeting EU markets.',
    sourceName: 'AI Certs / ISO',
    sourceUrl: 'https://www.aicerts.ai/news/general-robotics-tesla-optimus-mass-production-reality-check/',
    competitorSlug: 'optimus',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics Atlas lifts 100-pound industrial loads using reinforcement learning whole-body control',
    summary: 'Boston Dynamics released new footage showing Atlas humanoid robot lifting and carrying heavy appliances including a loaded fridge weighing more than 100 pounds during testing. The robot uses reinforcement learning for whole-body control, marking a shift from choreographed movements toward adaptable industrial behaviors designed for factories, warehouses, and construction sites.',
    sourceName: 'Robotics and Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/05/20/boston-dynamics-trains-atlas-humanoid-robot-to-pick-up-and-place-washing-machine/101759/',
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Hyundai Atlas robot trains for soccer demonstrations ahead of 2026 FIFA World Cup',
    summary: 'Hyundai Motor Group is training Boston Dynamics Atlas robots to perform soccer demonstrations in connection with the 2026 FIFA World Cup. The marketing initiative showcases Atlas\'s dynamic balance and agility capabilities to a global audience, positioning humanoid robotics as a mainstream technology.',
    sourceName: 'Seoul Economic Daily',
    sourceUrl: 'https://en.sedaily.com/news/2026/05/25/hyundais-atlas-robot-trains-for-soccer-ahead-of-2026-world',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI livestreams human intern vs robot 10-hour package sorting competition in May 2026',
    summary: 'Figure AI livestreamed a head-to-head competition where a human intern competed against Figure 02 humanoid robots in a 10-hour package sorting marathon. The same month, Figure also livestreamed robots sorting packages on a conveyor 24 hours per day for nearly a full week, gaining significant public and industry attention.',
    sourceName: 'Wikipedia / Figure AI',
    sourceUrl: 'https://en.wikipedia.org/wiki/Figure_AI',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'demo',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree launches UniStore — world\'s first humanoid robot app store for G1, H1, B2 platforms',
    summary: 'Unitree Robotics officially launched UniStore, a task and motion application store enabling users to download and install new robot capabilities from a smartphone app. The platform covers G1 and H1 humanoid robots, the B2 quadruped, and Go2 robot dog. Represents a strategic shift toward modular, software-driven robot ecosystems.',
    sourceName: 'RobotsBeat',
    sourceUrl: 'https://robotsbeat.com/unitree-unistore-robot-app-store-humanoid-g1-h1-ecosystem/',
    competitorSlug: 'unitree',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree G1 deployed at Tokyo Haneda Airport for baggage handling in partnership with Japan Airlines and GMO',
    summary: 'Unitree G1 humanoid robot is deployed for baggage and cargo handling at Tokyo Haneda Airport in partnership with Japan Airlines and GMO Internet Group. This marks the first commercial airport deployment of a humanoid robot globally, with trial runs planned through 2028.',
    sourceName: 'RoboZaps / Unitree',
    sourceUrl: 'https://blog.robozaps.com/b/unitree-g1-review',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Unitree IPO fast-tracked: Shanghai listing committee review set for June 1, target valuation $6.2B',
    summary: 'Unitree\'s IPO review by the Shanghai Stock Exchange listing committee is scheduled for June 1, 2026 — just 73 days after formal acceptance on March 20. The company is targeting a valuation of roughly 42 billion yuan ($6.2 billion). Humanoid robots now account for 51.5% of revenue with gross margin of 62.9%. If approved, Unitree becomes China\'s first publicly traded humanoid robotics company.',
    sourceName: 'Caixin Global',
    sourceUrl: 'https://www.caixinglobal.com/2026-05-26/unitree-fast-tracks-shanghai-ipo-with-target-valuation-of-62-billion-102447449.html',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Digit becomes most-deployed commercial humanoid globally: GXO, Toyota Canada, Amazon, Schaeffler active',
    summary: 'Agility Robotics\' Digit is now recognized as the most-deployed humanoid in commercial operation worldwide. Active deployments include GXO (multi-year RaaS), Toyota Canada (RAV4 logistics), Amazon, and Schaeffler. The company has moved over 100,000 totes and signed an industry-first multi-year RaaS contract. Next-gen Digit with 50 lb payload due mid-2026.',
    sourceName: 'Beginners in AI / Agility Robotics',
    sourceUrl: 'https://beginnersinai.org/agility-robotics-digit-explained/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik Series A expansion attracts AT&T Ventures, John Deere, and Qatar Investment Authority as strategic investors',
    summary: 'Apptronik\'s $520M Series A extension attracted new strategic investors including AT&T Ventures, John Deere, and the Qatar Investment Authority (QIA), alongside lead investors B Capital and Google. The diversified investor base signals cross-industry interest in humanoid robotics for agriculture (Deere), telecommunications (AT&T), and sovereign wealth deployment (QIA).',
    sourceName: 'CNBC / Crunchbase',
    sourceUrl: 'https://news.crunchbase.com/venture/ai-humanoid-robot-funding-apptronik/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },
  {
    headline: 'Apollo Gen 2 specs: 5\'8" tall, 160 lbs, 55 lb carry capacity, 71 DOF, 4-hour battery, NVIDIA GR00T platform',
    summary: 'Apptronik revealed detailed specifications for the latest Apollo: 5 feet 8 inches tall, 160 pounds weight, 55-pound carry capacity, 71 degrees of freedom, and 4 hours of battery life on a single pack. The robot runs on NVIDIA\'s GR00T AI platform. Pilots active at Mercedes-Benz factories and GXO Logistics warehouses.',
    sourceName: 'Apptronik / RoboZaps',
    sourceUrl: 'https://blog.robozaps.com/b/apptronik-apollo-review',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X Technologies 1X World Model enables NEO to turn any request into AI capability on demand via video learning',
    summary: '1X Technologies announced its latest 1X World Model — a video-based AI model grounded in real-world physics that enables the NEO humanoid robot to learn new tasks by watching demonstration videos. Any user request can be turned into an AI capability on demand, dramatically reducing the time needed to teach the robot new skills.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
    competitorSlug: 'neo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: '1X NEO consumer shipments begin 2026 with entire first-year production sold out; scaling to 100K by end 2027',
    summary: '1X Technologies confirmed consumer shipments of NEO will begin before end of 2026 from its Hayward, California factory. The entire first-year production capacity of 10,000 units sold out within five days of pre-orders opening on October 28, 2025. The company plans to scale to 100,000+ units per year by end of 2027.',
    sourceName: 'The Next Web / eWeek',
    sourceUrl: 'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot declares 2026 "Deployment Year One" with 5 robotic platforms and 8 AI models for real-world tasks',
    summary: 'AGIBOT officially declared 2026 as "Deployment Year One," introducing five robotic platforms (A2, A3, X2, G2, D1) and eight AI models designed to handle real-world tasks in factories, stores, and homes. The A3 is the new flagship humanoid at 173 cm, 55 kg, built with magnesium and titanium alloys.',
    sourceName: 'eWeek',
    sourceUrl: 'https://www.eweek.com/news/agibot-deployment-year-one-robots-ai-models-apac/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Unitree and Agibot projected to capture nearly 80% of China humanoid robot shipments in 2026 (TrendForce)',
    summary: 'TrendForce projects China\'s humanoid robot output will surge 94% in 2026, with Unitree Robotics and AGIBOT together capturing nearly 80% of total shipments. AGIBOT\'s production scale increased from 1,000 to 10,000 units in under a year. Vendors are rapidly clarifying commercial use cases and scaling up production.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Agibot expands into US, Europe, Japan, Korea, Southeast Asia, and Middle East with A2, X2, G2 humanoid lineup',
    summary: 'AGIBOT announced its official entry into the US humanoid market at CES 2026 with ready-to-use A2, X2, and G2 humanoids plus D1 quadruped. International expansion covers Europe, North America, Japan, South Korea, Southeast Asia, and the Middle East. Strong demand reported across all regions.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-enters-us-with-humanoids-robot-dog',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
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
    console.log(`  Date: 2026-05-27`);
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
