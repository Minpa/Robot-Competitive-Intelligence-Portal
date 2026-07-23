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
  Newspaper,
  Building2,
  Cpu,
  Factory,
  PlayCircle,
  TrendingUp,
  Brain,
  Cog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

// 접을 수 있는 서브 그룹 (예: 기술 > 핸드 > 트렌드/영상/리스트)
interface NavSubGroup {
  name: string;
  icon: any;
  children: NavItem[];
}

type NavEntry = NavItem | NavSubGroup;

function isSubGroup(entry: NavEntry): entry is NavSubGroup {
  return 'children' in entry;
}

interface NavGroup {
  title: string;
  subtitle?: string;
  items: NavEntry[];
}

const navigationGroups: NavGroup[] = [
  {
    title: '동향 브리핑',
    subtitle: 'Daily Brief',
    items: [
      { name: '영상기반 경쟁사 트렌드', href: '/video-trends', icon: TrendingUp },
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
      { name: '기사 트렌드', href: '/trend-brief', icon: Newspaper },
      { name: '영상 트렌드', href: '/videos', icon: PlayCircle },
      { name: '로봇 레이더 비교', href: '/humanoid-trend', icon: Radar },
      { name: '로봇 항목별 매트릭스', href: '/compare/matrix', icon: Table2 },
      { name: '로봇 Perfect 분석', href: '/compare/benchmark', icon: Target },
      { name: 'CLOiD 개선 항목 분석', href: '/action-items', icon: Zap },
    ],
  },
  {
    title: '기술 (단위기술)',
    subtitle: 'Technology',
    items: [
      {
        name: '핸드',
        icon: Hand,
        children: [
          { name: '논문 트렌드', href: '/tech/hand', icon: TrendingUp },
          { name: '영상 트렌드', href: '/tech/hand/videos', icon: PlayCircle },
          { name: '리스트', href: '/hand-registry', icon: List },
        ],
      },
      {
        name: 'RFM',
        icon: Brain,
        children: [
          { name: '논문 트렌드', href: '/tech/rfm', icon: TrendingUp },
          { name: '영상 트렌드', href: '/tech/rfm/videos', icon: PlayCircle },
        ],
      },
      {
        name: '액추에이터',
        icon: Cog,
        children: [
          { name: '논문 트렌드', href: '/tech/actuator', icon: TrendingUp },
          { name: '영상 트렌드', href: '/tech/actuator/videos', icon: PlayCircle },
        ],
      },
      { name: '컴포넌트 트렌드', href: '/components-trend', icon: Cpu },
    ],
  },
  {
    title: '전시회 동향',
    subtitle: 'Exhibition Watch',
    items: [
      { name: '기사 트렌드', href: '/tech/expo', icon: Presentation },
      { name: '영상 트렌드', href: '/tech/expo/videos', icon: PlayCircle },
      { name: '이벤트 캘린더', href: '/event-calendar', icon: CalendarDays },
    ],
  },
  {
    title: '양산 적용',
    subtitle: 'Production Watch',
    items: [
      { name: '기사 트렌드', href: '/tech/production', icon: Factory },
      { name: '영상 트렌드', href: '/tech/production/videos', icon: PlayCircle },
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
      { name: '영상 감지 로봇 후보', href: '/admin/robot-candidates', icon: Bot },
      { name: '관리자 설정', href: '/admin', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // 서브 그룹 접힘 상태 — 명시 토글이 없으면 활성 항목 포함 여부로 자동 결정
  const [subGroupOpen, setSubGroupOpen] = useState<Record<string, boolean>>({});

  const toggleGroup = (title: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const isItemActive = (item: NavItem) =>
    pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

  return (
    <aside className="w-[264px] bg-ink-50 text-ink-600 min-h-screen flex flex-col border-r border-ink-200">
      {/* Logo Block */}
      <div className="px-5 pt-6 pb-5 border-b border-ink-200">
        <Link href="/video-trends" className="block">
          <div className="flex items-baseline gap-2">
            <h1 className="font-mono text-[22px] font-semibold tracking-[3px] leading-none text-ink-900">
              ARGOS
            </h1>
          </div>
          <p className="font-mono text-[10px] text-ink-400 uppercase tracking-[2px] mt-2">
            Robot Intelligence
          </p>
          <p className="font-mono text-[9px] text-ink-300 mt-1">
            MODE v4.2
          </p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navigationGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.title);
          const hasActiveItem = group.items.some((entry) =>
            isSubGroup(entry) ? entry.children.some(isItemActive) : isItemActive(entry)
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
                    hasActiveItem ? 'text-ink-900' : 'text-ink-400'
                  )}>
                    {group.subtitle}
                  </span>
                  <span className={cn(
                    'text-[11.5px] font-medium mt-1',
                    hasActiveItem ? 'text-ink-900' : 'text-ink-500 group-hover:text-ink-900'
                  )}>
                    {group.title}
                  </span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-ink-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-ink-400" />
                )}
              </button>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="mt-1.5 space-y-px">
                  {group.items.map((entry) => {
                    const renderLink = (item: NavItem, indented = false) => {
                      const isActive = isItemActive(item);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={cn(
                            'relative flex items-center gap-2.5 pr-3 py-2 text-[13px] rounded-lg transition-colors',
                            indented ? 'pl-9' : 'pl-4',
                            isActive
                              ? 'bg-ink-100 text-ink-900 font-semibold shadow-[inset_3px_0_0_#1F2328]'
                              : 'text-ink-600 font-medium hover:bg-ink-100 hover:text-ink-900'
                          )}
                        >
                          {item.icon && (
                            <item.icon
                              className={cn(
                                'w-[14px] h-[14px] shrink-0',
                                isActive ? 'text-ink-900' : 'text-ink-500'
                              )}
                              strokeWidth={isActive ? 2.25 : 1.75}
                            />
                          )}
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    };

                    if (isSubGroup(entry)) {
                      const key = `${group.title}/${entry.name}`;
                      const hasActiveChild = entry.children.some(isItemActive);
                      // 기본 펼침 — 사용자가 명시적으로 접은 경우에만 접힌다
                      const isOpen = subGroupOpen[key] ?? true;
                      return (
                        <div key={entry.name}>
                          <button
                            onClick={() =>
                              setSubGroupOpen((prev) => ({ ...prev, [key]: !isOpen }))
                            }
                            className={cn(
                              'w-full flex items-center gap-2.5 pl-4 pr-3 py-2 text-[13px] rounded-lg transition-colors',
                              hasActiveChild
                                ? 'text-ink-900 font-semibold'
                                : 'text-ink-600 font-medium hover:bg-ink-100 hover:text-ink-900'
                            )}
                          >
                            <entry.icon
                              className={cn(
                                'w-[14px] h-[14px] shrink-0',
                                hasActiveChild ? 'text-ink-900' : 'text-ink-500'
                              )}
                              strokeWidth={hasActiveChild ? 2.25 : 1.75}
                            />
                            <span className="truncate flex-1 text-left">{entry.name}</span>
                            {isOpen ? (
                              <ChevronDown className="w-3 h-3 text-ink-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-ink-400 shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="space-y-px">
                              {entry.children.map((child) => renderLink(child, true))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return renderLink(entry);
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer — Generate Report CTA */}
      <div className="p-4 border-t border-ink-200">
        <button className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-[#111417] text-white font-mono text-[10px] font-semibold uppercase tracking-[0.18em] py-2.5 rounded-[9px] transition-colors">
          <FileText className="w-3.5 h-3.5" strokeWidth={2.25} />
          Generate Report
        </button>
      </div>
    </aside>
  );
}
