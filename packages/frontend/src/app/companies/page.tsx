'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CompanyCard } from '@/components/companies';
import { 
  Building2, Bot, Brain, Cpu, Cog, GraduationCap, Briefcase,
  ChevronRight, ChevronLeft, Search, Filter, Star, Package
} from 'lucide-react';

// 역할 기준 필터
const ROLE_FILTERS = [
  { id: '', label: '전체', icon: Building2 },
  { id: 'robot', label: '로봇 완제품', icon: Bot },
  { id: 'soc', label: '핵심 부품 (SoC·액추에이터·센서)', icon: Cpu },
  { id: 'research', label: '연구기관·대학', icon: GraduationCap },
  { id: 'platform', label: '플랫폼·툴', icon: Package },
];

// 세그먼트 기준 필터
const SEGMENT_FILTERS = [
  { id: '', label: '전체' },
  { id: 'industrial', label: '산업용' },
  { id: 'service', label: '서비스·가정용' },
  { id: 'humanoid', label: '휴머노이드 전용' },
  { id: 'multi', label: '멀티 세그먼트' },
];

// 정렬 옵션
const SORT_OPTIONS = [
  { id: 'name', label: '이름순' },
  { id: 'applicationCases', label: '적용 사례 수' },
  { id: 'events', label: '최근 이벤트 수' },
  { id: 'talent', label: '인력 규모' },
  { id: 'impact', label: '임팩트 점수' },
];

// 국가 목록
const COUNTRIES = [
  { id: '', label: '모든 국가' },
  { id: 'USA', label: '🇺🇸 미국' },
  { id: 'China', label: '🇨🇳 중국' },
  { id: 'Japan', label: '🇯🇵 일본' },
  { id: 'South Korea', label: '🇰🇷 한국' },
  { id: 'Germany', label: '🇩🇪 독일' },
  { id: 'France', label: '🇫🇷 프랑스' },
  { id: 'Switzerland', label: '🇨🇭 스위스' },
  { id: 'UK', label: '🇬🇧 영국' },
  { id: 'Taiwan', label: '🇹🇼 대만' },
  { id: 'Israel', label: '🇮🇱 이스라엘' },
  { id: 'Denmark', label: '🇩🇰 덴마크' },
];

export default function CompaniesPage() {
  const [filters, setFilters] = useState({
    role: '',
    segment: '',
    country: '',
    sortBy: 'name',
  });
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showKeyPlayersOnly, setShowKeyPlayersOnly] = useState(false);
  const [groupByRole, setGroupByRole] = useState(false);
  const pageSize = 30;

  // 카테고리 매핑 (role -> category)
  const categoryFromRole = (role: string) => {
    switch (role) {
      case 'robot': return 'robot';
      case 'soc': return 'soc';
      case 'actuator': return 'actuator';
      case 'rfm': return 'rfm';
      default: return '';
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['companies', filters, page, searchTerm],
    queryFn: () => api.getCompanies({ 
      ...(categoryFromRole(filters.role) ? { category: categoryFromRole(filters.role) } : {}),
      ...(filters.country ? { country: filters.country } : {}),
      page: String(page), 
      pageSize: String(pageSize),
      ...(searchTerm ? { searchTerm } : {}),
    }),
  });

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  // 회사 데이터에 추가 정보 매핑 (실제로는 API에서 가져와야 함)
  const enrichedCompanies = useMemo(() => {
    return (data?.items || []).map((company: any) => ({
      ...company,
      productCount: Math.floor(Math.random() * 5), // 임시 데이터
      componentCount: Math.floor(Math.random() * 3),
      applicationCaseCount: Math.floor(Math.random() * 10),
      pocCount: Math.floor(Math.random() * 5),
      productionCount: Math.floor(Math.random() * 3),
      talentEstimate: Math.floor(Math.random() * 500) + 50,
    }));
  }, [data?.items]);

  // 그룹핑된 회사 목록
  const groupedCompanies = useMemo(() => {
    if (!groupByRole) return null;

    const groups: Record<string, any[]> = {
      robot: [],
      soc: [],
      actuator: [],
      rfm: [],
      other: [],
    };

    enrichedCompanies.forEach((company: any) => {
      const cat = company.category || 'other';
      if (groups[cat]) {
        groups[cat].push(company);
      } else {
        groups.other.push(company);
      }
    });

    return groups;
  }, [enrichedCompanies, groupByRole]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const GROUP_LABELS: Record<string, string> = {
    robot: '🤖 로봇 완제품',
    soc: '💾 SoC/AI 칩',
    actuator: '⚙️ 액추에이터/부품',
    rfm: '🧠 RFM/AI',
    other: '🏢 기타',
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">회사 데이터</h1>
        <p className="text-gray-500">휴머노이드 로봇 관련 기업 목록 ({data?.total || 0}개)</p>
      </div>

      {/* 역할 기준 필터 탭 */}
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTERS.map((role) => {
          const Icon = role.icon;
          const isSelected = filters.role === role.id;
          return (
            <button
              key={role.id}
              onClick={() => handleFilterChange('role', role.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                isSelected 
                  ? 'bg-blue-50 text-blue-600 border-blue-500' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium text-sm">{role.label}</span>
            </button>
          );
        })}
      </div>

      {/* 검색 및 추가 필터 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* 검색 */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="회사명 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* 세그먼트 필터 */}
          <select
            value={filters.segment}
            onChange={(e) => handleFilterChange('segment', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {SEGMENT_FILTERS.map(seg => (
              <option key={seg.id} value={seg.id}>{seg.label}</option>
            ))}
          </select>

          {/* 국가 필터 */}
          <select
            value={filters.country}
            onChange={(e) => handleFilterChange('country', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {COUNTRIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          {/* 정렬 */}
          <select
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 토글 옵션 */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showKeyPlayersOnly}
              onChange={(e) => setShowKeyPlayersOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-700">핵심 플레이어만 보기</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByRole}
              onChange={(e) => setGroupByRole(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">역할별 그룹핑</span>
          </label>
        </div>
      </div>

      {/* 회사 목록 */}
      {groupByRole && groupedCompanies ? (
        // 그룹핑된 뷰
        <div className="space-y-8">
          {Object.entries(groupedCompanies).map(([groupKey, companies]) => {
            if (companies.length === 0) return null;
            return (
              <div key={groupKey}>
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  {GROUP_LABELS[groupKey]}
                  <span className="text-sm font-normal text-gray-500">({companies.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companies.map((company: any) => (
                    <CompanyCard key={company.id} company={company} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // 일반 그리드 뷰
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrichedCompanies.map((company: any) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}

      {enrichedCompanies.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm 
            ? `"${searchTerm}" 검색 결과가 없습니다.` 
            : filters.role 
              ? '해당 역할에 등록된 회사가 없습니다.' 
              : '등록된 회사가 없습니다.'}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="px-4 py-2 text-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
