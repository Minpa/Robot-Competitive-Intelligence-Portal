#!/usr/bin/env npx tsx
/**
 * ARGOS War Room — Competitive Intelligence Auto-Update
 * Date: 2026-05-24
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/ci-warroom-update-2026-05-24.ts
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } });

// ── Collected Intelligence Data (2026-05-24) ──────────────────

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
    headline: 'Tesla Samsung $16.5B deal for Optimus Gen 3 OLED face displays and AI chips',
    summary: 'Tesla reportedly signed a $16.5 billion deal with Samsung covering AI chips and 8-inch OLED display panels for the Optimus Gen 3 face. Samsung Display is one of few manufacturers capable of producing small, high-brightness, high-durability OLED panels suitable for humanoid robot use. Samsung Electro-Mechanics also pursuing camera module contracts.',
    sourceName: 'WCCFTech / SamMobile',
    sourceUrl: 'https://wccftech.com/samsung-extends-oled-reach-beyond-apple-partnering-with-tesla-to-power-optimus-robots-face/',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'B',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Tesla-xAI joint "Macrohard" Digital Optimus project unveiled at Abundance Summit',
    summary: 'Musk unveiled "Digital Optimus" joint Tesla-xAI project pairing xAI Grok LLM (System 2 reasoning) with Tesla real-time AI agent (System 1). Runs on Tesla AI4 chip (~$650). Targeting September 2026 rollout. Tesla invested ~$2B to acquire xAI shares in January 2026. Confirmed via SEC filings.',
    sourceName: 'CNBC / Electrek',
    sourceUrl: 'https://www.cnbc.com/2026/03/11/musk-unveils-joint-tesla-xai-project-macrohard.html',
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: 'Tesla Optimus Gen 3 hand: 50 actuators, 22 DOF per hand, biomimetic tendon design',
    summary: 'Musk revealed Gen 3 hands featuring 25 actuators per forearm/hand (50 total), a 4.5x increase from Gen 2. Each hand has 22 DOF with a biomimetic tendon-driven design. Robot retains Gen 2 body (173 cm, 57 kg). Central to Tesla pitch for real manufacturing and logistics tasks.',
    sourceName: 'Basenor / RoboZaps',
    sourceUrl: 'https://www.basenor.com/blogs/news/tesla-optimus-gen-3-hands-revealed-50-actuator-precision-leap',
    competitorSlug: 'optimus',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Tesla Cortex 2.0 supercomputer live: 230,000+ H100-equivalent GPUs, 250MW first phase online',
    summary: 'Cortex 2.0 at Giga Texas began phased activation with first 250MW phase online in April 2026, full 500MW expected mid-2026. 230,000+ H100-equivalent GPUs. Creates closed training loop: factory robots collect manipulation data, Cortex processes into improved models, updates deploy back to robots.',
    sourceName: 'Basenor / BotInfo',
    sourceUrl: 'https://www.basenor.com/blogs/news/tesla-cortex-2-ai-cluster-is-live-and-running-workloads',
    competitorSlug: 'optimus',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Tesla 2026 Optimus production target: 50,000-100,000 units; Giga Texas 10M-unit factory breaking ground',
    summary: 'Tesla stated 2026 production target of 50,000-100,000 units from Fremont. Breaking ground on dedicated second-generation Optimus factory at Giga Texas targeting 10 million robots/year, production expected summer 2027. Musk cautioned initial output will be "quite slow" given 10,000 unique parts.',
    sourceName: 'SEC 8-K / The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
    competitorSlug: 'optimus',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'EU Machinery Regulation 2026/1234 mandates rigorous conformity for robots in shared human workspaces',
    summary: 'New EU Machinery Regulation mandates rigorous conformity assessments for robots in shared workspaces including real-time emergency stop and fail-safe torque limits. ISO 13482 lacks specific guidelines for dynamic bipedal systems. Each market (US, EU, China) imposes different requirements.',
    sourceName: 'ApplyingAI / Rewarx',
    sourceUrl: 'https://applyingai.com/2026/01/teslas-optimus-revolution-navigating-technical-hurdles-and-market-dynamics-in-humanoid-robotics/',
    competitorSlug: 'optimus',
    layerSlug: 'safety',
    confidence: 'C',
    category: 'regulation',
    severity: 'warning',
  },

  // ── Boston Dynamics Atlas ──
  {
    headline: 'Boston Dynamics Atlas production-ready unveiled at CES 2026: 56 DOF, 50 kg lift, 198 lbs, all 2026 deployments committed',
    summary: 'Production Atlas unveiled at CES 2026: 6.2 ft (1.9 m), 198 lbs (90 kg), 56 DOF, 2.3-meter reach, 50 kg lift capacity, only two actuator types with field-replaceable limbs. Won "Best Robot" at CES 2026 Awards. All 2026 deployments fully committed to Hyundai and Google DeepMind.',
    sourceName: 'Engadget / Hyundai Motor Group',
    sourceUrl: 'https://www.engadget.com/big-tech/boston-dynamics-unveils-production-ready-version-of-atlas-robot-at-ces-2026-234047882.html',
    competitorSlug: 'atlas',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Boston Dynamics + FieldAI partnership for construction deployment across Asia, Europe, and North America',
    summary: 'Boston Dynamics and FieldAI partnered combining Spot robots with Field Foundation Models for autonomous inspection and monitoring in construction environments. Customers across Asia, Europe, and North America expanding to enterprise-scale deployments.',
    sourceName: 'Robotics & Automation News',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/03/13/boston-dynamics-and-fieldai-partner-to-bring-robots-into-construction-and-other-complex-dynamic-environments/99596/',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'info',
  },
  {
    headline: 'Atlas heavy-lifting demo: AI-driven whole-body control lifts washing machines and 100+ lb fridges',
    summary: 'Boston Dynamics released footage of Atlas lifting heavy appliances (loaded fridge over 100 lbs, washing machine) using AI-driven whole-body control. Behaviors learned through reinforcement learning with "millions of hours" of parallel GPU simulation. Demonstrates industrial readiness for heavy manual tasks.',
    sourceName: 'Robotics & Automation News / Interesting Engineering',
    sourceUrl: 'https://roboticsandautomationnews.com/2026/05/20/boston-dynamics-trains-atlas-humanoid-robot-to-pick-up-and-place-washing-machine/101759/',
    competitorSlug: 'atlas',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'demo',
    severity: 'warning',
  },
  {
    headline: 'Hyundai Atlas deployment roadmap: RMAC 2026, EV plant Savannah 2028, tens of thousands by 2030',
    summary: 'Hyundai plans Atlas deployment at RMAC in 2026, then EV plant near Savannah, Georgia by 2028 for parts sequencing. By 2030, plans component assembly, repetitive motions, and heavy-load tasks. Targets tens of thousands of Boston Dynamics robots across manufacturing facilities.',
    sourceName: 'NBC News / InsideEVs',
    sourceUrl: 'https://www.nbcnews.com/tech/tech-news/hyundai-boston-dynamics-unveil-humanoid-robot-atlas-ces-rcna252483',
    competitorSlug: 'atlas',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },

  // ── Figure AI ──
  {
    headline: 'Figure 03 introduced: $20,000 home humanoid with 90% cheaper manufacturing, tactile sensors at 3g force',
    summary: 'Figure 03 announced as $20,000 home-focused humanoid with soft textile coverings, wireless charging, tactile sensors sensitive to 3 grams of force, palm cameras, 2x frame rate and 60% wider FOV. Components 90% cheaper to manufacture than Figure 02. Figure 02 retirement begun.',
    sourceName: 'Figure AI Official / Time',
    sourceUrl: 'https://www.figure.ai/news/introducing-figure-03',
    competitorSlug: 'figure',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'critical',
  },
  {
    headline: 'Figure 03 production ramped 24x to 1 robot/hour at BotQ factory, 350+ units produced',
    summary: 'Figure AI scaled Figure 03 production from 1 unit/day to 1 unit/hour — a 24x throughput improvement in under 120 days — producing 350+ robots through BotQ manufacturing facility. Achieved via dedicated assembly lines, custom software across 150+ workstations, and first-pass yields above 80%.',
    sourceName: 'The AI Insider / Figure AI Official',
    sourceUrl: 'https://www.figure.ai/news/ramping-figure-03-production',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Figure 02 completed BMW Spartanburg deployment: 90,000+ components, 30,000+ X3 vehicles, 99%+ accuracy',
    summary: 'Figure 02 completed 11-month deployment at BMW Spartanburg: daily 10-hour shifts, 90,000+ components moved across 1,250+ operating hours, 30,000+ BMW X3 vehicles produced. Placement accuracy exceeded 99%. BMW now expanding humanoid deployment to Leipzig, Germany (using Hexagon Robotics AEON).',
    sourceName: 'Figure AI Official / BMW Group',
    sourceUrl: 'https://www.figure.ai/news/production-at-bmw',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Figure Helix 02 AI: unified visuomotor neural network for full-body autonomy, stairs/ramps navigation',
    summary: 'Helix 02 provides full-body autonomy connecting every onboard sensor to every actuator through single unified visuomotor neural network. Perception-conditioned whole-body control enables Figure 03 to navigate stairs, ramps, and uneven terrain using stereo cameras without task-specific programming.',
    sourceName: 'Figure AI Official',
    sourceUrl: 'https://www.figure.ai/news/helix-02',
    competitorSlug: 'figure',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Figure 03 walks with First Lady Melania Trump at White House summit — first humanoid at White House',
    summary: 'Figure 03 became the first humanoid robot to appear at the White House, walking alongside First Lady Melania Trump at the "Fostering the Future Together" Global Coalition Summit. Robot greeted attendees in 11 languages. Major brand visibility for Figure AI.',
    sourceName: 'CNBC / CNN / NPR',
    sourceUrl: 'https://www.cnbc.com/2026/03/26/figure-ai-the-robotics-company-hosted-by-melania-trump.html',
    competitorSlug: 'figure',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },

  // ── Unitree ──
  {
    headline: 'Unitree IPO filed on Shanghai Stock Exchange seeking $610M; expected mid-2026 listing',
    summary: 'Unitree filed for IPO on Shanghai Stock Exchange on March 20, 2026, seeking to raise 4.2 billion yuan (~$610M). CSAC mandatory on-site inspection started April 1. Would become China\'s first publicly traded humanoid robotics company. Revenue reached 1.71B yuan ($250M) in 2025 with 335% YoY growth.',
    sourceName: 'Rest of World / Caixin Global / Bloomberg',
    sourceUrl: 'https://www.caixinglobal.com/2026-01-05/robot-maker-unitrees-ipo-expected-by-mid-2026-source-says-102400282.html',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Unitree GD01 manned mecha robot unveiled: 2.8m tall, bipedal/quadruped transformation, $500K price',
    summary: 'Unitree unveiled the GD01, world\'s first production-ready manned transformable mecha. Standing 2.8 meters tall, supports a human pilot in open cockpit, shifts between bipedal and quadruped locomotion. Starting price 3.9 million yuan (~$500K). Major demonstration of advanced engineering.',
    sourceName: 'Euronews / SCMP / eWeek',
    sourceUrl: 'https://www.euronews.com/next/2026/05/17/chinas-unitree-unveils-a-rideable-wall-smashing-robot-straight-out-of-science-fiction',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Unitree Series C: Tencent, Ant Group, Alibaba, Geely invest; total pre-IPO funding ~$155M',
    summary: 'Unitree Series C brought investments from Tencent, Ant Group, Alibaba Group, and Geely. Total funding across 6 rounds from 31 investors at ~$155M pre-IPO. Signals strong validation from China\'s biggest tech conglomerates.',
    sourceName: 'Tracxn / CBInsights',
    sourceUrl: 'https://tracxn.com/d/companies/unitree/__o1e8b3ZlyUCcjIECfbM9csfhnJyv1_fOku8o_K8gCYg/funding-and-investors',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'warning',
  },
  {
    headline: 'Unitree H2 full-size humanoid (182cm, 70kg) deliveries begin with 2,070-TOPS AI chip and App Store',
    summary: 'H2, Unitree next-gen full-size humanoid (182 cm, ~70 kg), began phased deliveries April 2026. Features bionic face for social interaction, 2,070-TOPS onboard AI chip, and Unitree App Store with 237 apps. Represents major step toward consumer-grade humanoids.',
    sourceName: 'RoboZaps / ZMProbots',
    sourceUrl: 'https://blog.robozaps.com/b/unitree-g1-review',
    competitorSlug: 'unitree',
    layerSlug: 'hw',
    confidence: 'C',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Unitree Spring Festival Gala 2026 official robot partner — G1 robots perform parkour and kung fu live',
    summary: 'Unitree was official robot partner for 2026 Spring Festival Gala (China\'s most-watched broadcast), with G1 robots performing parkour and kung fu routines. Provided enormous brand exposure in the Chinese market. Partnership with Japan Airlines for G1 at Tokyo Haneda Airport also reported.',
    sourceName: '36Kr / Multiple Chinese media',
    sourceUrl: 'https://eu.36kr.com/en/p/3646072103580417',
    competitorSlug: 'unitree',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'info',
  },

  // ── Agility Robotics (Digit) ──
  {
    headline: 'Toyota Canada commits to 7 Digit robots at Woodstock factory after successful year-long pilot',
    summary: 'After successful year-long pilot, Toyota Motor Manufacturing Canada committed to deploying 7 Digit robots at Woodstock, Ontario factory for unloading totes with auto parts. Both companies agreed to explore additional use cases across manufacturing, supply chain, and logistics.',
    sourceName: 'TechCrunch / Yahoo Finance / The Robot Report',
    sourceUrl: 'https://techcrunch.com/2026/02/19/toyota-hires-seven-agility-humanoid-robots-for-canadian-factory/',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Mercado Libre signs commercial agreement for Digit deployment at San Antonio TX fulfillment center',
    summary: 'Mercado Libre signed commercial agreement to deploy Digit at San Antonio, Texas fulfillment center. Plans to explore expansion across Mercado Libre warehouses in Latin America. Expands Digit customer base into Latin American e-commerce leader.',
    sourceName: 'Agility Robotics Official / DC Velocity',
    sourceUrl: 'https://www.agilityrobotics.com/content/mercado-libre-and-agility-robotics-announce-commercial-agreement',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agility Robotics $400M Series C at $2.12B valuation; total funding ~$683M',
    summary: 'Agility closed $400M Series C at ~$2.12B valuation. Key investors: DCVC, Playground Global, Amazon Industrial Innovation Fund, NVentures (NVIDIA), Humanoid Global Holdings, Sony Innovation Fund. Total funding now ~$683M.',
    sourceName: 'Yahoo Finance / TechFundingNews',
    sourceUrl: 'https://finance.yahoo.com/news/agility-robotics-humanoid-robot-reportedly-183833656.html',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'warning',
  },
  {
    headline: 'Digit surpasses 100,000 totes moved at GXO Logistics; OSHA safety inspection passed',
    summary: 'Digit surpassed 100,000 totes moved in live warehouse operations at GXO Logistics. Active deployments at Schaeffler and Amazon sites. Became first commercial humanoid to pass OSHA-recognized safety field inspection. Amazon expanded to Phase 2 (10+ fulfillment centers).',
    sourceName: 'TipRanks / Agility Robotics Official',
    sourceUrl: 'https://www.tipranks.com/news/private-companies/agility-robotics-advances-real-world-digit-deployments-and-highlights-data-driven-path-to-commercial-humanoids',
    competitorSlug: 'digit',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },
  {
    headline: 'Next-gen Digit increases payload to 50 lbs; functional safety certification targeting mid-late 2026',
    summary: 'Next-generation Digit increases payload from 35 lbs to 50 lbs with improved battery life and manipulation capabilities. ISO functional safety certification in progress, targeting mid-to-late 2026 for full human-proximate operation without physical barriers.',
    sourceName: 'RoboZaps / BotInfo',
    sourceUrl: 'https://blog.robozaps.com/b/agility-robotics-digit-review',
    competitorSlug: 'digit',
    layerSlug: 'hw',
    confidence: 'C',
    category: 'spec_update',
    severity: 'info',
  },

  // ── Apptronik (Apollo) ──
  {
    headline: 'Apptronik raises $520M Series A extension; total $935M at $5.5B valuation with Google, Mercedes, John Deere',
    summary: 'Apptronik closed $520M Series A extension bringing total to $935M at ~$5.5B valuation. Co-led by B Capital and Google with Mercedes-Benz, AT&T Ventures, John Deere, Qatar Investment Authority. Plans to expand Austin and open California office.',
    sourceName: 'CNBC / TechCrunch / Bloomberg',
    sourceUrl: 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Google DeepMind Gemini Robotics AI models integrated into Apollo for multi-embodiment control',
    summary: 'Google DeepMind pairing Gemini Robotics AI models with Apollo for "multi-embodiment" control. Lab demos show Apollo packing lunches, sorting laundry, handling unfamiliar objects via natural-language instructions without retraining per task.',
    sourceName: 'The Robot Report / Interesting Engineering',
    sourceUrl: 'https://www.therobotreport.com/apptronik-partners-google-deepmind-advance-humanoid-robots-ai/',
    competitorSlug: 'apollo',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Apptronik targets $1B Apollo orders for 2027; ~$80K/year lease pricing; Jabil manufacturing active',
    summary: 'CEO Cardenas expects $1B in Apollo robot orders starting 2027 at ~$80K/year lease. Jabil manufacturing partnership active for scale production. Current Apollo: 5\'8" tall, 160 lbs, 55 lb payload, 71 DOF. Next-gen Apollo tested for over a year, debut scheduled 2026.',
    sourceName: 'CNBC / Automate.org',
    sourceUrl: 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
    competitorSlug: 'apollo',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'mass_production',
    severity: 'warning',
  },

  // ── 1X Technologies (NEO) ──
  {
    headline: '1X NEO Factory opens in Hayward CA: 58,000 sq ft, 10K units/year, first-year sold out in 5 days',
    summary: '1X opened 58,000 sq ft vertically integrated factory in Hayward, CA — "America\'s first humanoid robot factory." Capacity 10,000 units year one, targeting 100,000 by end 2027 via larger San Carlos facility. Pre-orders sold out in 5 days (Oct 28, 2025). Consumer shipments before end of 2026.',
    sourceName: 'GlobeNewsWire / Bloomberg',
    sourceUrl: 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: '1X World Model AI: NEO learns tasks by watching internet-scale video, no task-specific training needed',
    summary: '1X announced "1X World Model" enabling NEO to learn from internet-scale video and translate into real-world physical actions. Robot handles novel tasks (doors, ironing, brushing hair) without prior examples in training. Major AI breakthrough for generalization.',
    sourceName: 'The Robot Report',
    sourceUrl: 'https://www.therobotreport.com/1x-launches-world-model-enabling-neo-robot-to-learn-tasks-by-watching-videos/',
    competitorSlug: 'neo',
    layerSlug: 'sw',
    confidence: 'B',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: '1X-EQT strategic partnership: up to 10,000 NEO robots across 300+ portfolio companies by 2030',
    summary: '1X signed deal to deploy up to 10,000 NEO robots across EQT\'s 300+ portfolio companies (2026-2030) for manufacturing, warehousing, logistics. U.S. pilots begin 2026, expansion to Europe and Asia follows. Major enterprise go-to-market via PE portfolio.',
    sourceName: 'BusinessWire / TechCrunch',
    sourceUrl: 'https://www.businesswire.com/news/home/20251211360340/en/1X-Announces-Strategic-Partnership-to-Make-up-to-10000-Humanoid-Robots-Available-to-EQTs-Global-Portfolio',
    competitorSlug: 'neo',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'partnership',
    severity: 'critical',
  },
  {
    headline: '1X NEO consumer specs: NVIDIA Jetson Thor brain, $20K purchase or $499/month subscription, US delivery 2026',
    summary: 'Every NEO unit features NVIDIA Jetson Thor as core brain for real-time AI inference. In-house manufacturing of motors, batteries, sensors. Consumer price $20,000 or $499/month subscription. Built-in LLM for conversation and Visual Intelligence for object recognition. US deliveries 2026, global 2027.',
    sourceName: '1X Official / Bloomberg',
    sourceUrl: 'https://www.1x.tech/discover/neo-factory',
    competitorSlug: 'neo',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },

  // ── Agibot ──
  {
    headline: 'Agibot 10,000th robot rolls off production line March 2026; 5K to 10K in just 3 months',
    summary: 'Agibot reached 10,000 humanoid robot milestone on March 28, 2026. Jump from 5,000 to 10,000 in just 3 months — 4x production acceleration. IDC ranked Agibot first in total humanoid shipment volume globally. Declared 2026 "Deployment Year One."',
    sourceName: 'The Robot Report / Interesting Engineering',
    sourceUrl: 'https://www.therobotreport.com/agibot-rolls-out-10000th-humanoid-robot/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'A',
    category: 'mass_production',
    severity: 'critical',
  },
  {
    headline: 'Agibot APC 2026: 4 new robots, 8 AI models, GO-2 embodied model, 358 Grand Plan strategy',
    summary: 'At Agibot Partner Conference (2,500 attendees, 34 countries), unveiled Expedition A3, G2 Air, D2 Max, OmniHand 3 Ultra-T, plus 8 foundation AI models including GO-2 embodied model. Announced "358 Grand Plan" strategy and 7 standardized deployment solutions.',
    sourceName: 'PR Newswire / Robotics & Automation News',
    sourceUrl: 'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746195.html',
    competitorSlug: 'agibot',
    layerSlug: 'hw',
    confidence: 'A',
    category: 'spec_update',
    severity: 'warning',
  },
  {
    headline: 'Agibot G2 deployed on live factory line: 99.9% success rate, 310 units/hour, 19-20 sec cycle time',
    summary: 'G2 deployed on live consumer electronics manufacturing line at Longcheer Technology in China. Performance: 310 units/hour throughput, 19-20 second cycle time, >99.9% success rate. Plans to scale to 100 robots by Q3 2026, expand into automotive/semiconductors/energy.',
    sourceName: 'Interesting Engineering',
    sourceUrl: 'https://interestingengineering.com/ai-robotics/agibot-g2-humanoid-robots-live-production-line',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'partnership',
    severity: 'warning',
  },
  {
    headline: 'Agibot Hong Kong IPO planned Q3 2026: HK$40-50B valuation ($5.1-6.4B), CICC/Morgan Stanley lead',
    summary: 'Agibot targeting Hong Kong IPO with HK$40-50B ($5.1-6.4B) valuation, planning to sell 15-25% of shares, potentially raising $1B+. CICC, CITIC Securities, and Morgan Stanley as lead advisors. Strategic investors include LG Electronics, BYD, Tencent, HongShan Capital.',
    sourceName: 'Capital.com / Medium / Futunn News',
    sourceUrl: 'https://capital.com/en-int/learn/ipo/agibot-ipo',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'B',
    category: 'funding',
    severity: 'critical',
  },
  {
    headline: 'Agibot + Whale Cloud global partnership: embodied AI robots across 14 countries, telecom-first',
    summary: 'Whale Cloud partnered with Agibot for global deployment of embodied AI robots combining Agibot platforms with Whale Cloud\'s telecom/enterprise customer base. Initial focus: telecommunications, expanding to manufacturing, healthcare, public services across 14 countries.',
    sourceName: 'The AI Insider',
    sourceUrl: 'https://theaiinsider.tech/2026/04/21/whale-cloud-and-agibot-announce-partnership-to-for-global-robotics-expansion/',
    competitorSlug: 'agibot',
    layerSlug: 'biz',
    confidence: 'C',
    category: 'partnership',
    severity: 'info',
  },
  {
    headline: 'Agibot X1 open-source platform: published CAD files, AimRT Framework, world\'s largest humanoid manipulation dataset',
    summary: 'AgiBot X1 (Lingxi X1) open-source bipedal humanoid platform. Published CAD files, assembly guides, full software stack, AimRT Framework, and AGIBOT World Dataset — the largest humanoid manipulation dataset publicly available. Enables community development and research.',
    sourceName: 'Agibot Official / RoboZaps',
    sourceUrl: 'https://www.agibot.com/',
    competitorSlug: 'agibot',
    layerSlug: 'sw',
    confidence: 'A',
    category: 'spec_update',
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
    console.log(`  Date: 2026-05-24`);
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
