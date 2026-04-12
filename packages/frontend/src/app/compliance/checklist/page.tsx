'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  CheckSquare, AlertTriangle, Filter, Globe, Shield, Scale, Lock,
  ChevronDown, ChevronRight, Factory, ArrowRightLeft, Lightbulb, HelpCircle,
  Plus, Clock, TrendingUp, Send, Trash2, BarChart3,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

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

// Tabs for the expanded item detail
type DetailTab = 'description' | 'comparison' | 'progress';

export default function ComplianceChecklistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, DetailTab>>({});

  // Progress logs per item
  const [progressLogs, setProgressLogs] = useState<Record<string, any[]>>({});
  const [progressLogsLoading, setProgressLogsLoading] = useState<Record<string, boolean>>({});

  // New log form
  const [newLogContent, setNewLogContent] = useState<Record<string, string>>({});
  const [newLogProgress, setNewLogProgress] = useState<Record<string, string>>({});
  const [submittingLog, setSubmittingLog] = useState<Record<string, boolean>>({});

  // Overall progress
  const [overallProgress, setOverallProgress] = useState<any>(null);

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

  const loadOverallProgress = useCallback(async () => {
    try {
      const data = await api.compliance.getOverallProgress();
      setOverallProgress(data);
    } catch (_err) { /* silent */ }
  }, []);

  useEffect(() => {
    loadChecklist();
    loadOverallProgress();
  }, [loadChecklist, loadOverallProgress]);

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

  function getActiveTab(itemId: string): DetailTab {
    return activeTab[itemId] || 'description';
  }

  function setItemTab(itemId: string, tab: DetailTab) {
    setActiveTab(prev => ({ ...prev, [itemId]: tab }));
  }

  async function loadProgressLogs(itemId: string) {
    if (progressLogsLoading[itemId]) return;
    setProgressLogsLoading(prev => ({ ...prev, [itemId]: true }));
    try {
      const logs = await api.compliance.getProgressLogs(itemId);
      setProgressLogs(prev => ({ ...prev, [itemId]: logs }));
    } catch (_err) { /* silent */ }
    setProgressLogsLoading(prev => ({ ...prev, [itemId]: false }));
  }

  async function submitProgressLog(itemId: string) {
    const content = newLogContent[itemId]?.trim();
    if (!content) return;
    setSubmittingLog(prev => ({ ...prev, [itemId]: true }));
    try {
      const progressPct = newLogProgress[itemId] ? parseInt(newLogProgress[itemId]) : undefined;
      await api.compliance.addProgressLog(itemId, {
        content,
        progressPct: progressPct !== undefined && !isNaN(progressPct) ? Math.min(100, Math.max(0, progressPct)) : undefined,
      });
      setNewLogContent(prev => ({ ...prev, [itemId]: '' }));
      setNewLogProgress(prev => ({ ...prev, [itemId]: '' }));
      await loadProgressLogs(itemId);
      // Refresh items and overall progress
      await Promise.all([loadChecklist(), loadOverallProgress()]);
    } catch (err: any) {
      alert('진행이력 등록 실패: ' + err.message);
    }
    setSubmittingLog(prev => ({ ...prev, [itemId]: false }));
  }

  function renderDescription(text: string) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-2" />;
      if (trimmed.startsWith('## ')) {
        return <h4 key={i} className="text-sm font-semibold text-argos-ink mt-3 mb-1">{trimmed.replace('## ', '')}</h4>;
      }
      if (/^\d+\.\s\*\*/.test(trimmed)) {
        const match = trimmed.match(/^(\d+)\.\s\*\*([^*]+)\*\*:?\s*(.*)/);
        if (match) {
          return (
            <div key={i} className="flex gap-2 ml-2 mb-1">
              <span className="text-blue-400 font-mono text-xs mt-0.5">{match[1]}.</span>
              <div>
                <span className="text-sm font-medium text-argos-inkSoft">{match[2]}</span>
                {match[3] && <span className="text-sm text-argos-muted">: {match[3]}</span>}
              </div>
            </div>
          );
        }
      }
      if (trimmed.startsWith('- ')) {
        return (
          <div key={i} className="flex gap-2 ml-4 mb-0.5">
            <span className="text-argos-faint mt-1">•</span>
            <span className="text-sm text-argos-muted">{trimmed.replace('- ', '')}</span>
          </div>
        );
      }
      // Bold text handling
      const parts = trimmed.split(/\*\*([^*]+)\*\*/g);
      return (
        <p key={i} className="text-sm text-argos-muted mb-0.5">
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-argos-inkSoft">{part}</strong> : part)}
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
      loadOverallProgress();
    } catch (err: any) {
      alert('상태 변경 실패: ' + err.message);
    }
  }

  const totalItems = items.length;
  const completedItems = items.filter(i => i.status === 'completed').length;
  const criticalRemaining = items.filter(i => i.priority === 'critical' && i.status !== 'completed').length;
  const avgProgress = totalItems > 0 ? Math.round(items.reduce((s, i) => s + (i.progressPct ?? 0), 0) / totalItems) : 0;

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
      <PageHeader
        module="COMPLIANCE MODULE V4.2"
        titleKo="LG 체크리스트"
        titleEn="COMPLIANCE CHECKLIST"
        description="Compliance Checklist — 산업용 로봇 규제 비교 포함"
      />

      {/* Overall Progress Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Main progress bar */}
        <div className="bg-argos-surface rounded-xl border border-argos-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-argos-inkSoft">
                <span className="font-bold text-argos-ink">{completedItems}</span> / {totalItems} 완료
              </span>
              <span className="text-sm text-argos-faint">|</span>
              <span className="text-sm text-argos-inkSoft">
                평균 진척 <span className="font-bold text-blue-400">{avgProgress}%</span>
              </span>
              {criticalRemaining > 0 && (
                <>
                  <span className="text-sm text-argos-faint">|</span>
                  <span className="text-sm text-red-400">
                    Critical 미완료 <span className="font-bold">{criticalRemaining}</span>건
                  </span>
                </>
              )}
            </div>
            <button
              onClick={toggleExpandAll}
              className="text-xs px-3 py-1.5 rounded-lg border border-argos-border text-argos-muted hover:text-argos-ink hover:border-argos-blue/30 transition bg-argos-bgAlt"
            >
              {expandedItems.size === items.length && items.length > 0 ? '전체 접기' : '전체 펼치기'}
            </button>
          </div>
          <div className="w-full bg-argos-chip/50 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>

        {/* Category breakdown */}
        {overallProgress?.byCategory && (
          <div className="bg-argos-surface rounded-xl border border-argos-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-argos-muted" />
              <span className="text-sm font-medium text-argos-inkSoft">카테고리별 진척도</span>
            </div>
            <div className="space-y-2">
              {Object.entries(overallProgress.byCategory).map(([cat, data]: [string, any]) => {
                const catConfig = CATEGORY_CONFIG[cat];
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs text-argos-muted w-24 truncate">{catConfig?.label || cat}</span>
                    <div className="flex-1 bg-argos-chip/50 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                        style={{ width: `${data.avgPct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-argos-muted w-10 text-right">{data.avgPct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Recent Progress Activity */}
      {overallProgress?.recentLogs && overallProgress.recentLogs.length > 0 && (
        <div className="bg-argos-surface rounded-xl border border-argos-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-argos-muted" />
            <span className="text-sm font-medium text-argos-inkSoft">최근 진행 이력</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {overallProgress.recentLogs.slice(0, 5).map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <span className="text-argos-faint whitespace-nowrap mt-0.5">
                  {new Date(log.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </span>
                <span className="px-1.5 py-0.5 bg-argos-chip/50 rounded text-argos-muted whitespace-nowrap">
                  {CATEGORY_CONFIG[log.itemCategory]?.label || log.itemCategory}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-argos-inkSoft font-medium">{log.itemTitle}</span>
                  <span className="text-argos-faint mx-1">—</span>
                  <span className="text-argos-muted">{log.content}</span>
                </div>
                {log.progressPctAfter != null && (
                  <span className="text-blue-400 font-mono whitespace-nowrap">
                    {log.progressPctBefore ?? 0}% → {log.progressPctAfter}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-argos-surface rounded-xl border border-argos-border p-4">
        <div className="flex items-center gap-2 text-argos-muted text-sm mb-3">
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
              className="bg-argos-surface border border-argos-border rounded-lg px-3 py-2 text-sm text-argos-inkSoft focus:outline-none focus:border-blue-500"
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
            <div key={i} className="bg-argos-surface rounded-xl p-5 border border-argos-border animate-pulse">
              <div className="h-5 bg-argos-chip/50 rounded w-1/4 mb-4" />
              <div className="space-y-3">
                <div className="h-4 bg-argos-chip/50 rounded w-3/4" />
                <div className="h-4 bg-argos-chip/50 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist Grouped by Category */}
      {!loading && !error && (
        <>
          {items.length === 0 ? (
            <div className="bg-argos-surface rounded-xl border border-argos-border p-12 text-center">
              <CheckSquare className="w-12 h-12 text-argos-faint mx-auto mb-3" />
              <p className="text-argos-muted">해당 조건의 체크리스트 항목이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, categoryItems]) => {
                const catConfig = CATEGORY_CONFIG[category];
                const CatIcon = catConfig?.icon || CheckSquare;
                const catCompleted = (categoryItems as any[]).filter((i: any) => i.status === 'completed').length;
                const catAvgPct = Math.round((categoryItems as any[]).reduce((s: number, i: any) => s + (i.progressPct ?? 0), 0) / (categoryItems as any[]).length);
                return (
                  <div key={category} className="bg-argos-surface rounded-xl border border-argos-border">
                    {/* Category Header */}
                    <div className="px-5 py-4 border-b border-argos-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CatIcon className="w-5 h-5 text-argos-muted" />
                        <h3 className="text-base font-semibold text-argos-inkSoft">
                          {catConfig?.label || category}
                        </h3>
                        <span className="text-xs text-argos-faint">
                          {catCompleted}/{(categoryItems as any[]).length} 완료
                        </span>
                        <span className="text-xs text-blue-400 font-mono">
                          평균 {catAvgPct}%
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-argos-borderSoft">
                      {(categoryItems as any[]).map((item: any) => {
                        const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started;
                        const isExpanded = expandedItems.has(item.id);
                        const tab = getActiveTab(item.id);
                        const hasComparison = item.industrialRegComparison || item.industrialRegWhyDifferent || item.industrialRegApproach;
                        const itemProgress = item.progressPct ?? 0;

                        return (
                          <div key={item.id}>
                            <div
                              className="px-5 py-3 flex items-center gap-4 hover:bg-argos-bgAlt transition cursor-pointer"
                              onClick={() => toggleExpand(item.id)}
                            >
                              {/* Chevron */}
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4 text-argos-faint flex-shrink-0" />
                                : <ChevronRight className="w-4 h-4 text-argos-faint flex-shrink-0" />
                              }

                              {/* Priority dot */}
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOTS[item.priority] || PRIORITY_DOTS.medium}`} />

                              {/* Title & Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm ${item.status === 'completed' ? 'text-argos-faint line-through' : 'text-argos-inkSoft'}`}>
                                    {item.title}
                                  </p>
                                  {hasComparison && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                                      vs 산업용
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-argos-faint">
                                    {REGION_FLAGS[item.region] || ''} {item.region}
                                  </span>
                                  {item.assignee && (
                                    <>
                                      <span className="text-xs text-argos-faint">·</span>
                                      <span className="text-xs text-argos-faint">{item.assignee}</span>
                                    </>
                                  )}
                                  <span className="text-xs text-argos-faint">·</span>
                                  <span className={`text-xs ${item.priority === 'critical' ? 'text-red-400' : item.priority === 'high' ? 'text-orange-400' : 'text-argos-faint'}`}>
                                    {item.priority}
                                  </span>
                                </div>
                              </div>

                              {/* Progress mini-bar */}
                              <div className="flex items-center gap-2 w-24 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                <div className="flex-1 bg-argos-chip/50 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${itemProgress >= 100 ? 'bg-green-500' : itemProgress >= 50 ? 'bg-blue-500' : itemProgress > 0 ? 'bg-amber-500' : 'bg-argos-borderSoft'}`}
                                    style={{ width: `${itemProgress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-argos-faint w-7 text-right">{itemProgress}%</span>
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

                            {/* Expanded Detail */}
                            {isExpanded && (
                              <div className="px-5 pb-4 pt-1 ml-7">
                                {/* Tabs */}
                                <div className="flex gap-1 mb-3 border-b border-argos-borderSoft pb-2">
                                  <button
                                    onClick={() => setItemTab(item.id, 'description')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs transition ${tab === 'description' ? 'bg-argos-chip/50 text-argos-inkSoft' : 'text-argos-faint hover:text-argos-inkSoft'}`}
                                  >
                                    <CheckSquare className="w-3 h-3" /> 상세 내용
                                  </button>
                                  {hasComparison && (
                                    <button
                                      onClick={() => setItemTab(item.id, 'comparison')}
                                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs transition ${tab === 'comparison' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-argos-faint hover:text-amber-400'}`}
                                    >
                                      <Factory className="w-3 h-3" /> 산업용 규제 비교
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setItemTab(item.id, 'progress');
                                      if (!progressLogs[item.id]) loadProgressLogs(item.id);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs transition ${tab === 'progress' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-argos-faint hover:text-blue-400'}`}
                                  >
                                    <TrendingUp className="w-3 h-3" /> 진행 이력
                                  </button>
                                </div>

                                {/* Description tab */}
                                {tab === 'description' && item.description && (
                                  <div className="border-l-2 border-argos-border pl-4">
                                    <div className="bg-argos-bgAlt rounded-lg p-4 max-h-[500px] overflow-y-auto">
                                      {renderDescription(item.description)}
                                    </div>
                                  </div>
                                )}

                                {/* Comparison tab */}
                                {tab === 'comparison' && hasComparison && (
                                  <div className="space-y-4">
                                    {/* 차이점 */}
                                    {item.industrialRegComparison && (
                                      <div className="border-l-2 border-amber-500/40 pl-4">
                                        <div className="flex items-center gap-2 mb-2">
                                          <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                                          <h5 className="text-sm font-semibold text-amber-400">산업용 로봇 규제와의 차이</h5>
                                        </div>
                                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                                          {renderDescription(item.industrialRegComparison)}
                                        </div>
                                      </div>
                                    )}

                                    {/* 왜 다른지 */}
                                    {item.industrialRegWhyDifferent && (
                                      <div className="border-l-2 border-purple-500/40 pl-4">
                                        <div className="flex items-center gap-2 mb-2">
                                          <HelpCircle className="w-4 h-4 text-purple-400" />
                                          <h5 className="text-sm font-semibold text-purple-400">왜 다른가?</h5>
                                        </div>
                                        <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                                          {renderDescription(item.industrialRegWhyDifferent)}
                                        </div>
                                      </div>
                                    )}

                                    {/* 접근 방법 */}
                                    {item.industrialRegApproach && (
                                      <div className="border-l-2 border-cyan-500/40 pl-4">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Lightbulb className="w-4 h-4 text-cyan-400" />
                                          <h5 className="text-sm font-semibold text-cyan-400">접근 방법</h5>
                                        </div>
                                        <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                                          {renderDescription(item.industrialRegApproach)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Progress tab */}
                                {tab === 'progress' && (
                                  <div className="space-y-4">
                                    {/* Progress slider */}
                                    <div className="bg-argos-bgAlt rounded-lg p-4 border border-argos-borderSoft">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-argos-inkSoft font-medium">현재 진행률</span>
                                        <span className="text-lg font-bold text-blue-400">{itemProgress}%</span>
                                      </div>
                                      <div className="w-full bg-argos-chip/50 rounded-full h-3">
                                        <div
                                          className={`h-3 rounded-full transition-all ${itemProgress >= 100 ? 'bg-green-500' : itemProgress >= 50 ? 'bg-blue-500' : itemProgress > 0 ? 'bg-amber-500' : 'bg-argos-borderSoft'}`}
                                          style={{ width: `${itemProgress}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* New log form */}
                                    <div className="bg-argos-bgAlt rounded-lg p-4 border border-argos-borderSoft">
                                      <h5 className="text-sm font-medium text-argos-inkSoft mb-3 flex items-center gap-2">
                                        <Plus className="w-4 h-4" /> 진행 이력 추가
                                      </h5>
                                      <textarea
                                        placeholder="진행 내용을 입력하세요 (예: 법률자문 의뢰 완료, 1차 Gap 분석 수행 등)"
                                        value={newLogContent[item.id] || ''}
                                        onChange={(e) => setNewLogContent(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        className="w-full bg-argos-surface border border-argos-border rounded-lg px-3 py-2 text-sm text-argos-inkSoft focus:outline-none focus:border-blue-500 resize-none h-20 mb-2"
                                      />
                                      <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <label className="text-xs text-argos-muted">진행률 변경:</label>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            placeholder={String(itemProgress)}
                                            value={newLogProgress[item.id] || ''}
                                            onChange={(e) => setNewLogProgress(prev => ({ ...prev, [item.id]: e.target.value }))}
                                            className="w-16 bg-argos-surface border border-argos-border rounded-lg px-2 py-1.5 text-sm text-argos-inkSoft focus:outline-none focus:border-blue-500 text-center"
                                          />
                                          <span className="text-xs text-argos-faint">%</span>
                                        </div>
                                        <div className="flex-1" />
                                        <button
                                          onClick={() => submitProgressLog(item.id)}
                                          disabled={!newLogContent[item.id]?.trim() || submittingLog[item.id]}
                                          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-argos-chip/50 disabled:text-argos-faint text-white text-xs rounded-lg transition"
                                        >
                                          <Send className="w-3 h-3" />
                                          {submittingLog[item.id] ? '등록 중...' : '등록'}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Log history */}
                                    <div>
                                      <h5 className="text-sm font-medium text-argos-inkSoft mb-2 flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> 이력
                                      </h5>
                                      {progressLogsLoading[item.id] ? (
                                        <div className="text-xs text-argos-faint py-4 text-center">불러오는 중...</div>
                                      ) : !progressLogs[item.id] || progressLogs[item.id].length === 0 ? (
                                        <div className="text-xs text-argos-faint py-4 text-center bg-argos-bgAlt rounded-lg border border-argos-borderSoft">
                                          아직 등록된 진행 이력이 없습니다
                                        </div>
                                      ) : (
                                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                          {progressLogs[item.id].map((log: any) => (
                                            <div key={log.id} className="bg-argos-bgAlt rounded-lg p-3 border border-argos-borderSoft">
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                  <p className="text-sm text-argos-inkSoft">{log.content}</p>
                                                  <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="text-[10px] text-argos-faint">
                                                      {new Date(log.createdAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {log.author && log.author !== 'system' && (
                                                      <span className="text-[10px] text-argos-faint">{log.author}</span>
                                                    )}
                                                    {log.progressPctAfter != null && (
                                                      <span className="text-[10px] font-mono text-blue-400">
                                                        {log.progressPctBefore ?? 0}% → {log.progressPctAfter}%
                                                      </span>
                                                    )}
                                                    {log.statusBefore !== log.statusAfter && log.statusAfter && (
                                                      <span className="text-[10px]">
                                                        <span className="text-argos-faint">{STATUS_CONFIG[log.statusBefore]?.label || log.statusBefore}</span>
                                                        <span className="text-argos-faint mx-1">→</span>
                                                        <span className={STATUS_CONFIG[log.statusAfter]?.color || 'text-argos-muted'}>{STATUS_CONFIG[log.statusAfter]?.label || log.statusAfter}</span>
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
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
