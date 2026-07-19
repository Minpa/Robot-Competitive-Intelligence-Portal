'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { name: '레이더 비교', href: '/humanoid-trend' },
  { name: '항목별 매트릭스', href: '/compare/matrix' },
  { name: 'Perfect 분석', href: '/compare/benchmark' },
];

/**
 * 로봇 비교 화면들(레이더/매트릭스/Perfect)을 하나의 흐름으로 묶는 공통 탭 내비게이션.
 */
export function RobotCompareNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-ink-200 mb-6">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-4 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-gold text-ink-900'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            )}
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
