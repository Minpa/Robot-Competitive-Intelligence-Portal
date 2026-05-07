// 13개 진입 적합 셀 × CLOiD W/B 동작·Gap 분석 데이터 (v1.1, 2026-05-07 fact-check 적용)
// 모든 CLOiD 스펙은 [추정] — ARGOS 페이지에 실제 스펙 입력 후 정밀화 예정.
//
// v1.1 fact-check 정정 (Humanoid_Deployment_Factcheck_Report.md 기반):
//   "양산" 모호 표현 → 정확한 단계 구분
//   - Digit @ GXO  → 상용 RaaS (mass production 아님, deployment)
//   - Spanx        → 단층 DC RaaS (다층 양산 사례 부재)
//   - Xiaomi EV    → 3시간 자율 trial / pilot 단계
//   - CATL Xiaomo  → 대규모 배치 (deployment, mass production 아님)
//   - Walker S2    → mass delivery 시작 (2025-11)
//   - Toyota TMMC  → commercial RaaS (7대, 2026-02)
//   - HD현대+Persona AI / Mercedes Apollo / Apollo Jabil / AEON / Figure 02 → 파일럿 또는 시제품

export type Verdict = 'cover' | 'partial' | 'gap';
export type Priority = 'High' | 'Mid' | 'Low';
export type GripperConfidence = 'high' | 'medium' | 'low';

export interface SubCellAssessment {
  verdict: Verdict;
  note: string; // 1~2 문장 요약
}

export interface RequiredGripper {
  category: string;          // 예: '평행 그리퍼', 'Soft 그리퍼', 'Multi-그리퍼', '흡착/진공', 'F/T 정밀', '커스텀(FPC 등)'
  detail: string;            // 1~2 문장 구체 스펙·옵션
  confidence: GripperConfidence; // 임원보고용 — 추정 강도
}

export type ActionCategory = 'LOC' | 'MAN' | 'PER' | 'COG' | 'NAV' | 'SAF';

export interface ActionGlossaryEntry {
  code: string;              // 예: 'MAN-02'
  category: ActionCategory;
  plainName: string;         // 임원이 즉시 이해하는 한글 명칭 (예: '단일 물품 픽업')
  description: string;       // 1~2문장 풀이 (왜 이 동작이 필요한지 / 어떤 상황)
}

export interface AbbreviationEntry {
  term: string;              // 예: 'VLA', 'F/T', 'IECEx'
  expansion: string;         // 풀어쓴 명칭 (예: 'Vision-Language-Action 모델')
  description: string;       // 1~2문장 한글 풀이
}

export interface SubCell {
  lv: 1 | 2 | 3 | 4;
  taskName: string;
  coreActions: string[];     // LOC-01, MAN-02 등
  thresholds: string;
  cloidW: SubCellAssessment;
  cloidB: SubCellAssessment;
  priority: Priority;
  benchmark: string;
  devItems: string[];
}

export interface CloidCoverageCell {
  id: string;                 // URL slug
  cellNum: string;            // ⑧
  taskName: string;           // 'Tote 이송'
  sectorName: string;         // '물류'
  taskIdx: number;            // matrix task index (for cross-link)
  sectorIdx: number;
  score: number;              // 7.5 / 8.3 / 9.2 등
  oneLineInsight: string;     // 카드 요약
  subCells: [SubCell, SubCell, SubCell, SubCell];
}

// CLOiD W / B 추정 스펙 (분석 baseline)
export const CLOID_SPECS = {
  W: {
    label: 'CLOiD W (휠형 양팔 Mobile Manipulator)',
    rows: [
      ['이동', '최대 속도', '1.5 m/s'],
      ['이동', '베이스 폭', '600 mm'],
      ['이동', '계단', '❌ 불가'],
      ['이동', '경사', '10도까지'],
      ['이동', '배터리', '5시간'],
      ['조작', '단손 페이로드', '5 kg'],
      ['조작', '양손 페이로드', '10 kg'],
      ['조작', '팔 reach', '750 mm'],
      ['조작', '도달 높이 (max)', '1900 mm'],
      ['조작', '그리핑 정밀도', '1.0 mm'],
      ['조작', '손 DoF', '6 (평행 + 부분 dexterous)'],
      ['인지', 'RGB 카메라', '4대'],
      ['인지', 'LiDAR', '✅ 탑재'],
      ['인지', '손바닥 카메라', '❌ 미탑재'],
      ['인지', 'SLAM', '✅ 가능'],
      ['AI', 'VLA 모델', 'hybrid (onboard + cloud)'],
      ['안전', 'ISO 10218', '진행 중'],
      ['안전', '인간 협업', 'PFL 모드'],
    ],
  },
  B: {
    label: 'CLOiD B (양족 양팔 Biped Humanoid)',
    rows: [
      ['이동', '최대 보행 속도', '1.0 m/s'],
      ['이동', '계단 등반', '✅ 17cm까지'],
      ['이동', '경사', '15도까지'],
      ['이동', '미끄러운 바닥', '❌ 보수적'],
      ['이동', '비정형 지형', '❌ 보수적'],
      ['이동', '배터리', '4시간'],
      ['조작', '도달 높이 (max)', '2000 mm (발돋움 가능)'],
      ['조작', '(W와 동일)', '단손 5 kg / 양손 10 kg / reach 750 mm / 정밀도 1.0 mm'],
      ['안전', '(W와 동일)', 'ISO 10218 진행 중 / PFL 모드'],
    ],
  },
} as const;

// ─────────────────────────────────────────────────────────────────
// 13개 진입 적합 셀 × 4Lv 상세
// 점수는 사용자 v1.0 분석 문서 기준 (matrix data.ts와 일부 차이 있을 수 있음).

