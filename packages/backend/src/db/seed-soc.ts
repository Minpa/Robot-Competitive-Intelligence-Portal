import { db, components } from './index.js';
import { eq } from 'drizzle-orm';

async function seedSoC() {
  console.log('Seeding SoC and Actuator data to components table...');

  const socData = [
    {
      type: 'soc',
      name: 'Jetson Orin Nano',
      vendor: 'NVIDIA',
      specifications: {
        processNode: '8nm',
        topsMin: 20,
        topsMax: 40,
        location: 'onboard',
        powerConsumption: 15,
        topsPerWatt: 2.67,
        releaseYear: 2023,
      },
    },
    {
      type: 'soc',
      name: 'Jetson Orin NX',
      vendor: 'NVIDIA',
      specifications: {
        processNode: '8nm',
        topsMin: 70,
        topsMax: 100,
        location: 'onboard',
        powerConsumption: 25,
        topsPerWatt: 4,
        releaseYear: 2022,
      },
    },
    {
      type: 'soc',
      name: 'Jetson AGX Orin',
      vendor: 'NVIDIA',
      specifications: {
        processNode: '8nm',
        topsMin: 200,
        topsMax: 275,
        location: 'onboard',
        powerConsumption: 60,
        topsPerWatt: 4.58,
        releaseYear: 2022,
      },
    },
    {
      type: 'soc',
      name: 'Jetson Thor',
      vendor: 'NVIDIA',
      specifications: {
        processNode: '4nm',
        topsMin: 800,
        topsMax: 800,
        location: 'onboard',
        powerConsumption: 100,
        topsPerWatt: 8,
        releaseYear: 2025,
      },
    },
    {
      type: 'soc',
      name: 'Qualcomm RB5',
      vendor: 'Qualcomm',
      specifications: {
        processNode: '7nm',
        topsMin: 15,
        topsMax: 15,
        location: 'onboard',
        powerConsumption: 10,
        topsPerWatt: 1.5,
        releaseYear: 2020,
      },
    },
    {
      type: 'soc',
      name: 'Qualcomm RB6',
      vendor: 'Qualcomm',
      specifications: {
        processNode: '4nm',
        topsMin: 100,
        topsMax: 130,
        location: 'onboard',
        powerConsumption: 20,
        topsPerWatt: 6.5,
        releaseYear: 2024,
      },
    },
    {
      type: 'soc',
      name: 'Hailo-8',
      vendor: 'Hailo',
      specifications: {
        processNode: '16nm',
        topsMin: 26,
        topsMax: 26,
        location: 'edge',
        powerConsumption: 5,
        topsPerWatt: 5.2,
        releaseYear: 2021,
      },
    },
    {
      type: 'soc',
      name: 'Hailo-10',
      vendor: 'Hailo',
      specifications: {
        processNode: '7nm',
        topsMin: 40,
        topsMax: 40,
        location: 'edge',
        powerConsumption: 6,
        topsPerWatt: 6.67,
        releaseYear: 2024,
      },
    },
    {
      type: 'soc',
      name: 'RK3588',
      vendor: 'Rockchip',
      specifications: {
        processNode: '8nm',
        topsMin: 6,
        topsMax: 6,
        location: 'onboard',
        powerConsumption: 8,
        topsPerWatt: 0.75,
        releaseYear: 2022,
      },
    },
    {
      type: 'soc',
      name: 'Kneron KL730',
      vendor: 'Kneron',
      specifications: {
        processNode: '12nm',
        topsMin: 10,
        topsMax: 10,
        location: 'edge',
        powerConsumption: 3,
        topsPerWatt: 3.33,
        releaseYear: 2023,
      },
    },
  ];

  const actuatorData = [
    {
      type: 'actuator',
      name: 'Fourier FSA Actuator',
      vendor: 'Fourier Intelligence',
      specifications: {
        actuatorType: 'direct_drive',
        ratedTorqueNm: 40,
        maxTorqueNm: 80,
        speedRpm: 300,
        weightKg: 1.2,
        torqueDensity: 66.7,
        integrationLevel: 'fully_integrated',
        releaseYear: 2024,
      },
    },
    {
      type: 'actuator',
      name: 'Tesla Rotary Actuator',
      vendor: 'Tesla',
      specifications: {
        actuatorType: 'direct_drive',
        ratedTorqueNm: 50,
        maxTorqueNm: 100,
        speedRpm: 250,
        weightKg: 1.5,
        torqueDensity: 66.7,
        integrationLevel: 'fully_integrated',
        releaseYear: 2023,
      },
    },
    {
      type: 'actuator',
      name: 'Unitree A1 Motor',
      vendor: 'Unitree',
      specifications: {
        actuatorType: 'direct_drive',
        ratedTorqueNm: 33,
        maxTorqueNm: 66,
        speedRpm: 400,
        weightKg: 0.9,
        torqueDensity: 73.3,
        integrationLevel: 'motor_gear_driver',
        releaseYear: 2022,
      },
    },
    {
      type: 'actuator',
      name: 'Gyems RMD-X8 Pro',
      vendor: 'Gyems',
      specifications: {
        actuatorType: 'harmonic',
        ratedTorqueNm: 25,
        maxTorqueNm: 50,
        speedRpm: 350,
        weightKg: 0.8,
        torqueDensity: 62.5,
        integrationLevel: 'motor_gear_driver',
        releaseYear: 2023,
      },
    },
    {
      type: 'actuator',
      name: 'T-Motor AK80-64',
      vendor: 'T-Motor',
      specifications: {
        actuatorType: 'direct_drive',
        ratedTorqueNm: 18,
        maxTorqueNm: 36,
        speedRpm: 500,
        weightKg: 0.5,
        torqueDensity: 72,
        integrationLevel: 'motor_gear',
        releaseYear: 2023,
      },
    },
    {
      type: 'actuator',
      name: 'Harmonic Drive CSD-2A',
      vendor: 'Harmonic Drive',
      specifications: {
        actuatorType: 'harmonic',
        ratedTorqueNm: 30,
        maxTorqueNm: 60,
        speedRpm: 200,
        weightKg: 1.0,
        torqueDensity: 60,
        integrationLevel: 'motor_gear',
        releaseYear: 2023,
      },
    },
  ];

  // Insert SoC data
  for (const soc of socData) {
    const existing = await db.select().from(components)
      .where(eq(components.name, soc.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`SoC already exists: ${soc.name}`);
      continue;
    }

    await db.insert(components).values(soc);
    console.log(`Added SoC: ${soc.name}`);
  }

  // Insert Actuator data
  for (const actuator of actuatorData) {
    const existing = await db.select().from(components)
      .where(eq(components.name, actuator.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`Actuator already exists: ${actuator.name}`);
      continue;
    }

    await db.insert(components).values(actuator);
    console.log(`Added Actuator: ${actuator.name}`);
  }

  console.log('SoC and Actuator seed completed!');
  process.exit(0);
}

seedSoC().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
