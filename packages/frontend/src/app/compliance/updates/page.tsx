'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Bell, AlertTriangle, ChevronDown, ChevronUp, CheckCheck, Filter, Globe, Shield, Scale, Lock } from 'lucide-react';

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

const IMPACT_OPTIONS = [
  { value: '', label: '전체 영향도' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const READ_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'false', label: '미확인' },
  { value: 'true', label: '확인됨' },
];

const UPDATE_TYPE_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: 'new_regulation', label: '신규 규제' },
  { value: 'amendment', label: '규제 개정' },
  { value: 'enforcement', label: '시행/발효' },
  { value: 'guidance', label: '가이드라인' },
  { value: 'news', label: '관련 뉴스' },
];

const IMPACT_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low: 'text-green-400 bg-green-400/10 border-green-400/30',
  none: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
};

const TYPE_COLORS: Record<string, string> = {
  new_regulation: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  amendment: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  enforcement: 'text-red-400 bg-red-400/10 border-red-400/30',
  guidance: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  news: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
};

const TYPE_LABELS: Record<string, string> = {
  new_regulation: '신규 규제',
  amendment: '규제 개정',
  enforcement: '시행/발효',
  guidance: '가이드라인',
  news: '관련 뉴스',
};

const REGION_FLAGS: Record<string, string> = {
  korea: '🇰🇷',
  us: '🇺🇸',
  eu: '🇪🇺',
  china: '🇨🇳',
  international: '🌐',
};

const CATEGORY_ICONS: Record<string, any> = {
  policy: Globe,
  safety: Shield,
  legal: Scale,
  privacy: Lock,
};

const PAGE_SIZE = 20;

export default function ComplianceUpdatesPage() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);

  const [filters, setFilters] = useState({
    category: '',
    region: '',
    lgImpact: '',
    isRead: '',
    updateType: '',
  });

  const loadUpdates = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: PAGE_SIZE, offset };
      if (filters.category) params.category = filters.category;
      if (filters.region) params.region = filters.region;
      if (filters.lgImpact) params.lgImpact = filters.lgImpact;
      if (filters.isRead) params.isRead = filters.isRead;
      if (filters.updateType) params.updateType = filters.updateType;
      const data = await api.compliance.getUpdates(params);
      setUpdates(data.items || []);
      setTotal(data.total || 0);
      setUnread(data.unread || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setOffset(0);
  }

  async function handleMarkAllRead() {
    try {
      await api.compliance.markAllUpdatesRead();
      loadUpdates();
    } catch (err: any) {
      alert('오류: ' + err.message);
    }
  }

  async function handleMarkRead(ids: string[]) {
    try {
      await api.compliance.markUpdatesRead(ids);
      loadUpdates();
    } catch (err: any) {
      alert('오류: ' + err.message);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">규제 업데이트 피드</h1>
            <p className="text-sm text-slate-400">Regulatory Update Feed</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unread > 0 && (
            <span className="text-sm text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/30">
              미확인 {unread}건
            </span>
          )}
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm"
          >
            <CheckCheck className="w-4 h-4" />
            전체 읽음 처리
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
          <Filter className="w-4 h-4" />
          <span>필터</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key: 'category', options: CATEGORY_OPTIONS },
            { key: 'region', options: REGION_OPTIONS },
            { key: 'lgImpact', options: IMPACT_OPTIONS },
            { key: 'isRead', options: READ_OPTIONS },
            { key: 'updateType', options: UPDATE_TYPE_OPTIONS },
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
          <button onClick={loadUpdates} className="mt-2 px-3 py-1 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition text-sm">
            다시 시도
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 border border-slate-700 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Updates List */}
      {!loading && !error && (
        <>
          {updates.length === 0 ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
              <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">해당 조건의 업데이트가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => {
                const isExpanded = expandedId === update.id;
                const CatIcon = CATEGORY_ICONS[update.category] || Globe;
                return (
                  <div
                    key={update.id}
                    className={`bg-slate-800 rounded-xl border transition ${
                      update.isRead ? 'border-slate-700' : 'border-blue-500/30 bg-slate-800/80'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setExpandedId(isExpanded ? null : update.id);
                        if (!update.isRead) handleMarkRead([update.id]);
                      }}
                      className="w-full text-left p-5"
                    >
                      <div className="flex items-start gap-4">
                        {/* Unread dot */}
                        <div className="pt-1">
                          {!update.isRead && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                          {update.isRead && <div className="w-2 h-2 rounded-full bg-slate-700" />}
                        </div>

                        {/* Icon */}
                        <div className="flex-shrink-0">
                          <CatIcon className="w-5 h-5 text-slate-500" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${TYPE_COLORS[update.updateType] || TYPE_COLORS.news}`}>
                              {TYPE_LABELS[update.updateType] || update.updateType}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${IMPACT_COLORS[update.lgImpact] || IMPACT_COLORS.medium}`}>
                              {update.lgImpact}
                            </span>
                            <span className="text-xs text-slate-500">
                              {REGION_FLAGS[update.region] || ''} {update.region}
                            </span>
                          </div>
                          <p className={`text-sm ${update.isRead ? 'text-slate-400' : 'text-slate-200 font-medium'}`}>
                            {update.titleKo || update.title}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            {update.source && (
                              <span className="text-xs text-slate-500">{update.source}</span>
                            )}
                            <span className="text-xs text-slate-600">
                              {update.detectedAt ? new Date(update.detectedAt).toLocaleDateString('ko-KR') : ''}
                            </span>
                          </div>
                        </div>

                        {/* Expand */}
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0 border-t border-slate-700 mt-0">
                        <div className="pt-4 space-y-3">
                          {update.summaryKo && (
                            <div>
                              <h4 className="text-xs font-medium text-slate-500 mb-1">요약</h4>
                              <p className="text-sm text-slate-300 leading-relaxed">{update.summaryKo}</p>
                            </div>
                          )}
                          {update.summary && !update.summaryKo && (
                            <div>
                              <h4 className="text-xs font-medium text-slate-500 mb-1">Summary</h4>
                              <p className="text-sm text-slate-300 leading-relaxed">{update.summary}</p>
                            </div>
                          )}
                          {update.lgActionRequired && (
                            <div className="bg-orange-400/5 border border-orange-400/20 rounded-lg p-3">
                              <h4 className="text-xs font-medium text-orange-400 mb-1">LG 필요 대응</h4>
                              <p className="text-sm text-slate-300">{update.lgActionRequired}</p>
                            </div>
                          )}
                          {update.sourceUrl && (
                            <a
                              href={update.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 inline-block"
                            >
                              원문 보기 →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="text-sm text-slate-500">
                {currentPage} / {totalPages} 페이지 (총 {total}건)
              </span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
