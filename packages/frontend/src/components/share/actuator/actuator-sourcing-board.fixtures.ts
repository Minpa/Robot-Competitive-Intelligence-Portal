/**
 * 조달 방식 보드 테스트 전용 픽스처 — 실데이터 스냅샷(GET /api/actuator-map, generatedAt 2026-10-26T03:12:05.819Z)을 trimmed 한 것.
 * 저장소 밖의 전체 응답에 의존하지 않도록 보드 집계에 필요한 최소 필드만 남겼다.
 *  - robots: 46기 전부(25개사 + LG). 이름·회사·조달 태세·근거 등급·isLG·부품 조달 여부·외부 공급사(vendor, role, level)만 남기고,
 *    noteKo 는 external 로봇만 원문 그대로 둔다. 나머지 필드(스펙·액추에이터·출처)는 helper 기본값이다.
 *  - suppliers: Unitree·Xiaomi·Fourier·Agibot·Kepler·Tesla·LG(+Hyundai Mobis) 제품. vendor·model·status·priceUsd·targetMarket·segments·isLG 만.
 *  - adoptions: 1군(tier1) 사례 3건 + NEURA·Diligent. id·robotName·company·level·segment·marketSegment·actuatorVendor·evidenceGrade 만.
 * 기대값(보드): 타일 15/2/2/6, 로봇 45기(LG 1기 제외) — actuator-sourcing-board.test.ts 가 단언한다.
 */
import type { ActuatorMapResponse, AdoptionSegment, MarketSegment, SourcingPosture } from '@/types/actuator-map';
import { adoption, posture, response, robot, sp } from './actuator-strategy.fixtures';

type VendorRow = [vendor: string, role: string | null, level: 'module' | 'component'];
type RobotRow = [name: string, company: string, posture: SourcingPosture, grade: string | null, componentSourcing: boolean, isLG: boolean, noteKo: string | null, vendors: VendorRow[]];

