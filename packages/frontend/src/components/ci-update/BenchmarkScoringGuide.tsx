'use client';

import { useState } from 'react';

/** 5-level rubric per axis: 1-2, 3-4, 5-6, 7-8, 9-10 */
const SCORING_RUBRIC: Record<string, { levels: string[]; perfectSpec: string }> = {
  physical: {
    levels: [
      '전신 15 DOF 미만. 가반하중 3kg 이하. 실내 평지만 이동. 배터리 1시간 미만. 하드웨어 프로토타입 수준.',
      '전신 15-25 DOF. 가반하중 5-10kg. 실내 이동 가능, 계단 불가. 2-3시간 동작. 기본 액추에이터.',
      '전신 25-35 DOF. 가반하중 10-20kg. 계단/경사 대응. 4-5시간 연속. 기본 방진. 4-5km/h 보행.',
      '전신 35-50 DOF. 가반하중 20-35kg. 6km/h+. IP54 방수방진. 다양한 지형 대응. 고성능 액추에이터.',
      '전신 50+ DOF. 가반하중 50kg+. IP67. 극한 환경(-20~40°C). 8km/h+. 파쿠르/점프 가능. 8시간+ 연속.',
    ],
    perfectSpec: 'Atlas급 전신 56-DOF 관절. 50kg 가반하중. IP67 완전 방수방진. -20~40°C 극한 환경. 8km/h 이상 보행속도. 파쿠르·점프·회전 등 극한 동작. 8시간+ 연속 가동. 커스텀 고토크 전기 액추에이터.',
  },
  perception: {
    levels: [
      '단일 RGB 카메라. 뎁스 센서 없음. 실내 조명 환경만 대응. 물체 인식 기초 수준.',
      'RGB-D 카메라 1-2개. 기본 물체 인식. 실내 환경 매핑 가능. 야간/악천후 미대응.',
      'RGB-D + 추가 센서(초음파/IR). 실시간 환경 매핑. 동적 장애물 회피. 제한적 야간 대응.',
      '멀티 카메라 + LiDAR 또는 뎁스 퓨전. 실시간 3D 맵핑. 야간 대응. 복잡 환경 인식.',
      '풀스택 센서(카메라+LiDAR+레이더+뎁스). 악천후 완벽 대응. 실시간 3D 시맨틱 맵. 수십억 프레임 학습 데이터.',
    ],
    perfectSpec: '풀스택 센서 퓨전 (멀티 RGB + LiDAR + 레이더 + 뎁스). 360° FOV. 실시간 시맨틱 3D 재구성. 악천후(비/눈/안개) 및 완전 야간 완벽 대응. 수십억 프레임 학습 데이터 기반 비전 AI. 1ms 이하 인식 지연.',
  },
  autonomy: {
    levels: [
      '원격 조종 전용 또는 사전 스크립트 실행만 가능. 자율 판단 없음. 새 환경 대응 불가.',
      '단일 작업 반자율. 5-10개 연속 행동. 환경 변화 시 수동 개입 필요. 학습 수일 소요.',
      '다중 작업 수행 가능. 10-30개 연속 행동. 제한적 환경 적응. 수 시간 튜닝으로 새 작업 학습.',
      '50+ 연속 행동. 다양한 환경 자율 적응. 소수 시연으로 새 작업 학습. VLA 모델 탑재.',
      '완전 자율. 1회 시연만으로 새 작업 학습. 100+ 연속 행동. 예측 불가 상황에서도 자율 판단. 범용 AI.',
    ],
    perfectSpec: '완전 자율 범용 AI. 1회 시연 또는 언어 지시만으로 새 작업 즉시 학습. 100+ 연속 행동 무중단 수행. VLA(Vision-Language-Action) 최신 모델. 예측 불가 상황에서 자율 판단·복구. Sim-to-Real 즉시 전이.',
  },
  dexterity: {
    levels: [
      '고정 그리퍼 또는 단순 집게. 손 2-3 DOF. 단일 크기 물체만 파지. 촉각 센서 없음.',
      '손 4-6 DOF 그리퍼. 픽앤플레이스 가능. 무거운 물체 제한. 기본 힘 제어. 도구 사용 불가.',
      '손 8-12 DOF 다관절 핸드. 다양한 크기·형상 파지. 기본 촉각. 간단한 도구 사용 가능.',
      '손 16+ DOF 5핑거 핸드. 섬세한 촉각 센서. 달걀·유리컵 등 정밀 파지. 복잡 도구 조작 가능.',
      '손 22+ DOF/손. 3g 수준 초정밀 촉각. 인간 수준 손재주. 모든 도구·악기·정밀 기구 자유자재.',
    ],
    perfectSpec: '손 22+ DOF 양손 5핑거. 3g 수준 초정밀 촉각 센서. 손가락 독립 제어. 힘/토크 피드백. 인간 수준 손재주로 바늘꿰기·악기 연주·정밀 조립 가능. 모든 공구·가정용 도구 자유자재 사용.',
  },
  interaction: {
    levels: [
      '인간 상호작용 기능 없음. LED/버저 수준 신호만 제공. 프로그래밍 인터페이스로만 조작.',
      '기본 음성 명령 인식(10-20개). 간단한 상태 표시. 제스처 인식 없음. 일방향 소통.',
      '자연어 대화 기초. 수십 개 명령 이해. 기본 감정 톤 인식. TTS 음성 응답.',
      '유창한 자연어 대화. 감정 인식 기초. 제스처·시선 이해. 사용자별 선호 학습 시작.',
      '완벽한 자연어 대화 + 감정/의도 정밀 인식 + 제스처·표정 이해 + 개인화 기억 + 멀티모달 소통.',
    ],
    perfectSpec: '완벽한 다국어 자연어 대화. 감정·의도·뉘앙스 정밀 인식. 제스처·표정·시선 통합 이해. 개인별 선호·습관·일정 기억. 능동적 대화 시작. 유머·공감 표현. 어린이·노인 맞춤 소통. 멀티모달(음성+시각+촉각) 피드백.',
  },
  ecosystem: {
    levels: [
      '독립 작동만 가능. API/SDK 없음. 외부 시스템 연동 불가. 파트너 없음.',
      '기본 API 제공. 1-2개 외부 시스템 연동. 파트너 5개 미만. 클라우드 연결 기초.',
      'SDK 공개. 10+ 외부 시스템 연동. 시뮬레이터 지원. 20+ 파트너. 기본 플릿 관리.',
      '오픈 SDK + 활발한 개발자 생태계. 50+ IoT/가전 연동. 고급 플릿 관리. 클라우드 통합.',
      '전 가전/IoT 완전 연동 + 오픈 SDK + 100+ 파트너 + 대규모 플릿 관리 + 서드파티 앱 마켓.',
    ],
    perfectSpec: '전 가전(TV·냉장고·세탁기·에어컨 등) 완전 양방향 연동. 오픈 SDK + REST/gRPC API. 100+ 파트너 에코시스템. 대규모 플릿 관리(1,000+ 동시). 서드파티 앱/스킬 마켓플레이스. OTA 원격 관리. 클라우드+엣지 하이브리드.',
  },
  safety: {
    levels: [
      '안전 인증 없음. 기본 E-Stop만 제공. 충돌 감지 없음. 프라이버시 미고려.',
      '기본 충돌 감지/정지. 속도 제한. 안전 인증 준비 중. 프라이버시 기초 설계.',
      '1-2개 국제 인증 취득. 충돌 감지 + 힘 제한. 기본 프라이버시 보호. 안전 감사 1회+.',
      '주요 국제 인증(CE/UL/ISO) 다수 취득. 사고 이력 없음. 프라이버시 바이 디자인. 안전 표준 참여.',
      '모든 국제 인증 + 사고 제로 + 프라이버시 최고 등급 + 안전 표준 주도 + 소프트바디 설계.',
    ],
    perfectSpec: '국제 인증 전 취득(CE/UL/ISO 13482/IEC 61508). 상용 배치 사고 제로. 소프트바디 설계로 본질 안전. 프라이버시 바이 디자인(온디바이스 처리). 사이버보안 인증. 안전 표준 위원회 주도. 어린이·노인 환경 완벽 안전.',
  },
  business: {
    levels: [
      'R&D 단계. 상용 제품 없음. 매출 없음. 생산 라인 미구축. 내부 투자만.',
      '프로토타입 완성. 소수 파일럿(10대 미만). 가격 미확정. 초기 펀딩 확보.',
      '50-100대 파일럿 배치. 가격 확정. 소규모 매출 발생. 생산 라인 초기 구축.',
      '1,000-10,000대 배치. 안정적 매출. 자체 공장 가동. 양의 유닛 이코노믹스 달성.',
      '10만+ 대 글로벌 배치 + 양의 ROI + 대량생산 체제 + 글로벌 판매/서비스 네트워크.',
    ],
    perfectSpec: '글로벌 10만+ 대 배치. 양의 ROI 및 유닛 이코노믹스 검증. 연 10만+ 대 대량생산 체제. 글로벌 판매·서비스·유지보수 네트워크. $20K 이하 소비자 가격. 구독 모델 + 하드웨어 매출 이중 수익.',
  },
  ip: {
    levels: [
      '특허 5건 미만. 학술 기반 없음. 데이터 축적 초기. R&D 인력 10명 미만.',
      '특허 5-15건. 기초 R&D 팀 구성. 학술 협력 1-2건. 핵심 기술 외부 의존.',
      '특허 15-30건. 자체 핵심 기술 1-2개. 학술 논문 발표. 데이터 축적 진행 중.',
      '특허 30-50건+. 핵심 특허 패밀리 다수. 학술 기반 강화. 방어 특허 포트폴리오 구축.',
      '50+ 특허 패밀리 + 글로벌 출원 + 핵심 IP 방어벽 + 학술 최고 기관 기반 + 대규모 데이터.',
    ],
    perfectSpec: '50+ 특허 패밀리. 글로벌 주요국 출원 완료. 동적 보행·AI·액추에이터·센서 등 핵심 IP 방어벽. MIT/스탠포드급 학술 기관 기반. 수십억 프레임 학습 데이터. 100+ R&D 인력. IP 라이선싱 수익.',
  },
  scalability: {
    levels: [
      '수작업 조립. 연 10대 미만 생산. 단일 기능만. OTA 불가. 단일 시장만.',
      '소규모 생산(연 100대 미만). 2-3개 태스크. 기본 SW 업데이트. 국내 시장만.',
      '연 100-1,000대 생산. 5+ 태스크. OTA 가능. 1-2개 해외 시장 진출.',
      '연 1,000-10,000대. 10+ 태스크. OTA 정기 업데이트. 글로벌 3+ 시장. 양산 라인 가동.',
      '연 10만+ 대 대량생산 + OTA 무제한 기능 확장 + 글로벌 전 시장 + 멀티태스크 무한 확장.',
    ],
    perfectSpec: '연 10만+ 대 글로벌 대량생산. 자동화 생산 라인. OTA로 무제한 기능 확장(새 스킬 배포). 전 세계 글로벌 시장. 멀티태스크 무한 확장(가정·물류·제조·서비스). 현지 AS 네트워크.',
  },
};

