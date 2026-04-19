'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Bell, LogOut, Sun, Moon, HelpCircle, Settings as SettingsIcon } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

type Theme = 'dark' | 'light';

const TOP_NAV = [
  { label: 'Fleet',        href: '/robot-evolution' },
  { label: 'Telemetry',    href: '/humanoid-robots' },
  { label: 'Intelligence', href: '/humanoid-trend' },
  { label: 'Strategy',     href: '/action-items' },
  { label: 'Compliance',   href: '/compliance' },
];

const BREADCRUMBS: Record<string, string> = {
  '/robot-evolution':    'FLEET › EVOLUTION',
  '/humanoid-robots':    'TELEMETRY › REGISTRY',
  '/humanoid-trend':     'INTELLIGENCE › TREND',
  '/compare/matrix':     'INTELLIGENCE › MATRIX',
  '/compare/benchmark':  'INTELLIGENCE › BENCHMARK',
  '/action-items':       'STRATEGY › ACTION',
  '/insight-pipeline':   'INTELLIGENCE › PIPELINE',
  '/national-projects':  'INTELLIGENCE › R&D',
  '/reports':            'INTELLIGENCE › REPORTS',
  '/compliance':         'COMPLIANCE › DASHBOARD',
  '/search':             'SEARCH',
  '/admin':              'ADMIN',
};

function resolveBreadcrumb(pathname: string): string {
  const direct = BREADCRUMBS[pathname];
  if (direct) return direct;
  const match = Object.keys(BREADCRUMBS)
    .filter(k => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? BREADCRUMBS[match] : 'ARGOS';
}

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('사용자');
  const [userRole, setUserRole] = useState('ARCHITECT_01');
  const [theme, setTheme] = useState<Theme>('light');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        setUserName(user.email?.split('@')[0] || '사용자');
        if (user.role) setUserRole(String(user.role).toUpperCase());
      }
    } catch {}

    try {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme === 'dark') {
        setTheme('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        setTheme('light');
        document.documentElement.removeAttribute('data-theme');
      }
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', next); } catch {}
      if (next === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      return next;
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const initials = (userName[0] || 'U').toUpperCase();
  const breadcrumb = resolveBreadcrumb(pathname);

  return (
    <header className="h-14 bg-paper border-b border-ink-200 px-6 flex items-center gap-6">
      {/* Breadcrumb */}
      <div className="shrink-0">
        <p className="font-mono text-[10px] font-medium text-ink-500 uppercase tracking-[0.22em]">
          {breadcrumb}
        </p>
      </div>

      {/* Top nav (horizontal module selector) */}
      <nav className="flex items-center gap-4 shrink-0 border-l border-ink-200 pl-6 h-full">
        {TOP_NAV.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative h-full flex items-center text-[12px] font-medium tracking-wide transition-colors',
                isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800'
              )}
            >
              {item.label}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-gold" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Search (center-ish, flex-grow) */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input
            type="text"
            placeholder="Search fleet, reports, regulations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-8 bg-white border border-ink-200 text-[12px] text-ink-800 placeholder:text-ink-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors font-sans"
          />
        </div>
      </form>

      {/* Right cluster */}
      <div className="flex items-center gap-1 ml-auto shrink-0">
        <IconBtn onClick={toggleTheme} title={theme === 'dark' ? '라이트 모드' : '다크 모드'}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </IconBtn>
        <IconBtn title="도움말">
          <HelpCircle className="w-4 h-4" />
        </IconBtn>
        <IconBtn title="설정">
          <SettingsIcon className="w-4 h-4" />
        </IconBtn>
        <IconBtn title="알림" dot>
          <Bell className="w-4 h-4" />
        </IconBtn>

        <div className="w-px h-5 bg-ink-200 mx-2" />

        <div className="flex items-center gap-2.5 pr-1">
          <div className="text-right leading-tight">
            <div className="font-mono text-[10px] font-semibold text-ink-800 tracking-[0.14em]">{userRole}</div>
            <div className="text-[10px] text-ink-500">{userName}</div>
          </div>
          <div className="w-8 h-8 bg-brand flex items-center justify-center text-white font-mono text-[11px] font-semibold">
            {initials}
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="ml-1 p-2 text-ink-500 hover:text-neg hover:bg-neg-soft transition-colors"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  dot,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  dot?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="relative p-2 text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors"
    >
      {children}
      {dot && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-gold rounded-full" />}
    </button>
  );
}

function cn(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(' ');
}
