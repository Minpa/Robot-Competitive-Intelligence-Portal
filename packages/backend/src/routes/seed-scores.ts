/**
 * One-time seed route to populate real-world specs and recalculate PoC/RFM scores.
 * POST /api/seed-scores/recalculate — updates body_specs, hand_specs, computing_specs,
 * then runs the scoring pipeline for each robot.
 */

import type { FastifyInstance } from 'fastify';
import {
  db,
  humanoidRobots,
  companies,
  bodySpecs,
  handSpecs,
  computingSpecs,
  pocScores,
  rfmScores,
} from '../db/index.js';
import { eq } from 'drizzle-orm';
import { calculatePocScores, type RobotWithSpecs } from '../services/scoring/poc-calculator.js';
import { calculateRfmScores } from '../services/scoring/rfm-calculator.js';

// Real-world spec data gathered from manufacturer publications and industry sources
interface RobotSpecSeed {
  robotName: string;
  companyPattern: string; // ilike pattern for company name
  body: {
    heightCm: number | null;
    weightKg: number | null;
    payloadKg: number | null;
    dofCount: number | null;
    maxSpeedMps: number | null;
    operationTimeHours: number | null;
  };
  hand: {
    handType: string | null;
    fingerCount: number | null;
    handDof: number | null;
    gripForceN: number | null;
  };
  computing: {
    mainSoc: string | null;
    topsMax: number | null;
  };
  locomotionType: string;
  commercializationStage: string;
  estimatedPriceUsd: number | null;
  // Manual RFM overrides for factors that can't be auto-calculated
  rfmOverrides?: {
    generalityScore?: number;
    realWorldDataScore?: number;
    multiRobotCollabScore?: number;
    openSourceScore?: number;
  };
}

