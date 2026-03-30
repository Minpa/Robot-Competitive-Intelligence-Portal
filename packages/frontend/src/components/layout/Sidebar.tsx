'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Settings,
  TrendingUp,
  Bot,
  FileText,
  Presentation,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  ClipboardCheck,
  GitBranch,
  Radar,
  Table2,
  Target,
  BookOpen,
  Globe,
  List,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: '로봇리스트',
    items: [
      { name: '타임라인 기반', href: '/robot-evolution', icon: GitBranch },
      { name: '리스트 기반', href: '/humanoid-robots', icon: List },
    ],
  },
  {
    title: '경쟁비교',
    items: [
      { name: '레이더 차트', href: '/humanoid-trend', icon: Radar },
      { name: '항목별 비교', href: '/compare/matrix', icon: Table2 },
      { name: 'Perfect 대비 분석', href: '/compare/benchmark', icon: Target },
    ],
  },
  {
    title: '정보 수집',
    items: [
      { name: 'AI 활용 / 기사 입력', href: '/insight-pipeline', icon: FlaskConical },
      { name: '국내 국책과제 검색', href: '/national-projects', icon: Globe },
      { name: 'Report / AI 현황분석', href: '/reports', icon: Presentation },
    ],
  },
  {
    title: '검색',
    items: [
      { name: '사이트 내 검색', href: '/search', icon: Search },
    ],
  },
  {
    title: '관리',
    items: [
      { name: '관리자 설정', href: '/admin', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col border-r border-slate-700">
      {/* Logo */}
      <div className="p-4 border-b border-slate-700">
        <Link href="/robot-evolution" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-200 tracking-tight">ARUGOS</h1>
              <span className="text-[9px] font-semibold bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded-md border border-cyan-500/20">AWE 2026</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">Autonomous Robot Global Observatory System</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navigationGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.title);
          const hasActiveItem = group.items.some(
            item => pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
          );

          return (
            <div key={group.title}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.title)}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium uppercase tracking-wider rounded transition-colors',
                  hasActiveItem ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                <span>{group.title}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                          isActive
                            ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        )}
                      >
                        {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
            <span className="text-xs text-slate-300"></span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200 truncate">사용자</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
