'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Swords,
  Clock,
  Users,
  Briefcase,
  FlaskConical,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LgRobotSelector } from './LgRobotSelector';
import type { ReactNode } from 'react';

interface Tab {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { name: '대시보드', href: '/war-room', icon: LayoutDashboard },
  { name: '경쟁 분석', href: '/war-room/competitive', icon: Swords },
  { name: '시계열+알림', href: '/war-room/timeline', icon: Clock },
  { name: '파트너 전략', href: '/war-room/partners', icon: Users },
  { name: '사업 전략', href: '/war-room/business', icon: Briefcase },
  { name: '시뮬레이션', href: '/war-room/simulation', icon: FlaskConical },
  { name: 'CI 업데이트', href: '/war-room/ci-update', icon: RefreshCw },
];

export function WarRoomLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">전략 워룸</h1>
            <p className="text-sm text-slate-400 mt-1">
              LG 휴머노이드 전략 분석 대시보드
            </p>
          </div>
          <LgRobotSelector />
        </div>

        {/* Tab Navigation */}
        <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-800 pb-px" aria-label="전략 워룸 탭">
          {tabs.map((tab) => {
            const isActive =
              tab.href === '/war-room'
                ? pathname === '/war-room'
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-b-2 border-blue-500 bg-slate-800/50 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