const ROBOT_ROWS: RobotRow[] = [
  ["NEO", "1X Technologies", "in_house", "A", false, false, null, []],
  ["NEO Beta", "1X Technologies", "in_house", "B", false, false, null, []],
  ["NEO Gamma", "1X Technologies", "in_house", "A", false, false, null, []],
  ["aeo", "Aeolus Robotics", "unknown", "B", false, false, null, []],
  ["Genie G1", "Agibot", "in_house", "A", false, false, null, []],
  ["Lingxi X2", "Agibot", "in_house", "B", false, false, null, []],
  ["Yuanzheng A2", "Agibot", "in_house", "A", false, false, null, []],
  ["Digit", "Agility Robotics", "in_house", "A", false, false, null, []],
  ["Apollo", "Apptronik", "in_house", "B", false, false, null, []],
  ["Apollo 2", "Apptronik", "in_house", "B", false, false, null, []],
  ["Atlas (Electric)", "Boston Dynamics", "external", "A", false, false, "자체 설계(보스턴다이내믹스), 양산 액추에이터는 현대모비스 공급(CES 2026 공식).", [["Hyundai Mobis", "mass-production supply", "module"]]],
  ["Moxi", "Diligent Robotics", "external", "B", false, false, "팔은 Kinova(OEM) 로봇 암(액추에이터 포함), 그리퍼 Robotiq, 베이스 Fetch.", [["Kinova", "component supply", "module"], ["Robotiq", "component supply", "component"], ["Fetch Robotics", "component supply", "component"]]],
  ["Ameca", "Engineered Arts", "unknown", "B", false, false, null, []],
  ["Figure 01", "Figure AI", "in_house", "B", false, false, null, []],
  ["Figure 02", "Figure AI", "in_house", "B", false, false, null, []],
  ["Figure 03", "Figure AI", "in_house", "A", false, false, null, []],
  ["GR-1", "Fourier Intelligence", "in_house", "B", false, false, null, []],
  ["GR-2", "Fourier Intelligence", "in_house", "B", false, false, null, []],
  ["GR-3", "Fourier Intelligence", "in_house", "B", false, false, null, []],
  ["Avatar Robot", "Honda", "unknown", "B", false, false, null, []],
  ["Forerunner K2 Bumblebee", "Kepler Robot", "in_house", "B", false, false, null, []],
  ["CLOiD", "LG Electronics", "in_house_sells", "B", false, true, null, []],
  ["CL-1", "LimX Dynamics", "in_house", "A", false, false, null, []],
  ["Oli", "LimX Dynamics", "in_house", "B", false, false, null, []],
  ["MenteeBot V3", "Mentee Robotics", "in_house", "B", false, false, null, []],
  ["4NE1", "NEURA Robotics", "external", "A", false, false, "NEURA 자체 구동 기술(협동로봇)이 있으며 4NE1 관절 액추에이터는 Schaeffler가 공급(공식 PR).", [["Schaeffler", "component supply", "module"]]],
  ["TALOS", "PAL Robotics", "in_house", "B", true, false, null, [["Harmonic Drive", "component supply", "component"], ["TQ-Group (RoboDrive)", "component supply", "component"]]],
  ["TIAGo", "PAL Robotics", "unknown", "C", false, false, null, []],
  ["HUBO 2 / DRC-HUBO", "Rainbow Robotics", "in_house", "A", true, false, null, [["maxon", "component supply", "component"]]],
  ["RB-Y1", "Rainbow Robotics", "in_house", "B", false, false, null, []],
  ["Phoenix", "Sanctuary AI", "in_house", "A", false, false, null, []],
  ["Relay", "Savioke", "unknown", "C", false, false, null, []],
  ["Pepper", "SoftBank Robotics", "unknown", null, false, false, null, []],
  ["Optimus Gen 2", "Tesla", "external", "B", false, false, "설계는 테슬라 자체(AI Day 2022), 양산 조립은 Tuopu·Sanhua 등 중국 공급사 위탁 보도(B/C). 공급사별 선형/회전 분담은 매체 간 상충.", [["Tuopu Group", "contract manufacturing", "module"], ["Sanhua Intelligent Controls", "contract manufacturing", "module"]]],
  ["Optimus V3", "Tesla", "external", "B", false, false, "V3 양산을 앞두고 테슬라가 Tuopu·Sanhua·Joyson 실사(2026-09, Bloomberg 인용). 자체 설계와 위탁 제조 구조로 보도됨. 최종 공급 구성은 비공개.", [["Tuopu Group", "contract manufacturing", "module"], ["Sanhua Intelligent Controls", "contract manufacturing", "module"]]],
  ["HSR", "Toyota", "unknown", null, false, false, null, []],
  ["Walker S1", "UBTECH", "in_house", "B", false, false, null, []],
  ["Walker S2", "UBTECH", "in_house", "B", false, false, null, []],
  ["Walker X", "UBTECH", "in_house", "B", false, false, null, []],
  ["G1", "Unitree Robotics", "in_house_sells", "B", false, false, null, []],
  ["G1-D", "Unitree Robotics", "in_house_sells", "B", false, false, null, []],
  ["H1", "Unitree Robotics", "in_house_sells", "A", false, false, null, []],
  ["H1-2", "Unitree Robotics", "in_house_sells", "B", false, false, null, []],
  ["H2", "Unitree Robotics", "in_house_sells", "B", false, false, null, []],
  ["CyberOne", "Xiaomi", "in_house_sells", "B", false, false, null, []],
  ["CyberOne 2", "Xiaomi", "unknown", "D", false, false, null, []],
];

type SupplierRow = [vendor: string, model: string, status: string | null, priceUsd: number | null, targetMarket: string | null, segments: string[], isLG: boolean];

