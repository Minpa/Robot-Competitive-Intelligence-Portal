/**
 * ensure-vision-cost.ts
 * 서버 시작 시 vision sensor 테이블 생성 및 초기 데이터 시딩
 */

import { sql } from 'drizzle-orm';
import { db, visionSensorBomParts, visionSensorRobotCosts } from './index.js';

async function ensureTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "vision_sensor_bom_parts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "part_name" varchar(255) NOT NULL,
      "part_type" varchar(50) NOT NULL,
      "unit_price_min" integer NOT NULL,
      "unit_price_max" integer NOT NULL,
      "unit_price_mid" integer NOT NULL,
      "price_unit" varchar(30) NOT NULL DEFAULT 'ea',
      "source_basis" varchar(500),
      "source_reliability" varchar(10) NOT NULL DEFAULT 'D',
      "example_robot" varchar(255),
      "notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "vision_sensor_robot_costs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "robot_id" uuid REFERENCES "humanoid_robots"("id") ON DELETE SET NULL,
      "robot_label" varchar(255) NOT NULL,
      "company_name" varchar(100) NOT NULL,
      "release_year" integer NOT NULL,
      "is_forecast" boolean NOT NULL DEFAULT false,
      "camera_desc" varchar(300),
      "camera_cost_usd" integer NOT NULL DEFAULT 0,
      "lidar_depth_desc" varchar(300),
      "lidar_depth_cost_usd" integer NOT NULL DEFAULT 0,
      "compute_desc" varchar(300),
      "compute_cost_usd" integer NOT NULL DEFAULT 0,
      "total_cost_usd" integer NOT NULL,
      "performance_level" numeric(3,1) NOT NULL,
      "performance_note" varchar(300),
      "reliability_grade" varchar(10) NOT NULL DEFAULT 'D',
      "metadata" jsonb,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "vision_robot_costs_company_idx" ON "vision_sensor_robot_costs" ("company_name")
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "vision_robot_costs_year_idx" ON "vision_sensor_robot_costs" ("release_year")
  `);
}

async function seedIfEmpty() {
  const bomRes = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM vision_sensor_bom_parts`);
  const costRes = await db.execute(sql`SELECT COUNT(*)::int AS cnt FROM vision_sensor_robot_costs`);
  const bomCount = (bomRes.rows[0] as any).cnt;
  const costCount = (costRes.rows[0] as any).cnt;

  if (Number(bomCount) > 0 && Number(costCount) > 0) return;

  console.log('비전 센서 원가 초기 데이터 시딩...');

  if (Number(bomCount) === 0) {
    await db.insert(visionSensorBomParts).values([
      { partName: '차량용 RGB 카메라 (1.2MP)', partType: 'camera', unitPriceMin: 15, unitPriceMax: 25, unitPriceMid: 20, priceUnit: 'ea', sourceBasis: 'Tesla HW3 Autopilot 카메라 대량생산 단가', sourceReliability: 'B', exampleRobot: 'Optimus Gen1/Gen2', notes: '대량 양산 기준 제조원가. 소프트웨어 라이선스 제외.' },
      { partName: '차량용 RGB 카메라 (5MP)', partType: 'camera', unitPriceMin: 30, unitPriceMax: 50, unitPriceMid: 40, priceUnit: 'ea', sourceBasis: 'Tesla HW4 업그레이드 카메라', sourceReliability: 'D', exampleRobot: 'Optimus Gen3' },
      { partName: '산업용 스테레오 카메라 쌍', partType: 'camera', unitPriceMin: 150, unitPriceMax: 400, unitPriceMid: 275, priceUnit: 'pair', sourceBasis: 'Atlas 링라이트 헤드 내장 스테레오', sourceReliability: 'D', exampleRobot: 'Electric Atlas / Production Atlas', notes: 'RealSense/ZED 참고 [D]' },
      { partName: '팜 카메라 (소형 모듈)', partType: 'camera', unitPriceMin: 15, unitPriceMax: 30, unitPriceMid: 22, priceUnit: 'ea', sourceBasis: 'Figure 03 양손 내장 카메라', sourceReliability: 'D', exampleRobot: 'Figure 03', notes: '소형 모듈 참고 [D]' },
      { partName: '소형 Solid-State LiDAR', partType: 'lidar', unitPriceMin: 200, unitPriceMax: 500, unitPriceMid: 350, priceUnit: 'ea', sourceBasis: 'Atlas 근거리 LiDAR (로봇용)', sourceReliability: 'D', exampleRobot: 'Electric Atlas / Production Atlas', notes: 'Ouster/Livox 가격 참고 [D]' },
      { partName: 'ToF Depth 센서 모듈', partType: 'depth', unitPriceMin: 50, unitPriceMax: 200, unitPriceMid: 125, priceUnit: 'ea', sourceBasis: 'LG Innotek 3D 모듈 등', sourceReliability: 'D', exampleRobot: 'Production Atlas', notes: '업계 추정 [D]' },
      { partName: 'FSD 컴퓨터 HW3', partType: 'compute', unitPriceMin: 240, unitPriceMax: 260, unitPriceMid: 250, priceUnit: 'ea', sourceBasis: 'Tesla 자체 제조, Samsung 14nm 공정', sourceReliability: 'B', exampleRobot: 'Optimus Gen1 / Gen2', notes: 'TechInsights 분해 [B]' },
      { partName: 'FSD 컴퓨터 HW4', partType: 'compute', unitPriceMin: 320, unitPriceMax: 340, unitPriceMid: 330, priceUnit: 'ea', sourceBasis: '제조원가 32% 증가 (TechInsights)', sourceReliability: 'A', exampleRobot: 'Optimus Gen3', notes: 'TechInsights [A]' },
      { partName: 'Nvidia Jetson AGX Orin', partType: 'compute', unitPriceMin: 500, unitPriceMax: 1000, unitPriceMid: 700, priceUnit: 'ea', sourceBasis: 'Figure AI 등 Nvidia 플랫폼 활용', sourceReliability: 'A', exampleRobot: 'Figure 02', notes: 'Nvidia 공식가 [A]' },
      { partName: 'BD 커스텀 컴퓨터 (3-PC 구성)', partType: 'compute', unitPriceMin: 600, unitPriceMax: 1200, unitPriceMid: 900, priceUnit: 'set', sourceBasis: 'Atlas 온보드 3대 컴퓨터 (추정)', sourceReliability: 'E', exampleRobot: 'Electric Atlas', notes: '미공개, 추정 [E]' },
      { partName: 'BD 커스텀 컴퓨터 (3-PC, 양산)', partType: 'compute', unitPriceMin: 600, unitPriceMax: 800, unitPriceMid: 700, priceUnit: 'set', sourceBasis: 'Production Atlas 양산 원가 절감 추정', sourceReliability: 'E', exampleRobot: 'Production Atlas', notes: '미공개, 추정 [E]' },
      { partName: 'Nvidia 차세대 SoC (Figure 03용)', partType: 'compute', unitPriceMin: 750, unitPriceMax: 850, unitPriceMid: 800, priceUnit: 'ea', sourceBasis: 'Figure 03 차세대 Nvidia 플랫폼 추정', sourceReliability: 'D', exampleRobot: 'Figure 03', notes: '업계 추정 [D]' },
    ]);
  }

  if (Number(costCount) === 0) {
    await db.insert(visionSensorRobotCosts).values([
      // Tesla / Optimus
      { robotLabel: 'Optimus Gen1', companyName: 'Tesla', releaseYear: 2022, isForecast: false, cameraDesc: '~6×1.2MP ($15×6=$90)', cameraCostUsd: 90, lidarDepthDesc: '없음', lidarDepthCostUsd: 0, computeDesc: 'HW3 (~$250)', computeCostUsd: 250, totalCostUsd: 340, performanceLevel: '1.0', performanceNote: 'P1: 기본 인식 | 6×1.2MP+HW3', reliabilityGrade: 'D' },
      { robotLabel: 'Optimus Gen2', companyName: 'Tesla', releaseYear: 2023, isForecast: false, cameraDesc: '8×1.2MP ($20×8=$160)', cameraCostUsd: 160, lidarDepthDesc: '없음', lidarDepthCostUsd: 0, computeDesc: 'HW3 (~$250)', computeCostUsd: 250, totalCostUsd: 410, performanceLevel: '2.0', performanceNote: 'P2: 환경 이해 | 8×1.2MP+HW3', reliabilityGrade: 'D' },
      { robotLabel: 'Optimus Gen2.5', companyName: 'Tesla', releaseYear: 2025, isForecast: false, cameraDesc: '8×cam+E2E (~$120)', cameraCostUsd: 120, lidarDepthDesc: '없음', lidarDepthCostUsd: 0, computeDesc: 'HW4 (~$330)', computeCostUsd: 330, totalCostUsd: 450, performanceLevel: '2.5', performanceNote: 'P2.5: 8×cam+E2E 파이프라인', reliabilityGrade: 'D' },
      { robotLabel: 'Optimus Gen3', companyName: 'Tesla', releaseYear: 2026, isForecast: false, cameraDesc: '8×5MP HW4 ($40×8=$320)', cameraCostUsd: 320, lidarDepthDesc: '없음', lidarDepthCostUsd: 0, computeDesc: 'HW4 (~$330)', computeCostUsd: 330, totalCostUsd: 650, performanceLevel: '3.0', performanceNote: 'P3: 객체 조작 연동 | 8×5MP+HW4', reliabilityGrade: 'D' },
      { robotLabel: 'Optimus 2028 전망', companyName: 'Tesla', releaseYear: 2028, isForecast: true, cameraDesc: '차세대 카메라 배열 (추정)', cameraCostUsd: 200, lidarDepthDesc: '없음', lidarDepthCostUsd: 0, computeDesc: 'AI6 칩 활용 (~$600)', computeCostUsd: 600, totalCostUsd: 800, performanceLevel: '4.0', performanceNote: 'P4: 실시간 VLA | AI6칩 활용', reliabilityGrade: 'D' },
      // Boston Dynamics / Atlas
      { robotLabel: 'Electric Atlas', companyName: 'Boston Dynamics', releaseYear: 2024, isForecast: false, cameraDesc: '스테레오+RGB (~$400)', cameraCostUsd: 400, lidarDepthDesc: 'LiDAR+Depth (~$500)', lidarDepthCostUsd: 500, computeDesc: 'BD 커스텀 3-PC (~$900)', computeCostUsd: 900, totalCostUsd: 1800, performanceLevel: '3.5', performanceNote: 'P3.5: 실시간 VLA 준비 | 멀티센서+3PC', reliabilityGrade: 'D', metadata: { notes: '[D][E] 복합 추정' } },
      { robotLabel: 'Production Atlas', companyName: 'Boston Dynamics', releaseYear: 2025, isForecast: false, cameraDesc: '스테레오+RGB+LG Innotek (~$350)', cameraCostUsd: 350, lidarDepthDesc: 'LiDAR+ToF (~$400)', lidarDepthCostUsd: 400, computeDesc: 'BD 커스텀 양산 (~$700)', computeCostUsd: 700, totalCostUsd: 1450, performanceLevel: '4.0', performanceNote: 'P4: 실시간 VLA | 양산 원가절감', reliabilityGrade: 'D', metadata: { notes: 'CES 2026 발표 기준 [D][E]' } },
      { robotLabel: 'Atlas 2028 전망', companyName: 'Boston Dynamics', releaseYear: 2028, isForecast: true, cameraDesc: '스테레오+RGB 차세대 (~$300)', cameraCostUsd: 300, lidarDepthDesc: 'LiDAR+ToF 개선 (~$300)', lidarDepthCostUsd: 300, computeDesc: 'BD 커스텀 고성능 (~$600)', computeCostUsd: 600, totalCostUsd: 1200, performanceLevel: '5.0', performanceNote: 'P5: FM 인지 통합 | Gemini+원가↓', reliabilityGrade: 'D' },
      // Figure AI
      { robotLabel: 'Figure 02', companyName: 'Figure AI', releaseYear: 2024, isForecast: false, cameraDesc: '6×RGB ($30×6=$180)', cameraCostUsd: 180, lidarDepthDesc: '없음', lidarDepthCostUsd: 0, computeDesc: 'Nvidia Orin (~$700)', computeCostUsd: 700, totalCostUsd: 880, performanceLevel: '2.5', performanceNote: 'P2.5: 환경이해 | 6RGB+Orin', reliabilityGrade: 'D' },
      { robotLabel: 'Figure 03', companyName: 'Figure AI', releaseYear: 2025, isForecast: false, cameraDesc: '헤드+팜cam×2 (~$200)', cameraCostUsd: 200, lidarDepthDesc: '없음 (별도 측정)', lidarDepthCostUsd: 0, computeDesc: 'Nvidia 차세대 (~$800)', computeCostUsd: 800, totalCostUsd: 1000, performanceLevel: '4.0', performanceNote: 'P4: 실시간 VLA | 팜캠+Helix', reliabilityGrade: 'D' },
      { robotLabel: 'Figure 2028 전망', companyName: 'Figure AI', releaseYear: 2028, isForecast: true, cameraDesc: '차세대 분산 카메라 (~$200)', cameraCostUsd: 200, lidarDepthDesc: '없음', lidarDepthCostUsd: 0, computeDesc: 'Helix 고도화 SoC (~$900)', computeCostUsd: 900, totalCostUsd: 1100, performanceLevel: '5.0', performanceNote: 'P5: FM 인지 통합 | Helix 고도화', reliabilityGrade: 'D' },
    ] as any[]);
  }

  console.log('비전 센서 원가 초기 데이터 시딩 완료');
}

export async function ensureVisionCostData() {
  await ensureTables();
  await seedIfEmpty();
}

// 강제 재시딩 (기존 데이터 삭제 후 재삽입)
export async function forceReseedVisionCostData() {
  await ensureTables();
  await db.execute(sql`TRUNCATE TABLE vision_sensor_robot_costs`);
  await db.execute(sql`TRUNCATE TABLE vision_sensor_bom_parts`);
  await seedIfEmpty();
}
