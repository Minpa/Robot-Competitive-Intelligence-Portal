'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import MatrixHeader from '@/components/entry-matrix/MatrixHeader';
import MatrixGrid from '@/components/entry-matrix/MatrixGrid';
import MatrixLegend from '@/components/entry-matrix/MatrixLegend';
import EntryRadar from '@/components/entry-matrix/EntryRadar';
import CellModal from '@/components/entry-matrix/CellModal';
import type { EmphasisMode } from '@/components/entry-matrix/data';

function EntryMatrixContent() {
  const [mode, setMode] = useState<EmphasisMode>('all');
  const [selected, setSelected] = useState<{ t: number; s: number } | null>(null);

  return (
    <div className="min-h-screen bg-white" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <MatrixHeader mode={mode} onModeChange={setMode} />
        <MatrixGrid mode={mode} onCellClick={(t, s) => setSelected({ t, s })} />
        <MatrixLegend />
        <EntryRadar />
      </div>

      {selected && (
        <CellModal
          taskIdx={selected.t}
          sectorIdx={selected.s}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

export default function EntryMatrixPage() {
  return (
    <AuthGuard>
      <EntryMatrixContent />
    </AuthGuard>
  );
}