const SUPPLIER_ROWS: SupplierRow[] = [
  ["Agibot", "PowerFlow R52", "available", null, "AgiBot X1 humanoid arms", ["tier2_legged"], false],
  ["Agibot", "PowerFlow R86-2", "available", null, "AgiBot X1 humanoid", ["tier2_legged"], false],
  ["Agibot", "PowerFlow R86-3", "available", null, "AgiBot X1 / Lingxi humanoid legs (open-source platform)", ["tier2_legged"], false],
  ["Fourier Intelligence", "FSA 2.0 (series, 7 variants)", "available", null, "humanoid robots (GR-2/GR-3), in-house and external", ["tier2_legged"], false],
  ["Hyundai Mobis", "Humanoid body actuator (2 types shown at CES 2026)", "announced", null, "Boston Dynamics next-gen Atlas (31 body actuators), mass production from 2027, 350k units by 2028", ["tier1_oem", "tier2_legged"], false],
  ["Kepler Robot", "Forerunner rotary actuator", "available", null, "Kepler Forerunner K1/K2 humanoid waist and joints (in-house)", ["captive"], false],
  ["Kepler Robot", "Planetary roller screw linear actuator", "available", null, "Kepler K1/K2 limbs (in-house)", ["captive"], false],
  ["LG Electronics", "AXIUM actuator platform (Φ40-Φ120, 9 product lines)", "announced", null, "LG CLOiD home robot (2026), external partners from 2027, industrial high-torque by 2030", ["service", "industrial_cobot"], true],
  ["Tesla", "Optimus linear actuator (3 classes)", "announced", null, "Tesla Optimus (in-house)", ["captive"], false],
  ["Tesla", "Optimus rotary actuator (3 classes)", "announced", null, "Tesla Optimus (in-house)", ["captive"], false],
  ["Unitree Robotics", "GO-M8010-6", "available", 369, "quadruped robots (Go1), research", ["research_edu", "tier2_legged"], false],
  ["Unitree Robotics", "M107 Joint Motor (H1)", "available", null, "Unitree H1 humanoid (in-house)", ["captive"], false],
  ["Xiaomi", "CyberGear Micro Motor", "available", null, "CyberDog 2 joints, makers, research", ["research_edu", "tier2_legged", "service"], false],
];

type AdoptionRow = [id: string, robotName: string, company: string, level: 'module' | 'component', segment: string, marketSegment: string, actuatorVendor: string, grade: string | null];

const ADOPTION_ROWS: AdoptionRow[] = [
  ["0aab24df-e51d-47c3-8a44-ce00a6671a16", "AgiBot (전략 투자·공급 파트너)", "Agibot (智元)", "module", "humanoid_tier1", "tier1_oem", "Quanzhibo (泉智博)", "B"],
  ["b492ce29-47d3-45b9-ac8a-d79eec2bc0fe", "Atlas (Electric)", "Boston Dynamics", "module", "humanoid_tier1", "tier1_oem", "Hyundai Mobis", "A"],
  ["ffa865a9-2b77-42bd-b89e-27332dc3d9ba", "Moxi", "Diligent Robotics", "module", "service_robot", "service", "Kinova", "B"],
  ["7e536692-5290-4471-800c-f662f1e0b6bd", "4NE1", "NEURA Robotics", "module", "humanoid_tier2", "tier2_legged", "Schaeffler", "A"],
  ["d06742f7-ec05-41de-b02b-bacdc0c341d5", "Optimus V3", "Tesla", "module", "humanoid_tier1", "tier1_oem", "Tuopu Group / Sanhua Intelligent Controls", "B"],
];

/** trimmed 라이브 스냅샷 응답 (호출마다 새 객체) */
export function liveSnapshotTrimmed(): ActuatorMapResponse {
  const robots = ROBOT_ROWS.map(([name, company, p, grade, componentSourcing, isLG, noteKo, vendors]) =>
    robot(
      name,
      company,
      [],
      {
        isLG,
        ...posture(p, {
          evidenceGrade: grade,
          componentSourcing,
          noteKo,
          externalVendors: vendors.map(([vendor, role, level]) => ({ vendor, role, grade: null, url: null, level })),
        }),
      }
    )
  );
  const suppliers = SUPPLIER_ROWS.map(([vendor, model, status, priceUsd, targetMarket, segments, isLG]) =>
    sp(vendor, model, { status, priceUsd, targetMarket, segments: segments as MarketSegment[], segment: segments[0] as MarketSegment, isLG })
  );
  const adoptions = ADOPTION_ROWS.map(([id, robotName, company, level, segment, marketSegment, actuatorVendor, grade]) =>
    adoption({ id, robotName, company, level, segment: segment as AdoptionSegment, marketSegment: marketSegment as MarketSegment, actuatorVendor, evidenceGrade: grade })
  );
  return response(robots, suppliers, { generatedAt: '2026-10-26T03:12:05.819Z', adoptions });
}
