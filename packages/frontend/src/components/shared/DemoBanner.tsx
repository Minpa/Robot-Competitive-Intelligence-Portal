'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  X,
  Monitor,
  GitBranch,
  Radar,
  FlaskConical,
  Search,
  Settings,
} from 'lucide-react';

const DEMO_STOPS = [
  { href: '/robot-evolution', label: '로봇리스트', icon: GitBranch, desc: '타임라인 기반 로봇 목록' },
  { href: '/humanoid-trend', label: '경쟁비교', icon: Radar, desc: '레이더 차트 & 항목별 비교' },
  { href: '/insight-pipeline', label: '정보 수집', icon: FlaskConical, desc: 'AI 분석 & 국책과제' },
  { href: '/search', label: '검색', icon: Search, desc: '사이트 내 검색' },
  { href: '/admin', label: '관리', icon: Settings, desc: '관리자 설정' },
];

export function DemoBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('demo_banner_dismissed');
    if (!stored) {
      setVisible(true);
    }
  }, []);

  if (dismissed || !visible) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('demo_banner_dismissed', 'true');
  };

  const currentIdx = DEMO_STOPS.findIndex(s => pathname.startsWith(s.href));

  return (
    <div className="bg-gradient-to-r from-blue-900/40 via-slate-900/60 to-cyan-900/40 border-b border-blue-500/20">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-300">DEMO MODE</span>
            </div>
            <span className="text-xs text-slate-500 hidden md:inline">|</span>
            <span className="text-xs text-slate-400 hidden md:inline">AWE 2026 Presentation Tour</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {DEMO_STOPS.map((stop, i) => {
              const Icon = stop.icon;
              const isCurrent = pathname.startsWith(stop.href);
              return (
                <Link
                  key={stop.href}
                  href={stop.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    isCurrent
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                  title={stop.desc}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden lg:inline">{stop.label}</span>
                  <span className="lg:hidden">{i + 1}</span>
                </Link>
              );
            })}
          </div>

          <button
            onClick={handleDismiss}
            className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors flex-shrink-0"
            title="데모 모드 닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
