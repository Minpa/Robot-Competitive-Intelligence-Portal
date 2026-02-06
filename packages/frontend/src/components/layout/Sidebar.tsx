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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: '대시보드', href: '/', icon: LayoutDashboard },
  { name: '회사', href: '/companies', icon: Building2 },
  { name: '제품', href: '/products', icon: Package },
  { name: '데이터 수집', href: '/analyze', icon: Sparkles },
  { name: '키워드', href: '/keywords', icon: TrendingUp },
  { name: '검색', href: '/search', icon: Search },
  { name: '내보내기', href: '/export', icon: Download },
  { name: '관리', href: '/admin', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">RCIP</h1>
        <p className="text-sm text-gray-400">Robot Intelligence Portal</p>
      </div>

      <nav className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
