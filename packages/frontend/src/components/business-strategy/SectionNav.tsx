'use client';

import { SECTIONS } from './data';

export default function SectionNav() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-0 z-30 bg-paper/90 backdrop-blur-sm border-b border-ink-200 px-4 py-2 flex gap-2 overflow-x-auto">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => scrollTo(s.id)}
          className="whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border border-ink-200 text-ink-700 hover:bg-gold/10 hover:border-gold hover:text-gold transition-colors"
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
