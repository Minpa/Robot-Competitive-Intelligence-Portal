'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Building2, ExternalLink, ChevronRight } from 'lucide-react';

export default function CompaniesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['companies', filters],
    queryFn: () => api.getCompanies({ ...filters, limit: '500' }),
  });

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
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg"
            onChange={(e) => setFilters({ ...filters, country: e.target.value })}
          >
            <option value="">모든 국가</option>
            <option value="USA">미국</option>
            <option value="China">중국</option>
            <option value="Japan">일본</option>
            <option value="Korea">한국</option>
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
          등록된 회사가 없습니다.
        </div>
      )}
    </div>
  );
}
