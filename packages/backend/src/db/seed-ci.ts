import { db } from './index.js';
import {
  ciCompetitors,
  ciLayers,
  ciCategories,
  ciItems,
  ciValues,
  ciFreshness,
} from './schema.js';

// ============================================
// 1. 경쟁사 시드 데이터 (5건)
// ============================================
const competitorsData = [
  { slug: 'digit', name: 'Digit', manufacturer: 'Agility Robotics', country: '🇺🇸', stage: 'commercial', sortOrder: 1 },
  { slug: 'optimus', name: 'Optimus Gen 2', manufacturer: 'Tesla', country: '🇺🇸', stage: 'pilot', sortOrder: 2 },
  { slug: 'figure', name: 'Figure 02', manufacturer: 'Figure AI', country: '🇺🇸', stage: 'pilot', sortOrder: 3 },
  { slug: 'neo', name: 'NEO', manufacturer: '1X Technologies', country: '🇳🇴', stage: 'poc', sortOrder: 4 },
  { slug: 'atlas', name: 'Atlas (Electric)', manufacturer: 'Boston Dynamics', country: '🇺🇸', stage: 'prototype', sortOrder: 5 },
];

// ============================================
// 2. 레이어 시드 데이터 (6건)
// ============================================
const layersData = [
  { slug: 'hw', name: '하드웨어', icon: '⚙️', sortOrder: 1 },
  { slug: 'sw', name: 'SW/AI', icon: '🧠', sortOrder: 2 },
  { slug: 'data', name: '데이터/학습', icon: '🔗', sortOrder: 3 },
  { slug: 'biz', name: '비즈니스', icon: '💰', sortOrder: 4 },
  { slug: 'safety', name: '안전/규제', icon: '🛡️', sortOrder: 5 },
  { slug: 'ip', name: '특허/IP', icon: '📜', sortOrder: 6 },
];

// ============================================
// 3. 카테고리 & 항목 데이터 (레이어별)
// ============================================
interface CategoryDef {
  name: string;
  items: string[];
}

const categoriesByLayer: Record<string, CategoryDef[]> = {
  hw: [
    { name: '핵심 스펙', items: ['자유도(DOF)', '키/몸무게', '가반하중', '최대속도', '연속동작시간'] },
    { name: '액추에이터', items: ['구동 방식', '관절 토크', '손 자유도'] },
    { name: '센서/인지', items: ['비전 시스템', 'LiDAR/Depth', '촉각 센서', 'Force/Torque'] },
  ],
  sw: [
    { name: 'AI 모델 아키텍처', items: ['핵심 AI 모델', '학습 방식', '추론 위치'] },
    { name: '자율성 수준', items: ['자율 작업 범위', '연속 행동 수', '새 환경 적응'] },
    { name: 'SDK/API', items: ['개발 도구', '시뮬레이션', '오픈소스'] },
  ],
  data: [
    { name: '데이터 수집', items: ['실환경 데이터량', '데이터 수집 방식', '파트너 데이터'] },
    { name: '학습 인프라', items: ['GPU 클러스터', 'Sim-to-Real', '학습 주기'] },
  ],
  biz: [
    { name: '펀딩/밸류', items: ['총 펀딩', '최근 밸류에이션', '주요 투자자'] },
    { name: '시장 진출', items: ['상용화 단계', '배치 대수', '주요 고객', '가격대'] },
    { name: '전략 파트너', items: ['제조 파트너', '기술 파트너', '생태계 확장'] },
  ],
  safety: [
    { name: '안전 인증', items: ['국제 인증', 'ISO 표준', '충돌 안전'] },
    { name: '규제 대응', items: ['규제 전략', '로비/정책 참여', '사고 이력'] },
  ],
  ip: [
    { name: '특허 포트폴리오', items: ['총 특허 수', '핵심 기술 특허', '최근 3개월 출원'] },
    { name: 'IP 전략', items: ['라이선스 모델', '방어 특허', 'IP 소송'] },
  ],
};

// ============================================
// 4. 샘플 CI 값 (Digit HW, Optimus HW)
// ============================================
interface SampleValue {
  itemName: string;
  value: string;
  confidence: string;
  source: string;
}

const sampleValuesByCompetitor: Record<string, SampleValue[]> = {
  digit: [
    { itemName: '자유도(DOF)', value: '44 DOF (전신)', confidence: 'A', source: 'Agility Robotics 공식 스펙' },
    { itemName: '키/몸무게', value: '175cm / 65kg', confidence: 'A', source: 'Agility Robotics 공식' },
    { itemName: '가반하중', value: '16kg', confidence: 'A', source: 'Agility Robotics 공식' },
    { itemName: '최대속도', value: '5.5 km/h', confidence: 'B', source: 'Agility Robotics 공식' },
    { itemName: '연속동작시간', value: '2-4시간', confidence: 'B', source: 'Agility Robotics 공식' },
    { itemName: '구동 방식', value: '전기 모터 + 하모닉 감속기', confidence: 'B', source: 'Agility Robotics 공식' },
    { itemName: '관절 토크', value: '비공개', confidence: 'D', source: 'Agility Robotics 공식' },
    { itemName: '손 자유도', value: '4 DOF 그리퍼', confidence: 'B', source: 'Agility Robotics 공식' },
    { itemName: '비전 시스템', value: 'RGB-D 카메라 x2', confidence: 'B', source: 'Agility Robotics 공식' },
    { itemName: 'LiDAR/Depth', value: 'Intel RealSense', confidence: 'B', source: 'Agility Robotics 공식' },
    { itemName: '촉각 센서', value: '그리퍼 내장', confidence: 'C', source: 'Agility Robotics 공식' },
    { itemName: 'Force/Torque', value: '6축 F/T 센서', confidence: 'B', source: 'Agility Robotics 공식' },
  ],
  optimus: [
    { itemName: '자유도(DOF)', value: '28+ DOF', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: '키/몸무게', value: '173cm / 57kg', confidence: 'B', source: 'Tesla IR' },
    { itemName: '가반하중', value: '20kg (목표)', confidence: 'C', source: 'Tesla 발표 추정' },
    { itemName: '최대속도', value: '8 km/h (목표)', confidence: 'C', source: 'Tesla 발표 추정' },
    { itemName: '연속동작시간', value: '비공개', confidence: 'D', source: 'Tesla IR' },
    { itemName: '구동 방식', value: '커스텀 액추에이터', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: '관절 토크', value: '비공개', confidence: 'D', source: 'Tesla IR' },
    { itemName: '손 자유도', value: '11 DOF (촉각 센서 내장)', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: '비전 시스템', value: 'Tesla Vision (카메라 only)', confidence: 'A', source: 'Tesla AI Day 2024' },
    { itemName: 'LiDAR/Depth', value: '없음 (카메라 기반 깊이 추정)', confidence: 'A', source: 'Tesla AI Day 2024' },
    { itemName: '촉각 센서', value: '손끝 촉각 센서 내장', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: 'Force/Torque', value: '비공개', confidence: 'D', source: 'Tesla IR' },
  ],
};

