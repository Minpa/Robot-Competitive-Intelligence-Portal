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

  return (
    <header className="h-16 bg-argos-surface border-b border-argos-border px-6 flex items-center gap-6">
      {/* Top nav (horizontal module selector) */}
      <nav className="flex items-center gap-1 shrink-0">
        {TOP_NAV.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative px-3 py-2 text-[13px] font-semibold transition-colors',
                isActive ? 'text-argos-ink' : 'text-argos-muted hover:text-argos-ink'
              )}
            >
              {item.label}
              {isActive && (
                <span className="absolute left-3 right-3 -bottom-[17px] h-[2px] bg-argos-blue rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-argos-faint" />
          <input
            type="text"
            placeholder="Search Global Fleet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-9 bg-argos-bg border border-argos-border rounded-lg text-[13px] text-argos-ink placeholder:text-argos-faint focus:outline-none focus:border-argos-blue focus:ring-2 focus:ring-argos-blue/15 transition-all"
          />
        </div>
      </form>

      {/* Right cluster */}
      <div className="flex items-center gap-1 ml-auto">
        <IconBtn onClick={toggleTheme} title={theme === 'dark' ? '라이트 모드' : '다크 모드'}>
          {theme === 'dark' ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
        </IconBtn>
        <IconBtn title="도움말">
          <HelpCircle className="w-[17px] h-[17px]" />
        </IconBtn>
        <IconBtn title="설정">
          <SettingsIcon className="w-[17px] h-[17px]" />
        </IconBtn>
        <IconBtn title="알림" dot>
          <Bell className="w-[17px] h-[17px]" />
        </IconBtn>

        <div className="w-px h-6 bg-argos-border mx-2" />

        <div className="flex items-center gap-2.5 pr-1">
          <div className="text-right leading-tight">
            <div className="text-[11px] font-bold text-argos-ink tracking-wide">{userRole}</div>
            <div className="text-[10px] text-argos-muted">{userName}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-argos-navy flex items-center justify-center text-white text-[12px] font-bold ring-2 ring-argos-bg">
            {initials}
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="ml-1 p-2 text-argos-muted hover:text-argos-danger hover:bg-argos-dangerBg rounded-lg transition-colors"
          title="로그아웃"
        >
          <LogOut className="w-[17px] h-[17px]" />
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
      className="relative p-2 text-argos-muted hover:text-argos-ink hover:bg-argos-bgAlt rounded-lg transition-colors"
    >
      {children}
      {dot && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-argos-blue rounded-full" />}
    </button>
  );
}

function cn(...cls: (string | false | undefined)[]) {
  return cls.filter(Boolean).join(' ');
}
