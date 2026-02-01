'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Building2, ExternalLink, ChevronRight, ChevronLeft, Search, Bot, Brain, Cpu, Cog } from 'lucide-react';

const CATEGORIES = [
  { id: '', label: '전체', icon: Building2, color: 'gray' },
  { id: 'robot', label: '로봇 완제품', icon: Bot, color: 'blue' },
  { id: 'rfm', label: 'RFM/AI', icon: Brain, color: 'purple' },
  { id: 'soc', label: 'SoC/칩', icon: Cpu, color: 'cyan' },
  { id: 'actuator', label: '액츄에이터/부품', icon: Cog, color: 'orange' },
];

const getCategoryStyle = (categoryId: string) => {
  switch (categoryId) {
    case 'robot': return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' };
    case 'rfm': return { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-500' };
    case 'soc': return { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-500' };
    case 'actuator': return { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-500' };
  }
};

const getCategoryIcon = (categoryId: string) => {
  switch (categoryId) {
    case 'robot': return Bot;
    case 'rfm': return Brain;
    case 'soc': return Cpu;
    case 'actuator': return Cog;
    default: return Building2;
  }
};

export default function CompaniesPage() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [country, setCountry] = useState('');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['companies', selectedCategory, country, page, searchTerm],
    queryFn: () => api.getCompanies({ 
      ...(selectedCategory ? { category: selectedCategory } : {}),
      ...(country ? { country } : {}),
      page: String(page), 
      pageSize: String(pageSize),
      ...(searchTerm ? { searchTerm } : {}),
    }),
  });

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">회사</h1>
        <p className="text-gray-500">로봇 경쟁사 목록 ({data?.total || 0}개)</p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const style = getCategoryStyle(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                isSelected 
                  ? `${style.bg} ${style.text} ${style.border}` 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-wrap gap-3">
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={country}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          onChange={(e) => {
            setCountry(e.target.value);
            setPage(1);
          }}
        >
          <option value="">모든 국가</option>
          <option value="USA">미국</option>
          <option value="China">중국</option>
          <option value="Japan">일본</option>
          <option value="South Korea">한국</option>
          <option value="Germany">독일</option>
          <option value="France">프랑스</option>
          <option value="Switzerland">스위스</option>
          <option value="Denmark">덴마크</option>
          <option value="UK">영국</option>
          <option value="Taiwan">대만</option>
          <option value="Israel">이스라엘</option>
        </select>
      </div>

      {/* Company Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items.map((company: any) => {
          const style = getCategoryStyle(company.category);
          const Icon = getCategoryIcon(company.category);
          return (
            <Link
              key={company.id}
              href={`/companies/${company.id}`}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${style.bg}`}>
                    <Icon className={`w-6 h-6 ${style.text}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{company.name}</h3>
                    <p className="text-sm text-gray-500">{company.country}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              {company.description && (
                <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                  {company.description}
                </p>
              )}
              {company.homepageUrl && (
                <div className="mt-3 flex items-center gap-1 text-sm text-blue-600">
                  <ExternalLink className="w-4 h-4" />
                  <span className="truncate">{company.homepageUrl}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {data?.items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm 
            ? `"${searchTerm}" 검색 결과가 없습니다.` 
            : selectedCategory 
              ? '해당 카테고리에 등록된 회사가 없습니다.' 
              : '등록된 회사가 없습니다.'}
        </div>
      )}

      {/* Pagination */}
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
