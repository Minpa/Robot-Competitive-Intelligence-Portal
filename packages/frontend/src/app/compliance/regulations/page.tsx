'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Database, AlertTriangle, Filter, Search, Globe, Shield, Scale, Lock, ChevronDown, ChevronUp, Plus, X, ExternalLink, LayoutGrid, List } from 'lucide-react';

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
  { value: 'active', label: '시행 중' },
  { value: 'pending', label: '시행 예정' },
  { value: 'draft', label: '초안/논의 중' },
  { value: 'archived', label: '보관됨' },
];

const IMPACT_OPTIONS = [
  { value: '', label: '전체 영향도' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const CATEGORY_BADGES: Record<string, string> = {
  policy: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  safety: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  legal: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  privacy: 'text-green-400 bg-green-400/10 border-green-400/30',
};

const CATEGORY_LABELS: Record<string, string> = {
  policy: '정책', safety: '안전', legal: '법적', privacy: '개인정보',
};

const IMPACT_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low: 'text-green-400 bg-green-400/10 border-green-400/30',
  none: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
};

const STATUS_BADGES: Record<string, string> = {
  active: 'text-green-400 bg-green-400/10 border-green-400/30',
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  draft: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
  archived: 'text-slate-500 bg-slate-500/10 border-slate-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  active: '시행 중', pending: '시행 예정', draft: '초안', archived: '보관',
};

const REGION_FLAGS: Record<string, string> = {
  korea: '🇰🇷', us: '🇺🇸', eu: '🇪🇺', china: '🇨🇳', international: '🌐',
};

const PAGE_SIZE = 20;

interface NewRegulationForm {
  title: string;
  titleKo: string;
  category: string;
  region: string;
  status: string;
  lgImpact: string;
  summary: string;
  summaryKo: string;
  effectiveDate: string;
  sourceUrl: string;
  lgImpactAnalysis: string;
}

const emptyForm: NewRegulationForm = {
  title: '', titleKo: '', category: 'policy', region: 'korea', status: 'active',
  lgImpact: 'medium', summary: '', summaryKo: '', effectiveDate: '', sourceUrl: '', lgImpactAnalysis: '',
};

export default function ComplianceRegulationsPage() {
  const [regulations, setRegulations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewRegulationForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [filters, setFilters] = useState({
    category: '',
    region: '',
    status: '',
    lgImpact: '',
  });

  // Read initial filters from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const cat = urlParams.get('category');
      const reg = urlParams.get('region');
      if (cat || reg) {
        setFilters(prev => ({
          ...prev,
          ...(cat ? { category: cat } : {}),
          ...(reg ? { region: reg } : {}),
        }));
      }
    }
  }, []);

  const loadRegulations = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: PAGE_SIZE, offset };
      if (filters.category) params.category = filters.category;
      if (filters.region) params.region = filters.region;
      if (filters.status) params.status = filters.status;
      if (filters.lgImpact) params.lgImpact = filters.lgImpact;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const data = await api.compliance.getRegulations(params);
      setRegulations(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, offset, searchQuery]);

  useEffect(() => {
    loadRegulations();
  }, [loadRegulations]);

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
    setOffset(0);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    loadRegulations();
  }

  async function handleCreateRegulation(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.compliance.createRegulation(form);
      setShowModal(false);
      setForm(emptyForm);
      loadRegulations();
    } catch (err: any) {
      alert('생성 실패: ' + err.message);
    } finally {
      setSubmitting(false);
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
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">규제 상세 DB</h1>
            <p className="text-sm text-slate-400">Regulation Database ({total}건)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 transition ${viewMode === 'card' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition ${viewMode === 'table' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            규제 추가
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="규제명, 키워드로 검색..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </form>

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
            { key: 'lgImpact', options: IMPACT_OPTIONS },
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
          <button onClick={loadRegulations} className="mt-2 px-3 py-1 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition text-sm">
            다시 시도
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 border border-slate-700 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
              <div className="h-3 bg-slate-700 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Regulations */}
      {!loading && !error && (
        <>
          {regulations.length === 0 ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
              <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">해당 조건의 규제가 없습니다</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400">
                      <th className="px-4 py-3 text-left font-medium">규제명</th>
                      <th className="px-4 py-3 text-left font-medium">카테고리</th>
                      <th className="px-4 py-3 text-left font-medium">지역</th>
                      <th className="px-4 py-3 text-left font-medium">상태</th>
                      <th className="px-4 py-3 text-left font-medium">LG 영향</th>
                      <th className="px-4 py-3 text-left font-medium">시행일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {regulations.map((reg) => (
                      <tr
                        key={reg.id}
                        className="hover:bg-slate-700/20 cursor-pointer transition"
                        onClick={() => setExpandedId(expandedId === reg.id ? null : reg.id)}
                      >
                        <td className="px-4 py-3 text-slate-200">{reg.titleKo || reg.title}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${CATEGORY_BADGES[reg.category] || ''}`}>
                            {CATEGORY_LABELS[reg.category] || reg.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {REGION_FLAGS[reg.region] || ''} {reg.region}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_BADGES[reg.status] || ''}`}>
                            {STATUS_LABELS[reg.status] || reg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${IMPACT_COLORS[reg.lgImpact] || IMPACT_COLORS.medium}`}>
                            {reg.lgImpact}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {reg.effectiveDate ? new Date(reg.effectiveDate).toLocaleDateString('ko-KR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regulations.map((reg) => {
                const isExpanded = expandedId === reg.id;
                return (
                  <div key={reg.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : reg.id)}
                      className="w-full text-left p-5"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${CATEGORY_BADGES[reg.category] || ''}`}>
                          {CATEGORY_LABELS[reg.category] || reg.category}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${STATUS_BADGES[reg.status] || ''}`}>
                          {STATUS_LABELS[reg.status] || reg.status}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${IMPACT_COLORS[reg.lgImpact] || IMPACT_COLORS.medium}`}>
                          {reg.lgImpact}
                        </span>
                        <span className="text-xs text-slate-500">
                          {REGION_FLAGS[reg.region] || ''} {reg.region}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-200 mb-1">{reg.titleKo || reg.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-2">{reg.summaryKo || reg.summary || ''}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-slate-500">
                          {reg.effectiveDate ? new Date(reg.effectiveDate).toLocaleDateString('ko-KR') : ''}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-slate-700">
                        <div className="pt-4 space-y-3">
                          {(reg.summaryKo || reg.summary) && (
                            <div>
                              <h4 className="text-xs font-medium text-slate-500 mb-1">전체 요약</h4>
                              <p className="text-sm text-slate-300 leading-relaxed">{reg.summaryKo || reg.summary}</p>
                            </div>
                          )}
                          {reg.lgImpactAnalysis && (
                            <div className="bg-orange-400/5 border border-orange-400/20 rounded-lg p-3">
                              <h4 className="text-xs font-medium text-orange-400 mb-1">LG 영향 분석</h4>
                              <p className="text-sm text-slate-300">{reg.lgImpactAnalysis}</p>
                            </div>
                          )}
                          {reg.sourceUrl && (
                            <a
                              href={reg.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink className="w-3 h-3" />
                              원문 보기
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

      {/* Add Regulation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-slate-200">새 규제 등록</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRegulation} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">규제명 (한국어)</label>
                  <input
                    type="text"
                    value={form.titleKo}
                    onChange={(e) => setForm(prev => ({ ...prev, titleKo: e.target.value }))}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">규제명 (영문)</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">카테고리</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="policy">정책·산업규제</option>
                    <option value="safety">물리적·기능적 안전</option>
                    <option value="legal">법적 책임·배상</option>
                    <option value="privacy">개인정보보호</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">지역</label>
                  <select
                    value={form.region}
                    onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="korea">한국</option>
                    <option value="us">미국</option>
                    <option value="eu">EU</option>
                    <option value="china">중국</option>
                    <option value="international">국제</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">상태</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="active">시행 중</option>
                    <option value="pending">시행 예정</option>
                    <option value="draft">초안/논의 중</option>
                    <option value="archived">보관됨</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">LG 영향도</label>
                  <select
                    value={form.lgImpact}
                    onChange={(e) => setForm(prev => ({ ...prev, lgImpact: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">시행일</label>
                <input
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">요약 (한국어)</label>
                <textarea
                  value={form.summaryKo}
                  onChange={(e) => setForm(prev => ({ ...prev, summaryKo: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">LG 영향 분석</label>
                <textarea
                  value={form.lgImpactAnalysis}
                  onChange={(e) => setForm(prev => ({ ...prev, lgImpactAnalysis: e.target.value }))}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">원문 URL</label>
                <input
                  type="url"
                  value={form.sourceUrl}
                  onChange={(e) => setForm(prev => ({ ...prev, sourceUrl: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition text-sm disabled:opacity-50"
                >
                  {submitting ? '저장 중...' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
