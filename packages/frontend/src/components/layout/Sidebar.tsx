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
  Presentation,
  Boxes,
  CalendarDays,
  Wrench,
  Grid3x3,
  Bot,
  Hand,
  Grab,
  Newspaper,
  Building2,
  Cpu,
  Factory,
  PlayCircle,
  TrendingUp,
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
    title: '동향 브리핑',
    subtitle: 'Daily Brief',
    items: [
      { name: '동향 브리핑', href: '/trend-brief', icon: Newspaper },
      { name: '데모 영상', href: '/videos', icon: PlayCircle },
      { name: '영상 트렌드', href: '/video-trends', icon: TrendingUp },
      { name: '이벤트 캘린더', href: '/event-calendar', icon: CalendarDays },
    ],
  },
  {
    title: '경쟁사',
    subtitle: 'Companies',
    items: [
      { name: '기업 리스트', href: '/companies', icon: Building2 },
    ],
  },
  {
    title: '로봇',
    subtitle: 'Robots',
    items: [
      { name: '로봇 리스트', href: '/humanoid-robots', icon: List },
      { name: '로봇 타임라인', href: '/robot-evolution', icon: GitBranch },
      { name: '로봇 레이더 비교', href: '/humanoid-trend', icon: Radar },
      { name: '로봇 항목별 매트릭스', href: '/compare/matrix', icon: Table2 },
      { name: '로봇 Perfect 분석', href: '/compare/benchmark', icon: Target },
      { name: 'CLOiD 개선 항목 분석', href: '/action-items', icon: Zap },
    ],
  },
  {
    title: '기술',
    subtitle: 'Technology',
    items: [
      { name: '핸드 리스트', href: '/hand-registry', icon: Hand },
      { name: '그리퍼 리스트', href: '/gripper-registry', icon: Grab },
      { name: '핸드 Perfect 분석', href: '/compare/hand-benchmark', icon: Hand },
      { name: '컴포넌트 트렌드', href: '/components-trend', icon: Cpu },
    ],
  },
  {
    title: '양산·사업화',
    subtitle: 'Production & Business',
    items: [
      { name: '도입/적용 사례', href: '/application-cases', icon: Factory },
    ],
  },
  // 프로젝트 관리 메뉴 숨김 처리 (요청에 따라 비활성화)
  // {
  //   title: '프로젝트 관리',
  //   subtitle: 'Project Management',
  //   items: [
  //     { name: 'ARGOS Projects', href: '/projects', icon: FolderKanban },
  //     { name: '포트폴리오', href: '/portfolio', icon: LayoutDashboard },
  //     { name: '이슈 트래커', href: '/issues', icon: Inbox },
  //   ],
  // },
  {
    title: '정보 수집',
    subtitle: 'Intelligence Feed',
    items: [
      { name: 'AI 활용 / 기사 입력', href: '/insight-pipeline', icon: FlaskConical },
      { name: '국내 국책과제 검색', href: '/national-projects', icon: Globe },
      { name: 'Report / AI 현황분석', href: '/reports', icon: Presentation },
    ],
  },
  // 컴플라이언스 메뉴 그룹 숨김 처리 (요청에 따라 비활성화)
  // {
  //   title: '컴플라이언스',
  //   subtitle: 'Compliance',
  //   items: [
  //     { name: '규제 대시보드', href: '/compliance', icon: LayoutDashboard },
  //     { name: '규제 업데이트 피드', href: '/compliance/updates', icon: Bell },
  //     { name: 'LG 체크리스트', href: '/compliance/checklist', icon: CheckSquare },
  //     { name: '규제 상세 DB', href: '/compliance/regulations', icon: Database },
  //     { name: '규제 문서 라이브러리', href: '/compliance/documents', icon: FileText },
  //   ],
  // },
  {
    title: '시뮬레이션',
    subtitle: 'Simulation',
    items: [
      { name: '전시/운영 시뮬레이션', href: '/cloid-simulator', icon: Boxes },
      // 제품 기획 시뮬레이션 메뉴 숨김 처리 (요청에 따라 비활성화)
      // { name: '제품 기획 시뮬레이션', href: '/argos-designer', icon: Wrench },
    ],
  },
  // 데이터 팩토리 메뉴 그룹 숨김 처리 (요청에 따라 비활성화)
  // {
  //   title: '데이터 팩토리',
  //   subtitle: 'Data Factory',
  //   items: [
  //     { name: 'Data Pipeline', href: '/data-factory', icon: Cpu },
  //   ],
  // },
  {
    title: '레거시 메뉴',
    subtitle: 'Legacy',
    items: [
      { name: '진입 매트릭스', href: '/business-strategy/matrix', icon: Grid3x3 },
      { name: 'CLOiD 커버리지', href: '/business-strategy/cloid-coverage/v13', icon: Wrench },
      { name: 'LGE 세탁기 공정', href: '/business-strategy/lge-processes', icon: Wrench },
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
      { name: 'LG 휴머노이드 스펙 입력', href: '/lg-humanoid-specs', icon: Bot },
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
        <Link href="/trend-brief" className="block">
          <div className="flex items-baseline gap-2">
            <h1 className="font-serif text-[22px] font-semibold tracking-tight leading-none text-white">
              ARGOS
            </h1>
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
                    const isActive = pathname === item.href ||
                      (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'relative flex items-center gap-2.5 pl-4 pr-3 py-2 text-[12.5px] font-medium transition-colors',
                          isActive
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
                              isActive ? 'text-gold' : 'text-white/50'
                            )}
                            strokeWidth={isActive ? 2.25 : 1.75}
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
      <div className="p-4 border-t border-white/10">
        <button className="w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold/90 text-brand font-mono text-[10px] font-semibold uppercase tracking-[0.18em] py-2.5 transition-colors">
          <FileText className="w-3.5 h-3.5" strokeWidth={2.25} />
          Generate Report
        </button>
      </div>
    </aside>
  );
}
