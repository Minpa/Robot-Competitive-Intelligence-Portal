import { db, companies, products } from './index.js';
import { eq } from 'drizzle-orm';

async function seedComponents() {
  console.log('Seeding Actuator and SoC data...');

  // 액츄에이터 및 SoC 관련 회사들 추가
  const componentCompanies = [
    // 액츄에이터 회사들
    {
      name: 'Harmonic Drive',
      country: 'Japan',
      category: 'actuator',
      homepageUrl: 'https://www.harmonicdrive.net',
      description: 'Precision gear and actuator manufacturer',
    },
    {
      name: 'Maxon Motor',
      country: 'Switzerland',
      category: 'actuator',
      homepageUrl: 'https://www.maxongroup.com',
      description: 'High-precision DC motors and actuators',
    },
    {
      name: 'Faulhaber',
      country: 'Germany',
      category: 'actuator',
      homepageUrl: 'https://www.faulhaber.com',
      description: 'Miniature drive systems',
    },
    {
      name: 'Nabtesco',
      country: 'Japan',
      category: 'actuator',
      homepageUrl: 'https://www.nabtesco.com',
      description: 'Precision reduction gears for robots',
    },
    {
      name: 'Gyems',
      country: 'China',
      category: 'actuator',
      homepageUrl: 'https://www.gyems.cn',
      description: 'Robot joint motors and actuators',
    },
    {
      name: 'T-Motor',
      country: 'China',
      category: 'actuator',
      homepageUrl: 'https://www.tmotor.com',
      description: 'Brushless motors for robotics and drones',
    },
    {
      name: 'Fourier Intelligence',
      country: 'China',
      category: 'actuator',
      homepageUrl: 'https://www.fftai.com',
      description: 'Actuators for humanoid robots',
    },
    // SoC 회사들
    {
      name: 'Qualcomm',
      country: 'USA',
      category: 'soc',
      homepageUrl: 'https://www.qualcomm.com',
      description: 'Mobile and robotics SoC manufacturer',
    },
    {
      name: 'Rockchip',
      country: 'China',
      category: 'soc',
      homepageUrl: 'https://www.rock-chips.com',
      description: 'ARM-based SoC for robotics',
    },
    {
      name: 'Amlogic',
      country: 'China',
      category: 'soc',
      homepageUrl: 'https://www.amlogic.com',
      description: 'AI SoC for edge computing',
    },
    {
      name: 'Hailo',
      country: 'Israel',
      category: 'soc',
      homepageUrl: 'https://hailo.ai',
      description: 'AI accelerator chips',
    },
    {
      name: 'Kneron',
      country: 'USA',
      category: 'soc',
      homepageUrl: 'https://www.kneron.com',
      description: 'Edge AI chips',
    },
  ];

  const insertedCompanies: Record<string, string> = {};

  // NVIDIA는 이미 있을 수 있음
  const existingNvidia = await db.select().from(companies).where(eq(companies.name, 'NVIDIA')).limit(1);
  if (existingNvidia.length > 0) {
    insertedCompanies['NVIDIA'] = existingNvidia[0]!.id;
  }

  for (const company of componentCompanies) {
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

  // 액츄에이터 제품들
  const actuatorProducts = [
    {
      companyName: 'Harmonic Drive',
      name: 'CSD-2A Series',
      series: 'CSD',
      type: 'actuator',
      releaseDate: '2023-03-15',
      targetMarket: 'Collaborative robots, humanoids',
      status: 'available',
    },
    {
      companyName: 'Harmonic Drive',
      name: 'SHA-C Series',
      series: 'SHA',
      type: 'actuator',
      releaseDate: '2024-01-20',
      targetMarket: 'High-torque robot joints',
      status: 'available',
    },
    {
      companyName: 'Maxon Motor',
      name: 'EC-i 52',
      series: 'EC-i',
      type: 'actuator',
      releaseDate: '2023-06-01',
      targetMarket: 'Humanoid robots, prosthetics',
      status: 'available',
    },
    {
      companyName: 'Maxon Motor',
      name: 'IDX 56L',
      series: 'IDX',
      type: 'actuator',
      releaseDate: '2024-02-15',
      targetMarket: 'Mobile robots, AGV',
      status: 'available',
    },
    {
      companyName: 'Faulhaber',
      name: 'BXT 42',
      series: 'BXT',
      type: 'actuator',
      releaseDate: '2023-09-10',
      targetMarket: 'Surgical robots, precision robotics',
      status: 'available',
    },
    {
      companyName: 'Nabtesco',
      name: 'RV-100C',
      series: 'RV',
      type: 'actuator',
      releaseDate: '2023-04-01',
      targetMarket: 'Industrial robot joints',
      status: 'available',
    },
    {
      companyName: 'Nabtesco',
      name: 'RH-N Series',
      series: 'RH',
      type: 'actuator',
      releaseDate: '2024-06-01',
      targetMarket: 'Humanoid robot joints',
      status: 'announced',
    },
    {
      companyName: 'Gyems',
      name: 'RMD-X8 Pro',
      series: 'RMD',
      type: 'actuator',
      releaseDate: '2023-08-01',
      targetMarket: 'Quadruped robots, humanoids',
      status: 'available',
    },
    {
      companyName: 'Gyems',
      name: 'RMD-X10',
      series: 'RMD',
      type: 'actuator',
      releaseDate: '2024-03-01',
      targetMarket: 'High-torque robot applications',
      status: 'available',
    },
    {
      companyName: 'T-Motor',
      name: 'AK80-64',
      series: 'AK',
      type: 'actuator',
      releaseDate: '2023-05-15',
      targetMarket: 'Legged robots, exoskeletons',
      status: 'available',
    },
    {
      companyName: 'T-Motor',
      name: 'AK10-9',
      series: 'AK',
      type: 'actuator',
      releaseDate: '2024-01-10',
      targetMarket: 'Humanoid robots',
      status: 'available',
    },
    {
      companyName: 'Fourier Intelligence',
      name: 'FSA Series',
      series: 'FSA',
      type: 'actuator',
      releaseDate: '2024-07-01',
      targetMarket: 'Humanoid robot actuators',
      status: 'available',
    },
  ];

  // SoC 제품들 (10 TOPS 이상)
  const socProducts = [
    {
      companyName: 'NVIDIA',
      name: 'Jetson Orin Nano',
      series: 'Jetson Orin',
      type: 'soc',
      releaseDate: '2023-03-21',
      targetMarket: 'Entry-level robotics AI (40 TOPS)',
      status: 'available',
    },
    {
      companyName: 'NVIDIA',
      name: 'Jetson Orin NX',
      series: 'Jetson Orin',
      type: 'soc',
      releaseDate: '2022-09-20',
      targetMarket: 'Mid-range robotics AI (100 TOPS)',
      status: 'available',
    },
    {
      companyName: 'NVIDIA',
      name: 'Jetson AGX Orin',
      series: 'Jetson Orin',
      type: 'soc',
      releaseDate: '2022-03-22',
      targetMarket: 'High-end robotics AI (275 TOPS)',
      status: 'available',
    },
    {
      companyName: 'NVIDIA',
      name: 'Jetson Thor',
      series: 'Jetson Thor',
      type: 'soc',
      releaseDate: '2025-06-01',
      targetMarket: 'Humanoid robots (800 TOPS)',
      status: 'announced',
    },
    {
      companyName: 'Qualcomm',
      name: 'RB5',
      series: 'Robotics',
      type: 'soc',
      releaseDate: '2020-06-17',
      targetMarket: 'Robotics and drones (15 TOPS)',
      status: 'available',
    },
    {
      companyName: 'Qualcomm',
      name: 'RB6',
      series: 'Robotics',
      type: 'soc',
      releaseDate: '2024-01-08',
      targetMarket: 'Advanced robotics (100+ TOPS)',
      status: 'available',
    },
    {
      companyName: 'Rockchip',
      name: 'RK3588',
      series: 'RK3588',
      type: 'soc',
      releaseDate: '2022-02-22',
      targetMarket: 'Edge AI robotics (6 TOPS NPU)',
      status: 'available',
    },
    {
      companyName: 'Amlogic',
      name: 'A311D2',
      series: 'A311',
      type: 'soc',
      releaseDate: '2023-01-10',
      targetMarket: 'AI robotics (12 TOPS)',
      status: 'available',
    },
    {
      companyName: 'Hailo',
      name: 'Hailo-8',
      series: 'Hailo',
      type: 'soc',
      releaseDate: '2021-06-01',
      targetMarket: 'Edge AI accelerator (26 TOPS)',
      status: 'available',
    },
    {
      companyName: 'Hailo',
      name: 'Hailo-8L',
      series: 'Hailo',
      type: 'soc',
      releaseDate: '2023-09-01',
      targetMarket: 'Low-power AI (13 TOPS)',
      status: 'available',
    },
    {
      companyName: 'Hailo',
      name: 'Hailo-10',
      series: 'Hailo',
      type: 'soc',
      releaseDate: '2024-09-10',
      targetMarket: 'Next-gen edge AI (40 TOPS)',
      status: 'announced',
    },
    {
      companyName: 'Kneron',
      name: 'KL730',
      series: 'KL',
      type: 'soc',
      releaseDate: '2023-05-01',
      targetMarket: 'Edge AI for robotics (10 TOPS)',
      status: 'available',
    },
  ];

  // 액츄에이터 추가
  for (const product of actuatorProducts) {
    const companyId = insertedCompanies[product.companyName];
    if (!companyId) {
      console.log(`Company not found: ${product.companyName}`);
      continue;
    }

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
    console.log(`Added Actuator: ${product.name} (${product.companyName})`);
  }

  // SoC 추가
  for (const product of socProducts) {
    const companyId = insertedCompanies[product.companyName];
    if (!companyId) {
      console.log(`Company not found: ${product.companyName}`);
      continue;
    }

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
    console.log(`Added SoC: ${product.name} (${product.companyName})`);
  }

  console.log('Components seed completed successfully!');
  process.exit(0);
}

seedComponents().catch((err) => {
  console.error('Components seed failed:', err);
  process.exit(1);
});
