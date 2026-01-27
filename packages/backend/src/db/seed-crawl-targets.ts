import { db, companies, crawlTargets } from './index.js';

async function seedCrawlTargets() {
  console.log('Adding robot companies and crawl targets...');

  // ============================================
  // ROBOT COMPANIES - Major Players
  // ============================================
  
  const robotCompanies = [
    // USA
    { name: 'Boston Dynamics', country: 'USA', category: 'robotics', homepageUrl: 'https://www.bostondynamics.com', description: 'Leading robotics company known for Spot, Atlas, and Stretch robots' },
    { name: 'Agility Robotics', country: 'USA', category: 'robotics', homepageUrl: 'https://agilityrobotics.com', description: 'Creator of Digit humanoid robot for logistics' },
    { name: 'Figure AI', country: 'USA', category: 'robotics', homepageUrl: 'https://www.figure.ai', description: 'Developing general-purpose humanoid robots' },
    { name: 'Apptronik', country: 'USA', category: 'robotics', homepageUrl: 'https://apptronik.com', description: 'Creator of Apollo humanoid robot' },
    { name: '1X Technologies', country: 'USA', category: 'robotics', homepageUrl: 'https://www.1x.tech', description: 'Developing NEO humanoid robot' },
    { name: 'Sanctuary AI', country: 'Canada', category: 'robotics', homepageUrl: 'https://sanctuary.ai', description: 'Creator of Phoenix humanoid robot with AI' },
    { name: 'Tesla', country: 'USA', category: 'robotics', homepageUrl: 'https://www.tesla.com/optimus', description: 'Developing Optimus humanoid robot' },
    { name: 'Amazon Robotics', country: 'USA', category: 'robotics', homepageUrl: 'https://www.amazonrobotics.com', description: 'Warehouse and logistics robots' },
    { name: 'Locus Robotics', country: 'USA', category: 'robotics', homepageUrl: 'https://locusrobotics.com', description: 'Autonomous mobile robots for warehouses' },
    { name: 'Fetch Robotics', country: 'USA', category: 'robotics', homepageUrl: 'https://fetchrobotics.com', description: 'Autonomous mobile robots (acquired by Zebra)' },
    { name: 'Intuitive Surgical', country: 'USA', category: 'robotics', homepageUrl: 'https://www.intuitive.com', description: 'Da Vinci surgical robot systems' },
    { name: 'iRobot', country: 'USA', category: 'robotics', homepageUrl: 'https://www.irobot.com', description: 'Consumer robots including Roomba' },
    
    // China
    { name: 'Unitree Robotics', country: 'China', category: 'robotics', homepageUrl: 'https://www.unitree.com', description: 'Quadruped and humanoid robot manufacturer' },
    { name: 'UBTECH Robotics', country: 'China', category: 'robotics', homepageUrl: 'https://www.ubtrobot.com', description: 'Walker humanoid and educational robots' },
    { name: 'Fourier Intelligence', country: 'China', category: 'robotics', homepageUrl: 'https://www.fftai.com', description: 'GR-1 humanoid and rehabilitation robots' },
    { name: 'Xiaomi', country: 'China', category: 'robotics', homepageUrl: 'https://www.mi.com', description: 'CyberOne humanoid robot' },
    { name: 'Keenon Robotics', country: 'China', category: 'robotics', homepageUrl: 'https://www.keenonrobot.com', description: 'Service and delivery robots' },
    { name: 'Pudu Robotics', country: 'China', category: 'robotics', homepageUrl: 'https://www.pudurobotics.com', description: 'Commercial service robots' },
    { name: 'DJI', country: 'China', category: 'robotics', homepageUrl: 'https://www.dji.com', description: 'Drones and RoboMaster educational robots' },
    { name: 'Agilex Robotics', country: 'China', category: 'robotics', homepageUrl: 'https://www.agilex.ai', description: 'Mobile robot platforms' },
    
    // Japan
    { name: 'Honda', country: 'Japan', category: 'robotics', homepageUrl: 'https://global.honda/innovation/robotics', description: 'ASIMO legacy, Avatar Robot' },
    { name: 'Toyota', country: 'Japan', category: 'robotics', homepageUrl: 'https://www.toyota.com', description: 'T-HR3 humanoid and partner robots' },
    { name: 'SoftBank Robotics', country: 'Japan', category: 'robotics', homepageUrl: 'https://www.softbankrobotics.com', description: 'Pepper and NAO social robots' },
    { name: 'Kawasaki Heavy Industries', country: 'Japan', category: 'robotics', homepageUrl: 'https://robotics.kawasaki.com', description: 'Industrial and humanoid robots' },
    { name: 'Fanuc', country: 'Japan', category: 'robotics', homepageUrl: 'https://www.fanuc.com', description: 'Industrial robot arms' },
    { name: 'Yaskawa', country: 'Japan', category: 'robotics', homepageUrl: 'https://www.yaskawa.com', description: 'Motoman industrial robots' },
    
    // Korea
    { name: 'Hyundai Robotics', country: 'South Korea', category: 'robotics', homepageUrl: 'https://www.hyundai-robotics.com', description: 'Industrial and service robots' },
    { name: 'Samsung', country: 'South Korea', category: 'robotics', homepageUrl: 'https://www.samsung.com', description: 'Bot Handy and service robots' },
    { name: 'Rainbow Robotics', country: 'South Korea', category: 'robotics', homepageUrl: 'https://www.rainbow-robotics.com', description: 'HUBO humanoid robot' },
    { name: 'Doosan Robotics', country: 'South Korea', category: 'robotics', homepageUrl: 'https://www.doosanrobotics.com', description: 'Collaborative robot arms' },
    
    // Europe
    { name: 'ABB Robotics', country: 'Switzerland', category: 'robotics', homepageUrl: 'https://new.abb.com/products/robotics', description: 'Industrial robot arms and cobots' },
    { name: 'KUKA', country: 'Germany', category: 'robotics', homepageUrl: 'https://www.kuka.com', description: 'Industrial robots and automation' },
    { name: 'Universal Robots', country: 'Denmark', category: 'robotics', homepageUrl: 'https://www.universal-robots.com', description: 'Collaborative robot arms' },
    { name: 'PAL Robotics', country: 'Spain', category: 'robotics', homepageUrl: 'https://pal-robotics.com', description: 'TALOS and TIAGo humanoid robots' },
    { name: 'Aldebaran', country: 'France', category: 'robotics', homepageUrl: 'https://www.aldebaran.com', description: 'NAO robot creator' },
    { name: 'Franka Emika', country: 'Germany', category: 'robotics', homepageUrl: 'https://www.franka.de', description: 'Panda collaborative robot' },
  ];

  // Insert companies (skip if exists)
  for (const company of robotCompanies) {
    try {
      await db.insert(companies).values(company).onConflictDoNothing();
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`Added ${robotCompanies.length} robot companies`);

  // ============================================
  // CRAWL TARGETS - Daily crawling at midnight
  // ============================================
  
  const dailyCron = '0 0 * * *'; // Every day at midnight
  
  const crawlTargetsList = [
    // Company News/Blog Pages
    {
      domain: 'bostondynamics.com',
      urls: ['https://www.bostondynamics.com/news', 'https://www.bostondynamics.com/blog'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: 'article', date: 'time' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, delayBetweenRequests: 3000 },
      enabled: true,
    },
    {
      domain: 'agilityrobotics.com',
      urls: ['https://agilityrobotics.com/news', 'https://agilityrobotics.com/blog'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: '.post-content', date: '.date' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, delayBetweenRequests: 3000 },
      enabled: true,
    },
    {
      domain: 'figure.ai',
      urls: ['https://www.figure.ai/news'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: 'article', date: 'time' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, delayBetweenRequests: 3000 },
      enabled: true,
    },
    {
      domain: 'unitree.com',
      urls: ['https://www.unitree.com/news'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: '.content', date: '.date' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, delayBetweenRequests: 3000 },
      enabled: true,
    },
    {
      domain: 'tesla.com',
      urls: ['https://www.tesla.com/blog'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: 'article', date: 'time' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 5, requestsPerHour: 50, delayBetweenRequests: 5000 },
      enabled: true,
    },
    
    // Tech News Sites - Robotics Coverage
    {
      domain: 'techcrunch.com',
      urls: ['https://techcrunch.com/tag/robotics/', 'https://techcrunch.com/tag/robots/'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: '.article-content', date: 'time' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, delayBetweenRequests: 3000 },
      enabled: true,
    },
    {
      domain: 'theverge.com',
      urls: ['https://www.theverge.com/robots'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: '.c-entry-content', date: 'time' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, delayBetweenRequests: 3000 },
      enabled: true,
    },
    {
      domain: 'wired.com',
      urls: ['https://www.wired.com/tag/robots/'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: 'article', date: 'time' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, delayBetweenRequests: 3000 },
      enabled: true,
    },
    {
      domain: 'ieee.org',
      urls: ['https://spectrum.ieee.org/topic/robotics/'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: 'article', date: 'time' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, delayBetweenRequests: 3000 },
      enabled: true,
    },
    
    // Robotics-Specific News
    {
      domain: 'therobotreport.com',
      urls: ['https://www.therobotreport.com/news/', 'https://www.therobotreport.com/category/humanoids/'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: '.entry-content', date: '.entry-date' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 15, requestsPerHour: 150, delayBetweenRequests: 2000 },
      enabled: true,
    },
    {
      domain: 'roboticsbusinessreview.com',
      urls: ['https://www.roboticsbusinessreview.com/'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: '.entry-content', date: '.date' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 15, requestsPerHour: 150, delayBetweenRequests: 2000 },
      enabled: true,
    },
    {
      domain: 'robotics247.com',
      urls: ['https://www.robotics247.com/'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: 'article', date: '.date' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 15, requestsPerHour: 150, delayBetweenRequests: 2000 },
      enabled: true,
    },
    
    // Research & Academic
    {
      domain: 'arxiv.org',
      urls: ['https://arxiv.org/list/cs.RO/recent'],
      patterns: [{ type: 'article' as const, selectors: { title: '.title', content: '.abstract', date: '.dateline' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 5, requestsPerHour: 50, delayBetweenRequests: 5000 },
      enabled: true,
    },
    
    // Korean News Sources
    {
      domain: 'etnews.com',
      urls: ['https://www.etnews.com/news/section.html?id1=01&id2=13'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: '.article_txt', date: '.date' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 10, requestsPerHour: 100, delayBetweenRequests: 3000 },
      enabled: true,
    },
    {
      domain: 'irobotnews.com',
      urls: ['https://www.irobotnews.com/news/articleList.html'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: '#article-view-content-div', date: '.info-text' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 15, requestsPerHour: 150, delayBetweenRequests: 2000 },
      enabled: true,
    },
    {
      domain: 'hellot.net',
      urls: ['https://www.hellot.net/news/articleList.html?sc_section_code=S1N4'],
      patterns: [{ type: 'article' as const, selectors: { title: 'h1', content: '#article-view-content-div', date: '.info-text' } }],
      cronExpression: dailyCron,
      rateLimit: { requestsPerMinute: 15, requestsPerHour: 150, delayBetweenRequests: 2000 },
      enabled: true,
    },
  ];

  // Insert crawl targets
  for (const target of crawlTargetsList) {
    try {
      await db.insert(crawlTargets).values(target).onConflictDoNothing();
    } catch (e) {
      // Skip duplicates
    }
  }
  console.log(`Added ${crawlTargetsList.length} crawl targets`);

  console.log('Crawl targets seed completed!');
  process.exit(0);
}

seedCrawlTargets().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