// ============================================
// Freshness tier by layer
// ============================================
const freshnessTierByLayer: Record<string, number> = {
  hw: 3,       // quarterly — HW specs change slowly
  sw: 1,       // weekly — SW/AI moves fast
  data: 2,     // monthly
  biz: 1,      // weekly — funding/market changes fast
  safety: 3,   // quarterly
  ip: 2,       // monthly
};

// ============================================
// Main seed function
// ============================================
export async function seedCiData() {
  console.log('=== CI Seed Data ===\n');

  // Check if data already exists
  const existing = await db.select().from(ciCompetitors).limit(1);
  if (existing.length > 0) {
    console.log('CI competitors already seeded — skipping.');
    return;
  }

  // --- 1. Seed Competitors ---
  console.log('Seeding CI competitors (5 records)...');
  const insertedCompetitors = await db
    .insert(ciCompetitors)
    .values(competitorsData)
    .returning();
  console.log(`  Inserted ${insertedCompetitors.length} competitors`);

  // Build slug → id map
  const competitorMap = new Map<string, string>();
  for (const c of insertedCompetitors) {
    competitorMap.set(c.slug, c.id);
  }

  // --- 2. Seed Layers ---
  console.log('Seeding CI layers (6 records)...');
  const insertedLayers = await db
    .insert(ciLayers)
    .values(layersData)
    .returning();
  console.log(`  Inserted ${insertedLayers.length} layers`);

  // Build slug → id map
  const layerMap = new Map<string, string>();
  for (const l of insertedLayers) {
    layerMap.set(l.slug, l.id);
  }

  // --- 3. Seed Categories & Items ---
  console.log('Seeding CI categories & items...');
  // itemName → itemId map (for seeding values later)
  const itemIdMap = new Map<string, string>();

  for (const [layerSlug, categories] of Object.entries(categoriesByLayer)) {
    const layerId = layerMap.get(layerSlug)!;

    for (let catIdx = 0; catIdx < categories.length; catIdx++) {
      const catDef = categories[catIdx]!;

      const [insertedCat] = await db
        .insert(ciCategories)
        .values({
          layerId,
          name: catDef.name,
          sortOrder: catIdx + 1,
        })
        .returning();

      console.log(`  [${layerSlug}] Category: ${catDef.name} (${catDef.items.length} items)`);

      for (let itemIdx = 0; itemIdx < catDef.items.length; itemIdx++) {
        const itemName = catDef.items[itemIdx]!;

        const [insertedItem] = await db
          .insert(ciItems)
          .values({
            categoryId: insertedCat!.id,
            name: itemName,
            sortOrder: itemIdx + 1,
          })
          .returning();

        itemIdMap.set(itemName, insertedItem!.id);
      }
    }
  }

  // --- 4. Seed Sample Values ---
  console.log('Seeding sample CI values (Digit & Optimus HW)...');
  let valueCount = 0;

  for (const [competitorSlug, sampleValues] of Object.entries(sampleValuesByCompetitor)) {
    const competitorId = competitorMap.get(competitorSlug)!;

    for (const sv of sampleValues) {
      const itemId = itemIdMap.get(sv.itemName);
      if (!itemId) {
        console.log(`  Warning: item '${sv.itemName}' not found — skipping`);
        continue;
      }

      await db.insert(ciValues).values({
        competitorId,
        itemId,
        value: sv.value,
        confidence: sv.confidence,
        source: sv.source,
        lastVerified: new Date(),
      });
      valueCount++;
    }
  }

  console.log(`  Inserted ${valueCount} sample values`);

  // --- 5. Seed Freshness records ---
  console.log('Seeding CI freshness records (layer x competitor)...');
  const now = new Date();
  const freshnessRecords: Array<{
    layerId: string;
    competitorId: string;
    lastVerified: Date;
    tier: number;
  }> = [];

  for (const [layerSlug, layerId] of layerMap) {
    const tier = freshnessTierByLayer[layerSlug] ?? 2;

    for (const [, competitorId] of competitorMap) {
      freshnessRecords.push({
        layerId,
        competitorId,
        lastVerified: now,
        tier,
      });
    }
  }

  await db.insert(ciFreshness).values(freshnessRecords);
  console.log(`  Inserted ${freshnessRecords.length} freshness records`);

  console.log('\n=== CI seed completed successfully! ===');
}
