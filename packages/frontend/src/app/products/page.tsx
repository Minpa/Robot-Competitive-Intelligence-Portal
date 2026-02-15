'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Package, ChevronRight } from 'lucide-react';
import { formatDate, formatCurrency, getProductTypeLabel, getStatusLabel, getStatusColor, cn } from '@/lib/utils';

function ProductsContent() {
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get('type') || '';
  
  const [filters, setFilters] = useState<Record<string, string>>({
    type: typeFromUrl,
  });

  useEffect(() => {
    if (typeFromUrl) {
      setFilters(prev => ({ ...prev, type: typeFromUrl }));
    }
  }, [typeFromUrl]);

  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.getProducts(filters),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500/30 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Package className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">제품</h1>
            </div>
            <p className="text-slate-400">로봇 제품 목록 ({data?.total || 0}개)</p>
          </div>
          <div className="flex gap-2">
            <select
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            >
              <option value="">모든 유형</option>
              <option value="humanoid">휴머노이드</option>
              <option value="service">서비스 로봇</option>
              <option value="logistics">물류 로봇</option>
              <option value="home">가정용 로봇</option>
              <option value="industrial">산업용 로봇</option>
              <option value="foundation_model">파운데이션 모델</option>
              <option value="actuator">액츄에이터</option>
              <option value="soc">SoC</option>
            </select>
            <select
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">모든 상태</option>
              <option value="available">출시</option>
              <option value="announced">발표</option>
              <option value="discontinued">단종</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">제품명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">유형</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">출시일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">타겟 시장</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data?.items.map((product: any) => (
                <tr key={product.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Package className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{product.name}</p>
                        {product.series && (
                          <p className="text-sm text-slate-400">{product.series}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {getProductTypeLabel(product.type)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {formatDate(product.releaseDate)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      product.status === 'available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      product.status === 'announced' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    )}>
                      {getStatusLabel(product.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {product.targetMarket || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/products/${product.id}`}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
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
          <div className="text-center py-12 text-slate-400">
            {filters.type ? `"${getProductTypeLabel(filters.type)}" 유형의 제품이 없습니다.` : '등록된 제품이 없습니다.'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500/30 border-t-blue-500" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