const LEVEL_LABELS = ['1-2점', '3-4점', '5-6점', '7-8점', '9-10점'];
const LEVEL_COLORS = [
  'text-red-400 bg-red-500/10',
  'text-orange-400 bg-orange-500/10',
  'text-yellow-400 bg-yellow-500/10',
  'text-blue-400 bg-blue-500/10',
  'text-green-400 bg-green-500/10',
];
const LEVEL_NAMES = ['초기/컨셉', '프로토타입', '파일럿/실용', '상용급', '완벽'];

import type { BenchmarkAxis } from '@/types/ci-update';

interface BenchmarkScoringGuideProps {
  axes: BenchmarkAxis[];
}

export function BenchmarkScoringGuide({ axes }: BenchmarkScoringGuideProps) {
  const [expandedAxis, setExpandedAxis] = useState<string | null>(null);
  const [showPerfectRobot, setShowPerfectRobot] = useState(false);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">스코어링 기준 가이드</h3>
          <p className="text-xs text-slate-500 mt-0.5">각 축의 1~10점이 의미하는 구체적 기준. 축을 클릭하면 레벨별 상세 기준을 확인할 수 있습니다.</p>
        </div>
        <button
          onClick={() => setShowPerfectRobot(prev => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showPerfectRobot
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          {showPerfectRobot ? '퍼펙트 로봇 숨기기' : '퍼펙트 로봇 스펙 보기'}
        </button>
      </div>

      {/* Perfect Robot Spec Panel */}
      {showPerfectRobot && (
        <div className="bg-gradient-to-r from-slate-700/40 to-slate-700/20 border border-slate-600 rounded-xl p-5">
          <div className="mb-4">
            <h4 className="text-base font-bold text-white">THE PERFECT ROBOT — 100점 만점 스펙</h4>
            <p className="text-xs text-slate-400">모든 축 10점을 달성한 이상적 로봇의 구체적 사양</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {axes.map(axis => {
              const rubric = SCORING_RUBRIC[axis.key];
              if (!rubric) return null;
              return (
                <div key={axis.key} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-white">{axis.label}</span>
                    <span className="text-xs text-slate-500 ml-auto">10/10</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{rubric.perfectSpec}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Axis Rubric List */}
      <div className="space-y-1">
        {axes.map(axis => {
          const rubric = SCORING_RUBRIC[axis.key];
          if (!rubric) return null;
          const isExpanded = expandedAxis === axis.key;

          return (
            <div key={axis.key}>
              <button
                onClick={() => setExpandedAxis(prev => prev === axis.key ? null : axis.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700/20 transition-colors text-left"
              >
                <span className="text-xs text-slate-500">{isExpanded ? '▼' : '▶'}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-200">{axis.label}</span>
                  <span className="text-xs text-slate-500 ml-2">{axis.description}</span>
                </div>
                {/* Mini level indicator */}
                <div className="hidden sm:flex items-center gap-0.5">
                  {LEVEL_LABELS.map((_, i) => (
                    <div
                      key={i}
                      className="w-5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'][i],
                        opacity: 0.4 + i * 0.15,
                      }}
                    />
                  ))}
                </div>
              </button>

              {isExpanded && (
                <div className="ml-10 mr-2 mb-3 mt-1 space-y-2">
                  {rubric.levels.map((desc, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${LEVEL_COLORS[i]}`}>
                        {LEVEL_LABELS[i]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-slate-500 font-medium">{LEVEL_NAMES[i]}</span>
                        <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                  {/* Perfect spec inline */}
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded text-green-400 bg-green-500/10 ring-1 ring-green-500/30">
                        10점
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-white font-medium">퍼펙트 로봇 스펙</span>
                        <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{rubric.perfectSpec}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
