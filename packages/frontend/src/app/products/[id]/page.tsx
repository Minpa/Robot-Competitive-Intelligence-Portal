'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatCurrency, getProductTypeLabel, getStatusLabel, getStatusColor, cn } from '@/lib/utils';
import { ArrowLeft, Building2, FileText, Tag } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ['product-detail', productId],
    queryFn: () => api.getProductDetails(productId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">제품을 찾을 수 없습니다.</p>
        <Link href="/products" className="text-blue-400 hover:underline mt-2 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const { product, company, spec, articles, keywords } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/products"
          className="p-2 hover:bg-slate-700 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{product.name}</h1>
          <p className="text-slate-500">{product.series}</p>
        </div>
        <span className={cn(
          'px-3 py-1 text-sm font-medium rounded-full ml-auto',
          getStatusColor(product.status)
        )}>
          {getStatusLabel(product.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <div className="bg-slate-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">제품 개요</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-slate-400">유형</dt>
                <dd className="font-medium">{getProductTypeLabel(product.type)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">출시일</dt>
                <dd className="font-medium text-slate-200">{formatDate(product.releaseDate)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">타겟 시장</dt>
                <dd className="font-medium">{product.targetMarket || '-'}</dd>
              </div>
              {company && (
                <div>
                  <dt className="text-sm text-slate-400">제조사</dt>
                  <dd className="font-medium">
                    <Link href={`/companies/${company.id}`} className="text-blue-400 hover:underline">
                      {company.name}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Specs */}
          {spec && (
            <div className="bg-slate-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">스펙</h2>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {spec.dof && (
                  <div>
                    <dt className="text-sm text-slate-400">DOF</dt>
                    <dd className="font-medium">{spec.dof}</dd>
                  </div>
                )}
                {spec.payloadKg && (
                  <div>
                    <dt className="text-sm text-slate-400">최대 하중</dt>
                    <dd className="font-medium">{spec.payloadKg} kg</dd>
                  </div>
                )}
                {spec.speedMps && (
                  <div>
                    <dt className="text-sm text-slate-400">속도</dt>
                    <dd className="font-medium">{spec.speedMps} m/s</dd>
                  </div>
                )}
                {spec.batteryMinutes && (
                  <div>
                    <dt className="text-sm text-slate-400">배터리</dt>
                    <dd className="font-medium">{spec.batteryMinutes}분</dd>
                  </div>
                )}
                {spec.os && (
                  <div>
                    <dt className="text-sm text-slate-400">OS</dt>
                    <dd className="font-medium">{spec.os}</dd>
                  </div>
                )}
                {spec.sdk && (
                  <div>
                    <dt className="text-sm text-slate-400">SDK</dt>
                    <dd className="font-medium">{spec.sdk}</dd>
                  </div>
                )}
                
                {/* Dynamic Specs (SoC, etc.) */}
                {spec.dynamicSpecs && Object.keys(spec.dynamicSpecs).length > 0 && (
                  <>
                    {spec.dynamicSpecs.tops && (
                      <div>
                        <dt className="text-sm text-slate-400">TOPS</dt>
                        <dd className="font-medium">{spec.dynamicSpecs.tops} TOPS</dd>
                      </div>
                    )}
                    {spec.dynamicSpecs.npuTops && (
                      <div>
                        <dt className="text-sm text-slate-400">NPU TOPS</dt>
                        <dd className="font-medium">{spec.dynamicSpecs.npuTops} TOPS</dd>
                      </div>
                    )}
                    {spec.dynamicSpecs.process && (
                      <div>
                        <dt className="text-sm text-slate-400">공정</dt>
                        <dd className="font-medium">{spec.dynamicSpecs.process}</dd>
                      </div>
                    )}
                    {spec.dynamicSpecs.tdpWatts && (
                      <div>
                        <dt className="text-sm text-slate-400">전력</dt>
                        <dd className="font-medium">{spec.dynamicSpecs.tdpWatts}</dd>
                      </div>
                    )}
                    {spec.dynamicSpecs.memory && (
                      <div>
                        <dt className="text-sm text-slate-400">메모리</dt>
                        <dd className="font-medium">{spec.dynamicSpecs.memory}</dd>
                      </div>
                    )}
                    {spec.dynamicSpecs.memorySize && (
                      <div>
                        <dt className="text-sm text-slate-400">메모리 용량</dt>
                        <dd className="font-medium">{spec.dynamicSpecs.memorySize}</dd>
                      </div>
                    )}
                    {spec.dynamicSpecs.memoryBandwidth && (
                      <div>
                        <dt className="text-sm text-slate-400">대역폭</dt>
                        <dd className="font-medium">{spec.dynamicSpecs.memoryBandwidth}</dd>
                      </div>
                    )}
                    {spec.dynamicSpecs.cpuCores && (
                      <div>
                        <dt className="text-sm text-slate-400">CPU</dt>
                        <dd className="font-medium">{spec.dynamicSpecs.cpuCores}</dd>
                      </div>
                    )}
                    {spec.dynamicSpecs.gpuModel && (
                      <div>
                        <dt className="text-sm text-slate-400">GPU</dt>
                        <dd className="font-medium">{spec.dynamicSpecs.gpuModel}</dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
              
              {(spec.priceMin || spec.priceMax) && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-sm text-slate-400">가격</dt>
                  <dd className="text-xl font-bold text-green-600">
                    {spec.priceMin === spec.priceMax
                      ? formatCurrency(spec.priceMin, spec.priceCurrency)
                      : `${formatCurrency(spec.priceMin, spec.priceCurrency)} - ${formatCurrency(spec.priceMax, spec.priceCurrency)}`
                    }
                  </dd>
                </div>
              )}
            </div>
          )}

          {/* Articles */}
          <div className="bg-slate-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">관련 기사</h2>
            {articles && articles.length > 0 ? (
              <div className="space-y-3">
                {articles.map((article: any) => (
                  <Link
                    key={article.id}
                    href={`/articles/${article.id}`}
                    className="flex items-start gap-3 p-3 hover:bg-slate-700 rounded-lg"
                  >
                    <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium">{article.title}</p>
                      <p className="text-sm text-slate-500">
                        {article.source} · {formatDate(article.publishedAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-500">관련 기사가 없습니다.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Card */}
          {company && (
            <div className="bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">{company.name}</p>
                  <p className="text-sm text-slate-500">{company.country}</p>
                </div>
              </div>
              <Link
                href={`/companies/${company.id}`}
                className="text-blue-400 hover:underline text-sm"
              >
                회사 상세 보기 →
              </Link>
            </div>
          )}

          {/* Keywords */}
          <div className="bg-slate-800 rounded-lg shadow p-6">
            <h3 className="font-semibold mb-3">관련 키워드</h3>
            {keywords && keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword: any) => (
                  <span
                    key={keyword.id}
                    className="px-2 py-1 bg-slate-700 text-slate-300 text-sm rounded-full"
                  >
                    <Tag className="w-3 h-3 inline mr-1" />
                    {keyword.term}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">관련 키워드가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
