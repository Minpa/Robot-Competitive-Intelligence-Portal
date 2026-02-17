'use client';

import { useState } from 'react';
import { Link2, Plus, Check, Star } from 'lucide-react';

interface LinkCandidate {
  entityId: string;
  entityName: string;
  entityType: string;
  similarityScore: number;
  isAutoRecommended: boolean;
}

interface ParsedEntity {
  name: string;
  type: string;
  confidence: number;
  context: string;
}

interface EntityLinkingPanelProps {
  candidates: Record<string, LinkCandidate[]>;
  unmatched: ParsedEntity[];
  onConfirm: (links: { parsedName: string; linkedEntityId: string }[], newEntities: { name: string; type: string }[]) => void;
  isLoading: boolean;
}

export function EntityLinkingPanel({ candidates, unmatched, onConfirm, isLoading }: EntityLinkingPanelProps) {
  const [selectedLinks, setSelectedLinks] = useState<Record<string, string>>({});
  const [createNew, setCreateNew] = useState<Set<string>>(new Set());

  const handleSelect = (parsedName: string, entityId: string) => {
    setSelectedLinks(prev => ({ ...prev, [parsedName]: entityId }));
    setCreateNew(prev => { const n = new Set(prev); n.delete(parsedName); return n; });
  };

  const handleCreateNew = (name: string) => {
    setCreateNew(prev => new Set(prev).add(name));
    setSelectedLinks(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const handleConfirm = () => {
    const links = Object.entries(selectedLinks).map(([parsedName, linkedEntityId]) => ({
      parsedName,
      linkedEntityId,
    }));
    const newEntities = [...createNew].map(name => {
      const entity = unmatched.find(u => u.name === name);
      return { name, type: entity?.type || 'keyword' };
    });
    onConfirm(links, newEntities);
  };

  const allNames = [...Object.keys(candidates), ...unmatched.map(u => u.name)];
  if (allNames.length === 0) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Link2 className="w-5 h-5 text-cyan-400" />
        엔티티 링킹
      </h2>
      <p className="text-sm text-slate-400">추출된 엔티티를 기존 DB와 연결하거나 신규 생성하세요.</p>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {Object.entries(candidates).map(([name, cands]) => (
          <div key={name} className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-sm font-medium text-white mb-2">{name}</p>
            <div className="space-y-1">
              {cands.map(c => (
                <button
                  key={c.entityId}
                  onClick={() => handleSelect(name, c.entityId)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-all ${
                    selectedLinks[name] === c.entityId
                      ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/40'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {c.isAutoRecommended && <Star className="w-3 h-3 text-amber-400" />}
                    {c.entityName}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs opacity-60">{Math.round(c.similarityScore * 100)}%</span>
                    {selectedLinks[name] === c.entityId && <Check className="w-4 h-4" />}
                  </span>
                </button>
              ))}
              <button
                onClick={() => handleCreateNew(name)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
                  createNew.has(name)
                    ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40'
                    : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
                }`}
              >
                <Plus className="w-3 h-3" /> 신규 생성
              </button>
            </div>
          </div>
        ))}

        {unmatched.filter(u => !Object.keys(candidates).includes(u.name)).map(u => (
          <div key={u.name} className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-sm font-medium text-white mb-2">{u.name} <span className="text-xs text-slate-500">({u.type})</span></p>
            <p className="text-xs text-slate-500 mb-2">매칭 후보 없음</p>
            <button
              onClick={() => handleCreateNew(u.name)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-all ${
                createNew.has(u.name)
                  ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40'
                  : 'bg-slate-700/30 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              <Plus className="w-3 h-3" /> 신규 생성
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all"
      >
        {isLoading ? '처리 중...' : '링킹 확정'}
      </button>
    </div>
  );
}