const ROBOT_SPECS: RobotSpecSeed[] = [
  {
    robotName: 'Figure 01',
    companyPattern: '%Figure%',
    body: { heightCm: 168, weightKg: 60, payloadKg: 20, dofCount: 41, maxSpeedMps: 1.2, operationTimeHours: 5 },
    hand: { handType: 'dexterous', fingerCount: 5, handDof: 12, gripForceN: null },
    computing: { mainSoc: 'Custom AI', topsMax: 200 },
    locomotionType: 'bipedal',
    commercializationStage: 'poc',
    estimatedPriceUsd: 100000,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 3, multiRobotCollabScore: 1, openSourceScore: 1 },
  },
  {
    robotName: 'Figure 02',
    companyPattern: '%Figure%',
    body: { heightCm: 168, weightKg: 60, payloadKg: 20, dofCount: 41, maxSpeedMps: 1.2, operationTimeHours: 5 },
    hand: { handType: 'dexterous', fingerCount: 5, handDof: 16, gripForceN: null },
    computing: { mainSoc: 'NVIDIA Jetson AGX Orin', topsMax: 275 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 100000,
    rfmOverrides: { generalityScore: 4, realWorldDataScore: 4, multiRobotCollabScore: 2, openSourceScore: 1 },
  },
  {
    robotName: 'Figure 03',
    companyPattern: '%Figure%',
    body: { heightCm: 168, weightKg: 55, payloadKg: 20, dofCount: 35, maxSpeedMps: 1.5, operationTimeHours: 5 },
    hand: { handType: 'Helix dexterous', fingerCount: 5, handDof: 18, gripForceN: null },
    computing: { mainSoc: 'Custom Helix', topsMax: 300 },
    locomotionType: 'bipedal',
    commercializationStage: 'prototype',
    estimatedPriceUsd: 50000,
    rfmOverrides: { generalityScore: 4, realWorldDataScore: 3, multiRobotCollabScore: 2, openSourceScore: 1 },
  },
  {
    robotName: 'Optimus Gen 2',
    companyPattern: '%Tesla%',
    body: { heightCm: 173, weightKg: 57, payloadKg: 20, dofCount: 28, maxSpeedMps: 2.2, operationTimeHours: 6 },
    hand: { handType: 'tendon-driven', fingerCount: 5, handDof: 22, gripForceN: null },
    computing: { mainSoc: 'Tesla AI4 SoC', topsMax: 150 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 30000,
    rfmOverrides: { generalityScore: 4, realWorldDataScore: 4, multiRobotCollabScore: 3, openSourceScore: 1 },
  },
  {
    robotName: 'Optimus Gen 3',
    companyPattern: '%Tesla%',
    body: { heightCm: 173, weightKg: 55, payloadKg: 20, dofCount: 72, maxSpeedMps: 2.5, operationTimeHours: 7 },
    hand: { handType: 'tendon-driven', fingerCount: 5, handDof: 22, gripForceN: null },
    computing: { mainSoc: 'Tesla AI4 SoC', topsMax: 150 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 30000,
    rfmOverrides: { generalityScore: 5, realWorldDataScore: 5, multiRobotCollabScore: 4, openSourceScore: 1 },
  },
  {
    robotName: 'Digit',
    companyPattern: '%Agility%',
    body: { heightCm: 175, weightKg: 65, payloadKg: 16, dofCount: 16, maxSpeedMps: 1.5, operationTimeHours: 8 },
    hand: { handType: 'gripper', fingerCount: 2, handDof: 1, gripForceN: 50 },
    computing: { mainSoc: 'Embedded AI', topsMax: 50 },
    locomotionType: 'bipedal',
    commercializationStage: 'commercial',
    estimatedPriceUsd: 250000,
    rfmOverrides: { generalityScore: 2, realWorldDataScore: 5, multiRobotCollabScore: 3, openSourceScore: 2 },
  },
  {
    robotName: 'G1',
    companyPattern: '%Unitree%',
    body: { heightCm: 132, weightKg: 35, payloadKg: 3, dofCount: 43, maxSpeedMps: 2.0, operationTimeHours: 2 },
    hand: { handType: 'Dex3-1', fingerCount: 3, handDof: 7, gripForceN: 20 },
    computing: { mainSoc: 'NVIDIA Jetson Orin', topsMax: 100 },
    locomotionType: 'bipedal',
    commercializationStage: 'commercial',
    estimatedPriceUsd: 16000,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 3, multiRobotCollabScore: 2, openSourceScore: 4 },
  },
  {
    robotName: 'H1',
    companyPattern: '%Unitree%',
    body: { heightCm: 180, weightKg: 47, payloadKg: 10, dofCount: 19, maxSpeedMps: 3.3, operationTimeHours: 2 },
    hand: { handType: 'gripper', fingerCount: 0, handDof: 0, gripForceN: null },
    computing: { mainSoc: 'NVIDIA Jetson Orin', topsMax: 100 },
    locomotionType: 'bipedal',
    commercializationStage: 'commercial',
    estimatedPriceUsd: 90000,
    rfmOverrides: { generalityScore: 2, realWorldDataScore: 3, multiRobotCollabScore: 2, openSourceScore: 4 },
  },
  {
    robotName: 'GR-1',
    companyPattern: '%Fourier%',
    body: { heightCm: 165, weightKg: 55, payloadKg: 5, dofCount: 44, maxSpeedMps: 1.5, operationTimeHours: 2 },
    hand: { handType: 'dexterous', fingerCount: 5, handDof: 12, gripForceN: null },
    computing: { mainSoc: 'Embedded AI', topsMax: 50 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 150000,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 2, multiRobotCollabScore: 1, openSourceScore: 3 },
  },
  {
    robotName: 'Fourier GR-2',
    companyPattern: '%Fourier%',
    body: { heightCm: 175, weightKg: 63, payloadKg: 3, dofCount: 53, maxSpeedMps: 1.5, operationTimeHours: 2 },
    hand: { handType: 'dexterous tactile', fingerCount: 5, handDof: 12, gripForceN: null },
    computing: { mainSoc: 'Embedded AI', topsMax: 80 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 150000,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 2, multiRobotCollabScore: 1, openSourceScore: 3 },
  },
  {
    robotName: 'Fourier N1',
    companyPattern: '%Fourier%',
    body: { heightCm: 130, weightKg: 25, payloadKg: 2, dofCount: 23, maxSpeedMps: 1.0, operationTimeHours: 2 },
    hand: { handType: 'basic', fingerCount: 0, handDof: 0, gripForceN: null },
    computing: { mainSoc: 'Embedded', topsMax: 30 },
    locomotionType: 'bipedal',
    commercializationStage: 'prototype',
    estimatedPriceUsd: 20000,
    rfmOverrides: { generalityScore: 2, realWorldDataScore: 1, multiRobotCollabScore: 1, openSourceScore: 5 },
  },
  {
    robotName: 'Apollo',
    companyPattern: '%Apptronik%',
    body: { heightCm: 173, weightKg: 73, payloadKg: 25, dofCount: 71, maxSpeedMps: 1.4, operationTimeHours: 4 },
    hand: { handType: 'gripper (dexterous planned)', fingerCount: 0, handDof: 1, gripForceN: null },
    computing: { mainSoc: 'NVIDIA Jetson AGX Orin + Orin NX', topsMax: 375 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 65000,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 4, multiRobotCollabScore: 2, openSourceScore: 2 },
  },
  {
    robotName: 'Agibot A2',
    companyPattern: '%Agibot%',
    body: { heightCm: 172, weightKg: 65, payloadKg: 15, dofCount: 44, maxSpeedMps: 1.2, operationTimeHours: 2 },
    hand: { handType: 'dexterous', fingerCount: 5, handDof: 12, gripForceN: null },
    computing: { mainSoc: 'Custom AI', topsMax: 200 },
    locomotionType: 'bipedal',
    commercializationStage: 'commercial',
    estimatedPriceUsd: 150000,
    rfmOverrides: { generalityScore: 4, realWorldDataScore: 4, multiRobotCollabScore: 3, openSourceScore: 2 },
  },
  {
    robotName: 'Atlas',
    companyPattern: '%Boston%',
    body: { heightCm: 150, weightKg: 89, payloadKg: 12, dofCount: 28, maxSpeedMps: 1.5, operationTimeHours: 1.5 },
    hand: { handType: 'gripper', fingerCount: 3, handDof: 3, gripForceN: 100 },
    computing: { mainSoc: 'Custom', topsMax: 200 },
    locomotionType: 'bipedal',
    commercializationStage: 'prototype',
    estimatedPriceUsd: 500000,
    rfmOverrides: { generalityScore: 4, realWorldDataScore: 5, multiRobotCollabScore: 2, openSourceScore: 1 },
  },
  {
    robotName: 'NEO',
    companyPattern: '%1X%',
    body: { heightCm: 168, weightKg: 30, payloadKg: 25, dofCount: 75, maxSpeedMps: 6.2, operationTimeHours: 4 },
    hand: { handType: 'tendon-driven dexterous', fingerCount: 5, handDof: 22, gripForceN: null },
    computing: { mainSoc: 'Embedded AI', topsMax: 50 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 20000,
    rfmOverrides: { generalityScore: 4, realWorldDataScore: 3, multiRobotCollabScore: 2, openSourceScore: 2 },
  },
  {
    robotName: 'Phoenix',
    companyPattern: '%Sanctuary%',
    body: { heightCm: 170, weightKg: 70, payloadKg: 10, dofCount: 30, maxSpeedMps: 1.0, operationTimeHours: 3 },
    hand: { handType: 'dexterous', fingerCount: 5, handDof: 20, gripForceN: null },
    computing: { mainSoc: 'Carbon AI', topsMax: 100 },
    locomotionType: 'bipedal',
    commercializationStage: 'poc',
    estimatedPriceUsd: 100000,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 3, multiRobotCollabScore: 1, openSourceScore: 1 },
  },
  {
    robotName: 'HUBO',
    companyPattern: '%Rainbow%',
    body: { heightCm: 147, weightKg: 80, payloadKg: 2, dofCount: 41, maxSpeedMps: 0.7, operationTimeHours: 2 },
    hand: { handType: 'multi-finger', fingerCount: 4, handDof: 7, gripForceN: null },
    computing: { mainSoc: 'Research computing', topsMax: 20 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 400000,
    rfmOverrides: { generalityScore: 2, realWorldDataScore: 3, multiRobotCollabScore: 1, openSourceScore: 2 },
  },
  {
    robotName: 'TALOS',
    companyPattern: '%PAL%',
    body: { heightCm: 175, weightKg: 95, payloadKg: 6, dofCount: 32, maxSpeedMps: 1.1, operationTimeHours: 3 },
    hand: { handType: 'configurable', fingerCount: 5, handDof: 1, gripForceN: null },
    computing: { mainSoc: 'Intel Core i7', topsMax: 10 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 1000000,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 3, multiRobotCollabScore: 2, openSourceScore: 4 },
  },
  {
    robotName: 'Pepper',
    companyPattern: '%SoftBank%',
    body: { heightCm: 120, weightKg: 28, payloadKg: 0.5, dofCount: 19, maxSpeedMps: 0.9, operationTimeHours: 10 },
    hand: { handType: 'simple', fingerCount: 5, handDof: 1, gripForceN: 5 },
    computing: { mainSoc: 'Intel Atom E3845', topsMax: 2 },
    locomotionType: 'wheeled',
    commercializationStage: 'commercial',
    estimatedPriceUsd: 28000,
    rfmOverrides: { generalityScore: 4, realWorldDataScore: 5, multiRobotCollabScore: 3, openSourceScore: 3 },
  },
  {
    robotName: 'Relay',
    companyPattern: '%Savioke%',
    body: { heightCm: 90, weightKg: 20, payloadKg: 4.5, dofCount: 3, maxSpeedMps: 0.8, operationTimeHours: 10 },
    hand: { handType: 'none', fingerCount: 0, handDof: 0, gripForceN: null },
    computing: { mainSoc: 'Navigation stack', topsMax: 5 },
    locomotionType: 'wheeled',
    commercializationStage: 'commercial',
    estimatedPriceUsd: 40000,
    rfmOverrides: { generalityScore: 1, realWorldDataScore: 5, multiRobotCollabScore: 4, openSourceScore: 2 },
  },
  {
    robotName: 'Honda Avatar Robot',
    companyPattern: '%Honda%',
    body: { heightCm: 150, weightKg: 50, payloadKg: 3, dofCount: 50, maxSpeedMps: 1.0, operationTimeHours: 2 },
    hand: { handType: 'multi-finger', fingerCount: 5, handDof: 15, gripForceN: null },
    computing: { mainSoc: 'Custom', topsMax: 50 },
    locomotionType: 'bipedal',
    commercializationStage: 'concept',
    estimatedPriceUsd: null,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 2, multiRobotCollabScore: 1, openSourceScore: 1 },
  },
  {
    robotName: 'Moxi',
    companyPattern: '%Diligent%',
    body: { heightCm: 140, weightKg: 50, payloadKg: 3, dofCount: 10, maxSpeedMps: 0.7, operationTimeHours: 8 },
    hand: { handType: 'gripper', fingerCount: 2, handDof: 1, gripForceN: 20 },
    computing: { mainSoc: 'Embedded', topsMax: 20 },
    locomotionType: 'wheeled',
    commercializationStage: 'commercial',
    estimatedPriceUsd: 120000,
    rfmOverrides: { generalityScore: 2, realWorldDataScore: 5, multiRobotCollabScore: 3, openSourceScore: 2 },
  },
  {
    robotName: 'Aeo',
    companyPattern: '%Aeolus%',
    body: { heightCm: 135, weightKg: 45, payloadKg: 3, dofCount: 15, maxSpeedMps: 0.8, operationTimeHours: 6 },
    hand: { handType: 'gripper', fingerCount: 2, handDof: 1, gripForceN: 15 },
    computing: { mainSoc: 'Embedded AI', topsMax: 30 },
    locomotionType: 'wheeled',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 60000,
    rfmOverrides: { generalityScore: 2, realWorldDataScore: 3, multiRobotCollabScore: 2, openSourceScore: 1 },
  },
  {
    robotName: 'Walker X',
    companyPattern: '%UBTECH%',
    body: { heightCm: 130, weightKg: 63, payloadKg: 5, dofCount: 41, maxSpeedMps: 1.0, operationTimeHours: 2 },
    hand: { handType: 'dexterous', fingerCount: 5, handDof: 7, gripForceN: null },
    computing: { mainSoc: 'NVIDIA', topsMax: 50 },
    locomotionType: 'bipedal',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 200000,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 3, multiRobotCollabScore: 2, openSourceScore: 2 },
  },
  {
    robotName: 'CyberOne',
    companyPattern: '%Xiaomi%',
    body: { heightCm: 177, weightKg: 52, payloadKg: 1.5, dofCount: 21, maxSpeedMps: 1.0, operationTimeHours: 1 },
    hand: { handType: 'simple', fingerCount: 5, handDof: 1, gripForceN: null },
    computing: { mainSoc: 'Qualcomm + NVIDIA', topsMax: 50 },
    locomotionType: 'bipedal',
    commercializationStage: 'concept',
    estimatedPriceUsd: 100000,
    rfmOverrides: { generalityScore: 2, realWorldDataScore: 1, multiRobotCollabScore: 1, openSourceScore: 1 },
  },
  {
    robotName: 'TIAGo',
    companyPattern: '%PAL%',
    body: { heightCm: 145, weightKg: 70, payloadKg: 3, dofCount: 19, maxSpeedMps: 1.0, operationTimeHours: 8 },
    hand: { handType: 'gripper', fingerCount: 3, handDof: 3, gripForceN: 30 },
    computing: { mainSoc: 'Intel i7', topsMax: 10 },
    locomotionType: 'wheeled',
    commercializationStage: 'commercial',
    estimatedPriceUsd: 90000,
    rfmOverrides: { generalityScore: 4, realWorldDataScore: 4, multiRobotCollabScore: 3, openSourceScore: 5 },
  },
  {
    robotName: 'Toyota HSR',
    companyPattern: '%Toyota%',
    body: { heightCm: 135, weightKg: 37, payloadKg: 1.2, dofCount: 11, maxSpeedMps: 0.8, operationTimeHours: 3 },
    hand: { handType: 'gripper+suction', fingerCount: 2, handDof: 1, gripForceN: 10 },
    computing: { mainSoc: 'Intel Core', topsMax: 10 },
    locomotionType: 'wheeled',
    commercializationStage: 'pilot',
    estimatedPriceUsd: 70000,
    rfmOverrides: { generalityScore: 3, realWorldDataScore: 4, multiRobotCollabScore: 2, openSourceScore: 3 },
  },
];

