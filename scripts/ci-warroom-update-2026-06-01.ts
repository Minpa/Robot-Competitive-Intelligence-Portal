#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-06-01
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-06-01.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

// ── Collected Intelligence Data (2026-06-01) ──────────────────

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
    headline: 'Tesla breaks ground on dedicated Optimus factory at Giga Texas targeting 10M units/year capacity',
    summary: 'Tesla Q1 2026 report confirms 5.2M sq ft Optimus factory expansion at Gigafactory Texas targeting 10 million robots/year. First steel structure raised per May 27 drone footage. Second-generation production line targeting high-volume output by Summer 2027. Fremont conversion to begin July/August 2026 after Model S/X phase-out in May.',
    sourceName: 'The Robot Report / Teslarati',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus Gen 3 design revealed with OLED face display and 22-DOF hands for mass production',
    summary: 'Tesla plans Gen 3 Optimus reveal featuring redesigned hands with 22 confirmed degrees of freedom for fine motor tasks and an OLED display face. Gen 3 is the first design explicitly engineered for mass production. CEO Musk warns initial output will be "quite slow" given 10,000 unique parts across an entirely new production line.',
    sourceName: 'Basenor / Tesla Official',
    sourceUrl: 'https://www.basenor.com/blogs/news/tesla-optimus-gen-3-face-revealed-oled-display-and-whats-coming',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Tesla Optimus robots operating in factories for learning/data collection; consumer sales targeted end of 2027',
    summary: 'As of May 2026, Optimus robots are operating within Tesla factories primarily for learning and data collection rather than productive tasks. Morgan Stanley maintains bullish robotics thesis. Consumer sales targeted for end of 2027. Musk acknowledged robots are currently gathering operational data to improve AI capabilities.',
    sourceName: 'Teslarati / SEC Filing',
    sourceUrl: 'https://www.teslarati.com/tesla-tsla-optimus-already-benefiting-investors-wall-street-firm-says/',
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'demo',
    severity: 'info',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics Atlas trains to lift 100+ lb industrial loads using AI-driven whole-body control',
    summary: 'Boston Dynamics demonstrated Atlas lifting appliances weighing over 100 lbs (trained on 50-70 lb loads, successfully moved a fridge exceeding 100 lbs). Uses AI-driven whole-body control and simulation-to-real transfer. All 2026 Atlas deployments fully committed to Hyundai RMAC and Google DeepMind.',
    sourceName: 'Interesting Engineering / Robotics & Automation News',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/boston-dynamics-atlas-humanoid-heavy-lifting-simulation',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Hyundai Mobis confirmed as actuator supplier for Atlas; production-ready Atlas launched at CES 2026',
    summary: 'Hyundai Mobis will supply actuators for Atlas production units, creating a reliable component supply chain within the Hyundai Motor Group ecosystem. Production version of Atlas was unveiled at CES 2026 on January 5 by CEO Robert Playter. Additional customers to be onboarded starting early 2027.',
    sourceName: 'Automate.org / Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 fleet completes 200-hour autonomous livestream sorting 249,560 packages with zero hardware failures',
    summary: 'Starting May 14, 2026, three F.03 robots ran 200 hours straight processing 249,560 packages without a single hardware failure or human intervention. Robots coordinated battery swaps every 3-4 hours autonomously using Helix-02 AI system. Livestreamed publicly. A separate 10-hour human vs robot competition showed robot at 98.5% human-equivalent performance.',
    sourceName: 'Interesting Engineering / Sherwood News / Seoul Economic Daily',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/figure-03-humanoid-robot-200-hour-shift',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 production reaches 1 robot/hour at BotQ; 350+ units delivered, 9000+ actuators produced',
    summary: 'Figure AI scaled manufacturing from 1 robot/day to 1 robot/hour in under four months at BotQ facility. Over 350 Figure 03 units delivered. First-pass yields above 80%, over 9,000 actuators produced across 10+ product variants. Plans to ship 100,000 humanoids over four years.',
    sourceName: 'The AI Insider / Interesting Engineering',
    sourceUrl: 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Unitree ──
  {
    headline: 'Unitree GD01 transformable mecha unveiled alongside $7B IPO filing on Shanghai STAR Market',
    summary: 'Unitree unveiled 2.8m transformable mecha GD01 (walks bipedal, folds to quadruped, 500kg with pilot, priced from ¥3.9M/$650K). IPO filing targets CNY 4.2B ($608M) raise. CSAC mandatory inspection started April 1. If successful, listing expected mid-to-late 2026 — China\'s first publicly traded humanoid robotics company.',
    sourceName: 'The Next Web / Bloomberg / Rest of World',
    sourceUrl: 'https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree holds 70% quadruped market share, 32.4% humanoid share; revenue ¥1.71B with 335% YoY growth',
    summary: 'Unitree holds 70% of the quadruped robot market and 32.4% humanoid market share globally. Revenue reached ¥1.708 billion ($250M) in 2025 with 335% YoY growth. Net profit rose 8x to ¥600M. Profitable since 2020. Humanoid sales now surpass robot dogs.',
    sourceName: 'Humanoids Daily / KraneShares',
    sourceUrl: 'https://www.humanoidsdaily.com/news/unitree-files-for-580m-ipo-humanoid-sales-surpass-robot-dogs-as-profits-soar',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Unitree launches UniStore — world\'s first Humanoid Robot App Store for G1/H1 platforms',
    summary: 'Unitree introduced UniStore, the world\'s first humanoid robot application store. Users can browse, download, and install motion and task packages onto Unitree robots with a single tap from a smartphone app. Signaling shift toward modular, software-driven ecosystem. R1 lightweight humanoid launched at $6,000.',
    sourceName: 'RobotsBeat / RobotShop Community',
    sourceUrl: 'https://robotsbeat.com/unitree-unistore-robot-app-store-humanoid-g1-h1-ecosystem/',
    competitorSlug: 'unitree',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Digit exceeds 100,000 totes moved in live commerce operations across Fortune 500 customers',
    summary: 'Digit has moved over 100,000 totes in live commerce operations, proving reliability, safety and value on the warehouse floor. Fortune 500 customers include GXO (world\'s largest pure-play contract logistics), Schaeffler, Amazon, Toyota Canada, and Mercado Libre.',
    sourceName: 'Agility Robotics Official',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Agility Robotics co-leads ISO 25785-1 humanoid safety standard working group with Boston Dynamics',
    summary: 'ISO 25785-1, the first international safety standard for dynamically stable (bipedal) robots, remains in development. The working group is led by experts from Agility Robotics, Boston Dynamics, and the A3 Association. Standard covers industrial workplace use, addressing robots requiring active balance control. Final publication expected 2026-2027.',
    sourceName: 'ISO / LinkedIn (Agility Robotics)',
    sourceUrl: 'https://www.linkedin.com/posts/agilityrobotics_today-marks-a-significant-milestone-for-the-activity-7326673146223251456-5kG5',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik testing new next-gen Apollo for over a year; debut scheduled 2026 with Gemini Robotics AI',
    summary: 'Apptronik has been testing its next-generation Apollo humanoid for over a year. New version integrates Google DeepMind Gemini Robotics AI models. Pilots ongoing at Mercedes-Benz and GXO Logistics. Jabil manufacturing partnership active for scale production. Debut of new Apollo scheduled 2026.',
    sourceName: 'Automate.org / CNBC',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Apptronik $935M total funding at $5B valuation; new investors include AT&T Ventures, John Deere, QIA',
    summary: 'Series A extension of $520M brings total funding to $935M at $5B valuation. Co-led by B Capital and Google, with new investors AT&T Ventures, John Deere & Co., and Qatar Investment Authority. Plans to expand Austin operations and open California office. Targeting $1B in Apollo orders for 2027 at ~$80K/year per unit.',
    sourceName: 'CNBC / Crunchbase News',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO consumer deliveries begin Q3-Q4 2026; $20,000 Early Access or $499/month subscription',
    summary: 'NEO consumer deliveries starting Q3-Q4 2026 in US and Canada, global expansion 2027. Early Access at $20,000 includes priority delivery; subscription model at $499/month ships later. Pre-orders with $200 refundable deposit. NVIDIA Jetson Thor (NEO Cortex) powers real-time AI inference onboard.',
    sourceName: '1X Official / The Robot Report',
    sourceUrl: 'https://www.1x.tech/discover/neo-home-robot',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: '1X NEO Factory: 58,000 sq ft, 200+ employees, most vertically integrated humanoid factory in US',
    summary: '1X NEO Factory in Hayward, CA commenced full-scale production April 30, 2026. 58,000 sq ft, 200+ employees. Designs and manufactures motors, batteries, structures, transmission systems, sensors in-house. Capacity 10,000 units/year, targeting 100,000+ by end 2027. Entire first-year production sold out in 5 days.',
    sourceName: 'GlobeNewsWire / eWeek',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Agibot ──
  {
    headline: 'Agibot A3 humanoid robot unveiled: 173cm, 55kg, industry-leading 0.218 kW/kg power-to-weight ratio',
    summary: 'AGIBOT A3 is a new generation platform for interactive environments at 173cm/55kg with industry-leading 0.218 kW/kg power-to-weight ratio. Full portfolio unveiled at Munich: A2 (full-size humanoid), X2 (compact), G2 (industrial), D1 (quadruped). "One Robotic Body, Three Intelligences" architecture integrating motion, manipulation, and human interaction.',
    sourceName: 'PR Newswire / Robotics & Automation News',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agibot partners with Minth Group for European market expansion; builds humanoid robots in Europe',
    summary: 'AGIBOT signed strategic partnership with Minth Group (Tier 1 automotive parts supplier) for European market entry. Munich launch event. Minth serves as sales agent for Europe, leveraging 15 years of localization. Minth factories serve as training grounds for robotic learning/data. First overseas AI robot experience center opened in Malaysia.',
    sourceName: 'ASSEMBLY Magazine / Yicai Global',
    sourceUrl: 'https://www.assemblymag.com/articles/99886-agibot-launches-new-humanoid-robots-partners-with-minth-to-advance-robotics-training',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot launches global rental platform at MWC 2026 offering humanoids for €899/day',
    summary: 'AGIBOT launched a global rental platform at MWC 2026, offering humanoid robots starting from €899 per day. Lowers barrier to entry for enterprises exploring humanoid automation. Combined with 10,000+ units produced milestone (March 2026), positions Agibot as accessible mass-market humanoid provider.',
    sourceName: 'Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/agibot-launches-global-rental-platform-at-mwc-2026-offering-humanoids-for-899-a-day',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'info',
  },

  // ── Cross-industry: Regulatory ──
  {
    headline: 'ASTM calls for urgent safety standards for humanoid robots; ISO 25785-1 Working Draft advancing toward 2027 publication',
    summary: 'ASTM International published call for urgent humanoid robot safety standards. ISO 25785-1 for dynamically stable robots remains in Working Draft with final publication expected 2026-2027. ISO 10218:2025 shifts safety focus from hardware definitions to collaborative application certification. Current gap: no standard addresses dynamic bipedal locomotion risks.',
    sourceName: 'Tech Journal UK / ISO',
    sourceUrl: 'https://www.techjournal.uk/p/astm-calls-for-urgent-safety-standards',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'info',
  },
];

