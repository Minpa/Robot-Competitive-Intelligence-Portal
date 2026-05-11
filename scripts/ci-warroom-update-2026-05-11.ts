#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-11
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-11.ts
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

// ── Collected Intelligence Data (2026-05-11) ──────────────────

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
    headline: 'Tesla ends Model S/X production at Fremont, pivots entire line to Optimus robot manufacturing',
    summary: 'Tesla built its last Model S and Model X at Fremont on May 10, 2026. The production lines are being converted to Optimus Gen 3 humanoid robot manufacturing, with robot production starting late July/August 2026. Signature Edition delivery ceremony scheduled for May 12, 2026.',
    sourceName: 'EVXL / Electrek',
    sourceUrl: 'https://evxl.co/2026/05/10/tesla-last-model-s-x-fremont-optimus/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus Gen 3 hands feature 25 actuators per forearm/hand (50 total), 4.5x increase from Gen 2',
    summary: 'Optimus Gen 3 showcased at AWE 2026 Shanghai features ultra-detailed dexterous hands with 25 actuators per forearm/hand assembly (50 total per robot), a 4.5x increase from Gen 2. Production cost target under $20,000 at 1M units/year scale.',
    sourceName: 'China Robotics Daily',
    sourceUrl: 'https://chinaroboticsdaily.com/tesla-optimus-gen-3-awe-2026/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Tesla invests $2B in xAI for Optimus core AI algorithm development',
    summary: 'Tesla invested $2 billion in Musk\'s xAI, forming a deep strategic partnership to advance core algorithms for autonomous driving and humanoid robots. This accelerates Optimus AI capabilities with shared AI infrastructure.',
    sourceName: 'Supply Chain Today',
    sourceUrl: 'https://www.supplychaintoday.com/why-the-tesla-optimus-robot-will-take-over-in-2026/',
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Tesla targets 1M Optimus units/year at new Giga Texas dedicated facility, production summer 2027',
    summary: 'Second Optimus factory under construction at Giga Texas North Campus with 1M units/year capacity target. Production expected to start summer 2027. Long-term ambition remains 10M units/year.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics Atlas wins "Best Robot" at CES 2026, all 2026 deployments fully committed',
    summary: 'Production Atlas won CNET "Best Robot" at CES 2026. Standing 6.2 ft tall with 56 DOF, 7.5 ft reach, 110 lb lift capacity, minus 4 to 104°F operating range. All 2026 unit deployments fully committed. 30K-unit/year factory planned for 2028.',
    sourceName: 'CNET / Hyundai Motor Group',
    sourceUrl: 'https://www.hyundaimotorgroup.com/en/news/CONT0000000000199186',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Hyundai Mobis confirmed as Atlas actuator supplier, joint supply chain build-out underway',
    summary: 'Hyundai Mobis will supply actuators for production Atlas. The two organizations are building a highly reliable component supply chain and accelerating actuator development and production scale-up jointly.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'partnership',
    severity: 'info',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 appears at White House Fostering the Future Summit with First Lady Melania Trump',
    summary: 'Figure 03 humanoid robot appeared alongside First Lady Melania Trump at the White House "Fostering the Future Together Global Coalition Summit" in March 2026. Described as the White House\'s "first humanoid robot guest."',
    sourceName: 'CNBC',
    sourceUrl: 'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'Figure 02 completes 11-month BMW Spartanburg deployment: 90,000+ parts, 1,250+ runtime hours',
    summary: 'Figure 02 completed 11-month deployment at BMW Spartanburg plant running daily 10-hour shifts, loading over 90,000 parts across 1,250+ runtime hours, contributing to 30,000+ X3 vehicles. BotQ factory targets 100,000 robots over four years.',
    sourceName: 'Figure AI / Wikipedia',
    sourceUrl: 'https://en.wikipedia.org/wiki/Figure_AI',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Figure 03 specs: 5\'8" tall, 61kg, 20kg payload, 5hr swappable battery, 16 DOF hands',
    summary: 'Figure 03: 5\'8" height, 61 kg weight, 20 kg payload, 1.2 m/s walk speed, 5-hour runtime on swappable 2.3 kWh battery with wireless inductive charging. 16 DOF hands, soft textile covering for safe human interaction, integrated cables eliminating external wiring.',
    sourceName: 'Figure AI Official / Multiple',
    sourceUrl: 'https://www.figure.ai/news',
    competitorSlug: 'figure',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Unitree ──
  {
    headline: 'Unitree IPO application accepted by Shanghai Stock Exchange STAR Market, targeting $608M raise',
    summary: 'Shanghai Stock Exchange formally accepted Unitree\'s IPO application on March 20, 2026. Targeting CNY 4.2B ($608M) raise by issuing 40.45M+ shares. A-share listing expected mid-2026, making them China\'s first publicly traded humanoid robotics company. CSAC mandatory inspection on April 1.',
    sourceName: 'Rest of World / SCMP',
    sourceUrl: 'https://restofworld.org/2026/unitree-china-humanoid-robot-shanghai-ipo/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree posts $250M revenue and $90M net profit in 2025, shipped 5,500+ humanoids (32.4% global share)',
    summary: 'Unitree posted 1.71B yuan ($250M) revenue, 600M yuan ($90M) adjusted net profit in 2025. Shipped 5,500+ humanoid robots capturing 32.4% global market share — more than any other manufacturer. Targets 10,000-20,000 humanoid shipments in 2026.',
    sourceName: 'KraneShares / SCMP',
    sourceUrl: 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Unitree G1 priced from $16,000 across 16 configurations, disrupting the humanoid market',
    summary: 'Unitree G1 now available from $16,000 across 16 different configurations (up to $73,900 for top-end). G1 demonstrated roller skating, ice skating, spins, and front flips using wheeled+legged hybrid locomotion with real-time balance correction.',
    sourceName: 'RoboHorizon / BotInfo',
    sourceUrl: 'https://robohorizon.com/en-us/news/2026/04/unitree-g1-humanoid-drops-for-16000-upending-the-robotics-market/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Digit surpasses 100K totes at GXO, integrates with MiR and Zebra AMRs via Arc cloud platform',
    summary: 'Digit surpassed 100,000 totes handled at GXO Flowery Branch facility. Agility\'s Arc cloud robotic platform now integrates with AMRs from MiR and Zebra Technologies, demonstrated at ProMat Chicago in March 2026. Digit is the industry\'s only commercially deployed humanoid.',
    sourceName: 'Agility Robotics',
    sourceUrl: 'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agility targets ISO functional safety certification for Digit by mid-to-late 2026',
    summary: 'CEO Peggy Johnson indicated Digit will achieve ISO functional safety certification by mid-to-late 2026. Next-gen Digit brings 50 lb payload, improved battery life, and enhanced manipulation capabilities. 7+ commercial units active at Toyota Canada.',
    sourceName: 'Agility Robotics / RoboZaps',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik next-gen Apollo tested for over a year, commercial-scale deployment targeted H2 2026',
    summary: 'The latest Apollo version has been in Apptronik facilities for roughly a year, deployed for commercial pilots with Google Gemini Robotics partnership. More units of the new system produced than its 2023 predecessor. Commercial-scale deployment targeted H2 2026.',
    sourceName: 'Automate.org / CNBC',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Google DeepMind strategic partnership: Gemini Robotics powering next-gen Apollo',
    summary: 'Apptronik\'s industry-leading strategic partnership with Google DeepMind integrates Gemini Robotics into Apollo. Combined with Jabil manufacturing partnership and pilots at Mercedes-Benz and GXO, this positions Apollo for rapid commercial scale.',
    sourceName: 'Robot Report / TechCrunch',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X opens NEO Factory in Hayward CA — America\'s first vertically integrated humanoid robot factory',
    summary: '1X\'s NEO Factory in Hayward, CA commenced full-scale production on April 30, 2026. Most vertically integrated humanoid robot factory in the US. Targeting 10,000 units in year one, scaling to 100,000/year by end of 2027. First consumer shipments planned for 2026.',
    sourceName: 'GlobeNewsWire / 1X',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X partners with NVIDIA: NEO uses Jetson Thor brain and Isaac open robotics platform',
    summary: 'Strategic partnership with NVIDIA: NEO uses Jetson Thor as main compute and NVIDIA Isaac open robotics platform for training. Combines world-class hardware, simulation frameworks and synthetic data generation.',
    sourceName: 'Briefs.co / 1X',
    sourceUrl: 'https://www.briefs.co/news/1x-robots-neo/',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'NEO priced at $20,000 for consumer market, $499/month subscription option available',
    summary: 'NEO consumer price set at $20,000 or $499/month subscription. Designed as safe, intelligent, general-purpose home robot. CES 2026 debut targeting US household market. OpenAI is an investor.',
    sourceName: 'AIBase / TechCrunch',
    sourceUrl: 'https://news.aibase.com/news/24272',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Agibot ──
  {
    headline: 'Agibot rolls out 10,000th humanoid robot — first company to reach this milestone',
    summary: 'AGIBOT claimed to be one of the first companies to have rolled out 10,000 humanoid robots. IDC ranked AGIBOT first in total shipment volume. Leading in entertainment, research/education, exhibition/reception, and manufacturing segments.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Agibot G2 deployed on live Longcheer Technology tablet production line, 100 robots by Q3 2026',
    summary: 'AGIBOT G2 humanoid robots deployed on live consumer electronics manufacturing line at Longcheer Technology tablet facility. Plans to scale to 100 robots by Q3 2026 and expand into automotive, semiconductors, and energy sectors.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot unveils A2 Series at CES 2026 for service and logistics automation',
    summary: 'Shanghai-based AgiBot unveiled A2 Series humanoid robots at CES 2026, marking global expansion into service and logistics automation. Early deployments scheduled for hospitality and logistics settings throughout 2026.',
    sourceName: 'PR Newswire / Agibot',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'LG CEO visits Agibot in Shanghai, deepening strategic cooperation after equity stake',
    summary: 'LG Electronics CEO Lyu Jae-cheol visited Agibot in Shanghai during a 3-day trip, meeting leadership to discuss humanoid robotics trends and further collaboration. LG took equity stake in Agibot in August 2025. Agibot partnered with Minth Group for European expansion.',
    sourceName: 'Korea Herald',
    sourceUrl: 'https://www.koreaherald.com/article/10694574',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'NVIDIA partners with Agibot for Physical AI: new foundation models for next-gen humanoids',
    summary: 'NVIDIA released new Physical AI models with Agibot as a global partner for next-generation robot development. Integration of NVIDIA robotics platform enables enhanced embodied AI capabilities across Agibot\'s humanoid portfolio.',
    sourceName: 'NVIDIA Newsroom',
    sourceUrl: 'https://nvidianews.nvidia.com/news/nvidia-releases-new-physical-ai-models-as-global-partners-unveil-next-generation-robots',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
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
    console.log(`  Date: 2026-05-11`);
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
