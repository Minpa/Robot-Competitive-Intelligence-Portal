'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, LayoutDashboard, MessageSquarePlus, Plus } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { NotificationBell } from '@/components/issues/NotificationBell';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/issues',         label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/issues/ask',     label: 'Ask',     icon: MessageSquarePlus, exact: false },
  { href: '/issues/inbox',   label: '내 인박스', icon: Inbox, exact: false },
];

export default function IssuesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
          <div className="px-6 py-3 flex items-center gap-6">
            <Link href="/issues" className="text-base font-semibold tracking-tight text-slate-900">
              이슈 트래커
            </Link>
            <nav className="flex items-center gap-1">
              {TABS.map((t) => {
                const isActive = t.exact ? pathname === t.href : pathname?.startsWith(t.href);
                const Icon = t.icon;
                return (
                  <Link key={t.href} href={t.href}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium',
                      isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                    )}>
                    <Icon className="w-3.5 h-3.5" />
                    {t.label}
                  </Link>
                );
              })}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/issues/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50">
                <Plus className="w-3.5 h-3.5" />
                새 이슈
              </Link>
              <NotificationBell />
            </div>
          </div>
        </header>
        <main className="px-6 py-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
