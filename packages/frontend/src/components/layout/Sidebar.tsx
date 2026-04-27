'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Settings,
  FileText,
  ChevronDown,
  ChevronRight,
  FlaskConical,
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
  Presentation,
  Boxes,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  children?: NavItem[];
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
      { name: '리스트 기반', href: '/humanoid-robots', icon: List, children: [
        { name: '국가리스트', href: '/humanoid-robots/countries', icon: Globe },
      ] },
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
    title: '컴플라이언스3',
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
    title: '프로토타입',
    subtitle: 'Prototypes',
    items: [
      { name: 'CLOiD 전시 시뮬레이터', href: '/cloid-simulator', icon: Boxes },
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
    <aside className="w-60 bg-brand text-brand-ink min-h-screen flex flex-col">
      {/* Logo Block */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <Link href="/robot-evolution" className="block">
          <div className="flex items-baseline gap-2">
            <h1 className="font-serif text-[22px] font-semibold tracking-tight leading-none text-white">
              ARGOS
            </h1>
            <span className="font-mono text-[9px] font-medium text-gold tracking-[0.18em] uppercase">
              AWE 2026
            </span>
          </div>
          <p className="font-mono text-[9px] text-white/50 uppercase tracking-[0.22em] mt-2">
            Robot Intelligence
          </p>
          <p className="font-mono text-[9px] text-white/35 mt-1">
            MODE v4.2
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navigationGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.title);
          const hasActiveItem = group.items.some(
            item => pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href)) ||
              item.children?.some(c => pathname === c.href || (c.href !== '/' && pathname.startsWith(c.href)))
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
                    'font-mono text-[9px] font-medium uppercase tracking-[0.22em]',
                    hasActiveItem ? 'text-gold' : 'text-white/45'
                  )}>
                    {group.subtitle}
                  </span>
                  <span className={cn(
                    'text-[11.5px] font-medium mt-1',
                    hasActiveItem ? 'text-white' : 'text-white/70 group-hover:text-white'
                  )}>
                    {group.title}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                )}
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="mt-1.5 space-y-px">
                  {group.items.map((item) => {
                    const childActive = item.children?.some(
                      c => pathname === c.href || (c.href !== '/' && pathname.startsWith(c.href))
                    );
                    const isActive = !childActive && (
                      pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href))
                    );
                    const isHighlighted = isActive || childActive;

                    return (
                      <div key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            'relative flex items-center gap-2.5 pl-4 pr-3 py-2 text-[12.5px] font-medium transition-colors',
                            isHighlighted
                              ? 'bg-white/[0.08] text-white'
                              : 'text-white/65 hover:bg-white/[0.04] hover:text-white'
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-gold" />
                          )}
                          {item.icon && (
                            <item.icon
                              className={cn(
                                'w-[14px] h-[14px] shrink-0',
                                isHighlighted ? 'text-gold' : 'text-white/50'
                              )}
                              strokeWidth={isHighlighted ? 2.25 : 1.75}
                            />
                          )}
                          <span className="truncate">{item.name}</span>
                        </Link>
                        {item.children && (
                          <div className="space-y-px">
                            {item.children.map((child) => {
                              const isChildActive = pathname === child.href ||
                                (child.href !== '/' && pathname.startsWith(child.href));
                              return (
                                <Link
                                  key={child.name}
                                  href={child.href}
                                  className={cn(
                                    'relative flex items-center gap-2.5 pl-9 pr-3 py-1.5 text-[11.5px] font-medium transition-colors',
                                    isChildActive
                                      ? 'bg-white/[0.08] text-white'
                                      : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
                                  )}
                                >
                                  {isChildActive && (
                                    <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-gold" />
                                  )}
                                  {child.icon && (
                                    <child.icon
                                      className={cn(
                                        'w-[12px] h-[12px] shrink-0',
                                        isChildActive ? 'text-gold' : 'text-white/40'
                                      )}
                                      strokeWidth={isChildActive ? 2.25 : 1.75}
                                    />
                                  )}
                                  <span className="truncate">{child.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer — Generate Report CTA */}
      <div className="p-4 border-t border-white/10">
        <button className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-brand font-mono text-[10px] font-semibold uppercase tracking-[0.18em] py-2.5 transition-colors">
          <FileText className="w-3.5 h-3.5" strokeWidth={2.25} />
          Generate Report
        </button>
      </div>
    </aside>
  );
}
