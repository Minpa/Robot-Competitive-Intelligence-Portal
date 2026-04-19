'use client';

const SECTIONS = [
  { id: 'poc-radar', label: 'PoC 레이더' },
  { id: 'soc-ecosystem', label: 'SoC 에코시스템' },
  { id: 'spec-comparison', label: '스펙 비교' },
];

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
          className="whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border border-ink-200 text-ink-700 hover:bg-blue-600/20 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}
