'use client';

import { useEffect } from 'react';

interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  country: string;
  mainProduct: string;
  mainSpec: string;
}

interface Event {
  id: string;
  date: string;
  type: 'investment' | 'poc' | 'production' | 'other';
  description: string;
}

interface SegmentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  locomotion: string;
  purpose: string;
  topCompanies: Company[];
  recentEvents: Event[];
  totalRobots: number;
}

const locomotionLabels: Record<string, string> = {
  bipedal: '2족 보행',
  biped: '2족 보행',
  wheeled: '휠베이스',
  wheel: '휠베이스',
  hybrid: '하이브리드',
};

const purposeLabels: Record<string, string> = {
  industrial: '산업용',
  home: '가정용',
  service: '서비스용',
  other: '기타',
};

const eventTypeStyles: Record<string, { bg: string; text: string; label: string }> = {
  investment: { bg: 'bg-green-500/20', text: 'text-green-400', label: '투자' },
  poc: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'PoC' },
  production: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: '양산' },
  other: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: '기타' },
};

export function SegmentDetailDrawer({
  isOpen,
  onClose,
  locomotion,
  purpose,
  topCompanies,
  recentEvents,
  totalRobots,
}: SegmentDetailDrawerProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {locomotionLabels[locomotion] || locomotion} × {purposeLabels[purpose] || purpose}
            </h2>
            <p className="text-sm text-slate-400">총 {totalRobots}개 제품</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Top Companies */}
          <section>
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>🏢</span>
              Top 3 회사
            </h3>
            <div className="space-y-3">
              {topCompanies.length > 0 ? (
                topCompanies.slice(0, 3).map((company, idx) => (
                  <div
                    key={company.id}
                    className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      {/* Rank badge */}
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                          idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                          'bg-orange-500/20 text-orange-400'}
                      `}>
                        {idx + 1}
                      </div>

                      {/* Company info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{company.name}</span>
                          <span className="text-xs text-slate-500">{company.country}</span>
                        </div>
                        <p className="text-sm text-slate-400">대표 제품: {company.mainProduct}</p>
                        <p className="text-xs text-slate-500 mt-1">{company.mainSpec}</p>
                      </div>

                      {/* Logo placeholder */}
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={company.name}
                          className="w-10 h-10 rounded object-contain bg-white"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-700 flex items-center justify-center text-slate-500 text-xs">
                          Logo
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">회사 정보가 없습니다</p>
              )}
            </div>
          </section>

          {/* Recent Events Timeline */}
          <section>
            <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>📅</span>
              최근 이벤트
            </h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />

              {/* Events */}
              <div className="space-y-4">
                {recentEvents.length > 0 ? (
                  recentEvents.slice(0, 3).map((event) => {
                    const style = eventTypeStyles[event.type] || eventTypeStyles.other;
                    return (
                      <div key={event.id} className="relative pl-10">
                        {/* Timeline dot */}
                        <div className={`absolute left-2 w-4 h-4 rounded-full ${style.bg} border-2 border-slate-900`} />

                        {/* Event content */}
                        <div className="bg-slate-800/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-slate-500">{event.date}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                              {style.label}
                            </span>
                          </div>
                          <p className="text-sm text-white">{event.description}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4 pl-10">이벤트가 없습니다</p>
                )}
              </div>
            </div>
          </section>

          {/* View All Button */}
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            이 세그먼트 전체 보기 →
          </button>
        </div>
      </div>
    </>
  );
}
