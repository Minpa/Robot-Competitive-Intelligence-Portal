import { db, companies, products } from './index.js';
import { eq } from 'drizzle-orm';

async function seedRfm() {
  console.log('Seeding RFM (Robot Foundation Model) data...');

  // RFM 관련 회사들 추가
  const rfmCompanies = [
    {
      name: 'Physical Intelligence',
      country: 'USA',
      category: 'ai_robotics',
      homepageUrl: 'https://www.physicalintelligence.company',
      description: 'AI company developing foundation models for robotics (π0)',
    },
    {
      name: 'NVIDIA',
      country: 'USA',
      category: 'ai_robotics',
      homepageUrl: 'https://www.nvidia.com',
      description: 'GPU and AI computing company with robotics foundation models',
    },
    {
      name: 'Google DeepMind',
      country: 'USA',
      category: 'ai_robotics',
      homepageUrl: 'https://deepmind.google',
      description: 'AI research lab developing RT-X and other robotics models',
    },
    {
      name: 'UC Berkeley',
      country: 'USA',
      category: 'research',
      homepageUrl: 'https://www.berkeley.edu',
      description: 'Leading research university in robotics and AI',
    },
    {
      name: 'Stanford University',
      country: 'USA',
      category: 'research',
      homepageUrl: 'https://www.stanford.edu',
      description: 'Research university with robotics AI lab',
    },
    {
      name: 'Toyota Research Institute',
      country: 'USA',
      category: 'ai_robotics',
      homepageUrl: 'https://www.tri.global',
      description: 'Toyota AI research division focusing on robotics',
    },
    {
      name: 'Covariant',
      country: 'USA',
      category: 'ai_robotics',
      homepageUrl: 'https://covariant.ai',
      description: 'AI robotics company for warehouse automation',
    },
    {
      name: 'Figure AI',
      country: 'USA',
      category: 'ai_robotics',
      homepageUrl: 'https://www.figure.ai',
      description: 'Humanoid robot company with AI integration',
    },
    {
      name: '1X Technologies',
      country: 'Norway',
      category: 'ai_robotics',
      homepageUrl: 'https://www.1x.tech',
      description: 'Humanoid robot company backed by OpenAI',
    },
  ];

  const insertedCompanies: Record<string, string> = {};

  for (const company of rfmCompanies) {
    // 이미 존재하는지 확인
    const existing = await db.select().from(companies).where(eq(companies.name, company.name)).limit(1);
    
    if (existing.length > 0) {
      insertedCompanies[company.name] = existing[0]!.id;
      console.log(`Company already exists: ${company.name}`);
    } else {
      const [inserted] = await db.insert(companies).values(company).returning();
      insertedCompanies[company.name] = inserted!.id;
      console.log(`Added company: ${company.name}`);
    }
  }

  // RFM 제품들 추가
  const rfmProducts = [
    // Physical Intelligence
    {
      companyName: 'Physical Intelligence',
      name: 'π0 (Pi-Zero)',
      series: 'π',
      type: 'foundation_model',
      releaseDate: '2024-10-31',
      targetMarket: 'General-purpose robot control',
      status: 'announced',
    },
    // NVIDIA
    {
      companyName: 'NVIDIA',
      name: 'GR00T',
      series: 'Project GR00T',
      type: 'foundation_model',
      releaseDate: '2024-03-18',
      targetMarket: 'Humanoid robot foundation model',
      status: 'announced',
    },
    {
      companyName: 'NVIDIA',
      name: 'Isaac Lab',
      series: 'Isaac',
      type: 'foundation_model',
      releaseDate: '2024-01-08',
      targetMarket: 'Robot learning and simulation',
      status: 'available',
    },
    // Google DeepMind
    {
      companyName: 'Google DeepMind',
      name: 'RT-2',
      series: 'RT',
      type: 'foundation_model',
      releaseDate: '2023-07-28',
      targetMarket: 'Vision-Language-Action model',
      status: 'research',
    },
    {
      companyName: 'Google DeepMind',
      name: 'RT-X',
      series: 'RT',
      type: 'foundation_model',
      releaseDate: '2023-10-05',
      targetMarket: 'Cross-embodiment robot learning',
      status: 'research',
    },
    {
      companyName: 'Google DeepMind',
      name: 'RT-H',
      series: 'RT',
      type: 'foundation_model',
      releaseDate: '2024-03-12',
      targetMarket: 'Human-in-the-loop robot learning',
      status: 'research',
    },
    // UC Berkeley
    {
      companyName: 'UC Berkeley',
      name: 'Octo',
      series: 'Octo',
      type: 'foundation_model',
      releaseDate: '2024-05-09',
      targetMarket: 'Open-source generalist robot policy',
      status: 'available',
    },
    {
      companyName: 'UC Berkeley',
      name: 'OpenVLA',
      series: 'VLA',
      type: 'foundation_model',
      releaseDate: '2024-06-13',
      targetMarket: 'Open-source Vision-Language-Action model',
      status: 'available',
    },
    // Stanford
    {
      companyName: 'Stanford University',
      name: 'Mobile ALOHA',
      series: 'ALOHA',
      type: 'foundation_model',
      releaseDate: '2024-01-04',
      targetMarket: 'Mobile manipulation learning',
      status: 'research',
    },
    {
      companyName: 'Stanford University',
      name: 'Diffusion Policy',
      series: 'Diffusion',
      type: 'foundation_model',
      releaseDate: '2023-06-15',
      targetMarket: 'Visuomotor policy learning',
      status: 'research',
    },
    // Toyota Research Institute
    {
      companyName: 'Toyota Research Institute',
      name: 'Diffusion Policy (TRI)',
      series: 'TRI Robotics',
      type: 'foundation_model',
      releaseDate: '2024-09-04',
      targetMarket: 'Large behavior models for robots',
      status: 'research',
    },
    // Covariant
    {
      companyName: 'Covariant',
      name: 'RFM-1',
      series: 'RFM',
      type: 'foundation_model',
      releaseDate: '2024-03-11',
      targetMarket: 'Warehouse robotics foundation model',
      status: 'available',
    },
    // Figure AI
    {
      companyName: 'Figure AI',
      name: 'Figure 01 + OpenAI',
      series: 'Figure',
      type: 'foundation_model',
      releaseDate: '2024-03-13',
      targetMarket: 'Humanoid with multimodal AI',
      status: 'announced',
    },
    // 1X Technologies
    {
      companyName: '1X Technologies',
      name: 'NEO + GPT',
      series: 'NEO',
      type: 'foundation_model',
      releaseDate: '2024-08-15',
      targetMarket: 'Humanoid with OpenAI integration',
      status: 'announced',
    },
  ];

  for (const product of rfmProducts) {
    const companyId = insertedCompanies[product.companyName];
    if (!companyId) {
      console.log(`Company not found: ${product.companyName}`);
      continue;
    }

    // 이미 존재하는지 확인
    const existing = await db.select().from(products)
      .where(eq(products.name, product.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`Product already exists: ${product.name}`);
      continue;
    }

    await db.insert(products).values({
      companyId,
      name: product.name,
      series: product.series,
      type: product.type,
      releaseDate: product.releaseDate,
      targetMarket: product.targetMarket,
      status: product.status,
    });
    console.log(`Added RFM: ${product.name} (${product.companyName})`);
  }

  console.log('RFM seed completed successfully!');
  process.exit(0);
}

seedRfm().catch((err) => {
  console.error('RFM seed failed:', err);
  process.exit(1);
});
