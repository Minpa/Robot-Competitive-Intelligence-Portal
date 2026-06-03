#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-06-03
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-06-03.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-06-03) ──────────────────

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
    headline: 'Tesla Optimus pilot production line at Fremont captured on video — first public visual proof of manufacturing infrastructure',
    summary: 'Video of Tesla\'s Optimus pilot production line at Fremont surfaced in late May 2026, showing the first public visual proof of manufacturing infrastructure. This pilot line has been operational since January 21, 2026, separate from the larger Model S/X conversion line targeting late July/August for V3 production at 1M units/year capacity.',
    sourceName: 'Basenor / Electrek',
    sourceUrl: 'https://www.basenor.com/blogs/news/tesla-optimus-pilot-production-line-gets-first-look-on-video',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus V3 confirmed specs: 37 joints, 25 actuators per hand (50 total), 1.2 m/s walking speed',
    summary: 'Gen 3 Optimus confirmed specifications: 37 joints (9 more than Gen 2), walking speed 1.2 m/s, stability on 15° slopes. Gen 3 hands now feature 25 actuators per forearm/hand (50 total per robot), a 4.5x increase from Gen 2. Permit documents reveal $5-10B investment for 5.2M sq ft Optimus Factory at Giga Texas for 10M units/year.',
    sourceName: 'Humanoid.guide / BotInfo',
    sourceUrl: 'https://humanoid.guide/product/optimus-gen-3/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Hyundai launches "School of Football" FIFA World Cup 2026 campaign starring Atlas — all movements performed without CGI',
    summary: 'On May 29, 2026, Hyundai Motor launched "School of Football", a five-part episodic social film series following Atlas\'s football learning journey released May 25-29. Centerpiece features the "Ghost Rabona" cross-leg kick requiring precise timing, balance, and deceptive motion. All movements performed by Atlas without CGI, reinforcing engineering credibility.',
    sourceName: 'Hyundai Motor Group / PR Newswire',
    sourceUrl: 'https://www.hyundaimotorgroup.com/en/news/hyundai-motor-launches-school-of-football-campaign-featuring-boston-dynamics-atlas-ahead-of-fifa-world-cup-2026',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Boston Dynamics trains Atlas to lift 100-pound industrial loads using RL-driven whole-body control',
    summary: 'Boston Dynamics revealed Atlas learned to lift and carry heavy industrial objects (mini-fridge ~100 lbs) using reinforcement learning and large-scale simulation. Robot rotates torso 180°, squats to pick up object, and carries it while adjusting to shifting weight. Behavior developed within weeks using AI-driven whole-body control.',
    sourceName: 'Interesting Engineering / Robotics & Automation News',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/boston-dynamics-atlas-humanoid-heavy-lifting-simulation',
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure AI F.03 robots sort 100,000+ packages in 5-day continuous livestream — zero failures in first 24 hours',
    summary: 'Starting May 14, 2026, Figure AI livestreamed three F.03 robots (nicknamed Bob, Frank, Gary) sorting packages continuously. Original 8-hour goal extended after zero failures, reaching 5+ days and 100,000+ packages sorted. 88,000 packages sorted in first 72 hours. Robots running Helix-02 onboard AI with no remote operators.',
    sourceName: 'Crypto Briefing / TechRadar / Fox News',
    sourceUrl: 'https://cryptobriefing.com/figure-ai-humanoid-robots-sort-packages/',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Figure AI Man vs Machine: intern edges out F.03 robots 12,924 to 12,732 packages in 10-hour competition',
    summary: 'In a 10-hour "Man vs. Machine" contest, intern Aimé Gérard sorted 12,924 packages (2.79s/package) vs robots\' 12,732 (2.83s/package). F.03 achieved 98.5% of human performance. Demonstrates near-human parity for sustained manual labor tasks.',
    sourceName: 'Forge Global / Knightli',
    sourceUrl: 'https://knightli.com/en/2026/05/18/figure-ai-f03-livestream-package-sorting/',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },

  // ── Unitree ──
  {
    headline: 'Unitree H2 Plus announced as NVIDIA Isaac GR00T reference humanoid — Jetson Thor with Blackwell GPU onboard',
    summary: 'On June 1, 2026, NVIDIA CEO Jensen Huang announced H2 Plus as first Isaac GR00T reference humanoid robot. Combines Unitree H2 chassis (6ft, 150 lbs, 31 DOF body) with Jetson Thor Blackwell GPU. Sharpa Wave 22-DOF tactile hands bring total to 75 DOF. Available late 2026. Adopted by Stanford, ETH Zurich, UCSD, Ai2.',
    sourceName: 'NVIDIA Newsroom / PR Newswire / CNBC',
    sourceUrl: 'https://nvidianews.nvidia.com/news/nvidia-open-humanoid-robot-reference-design',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Unitree IPO review at Shanghai Stock Exchange scheduled for June 1, 2026 — targeting CNY 4.2B ($620M)',
    summary: 'Shanghai Stock Exchange scheduled to review Unitree\'s STAR Market IPO application on June 1, 2026. Targeting CNY 4.2B ($620M) raise. Over 40% of revenue from international markets. Would become China\'s first publicly traded humanoid robotics company.',
    sourceName: 'CNBC / KraneShares / AI Weekly',
    sourceUrl: 'https://www.cnbc.com/2026/06/01/nvidia-unitree-humanoid-robotics-system-researchers.html',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree unveils GD01 transformable mecha at 2.8m height — priced from $650,000',
    summary: 'Unitree unveiled the GD01, a 2.8-metre transformable mecha priced from CNY 3.9M (~$650,000). Demonstrates Unitree\'s expansion from humanoids into larger-scale robotic platforms. Announced alongside H2, R1, and G1-D product lines.',
    sourceName: 'The Next Web / AI Weekly',
    sourceUrl: 'https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Robotics Digit surpasses 100,000 totes in live GXO commercial deployment — first humanoid to reach six-figure operational milestone',
    summary: 'Digit moved over 100,000 totes at GXO Flowery Branch facility, becoming the first humanoid to reach this operational milestone in a live commercial setting. Data-driven proof of ROI and reliability. GXO renewed multi-year RaaS agreement.',
    sourceName: 'Agility Robotics / Interesting Engineering',
    sourceUrl: 'https://www.agilityrobotics.com/content/digit-moves-over-100k-totes',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik secures $4.2M secondary investment — next-gen Apollo tested over 1 year, nearly ready for reveal',
    summary: 'Apptronik completed $4.2M secondary share purchase (Aegis Capital as agent) on June 1, 2026. Next-generation Apollo has been in testing for over a year and is nearly ready for public debut. Headcount growing to 300+ with expansion in Texas and California.',
    sourceName: 'CityBuzz / Automate.org',
    sourceUrl: 'https://www.citybuzz.co/2026/06/01/apptronik-secures-4-2-million-secondary-investment-advancing-humanoid-robotics/',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'info',
  },
  {
    headline: 'Apptronik next-gen Apollo nearly ready after 1+ year testing — targets commercial quantities by 2027',
    summary: 'Automate.org reports Apptronik\'s next Apollo has been tested for over a year and is nearly ready for its public debut. The fleet being piloted in 2025-2026 can be delivered in commercial quantities by 2027. Apollo 2.0 engineered for "collaborative safety" to work alongside humans.',
    sourceName: 'Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO consumer shipments confirmed for 2026 — factory ramping with 200+ employees, San Carlos expansion underway',
    summary: '1X confirmed first consumer NEO shipments in 2026. Hayward factory at 200+ employees ramping toward 10,000 units/year. San Carlos second factory coming online. Automation updates underway targeting 100,000 units/year by end 2027. Three color options available.',
    sourceName: 'The Next Web / The Robot Report',
    sourceUrl: 'https://thenextweb.com/news/1x-neo-humanoid-factory-hayward-10000-home-robots',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot wins GLOMO Award at MWC 2026, launches RaaS platform covering 17 countries from €899/day',
    summary: 'AGIBOT won Global Mobile (GLOMO) Award at MWC 2026 in Barcelona. Launched Robot-as-a-Service (RaaS) platform covering 17 countries and regions with minimum rental terms of one day and pricing starting €899/day. Online store also launched for direct purchase.',
    sourceName: 'Agibot Official / Humanoids Daily',
    sourceUrl: 'https://www.agibot.com/article/231/detail/46.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot partners with Minth Group for European market entry — Munich launch event with full robot portfolio',
    summary: 'AGIBOT partnered with Minth Group (Tier 1 automotive supplier) as strategic partner and sales agent for European market. Munich launch February 24, 2026. Leveraging Minth\'s 15 years of European localization and 40% market share in key aluminum components for large-scale humanoid deployment.',
    sourceName: 'Yicai Global / Humanoids Daily / Pandaily',
    sourceUrl: 'https://www.yicaiglobal.com/news/global-humanoid-robot-leader-agibot-taps-minth-group-to-drive-european-rollout',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot signs Singtel Enterprise deal for 5G-powered Robot-as-a-Service in Singapore',
    summary: 'AGIBOT signed partnership with Singtel Enterprise to offer 5G-powered RaaS for Singaporean enterprises. Humanoid agents leased through Singtel\'s 5G network infrastructure. Expands Agibot\'s Southeast Asian presence.',
    sourceName: 'Humanoids Daily / Aparobot',
    sourceUrl: 'https://www.aparobot.com/articles/year-one-of-deployment-how-agibot-is-building-a-global-robot-empire',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'info',
  },
  {
    headline: 'TrendForce: China humanoid robot output to surge 94% in 2026 — Unitree and Agibot to capture ~80% market share',
    summary: 'TrendForce projects China\'s humanoid robot output will surge 94% in 2026. Unitree and AGIBOT expected to capture nearly 80% of Chinese market share combined. Validates both companies\' production ramp strategies.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Cross-industry / Regulatory ──
  {
    headline: 'ISO 25785-1 humanoid safety standard expected publication 2026-2027; EU Cyber Resilience Act and AI Act creating unified framework',
    summary: 'ISO 25785-1 for dynamically stable robots (humanoids) expected publication between 2026-2027. EU regulatory framework unifying safety via Cyber Resilience Act (CRA), AI Act, and Machinery Regulation. ISO working group includes Agility Robotics, Boston Dynamics, A3 Association experts.',
    sourceName: 'There\'s A Robot For That / DC Velocity',
    sourceUrl: 'https://www.theresarobotforthat.com/blog/humanoid-robot-safety-standards-2026/',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'B',
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
    console.log(`  Date: 2026-06-03`);
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
