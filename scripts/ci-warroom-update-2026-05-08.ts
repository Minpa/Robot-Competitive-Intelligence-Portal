#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-08
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-08.ts
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

// ── Collected Intelligence Data (2026-05-08) ──────────────────

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
    headline: 'Tesla completes AI5 chip tape-out in April 2026 for Optimus and autonomous vehicles',
    summary: 'Tesla confirmed completion of AI5 chip tape-out in April 2026 via Q1 earnings report. AI5 is the next-gen inference processor specifically optimized for Optimus humanoid robots and autonomous vehicles, with approximately 5x compute of dual AI4, matching NVIDIA H100 inference performance. Small-batch production anticipated in 2026, volume production in 2027.',
    sourceName: 'Tesla Q1 2026 Update / Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-finalizes-ai5-chip-design-elon-musk-makes-bold-claim-capability/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Tesla Fremont factory begins Optimus production line installation as Model S/X production ends May 2026',
    summary: 'First-generation Optimus production lines are being installed at Tesla Fremont factory. Model S and Model X production ended in early May 2026 to make room. First-gen line designed for 1M robots/year capacity. V3 robot reveal expected late July/August 2026 with production starting shortly after.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla plans $25B+ capital spend in 2026 for robotics, chips and AI infrastructure',
    summary: 'Tesla announced over $25 billion in planned capital expenditures for 2026, focused on robotics production facilities, AI chip manufacturing (Terafab/AI5), and AI training infrastructure. Second-generation Optimus facility at Giga Texas targeting 10M units/year is under construction.',
    sourceName: 'WardsAuto',
    sourceUrl: 'https://www.wardsauto.com/news/tesla-plans-over-25b-in-capital-spend-for-robotics-chips-and-ai/818372/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },
  {
    headline: 'Optimus Gen 3 hands upgraded to 25 actuators per forearm/hand (50 total per robot)',
    summary: 'Tesla Optimus Gen 3 hands now feature 25 actuators per forearm/hand (50 total per robot), a 4.5x increase from Gen 2. Enhanced dexterity enables complex manipulation tasks. Consumer sales targeted for end of 2027 per Musk at Davos and Q1 2026 earnings.',
    sourceName: 'BotInfo.ai / Multiple',
    sourceUrl: 'https://botinfo.ai/articles/tesla-optimus',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Hyundai Motor Group announces $26B US investment including 30K robot/year Atlas factory',
    summary: 'Hyundai Motor Group, Boston Dynamics majority shareholder, announced $26 billion investment in US operations. Plans include a new robotics factory capable of producing 30,000 Atlas robots per year. All 2026 Atlas deployments fully committed. Atlas usage in Hyundai car plants planned for 2028 (parts sequencing) and 2030 (component assembly).',
    sourceName: 'New Atlas / Hyundai Motor Group',
    sourceUrl: 'https://newatlas.com/ai-humanoids/boston-dynamics-production-atlas-hyundai/',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Boston Dynamics Atlas wins "Best Robot" at CES 2026 awards by CNET Group',
    summary: 'Production-ready Atlas humanoid robot named "Best Robot" in Best of CES 2026 Awards by CNET Group. The award recognizes Atlas as the most advanced humanoid robot at the show, validating Boston Dynamics production-readiness claims.',
    sourceName: 'Hyundai Motor Group Newsroom',
    sourceUrl: 'https://www.hyundaimotorgroup.com/en/news/CONT0000000000199186',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI ramps Figure 03 production to 1 robot per hour at BotQ facility (24x improvement)',
    summary: 'Figure AI increased Figure 03 production from 1 per day to 1 per hour — a 24x throughput improvement in under 120 days. BotQ manufacturing facility in California capable of producing 12,000 humanoids/year. Over 350 Figure 03 units produced. Goal: 100,000 robots over the next 4 years.',
    sourceName: 'The AI Insider / Figure AI',
    sourceUrl: 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 monthly shipments show exponential ramp: 60→120→240 units (Feb–Apr 2026)',
    summary: 'Figure AI CEO Brett Adcock posted chart showing monthly shipments roughly doubled three consecutive months: ~60 in February, ~120 in March, ~240 in April 2026. Production rate has continued to improve beyond one-per-hour milestone, now at approximately one every 90 minutes.',
    sourceName: 'Humanoids Daily / Figure AI',
    sourceUrl: 'https://www.humanoidsdaily.com/news/the-shape-of-scale-new-figure-production-data-hints-at-exponential-ramp-up',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Figure 02 completes 11-month BMW deployment: 90K+ parts loaded, 1,250+ runtime hours',
    summary: 'Figure 02 completed an 11-month deployment at BMW Spartanburg plant, running daily 10-hour shifts, loading over 90,000 parts across 1,250+ runtime hours, contributing to more than 30,000 X3 vehicles. Validates humanoid robot reliability in automotive manufacturing.',
    sourceName: 'Figure AI / Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Figure_AI',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree IPO application formally accepted by Shanghai STAR Market — seeking $608M',
    summary: 'Shanghai Stock Exchange formally accepted Unitree Robotics IPO application for STAR Market on March 20, 2026. Seeking to raise CNY 4.2B (~$608M) by issuing at least 40.45M shares. Unitree shipped 5,500+ robots in 2025 (32.4% global market share). CEO Wang Xingxing controls ~one-third of the company.',
    sourceName: 'Bloomberg / CNBC / Rest of World',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-03-20/chinese-robot-maker-unitree-seeks-610-million-in-shanghai-ipo',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree releases R1 dual-arm humanoid robot starting at $3,930 with 15–31 DOF',
    summary: 'Unitree launched R1 series dual-arm humanoid robot starting at CNY 26,900 ($3,930). 121cm tall, 25kg, supports 15 to 31 DOF configurations (EDU variants up to 40 DOF), 1-hour battery, no LiDAR. Positioned as the most affordable full humanoid, shipping April 2026.',
    sourceName: 'CnTechPost / RoboHorizon',
    sourceUrl: 'https://cntechpost.com/2026/04/30/unitree-releases-dual-arm-humanoid-robot-r1/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree G1 price drops to $16,000, making it the most affordable full-size humanoid',
    summary: 'Unitree Robotics dropped G1 humanoid robot base price to $16,000, positioning it as a go-to platform for research labs, universities, and smaller companies previously priced out of advanced robotics. G1-D wheeled variant demonstrated roller skating and ice skating tricks.',
    sourceName: 'RoboHorizon',
    sourceUrl: 'https://robohorizon.com/en-us/news/2026/04/unitree-g1-humanoid-drops-for-16000-upending-the-robotics-market/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Robotics announces new Digit innovations: 4-hour battery, CAT1 safety stop, Safety PLC, FSoE',
    summary: 'Agility Robotics unveiled expanded Digit capabilities: extended battery life up to 4 hours, Category 1 (CAT1) stop, Safety PLC, on-robot E-stop, wireless teach pendant with integrated E-stop, Functional Safety over EtherCAT (FSoE), and new robust limbs with wider grasping angles. 7+ commercial Digit units active at Toyota Canada.',
    sourceName: 'Agility Robotics Official',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agility Robotics pursues ISO functional safety certification for Digit — expected mid-to-late 2026',
    summary: 'Agility Robotics is pursuing ISO functional safety certification and expects Digit to be cleared for human collaboration within approximately 18 months (estimated mid-to-late 2026). This will enable Digit to work alongside humans without physical safety barriers.',
    sourceName: 'Robozaps / Agility Robotics',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'warning',
  },
  {
    headline: 'Agility Robotics rebrands and unveils new corporate identity',
    summary: 'Agility Robotics completed a corporate rebrand, updating its visual identity and positioning as it scales from pilot to full commercial deployment of Digit humanoid robots across Fortune 500 customers.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/humanoid-developer-agility-robotics-rebrands/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik adds AT&T Ventures, John Deere, Qatar Investment Authority to Apollo investor roster',
    summary: 'Apptronik Series A extension includes new strategic investors: AT&T Ventures, John Deere, and Qatar Investment Authority (QIA), alongside existing investors B Capital, Google, Mercedes-Benz, and PEAK6. Investment will fund state-of-the-art robot training and data collection facilities.',
    sourceName: 'Crunchbase News / CNBC',
    sourceUrl: 'https://news.crunchbase.com/venture/ai-humanoid-robot-funding-apptronik/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },
  {
    headline: 'Apptronik to debut highly anticipated new robot in 2026 alongside Apollo',
    summary: 'Apptronik announced a "highly anticipated new robot" set to debut in 2026 beyond the current Apollo humanoid. Funding will fuel continued innovation in human-centered robot design. Apollo pilots continue with Mercedes-Benz, Jabil, and GXO Logistics.',
    sourceName: 'SiliconAngle / Robot Report',
    sourceUrl: 'https://siliconangle.com/2026/02/11/apptronik-raises-520m-ramp-humanoid-apollo-robot-commercial-deployments/',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X opens NEO Factory in Hayward, CA — America\'s first vertically integrated humanoid robot factory',
    summary: '1X Technologies opened NEO Factory in Hayward, California on April 30, 2026. 58,000 sqft facility, 200+ employees. America\'s first vertically integrated humanoid robot factory: motors, batteries, structures, transmission, sensors manufactured in-house. Capacity: 10,000 NEOs/year, targeting 100,000+ by end of 2027.',
    sourceName: 'GlobeNewswire / Bloomberg',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X sells out 10,000 NEO first-year production in 5 days; consumer shipments planned 2026',
    summary: '1X sold out entire first-year production capacity (10,000+ units) in just 5 days after October 2025 launch. Early Access priced at $20,000 or $499/month subscription. NEO features NVIDIA Jetson Thor as core AI processor (NEO Cortex). Consumer shipments scheduled for 2026.',
    sourceName: 'eWeek / 1X Technologies',
    sourceUrl: 'https://www.eweek.com/news/news-1x-california-factory-neo-humanoid-robot/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot rolls out 10,000th humanoid robot — 5K to 10K in just 3 months',
    summary: 'AGIBOT reached 10,000 cumulative humanoid robot production in March 2026 (Expedition A3 model). The jump from 5,000 to 10,000 was completed in just 3 months, representing a 4x+ acceleration. IDC ranked Agibot #1 in total shipment volume globally. Substantial portion deployed across Europe, North America, Japan, Korea, SE Asia, and Middle East.',
    sourceName: 'The Robot Report / PR Newswire',
    sourceUrl: 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Agibot signs strategic partnership with Singtel Enterprise for RaaS in Singapore',
    summary: 'Agibot signed MOU with Singtel Enterprise on March 10, 2026 — first telecom operator partnership outside China. Singtel will offer Robots-as-a-Service (RaaS) via 5G network, enabling Singaporean enterprises and individuals to lease AGIBOT robots directly through Singtel within 2026.',
    sourceName: 'Yahoo Finance / Manila Times',
    sourceUrl: 'https://finance.yahoo.com/news/agibot-signs-strategic-cooperation-agreement-053100339.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'TrendForce: Unitree + Agibot projected to capture ~80% of humanoid robot market in 2026',
    summary: 'TrendForce projects China humanoid robot output to surge 94% in 2026, with Unitree and Agibot together capturing nearly 80% of total shipments. Agibot launched Genie Sim 3.0 robot simulation platform and won multiple "Best of CES 2026" awards.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Industry-wide: Regulation ──
  {
    headline: 'ISO 25785-1 for dynamically stable robots in Working Draft stage — ratification 18–36 months out',
    summary: 'ISO 25785-1, the first safety standard specifically for dynamically stable robots (humanoids requiring active balance control), remains in Working Draft as of May 2026. ISO working group estimates 18–36 months for ratification. Meanwhile, ISO 10218:2025 shifts focus from hardware definitions to collaborative application certification. IEEE published framework for humanoid robot standards.',
    sourceName: 'ISO / MIT Technology Review / IEEE',
    sourceUrl: 'https://www.technologyreview.com/2025/06/11/1118519/humanoids-safety-rules/',
    competitorSlug: 'optimus',
    layerSlug: 'safety',
    confidence: 'A',
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
            collectedAt: '2026-05-08T00:00:00Z',
          }),
        ]
      );
      insertedCompAlerts++;
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  ARGOS CI War Room Update Complete');
    console.log('========================================');
    console.log(`  Date: 2026-05-08`);
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
