#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-26
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-26.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-26) ──────────────────

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
    headline: 'Tesla Giga Texas Optimus factory construction accelerating: drone footage May 13 shows major progress on North Campus',
    summary: 'Drone footage captured May 13, 2026 shows simultaneous construction across four major sites on Giga Texas campus. Dedicated Optimus robot manufacturing facility on North Campus is targeting 10 million units/year long-term capacity. Second-gen factory expected online summer 2027.',
    sourceName: 'The Robot Report / Teslarati',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus Gen 3 pilot production line first video leaked: 10,000 unique parts assembly process visible',
    summary: 'First video of Tesla Optimus pilot production line surfaced on social media in late May 2026. Shows Fremont assembly infrastructure for Gen 3 with 10,000 unique parts. Pilot line started Jan 21, 2026. Full-scale production begins late July/August 2026 after Fremont conversion completes.',
    sourceName: 'Basenor / Teslarati',
    sourceUrl: 'https://www.basenor.com/blogs/news/tesla-optimus-pilot-production-line-gets-first-look-on-video',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Tesla 2026 production target: 50K-100K Optimus units; Fremont capacity designed for 1M/year',
    summary: 'Tesla stated 2026 production target is 50,000-100,000 Optimus units. Fremont plant designed for first-gen annual capacity of 1 million units. Production rate acknowledged as "literally impossible to predict" given novelty of the manufacturing challenge.',
    sourceName: 'Electrek / eWeek',
    sourceUrl: 'https://www.eweek.com/robotics/tesla-optimus-robot-launch-timeline/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics publishes Atlas 100-lb load carrying training video: millions of simulation hours compressed to weeks',
    summary: 'On May 18, 2026, Boston Dynamics published detailed video showing Atlas learning to lift and carry 100+ pound loads. Training method compresses millions of hours of simulated practice into weeks via sim-to-real transfer. Demonstrates unmatched heavy payload manipulation among bipedal humanoids.',
    sourceName: 'TechTimes / Boston Dynamics',
    sourceUrl: 'https://www.techtimes.com/articles/316854/20260519/boston-dynamics-reveals-how-atlas-learned-lift-100-pound-loads-hyundai-plans-30000-per-year.htm',
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Hyundai 30K Atlas/year factory near Savannah GA confirmed; current production at 4 units/month',
    summary: 'Hyundai confirmed new robotics factory near Savannah, Georgia targeting 30,000 Atlas units/year by 2028. Current production sits at 4 Atlas robots/month. All 2026 production committed to Hyundai RMAC and Google DeepMind. Korean Metal Workers Union opposes factory deployment without labor agreement.',
    sourceName: 'TechTimes / Startup Fortune',
    sourceUrl: 'https://startupfortune.com/hyundai-is-building-a-factory-to-make-30000-atlas-robots-a-year-and-the-fleet-economics-it-needs-to-justify-that-bet-are-the-most-important-numbers-in-industrial-ai/',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 robots achieve 81-hour continuous autonomous operation: 101,391 packages sorted with zero failures',
    summary: 'Starting May 13, Figure AI livestreamed 3 Figure 03 robots sorting packages. Originally 8-hour planned demo extended to 81 hours after zero failures in first 24h. Total 101,391 packages sorted autonomously. Helix-02 AI system powered entire operation without human teleoperation. Landmark proof of sustained humanoid labor.',
    sourceName: 'Seoul Economic Daily / Medium / Interesting Engineering',
    sourceUrl: 'https://en.sedaily.com/international/2026/05/17/figure-ai-robot-sorts-100000-packages-in-81-hours-without',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Figure AI BotQ factory producing 1 robot/hour; 350+ Figure 03 units delivered with >80% first-pass yield',
    summary: 'Figure ramped manufacturing from 1 robot/day to 1 robot/hour in under 4 months at BotQ factory. Over 350 Figure 03 units delivered. Production driven by 150+ custom workstations and dedicated assembly lines. Monthly shipments doubling: ~60 (Feb), ~120 (Mar), ~240 (Apr). Targeting 100,000 units over 4 years.',
    sourceName: 'The AI Insider / Figure AI Official',
    sourceUrl: 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'BMW expands Figure humanoid program to Europe after 11-month Spartanburg pilot; 30K+ X3 vehicles produced',
    summary: 'BMW confirmed expansion of Figure humanoid program to European plants after successful 11-month pilot at Spartanburg (SC). Two Figure 02 robots worked 10-hour shifts, 5 days/week. Loaded 90,000+ parts across 1,250+ runtime hours. Over 30,000 BMW X3 vehicles produced with >99% placement accuracy.',
    sourceName: 'Figure AI / BMW / KraneShares',
    sourceUrl: 'https://kraneshares.com/humanoid-robotics-in-2026-the-race-from-pilot-to-platform/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },

  // ── Unitree ──
  {
    headline: 'Unitree G1 begins live operations at Tokyo Haneda Airport with Japan Airlines; first commercial airport humanoid deployment',
    summary: 'Japan Airlines deployed Unitree G1 robots at Haneda Airport in May 2026 for cargo handling and baggage operations. Partnership with GMO AI & Robotics. Two-year trial through 2028. Robot handles cargo containers on tarmac. If safety verification passes Q3 2026, will expand to cabin cleaning. Addresses Japan aviation labor crisis (20% ground staff shortage).',
    sourceName: 'CNBC / Interesting Engineering',
    sourceUrl: 'https://www.cnbc.com/2026/05/01/japan-airlines-humanoid-robots-haneda-labor-shortage.html',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'US Congress moves to blacklist Unitree citing national security concerns amid JAL Haneda deployment',
    summary: 'US Congress initiated legislative move to blacklist Unitree Robotics citing national security concerns. Timing coincides with Unitree G1 deployment at Japan Haneda airport. Raises geopolitical risk for Unitree international expansion. Could impact global adoption outside China.',
    sourceName: 'TechTimes',
    sourceUrl: 'https://www.techtimes.com/articles/316862/20260519/jal-deploys-unitree-g1-robots-haneda-us-congress-moves-blacklist-supplier-national-security.htm',
    competitorSlug: 'unitree',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'critical',
  },
  {
    headline: 'Unitree IPO on track for mid-2026: STAR Market application accepted, CSAC inspection completed',
    summary: 'Unitree IPO application accepted by Shanghai STAR Market with CSAC on-site inspection now completed. Targeting CNY 4.2B ($614M) raise. 85% of funds allocated to R&D. Would become China first publicly traded humanoid robotics company. 335% revenue growth in 2025 (¥1.708B).',
    sourceName: 'Shanghai Stock Exchange Filing / Bloomberg',
    sourceUrl: 'https://www.eweek.com/news/unitree-20000-humanoid-robots-2026-china/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Robotics seeking $400M funding at $1.75B valuation; RoboFab capacity 10,000+ units/year',
    summary: 'Agility Robotics reported to be raising $400M in new funding at $1.75B valuation. RoboFab facility in Salem, Oregon has 10,000+ unit/year production capacity. Current backers include Amazon, DCVC, and Playground Global. Total funding exceeds $641M.',
    sourceName: 'TechFundingNews / Yahoo Finance',
    sourceUrl: 'https://techfundingnews.com/humanoid-robot-maker-agility-robotics-to-secure-400m-at-1-75b-valuation-can-it-outspace-tesla-and-figure-ai/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'warning',
  },
  {
    headline: 'Digit payload upgrade to 50 lb (43% improvement) and 4:1 operating-to-charging ratio announced for next-gen',
    summary: 'Agility confirmed next-gen Digit improvements: payload increase to 50 lb (43% improvement from 35 lb), improved battery life targeting 4:1 and eventually 10:1 operating-to-charging ratios. ISO functional safety certification expected by mid-to-late 2026.',
    sourceName: 'Agility Robotics / RoboZaps',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik new humanoid robot debut scheduled for 2026; Google DeepMind Gemini Robotics integration confirmed',
    summary: 'Apptronik confirmed new humanoid robot model scheduled to debut in 2026. Integration with Google DeepMind Gemini Robotics AI models active. New version has been testing for over a year. Combined with Jabil manufacturing partnership. Plans to expand Austin HQ and open California office.',
    sourceName: 'CNBC / The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'John Deere and Qatar Investment Authority join Apptronik $935M Series A as new investors',
    summary: 'New strategic investors John Deere and Qatar Investment Authority (QIA) joined Apptronik $935M Series A alongside existing backers Google, Mercedes-Benz, B Capital, and PEAK6. AT&T Ventures also participated. John Deere signals potential agricultural/outdoor humanoid applications.',
    sourceName: 'GlobeNewsWire / CNBC',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/02/11/3236352/0/en/Apptronik-Closes-Over-935-Million-Series-A-with-New-520-Million-Extension-Round.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO Factory opens in Hayward CA (April 30): Americas first vertically integrated humanoid factory',
    summary: '1X NEO Factory (58,000 sq ft) officially opened April 30, 2026 in Hayward, California. 200+ employees. Most vertically integrated humanoid factory in Americas. In-house manufacturing of motors, batteries, structures, sensors. NVIDIA Jetson Thor as core compute. First consumer shipments in 2026.',
    sourceName: 'GlobeNewsWire',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: '1X EQT partnership: up to 10,000 NEO robots for 300+ portfolio companies through 2030',
    summary: '1X struck strategic deal with EQT (Swedish PE firm) to deploy up to 10,000 NEO humanoid robots across EQT 300+ portfolio companies from 2026-2030. Focus on manufacturing, warehousing, logistics, and industrial use cases. Extends NEO beyond home market into B2B.',
    sourceName: 'BusinessWire / TechCrunch',
    sourceUrl: 'https://www.businesswire.com/news/home/20251211360340/en/1X-Announces-Strategic-Partnership-to-Make-up-to-10000-Humanoid-Robots-Available-to-EQTs-Global-Portfolio',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot Southwest Chengdu factory launched May 22: first 200 next-gen robots roll off Lingxi X2 / Yuanzheng A3 line',
    summary: 'AgiBot launched Southwest Embodied Intelligence Industrial Base in Pidu High-tech Zone, Chengdu on May 22. First batch of 200 new-gen robots produced including Yuanzheng A3, A2, and Lingxi X2 series. Partners with LY iTech for manufacturing. Annual capacity of several thousand units at Chengdu alone.',
    sourceName: 'Gasgoo / Robotics & Automation News',
    sourceUrl: 'https://autonews.gasgoo.com/articles/icv/first-200-robots-officially-roll-off-line-at-agibos-southwest-embodied-intelligence-industrial-base-2058916009078173696',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Agibot G2 deployed on live Longcheer tablet line: 140 hours continuous operation, expanding to 100 robots by Q3 2026',
    summary: 'Agibot G2 humanoid integrated into Longcheer Technology tablet manufacturing line. April 14 livestreamed 8-hour shift. 140 hours continuous operation accumulated. Adapts to 1cm positional deviations dynamically. Plans to scale to 100 robots by Q3 2026. Expanding into automotive, semiconductors, and energy sectors.',
    sourceName: 'Interesting Engineering / VnExpress',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'TrendForce: China humanoid robot output to surge 94% in 2026; Unitree + Agibot capture ~80% market share',
    summary: 'TrendForce forecasts China humanoid robot output will surge 94% in 2026. Unitree and Agibot together expected to capture nearly 80% of Chinese humanoid market share. Agibot revenue surged to 1.05B yuan in 2025 (from 60M yuan prior year). IDC ranks Agibot #1 globally in total humanoid shipments.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
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
            collectedAt: '2026-05-26T00:00:00.000Z',
          }),
        ]
      );
      insertedCompAlerts++;
    }

    await client.query('COMMIT');

    console.log('\n========================================');
    console.log('  ARGOS CI War Room Update Complete');
    console.log('========================================');
    console.log(`  Date: 2026-05-26`);
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