export const CELLS: CloidCoverageCell[] = [
  // ─── 9.2점 ─────────────────────────────────────────────────────
  {
    id: 'tote-logistics',
    cellNum: '⑧',
    taskName: 'Tote 이송',
    sectorName: '물류',
    taskIdx: 7, sectorIdx: 3,
    score: 9.2,
    oneLineInsight: 'CLOiD W 평지 우위 + B 계단 cover. 베어로보틱스 결합 시 Lv1~2 즉시 진입 가능.',
    subCells: [
      {
        lv: 1, taskName: 'AMR Tote 정형 이송 (DC 평면)',
        coreActions: ['LOC-01 평지 정속 이동', 'LOC-03 정적 장애물 회피', 'MAN-01 양손 Tote 들기 (≤10kg)'],
        thresholds: '평지 1.0+ m/s, 페이로드 양손 10kg, SLAM, 24/7 운영',
        cloidW: { verdict: 'cover', note: '평지 이동·페이로드·SLAM 모두 cover. 베어로보틱스 결합 시 즉시 진입 가능.' },
        cloidB: { verdict: 'partial', note: '보행 속도 1.0 m/s 한계, 24/7 배터리 부족. 평지에서 휠 대비 비효율.' },
        priority: 'Low',
        benchmark: 'Digit @ GXO/Spanx (상용 RaaS, 16kg payload, 6 ft reach, 4시간 배터리)',
        devItems: ['배터리 24/7 운영 (스왑 또는 빠른 충전 도킹)', 'DC 통로 폭 적응'],
      },
      {
        lv: 2, taskName: 'DC 다 라인 Tote 순회 (Digit @ GXO 누적 10만 Tote)',
        coreActions: ['LOC-01 평지 정속', 'LOC-04 동적 장애물 회피', 'MAN-01 양손 Tote'],
        thresholds: '동적 환경(사람·카트), 다종 컨베이어 인터페이스, 다 위치 순회 자율 계획',
        cloidW: { verdict: 'cover', note: '동적 회피·SLAM cover. 컨베이어 인터페이스 Skill 학습 필요.' },
        cloidB: { verdict: 'partial', note: '보행 속도+배터리 한계. 다 라인 동시 커버 시 휠 대비 효율 떨어짐.' },
        priority: 'Mid',
        benchmark: 'Digit (Spanx/GXO Flowery Branch 누적 10만+ Tote, 상용 RaaS, 단층 DC)',
        devItems: ['컨베이어 → AMR 이재 Skill', '다 라인 작업 큐 자율 계획', '24/7 배터리 운영'],
      },
      {
        lv: 3, taskName: '계단·다층 Tote 이송 (Digit 6 ft reach)',
        coreActions: ['LOC-07 계단 등반 (단높이 17cm)', 'LOC-09 경사 보행 15도', 'MAN-01 양손 Tote'],
        thresholds: '계단 등반 + 페이로드 운반, 6 ft (1830mm) 도달, 양족 균형 제어',
        cloidW: { verdict: 'gap', note: '계단 불가. 휠은 평면 한정.' },
        cloidB: { verdict: 'partial', note: '계단 가능 [추정]. 페이로드 들고 계단 등반·6 ft reach 검증 필요.' },
        priority: 'High',
        benchmark: 'Digit (6 ft reach, 16kg payload, 계단 능력 demo 검증; Spanx는 단층 DC, 다층 양산 사례 부재)',
        devItems: ['Tote 들고 계단 등반 안정성 검증', '양손 페이로드 10→16kg 확보 (Digit 대비 6kg 부족)', '추락 안전 인증 (ISO 13482)', '계단 + 페이로드 동시 부하 시 균형 제어'],
      },
      {
        lv: 4, taskName: '협소 랙 Tote 진입',
        coreActions: ['LOC-06 협소 통로 (60cm 이하)', 'MAN-06 협소 공간 매니퓰레이션', 'PER-03 협소 SLAM'],
        thresholds: '베이스 폭 55cm 이하, 깊이 600mm 랙 진입, 비대칭 reach',
        cloidW: { verdict: 'gap', note: '베이스 폭 600mm → 협소 통로 진입 불가.' },
        cloidB: { verdict: 'partial', note: '양족이 좁은 폭 가능하나 비대칭 reach 한계.' },
        priority: 'Low',
        benchmark: 'Digit 5\'9" 폼팩터도 한계 — 시장 자체가 small.',
        devItems: ['(★ 사업 우선순위 낮음 — Lv4는 시장 small)'],
      },
    ],
  },

  // ─── 8.3점 ─────────────────────────────────────────────────────
  {
    id: 'kitting-logistics',
    cellNum: '②', taskName: 'Kitting', sectorName: '물류',
    taskIdx: 1, sectorIdx: 3, score: 8.3,
    oneLineInsight: 'Lv1 정형 Kitting cover. Lv2~3 다 SKU·다 창고는 VLA 정확도·연속 안정성 검증 필요.',
    subCells: [
      {
        lv: 1, taskName: 'DC Order Kitting (정형)',
        coreActions: ['MAN-02 단일 SKU 픽업', 'MAN-03 정위치 배치', 'PER-04 BOM 인식'],
        thresholds: 'BOM 단일 모델, 픽 정확도 1mm, 처리량 시간당 200~300 pick',
        cloidW: { verdict: 'cover', note: '단일 SKU 픽 → 정위치 배치 cover. 처리량 검증 필요.' },
        cloidB: { verdict: 'cover', note: '동일 cover. 다만 휠 대비 처리량 약함.' },
        priority: 'Low',
        benchmark: 'GXO × Digit Order Picking 상용 RaaS, Apollo Pilot',
        devItems: ['처리량 최적화 (시간당 pick 횟수)'],
      },
      {
        lv: 2, taskName: 'DC 다 SKU Kitting',
        coreActions: ['MAN-02 다 SKU 구분 픽', 'PER-05 Visual SKU 분류', 'COG-02 다 BOM 동시 처리'],
        thresholds: '다종 SKU (수십~수백 종) Visual 인식, BOM 다 모델 관리',
        cloidW: { verdict: 'partial', note: 'VLA 다 SKU 인식 가능 [추정]. 정확도 검증 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: 'Toyota TMMC Digit 7대 commercial RaaS (Woodstock RAV4 plant), Mercedes Apollo 파일럿',
        devItems: ['VLA 모델 SKU 분류 정확도 ≥99%', 'BOM 자율 관리 시스템 통합'],
      },
      {
        lv: 3, taskName: '다 SKU·다 창고 동선 Kit',
        coreActions: ['NAV-03 다 창고 동선 계획', 'MAN-02 다 SKU 픽', 'COG-03 동선 최적화 (TSP)'],
        thresholds: '다 창고·다 라인 자율 동선 계획, 1시간+ 연속 작업',
        cloidW: { verdict: 'partial', note: '동선 계획·SLAM cover. 1시간+ 연속 안정성 검증 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: 'Digit GXO (다 라인 연속 운영 검증)',
        devItems: ['장시간(1시간+) 연속 안정성', '동선 최적화 알고리즘'],
      },
      {
        lv: 4, taskName: '실시간 주문 변경 한정',
        coreActions: ['COG-04 실시간 BOM 재계획', 'MAN-02 다 SKU 픽'],
        thresholds: '실시간 주문 변경 중 작업 중단 없이 BOM 재계획',
        cloidW: { verdict: 'gap', note: '실시간 재계획 능력 [추정] 없음.' },
        cloidB: { verdict: 'gap', note: '동일.' },
        priority: 'Low',
        benchmark: '양산 사례 부재.',
        devItems: ['(시장 small — 우선순위 낮음)'],
      },
    ],
  },

  {
    id: 'connector-battery',
    cellNum: '⑥', taskName: '커넥터 체결', sectorName: '배터리',
    taskIdx: 5, sectorIdx: 2, score: 8.3,
    oneLineInsight: 'Lv1~3 모두 정밀도 1mm→0.5mm 향상 + 고전압 안전 인증 필수. CATL Xiaomo 대규모 배치 추격.',
    subCells: [
      {
        lv: 1, taskName: '셀 단계 BMS 커넥터',
        coreActions: ['MAN-07 정밀 커넥터 삽입 (≤1mm)', 'MAN-09 토크 제어', 'PER-06 6D pose estimation'],
        thresholds: '0.5mm 정밀 정렬, 토크 제어, 삽입 성공 확인 (Force feedback)',
        cloidW: { verdict: 'partial', note: '1mm 정밀도 [추정] — 0.5mm 미달 가능. F/T 제어 cover.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'High',
        benchmark: 'CATL Xiaomo (Spirit AI) 99% 성공률, 일일 워크로드 사람 3배',
        devItems: ['정밀도 1mm → 0.5mm 향상 (손바닥 카메라 추가)', 'F/T 손목 정밀화'],
      },
      {
        lv: 2, taskName: '모듈 BMS 커넥터 체결',
        coreActions: ['MAN-07 다종 커넥터 삽입', 'MAN-09 토크 제어', 'PER-06 다종 커넥터 인식'],
        thresholds: '다종 커넥터 (수~십 종) 인식·삽입, 각도 변동 적응',
        cloidW: { verdict: 'partial', note: '다종 인식 VLA 가능. 정밀도는 미달 가능.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'High',
        benchmark: 'CATL Xiaomo 모듈 대규모 배치',
        devItems: ['다종 커넥터 라이브러리 학습', '정밀도 향상'],
      },
      {
        lv: 3, taskName: 'Pack 다 위치 고전압 체결 (Xiaomo 99% 대규모 배치)',
        coreActions: ['MAN-08 고전압 안전 체결', 'MAN-10 양손 협조 체결', 'PER-07 비정형 위치 인식'],
        thresholds: '고전압 (400V+) 절연 안전, 비정형 위치 양손 협조, IECEx 인증 가능성',
        cloidW: { verdict: 'partial', note: '양손 협조 cover. 굽힘 자세 안정성·고전압 안전 인증 필요.' },
        cloidB: { verdict: 'partial', note: '굽힘 자세 양족이 유리. 고전압 안전 인증 미보유 [추정].' },
        priority: 'High',
        benchmark: 'CATL Xiaomo (세계 최초 대규모 배치 2025.12, Luoyang Zhongzhou, 99% 성공률)',
        devItems: ['고전압 작업 절연 안전 인증', '비정형 위치 6D pose 정확도', '양손 협조 정밀 작업 검증'],
      },
      {
        lv: 4, taskName: 'EOL/DCR 미세 정밀 체결',
        coreActions: ['MAN-11 미세 (0.1mm) 정밀 체결', 'PER-08 sub-mm 정렬'],
        thresholds: '0.1mm 정밀도, 광학 sub-mm 정렬',
        cloidW: { verdict: 'gap', note: '정밀도 한계 (1mm → 0.1mm 불가).' },
        cloidB: { verdict: 'gap', note: '동일.' },
        priority: 'Low',
        benchmark: '양산 사례 부재 (전용 정밀 자동화 영역)',
        devItems: ['(휴머노이드 진입 한계 영역, 산업R 영역)'],
      },
    ],
  },

  {
    id: 'box-closing-logistics',
    cellNum: '⑩', taskName: '박스 마감', sectorName: '물류',
    taskIdx: 9, sectorIdx: 3, score: 8.3,
    oneLineInsight: 'Lv1 정형 패킹 cover. Lv2~3 보호재·부정형 박스 Skill 추가 필요.',
    subCells: [
      {
        lv: 1, taskName: 'DC 정형 Packing',
        coreActions: ['MAN-12 정형 박스 접기·테이프', 'MAN-03 정위치 SKU 배치', 'COG-07 패킹 순서 계획'],
        thresholds: '표준 박스 (DC L/M/S 3종) 접기·테이핑, 시간당 100~150 박스',
        cloidW: { verdict: 'cover', note: '정형 패킹 cover.' },
        cloidB: { verdict: 'cover', note: '동일.' },
        priority: 'Low',
        benchmark: 'GXO × Digit 상용 RaaS',
        devItems: ['처리량 최적화'],
      },
      {
        lv: 2, taskName: 'DC 다 SKU Packing',
        coreActions: ['MAN-12 다 사이즈 박스 적응', 'MAN-13 보호재 채우기', 'COG-08 SKU별 패킹 순서'],
        thresholds: '다 사이즈 박스 (수~십 종), 보호재 채우기 자율 판단',
        cloidW: { verdict: 'partial', note: '다 사이즈 적응 VLA cover. 보호재 채우기 Skill 추가 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: 'GXO 상용 RaaS',
        devItems: ['보호재 채우기 Skill (양 판단)', '다 사이즈 박스 라이브러리'],
      },
      {
        lv: 3, taskName: 'DC 부정형 박스 마감 (Figure 03식)',
        coreActions: ['MAN-14 부정형 박스 접기', 'MAN-15 비정형 SKU 패킹', 'PER-09 부정형 형상 인식'],
        thresholds: '부정형 박스 즉석 접기, 비정형 SKU (의류 등) 패킹',
        cloidW: { verdict: 'partial', note: 'VLA 부정형 인식 cover. 부정형 박스 접기 Skill 미보유 [추정].' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: 'Figure 03 의류 패킹 시연',
        devItems: ['부정형 박스 접기 Skill', '비정형 SKU 패킹 학습 데이터'],
      },
      {
        lv: 4, taskName: '맞춤 포장 한정',
        coreActions: ['MAN-16 맞춤 리본·포장지'],
        thresholds: '맞춤 포장 (선물 등) 자율 수행',
        cloidW: { verdict: 'gap', note: '맞춤 포장 능력 미보유.' },
        cloidB: { verdict: 'gap', note: '동일.' },
        priority: 'Low',
        benchmark: '양산 사례 부재.',
        devItems: ['(시장 small)'],
      },
    ],
  },

  {
    id: 'welding-shipbuilding',
    cellNum: '⑪', taskName: '용접·도장', sectorName: '조선',
    taskIdx: 10, sectorIdx: 6, score: 8.3,
    oneLineInsight: 'CLOiD B 협소·비정형 자세 유리. 용접 Skill·IECEx·IP65 모두 신규 개발 필요. HD현대·한화오션 협업 핵심.',
    subCells: [
      {
        lv: 1, taskName: '내업 평면 용접',
        coreActions: ['MAN-17 용접 토치 운용', 'MAN-09 토크 제어'],
        thresholds: '평면 용접 토치 운용, 산업R 영역',
        cloidW: { verdict: 'gap', note: '산업R 영역. 휴머노이드 진입 의미 없음.' },
        cloidB: { verdict: 'gap', note: '동일.' },
        priority: 'Low',
        benchmark: '산업R 50년 검증 (KUKA, ABB, FANUC)',
        devItems: ['(산업R 영역 — 휴머노이드 진입 비효율)'],
      },
      {
        lv: 2, taskName: '곡면 외판 용접 (HD현대 + Persona AI 시제품)',
        coreActions: ['MAN-17 용접 토치', 'MAN-18 곡면 추종', 'PER-10 곡면 path 인식'],
        thresholds: '곡면 path tracking, 추종 정밀도 1mm, 용접 인증 (KS/AWS)',
        cloidW: { verdict: 'gap', note: '곡면 path 추종 능력 [추정] 없음 — 신규 개발 필요.' },
        cloidB: { verdict: 'partial', note: '비정형 자세 가능. 용접 Skill·인증 미보유.' },
        priority: 'High',
        benchmark: 'HD현대 + Persona AI 시제품 (2026말 prototype 완료 → 2027 field testing/commercial 예정)',
        devItems: ['용접 토치 운용 Skill', '곡면 path tracking', '용접 인증 (KS/AWS)', '용접 환경 IP 등급 (스파크·열) 향상'],
      },
      {
        lv: 3, taskName: '협소 블록 내부 용접 (HD현대)',
        coreActions: ['LOC-06 협소 진입', 'MAN-17 용접', 'BAL-04 비정형 자세'],
        thresholds: '협소 (60cm 이하) 진입, IECEx 방폭 인증, 추종 정밀도',
        cloidW: { verdict: 'gap', note: '협소 진입 + 용접 모두 미보유.' },
        cloidB: { verdict: 'partial', note: '협소 진입 양족 유리. 용접 Skill 미보유.' },
        priority: 'High',
        benchmark: 'HD현대 (Persona AI 시제품)',
        devItems: ['IECEx 방폭 인증', '협소 진입 + 용접 결합', 'Persona AI 협업 또는 자체 개발'],
      },
      {
        lv: 4, taskName: '선체 도장 (한화오션 2030 100%)',
        coreActions: ['MAN-19 도장 스프레이', 'PER-12 도장 면적 인식', 'BAL-04 비정형 자세'],
        thresholds: '도장 스프레이 운용, IECEx 방폭, IP65 (페인트 분진)',
        cloidW: { verdict: 'gap', note: '도장 Skill·IECEx 미보유.' },
        cloidB: { verdict: 'partial', note: '비정형 자세 cover. 도장 Skill·인증 미보유.' },
        priority: 'High',
        benchmark: '한화오션 2030 도장 100% 자동화 목표',
        devItems: ['도장 스프레이 Skill', 'IECEx + IP65 인증', '한화오션 협업 가능성'],
      },
    ],
  },

  // ─── 7.5점 ─────────────────────────────────────────────────────
  {
    id: 'binpicking-logistics',
    cellNum: '①', taskName: 'Bin Picking', sectorName: '물류',
    taskIdx: 0, sectorIdx: 3, score: 7.5,
    oneLineInsight: 'Lv1 정형 Bin cover. Lv3 비정형 SKU는 Soft 그리퍼 옵션 + VLA 학습 데이터 필요.',
    subCells: [
      {
        lv: 1, taskName: 'DC 정형 Bin Staging',
        coreActions: ['MAN-02 정형 Bin 픽', 'PER-13 Bin 위치 인식', 'COG-09 픽 순서 계획'],
        thresholds: '정형 Bin (LxWxH 표준) 픽업, 시간당 200+ pick',
        cloidW: { verdict: 'cover', note: '정형 Bin 픽 cover.' },
        cloidB: { verdict: 'cover', note: '동일.' },
        priority: 'Low',
        benchmark: 'Apollo Jabil Pilot, Apollo @ Mercedes 파일럿 (한 자릿수 대수)',
        devItems: ['처리량 최적화'],
      },
      {
        lv: 2, taskName: 'DC 다 SKU Bin Picking',
        coreActions: ['MAN-02 다 SKU 픽', 'PER-05 Visual SKU 분류', 'COG-10 다 SKU 픽 순서'],
        thresholds: '다종 SKU 인식·픽, Visual SKU 분류 정확도 99%+',
        cloidW: { verdict: 'partial', note: 'VLA 다 SKU 인식 cover. 정확도 검증 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: 'Apollo Jabil sub-assembly Pilot',
        devItems: ['VLA 정확도 ≥99%', '다 SKU 픽 학습 데이터'],
      },
      {
        lv: 3, taskName: '비정형 SKU Bin Picking',
        coreActions: ['MAN-15 비정형 SKU 픽', 'PER-09 비정형 인식', 'MAN-20 Soft 그리퍼'],
        thresholds: '비정형 SKU (의류·잡화), Soft 그리퍼 또는 multi 그리퍼',
        cloidW: { verdict: 'partial', note: '비정형 픽 가능 [추정]. Soft 그리퍼 옵션 미보유.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: 'Figure 03 의류 시연 (시제품 단계)',
        devItems: ['Soft 그리퍼 모듈', '비정형 SKU 학습'],
      },
      {
        lv: 4, taskName: '랙 상단·반사 SKU 한정',
        coreActions: ['MAN-21 랙 상단 (2m+) 픽', 'PER-14 반사 surface 인식'],
        thresholds: '도달 높이 2m+, 반사 surface 6D pose',
        cloidW: { verdict: 'gap', note: '도달 높이 1900mm 한계.' },
        cloidB: { verdict: 'partial', note: '발돋움 시 2m+ 가능. 반사 인식 Skill 미보유.' },
        priority: 'Low',
        benchmark: '양산 사례 부재.',
        devItems: ['(시장 small)'],
      },
    ],
  },

  {
    id: 'screw-electronics',
    cellNum: '⑤', taskName: '나사 체결', sectorName: '전자가전',
    taskIdx: 4, sectorIdx: 4, score: 7.5,
    oneLineInsight: 'Self-tapping nut Skill + LGE 자사 라인 PoC가 핵심. 협소 라인은 손목 7+ DoF 필요.',
    subCells: [
      {
        lv: 1, taskName: '가전 정형 나사 체결',
        coreActions: ['MAN-22 토크 드라이버 운용', 'MAN-09 토크 제어', 'PER-15 나사 위치 인식'],
        thresholds: '토크 드라이버 운용, ±0.5Nm 정밀도, 정위치 체결',
        cloidW: { verdict: 'partial', note: '토크 드라이버 운용 가능 [추정]. 토크 정밀도 검증 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: '산업R 영역 (가전 라인 표준)',
        devItems: ['토크 정밀도 향상', '드라이버 도구 인터페이스'],
      },
      {
        lv: 2, taskName: 'Self-tapping nut 다 위치 (Xiaomi EV 자율 trial · pilot)',
        coreActions: ['MAN-22 토크 드라이버', 'MAN-23 self-tapping nut 운용', 'PER-16 다 위치 인식'],
        thresholds: 'Self-tapping nut 운용, 다 위치 (수~십 위치), line cycle (3분 이내)',
        cloidW: { verdict: 'partial', note: '다 위치 작업 cover. self-tapping nut Skill 학습 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'High',
        benchmark: 'Xiaomi EV plant (3시간 자율 trial, 90.2% 성공률 · 76초 cycle, pilot 단계 — 양산 아님)',
        devItems: ['Self-tapping nut Skill', 'Line cycle 처리량 최적화', 'LGE 자사 라인 PoC 우선'],
      },
      {
        lv: 3, taskName: 'LGE 자사 협소 체결 PoC',
        coreActions: ['LOC-06 협소 진입', 'MAN-22 토크 드라이버', 'MAN-24 협소 손목 회전'],
        thresholds: '협소 (300mm 이하) 진입, 손목 자유도 7+ 필요',
        cloidW: { verdict: 'partial', note: '베이스 폭 한계로 일부 라인 진입 불가.' },
        cloidB: { verdict: 'partial', note: '양족이 좁은 폭 가능. 손목 자유도 검증 필요.' },
        priority: 'High',
        benchmark: 'LGE 자사 PoC 검토 단계',
        devItems: ['협소 손목 7+ DoF 확보', 'LGE 자사 라인 적용 Skill'],
      },
      {
        lv: 4, taskName: '내부 한정',
        coreActions: ['MAN-25 내부 정밀 체결'],
        thresholds: '제품 내부 (PCB 등) 0.5mm 정밀',
        cloidW: { verdict: 'gap', note: '정밀도 한계.' },
        cloidB: { verdict: 'gap', note: '동일.' },
        priority: 'Low',
        benchmark: '양산 사례 부재.',
        devItems: ['(전용 자동화 영역)'],
      },
    ],
  },

  {
    id: 'connector-electronics',
    cellNum: '⑥', taskName: '커넥터 체결', sectorName: '전자가전',
    taskIdx: 5, sectorIdx: 4, score: 7.5,
    oneLineInsight: 'Foxconn 3C 라인 + Walker S2 mass delivery 추격, LGE FPC 정밀화. 손바닥 카메라·F/T 손목 정밀화 필수.',
    subCells: [
      {
        lv: 1, taskName: '표준 가전 커넥터',
        coreActions: ['MAN-07 정밀 커넥터 삽입', 'MAN-09 토크 제어', 'PER-06 6D pose'],
        thresholds: '표준 가전 커넥터 (USB/HDMI 등), 1mm 정밀',
        cloidW: { verdict: 'partial', note: '1mm 정밀도 cover 가능. 검증 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: '산업R + 일부 휴머노이드 PoC',
        devItems: ['커넥터 라이브러리 (가전용)'],
      },
      {
        lv: 2, taskName: '가전 다종 하네스 체결 (Foxconn 3C 라인 + Walker S2)',
        coreActions: ['MAN-07 다종 커넥터', 'MAN-26 하네스 라우팅 전 체결', 'PER-06 다종 pose'],
        thresholds: '다종 하네스 (Foxconn 3C 라인), 시간당 처리량',
        cloidW: { verdict: 'partial', note: 'VLA 다종 인식 cover.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'High',
        benchmark: 'UBTech Walker S2 mass delivery (2025-11, 수백대 1차) + Foxconn 3C 라인',
        devItems: ['다종 하네스 라이브러리', 'Foxconn 3C 라인 학습'],
      },
      {
        lv: 3, taskName: 'LGE 자사 PCB FPC 체결',
        coreActions: ['MAN-27 FPC (Flexible PCB) 삽입', 'MAN-09 정밀 토크', 'PER-08 sub-mm 정렬'],
        thresholds: 'FPC 정밀 정합 0.5mm, FPC 손상 없는 force 제어',
        cloidW: { verdict: 'partial', note: 'F/T 제어 cover. 0.5mm 정밀도는 미달 가능.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'High',
        benchmark: 'LGE 자사 PoC 검토',
        devItems: ['FPC 전용 그리퍼 또는 손바닥 카메라', '0.5mm 정밀화', 'LGE 자사 라인 PoC'],
      },
      {
        lv: 4, taskName: '협소 내부 한정',
        coreActions: ['LOC-06 협소', 'MAN-25 내부 정밀'],
        thresholds: '제품 내부 협소 + 정밀',
        cloidW: { verdict: 'gap', note: '협소 진입 불가.' },
        cloidB: { verdict: 'gap', note: '협소 + 정밀 모두 한계.' },
        priority: 'Low',
        benchmark: '양산 사례 부재.',
        devItems: ['(전용 자동화 영역)'],
      },
    ],
  },

  {
    id: 'cable-battery',
    cellNum: '⑦', taskName: '케이블 라우팅', sectorName: '배터리',
    taskIdx: 6, sectorIdx: 2, score: 7.5,
    oneLineInsight: 'CATL Xiaomo flexible wiring 대규모 배치 추격. 굽힘 자세는 CLOiD B 유리, dynamic force 제어 필요.',
    subCells: [
      {
        lv: 1, taskName: 'BMS 단순 케이블',
        coreActions: ['MAN-26 케이블 라우팅', 'MAN-28 케이블 결속'],
        thresholds: '단거리·정형 경로 라우팅',
        cloidW: { verdict: 'partial', note: '정형 라우팅 cover. 결속 Skill 검증 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: '산업R + 휴머노이드 PoC',
        devItems: ['케이블 결속 Skill', '케이블 형상 인식'],
      },
      {
        lv: 2, taskName: '모듈 와이어 하네스 라우팅 (CATL)',
        coreActions: ['MAN-26 다발 케이블 라우팅', 'MAN-28 다 결속점', 'PER-17 케이블 다발 인식'],
        thresholds: '다발 케이블 동시 라우팅, 다 결속점 (5~10 점)',
        cloidW: { verdict: 'partial', note: '양손 협조 cover. 다발 처리 Skill 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'High',
        benchmark: 'CATL Xiaomo 모듈 대규모 배치',
        devItems: ['다발 케이블 처리 Skill', 'CATL 대규모 배치 라인 학습'],
      },
      {
        lv: 3, taskName: 'Pack 다 위치 케이블·결속 (Xiaomo flexible)',
        coreActions: ['MAN-26 비정형 라우팅', 'MAN-29 동적 force 조절', 'PER-17 비정형 케이블'],
        thresholds: '비정형 위치, dynamic force (장력 적응), 굽힘 자세',
        cloidW: { verdict: 'partial', note: '동적 force 제어 cover. 굽힘 자세 한계.' },
        cloidB: { verdict: 'partial', note: '굽힘 자세 양족 유리.' },
        priority: 'High',
        benchmark: 'CATL Xiaomo (flexible wiring 대규모 배치)',
        devItems: ['Dynamic force 제어', '굽힘 자세 안정', 'Xiaomo 99% 벤치마크'],
      },
      {
        lv: 4, taskName: '대형 Pack 내부 한정',
        coreActions: ['LOC-06 협소 진입 Pack 내부', 'MAN-30 협소 라우팅'],
        thresholds: '대형 Pack 내부 진입, 협소 라우팅',
        cloidW: { verdict: 'gap', note: '협소 진입 불가.' },
        cloidB: { verdict: 'partial', note: '양족 진입 가능성.' },
        priority: 'Low',
        benchmark: '양산 사례 부재.',
        devItems: ['(시장 small)'],
      },
    ],
  },

  {
    id: 'cable-shipbuilding',
    cellNum: '⑦', taskName: '케이블 라우팅', sectorName: '조선',
    taskIdx: 6, sectorIdx: 6, score: 7.5,
    oneLineInsight: '경사 + 협소 + IECEx 모두 신규. CLOiD B만이 진입 가능. HD현대 협업 필수.',
    subCells: [
      {
        lv: 1, taskName: '내업 평면 케이블 부설',
        coreActions: ['MAN-26 케이블 라우팅', 'MAN-28 결속'],
        thresholds: '평면 케이블 부설, 산업R 영역',
        cloidW: { verdict: 'partial', note: '평면 라우팅 cover. 산업R 효율 더 높음.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Low',
        benchmark: '산업R 영역',
        devItems: ['(산업R 영역)'],
      },
      {
        lv: 2, taskName: '선체 다발 케이블 라우팅·결속',
        coreActions: ['MAN-26 다발 케이블', 'MAN-28 결속', 'BAL-04 비정형 자세'],
        thresholds: '선체 곡면 + 다발 케이블, 경사 보행 + 작업',
        cloidW: { verdict: 'gap', note: '경사 보행 불가.' },
        cloidB: { verdict: 'partial', note: '경사 보행 cover. 다발 케이블 Skill 필요.' },
        priority: 'High',
        benchmark: 'HD현대 + Persona AI 시제품',
        devItems: ['HD현대 협업', '경사 + 양손 작업 검증'],
      },
      {
        lv: 3, taskName: '협소 블록 내 비정형 케이블 부설',
        coreActions: ['LOC-06 협소 진입', 'MAN-26 비정형 케이블', 'BAL-04 자세'],
        thresholds: '협소 진입 + IECEx 인증 + 비정형 작업',
        cloidW: { verdict: 'gap', note: '협소 진입 불가.' },
        cloidB: { verdict: 'partial', note: '협소 진입 양족 유리. IECEx 미보유.' },
        priority: 'High',
        benchmark: 'HD현대 (Persona AI 시제품)',
        devItems: ['IECEx 인증', '협소 작업 검증'],
      },
      {
        lv: 4, taskName: '내부 변동 한정',
        coreActions: ['MAN-30 협소 + 동적 변동'],
        thresholds: '협소 + 실시간 동선 변경',
        cloidW: { verdict: 'gap', note: '한계.' },
        cloidB: { verdict: 'gap', note: '한계.' },
        priority: 'Low',
        benchmark: '양산 사례 부재.',
        devItems: ['(시장 small)'],
      },
    ],
  },

  {
    id: 'tote-automotive-bcg',
    cellNum: '⑧', taskName: 'Tote 이송', sectorName: '자동차BCG',
    taskIdx: 7, sectorIdx: 0, score: 7.5,
    oneLineInsight: 'Mercedes Apollo 파일럿 추격. CLOiD W 평지 takt 동기화·다 라인 작업 큐 핵심.',
    subCells: [
      {
        lv: 1, taskName: '라인 사이드 자재 Tote 공급',
        coreActions: ['LOC-01 평지 이동', 'MAN-01 양손 Tote', 'NAV-01 라인 사이드 SLAM'],
        thresholds: '라인 사이드 자재 공급, 시간 정해진 takt',
        cloidW: { verdict: 'cover', note: '평지 + 양손 + SLAM cover. takt 검증 필요.' },
        cloidB: { verdict: 'partial', note: '보행 속도 한계.' },
        priority: 'Mid',
        benchmark: 'Mercedes Apollo 파일럿 Berlin·Kecskemét (한 자릿수 대수)',
        devItems: ['Takt 시간 동기화', 'Mercedes/BMW 라인 인터페이스'],
      },
      {
        lv: 2, taskName: '다 라인 Tote 순회 공급 (Apollo)',
        coreActions: ['NAV-02 다 라인 순회', 'MAN-01 양손 Tote', 'COG-02 다 라인 작업 큐'],
        thresholds: '다 라인 동시 커버, 1시간+ 연속',
        cloidW: { verdict: 'partial', note: 'SLAM·동선 cover. 1시간+ 연속 안정성 검증.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: 'Mercedes Apollo 파일럿 (Tote delivery, 한 자릿수 대수)',
        devItems: ['배터리 운영', '다 라인 작업 큐'],
      },
      {
        lv: 3, taskName: '비정형 동선 부품 운반',
        coreActions: ['NAV-04 비정형 동선', 'LOC-09 경사면', 'MAN-01 양손 Tote'],
        thresholds: '비정형 라인 (변동 동선), 경사면 일부',
        cloidW: { verdict: 'gap', note: '경사면 한계.' },
        cloidB: { verdict: 'partial', note: '경사 보행 cover.' },
        priority: 'Low',
        benchmark: '파일럿 사례 일부.',
        devItems: ['(자동차 라인 평면 위주)'],
      },
      {
        lv: 4, taskName: '협소 라인 한정',
        coreActions: ['LOC-06 협소'],
        thresholds: '협소 라인 진입',
        cloidW: { verdict: 'gap', note: '협소 불가.' },
        cloidB: { verdict: 'partial', note: '양족 협소 가능.' },
        priority: 'Low',
        benchmark: '양산 사례 부재.',
        devItems: ['(시장 small)'],
      },
    ],
  },

  {
    id: 'palletize-logistics',
    cellNum: '⑨', taskName: 'Tote·박스 적재', sectorName: '물류',
    taskIdx: 8, sectorIdx: 3, score: 7.5,
    oneLineInsight: 'Lv1~2 상용 RaaS 임박. 양손 페이로드 10kg → 15kg 향상이 결정적.',
    subCells: [
      {
        lv: 1, taskName: 'DC 정형 Palletizing',
        coreActions: ['MAN-01 양손 박스 (≤15kg)', 'MAN-31 적재 패턴', 'COG-11 적재 순서 계획'],
        thresholds: '단일 SKU·정형 적재, 페이로드 15kg, 적재 패턴 계획',
        cloidW: { verdict: 'partial', note: '15kg 페이로드 한계 (양손 10kg).' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'High',
        benchmark: '산업R + Apollo Pilot',
        devItems: ['양손 페이로드 15kg 확보', '적재 패턴 라이브러리'],
      },
      {
        lv: 2, taskName: 'DC 다 SKU 박스 적재',
        coreActions: ['MAN-01 다 SKU 적재', 'COG-12 다 SKU 적재 패턴', 'PER-05 SKU 분류'],
        thresholds: '다 SKU 적재 패턴 자율 계획, 페이로드 15kg',
        cloidW: { verdict: 'partial', note: '페이로드 한계.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'High',
        benchmark: 'GXO 상용 RaaS',
        devItems: ['페이로드 향상', 'SKU별 적재 자율'],
      },
      {
        lv: 3, taskName: 'DC 부정형 적재·랙 진입',
        coreActions: ['MAN-15 부정형 박스', 'LOC-05 협소 통로 (~80cm)', 'MAN-21 랙 진입'],
        thresholds: '부정형 박스, 협소 통로, 랙 진입',
        cloidW: { verdict: 'partial', note: '협소 통로 cover. 부정형 적재 Skill 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: 'GXO 상용 RaaS',
        devItems: ['부정형 박스 적재 Skill'],
      },
      {
        lv: 4, taskName: '협소·고층 적재',
        coreActions: ['LOC-06 협소', 'MAN-21 고층 (2m+) 적재'],
        thresholds: '협소 + 도달 높이 2m+',
        cloidW: { verdict: 'gap', note: '협소 + 도달 한계.' },
        cloidB: { verdict: 'partial', note: '발돋움 가능성.' },
        priority: 'Low',
        benchmark: '양산 사례 부재.',
        devItems: ['(시장 small)'],
      },
    ],
  },

  {
    id: 'inspection-shipbuilding',
    cellNum: '⑫', taskName: '점검·계측', sectorName: '조선',
    taskIdx: 11, sectorIdx: 6, score: 7.5,
    oneLineInsight: 'IP65+ / IECEx 인증이 진입 게이트. CLOiD B 협소·경사 cover. HD현대 야드 운용 라인 학습 필수.',
    subCells: [
      {
        lv: 1, taskName: '의장 점검',
        coreActions: ['NAV-05 의장 위치 이동', 'PER-18 외관 검사 RGB', 'COG-13 anomaly 검출'],
        thresholds: '의장 외관·치수 점검, RGB + 측정',
        cloidW: { verdict: 'partial', note: '평지 의장 cover. 조선 환경 IP 등급 필요.' },
        cloidB: { verdict: 'partial', note: '동일.' },
        priority: 'Mid',
        benchmark: 'HD현대 야드 점검 (Spot 등 4족 RaaS)',
        devItems: ['IP65+ 환경 인증', 'HD현대 협업'],
      },
      {
        lv: 2, taskName: '블록 순회 점검 (HD현대)',
        coreActions: ['NAV-06 블록 순회', 'LOC-09 경사', 'PER-18 외관 검사'],
        thresholds: '블록 다 위치 자율 순회, 경사 보행, IP65+',
        cloidW: { verdict: 'gap', note: '경사 한계.' },
        cloidB: { verdict: 'partial', note: '경사 cover. IP65+ 인증 필요.' },
        priority: 'High',
        benchmark: 'HD현대 야드 점검 (Spot 등 4족 RaaS)',
        devItems: ['IP65+ 인증', '경사 + 작업 검증', 'HD현대 야드 운용 학습'],
      },
      {
        lv: 3, taskName: '블록 내부 협소 점검 (HD현대)',
        coreActions: ['LOC-06 협소', 'BAL-04 자세', 'PER-19 협소 SLAM'],
        thresholds: '협소 진입, IECEx 방폭, 비정형 자세',
        cloidW: { verdict: 'gap', note: '협소 불가.' },
        cloidB: { verdict: 'partial', note: '양족 협소 가능. IECEx 미보유.' },
        priority: 'High',
        benchmark: 'HD현대 (Persona AI 시제품)',
        devItems: ['IECEx 인증', '협소 + 비정형 자세 검증'],
      },
      {
        lv: 4, taskName: 'NDE 보조 작업',
        coreActions: ['MAN-32 NDE 도구 운용', 'PER-20 NDE 데이터 수집'],
        thresholds: 'NDE (Non-Destructive Examination) 도구 운용, 정밀 데이터 수집',
        cloidW: { verdict: 'gap', note: 'NDE 도구 미보유.' },
        cloidB: { verdict: 'gap', note: '동일.' },
        priority: 'Low',
        benchmark: 'NDE 전용 자동화 영역',
        devItems: ['(전문 NDE 영역)'],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// 5개 개발 클러스터 (Phase 4 정밀화 가이드)
export const DEV_CLUSTERS = [
  {
    id: 'cluster-1-precision',
    name: '클러스터 1: 정밀도 향상 (1mm → 0.5mm 이하)',
    cells: ['⑥커넥터/배터리', '⑥커넥터/전자가전', '⑤나사/전자가전'],
    direction: '손바닥 카메라 추가 + F/T 손목 정밀화',
    benchmark: 'CATL Xiaomo 99% 성공률 / Foxconn 3C 라인',
    duration: '6~12개월',
  },
  {
    id: 'cluster-2-payload',
    name: '클러스터 2: 양손 페이로드 향상 (10kg → 15kg)',
    cells: ['⑨Tote적재/물류 전체', '⑧Tote/물류 일부'],
    direction: '모터 토크 향상 또는 LGE Axium 액추에이터 채택',
    benchmark: 'Digit 16kg payload',
    duration: '12~18개월 (HW 변경 동반)',
  },
  {
    id: 'cluster-3-certification',
    name: '클러스터 3: 환경 인증 (IP65+, IECEx 방폭)',
    cells: ['⑪용접/조선', '⑦케이블/조선', '⑫점검/조선'],
    direction: 'IP 등급 향상 + IECEx 인증 취득',
    benchmark: 'Persona AI × HD현대 시제품',
    duration: '18~24개월 (인증 절차)',
  },
  {
    id: 'cluster-4-skills',
    name: '클러스터 4: 산업별 Skill 학습 (VLA 데이터셋)',
    cells: ['거의 모든 Lv2~3 셀'],
    direction: '상용 RaaS · 대규모 배치 · 파일럿 라인 학습 데이터 수집 + VLA fine-tuning',
    benchmark: '각 산업 deployment 라인 (Digit RaaS / Xiaomo 배치 / Apollo·Figure 파일럿 등)',
    duration: '산업별 3~6개월',
  },
  {
    id: 'cluster-5-247',
    name: '클러스터 5: 24/7 운영 인프라',
    cells: ['⑧Tote/물류', '⑨Tote적재/물류'],
    direction: '자동 충전 도킹 + 배터리 스왑 시스템',
    benchmark: 'Digit @ GXO 24/7 운영',
    duration: '6~12개월',
  },
];

// ─────────────────────────────────────────────────────────────────
// 통계 계산
export function getStats() {
  let cw = { cover: 0, partial: 0, gap: 0 };
  let cb = { cover: 0, partial: 0, gap: 0 };
  let totalSubcells = 0;
  for (const cell of CELLS) {
    for (const sc of cell.subCells) {
      totalSubcells++;
      cw[sc.cloidW.verdict]++;
      cb[sc.cloidB.verdict]++;
    }
  }
  return { totalSubcells, cw, cb };
}

export function findCellById(id: string): CloidCoverageCell | undefined {
  return CELLS.find(c => c.id === id);
}

export const VERDICT_LABEL: Record<Verdict, { ko: string; emoji: string; color: string; bg: string }> = {
  cover:   { ko: 'Cover',    emoji: '✅', color: '#1a7a3a', bg: '#E6F4EA' },
  partial: { ko: 'Partial',  emoji: '⚠️', color: '#9a6500', bg: '#FFF4D6' },
  gap:     { ko: '개발필요', emoji: '❌', color: '#a01020', bg: '#FBEAF0' },
};

export const PRIORITY_LABEL: Record<Priority, { color: string; bg: string }> = {
  High: { color: '#a01020', bg: '#FBEAF0' },
  Mid:  { color: '#9a6500', bg: '#FFF4D6' },
  Low:  { color: '#5F5E5A', bg: '#F0EEE8' },
};
