'use client';

import { useState, useEffect } from 'react';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('사용자');
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        setUserName(user.email?.split('@')[0] || '사용자');
      }
    } catch {}
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between">
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="회사, 제품, 기사 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
        </div>
      </form>

      <div className="flex items-center gap-2">
        <button className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 text-slate-300 rounded-lg">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-medium">{userName}</span>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs">로그아웃</span>
        </button>
      </div>
    </header>
  );
}
