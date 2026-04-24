'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Maximize2 } from 'lucide-react';

export default function CloidSimulatorPage() {
  const [viewportHeight, setViewportHeight] = useState('calc(100vh - 180px)');

  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(`${window.innerHeight - 180}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div className="-m-8 flex flex-col bg-[#0a0a0a]">
      <div className="flex items-center justify-between px-6 py-3 bg-[#0f0f0f] border-b border-white/10">
        <div className="flex flex-col">
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.22em] text-[#E63950]">
            Prototype · Phase 0.5
          </span>
          <span className="text-[13px] font-medium text-white mt-0.5">
            CLOiD Exhibition Scenario Simulator
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/prototypes/cloid-exhibition-simulator.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-white/70 hover:text-white border border-white/15 hover:border-white/30 transition-colors"
          >
            <Maximize2 className="w-3 h-3" strokeWidth={2} />
            Fullscreen
          </a>
          <a
            href="/prototypes/cloid-exhibition-simulator.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-[#0a0a0a] bg-[#E63950] hover:bg-[#ff4d64] transition-colors"
          >
            <ExternalLink className="w-3 h-3" strokeWidth={2} />
            Open in new tab
          </a>
        </div>
      </div>
      <iframe
        src="/prototypes/cloid-exhibition-simulator.html"
        title="CLOiD Exhibition Scenario Simulator"
        style={{ height: viewportHeight }}
        className="w-full border-0 bg-[#0a0a0a]"
      />
    </div>
  );
}
