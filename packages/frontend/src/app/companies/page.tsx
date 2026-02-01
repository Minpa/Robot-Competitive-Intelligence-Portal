'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Building2, ExternalLink, ChevronRight, ChevronLeft, Search } from 'lucide-react';

export default function CompaniesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['companies', filters, page, searchTerm],
    queryFn: () => api.getCompanies({ 
      ...filters, 
      page: String(page), 
      pageSize: String(pageSize),
      ...(searchTerm ? { searchTerm } : {}),
    }),
  });

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회사</h1>
          <p className="text-gray-500">로봇 경쟁사 목록 ({data?.total || 0}개)</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="회사 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64"
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg"
            onChange={(e) => {
              setFilters({ ...filters, country: e.target.value });
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
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.items.map((company: any) => (
          <Link
            key={company.id}
            href={`/companies/${company.id}`}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
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
        ))}
      </div>

      {data?.items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm ? `"${searchTerm}" 검색 결과가 없습니다.` : '등록된 회사가 없습니다.'}
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
