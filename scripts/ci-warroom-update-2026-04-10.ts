#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-04-10
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-04-10.ts
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

// ── Collected Intelligence Data (2026-04-10) ──────────────────

interface CiAlert {
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  competitorSlug: string;          // maps to ci_competitors.slug
  layerSlug: string;               // maps to ci_layers.slug (hw, sw, data, biz, safety, ip)
  confidence: 'A' | 'B' | 'C' | 'D' | 'E';
  category: 'partnership' | 'funding' | 'mass_production' | 'spec_update' | 'demo' | 'regulation';
  severity: 'info' | 'warning' | 'critical';
}

const alerts: CiAlert[] = [
  // ── Tesla Optimus ──
  {
    headline: 'Tesla Optimus Gen 3 production start targeted for summer 2026',
    summary: 'Optimus Gen 3 production intent prototype ready early 2026. Low-volume production starting summer 2026 at Fremont (repurposed Model S/X lines), volume ramp to 2027. New Optimus facility at Giga Texas with 10M units/year ambition.',
    sourceName: 'Teslarati / Powedris',
    sourceUrl: 'https://www.greendrive-accessories.com/blog/language/en/tesla-optimus-3-robot-humanoide-2026-2/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla-Intel Terafab: $20-25B joint-venture semiconductor complex at Giga Texas',
    summary: 'Intel CEO Lip-Bu Tan visited Musk. Terafab is a massive JV semiconductor complex at Giga Texas North Campus, consolidating chip design, fabrication, memory production, and advanced packaging in one location.',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-optimus-job-listings/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Tesla Optimus 3 debuts at AWE 2026 Shanghai with ultra-detailed hands',
    summary: 'Optimus 3 made its first official public appearance at AWE 2026 Shanghai on March 12, 2026. Showcased ultra-detailed dexterous hands and improved mobility. Musk stated Gen 3 is mobile but needs finishing touches.',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-optimus-awe-2026-shanghai/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'Tesla + xAI launch "Digital Optimus" (Macrohard) AI agent project',
    summary: 'Tesla and xAI announced Digital Optimus, a software AI agent that automates complex office workflows by observing and replicating human-computer interactions. Extends Optimus brand into software domain.',
    sourceName: 'Teslarati',
    sourceUrl: 'https://www.teslarati.com/tesla-xai-digital-optimus-explained/',
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'partnership',
    severity: 'info',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics unveils production-ready Atlas at CES 2026, shipping to Hyundai & DeepMind',
    summary: 'Production Atlas: 56 DOF, 2.3m reach, 50kg lift capacity, 4hr battery with autonomous swap (<3min). First shipments to Hyundai RMAC and Google DeepMind. All 2026 deployments fully committed. 30K-unit/year factory planned for 2028.',
    sourceName: 'Engadget / Boston Dynamics',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Google DeepMind foundation models integrated into Boston Dynamics Atlas',
    summary: 'Strategic partnership to integrate Google DeepMind AI foundation models into Atlas for enhanced cognitive capabilities. Hyundai Mobis supplies actuators with jointly-built supply chain.',
    sourceName: 'TechCrunch / Boston Dynamics',
    sourceUrl: 'https://techcrunch.com/2026/01/05/boston-dynamicss-next-gen-humanoid-robot-will-have-google-deepmind-dna/',
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Atlas humanoid robots enter Hyundai factories for industrial use',
    summary: 'Atlas fleet deployed to Hyundai Robotics Metaplant Application Center (RMAC). Robot learns new tasks quickly, adapts to dynamic environments, lifts heavy loads, works autonomously with minimal supervision.',
    sourceName: 'New Atlas',
    sourceUrl: 'https://newatlas.com/ai-humanoids/boston-dynamics-production-atlas-hyundai/',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI Series C exceeds $1B at $39B valuation',
    summary: 'Series C led by Parkway Venture Capital with NVIDIA, Brookfield, Intel Capital, LG Technology Ventures, Macquarie Capital, Salesforce, T-Mobile Ventures, Qualcomm Ventures. Total over $1B committed.',
    sourceName: 'Figure AI Official',
    sourceUrl: 'https://www.figure.ai/news/series-c',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Figure 02 deployed to BMW Spartanburg and UPS facilities',
    summary: 'Figure AI transitioned from research to commercial deployment. Figure 02 robots operating at BMW automotive manufacturing (Spartanburg, SC) and reportedly at UPS logistics. Figure 03 introduced Oct 2025 with full hardware/software redesign.',
    sourceName: 'Wikipedia / Multiple',
    sourceUrl: 'https://en.wikipedia.org/wiki/Figure_AI',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Figure AI develops proprietary AI in-house after dropping OpenAI partnership',
    summary: 'Figure ended OpenAI partnership in Feb 2025, pivoting to fully in-house proprietary AI development. Figure 03 appeared at White House event early 2026. Demos include laundry folding, package sorting, washing machine loading.',
    sourceName: 'TechCrunch',
    sourceUrl: 'https://techcrunch.com/2025/02/04/figure-drops-openai-in-favor-of-in-house-models/',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Unitree ──
  {
    headline: 'Unitree Robotics files for IPO on Shanghai Stock Exchange (March 2026)',
    summary: 'Unitree filed for initial IPO listing on the Shanghai Stock Exchange in March 2026. Company shipped 5,500+ humanoid robots in 2025 (global #1), targets 10,000-20,000 shipments in 2026.',
    sourceName: 'Gasgoo / eWeek',
    sourceUrl: 'https://autonews.gasgoo.com/articles/news/unitree-robotics-ipo-reaches-key-milestone-2036052042919866369',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree open-sources UnifoLM-VLA-0 vision-language-action model',
    summary: 'Released UnifoLM-VLA-0 and UnifoLM-WMA-0 general-purpose large models enabling autonomous household tasks via natural language commands. Integrated Hesai JT128 3D LiDAR for centimeter-level navigation.',
    sourceName: 'Multiple / Unitree',
    sourceUrl: 'https://www.unitree.com/h1/',
    competitorSlug: 'unitree',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree expands lineup to H1, G1, R1, H2 — targets 20K shipments in 2026',
    summary: 'Four humanoid products: H1 (full-size), G1 (mid-size, from $17,990), R1 (compact), H2 (full-size general-purpose). Spring Festival Gala 2026: autonomous freestyle parkour, aerial flips (3m height), wall backflips.',
    sourceName: 'eWeek / Drones Plus Robotics',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Toyota Canada signs commercial RaaS agreement for Digit humanoid robots',
    summary: 'Toyota Motor Manufacturing Canada (Woodstock West plant, RAV4/RAV4 Hybrid) signed commercial Robots-as-a-Service agreement after year-long pilot. Digit loads/unloads totes from automated tuggers and feeds assembly line parts.',
    sourceName: 'Agility Robotics / Robot Report',
    sourceUrl: 'https://www.therobotreport.com/toyota-motor-manufacturing-canada-deploys-agility-robotics-digit-humanoids/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Mercado Libre deploys Digit in San Antonio TX fulfillment center',
    summary: 'Mercado Libre signed commercial agreement to integrate Digit into San Antonio, TX facility. Plans to expand AI-powered humanoid use across Latin America warehouses. Digit surpassed 100K totes at GXO Flowery Branch.',
    sourceName: 'Agility Robotics Official',
    sourceUrl: 'https://www.agilityrobotics.com/content/mercado-libre-and-agility-robotics-announce-commercial-agreement',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agility Robotics RoboFab scales to 10,000 Digit units/year capacity',
    summary: 'RoboFab manufacturing plant in Salem, Oregon (70,000 sqft) can produce up to 10,000 Digit units per year. Fortune 500 customers: GXO, Schaeffler, Amazon, Toyota, Mercado Libre.',
    sourceName: 'Multiple',
    sourceUrl: 'https://www.agilityrobotics.com/content/digits-next-steps',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik raises $520M extension, total ~$935M at $5B valuation',
    summary: 'Series A extended by $520M (Google among investors), bringing total to nearly $1B raised at $5B valuation. Commercial-scale Apollo deployment targeted for H2 2026 in logistics and manufacturing.',
    sourceName: 'CNBC / Robot Report',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Apptronik partners with Jabil for Apollo production scaling + Google DeepMind for Gemini Robotics',
    summary: 'Jabil partnership for supply chain and manufacturing scale-up ("Apollo to build Apollo"). Google DeepMind strategic partnership for Gemini Robotics integration. Pilot programs with Mercedes-Benz, Jabil, GXO underway.',
    sourceName: 'Robot Report / TechCrunch',
    sourceUrl: 'https://www.therobotreport.com/apptronik-collaborates-with-jabil-to-produce-apollo-humanoid-robots/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X strikes deal to send 10,000 NEO robots to EQT portfolio companies (2026-2030)',
    summary: 'Up to 10,000 NEO humanoid robots to EQT\'s 300+ portfolio companies for manufacturing, warehousing, logistics, and industrial use. US pilot deployments begin 2026, expansion to Europe/Asia. Pre-orders at $20K or $499/month subscription.',
    sourceName: 'TechCrunch / eWeek',
    sourceUrl: 'https://techcrunch.com/2025/12/11/1x-struck-a-deal-to-send-its-home-humanoids-to-factories-and-warehouses/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: '1X launches world model enabling NEO to learn tasks from video',
    summary: 'New AI world model grounded in real-world physics allows NEO to learn from internet-scale video and apply knowledge to novel physical environments. 1X seeking $1B funding round to support deployment.',
    sourceName: 'Robot Report / 1X',
    sourceUrl: 'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
    competitorSlug: 'neo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Agibot (X1) ──
  {
    headline: 'Agibot debuts at CES 2026 with full humanoid portfolio — 5,000 robots shipped',
    summary: 'U.S. market debut at CES 2026 showcasing comprehensive humanoid robot portfolio. "One Robotic Body, Three Intelligences" architecture integrating interaction, manipulation, locomotion. Operational across 8 commercial applications.',
    sourceName: 'PR Newswire / Agibot',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-makes-its-us-market-debut-at-ces-2026-with-its-full-humanoid-robot-portfolio-302652403.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },
  {
    headline: 'LG Electronics takes equity stake in Agibot, deepening technical cooperation',
    summary: 'LG Electronics acquired equity stake in Agibot (August 2025), laying groundwork for technical cooperation. LG CEO visited Agibot in China. Agibot also partnered with Minth Group for European expansion and opened first overseas experience center in Malaysia.',
    sourceName: 'Korea Herald',
    sourceUrl: 'https://www.koreaherald.com/article/10694574',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot releases AGIBOT WORLD 2026 open-source embodied AI dataset',
    summary: 'Released AGIBOT WORLD 2026, an open-source heterogeneous dataset supporting five key research pathways in embodied intelligence. Designed to systematically accelerate embodied AI development.',
    sourceName: 'Robot Report / Agibot',
    sourceUrl: 'https://www.therobotreport.com/agibot-world-2026-dataset-open-source-accelerate-embodied-ai-development/',
    competitorSlug: 'agibot',
    layerSlug: 'data',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },
];

// ── New competitors to add if not present ──
const newCompetitors = [
  { slug: 'unitree', name: 'Unitree G1/H1', manufacturer: 'Unitree Robotics', country: '🇨🇳', stage: 'commercial', sortOrder: 7 },
  { slug: 'apollo', name: 'Apollo', manufacturer: 'Apptronik', country: '🇺🇸', stage: 'pilot', sortOrder: 8 },
  { slug: 'agibot', name: 'Agibot X1', manufacturer: 'Agibot', country: '🇨🇳', stage: 'pilot', sortOrder: 9 },
];

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ensure new competitors exist
    for (const comp of newCompetitors) {
      const existing = await client.query('SELECT id FROM ci_competitors WHERE slug = $1', [comp.slug]);
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO ci_competitors (slug, name, manufacturer, country, stage, sort_order, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, true)`,
          [comp.slug, comp.name, comp.manufacturer, comp.country, comp.stage, comp.sortOrder]
        );
        console.log(`  + Added competitor: ${comp.slug} (${comp.manufacturer})`);
      } else {
        console.log(`  ~ Competitor already exists: ${comp.slug}`);
      }
    }

    // 2. Build lookup maps
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

    // 3. Insert ci_monitor_alerts (dedup by headline)
    let insertedAlerts = 0;
    let skippedAlerts = 0;

    for (const alert of alerts) {
      // Check for duplicate
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

    // 4. Insert competitive_alerts for critical/warning severity items
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
    let insertedCompAlerts = 0;

    for (const alert of criticalAlerts) {
      // Map competitor slug to humanoid_robots if possible
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

      // Dedup by title
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
    console.log(`  Date: 2026-04-10`);
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