// Helper to convert number|null to string|null for decimal columns
function toStr(v: number | null): string | null {
  return v !== null ? String(v) : null;
}

export async function seedScoresRoutes(fastify: FastifyInstance) {
  // DELETE /api/seed-scores/robot/:id — remove a duplicate robot and its related data
  fastify.delete<{ Params: { id: string } }>('/robot/:id', async (request) => {
    const { id } = request.params;
    // Delete related scores first (cascade should handle this but be explicit)
    await db.delete(pocScores).where(eq(pocScores.robotId, id));
    await db.delete(rfmScores).where(eq(rfmScores.robotId, id));
    await db.delete(bodySpecs).where(eq(bodySpecs.robotId, id));
    await db.delete(handSpecs).where(eq(handSpecs.robotId, id));
    await db.delete(computingSpecs).where(eq(computingSpecs.robotId, id));
    await db.delete(humanoidRobots).where(eq(humanoidRobots.id, id));
    return { success: true, deletedRobotId: id };
  });

  // POST /api/seed-scores/recalculate
  fastify.post('/recalculate', async () => {
    const results: { robot: string; status: string; pocScores?: any; rfmScores?: any }[] = [];

    for (const spec of ROBOT_SPECS) {
      try {
        // Find robot by name
        const robots = await db
          .select({
            id: humanoidRobots.id,
            name: humanoidRobots.name,
            companyName: companies.name,
          })
          .from(humanoidRobots)
          .innerJoin(companies, eq(humanoidRobots.companyId, companies.id))
          .where(eq(humanoidRobots.name, spec.robotName));

        if (robots.length === 0) {
          results.push({ robot: spec.robotName, status: 'not_found' });
          continue;
        }

        const robot = robots[0]!;

        // Update robot locomotion type and stage
        await db
          .update(humanoidRobots)
          .set({
            locomotionType: spec.locomotionType,
            commercializationStage: spec.commercializationStage,
            updatedAt: new Date(),
          })
          .where(eq(humanoidRobots.id, robot.id));

        // Upsert body_specs (decimal columns require strings)
        const bodyData = {
          heightCm: toStr(spec.body.heightCm),
          weightKg: toStr(spec.body.weightKg),
          payloadKg: toStr(spec.body.payloadKg),
          dofCount: spec.body.dofCount,
          maxSpeedMps: toStr(spec.body.maxSpeedMps),
          operationTimeHours: toStr(spec.body.operationTimeHours),
        };

        const [existingBody] = await db
          .select({ id: bodySpecs.id })
          .from(bodySpecs)
          .where(eq(bodySpecs.robotId, robot.id))
          .limit(1);

        if (existingBody) {
          await db.update(bodySpecs).set({ ...bodyData, updatedAt: new Date() }).where(eq(bodySpecs.robotId, robot.id));
        } else {
          await db.insert(bodySpecs).values({ robotId: robot.id, ...bodyData });
        }

        // Upsert hand_specs
        const handData = {
          handType: spec.hand.handType,
          fingerCount: spec.hand.fingerCount,
          handDof: spec.hand.handDof,
          gripForceN: toStr(spec.hand.gripForceN),
        };

        const [existingHand] = await db
          .select({ id: handSpecs.id })
          .from(handSpecs)
          .where(eq(handSpecs.robotId, robot.id))
          .limit(1);

        if (existingHand) {
          await db.update(handSpecs).set({ ...handData, updatedAt: new Date() }).where(eq(handSpecs.robotId, robot.id));
        } else {
          await db.insert(handSpecs).values({ robotId: robot.id, ...handData });
        }

        // Upsert computing_specs
        const [existingComputing] = await db
          .select({ id: computingSpecs.id })
          .from(computingSpecs)
          .where(eq(computingSpecs.robotId, robot.id))
          .limit(1);

        const computeData = {
          mainSoc: spec.computing.mainSoc,
          topsMax: toStr(spec.computing.topsMax),
        };

        if (existingComputing) {
          await db.update(computingSpecs).set({ ...computeData, updatedAt: new Date() }).where(eq(computingSpecs.robotId, robot.id));
        } else {
          await db.insert(computingSpecs).values({ robotId: robot.id, ...computeData });
        }

        // Calculate PoC scores using real calculator
        const robotWithSpecs: RobotWithSpecs = {
          robot: {
            id: robot.id,
            name: robot.name,
            locomotionType: spec.locomotionType,
            commercializationStage: spec.commercializationStage,
            region: null,
          },
          company: { name: robot.companyName },
          bodySpec: {
            heightCm: spec.body.heightCm,
            weightKg: spec.body.weightKg,
            payloadKg: spec.body.payloadKg,
            dofCount: spec.body.dofCount,
            maxSpeedMps: spec.body.maxSpeedMps,
            operationTimeHours: spec.body.operationTimeHours,
          },
          handSpec: {
            handDof: spec.hand.handDof,
            fingerCount: spec.hand.fingerCount,
            gripForceN: spec.hand.gripForceN,
          },
          computingSpec: {
            mainSoc: spec.computing.mainSoc,
            topsMin: null,
            topsMax: spec.computing.topsMax,
            architectureType: null,
          },
          applicationCases: [],
          articleCount: 0,
          articleKeywords: [],
          estimatedPriceUsd: spec.estimatedPriceUsd,
        };

        const pocResult = calculatePocScores(robotWithSpecs);
        const rfmResult = calculateRfmScores(robotWithSpecs);

        // Apply RFM manual overrides (article-dependent factors)
        if (spec.rfmOverrides) {
          if (spec.rfmOverrides.generalityScore !== undefined)
            rfmResult.generalityScore = spec.rfmOverrides.generalityScore;
          if (spec.rfmOverrides.realWorldDataScore !== undefined)
            rfmResult.realWorldDataScore = spec.rfmOverrides.realWorldDataScore;
          if (spec.rfmOverrides.multiRobotCollabScore !== undefined)
            rfmResult.multiRobotCollabScore = spec.rfmOverrides.multiRobotCollabScore;
          if (spec.rfmOverrides.openSourceScore !== undefined)
            rfmResult.openSourceScore = spec.rfmOverrides.openSourceScore;
        }

        // Upsert poc_scores
        const pocData = {
          payloadScore: pocResult.payloadScore,
          operationTimeScore: pocResult.operationTimeScore,
          fingerDofScore: pocResult.fingerDofScore,
          formFactorScore: pocResult.formFactorScore,
          pocDeploymentScore: pocResult.pocDeploymentScore,
          costEfficiencyScore: pocResult.costEfficiencyScore,
          metadata: pocResult.metadata,
        };

        const [existingPoc] = await db
          .select({ id: pocScores.id })
          .from(pocScores)
          .where(eq(pocScores.robotId, robot.id))
          .limit(1);

        if (existingPoc) {
          await db.update(pocScores).set({ ...pocData, updatedAt: new Date() }).where(eq(pocScores.id, existingPoc.id));
        } else {
          await db.insert(pocScores).values({ robotId: robot.id, ...pocData });
        }

        // Upsert rfm_scores
        const rfmData = {
          rfmModelName: rfmResult.rfmModelName,
          generalityScore: rfmResult.generalityScore,
          realWorldDataScore: rfmResult.realWorldDataScore,
          edgeInferenceScore: rfmResult.edgeInferenceScore,
          multiRobotCollabScore: rfmResult.multiRobotCollabScore,
          openSourceScore: rfmResult.openSourceScore,
          commercialMaturityScore: rfmResult.commercialMaturityScore,
          metadata: rfmResult.metadata,
        };

        const [existingRfm] = await db
          .select({ id: rfmScores.id })
          .from(rfmScores)
          .where(eq(rfmScores.robotId, robot.id))
          .limit(1);

        if (existingRfm) {
          await db.update(rfmScores).set({ ...rfmData, updatedAt: new Date() }).where(eq(rfmScores.id, existingRfm.id));
        } else {
          await db.insert(rfmScores).values({ robotId: robot.id, ...rfmData });
        }

        results.push({
          robot: spec.robotName,
          status: 'updated',
          pocScores: {
            payload: pocResult.payloadScore,
            opTime: pocResult.operationTimeScore,
            fingerDof: pocResult.fingerDofScore,
            formFactor: pocResult.formFactorScore,
            deployment: pocResult.pocDeploymentScore,
            costEff: pocResult.costEfficiencyScore,
          },
          rfmScores: {
            generality: rfmResult.generalityScore,
            realWorld: rfmResult.realWorldDataScore,
            edge: rfmResult.edgeInferenceScore,
            multiRobot: rfmResult.multiRobotCollabScore,
            openSource: rfmResult.openSourceScore,
            commercial: rfmResult.commercialMaturityScore,
          },
        });
      } catch (error) {
        results.push({ robot: spec.robotName, status: `error: ${(error as Error).message}` });
      }
    }

    return { totalProcessed: results.length, results };
  });
}
