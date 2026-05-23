#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-23
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-23.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-23) ──────────────────

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
    headline: 'Tesla Optimus V3 production lines installing at Fremont; V3 reveal pushed to late July/August 2026',
    summary: 'Tesla is converting former Model S/X lines at Fremont into Optimus V3 production (Model S/X production ended May 9, 2026). V3 specs confirmed: 37 joints (9 more than V2), 1.2 m/s walk speed, stable on 15° slopes. Initial output will be slow with 10,000 unique parts. Musk targets 1M units/year run rate at Fremont, with Gigafactory Texas planned for 10M units/year by 2027.',
    sourceName: 'Electrek / Tesla Q1 2026 Earnings',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla showcases Optimus at AWE 2026 Shanghai and Boston Marathon; consumer sales targeted end of 2027',
    summary: 'Tesla exhibited Optimus at AWE 2026 in Shanghai and sent a preview unit to the Boston Marathon finish line, signaling growing public engagement. Morgan Stanley maintains bullish robotics thesis, noting Optimus is already positively impacting Tesla valuation. Consumer robot sales targeted for end of 2027.',
    sourceName: 'Teslarati / Morgan Stanley',
    sourceUrl: 'https://www.teslarati.com/tesla-optimus-boston-marathon/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'demo',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Atlas lifts 100+ lb loads using reinforcement learning whole-body control; trained millions of sim hours',
    summary: 'Boston Dynamics published May 18-19 demos showing Atlas lifting a 50 lb mini-fridge using whole-body coordination, rotating torso 180°, squatting, and adapting to shifting weight. Internal tests pushed beyond 100 lbs without additional training. Trained via reinforcement learning in parallel GPU simulations for millions of hours, varying object weight, floor friction, grip strength.',
    sourceName: 'Boston Dynamics Official Blog',
    sourceUrl: 'https://bostondynamics.com/blog/training-a-humanoid-robot-for-hard-work/',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Hyundai building 30,000-unit/year Atlas factory; all 2026 Atlas deployments fully committed',
    summary: 'Hyundai Motor Group confirmed a dedicated factory for 30,000 Atlas units/year, targeting completion by 2028. All Atlas deployments for 2026 are fully committed to Hyundai RMAC and Google DeepMind. Production-ready version unveiled at CES 2026 in January.',
    sourceName: 'Automate.org / Engadget',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 robots sort 88,000 packages in 72-hour nonstop livestream; zero logged failures',
    summary: 'Starting May 13, Figure AI ran a continuous livestream of Figure 03 robots autonomously sorting packages. 48 hours passed without a logged failure, extending to 72 hours with ~88,000 packages sorted. Robots run Helix-02 neural network entirely onboard. In 10-hour "Man vs. Machine" contest, intern edged robots 12,924 vs 12,732 packages (2.79 vs 2.83 sec/package). Battery swap via teammate relay every 3-4 hours.',
    sourceName: 'Technology.org / Interesting Engineering / OODA Loop',
    sourceUrl: 'https://www.technology.org/2026/05/20/figure-ai-humanoid-robots-livestream-package-sorting/',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Figure BotQ factory now producing 1 robot/hour (24x improvement); 350+ Figure 03 units delivered',
    summary: 'Figure\'s BotQ facility in California scaled from 1 robot/day to 1 robot/hour in under 120 days — a 24x throughput improvement. Over 350 Figure 03 units delivered. Company plans to ship 100,000 humanoids over four years. Previous BMW deployment: Figure 02 robots helped build 30,000 BMW X3 vehicles across 11-month standard shifts.',
    sourceName: 'Interesting Engineering / Figure AI Official',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/figure-humanoid-robot-production-scale-up',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Unitree ──
  {
    headline: 'Unitree launches UniStore — world\'s first humanoid robot app store for G1/H1 platforms',
    summary: 'Unitree opened UniStore on May 7, 2026: the world\'s first humanoid robot app store allowing one-tap download of motion/task packages via smartphone. Currently compatible with G1 humanoid, H1, B2 quadruped, and Go2 robot dog. Developer Center supports full-range task and motion packages including logistics, inspection, and service environments.',
    sourceName: 'RobotsBeat / CnTechPost',
    sourceUrl: 'https://robotsbeat.com/unitree-unistore-robot-app-store-humanoid-g1-h1-ecosystem/',
    competitorSlug: 'unitree',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree unveils GD01 manned mecha — world\'s first production-ready civilian mecha at $650K',
    summary: 'Unitree unveiled GD01 on May 12, 2026: a ~500 kg manned mecha vehicle starting at CNY 3.9M (~$650K). Demo shows bipedal walking, brick-smashing, and transformation into quadruped form. Founder Wang Xingxing piloted the mecha in the reveal video. Signals Unitree\'s expansion beyond humanoids into heavy-duty robotics.',
    sourceName: 'CnEVPost / Fox News',
    sourceUrl: 'https://cnevpost.com/2026/05/12/unitree-unveils-manned-mecha-gd01/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree IPO progressing on Shanghai STAR Market; targeting CNY 4.2B ($608M) raise',
    summary: 'Shanghai Stock Exchange accepted Unitree\'s IPO application March 20, 2026. CSAC mandatory on-site inspection started April 1. If successful, listing expected mid-to-late 2026, making Unitree China\'s first publicly traded humanoid robotics company on STAR Market. 2025 revenue: CNY 1.71B with 335% YoY growth, net profit 8x to CNY 600M.',
    sourceName: 'Bloomberg / Caixin Global',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-03-20/chinese-robot-maker-unitree-seeks-610-million-in-shanghai-ipo',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Digit expands at Toyota Canada Woodstock: 7 additional units for RAV4 material handling',
    summary: 'Toyota Motor Manufacturing Canada expanded Digit deployment from 3 to 10 commercial units at Woodstock plant for RAV4 production logistics. Robots load/unload totes from automated tuggers. Digit is now the most-deployed commercial humanoid with 100,000+ totes moved at GXO and multi-year RaaS contracts.',
    sourceName: 'Yahoo Finance / Robot Report',
    sourceUrl: 'https://finance.yahoo.com/news/toyota-canada-confirms-2026-rollout-181246409.html',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agility CTO to present "State of Humanoids" at 2026 Robotics Summit (May 27-28, Boston)',
    summary: 'Pras Velagapudi, CTO of Agility Robotics, will participate in a panel on the "State of Humanoids" at the 2026 Robotics Summit & Expo on May 27-28 in Boston. Next-gen Digit in development with 50 lb payload and improved battery life. ISO functional safety certification targeted mid-to-late 2026.',
    sourceName: 'Agility Robotics Press',
    sourceUrl: 'https://www.agilityrobotics.com/latest-press',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik testing new Apollo version for over a year; next-gen debut scheduled 2026',
    summary: 'Apptronik has been testing a new Apollo robot version for over a year, with debut scheduled in 2026. Integrated with Google DeepMind Gemini Robotics AI models and Jabil manufacturing partnership for scale production. Ongoing pilots at Mercedes-Benz and GXO Logistics. Total funding: $935M at $5B valuation.',
    sourceName: 'Automate.org / CNBC',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Apptronik targets $1B in Apollo orders for 2027; pricing at ~$80K/year per unit via RaaS',
    summary: 'Investors expect $1 billion in Apollo robot orders starting 2027. RaaS pricing model at approximately $80,000/year for high-volume delivery. New investors in latest round include AT&T Ventures, John Deere, and Qatar Investment Authority. Apollo specs: 5\'8" tall, 160 lbs, 55 lb payload, 4-hour battery.',
    sourceName: 'Robot Report / CNBC',
    sourceUrl: 'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO Factory opens in Hayward CA: 10,000 units/year capacity, entire first-year production sold out in 5 days',
    summary: '1X\'s NEO Factory (58,000 sq ft, 200+ employees) commenced production April 30, 2026 — America\'s first vertically integrated humanoid factory. 10,000 units/year capacity sold out in just 5 days after Oct 28, 2025 launch. Scaling to 100,000+/year by end 2027. NVIDIA Jetson Thor as core brain. Consumer price $20,000 or $499/month subscription.',
    sourceName: 'GlobeNewsWire / Bloomberg',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X NEO includes remote expert support mode; autonomous capability scope at launch remains unclear',
    summary: 'NEO can receive remote support from a 1X expert at scheduled times for tasks it cannot yet handle autonomously. 1X has not specified which functions work fully autonomously at launch vs requiring human assistance. Robot specs: 5\'6", 66 lbs, lifts 150+ lbs, carries 55 lbs. US deliveries starting 2026, global expansion 2027.',
    sourceName: 'Notebookcheck / eWeek',
    sourceUrl: 'https://www.notebookcheck.net/1X-NEO-Household-robot-set-to-launch-by-the-end-of-2026-but-with-a-controversial-catch.1295772.0.html',
    competitorSlug: 'neo',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Agibot ──
  {
    headline: 'Agibot launches flexible robot rental service at MWC 2026 covering 17 countries; minimum 1-day terms',
    summary: 'AGIBOT launched a flexible robot rental service at MWC 2026, covering 17 countries with minimum 1-day rental terms and full technical support via store.agibot.com and botsharing.eu. First Chinese humanoid company to offer global RaaS model. A2 Series for service/logistics won multiple Best of CES 2026 awards.',
    sourceName: 'AGIBOT Official / PR Newswire',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibots-humanoid-robots-take-home-multiple-best-of-ces-2026-awards-following-us-debut-302663224.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot GO-3 AI model with ViLLA architecture + world model expected Q3 2026; Genie Sim 3.0 launched',
    summary: 'AGIBOT announced GO-3 AI model combining ViLLA architecture with a world model, expected Q3 2026. Launched Genie Sim 3.0 simulation platform integrated with NVIDIA Isaac Sim. Adopted NVIDIA Isaac GR00T N foundation models for industrial humanoid acceleration. "One Robotic Body, Three Intelligences" framework: motion, interaction, task intelligence.',
    sourceName: 'Robotics & Automation News / NVIDIA Newsroom',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/04/21/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-for-real-world-deployment/100781/',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agibot G2 deployed on Longcheer tablet production line: 99.9% success rate, 310 units/hour',
    summary: 'AGIBOT G2 deployed on live consumer electronics production line at Longcheer Technology. Performance: 310 units/hour throughput, 19-20 second cycle time, >99.9% success rate. Plans to scale to 100 robots by Q3 2026 and expand into automotive/semiconductors/energy sectors.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Cross-industry regulatory update ──
  {
    headline: 'ISO 25785-1 safety standard for dynamically stable robots advances; first international bipedal robot safety standard',
    summary: 'ISO 25785-1 is the first international safety standard for bipedal robots, covering industrial workplace use. Type C safety standard focuses on robots requiring constant power to maintain balance. ISO 10218:2025 shifts from hardware-based to application-based safety certification. ASTM calls for urgent safety standards for humanoid robots. Agility Robotics targets first ISO functional safety certification for a humanoid (Digit) by mid-to-late 2026.',
    sourceName: 'ISO / ASTM / Tech Briefs',
    sourceUrl: 'https://www.iso.org/standard/91469.html',
    competitorSlug: 'digit',
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
    console.log(`  Date: 2026-05-23`);
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
