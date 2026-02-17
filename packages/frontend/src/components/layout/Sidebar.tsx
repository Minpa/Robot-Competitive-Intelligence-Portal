'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Package,
  Search,
  Settings,
  TrendingUp,
  Download,
  Sparkles,
  Bot,
  Cpu,
  FileText,
  Presentation,
  Briefcase,
  BarChart3,
  Database,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  ClipboardCheck,
  LineChart,
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
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    title: '분석',
    items: [
      { name: '분석 대시보드', href: '/dashboard', icon: BarChart3 },
    ],
  },
  {
    title: '데이터',
    items: [
      { name: '휴머노이드 카탈로그', href: '/humanoid-robots', icon: Bot },
      { name: '회사 데이터', href: '/companies', icon: Building2 },
      { name: '부품·SoC/액추에이터', href: '/components-trend', icon: Cpu },
      { name: '적용 사례', href: '/application-cases', icon: Briefcase },
    ],
  },
  {
    title: '기사·이벤트',
    items: [
      { name: '기사 분석 도구', href: '/article-analyzer', icon: FileText },
      { name: '기사 분석 파이프라인', href: '/analysis', icon: FlaskConical },
      { name: '엔티티 검토', href: '/review', icon: ClipboardCheck },
      // { name: '키워드 트렌드', href: '/keywords', icon: TrendingUp }, // 임시 비활성화 - 실제 기사 데이터 필요
    ],
  },
  {
    title: '리포트',
    items: [
      { name: '경영진 대시보드', href: '/executive', icon: LineChart },
      { name: '월간 브리프', href: '/brief', icon: FileText },
      { name: 'PPT 리포트 빌더', href: '/ppt-builder', icon: Presentation },
      { name: '데이터 내보내기', href: '/export', icon: Download },
    ],
  },
  {
    title: '관리',
    items: [
      { name: '데이터 수집', href: '/analyze', icon: Sparkles },
      { name: '검색', href: '/search', icon: Search },
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
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col border-r border-slate-800">
      {/* Logo */}
      <div className="p-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">HRIP</h1>
            <p className="text-xs text-slate-400 leading-tight">Humanoid Robot<br/>Intelligence Platform</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navigationGroups.map((group) => {
          const isCollapsed = collapsedGroups.has(group.title);
          const hasActiveItem = group.items.some(
            item => pathname === item.href || 
              (item.href !== '/' && item.href !== '/dashboard' && pathname.startsWith(item.href))
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
                      (item.href !== '/' && item.href !== '/dashboard' && pathname.startsWith(item.href));
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                          isActive
                            ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
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
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
            <span className="text-xs text-slate-300">👤</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">사용자</p>
            <p className="text-xs text-slate-500">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
