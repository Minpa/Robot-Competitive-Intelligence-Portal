#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-17
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-17.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-17) ──────────────────

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
    headline: 'Tesla breaks ground on 5.2M sqft Optimus factory at Giga Texas North Campus, targeting 10M units/year',
    summary: 'Tesla confirmed 5.2 million square feet of new building space at Giga Texas North Campus for a dedicated second-generation Optimus factory. Construction investment estimated at $5-10 billion. Long-term production target: 10 million robots per year. Low-volume output from Austin projected to begin summer 2026, full ramp targeting 2027.',
    sourceName: 'The Robot Report / Teslarati',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus Gen 3 hands feature 50 actuators (25/hand) with 22 DOF per hand, 4.5x increase from Gen 2',
    summary: 'Elon Musk revealed Gen 3 hand system on Feb 17, 2026. Each forearm/hand unit houses 25 actuators (50 total per robot), enabling 22 degrees of freedom per hand vs. 11 in Gen 2. Board Chair Robyn Denholm confirmed hands can wash clothes, clean dishes, and shake hands with highly sensitive touch. Production scheduled summer 2026.',
    sourceName: 'Basenor / Humanoids Daily',
    sourceUrl: 'https://www.basenor.com/blogs/news/tesla-optimus-gen-3-hands-revealed-50-actuator-precision-leap',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics begins Atlas production at Boston HQ; all 2026 units committed to Hyundai RMAC and Google DeepMind',
    summary: 'Production of the new Atlas robot has commenced at Boston Dynamics headquarters. All 2026 deployments are fully committed, shipping to Hyundai Robotics Metaplant Application Center (RMAC) and Google DeepMind. RMAC set to open in 2026. Atlas robots will begin sequencing tasks at HMGMA by 2028, with assembly operations by 2030.',
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
    headline: 'Figure 02 completes 11-month BMW Spartanburg deployment: 30,000 X3 vehicles, 90,000 components, 1,250 hours',
    summary: 'Figure AI Figure 02 humanoid completed an 11-month deployment at BMW Spartanburg plant. Results: contributed to 30,000+ BMW X3 vehicles produced, loaded 90,000+ sheet metal components, accumulated 1,250 operational hours running 10-hour weekday shifts. Placement accuracy exceeded 99% per shift with 84-second target cycle time consistently met.',
    sourceName: 'Figure AI Official / BMW Group',
    sourceUrl: 'https://www.figure.ai/news/production-at-bmw',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'BMW Group deploys humanoid robots at Leipzig plant Germany; first European pilot from April 2026',
    summary: 'BMW Group began test deployment of humanoid robots at Plant Leipzig in December 2025, with expanded pilot from April 2026. First European deployment of humanoids in automotive production. Robots used in high-voltage battery assembly and component manufacturing. Full pilot phase scheduled summer 2026.',
    sourceName: 'BMW Group Press / BMW Blog',
    sourceUrl: 'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Figure AI System 0 gains perception-conditioned whole-body control: zero-shot sim-to-real stair/terrain navigation',
    summary: 'Figure released major System 0 AI model update adding visual perception integration with whole-body control. Onboard stereo cameras convert RGB to 3D spatial representation, enabling stairs, ramps, and uneven terrain navigation without task-specific programming. Trained end-to-end with RL in simulation across thousands of randomized terrains. Deploys zero-shot with no real-world fine-tuning required.',
    sourceName: 'Figure AI Official / Interesting Engineering',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree unveils GD01: world\'s first production-ready manned mecha robot at ¥3.9M ($650K), May 12 2026',
    summary: 'Unitree Robotics unveiled the GD01 on May 12, 2026: a 2.8-meter transformable mecha with human pilot cockpit. Walks on two legs, folds into quadruped configuration in seconds, weighs ~500kg with passenger. Priced from ¥3.9M (~$650K). Designed for transport across rough terrain, exploration, and rescue operations. World\'s first mass-produced manned mecha.',
    sourceName: 'CnEVPost / Interesting Engineering / TNW',
    sourceUrl: 'https://cnevpost.com/2026/05/12/unitree-unveils-manned-mecha-gd01/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree IPO filing targets $7B valuation; company outsold Tesla on humanoid robots in 2025 with 70% quadruped market share',
    summary: 'Unitree\'s STAR Market IPO targets approximately $7 billion valuation. The company shipped more humanoid robots than Tesla in 2025, holds 70% of the global quadruped robot market, and has been profitable every year since 2020. Revenue grew 335% to $235M in 2025. CSAC mandatory inspection ongoing, listing expected mid-to-late 2026.',
    sourceName: 'The Next Web / South China Morning Post',
    sourceUrl: 'https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Digit fleet expands: 7+ units active at Toyota Canada; customer list grows to include Schaeffler, Amazon, Mercado Libre',
    summary: 'As of May 2026, 7+ Digit units are active at Toyota Motor Manufacturing Canada supporting RAV4 material handling operations. Commercial customer list now includes GXO Logistics, Schaeffler, Amazon, Toyota Canada, and Mercado Libre. Fleet expansion demonstrates transition from pilot to commercial scale.',
    sourceName: 'Robotics & Automation News / Robot Report',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/02/20/toyota-canada-to-deploy-agility-robotics-humanoid-digit-in-manufacturing-operations/99011/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Next-gen Digit specifications confirmed: 50 lb payload (43% increase), 4:1 operating-to-charging ratio target',
    summary: 'Agility Robotics confirmed next-generation Digit specifications: payload increase to 50 lb (22.6 kg), a 43% improvement enabling heavier-duty material handling. Battery targeting 4:1 and eventually 10:1 operating-to-charging ratios. Enhanced manipulation via OTA updates through Agility Arc platform. New end effectors for broader dexterity.',
    sourceName: 'Agility Robotics / RoboZaps',
    sourceUrl: 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik total funding exceeds $1B in under one year; new investors include AT&T Ventures, John Deere, QIA',
    summary: 'Apptronik\'s total financing surpassed $1 billion within a single year, including the $520M Series A extension at $5B valuation. New strategic investors include AT&T Ventures, John Deere (agriculture/heavy equipment), and Qatar Investment Authority (QIA). Plans to expand Austin HQ and open California office for West Coast talent.',
    sourceName: 'CNBC / 36Kr',
    sourceUrl: 'https://eu.36kr.com/en/p/3589487362899974',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO Factory live as of April 30, 2026; San Carlos second facility coming online for 100K/year scale',
    summary: '1X NEO Factory in Hayward CA (58,000 sqft, 200+ employees) commenced full-scale production April 30, 2026. Most vertically integrated humanoid factory in the US. Additionally, a new San Carlos factory is being brought online with automation updates. Combined capacity target: 100,000 units/year by end 2027.',
    sourceName: 'GlobeNewsWire / Business 2.0 News',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X NEO first-year production (10,000 units) sold out in 5 days; $20K purchase or $499/month subscription',
    summary: '1X launched NEO pre-orders Oct 28, 2025 and sold out entire first-year production capacity of 10,000 units in just 5 days. Consumer pricing: $20,000 Early Access purchase with $200 deposit, or $499/month subscription. First consumer shipments planned 2026. Initial units prioritized for internal team home testing before broader delivery.',
    sourceName: '1X Official / Bloomberg',
    sourceUrl: 'https://www.1x.tech/discover/neo-home-robot',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot unveils A3 humanoid robot at APC 2026: 173cm/55kg, industry-leading 0.218 kW/kg power-to-weight ratio',
    summary: 'AGIBOT unveiled the A3 humanoid robot at its April 17, 2026 Partner Conference (APC 2026). Standing 173cm tall and weighing 55kg, the A3 achieves an industry-leading 0.218 kW/kg power-to-weight ratio. Designed as a high-performance, highly customizable platform for interactive environments. Part of five new robotic platforms announced.',
    sourceName: 'PR Newswire / Robotics & Automation News',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746195.html',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agibot releases GCFM (Generative Control Foundation Model) and 8 AI products under "One Body, Three Intelligences" architecture',
    summary: 'AGIBOT introduced 8 foundational AI products at APC 2026 organized under "One Robotic Body, Three Intelligences" architecture: Locomotion Intelligence, Manipulation Intelligence, and Interactive Intelligence. Key product GCFM turns text, audio, or video inputs into natural, context-aware robot motions in real time. Declares 2026 "Deployment Year One".',
    sourceName: 'PR Newswire / Agibot Official',
    sourceUrl: 'https://www.prnewswire.com/apac/news-releases/agibot-declares-2026-deployment-year-one--at-apc-2026-accelerating-the-era-of-embodied-ai-productivity-302746179.html',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agibot A2 humanoid robot makes history at 2026 Met Gala alongside designer Alexander Wang',
    summary: 'AGIBOT presented its full-size A2 humanoid robot alongside designer Alexander Wang at The Mark Hotel on May 5, 2026 during the Met Gala. First time an embodied AI humanoid robot has appeared at the Met Gala. Demonstrates Agibot\'s push into consumer-facing brand awareness and US market presence.',
    sourceName: 'PR Newswire / Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-a2-makes-history-at-met-gala',
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
    console.log(`  Date: 2026-05-17`);
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
