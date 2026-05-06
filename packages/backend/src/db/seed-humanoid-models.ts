import { db, humanoidModels } from './index.js';
import { sql } from 'drizzle-orm';

// Task 2 시드 — 5개 빈 슬롯 (CLOiD W / B / 4족 / 잠재 1·2)
// 입력 폼에서 채울 수 있도록 핵심 필드만 미리 생성.
const seeds = [
  { modelName: 'CLOiD W',     formFactor: 'Wheel',      isPotential: false, releasePhase: '미정' },
  { modelName: 'CLOiD B',     formFactor: 'Biped',      isPotential: false, releasePhase: '미정' },
  { modelName: 'CLOiD 4족',   formFactor: 'Quadruped',  isPotential: false, releasePhase: '미정' },
  { modelName: '잠재 모델 1', formFactor: 'Other',      isPotential: true,  releasePhase: '조사 중' },
  { modelName: '잠재 모델 2', formFactor: 'Other',      isPotential: true,  releasePhase: '조사 중' },
] as const;

async function seedHumanoidModels() {
  console.log('Seeding humanoid_models (5 placeholder rows)…');
  for (const s of seeds) {
    await db
      .insert(humanoidModels)
      .values({
        modelName: s.modelName,
        formFactor: s.formFactor,
        isPotential: s.isPotential,
        releasePhase: s.releasePhase,
      })
      .onConflictDoNothing({ target: humanoidModels.modelName });
    console.log(`  ✓ ${s.modelName} (${s.formFactor})`);
  }
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(humanoidModels);
  const total = result[0]?.count ?? 0;
  console.log(`\nhumanoid_models total: ${total} rows`);
  process.exit(0);
}

seedHumanoidModels().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
