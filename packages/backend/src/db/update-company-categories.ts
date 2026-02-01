import { db, companies } from './index.js';
import { eq, sql } from 'drizzle-orm';

async function updateCompanyCategories() {
  console.log('Updating company categories...');

  // 카테고리 매핑: 회사명 -> 새 카테고리
  const categoryMappings: Record<string, string> = {
    // 로봇 완제품 회사들 (robot)
    'Boston Dynamics': 'robot',
    'Agility Robotics': 'robot',
    'Figure AI': 'robot',
    'Apptronik': 'robot',
    '1X Technologies': 'robot',
    'Sanctuary AI': 'robot',
    'Tesla': 'robot',
    'Amazon Robotics': 'robot',
    'Locus Robotics': 'robot',
    'Fetch Robotics': 'robot',
    'Intuitive Surgical': 'robot',
    'iRobot': 'robot',
    'Unitree Robotics': 'robot',
    'UBTECH Robotics': 'robot',
    'Xiaomi': 'robot',
    'Keenon Robotics': 'robot',
    'Pudu Robotics': 'robot',
    'DJI': 'robot',
    'Agilex Robotics': 'robot',
    'Honda': 'robot',
    'Toyota': 'robot',
    'SoftBank Robotics': 'robot',
    'Kawasaki Heavy Industries': 'robot',
    'Fanuc': 'robot',
    'Yaskawa': 'robot',
    'Hyundai Robotics': 'robot',
    'Samsung': 'robot',
    'Rainbow Robotics': 'robot',
    'Doosan Robotics': 'robot',
    'ABB Robotics': 'robot',
    'KUKA': 'robot',
    'Universal Robots': 'robot',
    'PAL Robotics': 'robot',
    'Aldebaran': 'robot',
    'Franka Emika': 'robot',
    'Fauna Robotics': 'robot',
    'Galbot': 'robot',
    'Zeroth Robotics': 'robot',
    'Donut Robotics': 'robot',
    'GAC Group': 'robot',
    'Lenovo': 'robot',
    'AeroVironment': 'robot',
    'Zeus Robotics': 'robot',

    // RFM/AI 회사들 (rfm)
    'Physical Intelligence': 'rfm',
    'Google DeepMind': 'rfm',
    'UC Berkeley': 'rfm',
    'Stanford University': 'rfm',
    'Toyota Research Institute': 'rfm',
    'Covariant': 'rfm',
    'OpenAI': 'rfm',

    // SoC/칩 회사들 (soc)
    'NVIDIA': 'soc',
    'Qualcomm': 'soc',
    'Rockchip': 'soc',
    'Amlogic': 'soc',
    'Hailo': 'soc',
    'Kneron': 'soc',
    'Intel': 'soc',
    'AMD': 'soc',
    'MediaTek': 'soc',

    // 액츄에이터/부품 회사들 (actuator)
    'Harmonic Drive': 'actuator',
    'Maxon Motor': 'actuator',
    'Faulhaber': 'actuator',
    'Nabtesco': 'actuator',
    'Gyems': 'actuator',
    'T-Motor': 'actuator',
  };

  // 특수 케이스: Fourier Intelligence는 로봇 완제품도 만들고 액츄에이터도 만듦
  // 주력이 로봇이므로 robot으로 분류
  categoryMappings['Fourier Intelligence'] = 'robot';

  let updated = 0;
  let notFound = 0;

  for (const [companyName, newCategory] of Object.entries(categoryMappings)) {
    const result = await db
      .update(companies)
      .set({ category: newCategory, updatedAt: new Date() })
      .where(eq(companies.name, companyName))
      .returning({ id: companies.id });

    if (result.length > 0) {
      console.log(`✓ ${companyName} -> ${newCategory}`);
      updated++;
    } else {
      console.log(`✗ ${companyName} not found`);
      notFound++;
    }
  }

  // 나머지 'robotics' 카테고리를 'robot'으로 변경
  const roboticsResult = await db
    .update(companies)
    .set({ category: 'robot', updatedAt: new Date() })
    .where(eq(companies.category, 'robotics'))
    .returning({ id: companies.id });

  console.log(`\nConverted ${roboticsResult.length} companies from 'robotics' to 'robot'`);

  // 'ai_robotics' 카테고리를 'rfm'으로 변경
  const aiRoboticsResult = await db
    .update(companies)
    .set({ category: 'rfm', updatedAt: new Date() })
    .where(eq(companies.category, 'ai_robotics'))
    .returning({ id: companies.id });

  console.log(`Converted ${aiRoboticsResult.length} companies from 'ai_robotics' to 'rfm'`);

  // 'research' 카테고리를 'rfm'으로 변경
  const researchResult = await db
    .update(companies)
    .set({ category: 'rfm', updatedAt: new Date() })
    .where(eq(companies.category, 'research'))
    .returning({ id: companies.id });

  console.log(`Converted ${researchResult.length} companies from 'research' to 'rfm'`);

  // 카테고리별 통계 출력
  const stats = await db
    .select({
      category: companies.category,
      count: sql<number>`count(*)`,
    })
    .from(companies)
    .groupBy(companies.category);

  console.log('\n=== Category Statistics ===');
  for (const stat of stats) {
    console.log(`${stat.category}: ${stat.count} companies`);
  }

  console.log(`\nUpdate completed! Updated: ${updated}, Not found: ${notFound}`);
  process.exit(0);
}

updateCompanyCategories().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
