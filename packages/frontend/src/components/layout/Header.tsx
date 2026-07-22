'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Bell, LogOut, Sun, Moon, HelpCircle, Settings as SettingsIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Theme = 'dark' | 'light';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('사용자');
  const [userRole, setUserRole] = useState('ARCHITECT_01');
  const [theme, setTheme] = useState<Theme>('light');
  const router = useRouter();

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
    <header className="h-16 bg-white border-b border-ink-200 px-7 flex items-center gap-6">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input
            type="text"
            placeholder="Search fleet, reports, regulations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-9 bg-paper border border-ink-200 rounded-[9px] text-[13px] text-ink-800 placeholder:text-ink-400 focus:outline-none focus:border-ink-400 focus:ring-1 focus:ring-ink-300 transition-colors font-sans"
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
          <div className="w-[34px] h-[34px] rounded-full bg-[#2F333A] flex items-center justify-center text-white text-[13px] font-semibold">
            {initials}
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="ml-1 p-2 rounded-lg text-ink-500 hover:text-neg hover:bg-neg-soft transition-colors"
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
      className="relative p-2 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-ink-100 transition-colors"
    >
      {children}
      {dot && <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] bg-ink-500 rounded-full" />}
    </button>
  );
}
