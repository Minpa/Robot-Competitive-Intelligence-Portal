import { db } from './index.js';
import {
  ciCompetitors,
  ciLayers,
  ciCategories,
  ciItems,
  ciValues,
  ciFreshness,
  ciValueHistory,
  ciMonitorAlerts,
  ciStaging,
  ciBenchmarkAxes,
  ciBenchmarkScores,
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
  { slug: 'cloid', name: 'CLOiD', manufacturer: 'LG Electronics', country: '🇰🇷', stage: 'development', sortOrder: 6 },
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
    // HW
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
    // SW/AI
    { itemName: '핵심 AI 모델', value: 'Locomotion RL + 조작 IL', confidence: 'B', source: 'Agility Robotics 블로그' },
    { itemName: '학습 방식', value: 'Sim-to-Real RL + 원격조종 IL', confidence: 'B', source: 'Agility Robotics 블로그' },
    { itemName: '추론 위치', value: 'Edge (온보드)', confidence: 'B', source: 'Agility Robotics 공식' },
    { itemName: '자율 작업 범위', value: '단일 작업 자율 수행 (물류)', confidence: 'B', source: 'Amazon PoC 사례' },
    { itemName: '연속 행동 수', value: '~20 연속 행동', confidence: 'C', source: '데모 영상 분석' },
    { itemName: '새 환경 적응', value: '신규 환경 수 시간 튜닝', confidence: 'C', source: 'Agility Robotics 블로그' },
    { itemName: '개발 도구', value: 'Agility Arc SDK', confidence: 'B', source: 'Agility Robotics 공식' },
    { itemName: '시뮬레이션', value: 'Isaac Sim 연동', confidence: 'B', source: 'NVIDIA 파트너십' },
    { itemName: '오픈소스', value: '비공개', confidence: 'A', source: 'Agility Robotics 공식' },
    // Data
    { itemName: '실환경 데이터량', value: 'Amazon 물류창고 수백만 프레임', confidence: 'C', source: '업계 추정' },
    { itemName: '데이터 수집 방식', value: '실배치 + 원격조종', confidence: 'B', source: 'Agility Robotics 블로그' },
    { itemName: '파트너 데이터', value: 'Amazon 물류 데이터', confidence: 'B', source: 'Amazon 파트너십 발표' },
    { itemName: 'GPU 클러스터', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: 'Sim-to-Real', value: 'NVIDIA Isaac 기반', confidence: 'B', source: 'NVIDIA 파트너십' },
    { itemName: '학습 주기', value: '수 주 단위', confidence: 'D', source: '업계 추정' },
    // Biz
    { itemName: '총 펀딩', value: '$179M+', confidence: 'A', source: 'Crunchbase' },
    { itemName: '최근 밸류에이션', value: '비공개 (추정 $1B+)', confidence: 'D', source: '업계 추정' },
    { itemName: '주요 투자자', value: 'DCVC, Playground Global, Amazon', confidence: 'A', source: 'Crunchbase' },
    { itemName: '상용화 단계', value: 'Commercial (제한 배치)', confidence: 'A', source: 'Agility Robotics 공식' },
    { itemName: '배치 대수', value: '~100대+ (Amazon 포함)', confidence: 'C', source: '업계 추정' },
    { itemName: '주요 고객', value: 'Amazon, GXO Logistics', confidence: 'A', source: 'Agility Robotics 공식' },
    { itemName: '가격대', value: '$250K-$300K (추정)', confidence: 'D', source: '업계 추정' },
    { itemName: '제조 파트너', value: 'RoboFab (자체 공장)', confidence: 'A', source: 'Agility Robotics 공식' },
    { itemName: '기술 파트너', value: 'NVIDIA, Amazon', confidence: 'A', source: 'Agility Robotics 공식' },
    { itemName: '생태계 확장', value: 'Agility Arc 파트너 프로그램', confidence: 'B', source: 'Agility Robotics 공식' },
    // Safety
    { itemName: '국제 인증', value: 'UL 인증 진행 중', confidence: 'C', source: '업계 보도' },
    { itemName: 'ISO 표준', value: 'ISO 13482 준수 (목표)', confidence: 'C', source: '업계 보도' },
    { itemName: '충돌 안전', value: '속도 제한 + 충돌 감지', confidence: 'B', source: 'Agility Robotics 공식' },
    { itemName: '규제 전략', value: '산업용 우선 (규제 경량)', confidence: 'B', source: '업계 분석' },
    { itemName: '로비/정책 참여', value: 'HRI 표준화 위원회 참여', confidence: 'C', source: '업계 보도' },
    { itemName: '사고 이력', value: '공개 사고 없음', confidence: 'B', source: '뉴스 모니터링' },
    // IP
    { itemName: '총 특허 수', value: '50+ 특허', confidence: 'C', source: 'Google Patents' },
    { itemName: '핵심 기술 특허', value: '이족보행 제어, 보행 안정화', confidence: 'B', source: 'Google Patents' },
    { itemName: '최근 3개월 출원', value: '5-10건 (추정)', confidence: 'D', source: 'Google Patents' },
    { itemName: '라이선스 모델', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '방어 특허', value: '보행 관련 핵심 특허', confidence: 'C', source: 'Google Patents' },
    { itemName: 'IP 소송', value: '없음', confidence: 'B', source: '뉴스 모니터링' },
  ],
  optimus: [
    // HW
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
    // SW/AI
    { itemName: '핵심 AI 모델', value: 'FSD 기반 End-to-End NN', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: '학습 방식', value: 'Sim-to-Real + 원격조종 IL', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: '추론 위치', value: 'Edge (Tesla SoC)', confidence: 'A', source: 'Tesla AI Day 2024' },
    { itemName: '자율 작업 범위', value: '다중 작업 (공장 내)', confidence: 'C', source: 'Tesla 데모 영상' },
    { itemName: '연속 행동 수', value: '~10-30 연속 행동 (데모)', confidence: 'C', source: 'Tesla 데모 영상' },
    { itemName: '새 환경 적응', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '개발 도구', value: '내부 전용', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: '시뮬레이션', value: 'Tesla 자체 Sim 환경', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: '오픈소스', value: '비공개', confidence: 'A', source: 'Tesla 공식' },
    // Data
    { itemName: '실환경 데이터량', value: 'Tesla 공장 수십억 프레임 (FSD 전용)', confidence: 'C', source: '업계 추정' },
    { itemName: '데이터 수집 방식', value: 'FSD 차량 데이터 + 공장 원격조종', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: '파트너 데이터', value: '자체 데이터 (FSD 공유)', confidence: 'B', source: 'Tesla 공식' },
    { itemName: 'GPU 클러스터', value: 'Dojo + H100 대규모 클러스터', confidence: 'A', source: 'Tesla 공식' },
    { itemName: 'Sim-to-Real', value: 'Tesla Sim (자체 개발)', confidence: 'B', source: 'Tesla AI Day 2024' },
    { itemName: '학습 주기', value: '일 단위 (FSD 인프라 활용)', confidence: 'C', source: '업계 추정' },
    // Biz
    { itemName: '총 펀딩', value: 'Tesla 내부 사업부 (별도 펀딩 없음)', confidence: 'A', source: 'Tesla IR' },
    { itemName: '최근 밸류에이션', value: 'Tesla 시가총액의 일부 (추정 $77B)', confidence: 'C', source: 'Morgan Stanley 보고서' },
    { itemName: '주요 투자자', value: 'Tesla 자체 자금', confidence: 'A', source: 'Tesla IR' },
    { itemName: '상용화 단계', value: 'Pilot (Tesla 공장 내부)', confidence: 'B', source: 'Tesla IR' },
    { itemName: '배치 대수', value: '~50대 (Tesla 공장)', confidence: 'C', source: 'Tesla 실적 발표' },
    { itemName: '주요 고객', value: 'Tesla 내부 우선', confidence: 'A', source: 'Tesla IR' },
    { itemName: '가격대', value: '$20K-$30K (목표, 대량생산 시)', confidence: 'C', source: 'Elon Musk 발언' },
    { itemName: '제조 파트너', value: 'Tesla Gigafactory (자체)', confidence: 'A', source: 'Tesla IR' },
    { itemName: '기술 파트너', value: '없음 (수직 통합)', confidence: 'A', source: 'Tesla 공식' },
    { itemName: '생태계 확장', value: '외부 판매 2026 목표', confidence: 'C', source: 'Elon Musk 발언' },
    // Safety
    { itemName: '국제 인증', value: '미취득 (내부 사용)', confidence: 'B', source: 'Tesla IR' },
    { itemName: 'ISO 표준', value: '준비 중', confidence: 'D', source: '업계 추정' },
    { itemName: '충돌 안전', value: 'FSD 안전 시스템 적용', confidence: 'C', source: 'Tesla AI Day 2024' },
    { itemName: '규제 전략', value: '내부 배치 우선 → 규제 우회', confidence: 'B', source: '업계 분석' },
    { itemName: '로비/정책 참여', value: 'Elon Musk 개인 영향력', confidence: 'B', source: '업계 분석' },
    { itemName: '사고 이력', value: '공개 사고 없음', confidence: 'B', source: '뉴스 모니터링' },
    // IP
    { itemName: '총 특허 수', value: '200+ 특허 (로봇 관련)', confidence: 'C', source: 'Google Patents' },
    { itemName: '핵심 기술 특허', value: '액추에이터, 배터리, VLA', confidence: 'B', source: 'Google Patents' },
    { itemName: '최근 3개월 출원', value: '20-30건', confidence: 'C', source: 'Google Patents' },
    { itemName: '라이선스 모델', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '방어 특허', value: 'FSD/자율주행 관련 대규모', confidence: 'B', source: 'Google Patents' },
    { itemName: 'IP 소송', value: '없음 (로봇 관련)', confidence: 'B', source: '뉴스 모니터링' },
  ],
  figure: [
    // HW
    { itemName: '자유도(DOF)', value: '40+ DOF', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: '키/몸무게', value: '167cm / 60kg', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: '가반하중', value: '20kg', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: '최대속도', value: '4.3 km/h', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: '연속동작시간', value: '~5시간', confidence: 'C', source: 'Figure AI 데모' },
    { itemName: '구동 방식', value: '커스텀 전기 액추에이터', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: '관절 토크', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '손 자유도', value: '16 DOF (5핑거 독자 개발)', confidence: 'A', source: 'Figure AI 공식' },
    { itemName: '비전 시스템', value: 'RGB 스테레오 카메라 + 손목 카메라', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: 'LiDAR/Depth', value: '없음 (비전 기반)', confidence: 'B', source: 'Figure AI 데모' },
    { itemName: '촉각 센서', value: '손가락 촉각 센서 내장', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: 'Force/Torque', value: '손목 F/T 센서', confidence: 'C', source: 'Figure AI 데모 분석' },
    // SW/AI
    { itemName: '핵심 AI 모델', value: 'Helix VLA (자체개발)', confidence: 'A', source: 'Figure AI 공식' },
    { itemName: '학습 방식', value: 'VLA + Sim-to-Real + 원격조종', confidence: 'A', source: 'Figure AI 공식' },
    { itemName: '추론 위치', value: 'Edge (온보드)', confidence: 'B', source: 'Figure AI 데모' },
    { itemName: '자율 작업 범위', value: '다중 작업 자율 수행', confidence: 'A', source: 'Figure AI 공식 데모' },
    { itemName: '연속 행동 수', value: '50+ 연속 행동', confidence: 'B', source: 'Figure AI 데모 영상' },
    { itemName: '새 환경 적응', value: '언어 지시로 새 작업 학습', confidence: 'A', source: 'Figure AI Helix 데모' },
    { itemName: '개발 도구', value: 'Figure SDK (제한 공개)', confidence: 'C', source: 'Figure AI 공식' },
    { itemName: '시뮬레이션', value: 'Genesis Sim (자체)', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: '오픈소스', value: '비공개', confidence: 'A', source: 'Figure AI 공식' },
    // Data
    { itemName: '실환경 데이터량', value: 'BMW 공장 + 자체 랩 대량 수집', confidence: 'C', source: '업계 추정' },
    { itemName: '데이터 수집 방식', value: '원격조종 + 자율 탐색', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: '파트너 데이터', value: 'BMW 제조 데이터, OpenAI 협력', confidence: 'B', source: 'Figure AI 파트너십' },
    { itemName: 'GPU 클러스터', value: '대규모 GPU 클러스터 (비공개)', confidence: 'D', source: '업계 추정' },
    { itemName: 'Sim-to-Real', value: 'Genesis Sim 자체 개발', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: '학습 주기', value: '수 일~수 주', confidence: 'D', source: '업계 추정' },
    // Biz
    { itemName: '총 펀딩', value: '$854M+ (Series B)', confidence: 'A', source: 'Crunchbase' },
    { itemName: '최근 밸류에이션', value: '$2.6B (2024 Series B)', confidence: 'A', source: 'Crunchbase' },
    { itemName: '주요 투자자', value: 'Microsoft, NVIDIA, OpenAI, Bezos, Intel', confidence: 'A', source: 'Crunchbase' },
    { itemName: '상용화 단계', value: 'Pilot (BMW 공장)', confidence: 'A', source: 'Figure AI 공식' },
    { itemName: '배치 대수', value: '~10-20대 (BMW)', confidence: 'C', source: '업계 추정' },
    { itemName: '주요 고객', value: 'BMW', confidence: 'A', source: 'Figure AI 공식' },
    { itemName: '가격대', value: '비공개 (추정 $150K-$200K)', confidence: 'D', source: '업계 추정' },
    { itemName: '제조 파트너', value: '자체 제조 (Sunnyvale)', confidence: 'B', source: 'Figure AI 공식' },
    { itemName: '기술 파트너', value: 'OpenAI, NVIDIA, Microsoft', confidence: 'A', source: 'Figure AI 공식' },
    { itemName: '생태계 확장', value: 'BMW 외 추가 고객 확보 중', confidence: 'C', source: '업계 보도' },
    // Safety
    { itemName: '국제 인증', value: '준비 중', confidence: 'D', source: '업계 추정' },
    { itemName: 'ISO 표준', value: '미확인', confidence: 'D', source: '정보 없음' },
    { itemName: '충돌 안전', value: '속도 제한 + 소프트웨어 안전 장치', confidence: 'C', source: 'Figure AI 데모' },
    { itemName: '규제 전략', value: '산업용 우선 배치', confidence: 'C', source: '업계 분석' },
    { itemName: '로비/정책 참여', value: '미확인', confidence: 'D', source: '정보 없음' },
    { itemName: '사고 이력', value: '공개 사고 없음', confidence: 'B', source: '뉴스 모니터링' },
    // IP
    { itemName: '총 특허 수', value: '30+ 특허 (추정)', confidence: 'D', source: 'Google Patents' },
    { itemName: '핵심 기술 특허', value: 'VLA, 손 조작, 보행 제어', confidence: 'C', source: 'Google Patents' },
    { itemName: '최근 3개월 출원', value: '10-15건 (추정)', confidence: 'D', source: 'Google Patents' },
    { itemName: '라이선스 모델', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '방어 특허', value: 'Helix VLA 관련', confidence: 'C', source: 'Google Patents' },
    { itemName: 'IP 소송', value: '없음', confidence: 'B', source: '뉴스 모니터링' },
  ],
  neo: [
    // HW
    { itemName: '자유도(DOF)', value: '37 DOF', confidence: 'B', source: '1X Technologies 공식' },
    { itemName: '키/몸무게', value: '177cm / 30kg', confidence: 'A', source: '1X Technologies 공식' },
    { itemName: '가반하중', value: '10kg', confidence: 'B', source: '1X Technologies 공식' },
    { itemName: '최대속도', value: '4 km/h (보행)', confidence: 'B', source: '1X Technologies 공식' },
    { itemName: '연속동작시간', value: '2-4시간', confidence: 'C', source: '1X Technologies 데모' },
    { itemName: '구동 방식', value: '소프트 액추에이터 (독자 기술)', confidence: 'A', source: '1X Technologies 공식' },
    { itemName: '관절 토크', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '손 자유도', value: '5핑거 소프트 핸드', confidence: 'B', source: '1X Technologies 공식' },
    { itemName: '비전 시스템', value: '스테레오 카메라', confidence: 'B', source: '1X Technologies 공식' },
    { itemName: 'LiDAR/Depth', value: '없음 (비전 기반)', confidence: 'C', source: '1X Technologies 데모' },
    { itemName: '촉각 센서', value: '소프트 핸드 내장', confidence: 'C', source: '1X Technologies 공식' },
    { itemName: 'Force/Torque', value: '비공개', confidence: 'D', source: '정보 없음' },
    // SW/AI
    { itemName: '핵심 AI 모델', value: 'VLA (자체개발)', confidence: 'B', source: '1X Technologies 블로그' },
    { itemName: '학습 방식', value: 'IL + RL (원격조종 기반)', confidence: 'B', source: '1X Technologies 블로그' },
    { itemName: '추론 위치', value: 'Edge (온보드)', confidence: 'B', source: '1X Technologies 공식' },
    { itemName: '자율 작업 범위', value: '가정용 작업 (청소, 정리 등)', confidence: 'B', source: '1X Technologies 데모' },
    { itemName: '연속 행동 수', value: '~10-20 연속 행동', confidence: 'C', source: '데모 영상 분석' },
    { itemName: '새 환경 적응', value: '일반 가정 환경 대응', confidence: 'C', source: '1X Technologies 데모' },
    { itemName: '개발 도구', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '시뮬레이션', value: '자체 시뮬레이션', confidence: 'C', source: '1X Technologies 블로그' },
    { itemName: '오픈소스', value: '일부 공개 (연구용)', confidence: 'B', source: '1X Technologies GitHub' },
    // Data
    { itemName: '실환경 데이터량', value: 'EVE 플릿 운영 데이터', confidence: 'C', source: '1X Technologies 블로그' },
    { itemName: '데이터 수집 방식', value: 'EVE 원격조종 + 자체 랩', confidence: 'B', source: '1X Technologies 블로그' },
    { itemName: '파트너 데이터', value: '제한적', confidence: 'D', source: '업계 추정' },
    { itemName: 'GPU 클러스터', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: 'Sim-to-Real', value: '자체 Sim 환경', confidence: 'C', source: '1X Technologies 블로그' },
    { itemName: '학습 주기', value: '비공개', confidence: 'D', source: '정보 없음' },
    // Biz
    { itemName: '총 펀딩', value: '$125M+ (Series B)', confidence: 'A', source: 'Crunchbase' },
    { itemName: '최근 밸류에이션', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '주요 투자자', value: 'OpenAI, Tiger Global, Samsung', confidence: 'A', source: 'Crunchbase' },
    { itemName: '상용화 단계', value: 'PoC (가정용 베타)', confidence: 'B', source: '1X Technologies 공식' },
    { itemName: '배치 대수', value: '소규모 베타 테스트', confidence: 'D', source: '업계 추정' },
    { itemName: '주요 고객', value: '가정용 베타 테스터', confidence: 'C', source: '1X Technologies 공식' },
    { itemName: '가격대', value: '비공개 (가정용 목표)', confidence: 'D', source: '업계 추정' },
    { itemName: '제조 파트너', value: '자체 (노르웨이)', confidence: 'B', source: '1X Technologies 공식' },
    { itemName: '기술 파트너', value: 'OpenAI', confidence: 'A', source: '1X Technologies 공식' },
    { itemName: '생태계 확장', value: '가정용 시장 집중', confidence: 'B', source: '1X Technologies 공식' },
    // Safety
    { itemName: '국제 인증', value: '미취득', confidence: 'C', source: '업계 추정' },
    { itemName: 'ISO 표준', value: '미확인', confidence: 'D', source: '정보 없음' },
    { itemName: '충돌 안전', value: '소프트 액추에이터 (본질 안전)', confidence: 'A', source: '1X Technologies 공식' },
    { itemName: '규제 전략', value: '경량·저속 설계로 안전 확보', confidence: 'B', source: '1X Technologies 공식' },
    { itemName: '로비/정책 참여', value: '미확인', confidence: 'D', source: '정보 없음' },
    { itemName: '사고 이력', value: '공개 사고 없음', confidence: 'B', source: '뉴스 모니터링' },
    // IP
    { itemName: '총 특허 수', value: '20+ 특허 (추정)', confidence: 'D', source: 'Google Patents' },
    { itemName: '핵심 기술 특허', value: '소프트 액추에이터, 원격조종', confidence: 'C', source: 'Google Patents' },
    { itemName: '최근 3개월 출원', value: '3-5건 (추정)', confidence: 'D', source: 'Google Patents' },
    { itemName: '라이선스 모델', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '방어 특허', value: '소프트 액추에이터 핵심', confidence: 'C', source: 'Google Patents' },
    { itemName: 'IP 소송', value: '없음', confidence: 'B', source: '뉴스 모니터링' },
  ],
  atlas: [
    // HW
    { itemName: '자유도(DOF)', value: '28+ DOF (전기 모델)', confidence: 'C', source: 'Boston Dynamics 공식' },
    { itemName: '키/몸무게', value: '150cm / 89kg (추정)', confidence: 'C', source: 'Boston Dynamics 공식 영상' },
    { itemName: '가반하중', value: '25kg+ (유압 모델 기준)', confidence: 'C', source: 'Boston Dynamics 공식' },
    { itemName: '최대속도', value: '5.4 km/h (유압 기준)', confidence: 'C', source: 'Boston Dynamics 공식' },
    { itemName: '연속동작시간', value: '~1시간 (유압), 전기 비공개', confidence: 'D', source: '업계 추정' },
    { itemName: '구동 방식', value: '전기 액추에이터 (신형)', confidence: 'B', source: 'Boston Dynamics 공식' },
    { itemName: '관절 토크', value: '업계 최고 수준 (비공개)', confidence: 'C', source: '업계 추정' },
    { itemName: '손 자유도', value: '다관절 그리퍼 (신형)', confidence: 'C', source: 'Boston Dynamics 데모' },
    { itemName: '비전 시스템', value: '멀티 카메라 + 뎁스', confidence: 'B', source: 'Boston Dynamics 공식' },
    { itemName: 'LiDAR/Depth', value: 'LiDAR 탑재', confidence: 'B', source: 'Boston Dynamics 공식' },
    { itemName: '촉각 센서', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: 'Force/Torque', value: '관절 내장 F/T 센서', confidence: 'B', source: 'Boston Dynamics 논문' },
    // SW/AI
    { itemName: '핵심 AI 모델', value: 'MPC + RL 하이브리드', confidence: 'B', source: 'Boston Dynamics 논문/발표' },
    { itemName: '학습 방식', value: 'RL + MPC (전통 제어 혼합)', confidence: 'B', source: 'Boston Dynamics 논문' },
    { itemName: '추론 위치', value: 'Edge + Cloud 하이브리드', confidence: 'C', source: '업계 추정' },
    { itemName: '자율 작업 범위', value: '복잡 지형 이동 + 물체 조작', confidence: 'A', source: 'Boston Dynamics 데모' },
    { itemName: '연속 행동 수', value: '복잡한 파쿠르 시퀀스', confidence: 'A', source: 'Boston Dynamics 데모' },
    { itemName: '새 환경 적응', value: '다양한 지형 적응 우수', confidence: 'A', source: 'Boston Dynamics 데모' },
    { itemName: '개발 도구', value: 'Orbit SDK', confidence: 'B', source: 'Boston Dynamics 공식' },
    { itemName: '시뮬레이션', value: 'Drake Sim (자체 개발)', confidence: 'A', source: 'Boston Dynamics 공식' },
    { itemName: '오픈소스', value: 'Drake 일부 오픈소스', confidence: 'A', source: 'GitHub' },
    // Data
    { itemName: '실환경 데이터량', value: 'Spot 플릿 + Atlas 연구 데이터', confidence: 'C', source: '업계 추정' },
    { itemName: '데이터 수집 방식', value: 'Spot 상용 배치 + Atlas 연구', confidence: 'B', source: 'Boston Dynamics 공식' },
    { itemName: '파트너 데이터', value: 'Hyundai 그룹 제조 데이터', confidence: 'C', source: 'Hyundai 인수 관련' },
    { itemName: 'GPU 클러스터', value: '비공개 (Hyundai 지원)', confidence: 'D', source: '업계 추정' },
    { itemName: 'Sim-to-Real', value: 'Drake (업계 최고 수준)', confidence: 'A', source: 'Boston Dynamics 공식' },
    { itemName: '학습 주기', value: '비공개', confidence: 'D', source: '정보 없음' },
    // Biz
    { itemName: '총 펀딩', value: 'Hyundai 인수 ($1.1B)', confidence: 'A', source: 'Hyundai 공식' },
    { itemName: '최근 밸류에이션', value: '~$1.1B (인수 가격)', confidence: 'A', source: 'Hyundai 공식' },
    { itemName: '주요 투자자', value: 'Hyundai Motor Group (80%)', confidence: 'A', source: 'Hyundai 공식' },
    { itemName: '상용화 단계', value: 'Prototype → 상용 전환 중', confidence: 'B', source: 'Boston Dynamics 공식' },
    { itemName: '배치 대수', value: '연구용 소수', confidence: 'C', source: '업계 추정' },
    { itemName: '주요 고객', value: 'Hyundai/Kia 공장 (목표)', confidence: 'C', source: 'Boston Dynamics 공식' },
    { itemName: '가격대', value: '비공개 (상용 미출시)', confidence: 'D', source: '정보 없음' },
    { itemName: '제조 파트너', value: 'Hyundai (제조 역량 지원)', confidence: 'B', source: 'Hyundai 공식' },
    { itemName: '기술 파트너', value: 'Hyundai, NVIDIA (Spot)', confidence: 'B', source: 'Boston Dynamics 공식' },
    { itemName: '생태계 확장', value: 'Spot 생태계 → Atlas 확장', confidence: 'B', source: 'Boston Dynamics 공식' },
    // Safety
    { itemName: '국제 인증', value: 'Spot CE 인증 (Atlas 미취득)', confidence: 'B', source: 'Boston Dynamics 공식' },
    { itemName: 'ISO 표준', value: 'Spot ISO 인증 보유', confidence: 'B', source: 'Boston Dynamics 공식' },
    { itemName: '충돌 안전', value: '고급 충돌 감지/회피', confidence: 'B', source: 'Boston Dynamics 논문' },
    { itemName: '규제 전략', value: 'Spot 안전 실적 활용', confidence: 'B', source: '업계 분석' },
    { itemName: '로비/정책 참여', value: '로봇 윤리 서약 (무기 금지)', confidence: 'A', source: 'Boston Dynamics 공식' },
    { itemName: '사고 이력', value: '공개 사고 없음', confidence: 'A', source: '뉴스 모니터링' },
    // IP
    { itemName: '총 특허 수', value: '500+ 특허', confidence: 'B', source: 'Google Patents' },
    { itemName: '핵심 기술 특허', value: '유압/전기 구동, 동적 보행, MPC', confidence: 'A', source: 'Google Patents' },
    { itemName: '최근 3개월 출원', value: '15-25건', confidence: 'C', source: 'Google Patents' },
    { itemName: '라이선스 모델', value: '비공개', confidence: 'D', source: '정보 없음' },
    { itemName: '방어 특허', value: '동적 보행 제어 핵심 IP', confidence: 'A', source: 'Google Patents' },
    { itemName: 'IP 소송', value: '없음', confidence: 'A', source: '뉴스 모니터링' },
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
// 6. Benchmark Axes 시드 데이터 (10축)
// ============================================
const benchmarkAxesData = [
  { key: 'physical', icon: '💪', label: '신체 능력', description: 'DOF · 페이로드 · 속도 · 내구성 · 방수', perfectDef: 'Atlas급 56-DOF, 50kg, IP67, -20~40°C', sortOrder: 1 },
  { key: 'perception', icon: '👁️', label: '인지/비전', description: '센서 품질 · FOV · 환경인식 · 야간/악천후', perfectDef: '풀스택 + 악천후 완벽 + 실시간 3D', sortOrder: 2 },
  { key: 'autonomy', icon: '🧠', label: 'AI 자율성', description: 'VLA 모델 · 자율 태스크 수 · 학습 속도', perfectDef: '완전 자율, 1회 시연 학습, 100+ 연속', sortOrder: 3 },
  { key: 'dexterity', icon: '🤲', label: '손재주/조작', description: '손 DOF · 힘 제어 · 촉각 · 도구 사용', perfectDef: '22-DOF/손 + 3g 촉각 + 도구 자유자재', sortOrder: 4 },
  { key: 'interaction', icon: '💬', label: '인간 상호작용', description: '자연어 · 감정인식 · 제스처 · 개인화', perfectDef: '완벽 대화 + 감정/의도 + 개인화 기억', sortOrder: 5 },
  { key: 'ecosystem', icon: '🔗', label: '생태계/연결성', description: 'IoT 연동 · 플릿관리 · 파트너 · SDK', perfectDef: '전 가전 연동 + 오픈 SDK + 100+ 파트너', sortOrder: 6 },
  { key: 'safety', icon: '🛡️', label: '안전/신뢰', description: '인증 · 프라이버시 · 소프트바디 · 표준', perfectDef: '국제 인증 + 사고 제로 + 표준 주도', sortOrder: 7 },
  { key: 'business', icon: '💰', label: '비즈니스 성숙도', description: '상용화 · 가격 · 생산역량 · 매출', perfectDef: '10만+대 배치 + 양의 ROI + 글로벌', sortOrder: 8 },
  { key: 'ip', icon: '📜', label: 'IP/기술자산', description: '특허 · 학술기반 · 데이터 축적 · R&D', perfectDef: '50+ 특허 패밀리 + 전세계 + 방어벽', sortOrder: 9 },
  { key: 'scalability', icon: '🚀', label: '확장성', description: 'OTA · 멀티태스크 · 글로벌 · 대량생산', perfectDef: '연 10만대 + OTA 무제한 + 글로벌', sortOrder: 10 },
];

// ============================================
// 7. Benchmark Scores 시드 데이터 (경쟁사별)
// ============================================
const benchmarkScoresData: Record<string, Record<string, { current: number; target: number; rationale: string }>> = {
  digit: {
    physical:    {current:6, target:7, rationale: '44 DOF 전신, 175cm/65kg. 16kg 가반하중은 업계 중간. 5.5km/h 보행속도. 하모닉 감속기 기반 안정적 구동. 방수/방진 미확인으로 감점.'},
    perception:  {current:6, target:7, rationale: 'RGB-D 카메라 x2 + Intel RealSense 뎁스. 물류 환경 인식에 최적화. LiDAR 미탑재, 야간/악천후 대응 제한적.'},
    autonomy:    {current:5, target:7, rationale: 'Locomotion RL + 조작 IL. 단일 물류 작업 자율 수행 가능. ~20 연속 행동. 새 환경 적응에 수 시간 튜닝 필요. 범용 자율성은 제한적.'},
    dexterity:   {current:3, target:5, rationale: '4 DOF 그리퍼. 단순 픽앤플레이스에 특화. 섬세한 물체 조작이나 도구 사용 불가. 촉각 센서 그리퍼 내장 수준.'},
    interaction: {current:3, target:5, rationale: '자연어 대화 기능 없음. 산업용 로봇으로 인간 상호작용은 최소한의 안전 신호 수준. 감정인식/개인화 해당 없음.'},
    ecosystem:   {current:5, target:6, rationale: 'Agility Arc SDK 제공. NVIDIA Isaac Sim 연동. Amazon 물류 생태계 통합. 파트너 프로그램 초기 단계.'},
    safety:      {current:8, target:9, rationale: '산업용 안전 인증 적극 추진 (UL). 속도 제한 + 충돌 감지. 사고 이력 없음. HRI 표준화 위원회 참여. 상용 배치 실적이 안전성 입증.'},
    business:    {current:9, target:10, rationale: '업계 최초 상용 배치 (Amazon, GXO). RoboFab 자체 공장 보유. ~100대+ 배치. $250-300K 추정. 양산 체제 가동 중.'},
    ip:          {current:6, target:7, rationale: '50+ 특허. 이족보행 제어/안정화 핵심 특허 보유. 학술 기반 (오레곤주립대 스핀오프). IP 소송 없음.'},
    scalability: {current:7, target:9, rationale: 'RoboFab 연 10,000대 목표 생산 시설. 물류→제조→서비스 확장 로드맵. OTA 업데이트 가능. 글로벌 확장 초기 단계.'},
  },
  optimus: {
    physical:    {current:5, target:7, rationale: '28+ DOF. 173cm/57kg 경량 설계. 20kg 가반하중(목표). 8km/h 목표 속도. 커스텀 액추에이터 개발 중. 연속 동작 시간 비공개.'},
    perception:  {current:7, target:9, rationale: 'Tesla Vision 카메라 only (FSD 기술 전용). LiDAR 없이 카메라 기반 깊이 추정. FSD 수십억 프레임 학습 데이터의 비전 AI가 강점.'},
    autonomy:    {current:3, target:8, rationale: 'FSD 기반 E2E NN. 공장 내 다중 작업 데모 수준. ~10-30 연속 행동. 아직 파일럿 단계로 실제 자율성 검증 부족. Sim-to-Real 학습 중.'},
    dexterity:   {current:6, target:8, rationale: '11 DOF 손 (촉각 센서 내장). AI Day에서 섬세한 물체 조작 데모. 달걀/배터리 셀 핸들링 시연. 아직 실무 환경 검증 부족.'},
    interaction: {current:5, target:8, rationale: 'AI Day에서 간단한 대화 데모. FSD AI 기반 환경 이해. 감정인식은 미구현. 향후 자연어 인터페이스 확장 계획.'},
    ecosystem:   {current:3, target:7, rationale: '내부 전용 도구, 외부 SDK 없음. Tesla 수직 통합 전략으로 파트너 생태계 제한. 2026 외부 판매 목표로 변화 예정.'},
    safety:      {current:4, target:6, rationale: '국제 인증 미취득 (내부 사용). FSD 안전 시스템 일부 적용. 산업 안전 표준 준비 중. 내부 배치로 규제 우회 중.'},
    business:    {current:3, target:9, rationale: 'Tesla 내부 사업부. 공장 내 ~50대 파일럿. $20-30K 대량생산 목표 가격(Elon 발언). 외부 매출 아직 없음. 양산 시 파괴적 가격 경쟁력.'},
    ip:          {current:5, target:7, rationale: '200+ 로봇 관련 특허. 액추에이터/배터리/VLA 특허. FSD 자율주행 IP 공유 가능. 최근 3개월 20-30건 출원 활발.'},
    scalability: {current:8, target:10, rationale: 'Gigafactory 대량생산 인프라 활용 가능. Dojo + H100 대규모 학습 인프라. 연 수백만 대 자동차 생산 경험. OTA FSD 기반 무선 업데이트.'},
  },
  figure: {
    physical:    {current:6, target:7, rationale: '40+ DOF. 167cm/60kg. 20kg 가반하중. 4.3km/h 보행속도. 커스텀 전기 액추에이터. ~5시간 연속 동작. 속도는 느리나 안정적.'},
    perception:  {current:7, target:8, rationale: 'RGB 스테레오 + 손목 카메라(palm cam). 비전 기반 환경 인식. Helix VLA가 비전을 행동으로 직접 매핑. LiDAR 미사용.'},
    autonomy:    {current:7, target:10, rationale: 'Helix VLA (자체개발) 업계 선두. 50+ 연속 행동 달성. 언어 지시로 새 작업 학습. BMW 공장 실제 자율 작업 수행. AI 자율성 최고 수준.'},
    dexterity:   {current:7, target:9, rationale: '16 DOF 5핑거 독자 개발. 손가락 촉각 센서 + 손목 F/T. 섬세한 물체 조작 데모 다수. 도구 사용 시연. 업계 최고 수준 손재주.'},
    interaction: {current:5, target:7, rationale: 'OpenAI 협력으로 자연어 대화 기능. 음성 지시 기반 작업 수행 데모. 감정인식/개인화는 미구현. 산업용 초점.'},
    ecosystem:   {current:3, target:5, rationale: 'Figure SDK 제한 공개. Genesis Sim 자체 개발. BMW 외 추가 파트너 확보 중. 오픈 생태계는 아직 초기.'},
    safety:      {current:5, target:6, rationale: '안전 인증 준비 중. 속도 제한 + SW 안전 장치. BMW 공장 배치로 산업 안전 기준 충족 필요. 사고 이력 없음.'},
    business:    {current:4, target:7, rationale: '$854M 펀딩, $2.6B 밸류에이션. BMW 공장 ~10-20대 파일럿. 아직 대규모 매출 없음. 투자 유치력은 업계 최고.'},
    ip:          {current:2, target:4, rationale: '30+ 특허(추정). 2023년 창업 2년차로 IP 축적 부족. Helix VLA 관련 핵심 특허 출원 중. IP 방어벽 취약.'},
    scalability: {current:4, target:7, rationale: 'Sunnyvale 자체 제조. 대량생산 인프라 미비. Genesis Sim으로 학습 확장. 멀티태스크 능력은 우수하나 양산 경험 부족.'},
  },
  neo: {
    physical:    {current:5, target:6, rationale: '37 DOF. 177cm/30kg 초경량 설계. 10kg 가반하중(가정용 충분). 4km/h 보행. 소프트 액추에이터 독자 기술. 본질적으로 안전한 설계.'},
    perception:  {current:5, target:6, rationale: '스테레오 카메라 기반. LiDAR 미사용. 가정 환경 인식에 초점. 악천후/야간 대응은 제한적. 비전 AI 발전 중.'},
    autonomy:    {current:3, target:8, rationale: 'VLA 자체개발. 텔레오퍼레이션 중심에서 자율 전환 중. ~10-20 연속 행동. 가정용 청소/정리 작업 데모. 자율 전환이 핵심 과제.'},
    dexterity:   {current:7, target:8, rationale: '5핑거 소프트 핸드. 소프트 액추에이터로 섬세하고 안전한 파지. 가정 물체 조작에 최적화. 촉각 센서 내장. 도구 사용은 제한적.'},
    interaction: {current:6, target:9, rationale: '가정용 최초 진출 목표로 인간 상호작용 최우선. 일상 대화 인터페이스 개발 중. 감정인식/개인화 로드맵. OpenAI 협력.'},
    ecosystem:   {current:4, target:6, rationale: '일부 연구용 오픈소스. EVE 플릿 운영 경험. 가정용 IoT 연동은 미구현. 파트너 생태계 초기 단계.'},
    safety:      {current:6, target:7, rationale: '소프트 액추에이터로 본질 안전 설계(핵심 차별화). 30kg 초경량으로 충돌 시 위험 최소. 안전 인증은 미취득.'},
    business:    {current:3, target:7, rationale: '$125M+ 펀딩. 가정용 베타 테스트 소규모. 대규모 매출/배치 없음. 가정용 시장 선점이 장기 전략.'},
    ip:          {current:2, target:4, rationale: '20+ 특허(추정). 소프트 액추에이터/원격조종 핵심 특허. IP 축적 초기 단계. 방어 특허 제한적.'},
    scalability: {current:3, target:7, rationale: '노르웨이 자체 제조. 대량생산 인프라 미비. 가정 시장 대량 보급 목표이나 현재 소량 생산. OTA 가능.'},
  },
  atlas: {
    physical:    {current:10, target:10, rationale: '업계 최고 신체 능력. 28+ DOF 전기 모델. 파쿠르/점프/회전 등 극한 동작 시연. 25kg+ 가반하중. 5.4km/h+. 유압→전기 전환 중.'},
    perception:  {current:9, target:10, rationale: '멀티 카메라 + 뎁스 + LiDAR. 풀스택 센서. 복잡 지형 실시간 3D 인식. 악천후 대응. Spot 센서 기술 공유.'},
    autonomy:    {current:7, target:8, rationale: 'MPC + RL 하이브리드. 복잡 파쿠르 시퀀스 자율 수행. 다양한 지형 적응. DeepMind 협력으로 VLA 발전 중. 범용 자율성 높음.'},
    dexterity:   {current:5, target:8, rationale: '신형 다관절 그리퍼. 유압 시절 거친 작업 중심. 전기 모델로 섬세한 조작 추가 중. 5핑거 핸드 개발 중. 도구 사용은 제한적.'},
    interaction: {current:3, target:5, rationale: '인간 상호작용은 후순위. 산업/건설/위험 환경 중심. 대화/감정인식 기능 없음. Orbit SDK로 프로그래밍 인터페이스 제공.'},
    ecosystem:   {current:7, target:8, rationale: 'Spot 생태계 성숙 (1,500+ 배치). Orbit SDK. Drake Sim 오픈소스. Hyundai 그룹 제조 연동. 파트너 다수 확보.'},
    safety:      {current:7, target:8, rationale: 'Spot CE/ISO 인증 보유. 충돌 감지/회피 고급. 로봇 윤리 서약(무기 금지) 선도. 사고 이력 제로. Atlas 전기 모델 인증 진행 중.'},
    business:    {current:6, target:9, rationale: 'Hyundai $1.1B 인수. Spot 상용 성공. Atlas 상용 전환 중. Hyundai/Kia 공장 배치 목표. 가격 미공개.'},
    ip:          {current:10, target:10, rationale: '500+ 특허. 업계 최대 IP 포트폴리오. 동적 보행 제어/유압·전기 구동 핵심 IP. 30년 연구 축적. MIT/DARPA 학술 기반.'},
    scalability: {current:6, target:7, rationale: 'Hyundai 대량생산 역량 연결 가능. Spot 양산 경험. Atlas 양산은 아직 미착수. OTA 가능. 글로벌 판매 네트워크(Spot 통해).'},
  },
  cloid: {
    physical:    {current:3, target:6, rationale: 'R&D 초기 단계. DOF/가반하중/속도 모두 미확정. 가정용 특화 설계로 경량·소형 지향. 하드웨어 파트너 탐색 중.'},
    perception:  {current:5, target:8, rationale: 'LG 가전 센서 기술 활용 가능(로봇청소기, 스마트TV). 비전 AI 자체 개발 초기. 실내 환경 인식에 특화 가능.'},
    autonomy:    {current:2, target:7, rationale: 'AI 모델 개발 초기. 가정 환경 자율 수행은 장기 목표. 현재 원격조종/스크립트 기반. VLA 도입 계획.'},
    dexterity:   {current:3, target:7, rationale: '손/그리퍼 설계 초기 단계. 가정용 물체(가전/식기/의류 등) 조작이 목표. 촉각 센서 R&D. LG 가전 조작 특화 가능.'},
    interaction: {current:4, target:9, rationale: 'LG ThinQ AI 대화 엔진 활용 가능. 스마트홈 음성 제어 경험 보유. 감정인식/개인화가 핵심 차별화 전략. 가정 환경 최적화.'},
    ecosystem:   {current:7, target:10, rationale: '핵심 강점. LG ThinQ 스마트홈 생태계 (TV/냉장고/세탁기/에어컨 등 전 가전 연동). webOS 플랫폼. 100+ 가전 파트너. SDK 제공 가능.'},
    safety:      {current:5, target:9, rationale: 'LG 가전 안전 인증 경험 풍부 (UL/CE/KC). 가정 내 어린이/노인 안전 최우선. 소프트 바디 설계 검토 중. 안전 표준 선점 전략.'},
    business:    {current:2, target:7, rationale: 'R&D 단계. 상용화/배치 아직 없음. LG전자 내부 투자. 가정용 시장 $10B+ TAM. 가전 판매 채널 활용 가능.'},
    ip:          {current:4, target:7, rationale: 'LG전자 전체 특허 포트폴리오 활용 가능(가전/디스플레이/배터리). 로봇 전용 특허는 초기. LG 연구소 학술 기반.'},
    scalability: {current:3, target:7, rationale: 'LG 글로벌 제조/판매 인프라 활용 가능. 연 수천만 대 가전 생산 경험. OTA 가능(webOS). 로봇 전용 생산라인 미구축.'},
  },
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

  // --- 6. Seed Benchmark Axes ---
  console.log('Seeding benchmark axes (10 records)...');
  await db.insert(ciBenchmarkAxes).values(benchmarkAxesData);

  // --- 7. Seed Benchmark Scores ---
  console.log('Seeding benchmark scores...');
  let benchmarkCount = 0;
  for (const [slug, scores] of Object.entries(benchmarkScoresData)) {
    const competitorId = competitorMap.get(slug);
    if (!competitorId) { console.log(`  Warning: competitor '${slug}' not found`); continue; }
    for (const [axisKey, { current, target, rationale }] of Object.entries(scores)) {
      await db.insert(ciBenchmarkScores).values({
        competitorId,
        axisKey,
        currentScore: current,
        targetScore: target,
        rationale,
      });
      benchmarkCount++;
    }
  }
  console.log(`  Inserted ${benchmarkCount} benchmark scores`);

  console.log('\n=== CI seed completed successfully! ===');
}

/**
 * Force reseed: delete all CI data and re-insert
 */
export async function forceReseedCiData() {
  console.log('=== Force reseed CI data ===');
  // Delete in reverse FK order
  await db.delete(ciBenchmarkScores);
  await db.delete(ciBenchmarkAxes);
  await db.delete(ciValueHistory);
  await db.delete(ciMonitorAlerts);
  await db.delete(ciStaging);
  await db.delete(ciFreshness);
  await db.delete(ciValues);
  await db.delete(ciItems);
  await db.delete(ciCategories);
  await db.delete(ciLayers);
  await db.delete(ciCompetitors);
  console.log('  Deleted all CI data.');
  await seedCiData();
}
