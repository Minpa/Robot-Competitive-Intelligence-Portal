#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-10
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-10.ts
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

// ── Collected Intelligence Data (2026-05-10) ──────────────────

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
    headline: 'Tesla Optimus V3 mid-2026 debut confirmed, mass production targeted Q3 2026',
    summary: 'Tesla confirmed Optimus V3 humanoid robot debut for mid-2026, with large-scale production targeted between July and August 2026. The third-generation model features 37 joints, improved dexterity, and walking speed of 1.2 m/s. Model S/X production at Fremont factory ceasing Q2 2026 to free capacity for Optimus manufacturing.',
    sourceName: 'TradingKey / AI Base',
    sourceUrl: 'https://www.tradingkey.com/analysis/stocks/us-stocks/261814739-tesla-third-generation-humanoid-robot-debut-mid-year-tradingkey',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla converts Fremont Model S/X lines to Optimus production, targets 1M units/year capacity',
    summary: 'Tesla announced on Q4 2025 earnings call that Model S and Model X will cease production in Q2 2026 at Fremont factory. Lines converted for humanoid robot manufacturing. Stated goal: 1 million Optimus robots per year. Second factory under construction at Giga Texas for 2027 ramp.',
    sourceName: 'eWeek / RoboZaps',
    sourceUrl: 'https://www.eweek.com/robotics/tesla-optimus-robot-launch-timeline/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus target pricing $20,000-$30,000 at full-scale production',
    summary: 'Elon Musk reiterated the Optimus robot could cost between $20,000 and $30,000 once at full-scale production, positioning it as the most affordable humanoid robot in the market.',
    sourceName: 'Standard Bots / Built In',
    sourceUrl: 'https://standardbots.com/blog/tesla-robot',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics Atlas officially in production as of March 2026, all 2026 deployments fully committed',
    summary: 'Production Atlas is officially shipping as of March 2026. All 2026 deployments are fully committed, with fleets going to Hyundai RMAC and Google DeepMind. Atlas has 7.5 ft reach, lifts 110 lbs, operates in -4°F to 104°F range.',
    sourceName: 'Automate.org / The Register',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Atlas demonstrates humanlike handstand balance and gymnastic skills',
    summary: 'Boston Dynamics released test footage showing Atlas performing controlled handstands with coordinated arm balance. Engineers demonstrate advanced balance and mobility capabilities with seamless transitions between poses.',
    sourceName: 'Korea Herald / Interesting Engineering',
    sourceUrl: 'https://www.koreaherald.com/article/10732354',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'HMG plans 30,000 Atlas robots/year factory, deployment at Metaplant America by 2028',
    summary: 'Hyundai Motor Group confirmed deployment of Atlas at Hyundai Motor Group Metaplant America by 2028, starting with parts sequencing before expanding to full component assembly by 2030. HMG and Boston Dynamics building new robotics factory with 30,000 units/year capacity.',
    sourceName: 'Hyundai Newsroom',
    sourceUrl: 'https://www.hyundai.com/worldwide/en/newsroom/detail/0000001105',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI scales Figure 03 production to 1 robot/hour at BotQ factory (24x throughput increase)',
    summary: 'Figure AI increased production from 1 Figure 03 per day to 1 per hour — a 24x throughput improvement in under 120 days at BotQ factory. Over 350 robots produced, 9,000+ actuators across 10+ product variants. Targeting 12,000 units/year, scaling to 100,000 over four years.',
    sourceName: 'Figure AI Official / eWeek',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure AI launches Helix VLA model — first to control full humanoid upper body with dual-robot coordination',
    summary: 'Helix is a generalist Vision-Language-Action model unifying perception, language understanding, and learned control. First VLA to output high-rate continuous control of entire humanoid upper body including wrists, torso, head, and individual fingers. First VLA to simultaneously operate two robots solving shared long-horizon manipulation tasks.',
    sourceName: 'Figure AI Official',
    sourceUrl: 'https://www.figure.ai/news/helix',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Figure 02 robots produced 30,000+ vehicles at BMW Spartanburg, 90,000+ parts moved',
    summary: 'Figure 02 commercial deployment at BMW Spartanburg supported production of 30,000+ vehicles with 1,250+ operational hours and 90,000+ parts moved. System 0 AI model enables Figure 03 to navigate stairs, ramps and uneven terrain using stereo camera perception without task-specific programming.',
    sourceName: 'Multiple / Figure AI',
    sourceUrl: 'https://www.figure.ai/news',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree files $610M Shanghai STAR Market IPO, 335% revenue growth in 2025',
    summary: 'Unitree filed for $610M Shanghai STAR Market IPO in March 2026. Operating income grew 335% YoY to ¥1.708 billion in 2025, net profit soared 674%. Gross margin improved to nearly 60%. Expected to become China\'s first publicly traded humanoid robotics company mid-2026.',
    sourceName: 'Rest of World / CNBC / Caixin',
    sourceUrl: 'https://restofworld.org/2026/unitree-china-humanoid-robot-shanghai-ipo/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree humanoid sales surpass robot dogs, targeting 20,000 shipments in 2026',
    summary: 'Unitree shipped 5,500 humanoid robots in 2025 (global #1 by volume), targeting 20,000 units in 2026. Humanoid robot sales have now surpassed robot dogs as core revenue driver. Product lineup: G1 (from $16,000), H1, R1, H2.',
    sourceName: 'Humanoids Daily / eWeek',
    sourceUrl: 'https://www.humanoidsdaily.com/news/unitree-files-for-580m-ipo-humanoid-sales-surpass-robot-dogs-as-profits-soar',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Robotics rebrands to "Agility" in March 2026, signals platform expansion',
    summary: 'Agility Robotics officially rebranded to "Agility" on March 5, 2026. Name change signals expanding beyond humanoid robots into broader automation solutions, targeting additional industries with labor shortages.',
    sourceName: 'The AI Insider',
    sourceUrl: 'https://theaiinsider.tech/2026/03/06/humanoid-robot-maker-agility-robotics-rebrands-becomes-agility/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },
  {
    headline: 'Digit demonstrates 65-lb deadlift with whole-body coordination',
    summary: 'Agility\'s Digit humanoid robot demonstrated lifting 65 pounds (29 kg) with controlled precision in lab environment. Highlights advances in whole-body coordination where arms, legs, and torso dynamically adjust to maintain balance under heavy load.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/us-digit-humanoid-robot-deadlift',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'Digit passes NRTL field inspection, pursuing ISO functional safety certification for human collaboration',
    summary: 'Digit passed critical Nationally Recognized Test Lab (NRTL) field inspection — key regulatory milestone for commercial deployment. Pursuing ISO functional safety certification to be first humanoid cleared for cooperative human collaboration without physical barriers, targeted mid-to-late 2026.',
    sourceName: 'Automation World / Humanoids Daily',
    sourceUrl: 'https://www.automationworld.com/factory/robotics/article/55303585/agility-robotics-agility-robotics-digit-shows-promise-in-line-side-operations-with-new-iso-safety-standard-on-the-horizon',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'critical',
  },
  {
    headline: 'Digit integrates with MiR AMRs and Zebra at ProMat 2026 Chicago',
    summary: 'Digit demonstrated integration with MiR Autonomous Mobile Robots and Zebra Technologies at ProMat 2026 in Chicago (March). Working alongside AMRs at GXO deployment near Atlanta. 7+ commercial Toyota Canada units active for RAV4 logistics.',
    sourceName: 'Multiple',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'partnership',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apollo powered by Gemini 3 and Gemini Robotics AI — performs diverse tasks without retraining',
    summary: 'Apptronik\'s Apollo now powered by Google DeepMind\'s Gemini 3 and Gemini Robotics AI models. Can watch demonstrations, follow natural-language instructions, plan multi-step actions, and handle unfamiliar objects without environment-specific retraining.',
    sourceName: 'Interesting Engineering / CNBC',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/us-startup-raises-funds-to-deploy-apollo',
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Apptronik readies new Apollo variant debut for 2026',
    summary: 'Apptronik developing new Apollo robot variant set to debut in 2026. Current Apollo: 5\'8" (1.72m), 160 lbs, lifts 55 lbs. Testing underway at Mercedes-Benz, GXO Logistics, and Jabil factories/warehouses. $935M total raised at $5B+ valuation.',
    sourceName: 'TechCrunch / SiliconANGLE',
    sourceUrl: 'https://techcrunch.com/2026/02/11/humanoid-robot-startup-apptronik-has-now-raised-935m-at-a-5b-valuation/',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X opens NEO Factory in Hayward, CA — America\'s first vertically integrated humanoid robot factory',
    summary: '1X opened NEO Factory in Hayward, California on April 30, 2026. 58,000 sq ft facility with 200+ employees. America\'s first vertically integrated humanoid robot factory with in-house manufacturing of motors, batteries, transmission, sensors. Capacity: 10,000 NEOs/year, scaling to 100,000+ by end of 2027.',
    sourceName: 'GlobeNewswire / Bloomberg',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X NEO sells out entire first-year production (10,000 units) in 5 days',
    summary: 'NEO launched October 28 and sold out entire first-year production capacity of over 10,000 units in just 5 days. Available at $20,000 early access price or $499/month subscription. Consumer shipments planned to begin in 2026. Powered by NVIDIA Jetson Thor processor.',
    sourceName: 'TechFundingNews / Interesting Engineering',
    sourceUrl: 'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agibot (X1 / A2 / G2) ──
  {
    headline: 'Agibot launches global rental platform at MWC 2026 — humanoids at €899/day',
    summary: 'Agibot launched global robot rental platform at MWC 2026 in Barcelona, offering humanoid robots at €899 per day. Won GLOMO Award at MWC 2026. New global collaborations announced. Business model shift from sales-only to RaaS (Robotics-as-a-Service).',
    sourceName: 'Humanoids Daily / Agibot Official',
    sourceUrl: 'https://www.humanoidsdaily.com/news/agibot-launches-global-rental-platform-at-mwc-2026-offering-humanoids-for-899-a-day',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot partners with Minth Group for European expansion, opens Malaysia experience center',
    summary: 'Agibot partnered with Minth Group as strategic European sales agent, leveraging Minth\'s 15 years of EU localization and factory network as robot training grounds. Opened first overseas experience center in Malaysia at i-City, Selangor. Strategic hubs in Malaysia, Singapore (Singtel/NCS), and US (Michigan).',
    sourceName: 'KR-Asia / Agibot Official',
    sourceUrl: 'https://kr-asia.com/agibot-kicks-off-apac-expansion-with-malaysia-launch-event',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot showcases A2, X2, G2 Series at CES 2026 — 5,000 robots shipped to date',
    summary: 'Agibot portfolio at CES 2026: A2 Series (full-sized humanoid for guided presentations/showrooms), X2 Series (half-sized compact for entertainment/research/education), G2 Series (industrial-grade with force-controlled manipulation). Operational across 8 commercial applications. 5,000 robots shipped total.',
    sourceName: 'PR Newswire / Intelligent CIO',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
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
            category: alert.category,
            collectedAt: '2026-05-10T00:00:00.000Z',
          }),
        ]
      );
      insertedCompAlerts++;
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  ARGOS CI War Room Update Complete');
    console.log('========================================');
    console.log(`  Date: 2026-05-10`);
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
