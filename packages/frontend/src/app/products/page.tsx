'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Package, ChevronRight } from 'lucide-react';
import { formatDate, formatCurrency, getProductTypeLabel, getStatusLabel, getStatusColor, cn } from '@/lib/utils';

export default function ProductsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.getProducts(filters),
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
          <h1 className="text-2xl font-bold text-gray-900">제품</h1>
          <p className="text-gray-500">로봇 제품 목록</p>
        </div>
        <div className="flex gap-2">
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg"
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="">모든 유형</option>
            <option value="humanoid">휴머노이드</option>
            <option value="service">서비스 로봇</option>
            <option value="logistics">물류 로봇</option>
            <option value="home">가정용 로봇</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg"
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">모든 상태</option>
            <option value="available">출시</option>
            <option value="announced">발표</option>
            <option value="discontinued">단종</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">제품명</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">출시일</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">타겟 시장</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.items.map((product: any) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      {product.series && (
                        <p className="text-sm text-gray-500">{product.series}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  {getProductTypeLabel(product.type)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(product.releaseDate)}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getStatusColor(product.status)
                  )}>
                    {getStatusLabel(product.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {product.targetMarket || '-'}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/products/${product.id}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.items.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          등록된 제품이 없습니다.
        </div>
      )}
    </div>
  );
}
