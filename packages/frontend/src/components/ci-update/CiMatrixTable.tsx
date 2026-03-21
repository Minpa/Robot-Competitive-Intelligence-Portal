'use client';

import { useState } from 'react';
import type { CiMatrixData, CiValue, CiValueUpdateRequest } from '@/types/ci-update';
import { api } from '@/lib/api';

// Confidence badge colors
const confidenceColors: Record<string, string> = {
  A: 'bg-green-500/20 text-green-400 border-green-500/30',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  C: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  D: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  F: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Freshness indicator based on lastVerified date
function getFreshnessIndicator(lastVerified: string | null): { icon: string; label: string; color: string } {
  if (!lastVerified) return { icon: '\u26AB', label: '\uBBF8\uAC80\uC99D', color: 'text-slate-500' };
  const days = Math.floor((Date.now() - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 30) return { icon: '\uD83D\uDFE2', label: `${days}\uC77C \uC804`, color: 'text-green-400' };
  if (days <= 90) return { icon: '\uD83D\uDFE1', label: `${days}\uC77C \uC804`, color: 'text-yellow-400' };
  return { icon: '\uD83D\uDD34', label: `${days}\uC77C+ \uC804`, color: 'text-red-400' };
}

interface EditingCell {
  valueId: string;
  value: string;
  confidence: string;
  source: string;
  sourceUrl: string;
  sourceDate: string;
  changeReason: string;
}

interface CiMatrixTableProps {
  data: CiMatrixData;
  onRefresh: () => void;
}

export function CiMatrixTable({ data, onRefresh }: CiMatrixTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(data.layers.map(l => l.id)));
  const [saving, setSaving] = useState(false);
  const [historyValueId, setHistoryValueId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const toggleLayer = (layerId: string) => {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  const startEdit = (cv: CiValue) => {
    setEditingCell({
      valueId: cv.id,
      value: cv.value || '',
      confidence: cv.confidence || 'D',
      source: cv.source || '',
      sourceUrl: cv.sourceUrl || '',
      sourceDate: cv.sourceDate || '',
      changeReason: '',
    });
  };

  const cancelEdit = () => setEditingCell(null);

  const saveEdit = async () => {
    if (!editingCell) return;
    setSaving(true);
    try {
      await api.updateCiValue(editingCell.valueId, {
        value: editingCell.value,
        confidence: editingCell.confidence,
        source: editingCell.source,
        sourceUrl: editingCell.sourceUrl,
        sourceDate: editingCell.sourceDate,
        changedBy: 'admin',
      });
      setEditingCell(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async (valueId: string) => {
    try {
      const history = await api.getCiValueHistory(valueId);
      setHistoryData(history);
      setHistoryValueId(valueId);
      setShowHistory(true);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };

  const { competitors, layers } = data;

  return (
    <div className="relative">
      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-lg w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">{'\uBCC0\uACBD \uC774\uB825'}</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white">{'\u2715'}</button>
            </div>
            {historyData.length === 0 ? (
              <p className="text-slate-400 text-sm">{'\uBCC0\uACBD \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}</p>
            ) : (
              <div className="space-y-3">
                {historyData.map((h: any) => (
                  <div key={h.id} className="bg-slate-700/50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>{h.changedBy || '\uC2DC\uC2A4\uD15C'}</span>
                      <span>{new Date(h.changedAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 line-through">{h.oldValue || '(\uC5C6\uC74C)'}</span>
                      <span className="text-slate-500">{'\u2192'}</span>
                      <span className="text-green-400">{h.newValue || '(\uC5C6\uC74C)'}</span>
                    </div>
                    {h.oldConfidence !== h.newConfidence && (
                      <div className="text-xs text-slate-400 mt-1">
                        {'\uC2E0\uB8B0\uB3C4'}: {h.oldConfidence || '-'} {'\u2192'} {h.newConfidence || '-'}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">{h.changeSource}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={cancelEdit}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{'\uC140 \uD3B8\uC9D1'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{'\uAC12'}</label>
                <input
                  value={editingCell.value}
                  onChange={e => setEditingCell({ ...editingCell, value: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{'\uC2E0\uB8B0\uB3C4'}</label>
                <div className="flex gap-2">
                  {['A', 'B', 'C', 'D', 'F'].map(c => (
                    <button
                      key={c}
                      onClick={() => setEditingCell({ ...editingCell, confidence: c })}
                      className={`px-3 py-1 rounded text-sm font-medium border ${
                        editingCell.confidence === c
                          ? confidenceColors[c]
                          : 'bg-slate-700 text-slate-400 border-slate-600'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{'\uCD9C\uCC98'}</label>
                <input
                  value={editingCell.source}
                  onChange={e => setEditingCell({ ...editingCell, source: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{'\uCD9C\uCC98 URL'}</label>
                <input
                  value={editingCell.sourceUrl}
                  onChange={e => setEditingCell({ ...editingCell, sourceUrl: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">{'\uCD9C\uCC98\uC77C'}</label>
                <input
                  type="date"
                  value={editingCell.sourceDate}
                  onChange={e => setEditingCell({ ...editingCell, sourceDate: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button onClick={cancelEdit} className="px-4 py-2 rounded bg-slate-700 text-slate-300 text-sm hover:bg-slate-600">{'\uCDE8\uC18C'}</button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? '\uC800\uC7A5 \uC911...' : '\uC800\uC7A5'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-slate-900 text-left text-xs font-medium text-slate-400 px-3 py-2 border-b border-slate-700 min-w-[200px]">
                {'\uBE44\uAD50 \uD56D\uBAA9'}
              </th>
              {competitors.map(comp => (
                <th key={comp.id} className="text-center text-xs font-medium text-slate-300 px-3 py-2 border-b border-slate-700 min-w-[160px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-semibold">{comp.name}</span>
                    <span className="text-[10px] text-slate-500">{comp.manufacturer}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      comp.stage === 'commercial' ? 'bg-green-500/20 text-green-400' :
                      comp.stage === 'pilot' ? 'bg-blue-500/20 text-blue-400' :
                      comp.stage === 'poc' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {comp.stage}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {layers.map(layer => (
              <>
                {/* Layer header row */}
                <tr
                  key={`layer-${layer.id}`}
                  className="cursor-pointer hover:bg-slate-800/50"
                  onClick={() => toggleLayer(layer.id)}
                >
                  <td
                    colSpan={competitors.length + 1}
                    className="px-3 py-2 bg-slate-800/80 border-b border-slate-700"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{expandedLayers.has(layer.id) ? '\u25BC' : '\u25B6'}</span>
                      <span className="text-lg">{layer.icon}</span>
                      <span className="font-semibold text-white text-sm">{layer.name}</span>
                    </div>
                  </td>
                </tr>

                {expandedLayers.has(layer.id) && layer.categories.map(category => (
                  <>
                    {/* Category header */}
                    <tr key={`cat-${category.id}`}>
                      <td
                        colSpan={competitors.length + 1}
                        className="px-3 py-1.5 bg-slate-800/40 border-b border-slate-700/50"
                      >
                        <span className="text-xs font-medium text-slate-400 pl-6">{category.name}</span>
                      </td>
                    </tr>

                    {/* Items */}
                    {category.items.map(item => (
                      <tr key={`item-${item.id}`} className="hover:bg-slate-800/30 group">
                        <td className="sticky left-0 z-10 bg-slate-900 text-xs text-slate-300 px-3 py-2 border-b border-slate-700/30 pl-10">
                          {item.name}
                        </td>
                        {competitors.map(comp => {
                          const cv = item.values[comp.id];
                          if (!cv) {
                            return (
                              <td key={comp.id} className="text-center text-xs text-slate-600 px-2 py-2 border-b border-slate-700/30">
                                {'\u2014'}
                              </td>
                            );
                          }
                          const freshness = getFreshnessIndicator(cv.lastVerified);
                          return (
                            <td
                              key={comp.id}
                              className="text-center text-xs px-2 py-2 border-b border-slate-700/30 cursor-pointer hover:bg-blue-500/10 transition-colors relative"
                              onClick={() => startEdit(cv)}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-slate-200">{cv.value || '\u2014'}</span>
                                <div className="flex items-center gap-1">
                                  <span className={`inline-block px-1 py-0 rounded text-[10px] font-mono border ${confidenceColors[cv.confidence] || confidenceColors.D}`}>
                                    {cv.confidence}
                                  </span>
                                  <span className={`text-[10px] ${freshness.color}`} title={`\uCD5C\uC885 \uAC80\uC99D: ${freshness.label}`}>
                                    {freshness.icon}
                                  </span>
                                </div>
                              </div>
                              {/* History button (visible on hover) */}
                              <button
                                className="absolute top-0.5 right-0.5 text-[10px] text-slate-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); loadHistory(cv.id); }}
                                title={'\uBCC0\uACBD \uC774\uB825'}
                              >
                                {'\uD83D\uDCCB'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
