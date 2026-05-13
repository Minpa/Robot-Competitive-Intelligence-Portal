#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-13
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-13.ts
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

// ── Collected Intelligence Data (2026-05-13) ──────────────────

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
    headline: 'Tesla 2026 CapEx exceeds $20B — significant allocation to Optimus manufacturing and Cortex 2.0 AI compute',
    summary: 'Tesla\'s 2026 capital expenditure projected at over $20 billion (more than double prior year). Permit documents reveal $5-10B construction investment for 10M units/year capacity at Giga Texas. Significant allocation to Optimus manufacturing buildout and Cortex 2.0 AI compute infrastructure.',
    sourceName: 'Tesla SEC Filing / IR',
    sourceUrl: 'https://ir.tesla.com/_flysystem/s3/sec/000162828026003952/tsla-20251231-gen.pdf',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Tesla confirms zero Optimus robots doing useful work in factories as of Jan 2026; 2026 target slashed from 5,000 to 2,000',
    summary: 'Tesla confirmed zero Optimus robots were performing useful work in Tesla factories as of January 2026, completely missing the prior target of 10,000 units for 2025. Severe hand/forearm dexterity challenges caused Tesla to internally slash 2026 production target from 5,000 to 2,000 units.',
    sourceName: 'Rest of World / Electrek',
    sourceUrl: 'https://restofworld.org/2026/china-tesla-robot-race/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus B2B pricing set at $100K+; consumer version at $20-30K targeted for end-of-2027',
    summary: 'First B2B commercial customers expected late 2026 at $100K+ pricing per unit. Consumer availability remains targeted for end-of-2027 at $20,000-$30,000, pending manufacturing scale-up and dexterity improvements.',
    sourceName: 'eWeek',
    sourceUrl: 'https://www.eweek.com/robotics/tesla-optimus-robot-launch-timeline/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'C',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Hyundai Motor Group commits $26B US investment including new robotics factory for 30K Atlas units/year by 2028',
    summary: 'Hyundai Motor Group announced a $26 billion investment in U.S. operations, including plans for a new robotics factory capable of producing 30,000 Atlas robots per year by 2028. Joint supply chain development with Hyundai Mobis for actuator production at scale.',
    sourceName: 'Hyundai Motor Group',
    sourceUrl: 'https://www.hyundaimotorgroup.com/en/story/CONT0000000000196736',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Atlas deployment roadmap: RMAC training → HMGMA sequencing by 2028 → complex assembly by 2030; estimated price ~$150K/unit',
    summary: 'Atlas robots trained at Hyundai RMAC will start sequencing tasks at Hyundai Motor Group Metaplant America (HMGMA) by 2028, progressing to complex assembly operations by 2030. Estimated per-unit price of approximately $150,000.',
    sourceName: 'Automate.org / The Register',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/boston-dynamics-to-begin-production-on-redesigned-atlas-humanoid-in-2026',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 production ramps from 1 unit/day to 1 unit/hour — 24x throughput increase in 120 days, 350+ units delivered',
    summary: 'Figure AI ramped Figure 03 production from 1 unit/day to 1 unit/hour (24x throughput improvement) in under 120 days at BotQ facility. Over 350 Figure 03 units delivered. Monthly shipments roughly doubled three months running: ~60 in Feb, ~120 in March, ~240 in April 2026.',
    sourceName: 'The AI Insider / Interesting Engineering',
    sourceUrl: 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure BotQ first-gen line: 12,000 humanoids/year capacity, 150+ workstations, 9,000+ actuators, 80%+ first-pass yield',
    summary: 'BotQ first-generation production line achieves 12,000 humanoids/year capacity. Over 150 workstations, 9,000+ actuators produced across 10+ product variants with first-pass yields above 80%. This is currently the highest-throughput dedicated humanoid factory globally.',
    sourceName: 'Figure AI Official',
    sourceUrl: 'https://www.figure.ai/news/botq',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Figure introduces System 0 AI (Helix 02): perception-conditioned whole-body control for stairs, ramps, outdoor jogging at 2 m/s',
    summary: 'Figure introduced System 0 AI / Helix 02, a perception-conditioned whole-body control capability allowing Figure 03 to navigate stairs, ramps, uneven terrain using onboard stereo cameras without task-specific programming. Demonstrated 24/7 fully autonomous operation including outdoor jogging at ~2 m/s.',
    sourceName: 'Figure AI Official',
    sourceUrl: 'https://www.figure.ai/news',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree G1 deployed at Tokyo Haneda Airport with Japan Airlines for baggage/cargo handling trial through 2028',
    summary: 'Unitree G1 deployed for baggage and cargo handling at Tokyo Haneda Airport in partnership with Japan Airlines and GMO Internet Group. Trial runs scheduled through 2028 evaluating autonomous logistics workflows in aviation.',
    sourceName: 'RoboZaps',
    sourceUrl: 'https://blog.robozaps.com/b/humanoid-robot-news-week-march-16-22-2026',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'C',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Unitree launches G1-D variant with differential-drive wheeled base for data collection and AI training',
    summary: 'New G1-D variant swaps bipedal legs for a differential-drive wheeled base while retaining the same upper body and manipulation capabilities. Designed specifically for large-scale data collection and AI training, reducing cost and complexity for research customers.',
    sourceName: 'RoboZaps',
    sourceUrl: 'https://blog.robozaps.com/b/humanoid-robot-news-week-march-16-22-2026',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'C',
    category: 'spec_update',
    severity: 'info',
  },
  {
    headline: 'BYD and Geely trial Unitree robots on production lines for material handling and inspection',
    summary: 'Chinese EV manufacturers BYD and Geely have trialed Unitree humanoid robots on production lines for material handling and inspection tasks. Large-scale factory deployment has not yet occurred; 73.6% of Unitree humanoid revenue still from research/education customers.',
    sourceName: 'KraneShares / Caixin',
    sourceUrl: 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'info',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Digit passes OSHA NRTL field inspection at live fulfillment site — first humanoid robot to earn OSHA-recognized safety certification',
    summary: 'Digit passed a field inspection by a Nationally Recognized Test Lab (NRTL) at a live ecommerce fulfillment site, earning OSHA-recognized safety certification for deployment alongside human workers. This is the first humanoid robot to achieve this milestone, significantly de-risking commercial deployment.',
    sourceName: 'Humanoids Daily / Mobile World Live',
    sourceUrl: 'https://www.humanoidsdaily.com/news/agility-robotics-secures-osha-recognized-safety-approval-widening-the-gap-between-demo-and-deployment',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'critical',
  },
  {
    headline: 'Agility spearheads ISO 25875 — new safety standard for dynamically stable industrial mobile manipulators',
    summary: 'Agility Robotics is leading development of ISO 25875, a new safety standard specifically for "dynamically stable industrial mobile manipulators." Early frameworks expected in 2026, with cooperative safety prototype targeting early 2027 for full commercial availability.',
    sourceName: 'Automation World / Agility Robotics',
    sourceUrl: 'https://www.automationworld.com/factory/robotics/article/55303585/agility-robotics-agility-robotics-digit-shows-promise-in-line-side-operations-with-new-iso-safety-standard-on-the-horizon',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'B',
    category: 'regulation',
    severity: 'warning',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik next-gen Apollo iteration ready after 1+ year testing; undisclosed new robot to also debut in 2026',
    summary: 'Next-generation Apollo iteration has been in testing for over a year at Apptronik facilities, described as a "refinement" followed by a "significant jump" in hardware/software integration. An additional undisclosed new robot product will also debut in 2026.',
    sourceName: 'Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/substance-over-hype-inside-apptronik-s-measured-push-for-the-next-apollo',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'C',
    category: 'spec_update',
    severity: 'info',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO pre-orders sell out in 5 days — 10,000+ units at $20K or $499/month, first consumer shipments 2026',
    summary: '1X sold out its entire first-year production capacity (over 10,000 units) in just five days after the October 2025 pre-order launch. Early Access priced at $20,000 with a $499/month subscription option. First consumer shipments confirmed for 2026.',
    sourceName: 'TechFundingNews / The Robot Report',
    sourceUrl: 'https://techfundingnews.com/openai-backed-1x-first-us-humanoid-factory-sold-out-production/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot targets Hong Kong IPO at HK$40-50B ($5.1-6.4B) valuation, raising $1B+ via CICC/CITIC/Morgan Stanley',
    summary: 'Agibot targeting a Hong Kong Stock Exchange IPO in 2026 at HK$40-50 billion ($5.1-6.4B) valuation, raising over $1 billion. Joint sponsors: CICC, CITIC Securities, Morgan Stanley. Preliminary prospectus filed early 2026, listing expected by Q3 2026.',
    sourceName: 'Capital.com / PitchBook',
    sourceUrl: 'https://capital.com/en-int/learn/ipo/agibot-ipo',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Agibot 2025 revenue surges 20-fold to ¥1.05B ($145M); single-model shipments to exceed 10K units in 2026',
    summary: 'Agibot 2025 revenue reached 1.05 billion yuan (~$145M), a nearly 20-fold surge from 60 million yuan in 2024. Yuanzheng full-size humanoid entering 3rd generation in 2026, with single-model shipments expected to exceed 10,000 units.',
    sourceName: 'Gasgoo / TrendForce',
    sourceUrl: 'https://autonews.gasgoo.com/articles/news/from-60-million-to-105-billion-to-a-100-billion-target-is-agibots-358-plan-ambition-or-a-bubble-2046210816838205440',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Agibot partners with Fulin Precision for ~100 humanoid robots in manufacturing; MiniMax for voice AI integration',
    summary: 'Agibot partnered with Fulin Precision Engineering in a deal worth tens of millions of yuan to deploy approximately 100 humanoid robots in manufacturing plants. Also partnered with MiniMax for full-modality AI voice interaction capabilities.',
    sourceName: 'Humanoids Daily',
    sourceUrl: 'https://www.humanoidsdaily.com/news/deployment-year-one-agibot-unveils-massive-fleet-and-ai-model-stack-at-apc-2026',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'C',
    category: 'partnership',
    severity: 'info',
  },

  // ── Market-Wide Intelligence ──
  {
    headline: 'TrendForce: China captures 90%+ global humanoid robot sales; Unitree+Agibot hold ~80% combined market share',
    summary: 'TrendForce projects China\'s humanoid robot output to surge 94% in 2026. Chinese companies now dominate the global humanoid robot market with over 90% of global sales. Unitree and Agibot lead with approximately 80% combined market share in China.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
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
    console.log(`  Date: 2026-05-13`);
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
