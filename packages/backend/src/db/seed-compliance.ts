import { db } from './index.js';
import { regulations, complianceChecklist, regulatorySources, regulatoryUpdates } from './schema.js';

export async function seedComplianceData() {
  console.log('Seeding compliance data...');

  // Clear existing
  await db.delete(regulatoryUpdates);
  await db.delete(complianceChecklist);
  await db.delete(regulations);
  await db.delete(regulatorySources);

  // ===== REGULATIONS =====
  const regs = await db.insert(regulations).values([
    // === POLICY ===
    {
      title: 'Intelligent Robot Development and Distribution Promotion Act (지능형로봇법)',
      titleKo: '지능형 로봇 개발 및 보급 촉진법',
      category: 'policy',
      region: 'korea',
      status: 'active',
      effectiveDate: '2008-09-22',
      lastAmendedDate: '2023-05-16',
      summary: 'Defines intelligent robots as machines that autonomously perceive and act. Government establishes 5-year basic plans and reviews policies through Robot Industry Policy Council.',
      summaryKo: '외부환경을 스스로 인식하고 상황을 판단하여 자율적으로 동작하는 기계장치를 지능형 로봇으로 정의. 정부는 5년마다 기본계획을 수립하고 로봇산업정책심의회를 통해 정책을 심의.',
      lgImpact: 'critical',
      lgImpactAnalysis: 'CLOiD/KAPEX가 이 법의 적용 대상에 해당하는지 분류 검토 필요. 실외이동로봇 운행안전인증 제도 적용 여부도 확인 필수.',
      sourceUrl: 'https://www.law.go.kr/법령/지능형로봇법',
      sourceName: '국가법령정보센터',
      tags: ['로봇법', '기본법', '안전인증', '실외이동로봇'],
    },
    {
      title: 'Humanoid ROBOT Act (S.3275)',
      titleKo: '휴머노이드 로봇 법안 (S.3275)',
      category: 'policy',
      region: 'us',
      status: 'proposed',
      effectiveDate: '2025-01-01',
      summary: 'Prohibits US federal agencies from procuring humanoids designed/manufactured by "covered entities" (China, etc.). Expands CFIUS review to humanoid tech investments.',
      summaryKo: '미 연방정부 기관이 중국 등 우려 국가가 설계·제조한 휴머노이드를 조달하거나 계약에서 사용하는 것을 금지. CFIUS가 휴머노이드 기술 투자를 심사하도록 확대.',
      lgImpact: 'high',
      lgImpactAnalysis: 'LG가 미국 시장 진입 시 공급망 원산지 증명이 핵심 이슈. 부품의 중국산 비율 관리 필요.',
      sourceUrl: 'https://www.congress.gov/bill/118th-congress/senate-bill/3275',
      sourceName: 'Congress.gov',
      tags: ['supply-chain', 'CFIUS', 'procurement-ban'],
    },
    {
      title: 'EU Artificial Intelligence Act',
      titleKo: 'EU 인공지능법',
      category: 'policy',
      region: 'eu',
      status: 'active',
      effectiveDate: '2024-08-01',
      summary: 'Phased implementation: prohibited AI practices enforced from Feb 2025, high-risk AI obligations from Aug 2026/2027. Humanoid robots likely classified as high-risk under Machinery Regulation safety component.',
      summaryKo: '2024년 8월 발효 후 단계 적용. 고위험 AI 규정은 2026년 8월 및 2027년 8월에 시행. 휴머노이드의 기계지침 적용 시 safety component로서 고위험 해당 가능성 높음.',
      lgImpact: 'critical',
      lgImpactAnalysis: '고위험 분류 해당 여부 판단 필수. 위반 시 최대 3,500만 유로 또는 글로벌 매출 7% 제재. 준수 로드맵 수립 시급.',
      sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
      sourceName: 'EUR-Lex',
      tags: ['AI-Act', 'high-risk', 'machinery-regulation'],
    },
    {
      title: 'MIIT Humanoid Standard Framework (2026 Edition)',
      titleKo: 'MIIT 휴머노이드 표준체계 (2026년판)',
      category: 'policy',
      region: 'china',
      status: 'active',
      effectiveDate: '2026-01-01',
      summary: '6-pillar national standard framework for humanoids. HEIS committee (120+ researchers/industry/policymakers) develops standards.',
      summaryKo: '6개 기둥으로 구성된 국가 표준 프레임워크. MIIT 산하 HEIS 위원회(120명 이상)가 개발.',
      lgImpact: 'high',
      lgImpactAnalysis: '중국 시장 진출 시 해당 표준 프레임워크와의 호환성/차별화 전략 필요.',
      sourceUrl: 'https://www.miit.gov.cn',
      sourceName: 'MIIT',
      tags: ['national-standard', 'HEIS', '6-pillar'],
    },
    // === SAFETY ===
    {
      title: 'ISO 10218:2025 — Industrial Robots Safety',
      titleKo: 'ISO 10218:2025 — 산업용 로봇 안전',
      category: 'safety',
      region: 'international',
      status: 'active',
      effectiveDate: '2025-01-01',
      summary: 'Adopted as ANSI/A3 R15.06-2025 in the US. Strengthened functional safety requirements and added cybersecurity considerations. Expanded from 162 to 374 pages.',
      summaryKo: 'ANSI/A3 R15.06-2025로 미국 채택. 기능안전 요건 강화, 사이버보안 고려사항 추가. 162페이지에서 374페이지로 대폭 확대.',
      lgImpact: 'critical',
      lgImpactAnalysis: '산업용 휴머노이드 배치 시 1차 적용 대상. 적합성 평가 계획 수립 필요.',
      sourceName: 'ISO',
      tags: ['ISO', 'functional-safety', 'cybersecurity'],
    },
    {
      title: 'ISO 13482 — Personal Care Robot Safety',
      titleKo: 'ISO 13482 — 생활지원로봇 안전',
      category: 'safety',
      region: 'international',
      status: 'active',
      summary: 'Safety standards for personal care robots. Updated in 2025 but predates modern AI capabilities (foundation models).',
      summaryKo: '생활지원로봇 안전 규격. 2025년 업데이트되었으나 현대 AI 역량(파운데이션 모델 등)을 반영하기 이전에 제정된 한계.',
      lgImpact: 'high',
      lgImpactAnalysis: '가정용/서비스용 휴머노이드 적용 시 참조 필요.',
      sourceName: 'ISO',
      tags: ['ISO', 'personal-care', 'service-robot'],
    },
    {
      title: 'ISO 25785-1 — Bipedal Humanoid Robot Safety (In Development)',
      titleKo: 'ISO 25785-1 — 이족보행 휴머노이드 안전 (개발 중)',
      category: 'safety',
      region: 'international',
      status: 'draft',
      summary: 'Focuses on active stability control and fall risk management for bipedal systems. Complements ISO 10218 and ISO 13482.',
      summaryKo: '이족보행 시스템의 능동 안정성 제어 및 넘어짐 위험 관리에 초점. ISO 10218, ISO 13482를 보완하는 위치.',
      lgImpact: 'critical',
      lgImpactAnalysis: '휴머노이드 전용 최초 국제 안전 표준. 표준 제정 참여를 통한 선도적 포지션 확보 기회.',
      sourceName: 'ISO',
      tags: ['ISO', 'bipedal', 'fall-risk', 'stability'],
    },
    {
      title: 'IEC 62443 — Industrial Cybersecurity',
      titleKo: 'IEC 62443 — 산업 사이버보안',
      category: 'safety',
      region: 'international',
      status: 'active',
      summary: 'Cybersecurity standards for network-connected robots and industrial control systems.',
      summaryKo: '네트워크 연결 로봇의 사이버보안 표준.',
      lgImpact: 'high',
      lgImpactAnalysis: '네트워크 연결 휴머노이드의 사이버보안 적용 범위 정의 필요.',
      sourceName: 'IEC',
      tags: ['cybersecurity', 'IEC', 'network-security'],
    },
    // === LEGAL ===
    {
      title: 'Product Liability Act (제조물 책임법)',
      titleKo: '제조물 책임법',
      category: 'legal',
      region: 'korea',
      status: 'active',
      summary: 'Liability allocation between manufacturer, system integrator, operator, and AI model developer remains ambiguous for humanoid accidents.',
      summaryKo: '휴머노이드가 작업 중 사고 발생 시 제조사·시스템 통합사·운영사·AI 모델 개발사 간 책임 배분이 불명확.',
      lgImpact: 'critical',
      lgImpactAnalysis: '사고 시 책임 귀속 구조 정의 (제조사 vs SI vs 운영사 vs AI 개발사) 필요.',
      sourceName: '국가법령정보센터',
      tags: ['product-liability', 'responsibility-allocation'],
    },
    {
      title: 'Mandatory Liability Insurance for Outdoor Mobile Robots',
      titleKo: '실외이동로봇 책임보험 의무',
      category: 'legal',
      region: 'korea',
      status: 'active',
      effectiveDate: '2023-05-16',
      summary: 'Operators of safety-certified outdoor mobile robots must carry mandatory liability insurance for personal and property damage.',
      summaryKo: '안전인증을 받은 실외이동로봇 운영 사업자는 인적·물적 손해 배상을 위한 책임보험 가입이 의무화.',
      lgImpact: 'high',
      lgImpactAnalysis: '실외 운용 시 책임보험 의무 가입 대상 해당 여부 확인 필요.',
      sourceName: '국가법령정보센터',
      tags: ['liability-insurance', 'outdoor-robot'],
    },
    {
      title: 'EU Product Liability Directive (PLD) Revision',
      titleKo: 'EU 제조물 책임 지침 (PLD) 개정안',
      category: 'legal',
      region: 'eu',
      status: 'proposed',
      summary: 'Revision to include AI systems in product liability framework. Shifts burden of proof and expands defective product definition.',
      summaryKo: 'AI 시스템을 제조물 책임 프레임워크에 포함하는 개정안. 입증 책임 전환 및 결함 제품 정의 확대.',
      lgImpact: 'high',
      lgImpactAnalysis: 'EU 시장 진출 시 AI 시스템 포함 제조물 책임 대응 전략 필요.',
      tags: ['PLD', 'AI-liability', 'burden-of-proof'],
    },
    // === PRIVACY ===
    {
      title: 'GDPR — General Data Protection Regulation',
      titleKo: 'GDPR — 일반 데이터 보호 규정',
      category: 'privacy',
      region: 'eu',
      status: 'active',
      effectiveDate: '2018-05-25',
      summary: 'Legal basis for personal data processing, data minimization, purpose limitation, data subject rights. Humanoid robot cameras/microphones/sensors are data collection devices under GDPR.',
      summaryKo: '개인정보 처리의 법적 근거, 최소 수집, 목적 제한, 데이터 주체 권리 보장. 휴머노이드 카메라/마이크/센서는 GDPR상 데이터 수집 장치에 해당.',
      lgImpact: 'critical',
      lgImpactAnalysis: 'Privacy by Design을 LG 경쟁 차별화 요소로 포지셔닝 가능. Unitree G1 데이터 유출 사건은 경쟁사 약점이자 LG의 기회.',
      sourceName: 'EUR-Lex',
      tags: ['GDPR', 'privacy-by-design', 'data-minimization'],
    },
    {
      title: 'Personal Information Protection Act (개인정보보호법)',
      titleKo: '개인정보보호법',
      category: 'privacy',
      region: 'korea',
      status: 'active',
      summary: 'Regulations on video information processing devices, consent requirements for in-home data collection by robots.',
      summaryKo: '영상정보처리기기 운영 관련 규정, 가정 내 수집 시 동의 요건.',
      lgImpact: 'critical',
      lgImpactAnalysis: '수집 데이터 유형 목록화 및 On-device vs Cloud 처리 아키텍처 결정 필요.',
      sourceName: '국가법령정보센터',
      tags: ['privacy', 'video-processing', 'consent'],
    },
    {
      title: 'Unitree G1 Data Leak Incident — Privacy Precedent',
      titleKo: 'Unitree G1 데이터 유출 사건 — 프라이버시 선례',
      category: 'privacy',
      region: 'international',
      status: 'active',
      summary: 'Unitree G1 found secretly transmitting audio, video, sensor data to Chinese servers every 5 minutes. Violates GDPR Art.6 & Art.13, CCPA.',
      summaryKo: 'Unitree G1이 5분마다 오디오, 비디오, 센서 데이터를 중국 서버로 비밀리에 전송한 것이 발견됨. GDPR 제6조 및 제13조, CCPA 위반.',
      lgImpact: 'high',
      lgImpactAnalysis: '경쟁사 약점이자 LG의 차별화 포인트. Privacy by Design 기조로 선제적 포지셔닝 가능.',
      tags: ['Unitree', 'data-leak', 'competitive-opportunity'],
    },
  ]).returning();

  // ===== CHECKLIST (with detailed action guides) =====
  const policyItems = await db.insert(complianceChecklist).values([
    {
      category: 'policy', region: 'korea',
      title: 'CLOiD/KAPEX 타겟 시장별 규제 분류 (산업용 vs 서비스용 vs 가정용)',
      priority: 'critical', sortOrder: 1,
      description: `## 왜 중요한가
지능형로봇법은 로봇 유형별로 다른 안전기준과 인증 경로를 요구합니다. CLOiD(가정용)와 KAPEX(산업용)의 법적 분류가 확정되어야 이후 모든 인증·보험·안전 설계의 기준이 결정됩니다. 분류를 잘못하면 인증 프로세스 전체를 다시 시작해야 할 수 있습니다.

## 구체적으로 할 일
1. **법적 분류 분석**: 지능형로봇법 시행령의 로봇 유형 정의(산업용/개인서비스용/전문서비스용)와 CLOiD/KAPEX 스펙을 대조
2. **용도별 규제 매핑**: 각 분류에 따른 안전인증, 보험, 데이터 수집 규제 차이를 매트릭스로 정리
3. **복합 용도 전략**: CLOiD가 가정+서비스 복합인 경우, 가장 엄격한 기준 적용 여부 확인
4. **법률 자문**: 로봇/AI 전문 법무법인에 공식 의견서(Legal Opinion) 의뢰

## 예상 산출물
- 규제 분류 매트릭스 문서
- 법률 의견서
- 인증 경로 의사결정 문서

## 담당 부서 (제안)
법무팀 + 사업기획팀 + 제품팀`,
    },
    {
      category: 'policy', region: 'korea',
      title: '규제 샌드박스 활용 계획 수립',
      priority: 'high', sortOrder: 2,
      description: `## 왜 중요한가
로보티즈가 마곡지구 실증에 규제 샌드박스를 활용했으나 도로교통법 분류 문제로 4년 소요된 선례가 있습니다. 사전에 샌드박스 전략을 수립하면 실증 기간을 대폭 단축할 수 있습니다.

## 구체적으로 할 일
1. **샌드박스 유형 선정**: ICT 규제 샌드박스 vs 산업융합 규제 샌드박스 중 적합한 트랙 선택
2. **실증 시나리오 설계**: 시나리오별(공장 내, 물류센터, 공공공간) 샌드박스 신청 전략 수립
3. **선행 사례 분석**: 로보티즈, 뉴빌리티, 배달의민족 자율주행 로봇 등 기존 샌드박스 승인 사례의 신청서 구조 분석
4. **관계부처 사전 협의**: 산업부 로봇산업과, 과기부 등 관계부처와 사전 미팅을 통해 규제 쟁점 파악
5. **타임라인 수립**: 신청→심사→실증→본허가까지 예상 일정 수립

## 예상 산출물
- 규제 샌드박스 신청서 초안
- 실증 계획서
- 관계부처 미팅 결과 보고서

## 담당 부서 (제안)
대관팀 + 사업기획팀`,
    },
    {
      category: 'policy', region: 'us',
      title: '미국 ROBOT Act 공급망 원산지 리스크 평가',
      priority: 'critical', sortOrder: 3,
      description: `## 왜 중요한가
Humanoid ROBOT Act(S.3275)가 통과되면 중국산 부품이 포함된 휴머노이드는 미 연방기관 조달에서 배제됩니다. B2G 시장뿐 아니라 CFIUS 심사 강화로 투자 유치에도 영향을 미칩니다.

## 구체적으로 할 일
1. **BOM(Bill of Materials) 원산지 분석**: CLOiD/KAPEX 전체 부품의 원산지를 1-tier, 2-tier까지 추적하여 중국산 비율 산출
2. **"Covered Entity" 해당 여부 검토**: 법안의 covered entity 정의(중국, 러시아, 북한, 이란 소재 기업)에 해당하는 공급사 식별
3. **대체 공급사 매핑**: 중국산 핵심부품(액추에이터, 센서, SoC 등)의 비중국 대체 공급사 후보 목록 작성
4. **CFIUS 대응 전략**: 미국 내 JV/투자 계획이 있다면 CFIUS 자발적 사전 신고(Voluntary Notice) 검토
5. **법안 모니터링**: 법안이 아직 proposed 상태이므로 위원회 진행 상황, 수정안, 표결 일정 지속 추적

## 예상 산출물
- BOM 원산지 분석 보고서
- 대체 공급사 후보 리스트
- CFIUS 리스크 평가서

## 담당 부서 (제안)
구매팀 + 법무팀 + 미국 현지 법인`,
    },
    {
      category: 'policy', region: 'eu',
      title: 'EU AI Act 고위험 분류 해당 여부 및 준수 로드맵',
      priority: 'critical', sortOrder: 4,
      description: `## 왜 중요한가
EU AI Act는 위반 시 최대 3,500만 유로 또는 글로벌 매출 7%까지 제재합니다. 휴머노이드가 기계지침(Machinery Regulation) 적용 제품의 safety component로 분류되면 고위험 AI로 추정되어 광범위한 의무가 부과됩니다.

## 구체적으로 할 일
1. **분류 자가 평가**: EU AI Act Annex I/III 기준으로 CLOiD/KAPEX의 AI 시스템 분류 수행
2. **기계지침 연계 분석**: Machinery Regulation(2023/1230) 상 휴머노이드가 "machinery"인지 "related product"인지 확인
3. **적합성 평가 경로 선택**: 자체 적합성 선언 vs 제3자 인증(Notified Body) 필요 여부 판단
4. **기술 문서 준비**: 위험관리시스템, 데이터 거버넌스, 투명성 요건, 인간 감독(Human Oversight) 메커니즘 문서화 계획
5. **준수 로드맵**: 2026.8 고위험 시행일까지 역산하여 마일스톤 설정
6. **EU 대리인(Authorised Representative) 지정**: EU 역내 법적 대리인 선임 필요

## 예상 산출물
- AI Act 분류 평가 보고서
- 적합성 평가 경로 의사결정 문서
- EU AI Act 준수 로드맵 (마일스톤 포함)

## 담당 부서 (제안)
법무팀(EU) + 품질인증팀 + AI 개발팀`,
    },
    {
      category: 'policy', region: 'china',
      title: '중국 표준체계와의 호환성/차별화 전략',
      priority: 'high', sortOrder: 5,
      description: `## 왜 중요한가
MIIT가 발표한 6-pillar 표준체계와 T/CIE 298-2025 지능등급 표준은 중국 시장 진입의 사실상 필수 조건이 될 것입니다. 동시에 이 표준이 국제 표준과 어떻게 다른지 파악해야 이중 인증 부담을 최소화할 수 있습니다.

## 구체적으로 할 일
1. **6-pillar 프레임워크 매핑**: MIIT 표준체계의 6개 기둥(기초, 핵심기술, 시스템, 응용, 안전, 시험인증)을 CLOiD/KAPEX 현재 스펙과 대조
2. **지능등급 자체 평가**: T/CIE 298-2025의 4차원 5등급 기준에서 CLOiD/KAPEX가 어느 등급에 해당하는지 사전 평가
3. **국제 표준 대비 Gap 분석**: ISO 10218/13482와 중국 표준 간 차이점 식별 (이중 인증 필요 영역)
4. **표준화 참여 전략**: HEIS 위원회 옵저버 참여 또는 한-중 표준 협력 채널 활용 가능성 검토
5. **현지 파트너 활용**: 중국 내 인증 대행 또는 JV 파트너를 통한 표준 대응 전략

## 예상 산출물
- 중국 vs 국제 표준 Gap 분석표
- 지능등급 자체 평가 결과
- 중국 시장 인증 전략 문서

## 담당 부서 (제안)
중국 법인 + 표준화팀 + 제품기획팀`,
    },
    {
      category: 'policy', region: 'international',
      title: '수출 통제(미중 기술갈등) 하 부품 조달 리스크 평가',
      priority: 'high', sortOrder: 6,
      description: `## 왜 중요한가
미중 기술 갈등으로 AI 칩, 고성능 센서, 액추에이터 등 핵심부품의 수출입 통제가 강화되고 있습니다. 부품 조달이 갑자기 차단되면 생산 라인 전체가 멈출 수 있습니다.

## 구체적으로 할 일
1. **핵심부품 수출통제 해당 여부**: 미국 EAR(Export Administration Regulations), 한국 전략물자 통합공고 기준으로 부품별 수출통제 해당 여부 확인
2. **이중 소싱 전략**: 단일 국가 의존도가 높은 부품 식별 및 대체 공급처 확보
3. **기술 라이선스 검토**: 사용 중인 AI 모델, 소프트웨어의 수출통제 라이선스 조건 확인
4. **재고 버퍼 전략**: 수출통제 리스크가 높은 부품의 안전재고 수준 설정
5. **지정학 시나리오 플래닝**: 최악의 경우(특정 국가 부품 전면 금수) 시 대응 시나리오 수립

## 예상 산출물
- 부품별 수출통제 리스크 매트릭스
- 이중 소싱 계획
- 지정학 리스크 시나리오 보고서

## 담당 부서 (제안)
구매팀 + 법무팀(통상) + SCM팀`,
    },
  ]).returning();

  const safetyItems = await db.insert(complianceChecklist).values([
    {
      category: 'safety', region: 'international',
      title: 'ISO 10218(2025) / ISO 13482 적합성 평가 계획',
      priority: 'critical', sortOrder: 10,
      description: `## 왜 중요한가
ISO 10218:2025는 산업용 로봇 안전의 글로벌 표준이며 미국(ANSI)에서도 채택되었습니다. 374페이지로 대폭 확대된 이번 개정판은 기능안전과 사이버보안을 새롭게 강화했습니다. 이 표준 미준수 시 미국·EU 시장 진입이 사실상 불가합니다.

## 구체적으로 할 일
1. **Gap Assessment**: ISO 10218:2025 전문을 입수하여 CLOiD/KAPEX 현재 설계 vs 표준 요건 간 Gap 분석
2. **적용 범위 결정**: 산업용(10218) vs 서비스용(13482) vs 양쪽 적용 시나리오 결정
3. **시험 계획 수립**: 기능안전 시험(정지 거리, 비상정지 응답시간, 힘/토크 제한), 환경 시험(EMC, 진동), 소프트웨어 안전성 시험 항목 정리
4. **인증 기관 선정**: TÜV, UL, KTL 등 시험인증기관과 사전 미팅하여 일정·비용 확인
5. **설계 반영**: Gap 분석 결과를 하드웨어/소프트웨어 설계에 반영하는 일정 수립

## 예상 산출물
- ISO 10218 / 13482 Gap 분석 보고서
- 시험 항목 리스트 및 일정
- 인증기관 비교표 및 선정 결과

## 담당 부서 (제안)
품질인증팀 + 기구설계팀 + SW안전팀`,
    },
    {
      category: 'safety', region: 'international',
      title: 'ISO 25785-1 동향 모니터링 및 표준 제정 참여',
      priority: 'high', sortOrder: 11,
      description: `## 왜 중요한가
ISO 25785-1은 이족보행 휴머노이드 전용 최초 국제 안전 표준입니다. 아직 개발 중이므로 표준 제정에 참여하면 LG 기술이 표준에 반영되는 유리한 위치를 확보할 수 있습니다.

## 구체적으로 할 일
1. **ISO/TC 299 참여**: 로봇공학 기술위원회(TC 299) WG3의 옵저버 또는 P-멤버 참여 검토
2. **국내 미러위원회 참여**: KS 표준 미러위원회를 통해 국내에서 ISO 작업 참여
3. **기술 기여**: LG의 낙상 방지 기술, 안정성 제어 알고리즘 등을 표준 사례로 제안
4. **경쟁사 동향 파악**: Tesla, Figure, Agility 등이 표준 제정에 참여 중인지 모니터링
5. **Draft 리뷰**: Committee Draft(CD), Draft International Standard(DIS) 공개 시 즉시 검토 및 코멘트 제출

## 예상 산출물
- ISO/TC 299 참여 보고서
- 표준 반영 제안서
- 경쟁사 표준 참여 현황

## 담당 부서 (제안)
표준화팀 + R&D (보행제어팀)`,
    },
    {
      category: 'safety', region: 'international',
      title: '낙상·충돌·협착 등 물리적 위험 시나리오 도출 및 위험성 평가',
      priority: 'critical', sortOrder: 12,
      description: `## 왜 중요한가
Agility Digit이 박람회에서 갑자기 쓰러진 사례처럼, 휴머노이드의 물리적 사고는 브랜드 이미지에 치명적이며 소송 리스크도 큽니다. 체계적인 위험성 평가(Risk Assessment)는 모든 안전 인증의 기초입니다.

## 구체적으로 할 일
1. **Hazard Identification**: ISO 12100 방법론에 따라 CLOiD/KAPEX의 전 생애주기(운반, 설치, 운용, 유지보수, 폐기)별 위험 요인 식별
2. **시나리오 도출**:
   - 낙상(Fall): 계단, 경사면, 미끄러운 바닥, 외부 충격
   - 충돌(Collision): 사람, 가구, 벽, 다른 로봇과의 충돌
   - 협착(Pinching): 관절 구동부에 손가락/옷이 끼는 상황
   - 열(Thermal): 모터/배터리 과열, 화재
   - 전기(Electrical): 배터리 누출, 감전
   - 낙하물: 로봇이 들고 있던 물건 떨어뜨림
3. **위험성 평가 매트릭스**: 각 시나리오별 심각도(Severity) × 발생빈도(Probability) × 회피가능성(Avoidance) 평가
4. **허용 가능 리스크 수준 결정**: ALARP(As Low As Reasonably Practicable) 원칙 적용
5. **위험 저감 조치 설계**: 본질안전설계 → 안전장치 → 사용정보 순서로 저감 조치 수립

## 예상 산출물
- 위험성 평가 보고서 (Risk Assessment Report)
- 위험 시나리오 카탈로그
- 위험 저감 조치 목록 및 잔류 리스크 평가

## 담당 부서 (제안)
안전팀 + 기구설계팀 + 제어SW팀`,
    },
    {
      category: 'safety', region: 'international',
      title: '비상정지(E-stop) 메커니즘 설계 기준',
      priority: 'critical', sortOrder: 13,
      description: `## 왜 중요한가
비상정지는 모든 로봇 안전 표준의 핵심 필수 요건입니다. 휴머노이드의 경우 이족보행 상태에서의 비상정지는 "안전한 자세로의 전환"이라는 독특한 설계 과제를 안고 있습니다.

## 구체적으로 할 일
1. **E-stop 모드 정의**:
   - Category 0 (즉시 전원 차단) — 언제 사용할지
   - Category 1 (제어 정지 후 전원 차단) — 안전 자세 전환 후 정지
   - Category 2 (제어 유지 정지) — 서 있는 상태 유지
2. **안전 자세 설계**: 비상정지 시 넘어지지 않도록 무릎을 낮추는 "safe crouch" 자세 설계
3. **정지 응답시간 측정**: E-stop 신호 → 실제 정지까지 시간 기준 설정 (ISO 13850 참조)
4. **물리적 E-stop 버튼 위치**: 운영자가 쉽게 접근 가능한 위치, 색상(빨간색), 형상(버섯형) 결정
5. **원격 E-stop**: 무선 E-stop 시 통신 두절 상황(fail-safe) 처리 방안
6. **시험 프로토콜**: E-stop 시험 시나리오(보행 중, 물건 운반 중, 계단 이동 중 등) 정의

## 예상 산출물
- E-stop 설계 사양서
- 안전 자세(Safe Pose) 정의 문서
- E-stop 시험 프로토콜

## 담당 부서 (제안)
제어SW팀 + 기구설계팀 + 안전팀`,
    },
    {
      category: 'safety', region: 'international',
      title: '힘/토크 제한, 접촉력 허용 범위 설정',
      priority: 'high', sortOrder: 14,
      description: `## 왜 중요한가
ISO/TS 15066은 협동로봇의 접촉력 허용 범위를 인체 부위별로 정의합니다. 휴머노이드는 팔, 손, 다리 등 다양한 접촉점이 있어 더 세밀한 설정이 필요합니다.

## 구체적으로 할 일
1. **ISO/TS 15066 인체 모델 적용**: 인체 부위별 최대 허용 접촉력(두부: 130N, 흉부: 140N 등) 기준으로 CLOiD/KAPEX 각 관절의 힘/토크 제한값 설정
2. **동적 힘 제한**: 보행 시, 물건 운반 시, 손 조작 시 등 동작 모드별 차별화된 힘 제한 프로파일 설계
3. **충돌 감지 알고리즘**: 외력 감지 시 즉시 힘을 제한하거나 후퇴하는 리액티브 제어 설계
4. **패딩/커버 설계**: 접촉 가능 부위의 충격 완화 소재 적용 설계
5. **시험 방법**: 힘/토크 측정 시험 셋업(Force plate, 더미 인체모형 등) 구축

## 예상 산출물
- 관절별 힘/토크 제한값 사양서
- 충돌 감지 알고리즘 설계 문서
- 힘/토크 시험 결과 보고서

## 담당 부서 (제안)
제어SW팀 + 액추에이터팀 + 안전팀`,
    },
    {
      category: 'safety', region: 'international',
      title: '사이버보안 (IEC 62443) 적용 범위 정의',
      priority: 'high', sortOrder: 15,
      description: `## 왜 중요한가
Unitree G1의 무단 데이터 전송 사례에서 보듯, 네트워크 연결 로봇의 사이버보안 취약점은 프라이버시 침해뿐 아니라 물리적 안전 위협으로 직결됩니다. ISO 10218:2025에도 사이버보안 조항이 신설되었습니다.

## 구체적으로 할 일
1. **보안 영역(Zone) 정의**: IEC 62443 기반으로 로봇 내부 네트워크, 클라우드 통신, 원격 조종 채널을 보안 영역으로 분류
2. **위협 모델링**: STRIDE/DREAD 방법론으로 공격 표면(Attack Surface) 분석 — OTA 업데이트, API, Wi-Fi/BLE, 센서 스푸핑 등
3. **보안 레벨 목표 설정**: IEC 62443 SL(Security Level) 1~4 중 목표 수준 결정
4. **Secure Boot / OTA 보안**: 펌웨어 무결성 검증, OTA 업데이트 서명 검증 메커니즘 설계
5. **취약점 관리 프로세스**: CVE 모니터링, 패치 배포 주기, 침투 테스트(Pen-test) 일정 수립

## 예상 산출물
- 위협 모델링 보고서
- IEC 62443 적용 범위 및 목표 SL 문서
- 보안 아키텍처 설계서

## 담당 부서 (제안)
보안팀 + SW개발팀 + 네트워크팀`,
    },
    {
      category: 'safety', region: 'international',
      title: '기능안전 (SIL/PL 등급) 목표 설정',
      priority: 'high', sortOrder: 16,
      description: `## 왜 중요한가
기능안전(Functional Safety)은 안전 관련 제어 시스템의 신뢰도를 정량적으로 보증합니다. SIL(Safety Integrity Level) 또는 PL(Performance Level) 등급이 설정되어야 안전 관련 하드웨어/소프트웨어의 개발 프로세스가 결정됩니다.

## 구체적으로 할 일
1. **안전 기능 식별**: 비상정지, 속도 제한, 힘 제한, 안전 영역 감시 등 Safety Function 목록 작성
2. **SIL/PL 등급 결정**: 각 안전 기능별 IEC 61508(SIL) 또는 ISO 13849(PL) 기준으로 목표 등급 할당
3. **아키텍처 설계**: 목표 SIL/PL 달성을 위한 이중화(Redundancy), 진단(Diagnostics) 설계 — 예: 이중 인코더, 독립 안전 컨트롤러
4. **V-모델 개발 프로세스**: SIL 등급에 따른 SW 개발 프로세스(요구사항 추적, 코드 리뷰, 정적 분석, 단위 시험 등) 수립
5. **FMEDA 수행**: 안전 관련 하드웨어 부품의 고장 모드, 영향, 진단 분석

## 예상 산출물
- 안전 기능 목록 및 SIL/PL 할당표
- 안전 아키텍처 설계서
- FMEDA 보고서

## 담당 부서 (제안)
기능안전팀 + HW설계팀 + SW안전팀`,
    },
    {
      category: 'safety', region: 'international',
      title: '의인화에 따른 심리적 안전 가이드라인',
      priority: 'medium', sortOrder: 17,
      description: `## 왜 중요한가
IEEE 보고서에 따르면 인간형 로봇에 대해 능력을 과대평가하거나 안전 경계를 낮추는 의인화 효과(Anthropomorphism)가 존재합니다. 사용자가 로봇을 "동료"처럼 신뢰하면 위험한 상황에서도 회피 행동이 느려질 수 있습니다.

## 구체적으로 할 일
1. **의인화 수준 설계 기준**: 외형, 음성, 행동 패턴에서 의인화 정도의 가이드라인 수립 — Uncanny Valley 회피
2. **사용자 교육 프로그램**: "이것은 사람이 아니라 기계입니다" — 로봇 한계를 명확히 인지시키는 교육 자료 개발
3. **경고 표시**: 로봇 외형에 "기계장치" 식별 표시, 작동 중 상태 표시(LED 링 등)
4. **심리적 스트레스 연구**: 장기간 휴머노이드와 함께 작업 시 심리적 영향 파악을 위한 사용자 연구 계획
5. **취약 사용자 보호**: 아동, 노인 등 취약 사용자와의 상호작용 시 추가 안전 장치

## 예상 산출물
- 의인화 설계 가이드라인
- 사용자 교육 자료
- 사용자 연구 프로토콜

## 담당 부서 (제안)
UX팀 + 안전팀 + HRI(Human-Robot Interaction) 연구팀`,
    },
    {
      category: 'safety', region: 'international',
      title: 'NRTL(미국)/CE(EU)/KC(한국) 인증 경로 매핑',
      priority: 'high', sortOrder: 18,
      description: `## 왜 중요한가
각 시장 진입에 필수적인 인증 마크가 다릅니다. 인증 간 상호인정이 가능한 부분과 별도 인증이 필요한 부분을 사전에 파악하면 비용과 일정을 최적화할 수 있습니다.

## 구체적으로 할 일
1. **인증 매트릭스 작성**: 시장별(미국/EU/한국/중국/일본) × 인증유형별(안전/EMC/무선/배터리) 매트릭스
2. **NRTL(미국)**: UL, CSA, TÜV USA 등 OSHA 인정 시험기관 선정, UL 규격 적용 (UL 1740 Robots 등)
3. **CE(EU)**: 기계지침(2006/42/EC→2023/1230), EMC지침, LVD, RED(무선) 적합성 선언 경로
4. **KC(한국)**: 전기용품안전법, 전파법 기준 적합 인증, KS 규격 적용
5. **시험 데이터 상호 활용**: CB Scheme(IEC 기반 상호인정)으로 시험 1회로 복수 인증 가능한 영역 파악
6. **인증 일정 및 비용 견적**: 각 인증별 소요 기간(통상 3-12개월)과 비용 산출

## 예상 산출물
- 글로벌 인증 매트릭스
- 인증 경로 플로우차트
- 인증 예산 및 일정 계획

## 담당 부서 (제안)
품질인증팀 + 해외사업팀`,
    },
  ]).returning();

  const legalItems = await db.insert(complianceChecklist).values([
    {
      category: 'legal', region: 'korea',
      title: '사고 시 책임 귀속 구조 정의 (제조사 vs SI vs 운영사 vs AI 개발사)',
      priority: 'critical', sortOrder: 20,
      description: `## 왜 중요한가
휴머노이드 사고 시 제조사(LG), 시스템통합사(SI), 운영사(고객), AI 모델 개발사(OpenAI/Anthropic 등) 간 책임 배분이 현행법으로는 불명확합니다. 계약 단계에서 미리 정의하지 않으면 사고 시 전체 책임이 제조사에 집중될 수 있습니다.

## 구체적으로 할 일
1. **책임 분배 모델 수립**: 자동차 업계의 OEM-Tier1-딜러 책임 구조를 참고하여 휴머노이드용 책임 분배 모델 설계
2. **AI 모델 책임 범위**: LLM/비전 모델이 잘못된 판단을 내린 경우, AI 개발사 vs 로봇 제조사 간 책임 경계 정의
3. **계약서 표준 조항**: B2B 판매 계약, SI 파트너 계약, 운영 서비스 계약 각각에 책임 제한, 면책, 배상 조항 표준안 마련
4. **보험 구조 설계**: 제조물 책임보험 + 사이버 보험 + 운영자 배상책임보험의 다층 보험 구조 설계
5. **사고 대응 프로토콜**: 사고 발생 시 초기 대응 → 원인 조사 → 책임 판정 → 배상 프로세스 SOP 수립

## 예상 산출물
- 책임 분배 모델 문서
- 표준 계약 조항(안)
- 사고 대응 SOP

## 담당 부서 (제안)
법무팀 + 사업팀 + 보험/리스크관리팀`,
    },
    {
      category: 'legal', region: 'korea',
      title: '제조물 책임법 적용 범위 및 면책 요건 검토',
      priority: 'critical', sortOrder: 21,
      description: `## 왜 중요한가
한국 제조물 책임법은 무과실 책임 원칙을 적용하여, 제조사는 결함이 있음을 증명하지 않아도 피해자가 손해를 입증하면 책임을 질 수 있습니다. 면책 요건(개발위험의 항변 등)을 사전에 검토해야 방어 전략을 세울 수 있습니다.

## 구체적으로 할 일
1. **결함 유형 분류**: 제조상 결함, 설계상 결함, 표시상 결함 각각에 대해 휴머노이드 특유의 리스크 식별
2. **면책 사유 검토**: 개발위험의 항변(state of the art defense), 법령 준수 항변 등 적용 가능성 분석
3. **AI 결함 판단 기준**: AI의 판단 오류가 "설계상 결함"인지 "제조상 결함"인지 — 판례/학설 조사
4. **경고·표시 전략**: 사용설명서, 안전 경고 라벨, 디지털 경고(화면/음성)의 충분성 기준 수립
5. **사용자 부주의 vs 제품 결함**: 사용자가 매뉴얼 무시 시 기여과실 주장 가능 범위 검토

## 예상 산출물
- 제조물 책임 리스크 분석 보고서
- 면책 전략 문서
- 경고/표시 가이드라인

## 담당 부서 (제안)
법무팀 + 품질팀 + 기술문서팀`,
    },
    {
      category: 'legal', region: 'korea',
      title: '책임보험 의무 가입 대상 해당 여부 (실외이동 시)',
      priority: 'high', sortOrder: 22,
      description: `## 왜 중요한가
2023년 개정된 지능형로봇법에 따라 실외이동로봇 운영 사업자는 책임보험 가입이 의무입니다. CLOiD/KAPEX가 실외에서 운용되는 경우 보험 미가입 시 과태료와 영업 제한을 받을 수 있습니다.

## 구체적으로 할 일
1. **적용 대상 판단**: "실외이동로봇"의 법적 정의에 CLOiD/KAPEX가 해당하는지 (이족보행 vs 바퀴 구분 없음 확인)
2. **보험 상품 조사**: 국내 보험사의 로봇 전용 책임보험 상품 현황 파악 (삼성화재, DB손보 등)
3. **보장 범위 결정**: 인적 손해(사망·부상), 물적 손해, 재산 피해의 보장 한도 설정
4. **보험료 산정**: 운행 범위, 속도, 운행 시간, 안전기능 수준에 따른 보험료 견적 비교
5. **보험 가입 프로세스**: 안전인증 → 보험 가입 → 운행 허가의 순서와 소요 기간 확인

## 예상 산출물
- 책임보험 적용 여부 판단서
- 보험 상품 비교표
- 보험 가입 일정 계획

## 담당 부서 (제안)
법무팀 + 보험/리스크관리팀`,
    },
    {
      category: 'legal', region: 'korea',
      title: '산업안전보건법상 휴머노이드 분류 및 안전조치 기준',
      priority: 'high', sortOrder: 23,
      description: `## 왜 중요한가
산업안전보건기준에 관한 규칙은 산업용 로봇 이용 시 울타리 설치를 규정합니다. 협동로봇은 KS/국제 안전기준 부합 시 면제 가능하지만, 휴머노이드에 대한 명확한 기준은 아직 없습니다.

## 구체적으로 할 일
1. **현행 규정 검토**: 산안법 시행규칙 제222조(산업용 로봇) 및 제223조(안전매트 등)의 휴머노이드 적용 가능성
2. **협동로봇 면제 조건 확인**: 안전인증, ISO 10218/TS 15066 준수 시 울타리 면제 적용 여부
3. **고용노동부 유권해석 요청**: 휴머노이드가 "산업용 로봇"인지 별도 분류인지 공식 유권해석 요청
4. **현장 안전 매뉴얼 작성**: 공장 투입 시 작업자 안전 교육, 작업 영역 구분, 동시 작업 제한 등 매뉴얼 초안
5. **산재보험 적용**: 로봇 관련 사고 시 산재보험 처리 절차 확인

## 예상 산출물
- 산안법 적용 분석서
- 고용노동부 유권해석 요청서
- 현장 안전 매뉴얼 초안

## 담당 부서 (제안)
안전환경팀 + 법무팀 + 사업부(현장배치팀)`,
    },
    {
      category: 'legal', region: 'international',
      title: '로봇이 생성/수집하는 데이터의 소유권·라이선싱 계약 구조',
      priority: 'high', sortOrder: 24,
      description: `## 왜 중요한가
휴머노이드가 수집하는 환경 데이터, 작업 데이터, 사용자 행동 데이터에 대해 제조사·서비스 운영자·로봇 구매자 모두 권리를 주장할 수 있습니다. EU Data Act(2025.2 시행)은 IoT 데이터에 대한 사용자 접근권을 강화했습니다.

## 구체적으로 할 일
1. **데이터 유형별 소유권 분류**: 로봇 운영 데이터(LG), 작업 환경 데이터(고객), 개인 데이터(사용자) 분류
2. **EU Data Act 대응**: IoT 자동 수집 데이터에 대한 사용자 접근권 보장 방안
3. **데이터 라이선스 모델**: 데이터 소유 vs 사용 허가(License) vs 공동 소유 등 비즈니스 모델별 계약 구조 설계
4. **AI 학습 데이터 조항**: 고객 현장 데이터를 AI 모델 개선에 사용할 경우의 법적 근거 및 동의 절차
5. **데이터 포터빌리티**: 고객이 서비스를 해지할 때 데이터 이전/삭제 절차

## 예상 산출물
- 데이터 소유권 분류 매트릭스
- 표준 데이터 라이선스 계약(안)
- EU Data Act 대응 가이드

## 담당 부서 (제안)
법무팀 + 데이터팀 + 사업팀`,
    },
    {
      category: 'legal', region: 'eu',
      title: 'EU 제조물 책임 지침(PLD) 개정안 대응',
      priority: 'high', sortOrder: 25,
      description: `## 왜 중요한가
EU PLD 개정안은 AI 시스템을 "제품"에 포함시키고, 피해자의 입증 책임을 완화(입증 책임 전환)합니다. 이는 AI 기반 휴머노이드 제조사의 소송 리스크를 크게 높입니다.

## 구체적으로 할 일
1. **개정안 주요 변경사항 분석**: 결함 제품 정의 확대, 디지털 제조 파일, 소프트웨어 업데이트 후 책임, 입증 책임 전환 조항
2. **영향 평가**: CLOiD/KAPEX EU 출시 시 추가되는 법적 의무 식별
3. **기술 로그/증거 보전 전략**: AI 판단 과정의 투명성 확보를 위한 로깅 시스템 설계 (소송 시 방어 자료)
4. **소프트웨어 업데이트 책임**: OTA 업데이트 후 발생하는 문제에 대한 책임 범위 검토
5. **AI Liability Directive 연계**: AI 책임 지침과의 관계 분석 (입증 책임 관련)

## 예상 산출물
- PLD 개정안 영향 평가 보고서
- 방어 증거 보전 전략서
- AI 로깅 요건 정의서

## 담당 부서 (제안)
법무팀(EU) + AI팀 + SW개발팀`,
    },
    {
      category: 'legal', region: 'international',
      title: '고용 영향 평가 및 로봇세 관련 논의 모니터링',
      priority: 'medium', sortOrder: 26,
      description: `## 왜 중요한가
휴머노이드가 인간의 일자리를 대체한다는 인식이 확산되면 로봇세(Robot Tax) 도입 압력이 높아집니다. 빌 게이츠가 2017년 제안한 이후 EU, 한국에서 논의가 지속되고 있습니다.

## 구체적으로 할 일
1. **각국 로봇세 논의 현황 추적**: EU 의회 결의안, 한국 국회 발의 법안, 미국 주별 논의 모니터링
2. **고용 영향 시뮬레이션**: CLOiD/KAPEX 도입 시 대체 vs 보완되는 일자리 분석
3. **"로봇과 사람의 협업" 내러티브**: 일자리 대체가 아닌 협업·증강 프레임으로 포지셔닝 전략
4. **CSR 전략**: 재교육 프로그램, 전환 배치 지원 등 기업의 사회적 책임 프로그램 기획
5. **로봇세 시나리오 분석**: 로봇세가 도입될 경우 사업 모델에 미치는 재무적 영향 시뮬레이션

## 예상 산출물
- 로봇세 논의 현황 보고서 (분기 업데이트)
- 고용 영향 평가서
- CSR 프로그램 기획안

## 담당 부서 (제안)
대관팀 + 전략기획팀 + CSR팀`,
    },
    {
      category: 'legal', region: 'international',
      title: '각 시장별 소송/분쟁 리스크 시나리오 사전 검토',
      priority: 'high', sortOrder: 27,
      description: `## 왜 중요한가
미국은 Class Action, EU는 집단 구제(Collective Redress), 한국은 집단 소송제 도입 논의가 진행 중입니다. 사전에 시나리오별 법적 방어 전략을 준비해야 합니다.

## 구체적으로 할 일
1. **소송 시나리오 도출**: 물리적 사고, 프라이버시 침해, 차별적 AI 판단, 제품 결함 등 유형별 소송 시나리오
2. **시장별 소송 환경 비교**: 미국(징벌적 배상, Class Action), EU(집단 구제, 높은 과징금), 한국(제조물 책임 무과실), 중국(소비자 보호법)
3. **법무법인 네트워크**: 각 시장별 로봇/AI 전문 법무법인 사전 선정 및 리테이너 계약 검토
4. **증거 보전 시스템**: AI 판단 로그, 센서 데이터, 소프트웨어 버전 등 소송 시 필요한 데이터 보존 정책
5. **위기 커뮤니케이션**: 사고 발생 시 미디어 대응, 고객 커뮤니케이션 매뉴얼

## 예상 산출물
- 소송 시나리오 카탈로그
- 시장별 법적 리스크 비교표
- 위기 대응 매뉴얼

## 담당 부서 (제안)
법무팀 + 커뮤니케이션팀`,
    },
  ]).returning();

  const privacyItems = await db.insert(complianceChecklist).values([
    {
      category: 'privacy', region: 'international',
      title: '수집 데이터 유형 목록화 (RGB, Depth, 오디오, LiDAR, IMU, 터치 등)',
      priority: 'critical', sortOrder: 30,
      description: `## 왜 중요한가
GDPR의 Data Mapping 의무, 한국 개인정보보호법의 개인정보 처리방침 작성 의무 모두 "어떤 데이터를 수집하는가"를 정확히 파악하는 것에서 시작합니다. 휴머노이드는 기존 IoT 기기보다 훨씬 다양한 센서를 탑재하므로 데이터 목록화가 복잡합니다.

## 구체적으로 할 일
1. **센서 인벤토리**: CLOiD/KAPEX에 탑재된 모든 센서(RGB 카메라, 뎁스 카메라, 마이크 어레이, LiDAR, IMU, 터치/압력 센서, 온도 센서 등) 목록 작성
2. **데이터 흐름 매핑(Data Flow Map)**: 각 센서 → 온보드 처리 → 클라우드 전송 → 저장소의 전체 데이터 흐름도 작성
3. **개인정보 해당 여부 판단**: 각 데이터 유형별 개인정보 해당 여부 (얼굴 인식 → 개인정보, 점운 데이터 → 비식별 가능하나 결합 시 식별 가능)
4. **민감정보 분류**: 생체 데이터(음성 특성, 걸음걸이 등), 건강 데이터(낙상 감지), 아동 데이터 등 특별 카테고리 데이터 식별
5. **데이터 분류 등급**: 공개(Public), 내부(Internal), 기밀(Confidential), 민감(Sensitive) 4단계 분류 적용

## 예상 산출물
- 센서-데이터 인벤토리
- 데이터 흐름도 (Data Flow Diagram)
- 데이터 분류표 (Data Classification Matrix)

## 담당 부서 (제안)
데이터보호팀(DPO) + HW팀 + SW팀`,
    },
    {
      category: 'privacy', region: 'eu',
      title: '데이터 처리 목적 및 법적 근거 정의 (GDPR Art.6 기준)',
      priority: 'critical', sortOrder: 31,
      description: `## 왜 중요한가
GDPR Art.6은 개인정보 처리를 위한 6가지 법적 근거를 규정합니다. 각 데이터 처리 목적마다 적절한 법적 근거를 사전에 정의하지 않으면, 처리 자체가 위법이 됩니다.

## 구체적으로 할 일
1. **처리 목적 정의**: 로봇 운용(내비게이션, 장애물 회피), 사용자 인식(음성 명령, 얼굴 인식), 서비스 개선(AI 학습), 안전(사고 기록) 등 목적별 분류
2. **법적 근거 매핑**: 각 목적별 Art.6(1)(a)동의, (b)계약이행, (c)법적의무, (f)정당한 이익 중 적합한 근거 선택
3. **동의 메커니즘 설계**: 동의가 필요한 처리의 경우 자유롭고 구체적이며 고지에 기반한 동의(FIPIC) 획득 방법
4. **DPIA(Data Protection Impact Assessment)**: 고위험 처리(대규모 모니터링, 취약계층 데이터)에 대한 영향 평가 수행
5. **처리 활동 기록(ROPA)**: Art.30에 따른 처리 활동 기록부 작성

## 예상 산출물
- 처리 목적 및 법적 근거 매핑표
- DPIA 보고서
- ROPA (Record of Processing Activities)

## 담당 부서 (제안)
DPO + 법무팀(EU) + SW팀`,
    },
    {
      category: 'privacy', region: 'international',
      title: 'On-device vs Cloud 처리 아키텍처 결정',
      priority: 'critical', sortOrder: 32,
      description: `## 왜 중요한가
개인정보를 클라우드로 전송하면 국경 간 이전 이슈, 해킹 리스크, Unitree 사례와 같은 신뢰 문제가 발생합니다. 반면 온디바이스 처리는 컴퓨팅 파워 한계로 AI 성능이 제한됩니다. 이 균형이 프라이버시 전략의 핵심입니다.

## 구체적으로 할 일
1. **처리 유형별 분류**: 실시간 내비게이션(온디바이스 필수), AI 학습(클라우드 가능), 음성 인식(엣지 vs 클라우드)
2. **Edge AI 성능 벤치마크**: 온보드 SoC에서 처리 가능한 AI 모델 범위 평가 (Qualcomm/NVIDIA 칩셋 기준)
3. **하이브리드 아키텍처 설계**: 개인정보는 온디바이스 처리, 익명화된 데이터만 클라우드 전송하는 구조
4. **Federated Learning 검토**: 원본 데이터를 전송하지 않고 모델만 업데이트하는 연합학습 적용 가능성
5. **기술적 보장 수단**: 차분 프라이버시(Differential Privacy), 동형 암호(Homomorphic Encryption) 등 PET(Privacy Enhancing Technologies) 검토

## 예상 산출물
- 데이터 처리 위치 결정 매트릭스
- Edge AI 벤치마크 보고서
- 프라이버시 보존 아키텍처 설계서

## 담당 부서 (제안)
AI팀 + SW아키텍처팀 + DPO`,
    },
    {
      category: 'privacy', region: 'international',
      title: '데이터 최소 수집 원칙 (Data Minimization) 설계',
      priority: 'high', sortOrder: 33,
      description: `## 왜 중요한가
GDPR Art.5(1)(c)의 데이터 최소화 원칙은 목적에 필요한 최소한의 데이터만 수집하도록 요구합니다. "나중에 쓸 수 있으니 일단 수집"은 위법입니다.

## 구체적으로 할 일
1. **센서별 필요성 검증**: 각 센서가 어떤 기능에 필수적인지 매핑 — 불필요한 센서 상시 가동 제거
2. **해상도/정밀도 최적화**: 내비게이션에 HD 카메라가 필요한가? 저해상도로도 충분하다면 다운샘플링
3. **저장 최소화**: 실시간 처리 후 즉시 폐기하는 데이터 vs 저장이 필요한 데이터 구분
4. **Privacy Mode**: 사용자가 특정 센서를 비활성화할 수 있는 프라이버시 모드 설계
5. **주기적 리뷰**: 수집 데이터의 필요성을 정기적으로 재검토하는 프로세스 수립

## 예상 산출물
- 센서-기능 필요성 매핑표
- 데이터 최소화 설계 가이드라인
- Privacy Mode 기능 사양서

## 담당 부서 (제안)
DPO + 제품기획팀 + SW팀`,
    },
    {
      category: 'privacy', region: 'international',
      title: '다중 사용자 동의 메커니즘 (가정 내 가족, 방문객 등)',
      priority: 'high', sortOrder: 34,
      description: `## 왜 중요한가
가정용 로봇은 소유자만 사용하지 않습니다. 가족 구성원, 방문객, 배달원 등 다양한 사람이 로봇의 센서 범위에 들어옵니다. 각자에게 어떻게 동의를 받을 것인가는 실질적으로 해결하기 어려운 문제입니다.

## 구체적으로 할 일
1. **사용자 유형 분류**: 소유자, 등록 가족, 비등록 거주자, 일시 방문자, 우연한 접근자
2. **동의 수준 차등화**: 소유자(전체 동의), 등록 가족(옵트인 선택), 방문자(고지+일시 데이터 수집 최소화)
3. **고지 방법 설계**: LED 표시등(녹화 중 표시), 음성 안내("카메라가 작동 중입니다"), QR코드(프라이버시 정책 링크)
4. **아동 보호**: COPPA(미국), GDPR Art.8(EU), 아동 개인정보 특별 보호 조치
5. **게스트 모드**: 방문객 감지 시 자동으로 데이터 수집 범위를 최소화하는 모드

## 예상 산출물
- 다중 사용자 동의 프레임워크
- 고지 메커니즘 UX 설계서
- 게스트 모드 기능 사양서

## 담당 부서 (제안)
DPO + UX팀 + 법무팀`,
    },
    {
      category: 'privacy', region: 'international',
      title: '원격 조종(Teleoperation) 시 데이터 접근 범위 및 고지',
      priority: 'high', sortOrder: 35,
      description: `## 왜 중요한가
원격 조종 시 운영자가 로봇의 카메라/마이크를 통해 가정 내부를 실시간으로 볼 수 있습니다. 이는 도청/감시와 다름없어 사용자 신뢰를 크게 훼손할 수 있습니다.

## 구체적으로 할 일
1. **원격 접근 범위 정의**: 텔레오퍼레이션 시 접근 가능한 센서 데이터를 명시적으로 제한
2. **고지 메커니즘**: 원격 접속 시 사용자에게 즉시 알림(LED 색상 변경, 화면 팝업, 음성 안내)
3. **동의 프로토콜**: 원격 접속 전 사용자 승인 요구 여부 및 방법
4. **녹화/저장 금지**: 원격 조종 중 영상/음성 녹화 금지 또는 엄격한 접근 통제
5. **감사 로그**: 누가 언제 어떤 데이터에 접근했는지 완전한 감사 추적(Audit Trail)

## 예상 산출물
- 텔레오퍼레이션 데이터 접근 정책
- 사용자 고지 UX 설계서
- 감사 로그 시스템 설계서

## 담당 부서 (제안)
DPO + SW팀 + UX팀`,
    },
    {
      category: 'privacy', region: 'international',
      title: 'AI 모델 학습 데이터 사용 여부에 대한 Opt-in/Opt-out 정책',
      priority: 'high', sortOrder: 36,
      description: `## 왜 중요한가
고객 현장 데이터를 AI 모델 개선에 활용하는 것은 서비스 품질 향상에 필수적이지만, 투명하게 고지하고 선택권을 주지 않으면 GDPR 위반이자 신뢰 상실로 이어집니다.

## 구체적으로 할 일
1. **학습 데이터 범위 정의**: AI 학습에 사용될 수 있는 데이터와 절대 사용하지 않는 데이터 구분
2. **Opt-in vs Opt-out 결정**: GDPR은 동의 기반(Opt-in), 미국은 통지-선택(Opt-out) — 시장별 전략
3. **익명화 파이프라인**: 학습 데이터에서 개인 식별 정보를 제거하는 기술적 파이프라인 설계
4. **투명성 보고서**: 어떤 데이터가 어떤 목적으로 학습에 사용되었는지 정기 보고서 발행
5. **철회 절차**: 사용자가 학습 동의를 철회할 경우 이미 학습된 모델에서의 "잊혀질 권리" 기술적 구현 방안 (Machine Unlearning)

## 예상 산출물
- AI 학습 데이터 정책 문서
- 익명화 파이프라인 설계서
- 동의 철회 대응 기술 방안

## 담당 부서 (제안)
DPO + AI팀 + 법무팀`,
    },
    {
      category: 'privacy', region: 'international',
      title: '데이터 보존 기간 및 삭제 정책',
      priority: 'high', sortOrder: 37,
      description: `## 왜 중요한가
GDPR의 Storage Limitation 원칙과 한국 개인정보보호법은 보유 목적이 달성되면 데이터를 지체 없이 파기하도록 요구합니다.

## 구체적으로 할 일
1. **데이터 유형별 보존 기간 설정**: 실시간 내비게이션 데이터(즉시 폐기), 사고 로그(5년), 서비스 개선 데이터(1년) 등
2. **자동 삭제 시스템**: 보존 기간 만료 시 자동 파기하는 기술적 시스템 구축
3. **사용자 삭제 요청(Right to Erasure)**: GDPR Art.17 대응 — 삭제 요청 접수 후 30일 내 처리 프로세스
4. **백업 데이터 처리**: 백업에 포함된 개인정보의 삭제/익명화 방안
5. **삭제 증명**: 삭제가 완료되었음을 증명하는 로그 및 인증서

## 예상 산출물
- 데이터 보존 기간 정책서
- 자동 삭제 시스템 설계서
- 삭제 요청 대응 SOP

## 담당 부서 (제안)
DPO + 인프라팀 + 법무팀`,
    },
    {
      category: 'privacy', region: 'international',
      title: '국경 간 데이터 이전 (Cross-border transfer) 요건',
      priority: 'high', sortOrder: 38,
      description: `## 왜 중요한가
EU GDPR은 적정성 결정이 없는 국가로의 데이터 이전을 엄격히 제한합니다. 한국은 2022년 EU 적정성 결정을 받았으나 조건부입니다. 중국의 데이터 현지화 요구도 고려해야 합니다.

## 구체적으로 할 일
1. **데이터 이전 지도 작성**: 로봇(현지) → LG 클라우드(한국/미국) → AI 서비스(미국) 간 데이터 이동 경로 매핑
2. **이전 근거 확보**: EU→한국(적정성 결정), EU→미국(DPF), 중국→해외(보안 평가/개인정보 출경 평가)
3. **SCC(Standard Contractual Clauses)**: 적정성 결정이 없는 경우의 표준 계약 조항 준비
4. **데이터 현지화 전략**: 중국 데이터는 중국 내 서버에서만 처리하는 등 현지화 요건 대응
5. **TIA(Transfer Impact Assessment)**: 이전 국가의 법 환경이 데이터 보호에 미치는 영향 평가

## 예상 산출물
- 국경 간 데이터 이전 지도
- SCC 계약서(안)
- TIA 보고서

## 담당 부서 (제안)
DPO + 법무팀 + 인프라팀`,
    },
    {
      category: 'privacy', region: 'international',
      title: '익명화/가명화 처리 기준',
      priority: 'medium', sortOrder: 39,
      description: `## 왜 중요한가
적절히 익명화된 데이터는 GDPR 적용 대상이 아닙니다. 그러나 휴머노이드 데이터는 3D 공간 정보, 행동 패턴 등이 결합되면 재식별 가능성이 높아 "진정한 익명화"가 어렵습니다.

## 구체적으로 할 일
1. **익명화 vs 가명화 구분**: 익명화(GDPR 미적용), 가명화(GDPR 적용, 단 추가 보호조치로 인정)
2. **기술적 방법 선정**: k-익명화, l-다양성, 차분 프라이버시, 데이터 마스킹, 일반화 등
3. **재식별 리스크 평가**: "motivated intruder test" — 합리적으로 이용 가능한 수단으로 재식별 가능한지
4. **공간 데이터 처리**: 3D 포인트 클라우드, SLAM 맵에서 개인 식별 요소 제거 방법
5. **정기 재평가**: 기술 발전에 따라 재식별 리스크가 변하므로 정기적 재평가 프로세스

## 예상 산출물
- 익명화/가명화 기술 가이드라인
- 재식별 리스크 평가 보고서
- 공간 데이터 프라이버시 처리 가이드

## 담당 부서 (제안)
DPO + 데이터사이언스팀 + AI팀`,
    },
    {
      category: 'privacy', region: 'international',
      title: '사이버보안 침해 시 데이터 유출 대응 계획',
      priority: 'high', sortOrder: 40,
      description: `## 왜 중요한가
GDPR은 데이터 유출 발생 시 72시간 내 감독기관에 통보, 고위험 시 데이터 주체에게도 통보를 요구합니다. 한국 개인정보보호법도 유사한 통지 의무가 있습니다.

## 구체적으로 할 일
1. **사고 대응 팀(CSIRT) 구성**: 보안, 법무, 커뮤니케이션, 경영진 포함 대응 조직 구성
2. **대응 플레이북 작성**: 탐지 → 격리 → 분석 → 통지 → 복구 → 사후 분석 단계별 SOP
3. **통지 템플릿 준비**: GDPR 72시간 통지, 한국 PIPC 통지, 미국 주별 통지 요건별 사전 템플릿
4. **침해 시뮬레이션(Tabletop Exercise)**: 분기별 모의 침해 훈련으로 대응 역량 점검
5. **로봇 원격 잠금**: 해킹된 로봇을 즉시 비활성화할 수 있는 Kill Switch 메커니즘

## 예상 산출물
- 사고 대응 플레이북
- 통지 템플릿 (EU/한국/미국)
- Kill Switch 시스템 설계서

## 담당 부서 (제안)
보안팀 + DPO + 법무팀 + 커뮤니케이션팀`,
    },
    {
      category: 'privacy', region: 'international',
      title: 'Privacy by Design을 LG의 경쟁 차별화 요소로 포지셔닝',
      priority: 'critical', sortOrder: 41,
      description: `## 왜 중요한가
Unitree G1 데이터 유출 사건은 중국 업체들의 프라이버시 약점을 명확히 드러냈습니다. LG가 "Privacy by Design" 기조를 전면에 내세우면 EU·미국 시장에서 신뢰 기반 차별화가 가능합니다. 이것은 단순한 규제 준수가 아니라 비즈니스 전략입니다.

## 구체적으로 할 일
1. **Privacy by Design 7원칙 적용**: Ann Cavoukian의 7원칙을 CLOiD/KAPEX 설계에 구체적으로 반영하는 방법 정의
2. **프라이버시 인증 취득**: ISO 27701(PIMS), TrustArc, ePrivacyseal 등 프라이버시 인증 취득 계획
3. **투명성 대시보드**: 사용자가 실시간으로 "로봇이 지금 무엇을 보고, 듣고, 저장하는지" 확인할 수 있는 대시보드
4. **마케팅 전략**: "Your Privacy, Our Priority" — 프라이버시를 핵심 USP(Unique Selling Point)로 포지셔닝
5. **경쟁사 벤치마크**: Tesla Optimus, Figure, Unitree 등 경쟁사의 프라이버시 정책 비교 분석 → LG 우위 입증 자료
6. **White Paper 발행**: LG 휴머노이드의 프라이버시 보호 기술/정책을 상세히 설명하는 White Paper 발행

## 예상 산출물
- Privacy by Design 적용 보고서
- 프라이버시 인증 취득 로드맵
- 마케팅용 프라이버시 White Paper
- 경쟁사 프라이버시 벤치마크

## 담당 부서 (제안)
DPO + 마케팅팀 + 제품기획팀 + 경영전략팀`,
    },
  ]).returning();

  const checklistItems = [...policyItems, ...safetyItems, ...legalItems, ...privacyItems];

  // ===== REGULATORY SOURCES =====
  await db.insert(regulatorySources).values([
    { name: '국가법령정보센터', url: 'https://www.law.go.kr/RSS/lsRss.do', type: 'rss', region: 'korea', category: 'policy', schedule: 'daily' },
    { name: '규제정보포털', url: 'https://www.better.go.kr', type: 'webpage', region: 'korea', category: 'policy', schedule: 'daily' },
    { name: 'EUR-Lex AI Act', url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj', type: 'webpage', region: 'eu', category: 'policy', schedule: 'weekly' },
    { name: 'Congress.gov Robot Bills', url: 'https://api.congress.gov/v3/bill', type: 'api', region: 'us', category: 'policy', schedule: 'daily' },
    { name: 'MIIT Announcements', url: 'https://www.miit.gov.cn', type: 'webpage', region: 'china', category: 'policy', schedule: 'weekly' },
    { name: 'ISO Standards Updates', url: 'https://www.iso.org/rss', type: 'rss', region: 'international', category: 'safety', schedule: 'weekly' },
    { name: 'IAPP Privacy News', url: 'https://iapp.org/rss', type: 'rss', region: 'international', category: 'privacy', schedule: 'daily' },
    { name: 'IRobot News Korea', url: 'https://www.irobotnews.com', type: 'webpage', region: 'korea', category: 'policy', schedule: 'daily' },
  ]);

  // ===== SAMPLE UPDATES =====
  await db.insert(regulatoryUpdates).values([
    {
      regulationId: regs[0]!.id, // 지능형로봇법
      title: 'Korea 2026 R&D Focus: Humanoid Safety Standards & Component Localization',
      titleKo: '2026년 한국 정부 R&D 방향: 휴머노이드 안전기준 마련과 핵심부품 국산화',
      updateType: 'guidance',
      category: 'policy',
      region: 'korea',
      summary: 'KEIT 박일우 로봇PD: R&D를 휴머노이드 안전기준 마련과 핵심부품 국산화에 집중. 2027년까지 표준화된 안전성 평가 데이터셋과 시험 방법 마련, 2028년 국가로봇테스트필드와 연계해 종합 검증 체계 완성 목표.',
      summaryKo: 'KEIT 박일우 로봇PD는 올해 R&D를 휴머노이드 안전기준 마련과 핵심부품 국산화에 집중한다고 밝힘. 2027년까지 표준화된 안전성 평가 데이터셋과 시험 방법을 마련하고, 2028년에는 국가로봇테스트필드와 연계해 종합 검증 체계를 완성할 목표.',
      lgImpact: 'high',
      lgActionRequired: '국가로봇테스트필드 사전 협의 및 안전기준 마련 참여',
      sourceUrl: 'https://www.irobotnews.com/news/articleView.html?idxno=35621',
      sourceName: 'IRobot News',
      publishedAt: new Date('2026-03-15'),
      detectedBy: 'manual',
    },
    {
      regulationId: regs[3]!.id, // MIIT
      title: 'China Releases World-First Humanoid Intelligence Rating Standard',
      titleKo: '중국, 세계 최초 휴머노이드 지능 등급 표준 발표',
      updateType: 'new_regulation',
      category: 'policy',
      region: 'china',
      summary: 'Beijing Humanoid Robot Innovation Center published T/CIE 298-2025: 4-dimension, 5-level framework with 22 primary indicators and 100+ technical provisions.',
      summaryKo: '베이징 휴머노이드 로봇 혁신센터가 세계 최초 휴머노이드 지능 등급 표준(T/CIE 298-2025) 발표. 4차원 5등급 프레임워크, 22개 1차 지표와 100개 이상 기술 조항 포함.',
      lgImpact: 'high',
      lgActionRequired: '지능 등급 표준 분석 및 CLOiD/KAPEX 매핑',
      sourceUrl: 'https://www.miit.gov.cn',
      sourceName: 'MIIT',
      publishedAt: new Date('2025-05-01'),
      detectedBy: 'manual',
    },
    {
      title: 'Unitree G1 Found Secretly Transmitting Data to Chinese Servers',
      titleKo: 'Unitree G1, 중국 서버로 비밀 데이터 전송 발각',
      updateType: 'enforcement',
      category: 'privacy',
      region: 'international',
      summary: 'Unitree G1 found transmitting audio, video, sensor data to Chinese servers every 5 minutes without user consent. Violates GDPR Art.6 & Art.13, CCPA.',
      summaryKo: 'Unitree G1이 5분마다 오디오, 비디오, 센서 데이터를 사용자 동의 없이 중국 서버로 전송. GDPR 제6조, 제13조, CCPA 위반.',
      lgImpact: 'high',
      lgActionRequired: 'Privacy by Design 차별화 전략 수립, 경쟁사 벤치마크 활용',
      sourceUrl: 'https://spectrum.ieee.org/unitree-g1-data-privacy',
      sourceName: 'IEEE Spectrum',
      publishedAt: new Date('2025-11-01'),
      detectedBy: 'manual',
    },
  ]);

  console.log(`Seeded ${regs.length} regulations, ${checklistItems.length} checklist items, 8 sources, 3 updates`);
}
