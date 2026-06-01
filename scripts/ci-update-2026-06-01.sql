-- ARGOS CI War Room Update — 2026-06-01
-- Run against production DATABASE_URL when remote DB connectivity is restored.
-- Idempotent: uses ON CONFLICT / NOT EXISTS to skip duplicates.

-- 0. Ensure additional competitors exist
INSERT INTO ci_competitors (slug, name, manufacturer, country, stage, sort_order, is_active) VALUES
  ('unitree', 'G1/H1', 'Unitree Robotics', '🇨🇳', 'commercial', 7, true),
  ('apollo', 'Apollo', 'Apptronik', '🇺🇸', 'pilot', 8, true),
  ('agibot', 'G2/A3', 'Agibot', '🇨🇳', 'commercial', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- 1. ci_monitor_alerts (20 items, dedup by headline)

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'The Robot Report / Teslarati', 'https://www.therobotreport.com/from-evs-to-robotics-tesla-targets-10m-optimus-units-with-new-texas-plant/',
  'Tesla breaks ground on dedicated Optimus factory at Giga Texas targeting 10M units/year capacity',
  'Tesla Q1 2026 report confirms 5.2M sq ft Optimus factory expansion at Gigafactory Texas targeting 10 million robots/year. First steel structure raised per May 27 drone footage. Second-generation production line targeting high-volume output by Summer 2027. Fremont conversion to begin July/August 2026 after Model S/X phase-out in May.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'optimus' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla breaks ground on dedicated Optimus factory at Giga Texas targeting 10M units/year capacity');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Basenor / Tesla Official', 'https://www.basenor.com/blogs/news/tesla-optimus-gen-3-face-revealed-oled-display-and-whats-coming',
  'Tesla Optimus Gen 3 design revealed with OLED face display and 22-DOF hands for mass production',
  'Tesla plans Gen 3 Optimus reveal featuring redesigned hands with 22 confirmed degrees of freedom for fine motor tasks and an OLED display face. Gen 3 is the first design explicitly engineered for mass production.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'optimus' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla Optimus Gen 3 design revealed with OLED face display and 22-DOF hands for mass production');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Teslarati / SEC Filing', 'https://www.teslarati.com/tesla-tsla-optimus-already-benefiting-investors-wall-street-firm-says/',
  'Tesla Optimus robots operating in factories for learning/data collection; consumer sales targeted end of 2027',
  'As of May 2026, Optimus robots are operating within Tesla factories primarily for learning and data collection. Consumer sales targeted for end of 2027.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'optimus' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Tesla Optimus robots operating in factories for learning/data collection; consumer sales targeted end of 2027');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Interesting Engineering / Robotics & Automation News', 'https://interestingengineering.com/ai-robotics/boston-dynamics-atlas-humanoid-heavy-lifting-simulation',
  'Boston Dynamics Atlas trains to lift 100+ lb industrial loads using AI-driven whole-body control',
  'Boston Dynamics demonstrated Atlas lifting appliances weighing over 100 lbs. Uses AI-driven whole-body control and sim-to-real transfer. All 2026 Atlas deployments fully committed to Hyundai RMAC and Google DeepMind.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'atlas' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Boston Dynamics Atlas trains to lift 100+ lb industrial loads using AI-driven whole-body control');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Automate.org / Humanoids Daily', 'https://www.humanoidsdaily.com/news/the-alien-in-the-factory-boston-dynamics-launches-production-ready-atlas-at-ces-2026',
  'Hyundai Mobis confirmed as actuator supplier for Atlas; production-ready Atlas launched at CES 2026',
  'Hyundai Mobis will supply actuators for Atlas production. Production version unveiled at CES 2026 on January 5. Additional customers onboarding early 2027.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'atlas' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Hyundai Mobis confirmed as actuator supplier for Atlas; production-ready Atlas launched at CES 2026');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Interesting Engineering / Sherwood News / Seoul Economic Daily', 'https://interestingengineering.com/ai-robotics/figure-03-humanoid-robot-200-hour-shift',
  'Figure 03 fleet completes 200-hour autonomous livestream sorting 249,560 packages with zero hardware failures',
  'Starting May 14, 2026, three F.03 robots ran 200 hours straight processing 249,560 packages without a single hardware failure or human intervention. Helix-02 AI system. 98.5% human-equivalent performance.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'figure' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure 03 fleet completes 200-hour autonomous livestream sorting 249,560 packages with zero hardware failures');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'The AI Insider / Interesting Engineering', 'https://theaiinsider.tech/2026/05/01/figure-ai-ramps-up-production-to-one-humanoid-robot-per-hour/',
  'Figure 03 production reaches 1 robot/hour at BotQ; 350+ units delivered, 9000+ actuators produced',
  'Figure AI scaled manufacturing from 1 robot/day to 1 robot/hour in under four months. 350+ units delivered. First-pass yields above 80%. Plans to ship 100,000 humanoids over four years.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'figure' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Figure 03 production reaches 1 robot/hour at BotQ; 350+ units delivered, 9000+ actuators produced');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'The Next Web / Bloomberg / Rest of World', 'https://thenextweb.com/news/unitree-gd01-mecha-humanoid-robot-ipo',
  'Unitree GD01 transformable mecha unveiled alongside $7B IPO filing on Shanghai STAR Market',
  'Unitree unveiled 2.8m transformable mecha GD01. IPO targets CNY 4.2B ($608M). CSAC inspection started April 1. China first publicly traded humanoid robotics company.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'unitree' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Unitree GD01 transformable mecha unveiled alongside $7B IPO filing on Shanghai STAR Market');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Humanoids Daily / KraneShares', 'https://www.humanoidsdaily.com/news/unitree-files-for-580m-ipo-humanoid-sales-surpass-robot-dogs-as-profits-soar',
  E'Unitree holds 70% quadruped market share, 32.4% humanoid share; revenue ¥1.71B with 335% YoY growth',
  E'Unitree holds 70% quadruped market, 32.4% humanoid share. Revenue ¥1.708B ($250M) in 2025, 335% YoY. Net profit 8x to ¥600M. Profitable since 2020.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'unitree' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = E'Unitree holds 70% quadruped market share, 32.4% humanoid share; revenue ¥1.71B with 335% YoY growth');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'RobotsBeat / RobotShop Community', 'https://robotsbeat.com/unitree-unistore-robot-app-store-humanoid-g1-h1-ecosystem/',
  E'Unitree launches UniStore — world''s first Humanoid Robot App Store for G1/H1 platforms',
  'Unitree introduced UniStore, world first humanoid robot application store. R1 lightweight humanoid launched at $6,000.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'unitree' AND l.slug = 'sw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = E'Unitree launches UniStore — world''s first Humanoid Robot App Store for G1/H1 platforms');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Agility Robotics Official', 'https://www.agilityrobotics.com/content/agility-robotics-announces-new-innovations-for-market-leading-humanoid-robot-digit',
  'Digit exceeds 100,000 totes moved in live commerce operations across Fortune 500 customers',
  'Digit has moved over 100,000 totes in live commerce operations. Fortune 500 customers include GXO, Schaeffler, Amazon, Toyota Canada, Mercado Libre.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'digit' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Digit exceeds 100,000 totes moved in live commerce operations across Fortune 500 customers');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'ISO / LinkedIn (Agility Robotics)', 'https://www.linkedin.com/posts/agilityrobotics_today-marks-a-significant-milestone-for-the-activity-7326673146223251456-5kG5',
  'Agility Robotics co-leads ISO 25785-1 humanoid safety standard working group with Boston Dynamics',
  'ISO 25785-1, first international safety standard for dynamically stable robots, in development. Led by Agility, Boston Dynamics, A3 Association. Final publication expected 2026-2027.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'digit' AND l.slug = 'safety'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agility Robotics co-leads ISO 25785-1 humanoid safety standard working group with Boston Dynamics');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Automate.org / CNBC', 'https://www.automate.org/robotics/industry-insights/this-years-model-apptroniks-next-apollo-is-nearly-ready-for-its-closeup',
  'Apptronik testing new next-gen Apollo for over a year; debut scheduled 2026 with Gemini Robotics AI',
  'Apptronik has been testing next-gen Apollo for over a year. Integrates Google DeepMind Gemini Robotics AI. Pilots at Mercedes-Benz and GXO. Jabil manufacturing partnership active.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'apollo' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Apptronik testing new next-gen Apollo for over a year; debut scheduled 2026 with Gemini Robotics AI');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'CNBC / Crunchbase News', 'https://www.cnbc.com/2026/02/11/apptronik-raises-520-million-at-5-billion-valuation-for-apollo-robot.html',
  E'Apptronik $935M total funding at $5B valuation; new investors include AT&T Ventures, John Deere, QIA',
  'Series A extension $520M brings total to $935M at $5B. Co-led by B Capital and Google. New investors AT&T Ventures, John Deere, QIA. Targeting $1B orders for 2027.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'apollo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = E'Apptronik $935M total funding at $5B valuation; new investors include AT&T Ventures, John Deere, QIA');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT '1X Official / The Robot Report', 'https://www.1x.tech/discover/neo-home-robot',
  E'1X NEO consumer deliveries begin Q3-Q4 2026; $20,000 Early Access or $499/month subscription',
  'NEO consumer deliveries Q3-Q4 2026 in US/Canada. $20,000 Early Access or $499/month. NVIDIA Jetson Thor onboard AI inference.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'neo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = E'1X NEO consumer deliveries begin Q3-Q4 2026; $20,000 Early Access or $499/month subscription');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'GlobeNewsWire / eWeek', 'https://www.globenewswire.com/news-release/2026/04/30/3285118/0/en/1x-opens-neo-factory-in-hayward-ca-america-s-first-vertically-integrated-humanoid-robot-factory-with-consumer-shipments-planned-for-2026.html',
  '1X NEO Factory: 58,000 sq ft, 200+ employees, most vertically integrated humanoid factory in US',
  '1X NEO Factory commenced production April 30, 2026. 58,000 sq ft, 200+ employees. In-house motors, batteries, sensors. 10K/year capacity, targeting 100K+ by end 2027. Sold out in 5 days.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'neo' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = '1X NEO Factory: 58,000 sq ft, 200+ employees, most vertically integrated humanoid factory in US');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'PR Newswire / Robotics & Automation News', 'https://www.prnewswire.com/news-releases/agibot-unveils-new-generation-of-embodied-ai-robots-and-models-accelerating-real-world-deployment-of-physical-ai-302746174.html',
  'Agibot A3 humanoid robot unveiled: 173cm, 55kg, industry-leading 0.218 kW/kg power-to-weight ratio',
  'AGIBOT A3: 173cm/55kg, 0.218 kW/kg. Full portfolio: A2 (full-size), X2 (compact), G2 (industrial), D1 (quadruped). One Robotic Body Three Intelligences architecture.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'agibot' AND l.slug = 'hw'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agibot A3 humanoid robot unveiled: 173cm, 55kg, industry-leading 0.218 kW/kg power-to-weight ratio');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'ASSEMBLY Magazine / Yicai Global', 'https://www.assemblymag.com/articles/99886-agibot-launches-new-humanoid-robots-partners-with-minth-to-advance-robotics-training',
  'Agibot partners with Minth Group for European market expansion; builds humanoid robots in Europe',
  'AGIBOT signed strategic partnership with Minth Group for European entry. Munich launch. Minth as sales agent, 15 years EU localization. First overseas AI robot experience center in Malaysia.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'agibot' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'Agibot partners with Minth Group for European market expansion; builds humanoid robots in Europe');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Humanoids Daily', 'https://www.humanoidsdaily.com/news/agibot-launches-global-rental-platform-at-mwc-2026-offering-humanoids-for-899-a-day',
  E'Agibot launches global rental platform at MWC 2026 offering humanoids for €899/day',
  E'AGIBOT launched global rental platform at MWC 2026, humanoids from €899/day. Combined with 10,000+ units produced milestone.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'agibot' AND l.slug = 'biz'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = E'Agibot launches global rental platform at MWC 2026 offering humanoids for €899/day');

INSERT INTO ci_monitor_alerts (source_name, source_url, headline, summary, competitor_id, layer_id, status, detected_at)
SELECT 'Tech Journal UK / ISO', 'https://www.techjournal.uk/p/astm-calls-for-urgent-safety-standards',
  'ASTM calls for urgent safety standards for humanoid robots; ISO 25785-1 Working Draft advancing toward 2027 publication',
  'ASTM International calls for urgent humanoid safety standards. ISO 25785-1 Working Draft, publication expected 2026-2027. ISO 10218:2025 shifts to collaborative application certification.',
  c.id, l.id, 'pending', NOW()
FROM ci_competitors c, ci_layers l WHERE c.slug = 'digit' AND l.slug = 'safety'
AND NOT EXISTS (SELECT 1 FROM ci_monitor_alerts WHERE headline = 'ASTM calls for urgent safety standards for humanoid robots; ISO 25785-1 Working Draft advancing toward 2027 publication');
