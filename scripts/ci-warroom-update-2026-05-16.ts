#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-16
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-16.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-16) ──────────────────

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
    headline: 'Tesla Optimus V3 production lines being installed at Fremont, reveal pushed to late July/August 2026',
    summary: 'Tesla is installing first-generation Optimus production lines at Fremont factory after ending Model S/X production on May 9, 2026. V3 robot reveal now expected late July/August 2026, pushed from original Q1 target. Volume manufacturing to begin immediately after reveal.',
    sourceName: 'Electrek',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus already benefiting investors per top Wall Street firm; consumer sales targeted end of 2027',
    summary: 'Wall Street analysts note Optimus is already positively impacting Tesla valuation. Optimus robots operating in Tesla factories for learning/data collection. Consumer sales targeted for end of 2027. Morgan Stanley maintaining bullish robotics thesis.',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-tsla-optimus-already-benefiting-investors-wall-street-firm-says/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Tesla invests $2B in xAI: shared AI infrastructure accelerates Optimus core algorithms',
    summary: 'Tesla invested $2 billion in Musk\'s xAI, deepening strategic partnership for autonomous driving and humanoid robot AI. Shared Dojo + H100 GPU infrastructure and cross-pollinated algorithms between FSD and Optimus locomotion/manipulation models.',
    sourceName: 'Supply Chain Today',
    sourceUrl: 'https://www.supplychaintoday.com/why-the-tesla-optimus-robot-will-take-over-in-2026/',
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics Atlas performs flawless handstand in new demo, showcasing 56-DOF precision control',
    summary: 'Atlas demonstrated a flawless handstand in a new video, highlighting 56 degrees of freedom and full joint rotation capabilities. Demonstrates advanced balance and control algorithms that no other humanoid has matched publicly.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/boston-dynamics-atlas-humanoid-robot-2',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'Boston Dynamics + Google DeepMind: Gemini Robotics foundation models integrated into Atlas',
    summary: 'Partnership integrates Google DeepMind Gemini Robotics AI foundation models into Atlas for enhanced cognitive capabilities. Combines Boston Dynamics\' world-class hardware with DeepMind\'s advanced AI. Both companies share robotics data and model development.',
    sourceName: 'Boston Dynamics Official',
    sourceUrl: 'https://bostondynamics.com/blog/boston-dynamics-google-deepmind-form-new-ai-partnership/',
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Hyundai and Boston Dynamics building 30,000-unit/year Atlas factory, all 2026 deployments committed',
    summary: 'Hyundai Motor Group is building a dedicated factory capable of producing 30,000 Atlas robots per year. All Atlas deployments for 2026 are fully committed to Hyundai RMAC and Google DeepMind. Factory completion targeted for 2028.',
    sourceName: 'Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI Helix-02 robots complete 50-hour nonstop autonomous package sorting without intervention',
    summary: 'Figure AI CEO Brett Adcock announced humanoid robots sorted packages for ~50 hours nonstop without human intervention. Helix-02 neural network enables walking, object manipulation, balancing, and movement coordination. Demonstrates fine motor tasks including unscrewing bottle caps, syringe manipulation, and picking from cluttered bins.',
    sourceName: 'Bloomberg / Interesting Engineering',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-05-15/robotics-ceo-vows-no-intervention-in-humanoids-viral-trial-run',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 production scaled 24x: BotQ factory now producing 1 robot/hour, 350+ units delivered',
    summary: 'Figure ramped manufacturing from 1 robot/day to 1 robot/hour in under four months at BotQ facility in California. Over 350 Figure 03 units delivered. Plans to ship 100,000 humanoids over four years. Production every 90 minutes as of April 2026.',
    sourceName: 'Interesting Engineering / The AI Insider',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/figure-humanoid-robot-production-scale-up',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure AI exceeds $1B Series C at $39B valuation; LG Technology Ventures among investors',
    summary: 'Figure AI raised over $1 billion in Series C at $39 billion post-money valuation (15x increase from $2.6B in Feb 2024). Total funding now exceeds $1.9 billion. Investors include NVIDIA, Intel Capital, LG Technology Ventures, Salesforce, Qualcomm Ventures, Brookfield.',
    sourceName: 'Figure AI Official / PR Newswire',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Figure Helix-02 humanoid robots work full 8-hour autonomous shifts, self-charge between shifts',
    summary: 'Figure AI demonstrated Helix-02 robots running full 8-hour shifts autonomously with self-charging capability. Two robots cooperatively reset a bedroom in under 2 minutes, coordinating around shared objects without a central controller. Marks milestone for human-scale robotic labor.',
    sourceName: 'Seoul Economic Daily / TechTimes',
    sourceUrl: 'https://en.sedaily.com/society/2026/05/15/figure-ai-humanoid-robots-work-8-hour-shifts-self-charge-in',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree IPO accepted by Shanghai STAR Market, CSAC mandatory inspection underway',
    summary: 'Shanghai Stock Exchange accepted Unitree\'s IPO application on March 20, 2026. Targeting CNY 4.2B ($608M) raise. CSAC mandatory on-site inspection started April 1. If successful, listing expected mid-to-late 2026. Would become China\'s first publicly traded humanoid robotics company on STAR Market.',
    sourceName: 'Caixin Global / Bloomberg',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-03-20/chinese-robot-maker-unitree-seeks-610-million-in-shanghai-ipo',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree targets 20,000 humanoid shipments in 2026, 4x increase; production capacity expansion underway',
    summary: 'CEO Wang targets delivering up to 20,000 humanoid robots in 2026 (vs. 5,500+ in 2025), a 250%+ increase. Revenue reached 1.71B yuan ($250M) in 2025 with 335% YoY growth. Net profit rose 8x to 600M yuan. Global market share at 32.4% for humanoids.',
    sourceName: 'Interesting Engineering / eWeek',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/unitree-targets-20000-humanoid-robots',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Unitree open-sources UnifoLM-VLA-0 Vision-Language-Action model for autonomous household tasks',
    summary: 'Unitree released UnifoLM-VLA-0, an open-source Vision-Language-Action model enabling autonomous household tasks via natural language commands. First major open-source VLA from a hardware manufacturer, enabling community development.',
    sourceName: 'Unitree Official',
    sourceUrl: 'https://www.unitree.com/news/',
    competitorSlug: 'unitree',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree launches world\'s first Humanoid Robot App Store and $6,000 R1 lightweight humanoid',
    summary: 'Unitree introduced the world\'s first Humanoid Robot App Store at CES 2026, signaling a shift toward modular, software-driven ecosystems. Also launched R1 at just $6,000 (55 lbs). G1-D variant with wheeled base designed for data collection. G1 available from $16,000 across 16 configurations.',
    sourceName: 'RobotShop Community / Automate.org',
    sourceUrl: 'https://community.robotshop.com/blog/show/unitree-robotics-at-ces-2026-a-clear-signal-of-whats-coming-next',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Robotics signs RaaS agreement with Toyota Canada; 10 Digit units for RAV4 logistics',
    summary: 'Agility signed Robots-as-a-Service agreement with Toyota Motor Manufacturing Canada (Woodstock) following successful pilot. Expanding from 3 to 10 commercial units supporting RAV4 production logistics. First major automotive OEM RaaS deployment for humanoids.',
    sourceName: 'Yahoo Finance / Robot Report',
    sourceUrl: 'https://finance.yahoo.com/news/toyota-canada-confirms-2026-rollout-181246409.html',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Digit deployed at Mercado Libre Texas facility for commerce fulfillment',
    summary: 'Mercado Libre and Agility Robotics announced commercial agreement to bring Digit into Mercado Libre\'s San Antonio, TX facility for commerce fulfillment. Expands Digit\'s customer base beyond North American logistics into Latin American e-commerce leader.',
    sourceName: 'Robotics 24/7',
    sourceUrl: 'https://www.robotics247.com/article/agility_robotics_announces_digit_humanoid_robot_deployment_at_mercado_libre',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agility targets ISO functional safety certification for Digit by mid-to-late 2026',
    summary: 'CEO Peggy Johnson indicated Digit will achieve ISO functional safety certification by mid-to-late 2026. Would make Digit the first humanoid cleared to work cooperatively alongside people with no physical barriers. Next-gen Digit brings 50 lb payload and improved battery life.',
    sourceName: 'Agility Robotics / RoboZaps',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik raises $520M extension, total funding reaches $935M at $5B valuation',
    summary: 'Apptronik\'s Series A extension of $520M brings total funding to $935M at $5 billion valuation. Co-led by B Capital and Google, with new investors AT&T Ventures, John Deere, and Qatar Investment Authority (QIA). Plans to expand in Austin, open California office.',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Apptronik targets $1B in Apollo orders for 2027 at ~$80K/year per unit',
    summary: 'Investors expect $1 billion in Apollo robot orders starting 2027. Pricing model at approximately $80,000/year for high-volume delivery. Pilots underway at Mercedes-Benz and GXO Logistics. New humanoid robot debut scheduled 2026.',
    sourceName: 'Robot Report / CNBC',
    sourceUrl: 'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Google DeepMind Gemini Robotics models now powering next-gen Apollo; Jabil manufacturing partnership active',
    summary: 'Apptronik integrating Google DeepMind\'s Gemini Robotics AI models into Apollo. Combined with Jabil manufacturing partnership for scale production and ongoing pilots at Mercedes-Benz and GXO. New Apollo version tested for over a year.',
    sourceName: 'Automate.org / CNBC',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO Factory opens in Hayward CA: 10,000 units/year capacity, entire first-year production sold out in 5 days',
    summary: '1X\'s NEO Factory (58,000 sq ft, 200+ employees) commenced production April 30, 2026. Most vertically integrated humanoid factory in US. First-year production capacity of 10,000 units sold out in just 5 days after launch on Oct 28. Scaling to 100,000+/year by end 2027.',
    sourceName: 'GlobeNewsWire / Bloomberg',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X NEO features NVIDIA Jetson Thor brain and Isaac platform; $20,000 consumer price or $499/month',
    summary: 'Every NEO unit features NVIDIA Jetson Thor as core brain (NEO Cortex) for real-time AI inference. In-house manufacturing of motors, batteries, structures, sensors. Consumer price $20,000 or $499/month subscription. US deliveries starting 2026, global expansion 2027.',
    sourceName: '1X Official / Bloomberg',
    sourceUrl: 'https://www.1x.tech/discover/neo-factory',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot rolls out 10,000th robot in March 2026; 5K to 10K in just 3 months (4x acceleration)',
    summary: 'AGIBOT reached 10,000 humanoid robot milestone on March 30, 2026. Jump from 5,000 to 10,000 completed in just 3 months, representing 4x production acceleration. IDC ranked AGIBOT first in total humanoid shipment volume globally.',
    sourceName: 'The Robot Report / Agibot Official',
    sourceUrl: 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Agibot G2 deployed on live Longcheer tablet production line: 99.9% success rate, 310 units/hour',
    summary: 'AGIBOT G2 deployed on live consumer electronics line at Longcheer Technology. Performance: 310 units/hour throughput, 19-20 second cycle time, >99.9% success rate. Plans: scale to 100 robots by Q3 2026, expand into automotive/semiconductors/energy.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot adopts NVIDIA Isaac GR00T N models and Genie Sim 3.0 for industrial humanoid acceleration',
    summary: 'AGIBOT adopting NVIDIA Isaac GR00T N foundation models and launching Genie Sim 3.0 simulation platform integrated with Isaac Sim. Accelerates training and deployment of humanoid robots for industrial environments.',
    sourceName: 'NVIDIA Newsroom',
    sourceUrl: 'https://nvidianews.nvidia.com/news/nvidia-releases-new-physical-ai-models-as-global-partners-unveil-next-generation-robots',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'info',
  },
  {
    headline: 'Agibot wins multiple Best of CES 2026 awards for A2 Series service/logistics humanoids',
    summary: 'AGIBOT won multiple Best of CES 2026 awards for its humanoid robot portfolio. A2 Series designed for service and logistics automation. Full US market debut with A2, X2, and G2 product lines. Early deployments in hospitality and logistics throughout 2026.',
    sourceName: 'PR Newswire / Agibot',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibots-humanoid-robots-take-home-multiple-best-of-ces-2026-awards-following-us-debut-302663224.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Cross-industry regulatory update ──
  {
    headline: 'ISO 25785-1 humanoid safety standard in Working Draft stage; ISO 10218:2025 shifts to application-based certification',
    summary: 'ISO 25785-1 for dynamically stable robots (humanoids) remains in Working Draft as of early 2026. ISO 10218:2025 update shifts safety focus from hardware definitions to collaborative application certification. IEEE published new framework for humanoid robot standards. Current gap: no standard addresses dynamic bipedal locomotion risks.',
    sourceName: 'ISO / IEEE / AI Business',
    sourceUrl: 'https://aibusiness.com/robotics/ieee-framework-humanoid-robot-standards',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
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
    console.log(`  Date: 2026-05-16`);
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
