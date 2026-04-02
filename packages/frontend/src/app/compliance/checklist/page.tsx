'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { CheckSquare, AlertTriangle, Filter, Globe, Shield, Scale, Lock, ChevronDown, ChevronRight } from 'lucide-react';

const CATEGORY_OPTIONS = [
  { value: '', label: '전체 카테고리' },
  { value: 'policy', label: '정책·산업규제' },
  { value: 'safety', label: '물리적·기능적 안전' },
  { value: 'legal', label: '법적 책임·배상' },
  { value: 'privacy', label: '개인정보보호' },
];

const REGION_OPTIONS = [
  { value: '', label: '전체 지역' },
  { value: 'korea', label: '🇰🇷 한국' },
  { value: 'us', label: '🇺🇸 미국' },
  { value: 'eu', label: '🇪🇺 EU' },
  { value: 'china', label: '🇨🇳 중국' },
  { value: 'international', label: '🌐 국제' },
];

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'not_started', label: '미시작' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'completed', label: '완료' },
  { value: 'blocked', label: '차단됨' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: '전체 우선순위' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  not_started: { label: '미시작', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/30' },
  in_progress: { label: '진행 중', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  completed: { label: '완료', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  blocked: { label: '차단됨', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
};

const PRIORITY_DOTS: Record<string, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-green-400',
};

const CATEGORY_CONFIG: Record<string, { label: string; icon: any }> = {
  policy: { label: '정책·산업규제', icon: Globe },
  safety: { label: '물리적·기능적 안전', icon: Shield },
  legal: { label: '법적 책임·배상', icon: Scale },
  privacy: { label: '개인정보보호', icon: Lock },
};

const REGION_FLAGS: Record<string, string> = {
  korea: '🇰🇷', us: '🇺🇸', eu: '🇪🇺', china: '🇨🇳', international: '🌐',
};

const STATUS_CYCLE: Record<string, string> = {
  not_started: 'in_progress',
  in_progress: 'completed',
  completed: 'not_started',
  blocked: 'not_started',
};

export default function ComplianceChecklistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState({
    category: '',
    region: '',
    status: '',
    priority: '',
  });

  const loadChecklist = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.category) params.category = filters.category;
      if (filters.region) params.region = filters.region;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      const data = await api.compliance.getChecklist(params);
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  // Read initial priority filter from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const priority = urlParams.get('priority');
      if (priority) {
        setFilters(prev => ({ ...prev, priority }));
      }
    }
  }, []);

  function toggleExpand(id: string) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpandAll() {
    if (expandedItems.size === items.length) {
      setExpandedItems(new Set());
    } else {
      setExpandedItems(new Set(items.map(i => i.id)));
    }
  }

  function renderDescription(text: string) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;
      if (trimmed.startsWith('## ')) {
        return <h4 key={i} className="text-sm font-semibold text-slate-200 mt-3 mb-1">{trimmed.replace('## ', '')}</h4>;
      }
      if (/^\d+\.\s\*\*/.test(trimmed)) {
        const match = trimmed.match(/^(\d+)\.\s\*\*([^*]+)\*\*:?\s*(.*)/);
        if (match) {
          return (
            <div key={i} className="flex gap-2 ml-2 mb-1">
              <span className="text-blue-400 font-mono text-xs mt-0.5">{match[1]}.</span>
              <div>
                <span className="text-sm font-medium text-slate-300">{match[2]}</span>
                {match[3] && <span className="text-sm text-slate-400">: {match[3]}</span>}
              </div>
            </div>
          );
        }
      }
      if (trimmed.startsWith('- ')) {
        return (
          <div key={i} className="flex gap-2 ml-4 mb-0.5">
            <span className="text-slate-500 mt-1">•</span>
            <span className="text-sm text-slate-400">{trimmed.replace('- ', '')}</span>
          </div>
        );
      }
      // Bold text handling
      const parts = trimmed.split(/\*\*([^*]+)\*\*/g);
      return (
        <p key={i} className="text-sm text-slate-400 mb-0.5">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-slate-300">{part}</strong> : part)}
        </p>
      );
    });
  }

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  async function handleStatusChange(item: any) {
    const nextStatus = STATUS_CYCLE[item.status] || 'not_started';
    try {
      await api.compliance.updateChecklistItem(item.id, { status: nextStatus });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i));
    } catch (err: any) {
      alert('상태 변경 실패: ' + err.message);
    }
  }

  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'completed').length;
  const criticalRemaining = items.filter(i => i.priority === 'critical' && i.status !== 'completed').length;
  const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Group by category
  const grouped = items.reduce((acc: Record<string, any[]>, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
          <CheckSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">LG 컴플라이언스 체크리스트</h1>
          <p className="text-sm text-slate-400">Compliance Checklist</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              <span className="font-bold text-slate-100">{completedItems}</span> / {totalItems} 완료
            </span>
            <span className="text-sm text-slate-500">|</span>
            <span className="text-sm text-slate-300">
              진행률 <span className="font-bold text-blue-400">{completionRate}%</span>
            </span>
            {criticalRemaining > 0 && (
              <>
                <span className="text-sm text-slate-500">|</span>
                <span className="text-sm text-red-400">
                  Critical 미완료 <span className="font-bold">{criticalRemaining}</span>건
                </span>
              </>
            )}
          </div>
          <button
            onClick={toggleExpandAll}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition bg-slate-900/50"
          >
            {expandedItems.size === items.length && items.length > 0 ? '전체 접기' : '전체 펼치기'}
          </button>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
          <Filter className="w-4 h-4" />
          <span>필터</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'category', options: CATEGORY_OPTIONS },
            { key: 'region', options: REGION_OPTIONS },
            { key: 'status', options: STATUS_OPTIONS },
            { key: 'priority', options: PRIORITY_OPTIONS },
          ].map(({ key, options }) => (
            <select
              key={key}
              value={filters[key as keyof typeof filters]}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
            >
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={loadChecklist} className="mt-2 px-3 py-1 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition text-sm">
            다시 시도
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 border border-slate-700 animate-pulse">
              <div className="h-5 bg-slate-700 rounded w-1/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-slate-700 rounded w-3/4" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist Grouped by Category */}
      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
              <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">해당 조건의 체크리스트 항목이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, categoryItems]) => {
                const catConfig = CATEGORY_CONFIG[category];
                const CatIcon = catConfig?.icon || CheckSquare;
                const catCompleted = (categoryItems as any[]).filter((i: any) => i.status === 'completed').length;
                return (
                  <div key={category} className="bg-slate-800 rounded-xl border border-slate-700">
                    {/* Category Header */}
                    <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CatIcon className="w-5 h-5 text-slate-400" />
                        <h3 className="text-base font-semibold text-slate-200">
                          {catConfig?.label || category}
                        </h3>
                        <span className="text-xs text-slate-500">
                          {catCompleted}/{(categoryItems as any[]).length} 완료
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-slate-700/50">
                      {(categoryItems as any[]).map((item: any) => {
                        const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started;
                        const isExpanded = expandedItems.has(item.id);
                        return (
                          <div key={item.id}>
                            <div
                              className="px-5 py-3 flex items-center gap-4 hover:bg-slate-700/20 transition cursor-pointer"
                              onClick={() => toggleExpand(item.id)}
                            >
                              {/* Chevron */}
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              }

                              {/* Priority dot */}
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOTS[item.priority] || PRIORITY_DOTS.medium}`} />

                              {/* Title & Info */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${item.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-slate-500">
                                    {REGION_FLAGS[item.region] || ''} {item.region}
                                  </span>
                                  {item.assignee && (
                                    <>
                                      <span className="text-xs text-slate-600">·</span>
                                      <span className="text-xs text-slate-500">{item.assignee}</span>
                                    </>
                                  )}
                                  <span className="text-xs text-slate-600">·</span>
                                  <span className={`text-xs ${item.priority === 'critical' ? 'text-red-400' : item.priority === 'high' ? 'text-orange-400' : 'text-slate-500'}`}>
                                    {item.priority}
                                  </span>
                                </div>
                              </div>

                              {/* Status Button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(item); }}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition hover:opacity-80 ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}
                                title="클릭하여 상태 변경"
                              >
                                {statusCfg.label}
                              </button>
                            </div>
                            {isExpanded && item.description && (
                              <div className="px-5 pb-4 pt-1 ml-7 border-l-2 border-slate-700">
                                <div className="bg-slate-900/50 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                                  {renderDescription(item.description)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
