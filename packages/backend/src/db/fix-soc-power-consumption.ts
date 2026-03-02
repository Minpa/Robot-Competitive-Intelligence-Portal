/**
 * One-time fix: Add powerConsumption to existing SoC components that are missing it.
 * Run: npx tsx packages/backend/src/db/fix-soc-power-consumption.ts
 */
import { db, components } from './index.js';
import { eq } from 'drizzle-orm';

const SOC_POWER_DATA: Record<string, { powerConsumption: number; topsPerWatt: number; releaseYear: number }> = {
  'NVIDIA Jetson AGX Orin': { powerConsumption: 60, topsPerWatt: 4.58, releaseYear: 2022 },
  'NVIDIA Jetson Orin NX': { powerConsumption: 25, topsPerWatt: 4, releaseYear: 2022 },
  'Jetson Orin Nano': { powerConsumption: 15, topsPerWatt: 2.67, releaseYear: 2023 },
  'Jetson Orin NX': { powerConsumption: 25, topsPerWatt: 4, releaseYear: 2022 },
  'Jetson AGX Orin': { powerConsumption: 60, topsPerWatt: 4.58, releaseYear: 2022 },
  'Jetson Thor': { powerConsumption: 100, topsPerWatt: 8, releaseYear: 2025 },
  'Tesla FSD Chip': { powerConsumption: 36, topsPerWatt: 4, releaseYear: 2019 },
  'Qualcomm Snapdragon 8 Gen 2': { powerConsumption: 10, topsPerWatt: 2.6, releaseYear: 2022 },
  'Qualcomm RB5': { powerConsumption: 10, topsPerWatt: 1.5, releaseYear: 2020 },
  'Qualcomm RB6': { powerConsumption: 20, topsPerWatt: 6.5, releaseYear: 2024 },
  'Hailo-8': { powerConsumption: 5, topsPerWatt: 5.2, releaseYear: 2021 },
  'Hailo-10': { powerConsumption: 6, topsPerWatt: 6.67, releaseYear: 2024 },
  'RK3588': { powerConsumption: 8, topsPerWatt: 0.75, releaseYear: 2022 },
  'Kneron KL730': { powerConsumption: 3, topsPerWatt: 3.33, releaseYear: 2023 },
};

async function fixSocPowerConsumption() {
  console.log('Fixing SoC powerConsumption data...');

  const socs = await db.select().from(components).where(eq(components.type, 'soc'));

  let updated = 0;
  for (const soc of socs) {
    const fix = SOC_POWER_DATA[soc.name];
    if (!fix) {
      console.log(`No fix data for: ${soc.name}`);
      continue;
    }

    const specs = (soc.specifications || {}) as Record<string, any>;
    if (specs.powerConsumption) {
      console.log(`Already has powerConsumption: ${soc.name} (${specs.powerConsumption}W)`);
      continue;
    }

    const newSpecs = { ...specs, ...fix };
    await db.update(components)
      .set({ specifications: newSpecs, updatedAt: new Date() })
      .where(eq(components.id, soc.id));
    console.log(`Fixed: ${soc.name} → ${fix.powerConsumption}W`);
    updated++;
  }

  console.log(`\n✅ Done. Updated ${updated} SoC components.`);
  process.exit(0);
}

fixSocPowerConsumption().catch((err) => {
  console.error('Fix failed:', err);
  process.exit(1);
});
