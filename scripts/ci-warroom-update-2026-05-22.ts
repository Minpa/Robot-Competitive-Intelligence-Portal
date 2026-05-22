#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-22
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-22.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

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
    headline: 'Tesla Optimus Gen 3 pilot production underway at Fremont since January 2026; full-scale line conversion from Model S/X complete',
    summary: 'Tesla started pilot production of Optimus Gen 3 at Fremont on Jan 21, 2026. Model S/X production ended May 2026, freeing factory space for Optimus full-scale line. Gen 3 features upgraded 22-DOF hand system with 50 actuators. V3 reveal pushed to mid-2026. Initial output expected to be "quite slow" per Musk.',
    sourceName: 'Electrek / Basenor',
    sourceUrl: 'https://electrek.co/2026/04/22/tesla-optimus-production-fremont-model-sx-line/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla breaks ground on dedicated Optimus Gen 4 factory at Giga Texas North Campus; 10M units/year target',
    summary: 'Tesla constructing second Optimus factory at Giga Texas with 5.2M+ sq ft of new space at $5-10B investment. Gen 4 production expected summer 2027. Facility targets 4M units/year by end of 2027, scaling to 10M/year. Fremont serves as stepping stone for Gen 3 before Texas ramp.',
    sourceName: 'Not A Tesla App / Teslarati / Basenor',
    sourceUrl: 'https://www.notateslaapp.com/news/3555/teslas-optimus-gen-4-to-be-built-at-giga-texas-fremont-lines-to-be-stepping-stone',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus Gen 3 retains Gen 2 body (173cm, 57kg) with upgraded 22-DOF hand and 50 actuators per forearm pair',
    summary: 'Gen 3 is specifically an upgraded hand system rather than new chassis: 173 cm tall, 57 kg, with 22 degrees of freedom and 50 actuators across both forearms/hands. 10,000 unique parts require entirely new supply chain. Robot has been operating in Tesla factories for learning/data collection.',
    sourceName: 'Electrek / Standard Bots',
    sourceUrl: 'https://standardbots.com/blog/tesla-robot',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics Atlas lifts 100+ lb loads using reinforcement learning; washing machine demo shows whole-body coordination',
    summary: 'Atlas demonstrated lifting mini-fridge (50 lb), rotating torso 180°, and carrying across lab. Internal testing pushed loads beyond 100 lbs without additional training. Trained via millions of hours of GPU-accelerated simulation varying weight, friction, grip strength, positioning. Behavior developed within weeks of public debut.',
    sourceName: 'Robotics & Automation News / Interesting Engineering',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/05/20/boston-dynamics-trains-atlas-humanoid-robot-to-pick-up-and-place-washing-machine/101759/',
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'All 2026 Atlas deployments fully committed to Hyundai RMAC and Google DeepMind; new customers onboarding 2027',
    summary: 'All Atlas units for 2026 are committed to Hyundai Robotics Metaplant Application Center and Google DeepMind. Additional customers to be onboarded starting early 2027. Atlas specs: 7.5 ft reach, 110 lb lift capacity, operating temp range -4°F to 104°F. Production-ready version unveiled at CES 2026.',
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
    headline: 'Figure 03 production scaled to 1 robot/hour at BotQ; 350+ units delivered with 80%+ first-pass yield',
    summary: 'Figure AI ramped from 1 robot/day to 1 robot/hour in under 4 months at BotQ facility. 350+ Figure 03 units delivered. Driven by dedicated assembly lines, custom manufacturing software across 150+ workstations, tighter supplier QC. Plans to ship 100,000 humanoids over four years.',
    sourceName: 'The AI Insider / Interesting Engineering',
    sourceUrl: 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure Helix-02 robots sort packages 50 hours nonstop; System 0 AI enables stair/ramp navigation without task-specific programming',
    summary: 'Helix-02 neural network enables fully autonomous operation: 50-hour nonstop package sorting, 8-hour shifts with self-charging, two robots cooperatively reset bedroom in under 2 minutes. New System 0 perception-conditioned whole-body control navigates stairs, ramps, uneven terrain via onboard stereo cameras without programming.',
    sourceName: 'Bloomberg / Interesting Engineering',
    sourceUrl: 'https://www.bloomberg.com/news/articles/2026-05-15/robotics-ceo-vows-no-intervention-in-humanoids-viral-trial-run',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'BMW deploys Figure robots at Leipzig (Europe first); Spartanburg pilot supported 30,000+ vehicles over 10 months',
    summary: 'BMW Leipzig deployment marks first Physical AI humanoid in European automotive production (test deployment Dec 2025, pilot phase summer 2026). Spartanburg pilot: Figure 02 assisted 30,000+ BMW X3s with 1,250+ hours and 90,000+ parts. Leipzig uses Hexagon AEON robot for battery assembly alongside Figure.',
    sourceName: 'BMW Group Official / BMW Blog',
    sourceUrl: 'https://www.bmwgroup.com/en/news/general/2026/humanoid-robot-in-leipzig.html',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree unveils GD01: world\'s first mass-produced piloted mecha robot with bipedal/quadruped transformation at $573K',
    summary: 'Unitree released GD01 on May 12, 2026: 500kg piloted mecha with bipedal walking and quadruped crawling modes. Starting price 3.9M yuan ($573,674). Features stable bipedal walking, wall-toppling force output, and quick mode switching. First mass-produced optionally manned mecha suit.',
    sourceName: 'Interesting Engineering / TechSpot / Fast Company',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/video-unitree-launches-the-worlds-first-production-ready-manned-mecha-robot',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Japan Airlines deploys Unitree G1 humanoid robots at Haneda Airport for baggage loading and cabin cleaning',
    summary: 'Japan Airlines partnered with GMO AI & Robotics in May 2026 to deploy Unitree G1 humanoid robots at Tokyo Haneda Airport. Tasks: baggage loading, container transport, aircraft cabin cleaning. Unit cost ~$15,400. Addresses labor shortages in Japanese aviation industry.',
    sourceName: 'Euronews / SCMP',
    sourceUrl: 'https://www.euronews.com/next/2026/05/17/chinas-unitree-unveils-a-rideable-wall-smashing-robot-straight-out-of-science-fiction',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Unitree G1 demonstrates ice skating and rollerblading; showcases advanced dynamic balance control',
    summary: 'Unitree G1 humanoid demonstrated moving on Rollerblades and ice skates with steady posture through coordinated wheel and leg control. G1 has 19+ DOF with each arm having 7 DOF, capable of handling ~6.6 lbs. G1 available from $16,000 across 16 configurations.',
    sourceName: 'Fox News / Unitree Official',
    sourceUrl: 'https://www.foxnews.com/tech/unitree-g1-humanoid-robot-ice-skates-rollerblades',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Agility Digit expands to 7+ units at Toyota Canada RAV4 plant; first commercial humanoid in Canadian automotive manufacturing',
    summary: 'Agility and Toyota Motor Manufacturing Canada signed RaaS agreement for Digit at Woodstock, Ontario. Expanded from 3-unit pilot to 7+ commercial units for RAV4 material handling. First commercial humanoid deployment in Canadian automotive manufacturing. RaaS model.',
    sourceName: 'Yahoo Finance / Robot Report',
    sourceUrl: 'https://finance.yahoo.com/news/toyota-canada-confirms-2026-rollout-181246409.html',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agility developing next-gen Digit with 50 lb payload and ISO functional safety certification targeting mid-late 2026',
    summary: 'Next-generation Digit brings 50 lb payload capacity (up from previous) and improved battery life. ISO functional safety certification targeted for mid-to-late 2026. Would make Digit the first humanoid cleared to work cooperatively alongside people with no physical barriers. Customers: GXO, Schaeffler, Amazon, Mercado Libre.',
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
    headline: 'Apptronik raises $520M extension at $5B valuation; total funding $935M with Google, John Deere, Qatar QIA backing',
    summary: 'Series A extension of $520M brings total funding to $935M at $5B valuation. Co-led by B Capital and Google, new investors: AT&T Ventures, John Deere, Qatar Investment Authority. Apollo: 5\'8", 160 lbs, 55 lb payload, 4-hour battery, operates 22 hrs/day. Plans for new version debut in 2026.',
    sourceName: 'CNBC / Robot Report',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Apptronik integrates Google DeepMind Gemini Robotics AI; Jabil manufacturing partnership active for scale production',
    summary: 'Apptronik integrating Google DeepMind Gemini Robotics AI models into next-gen Apollo. Jabil manufacturing partnership for scale production. Pilots active at Mercedes-Benz and GXO Logistics. Investors expect $1B in Apollo orders starting 2027 at ~$80K/year per unit.',
    sourceName: 'CNBC / Automate.org',
    sourceUrl: 'https://www.therobotreport.com/apptronik-brings-in-another-520m-to-ramp-up-apollo-production/',
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO Factory opens in Hayward CA: 10,000 units/year capacity; entire first-year production sold out in 5 days',
    summary: '1X opened 58,000 sq ft NEO Factory in Hayward, CA on April 30, 2026. Most vertically integrated humanoid factory in US (200+ employees). 10,000 unit first-year capacity sold out in 5 days. Scaling to 100,000+/year by 2027. In-house manufacturing of motors, batteries, structures, sensors.',
    sourceName: 'GlobeNewsWire / Bloomberg',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X NEO consumer robot: 66 lbs, 150+ lb lift, 22-DOF hands, 22dB quiet operation; $20K or $499/month subscription',
    summary: 'NEO specs: 66 lbs weight, lifts 150+ lbs, carries 55 lbs, 22 DOF hands, head-to-toe soft body, 22dB noise. NVIDIA Jetson Thor core brain (NEO Cortex) for real-time AI inference. Consumer pricing: $20,000 purchase or $499/month subscription. US deliveries starting 2026, global 2027.',
    sourceName: '1X Official / eWeek',
    sourceUrl: 'https://www.1x.tech/discover/neo-home-robot',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: '1X NEO assists in own factory production; demo shows robot helping humans build more NEO units',
    summary: '1X released May 2026 demo showing NEO robot assisting on factory floor, helping build more NEO units. Demonstrates robot-assisted manufacturing loop. Factory produces motors, batteries, and structural components vertically integrated.',
    sourceName: 'Digital Trends',
    sourceUrl: 'https://www.digitaltrends.com/cool-tech/1x-shows-off-neo-humanoid-robot-helping-humans-make-more-of-its-kind/',
    competitorSlug: 'neo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Agibot ──
  {
    headline: 'Agibot reaches 10,000 robot milestone in March 2026; 4x production acceleration (5K to 10K in 3 months)',
    summary: 'AGIBOT hit 10,000 humanoid robot milestone on March 30, 2026. Jump from 5,000 to 10,000 in just 3 months = 4x acceleration. IDC ranked AGIBOT first in total humanoid shipment volume globally. 2026 declared "Deployment Year One".',
    sourceName: 'The Robot Report / Agibot Official',
    sourceUrl: 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Agibot unveils 4 new platforms (A3, G2 Air, D2 Max, OmniHand 3 Ultra-T) and 8 AI foundation models at APC 2026',
    summary: 'At APC 2026 (April 17-18), Agibot unveiled: Expedition A3 (173cm, 10-hour endurance, aerial kicks), G2 Air (single-arm compact), D2 Max (all-terrain quadruped), OmniHand 3 Ultra-T, OmniPicker 3, MEgo. Plus 8 foundation AI models and 7 standardized deployment solutions. Product lines span $20K-$190K.',
    sourceName: 'Robotics & Automation News / Agibot Official',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/04/21/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-for-real-world-deployment/100781/',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agibot targeting Hong Kong IPO in Q3 2026 at HK$40-50B ($5.1-6.4B) valuation; CICC, Morgan Stanley sponsoring',
    summary: 'Agibot targeting HK IPO in Q3 2026 with HK$40-50B valuation ($5.1-6.4B USD). Joint sponsors: CICC, CITIC Securities, Morgan Stanley. Plans to sell 15-25% of shares, potentially raising over $1B. Would follow Unitree IPO as second major humanoid robotics listing.',
    sourceName: 'Reuters / Medium / Capital.com',
    sourceUrl: 'https://medium.com/@creed_1732/agibot-hong-kong-ipo-2026-a-bold-bet-in-the-booming-industrial-ai-market-dd6a192d255a',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Agibot G2 on live Longcheer tablet line: 310 units/hour, 99.9% success rate; scaling to 100 robots by Q3 2026',
    summary: 'AGIBOT G2 deployed on live consumer electronics line at Longcheer Technology. Performance: 310 units/hour, 19-20 sec cycle time, >99.9% success rate. Plans: scale to 100 robots by Q3 2026, expand into automotive/semiconductors/energy. World-first live factory humanoid deployment for electronics manufacturing.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Cross-industry: Market Intelligence ──
  {
    headline: 'TrendForce: Unitree and Agibot to capture ~80% of China humanoid market in 2026; output to surge 94%',
    summary: 'TrendForce projects China humanoid robot output to surge 94% in 2026. Unitree and Agibot projected to capture nearly 80% of total shipments. Global humanoid market shifting from pilot to platform phase. IDTechEx: humanoid robot price falls 68% by 2030, six-month payback possible now.',
    sourceName: 'TrendForce / TechTimes',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'unitree',
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
    console.log(`  Date: 2026-05-22`);
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