// ── New competitors to ensure exist ──
const additionalCompetitors = [
  { slug: 'unitree', name: 'G1/H1', manufacturer: 'Unitree Robotics', country: '🇨🇳', stage: 'commercial', sortOrder: 7 },
  { slug: 'apollo', name: 'Apollo', manufacturer: 'Apptronik', country: '🇺🇸', stage: 'pilot', sortOrder: 8 },
  { slug: 'agibot', name: 'G2/A3', manufacturer: 'Agibot', country: '🇨🇳', stage: 'commercial', sortOrder: 9 },
];

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 0. Ensure additional competitors exist
    for (const comp of additionalCompetitors) {
      const existing = await client.query('SELECT id FROM ci_competitors WHERE slug = $1', [comp.slug]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO ci_competitors (slug, name, manufacturer, country, stage, sort_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [comp.slug, comp.name, comp.manufacturer, comp.country, comp.stage, comp.sortOrder]
        );
        console.log(`  + Added competitor: ${comp.slug}`);
      }
    }

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
      const companyNameMap: Record<string, string> = {
        optimus: 'Tesla',
        atlas: 'Boston Dynamics',
        figure: 'Figure',
        digit: 'Agility',
        neo: '1X',
        apollo: 'Apptronik',
        unitree: 'Unitree',
        agibot: 'Agibot',
      };

      const robotRow = await client.query(
        `SELECT hr.id FROM humanoid_robots hr
         JOIN companies c ON hr.company_id = c.id
         WHERE c.name ILIKE $1
         LIMIT 1`,
        [`%${companyNameMap[alert.competitorSlug] || alert.competitorSlug}%`]
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
    console.log(`  Date: 2026-06-01`);
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
