'use client';

import Link from 'next/link';
import { TOP_5 } from './data';

export default function DeepDiveProgress({ current }: { current: number }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E8E6DD] shadow-[0_-2px_6px_rgba(0,0,0,0.04)]"
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
        <div className="grid grid-cols-5 gap-1.5">
          {TOP_5.map((t, i) => {
            const active = i === current;
            return (
              <Link
                key={t.rank}
                href={`/business-strategy/matrix/deepdive/${i}`}
                className={`flex flex-col px-3 py-2 transition-colors ${
                  active
                    ? 'bg-[#8B1538] text-white'
                    : 'bg-white text-[#2C2C2A] border border-[#E8E6DD] hover:border-[#8B1538]'
                }`}
                style={{ borderRadius: 4 }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-mono text-[10px] font-medium tracking-[0.16em] ${
                      active ? 'text-white' : 'text-[#8B1538]'
                    }`}
                  >
                    {t.rank.toString().padStart(2, '0')}
                  </span>
                  <span
                    className={`font-mono text-[12px] font-medium ${
                      active ? 'text-white' : 'text-[#2C2C2A]'
                    }`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {t.score.toFixed(1)}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-medium leading-tight mt-1 truncate ${
                    active ? 'text-white' : 'text-[#5F5E5A]'
                  }`}
                >
                  {t.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
