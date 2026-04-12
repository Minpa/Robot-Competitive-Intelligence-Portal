'use client';

import { useState, useEffect } from 'react';
import { Target, ChevronDown, ChevronUp, AlertTriangle, Zap, Shield, Brain, Cpu, Users, Globe, Scale, Lightbulb } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';

interface ActionItem {
  id: string;
  title: string;
  reason: string;
  priority: 'critical' | 'high' | 'medium';
  timeframe: string;
  lgCurrent: number;
  competitorBest: { name: string; score: number };
  gap: number;
}

interface ActionCategory {
  id: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  description: string;
  items: ActionItem[];
}

const PRIORITY_STYLES = {
  critical: { label: '긴급', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  high: { label: '높음', bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  medium: { label: '보통', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
};

// Static action items derived from CLOiD benchmark gaps
const ACTION_CATEGORIES: ActionCategory[] = [
  {
    id: 'autonomy',
    name: '자율주행/AI 자율성',
    icon: Brain,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    description: 'CLOiD 현재 2점 vs Figure 7점 — 가장 큰 갭. VLA 모델 확보가 최우선',
    items: [
      {
        id: 'a1',
        title: 'VLA(Vision-Language-Action) 모델 도입 및 자체 개발',
        reason: 'Figure AI는 Helix VLA로 50+ 연속 행동을 달성했고, Tesla는 FSD 기반 E2E 학습을 진행 중. LG CLOiD는 현재 스크립트/원격조종 기반(2점)으로, AI 자율성에서 경쟁사 대비 5점 이상 뒤처져 있음. VLA 없이는 "스마트 가전 연동 로봇"이라는 포지셔닝 자체가 불가능.',
        priority: 'critical',
        timeframe: '6-12개월',
        lgCurrent: 2,
        competitorBest: { name: 'Figure 02', score: 7 },
        gap: 5,
      },
      {
        id: 'a2',
        title: '가정환경 특화 Sim-to-Real 학습 파이프라인 구축',
        reason: 'Tesla는 Dojo+H100 클러스터로 대규모 시뮬레이션을 운영하고, Figure는 Genesis Sim을 자체 개발함. LG는 가전 환경(부엌, 거실, 세탁실) 3D 시뮬레이션을 만들 수 있는 강점이 있으나 아직 미착수. 실물 데이터 수집 없이 가정 작업 자율성 확보 불가.',
        priority: 'critical',
        timeframe: '6-12개월',
        lgCurrent: 2,
        competitorBest: { name: 'Tesla Optimus', score: 3 },
        gap: 1,
      },
    ],
  },
  {
    id: 'hardware',
    name: '하드웨어/피지컬',
    icon: Cpu,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    description: 'CLOiD 현재 3점 vs Atlas 10점 — 기본 스펙 미확정 상태',
    items: [
      {
        id: 'h1',
        title: 'DOF/가반하중/속도 등 기본 스펙 확정 및 프로토타입 제작',
        reason: 'Atlas는 10점(극한 파쿠르까지 수행), Digit는 6점(44 DOF, 16kg 가반하중). CLOiD는 DOF/가반하중/속도 모두 미확정(3점). 가정용 특화라도 최소 30+ DOF, 10kg 가반하중, 4km/h 이상이 되어야 실용적인 가사 작업(빨래 정리, 식기세척기 등) 수행 가능.',
        priority: 'high',
        timeframe: '3-6개월',
        lgCurrent: 3,
        competitorBest: { name: 'Atlas', score: 10 },
        gap: 7,
      },
      {
        id: 'h2',
        title: '액추에이터 파트너십 확보 또는 자체 개발 결정',
        reason: 'Tesla는 커스텀 액추에이터를 자체 개발하고, 1X는 소프트 액추에이터로 차별화에 성공함. LG는 현재 HW 파트너를 탐색 중. Harmonic Drive/Maxon 등 기존 업체 활용 vs 자체 개발 의사결정이 전체 일정에 영향. 가정용 소프트/안전 설계를 위해 1X 방식(소프트 액추에이터) 벤치마킹 권장.',
        priority: 'high',
        timeframe: '3-6개월',
        lgCurrent: 3,
        competitorBest: { name: '1X NEO', score: 5 },
        gap: 2,
      },
    ],
  },
  {
    id: 'dexterity',
    name: '손재주/매니퓰레이션',
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    description: 'CLOiD 현재 3점 vs Figure 7점 — 가정용 물체 조작이 핵심',
    items: [
      {
        id: 'd1',
        title: '5핑거 핸드 설계 및 촉각 센서 통합',
        reason: 'Figure 02는 16 DOF 5핑거 독자 개발(7점)로 섬세한 조작 데모를 다수 시연. 1X NEO도 소프트 핸드로 7점 달성. CLOiD가 가정 환경에서 식기/의류/가전 리모컨 등을 다루려면 최소 5핑거 + 촉각 센서가 필수. 4 DOF 그리퍼(Digit 수준)로는 가정용 가치 제안 불가.',
        priority: 'high',
        timeframe: '6-12개월',
        lgCurrent: 3,
        competitorBest: { name: 'Figure 02', score: 7 },
        gap: 4,
      },
      {
        id: 'd2',
        title: 'LG 가전 조작 특화 학습 데이터셋 구축',
        reason: 'LG만의 차별화 기회. LG 냉장고 문 열기, 세탁기 버튼 조작, 식기세척기 정리 등 LG 가전 전용 조작 데이터를 확보하면 경쟁사가 따라올 수 없는 니치 구축 가능. ThinQ 연동으로 가전 상태를 알고 조작하는 "지능형 가전 조작"은 LG만 할 수 있음.',
        priority: 'medium',
        timeframe: '12-18개월',
        lgCurrent: 3,
        competitorBest: { name: 'Figure 02', score: 7 },
        gap: 4,
      },
    ],
  },
  {
    id: 'ecosystem',
    name: '생태계/플랫폼',
    icon: Globe,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    description: 'CLOiD 현재 7점 — LG의 최대 강점. ThinQ 생태계 극대화 전략',
    items: [
      {
        id: 'e1',
        title: 'ThinQ 스마트홈 ↔ CLOiD 양방향 API 개발',
        reason: '이미 7점으로 경쟁사 대비 강점(Atlas 7점과 동률, Figure 3점). 100+ 가전 파트너 연동이 가능한 건 LG뿐. 로봇이 "세탁 끝남 → 빨래 정리", "냉장고 재고 확인 → 요리 시작" 같은 가전 연계 시나리오를 자연스럽게 수행할 수 있도록 양방향 API 구축이 핵심. 이 강점을 먼저 확보하면 후발주자 진입 장벽이 됨.',
        priority: 'critical',
        timeframe: '3-6개월',
        lgCurrent: 7,
        competitorBest: { name: 'Atlas', score: 7 },
        gap: 0,
      },
      {
        id: 'e2',
        title: 'webOS 기반 로봇 앱 SDK 공개',
        reason: 'Agility는 Arc SDK, Boston Dynamics는 Orbit SDK를 제공하지만 가정용 앱 생태계는 아직 누구도 선점하지 못함. webOS는 이미 TV/IoT에서 검증된 플랫폼. 서드파티 개발자가 로봇 기능을 만들 수 있는 SDK를 먼저 공개하면 앱스토어 생태계를 선점할 수 있음.',
        priority: 'medium',
        timeframe: '12-18개월',
        lgCurrent: 7,
        competitorBest: { name: 'Atlas', score: 7 },
        gap: 0,
      },
    ],
  },
  {
    id: 'interaction',
    name: '인간 상호작용',
    icon: Users,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    description: 'CLOiD 현재 4점 vs NEO 6점 — 가정용 로봇의 핵심 차별화',
    items: [
      {
        id: 'i1',
        title: 'ThinQ AI 기반 감정인식/개인화 대화 엔진 개발',
        reason: '1X NEO가 가정용 초점으로 6점을 기록하고 감정인식/개인화 로드맵을 밝힘. LG는 ThinQ AI 대화 엔진(4점)과 스마트홈 음성 제어 경험이 있으나 로봇 전용 개인화가 없음. 가정에서 가족 구성원별 선호도 학습, 감정 인식 기반 서비스 제안이 핵심 경쟁력이 될 수 있음.',
        priority: 'high',
        timeframe: '6-12개월',
        lgCurrent: 4,
        competitorBest: { name: '1X NEO', score: 6 },
        gap: 2,
      },
    ],
  },
  {
    id: 'safety',
    name: '안전/규제',
    icon: Shield,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    description: 'CLOiD 현재 5점 vs Digit 8점 — 가정용은 안전 기준이 더 엄격',
    items: [
      {
        id: 's1',
        title: '가정용 로봇 안전 표준 선점 (UL/CE/KC 인증 로드맵)',
        reason: 'Digit가 8점으로 업계 최고 수준의 안전 인증을 확보 중이지만, 이는 산업용 기준. 가정용(어린이/노인 안전)은 아직 국제 표준이 미확립. LG는 가전 안전 인증 경험(UL/CE/KC)이 풍부하므로, 가정용 로봇 안전 표준을 먼저 제안하고 인증을 취득하면 규제 장벽으로 후발주자 진입을 차단 가능.',
        priority: 'high',
        timeframe: '6-12개월',
        lgCurrent: 5,
        competitorBest: { name: 'Digit', score: 8 },
        gap: 3,
      },
      {
        id: 's2',
        title: '소프트 바디 설계 적용 (1X NEO 벤치마킹)',
        reason: '1X NEO는 30kg 초경량 + 소프트 액추에이터로 "본질적 안전 설계"를 실현(6점). 가정에서 어린이/반려동물과 공존하려면 충돌 시 위험을 물리적으로 줄이는 설계가 필수. 소프트웨어 안전장치만으로는 부족하며, 하드웨어 수준의 본질 안전이 가정용의 규제 통과와 소비자 수용성에 결정적.',
        priority: 'medium',
        timeframe: '12-18개월',
        lgCurrent: 5,
        competitorBest: { name: '1X NEO', score: 6 },
        gap: 1,
      },
    ],
  },
  {
    id: 'business',
    name: '비즈니스/상용화',
    icon: Scale,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    description: 'CLOiD 현재 2점 vs Digit 9점 — R&D에서 상용화 전환 전략 필요',
    items: [
      {
        id: 'b1',
        title: 'B2B 파일럿 프로그램 설계 (LG 사옥/공장 우선 배치)',
        reason: 'Digit는 Amazon/GXO에 100대+ 배치(9점), Figure는 BMW 공장 파일럿(4점). CLOiD는 배치 실적 제로(2점). Tesla처럼 자사 공장/사옥에 먼저 배치하여 실환경 데이터를 수집하고 기술을 검증하는 전략이 현실적. LG 트윈타워, 창원 공장 등이 최적의 첫 배치 장소.',
        priority: 'high',
        timeframe: '12-18개월',
        lgCurrent: 2,
        competitorBest: { name: 'Digit', score: 9 },
        gap: 7,
      },
      {
        id: 'b2',
        title: '가정용 시장 가격대 목표 설정 및 BOM 분석',
        reason: 'Tesla는 $20-30K 대량생산 목표를 제시하여 시장 기대를 설정함. 가정용 로봇은 가전 가격 범위($3-10K)에 근접해야 대량 보급 가능. LG는 가전 BOM 최적화 경험으로 가격 경쟁력을 확보할 수 있으나, 목표 가격대 미설정 상태에서는 설계 방향 결정이 불가.',
        priority: 'medium',
        timeframe: '6-12개월',
        lgCurrent: 2,
        competitorBest: { name: 'Tesla Optimus', score: 3 },
        gap: 1,
      },
    ],
  },
  {
    id: 'ip',
    name: 'IP/특허',
    icon: Lightbulb,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    description: 'CLOiD 현재 4점 vs Atlas 10점 — LG 그룹 특허 활용 전략 필요',
    items: [
      {
        id: 'ip1',
        title: 'LG전자 가전/디스플레이/배터리 특허 중 로봇 전용 가능한 IP 매핑',
        reason: 'Boston Dynamics는 500+ 로봇 특허(10점), Tesla는 200+(5점). CLOiD는 로봇 전용 특허가 초기(4점)이지만, LG전자 전체 특허 포트폴리오(수만 건)에서 모터 제어, 배터리 관리, 센서 퓨전, 디스플레이 인터페이스 등 로봇에 활용 가능한 IP를 매핑하면 빠르게 방어벽 구축 가능.',
        priority: 'medium',
        timeframe: '3-6개월',
        lgCurrent: 4,
        competitorBest: { name: 'Atlas', score: 10 },
        gap: 6,
      },
    ],
  },
];

export default function ActionItemsPage() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(ACTION_CATEGORIES.map((c) => c.id))
  );
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalItems = ACTION_CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);
  const criticalCount = ACTION_CATEGORIES.reduce((sum, c) => sum + c.items.filter((i) => i.priority === 'critical').length, 0);
  const highCount = ACTION_CATEGORIES.reduce((sum, c) => sum + c.items.filter((i) => i.priority === 'high').length, 0);

  const filteredCategories = ACTION_CATEGORIES.map((cat) => ({
    ...cat,
    items: filterPriority ? cat.items.filter((i) => i.priority === filterPriority) : cat.items,
  })).filter((cat) => cat.items.length > 0);

  return (
    <AuthGuard>
      <div className="space-y-6">
        <PageHeader
          module="STRATEGY MODULE V4.2"
          titleKo="전략 제언 & Action Items"
          titleEn="STRATEGIC ACTIONS"
          description="경쟁 분석 기반 개발/전략 캐치업 로드맵"
        />

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setFilterPriority(null)}
            className={`p-4 rounded-xl border transition-colors cursor-pointer ${!filterPriority ? 'bg-argos-surface border-violet-500/50 shadow-argos-card' : 'bg-argos-surface border-argos-border hover:border-argos-blue/30'}`}
          >
            <p className="text-2xl font-bold text-argos-ink">{totalItems}</p>
            <p className="text-sm text-argos-muted">전체 Action Items</p>
          </button>
          <button
            onClick={() => setFilterPriority(filterPriority === 'critical' ? null : 'critical')}
            className={`p-4 rounded-xl border transition-colors cursor-pointer ${filterPriority === 'critical' ? 'bg-red-500/10 border-red-500/50' : 'bg-argos-surface border-argos-border hover:border-argos-blue/30'}`}
          >
            <p className="text-2xl font-bold text-red-400">{criticalCount}</p>
            <p className="text-sm text-argos-muted">긴급 (Critical)</p>
          </button>
          <button
            onClick={() => setFilterPriority(filterPriority === 'high' ? null : 'high')}
            className={`p-4 rounded-xl border transition-colors cursor-pointer ${filterPriority === 'high' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-argos-surface border-argos-border hover:border-argos-blue/30'}`}
          >
            <p className="text-2xl font-bold text-amber-400">{highCount}</p>
            <p className="text-sm text-argos-muted">높음 (High)</p>
          </button>
          <button
            onClick={() => setFilterPriority(filterPriority === 'medium' ? null : 'medium')}
            className={`p-4 rounded-xl border transition-colors cursor-pointer ${filterPriority === 'medium' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-argos-surface border-argos-border hover:border-argos-blue/30'}`}
          >
            <p className="text-2xl font-bold text-blue-400">{totalItems - criticalCount - highCount}</p>
            <p className="text-sm text-argos-muted">보통 (Medium)</p>
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {filteredCategories.map((cat) => {
            const Icon = cat.icon;
            const isExpanded = expandedCategories.has(cat.id);

            return (
              <div key={cat.id} className="bg-argos-surface border border-argos-border rounded-xl overflow-hidden shadow-argos-card">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-argos-bgAlt transition-colors cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-lg ${cat.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${cat.color}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-semibold text-argos-ink">{cat.name}</h2>
                      <span className="text-sm text-argos-faint">{cat.items.length}건</span>
                    </div>
                    <p className="text-sm text-argos-muted mt-0.5">{cat.description}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-argos-faint" /> : <ChevronDown className="w-5 h-5 text-argos-faint" />}
                </button>

                {/* Action items */}
                {isExpanded && (
                  <div className="border-t border-argos-border">
                    {cat.items.map((item, idx) => {
                      const ps = PRIORITY_STYLES[item.priority];
                      return (
                        <div key={item.id} className={`px-6 py-5 ${idx > 0 ? 'border-t border-argos-borderSoft' : ''}`}>
                          {/* Title row */}
                          <div className="flex items-start gap-3">
                            <span className={`shrink-0 mt-0.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${ps.bg} ${ps.text} ${ps.border}`}>
                              {ps.label}
                            </span>
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-argos-ink leading-relaxed">{item.title}</h3>
                              <div className="flex items-center gap-4 mt-2 text-sm">
                                <span className="text-argos-faint">목표 기간: <span className="text-argos-inkSoft">{item.timeframe}</span></span>
                                <span className="text-argos-faint">
                                  LG <span className="text-red-400 font-medium">{item.lgCurrent}점</span> vs {item.competitorBest.name} <span className="text-emerald-400 font-medium">{item.competitorBest.score}점</span>
                                  {item.gap > 0 && <span className="text-red-400 ml-1">(−{item.gap})</span>}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Gap bar */}
                          <div className="mt-3 ml-14">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-argos-faint w-8">LG</span>
                              <div className="flex-1 h-2 bg-argos-bgAlt rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-400 rounded-full transition-all"
                                  style={{ width: `${item.lgCurrent * 10}%` }}
                                />
                              </div>
                              <span className="text-xs text-argos-faint w-16">{item.competitorBest.name.split(' ')[0]}</span>
                              <div className="flex-1 h-2 bg-argos-bgAlt rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-400 rounded-full transition-all"
                                  style={{ width: `${item.competitorBest.score * 10}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Reason */}
                          <div className="mt-3 ml-14 p-4 bg-argos-bgAlt border border-argos-borderSoft rounded-lg">
                            <p className="text-sm text-argos-inkSoft leading-relaxed">
                              <span className="text-argos-faint font-medium">이유: </span>
                              {item.reason}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AuthGuard>
  );
}
