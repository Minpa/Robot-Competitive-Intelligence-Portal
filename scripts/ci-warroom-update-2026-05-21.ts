#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-21
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-21.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-21) ──────────────────

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
    headline: 'Tesla confirms second Optimus factory at Giga Texas targeting 10M units/year long-term capacity',
    summary: 'Beyond Fremont, Musk confirmed Tesla is constructing a second Optimus factory at Giga Texas north campus expansion, with production expected to begin around summer 2027. The facility is being designed for eventual production of the Gen 4 variant at a long-term target capacity of 10 million robots per year.',
    sourceName: 'Teslarati / The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Tesla delays Optimus V3 reveal over fears competitors will copy design frame-by-frame',
    summary: 'Musk stated during Q1 2026 earnings call that Tesla is hesitant about showing the new V3 design "because we\'ve found that competitors will analyze it frame by frame and copy everything we do." V3 reveal now expected late July/August 2026 with Fremont production starting immediately after. Initial output will be "quite slow" due to 10,000 unique parts.',
    sourceName: 'Drive Tesla Canada / Electrek',
    sourceUrl: 'https://driveteslacanada.ca/news/tesla-delaying-optimus-v3-reveal-fears-copycats/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Tesla Fremont Optimus production target: 50,000-100,000 units in 2026, 1M/year run-rate by year-end',
    summary: 'Tesla\'s stated target is 50,000-100,000 Optimus units in 2026 at Fremont, with the facility targeting 1 million units/year run-rate capacity by year-end. However, Musk warned initial output will be "literally impossible to predict" given 10,000 unique parts across an entirely new production line.',
    sourceName: 'Tesery / Optimusk Blog',
    sourceUrl: 'https://www.tesery.com/blogs/news/elon-musk-reveals-aggressive-production-timeline-for-tesla-optimus-3',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Atlas demonstrates RL-based whole-body heavy lifting: 100+ lb loads with zero additional training',
    summary: 'Boston Dynamics published videos and technical blog on May 18 showing Atlas lifting and carrying a 100+ pound load using reinforcement learning and whole-body coordination. The robot trained for millions of hours in parallel GPU simulations, varying weight, friction, grip strength, and positioning. The critical advance: Atlas generalized beyond training range, adapting to 100+ lb loads without additional training.',
    sourceName: 'Boston Dynamics / Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/05/20/boston-dynamics-trains-atlas-humanoid-robot-to-pick-up-and-place-washing-machine/101759/',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Boston Dynamics pioneers "whole-body physical AI" approach: Atlas uses torso, hips, arms together for heavy manipulation',
    summary: 'Unlike conventional robotic systems relying on fingertip manipulation and visual guidance, Atlas is trained to use its entire body dynamically when handling heavy objects — rotating torso 180 degrees, squatting for pickup, adjusting to shifting weight. The behavior went from basic animation reference to stable hardware execution in just a few weeks.',
    sourceName: 'Interesting Engineering / Humanoids Daily',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/boston-dynamics-atlas-humanoid-heavy-lifting-simulation',
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 livestream: 48+ hours continuous package sorting without logged failure, 28,000+ packages in first day',
    summary: 'Starting May 13, Figure AI ran a continuous livestream of Figure 03 robots sorting packages that crossed 38 hours before ending. Over 28,000 packages sorted in the first day alone with zero logged failures. The stream drew 2M+ viewers. Robots run on Helix-02 neural network trained on 1,000+ hours of human motion data plus 200,000+ parallel simulation environments.',
    sourceName: 'Technology.org / TechRadar',
    sourceUrl: 'https://www.technology.org/2026/05/20/figure-ai-humanoid-robots-livestream-package-sorting/',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Figure AI Man vs Machine: intern edges out humanoid fleet 12,924 to 12,732 packages in 10-hour contest',
    summary: 'In a 10-hour "Man vs Machine" livestream contest, Figure AI intern Aimé Gérard edged out the robots 12,924 packages to 12,732, at 2.79 sec/package vs machines\' 2.83. The human received meal breaks and rest breaks per California labor law; robots did not stop. Demonstrates near-human-parity sustained throughput for sorting tasks.',
    sourceName: 'Humanoids Daily / OfficeChai',
    sourceUrl: 'https://www.humanoidsdaily.com/news/man-vs-machine-figure-ai-intern-edges-out-humanoid-fleet-in-10-hour-sorting-challenge',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'demo',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 robots helped build 30,000 BMW X3 vehicles in standard 10-hour Monday-to-Friday shifts',
    summary: 'Figure AI reports that earlier Figure machines helped build 30,000 BMW X3 vehicles across standard 10-hour Monday-to-Friday shifts at an automotive manufacturing facility. This represents one of the largest humanoid robot deployments in automotive manufacturing to date.',
    sourceName: 'Technology.org',
    sourceUrl: 'https://www.technology.org/2026/05/20/figure-ai-humanoid-robots-livestream-package-sorting/',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree IPO: CSAC mandatory on-site inspection started April 1; listing expected mid-to-late 2026 if approved',
    summary: 'On April 1, 2026, China\'s Securities Association (CSAC) randomly selected Unitree Robotics for a mandatory on-site IPO inspection — just 12 days after its STAR Market application was accepted. Humanoid robots accounted for 51.5% of revenue in first nine months of 2025 (up from 1.9% in 2023), with gross margin of 62.9%.',
    sourceName: 'KraneShares / Caixin Global',
    sourceUrl: 'https://kraneshares.com/a-complete-guide-to-unitree-robotics-2026-ipo-why-it-matters-for-star-market-etf-kstr-humanoid-robotics-etf-koid/',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },
  {
    headline: 'Unitree G1 demonstrates skating, spinning, and front flips on roller/ice skates in new demo',
    summary: 'On April 23, Unitree released a demonstration showing its G1 humanoid robot gliding across surfaces on roller skates and ice skates, spinning on one leg, and performing front flips while maintaining balance. Demonstrates advanced dynamic balance control capabilities beyond standard locomotion.',
    sourceName: 'eWeek',
    sourceUrl: 'https://www.eweek.com/news/chinese-unitree-g1-humanoid-robot-skates-spins-flips-apac/',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'demo',
    severity: 'info',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Digit surpasses 100,000 totes moved at GXO Logistics in first formal commercial humanoid deployment',
    summary: 'Agility Robotics\' Digit has moved more than 100,000 totes at GXO Logistics\' facility in Flowery Branch, Georgia. The GXO partnership operates under a multi-year Robots-as-a-Service agreement — the first of its kind in humanoid robotics — under which the operator pays for utilization rather than outright ownership.',
    sourceName: 'RoboZaps / The Robot Report',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agility, Boston Dynamics, and ASTM to discuss State of Humanoids at 2026 Robotics Summit (May 27-28)',
    summary: 'At the 2026 Robotics Summit & Expo (May 27-28, Boston), Agility Robotics CTO Pras Velagapudi, Boston Dynamics, and ASTM International will keynote on "The State of Humanoid Robotics." Discussion covers current capabilities, safety standards, operational challenges, and lessons learned from early deployments.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/agility-boston-dynamics-astm-to-discuss-the-state-of-humanoid-robotics/',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik\'s next-gen Apollo tested for over a year; new robot debut scheduled for 2026',
    summary: 'Apptronik has been developing and testing the latest version of Apollo for roughly a year in commercial pilot deployments with Google Gemini Robotics, Mercedes-Benz, and GXO Logistics. The new humanoid robot is scheduled for its debut later in 2026, integrating lessons from over a year of real-world testing.',
    sourceName: 'Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    competitorSlug: 'apollo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Apptronik total funding now $935M; new investors include AT&T Ventures, John Deere, and Qatar QIA',
    summary: 'With the $520M Series A extension, Apptronik\'s total funding reaches $935M at $5B valuation. New strategic investors include AT&T Ventures, John Deere (agriculture/industrial), and Qatar Investment Authority (QIA). Plans to expand in Austin, open California office, and scale production.',
    sourceName: 'CNBC / Robot Report',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X World Model enables NEO to learn tasks by watching videos: trained on 1M+ hours of video data',
    summary: '1X launched its World Model in January 2026, enabling NEO to turn any prompt into autonomous action using a video model grounded in real-world physics. When given a task like "pack the lunchbox," NEO first imagines a short video of the future, then executes. Trained on 1M+ hours of internet-scale video data fine-tuned on robot data, enabling generalization to unseen objects and environments.',
    sourceName: '1X Official / The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
    competitorSlug: 'neo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: '1X NEO first-year production (10,000 units) sold out in 5 days; 10,000-unit deal signed with EQT',
    summary: 'First-year production capacity of 10,000 units at the Hayward factory sold out in just 5 days after launch. Additionally, a 10,000-unit deal was signed with EQT (Swedish private equity firm). 1X plans to scale output to 100,000+ units annually by end of 2027. Consumer deliveries starting in US by end of 2026.',
    sourceName: 'Briefs.co / eWeek',
    sourceUrl: 'https://www.briefs.co/news/1x-robots-neo/',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Agibot ──
  {
    headline: 'Agibot A2 makes history at Met Gala with Alexander Wang: first humanoid at fashion industry\'s biggest event',
    summary: 'On May 5, AGIBOT\'s A2 humanoid robot appeared at The Mark Hotel in New York alongside designer Alexander Wang ahead of the Met Gala — the first embodied AI robot at a Met Gala event. A2 demonstrated real-world interaction: holding items, serving drinks to guests. WorkGPT AI system maintained 96% accuracy processing sensory overload. A2 Ultra features 40 DOF with 7-DOF arms and 6-DOF dexterous hands.',
    sourceName: 'PR Newswire / Interesting Engineering',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-a2-joins-alexander-wang-at-the-met-gala-embodied-ai-makes-historic-fashion-debut-302762969.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Agibot claims 100% success rate in factory deployment as industry shifts to real-world validation',
    summary: 'Digitimes reports Agibot claims 100% success rate in factory deployment on May 20, 2026, as the humanoid robotics industry moves past prototype competition into real-world deployment validation phase. G2 robots running live consumer electronics production at Longcheer. Plans to scale to 100 robots by Q3 2026 and expand into automotive, semiconductors, and energy sectors.',
    sourceName: 'Digitimes',
    sourceUrl: 'https://www.digitimes.com/news/a20260520VL218/development-robotics-robot-hardware-business.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Agibot introduces A3 humanoid and "One Robotic Body, Three Intelligences" architecture at 2026 Partner Conference',
    summary: 'At Agibot\'s 2026 Partner Conference, the company introduced the A3 humanoid robot designed for interactive environments, alongside its "One Robotic Body, Three Intelligences" architecture. The A3 joins existing A2, X2, and G2 product lines. Plans for early deployments in hospitality and logistics throughout 2026.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/04/21/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-for-real-world-deployment/100781/',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'info',
  },
  {
    headline: 'TrendForce: China humanoid robot output to surge 94% in 2026; Unitree and Agibot to capture ~80% market share',
    summary: 'TrendForce forecasts China\'s humanoid robot output will surge 94% in 2026, with Unitree and Agibot together capturing nearly 80% of market share. This underscores the rapidly growing Chinese dominance in humanoid robot manufacturing volume.',
    sourceName: 'TrendForce',
    sourceUrl: 'https://www.trendforce.com/presscenter/news/20260409-13007.html',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── Cross-industry regulatory/standards updates ──
  {
    headline: 'ISO TC 299 develops ISO 26058-1 and ISO 25785-1 for dynamically stable robots; ASTM calls for urgent humanoid standards',
    summary: 'ISO Technical Committee 299 is developing new standards including ISO 26058-1 (statically stable mobile robots) and ISO 25785-1 (dynamically stable robots like humanoids). ASTM International calls for urgent safety standards for humanoid robots. The key gap: no current standard addresses dynamic bipedal locomotion risks — collapse when power is cut creates residual fall risk.',
    sourceName: 'ASTM / ISO / Novanta',
    sourceUrl: 'https://www.techjournal.uk/p/astm-calls-for-urgent-safety-standards',
    competitorSlug: 'digit',
    layerSlug: 'safety',
    confidence: 'A',
    category: 'regulation',
    severity: 'warning',
  },
  {
    headline: 'IDTechEx: Humanoid robot price to fall 68% by 2030, six-month payback possible now for some deployments',
    summary: 'IDTechEx analysis published May 20 reports that humanoid robot prices are projected to fall 68% by 2030. Some current deployments already achieve six-month payback period. The rapid cost decline is driven by increasing production volumes from manufacturers like Unitree, Agibot, and Figure AI.',
    sourceName: 'TechTimes / IDTechEx',
    sourceUrl: 'https://www.techtimes.com/articles/316906/20260520/idtechex-humanoid-robot-price-falls-68-2030-six-month-payback-possible-now.htm',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
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
    console.log(`  Date: 2026-05-21`);
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
