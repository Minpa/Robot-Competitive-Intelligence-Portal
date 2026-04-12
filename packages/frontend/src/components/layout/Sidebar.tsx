'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Settings,
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
  Globe,
  List,
  Zap,
  LayoutDashboard,
  Bell,
  CheckSquare,
  Database,
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
  subtitle?: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: '로봇리스트',
    subtitle: 'Robot Registry',
    items: [
      { name: '타임라인 기반', href: '/robot-evolution', icon: GitBranch },
      { name: '리스트 기반', href: '/humanoid-robots', icon: List },
    ],
  },
  {
    title: '경쟁비교',
    subtitle: 'Competitive Compare',
    items: [
      { name: '레이더 차트', href: '/humanoid-trend', icon: Radar },
      { name: '항목별 비교', href: '/compare/matrix', icon: Table2 },
      { name: 'Perfect 대비 분석', href: '/compare/benchmark', icon: Target },
      { name: '전략 제언 / Action', href: '/action-items', icon: Zap },
    ],
  },
  {
    title: '정보 수집',
    subtitle: 'Intelligence Feed',
    items: [
      { name: 'AI 활용 / 기사 입력', href: '/insight-pipeline', icon: FlaskConical },
      { name: '국내 국책과제 검색', href: '/national-projects', icon: Globe },
      { name: 'Report / AI 현황분석', href: '/reports', icon: Presentation },
    ],
  },
  {
    title: '컴플라이언스',
    subtitle: 'Compliance',
    items: [
      { name: '규제 대시보드', href: '/compliance', icon: LayoutDashboard },
      { name: '규제 업데이트 피드', href: '/compliance/updates', icon: Bell },
      { name: 'LG 체크리스트', href: '/compliance/checklist', icon: CheckSquare },
      { name: '규제 상세 DB', href: '/compliance/regulations', icon: Database },
      { name: '규제 문서 라이브러리', href: '/compliance/documents', icon: FileText },
    ],
  },
  {
    title: '검색',
    subtitle: 'Search',
    items: [
      { name: '사이트 내 검색', href: '/search', icon: Search },
    ],
  },
  {
    title: '관리',
    subtitle: 'Administration',
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
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <aside className="w-64 bg-argos-surface min-h-screen flex flex-col border-r border-argos-border">
      {/* Logo Block */}
      <div className="px-5 pt-5 pb-6 border-b border-argos-border">
        <Link href="/robot-evolution" className="flex items-start gap-3">
          <div className="w-11 h-11 bg-argos-navy rounded-lg flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5 text-white" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5">
              <h1 className="text-[17px] font-extrabold text-argos-ink tracking-tight leading-none">ARGOS</h1>
              <span className="text-[9px] font-bold bg-argos-chip text-argos-chipInk px-1.5 py-0.5 rounded tracking-wider">
                AWE 2026
              </span>
            </div>
            <p className="text-[10px] font-semibold text-argos-muted uppercase tracking-[0.14em] mt-1 leading-tight">
              Robot Intelligence
            </p>
            <p className="text-[9px] text-argos-faint leading-tight mt-0.5">
              MODE v4.2
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
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
                className="w-full flex items-center justify-between px-2 py-1 group"
              >
                <div className="flex flex-col items-start">
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-[0.16em]',
                    hasActiveItem ? 'text-argos-blue' : 'text-argos-faint'
                  )}>
                    {group.subtitle}
                  </span>
                  <span className={cn(
                    'text-[11px] font-semibold mt-0.5',
                    hasActiveItem ? 'text-argos-ink' : 'text-argos-inkSoft group-hover:text-argos-ink'
                  )}>
                    {group.title}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-argos-faint" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-argos-faint" />
                )}
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="mt-2 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'relative flex items-center gap-2.5 pl-4 pr-3 py-2 rounded-lg text-[13px] font-medium transition-all',
                          isActive
                            ? 'bg-argos-chip text-argos-blue'
                            : 'text-argos-inkSoft hover:bg-argos-bgAlt hover:text-argos-ink'
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-argos-blue" />
                        )}
                        {item.icon && (
                          <item.icon
                            className={cn(
                              'w-[15px] h-[15px] shrink-0',
                              isActive ? 'text-argos-blue' : 'text-argos-muted'
                            )}
                            strokeWidth={isActive ? 2.25 : 2}
                          />
                        )}
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

      {/* Footer — Generate Report CTA */}
      <div className="p-4 border-t border-argos-border">
        <button className="w-full flex items-center justify-center gap-2 bg-argos-navy hover:bg-argos-navyDark text-white text-[12px] font-semibold py-2.5 rounded-lg transition-colors tracking-wide">
          <FileText className="w-3.5 h-3.5" />
          Generate Report
        </button>
      </div>
    </aside>
  );
}
