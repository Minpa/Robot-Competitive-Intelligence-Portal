'use client';

import { Lightbulb, Info } from 'lucide-react';

interface ExecutiveQuestionsProps {
  activeTab: 'manual' | 'ai-agent';
  onQuestionClick: (question: string) => void;
}

const EXECUTIVE_QUESTIONS = [
  { id: 1, label: '세그먼트 히트맵', question: '어떤 환경×작업 조합에 로봇이 가장 많이 투입되고 있나?' },
  { id: 2, label: '상용화 전환', question: '프로토타입에서 상용화까지 전환율은 어떻게 되나?' },
  { id: 3, label: '플레이어 확장', question: '주요 기업들의 포트폴리오 확장 추이는?' },
  { id: 4, label: '가격·성능', question: '로봇 성능 지표(페이로드, DOF 등)의 연도별 트렌드는?' },
  { id: 5, label: '부품 채택', question: '어떤 부품 유형이 가장 많이 채택되고 있나?' },
  { id: 6, label: '키워드 포지션', question: '어떤 키워드가 급상승/하락하고 있나?' },
  { id: 7, label: '산업별 도입', question: '어떤 산업에서 로봇 도입이 가장 활발한가?' },
  { id: 8, label: '지역별 경쟁', question: '지역별 경쟁 구도는 어떻게 되나?' },
  { id: 9, label: '핵심 기술', question: '주요 기술 키워드의 분포는?' },
  { id: 10, label: 'Top 이벤트', question: '최근 주요 이벤트/뉴스는?' },
] as const;

export function ExecutiveQuestions({ activeTab, onQuestionClick }: ExecutiveQuestionsProps) {
  if (activeTab === 'manual') {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Info className="w-4 h-4 shrink-0" />
          <span>이 기사에서 어떤 회사/제품/부품 정보를 추출할 수 있을까?</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400" />
        경영진 핵심 질문
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {EXECUTIVE_QUESTIONS.map((item) => (
          <button
            key={item.id}
            onClick={() => onQuestionClick(item.question)}
            className="shrink-0 px-3 py-1.5 text-sm rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/50 transition-colors cursor-pointer whitespace-nowrap"
            title={item.question}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
