import { db, companies, products, productSpecs, keywords, keywordStats } from './index.js';

async function seed() {
  console.log('Seeding database...');

  // Insert sample companies
  const [bostonDynamics] = await db
    .insert(companies)
    .values({
      name: 'Boston Dynamics',
      country: 'USA',
      category: 'robotics',
      homepageUrl: 'https://www.bostondynamics.com',
      description: 'Leading robotics company known for advanced mobile robots',
    })
    .returning();

  const [unitree] = await db
    .insert(companies)
    .values({
      name: 'Unitree Robotics',
      country: 'China',
      category: 'robotics',
      homepageUrl: 'https://www.unitree.com',
      description: 'Quadruped and humanoid robot manufacturer',
    })
    .returning();

  const [agility] = await db
    .insert(companies)
    .values({
      name: 'Agility Robotics',
      country: 'USA',
      category: 'robotics',
      homepageUrl: 'https://agilityrobotics.com',
      description: 'Creator of Digit humanoid robot for logistics',
    })
    .returning();

  // Insert sample products
  const [spot] = await db
    .insert(products)
    .values({
      companyId: bostonDynamics!.id,
      name: 'Spot',
      series: 'Spot',
      type: 'service',
      releaseDate: '2020-06-16',
      targetMarket: 'Industrial inspection, construction',
      status: 'available',
    })
    .returning();

  const [_atlas] = await db
    .insert(products)
    .values({
      companyId: bostonDynamics!.id,
      name: 'Atlas',
      series: 'Atlas',
      type: 'humanoid',
      releaseDate: '2024-04-17',
      targetMarket: 'Research, automotive manufacturing',
      status: 'announced',
    })
    .returning();

  const [g1] = await db
    .insert(products)
    .values({
      companyId: unitree!.id,
      name: 'G1',
      series: 'G',
      type: 'humanoid',
      releaseDate: '2024-05-13',
      targetMarket: 'Education, research, commercial',
      status: 'available',
    })
    .returning();

  const [digit] = await db
    .insert(products)
    .values({
      companyId: agility!.id,
      name: 'Digit',
      series: 'Digit',
      type: 'humanoid',
      releaseDate: '2023-10-18',
      targetMarket: 'Logistics, warehouse automation',
      status: 'available',
    })
    .returning();

  // Insert product specs
  await db.insert(productSpecs).values([
    {
      productId: spot!.id,
      dof: 12,
      payloadKg: '14',
      speedMps: '1.6',
      batteryMinutes: 90,
      sensors: [
        { type: 'camera', model: 'Stereo cameras' },
        { type: 'lidar', model: '360° LiDAR' },
      ],
      controlArchitecture: 'Proprietary',
      os: 'Spot SDK',
      sdk: 'Python, C++',
      priceMin: '74500',
      priceMax: '74500',
      priceCurrency: 'USD',
    },
    {
      productId: g1!.id,
      dof: 23,
      payloadKg: '3',
      speedMps: '2.0',
      batteryMinutes: 120,
      sensors: [
        { type: 'camera', model: 'Intel RealSense D435' },
        { type: 'imu', model: '9-axis IMU' },
      ],
      controlArchitecture: 'Unitree SDK',
      os: 'Linux',
      sdk: 'Python, ROS2',
      priceMin: '16000',
      priceMax: '16000',
      priceCurrency: 'USD',
    },
    {
      productId: digit!.id,
      dof: 30,
      payloadKg: '16',
      speedMps: '1.5',
      batteryMinutes: 480,
      sensors: [
        { type: 'camera', model: 'Stereo vision' },
        { type: 'lidar', model: 'LiDAR' },
      ],
      controlArchitecture: 'Agility SDK',
      os: 'Linux',
      sdk: 'Python',
      priceMin: '100000',
      priceMax: '150000',
      priceCurrency: 'USD',
    },
  ]);

  // Insert sample keywords
  const insertedKeywords = await db.insert(keywords).values([
    { term: 'humanoid robot', language: 'en', category: 'technology' },
    { term: 'quadruped robot', language: 'en', category: 'technology' },
    { term: 'warehouse automation', language: 'en', category: 'market' },
    { term: 'AI locomotion', language: 'en', category: 'technology' },
    { term: '휴머노이드', language: 'ko', category: 'technology' },
    { term: '물류 로봇', language: 'ko', category: 'market' },
  ]).returning();

  // Calculate current week dates
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const formatDate = (d: Date) => d.toISOString().split('T')[0]!;

  // Insert keyword stats for trending
  await db.insert(keywordStats).values([
    {
      keywordId: insertedKeywords[0]!.id, // humanoid robot
      periodType: 'week',
      periodStart: formatDate(weekStart),
      periodEnd: formatDate(weekEnd),
      count: 45,
      delta: 12,
      deltaPercent: '36.4',
    },
    {
      keywordId: insertedKeywords[1]!.id, // quadruped robot
      periodType: 'week',
      periodStart: formatDate(weekStart),
      periodEnd: formatDate(weekEnd),
      count: 28,
      delta: 5,
      deltaPercent: '21.7',
    },
    {
      keywordId: insertedKeywords[2]!.id, // warehouse automation
      periodType: 'week',
      periodStart: formatDate(weekStart),
      periodEnd: formatDate(weekEnd),
      count: 67,
      delta: 23,
      deltaPercent: '52.3',
    },
    {
      keywordId: insertedKeywords[3]!.id, // AI locomotion
      periodType: 'week',
      periodStart: formatDate(weekStart),
      periodEnd: formatDate(weekEnd),
      count: 34,
      delta: 8,
      deltaPercent: '30.8',
    },
    {
      keywordId: insertedKeywords[4]!.id, // 휴머노이드
      periodType: 'week',
      periodStart: formatDate(weekStart),
      periodEnd: formatDate(weekEnd),
      count: 52,
      delta: 15,
      deltaPercent: '40.5',
    },
    {
      keywordId: insertedKeywords[5]!.id, // 물류 로봇
      periodType: 'week',
      periodStart: formatDate(weekStart),
      periodEnd: formatDate(weekEnd),
      count: 41,
      delta: 9,
      deltaPercent: '28.1',
    },
  ]);

  console.log('Seed completed successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
