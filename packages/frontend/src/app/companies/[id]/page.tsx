'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Building2, ExternalLink, ArrowLeft, Bot, Brain, Cpu, Cog,
  Users, TrendingUp, Briefcase, MapPin, Globe
} from 'lucide-react';

const getCategoryStyle = (categoryId: string) => {
  switch (categoryId) {
    case 'robot': return { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'rfm': return { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' };
    case 'soc': return { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' };
    case 'actuator': return { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' };
    default: return { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' };
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

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = params.id as string;

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => api.getCompany(companyId),
    enabled: !!companyId,
  });

  const { data: products } = useQuery({
    queryKey: ['company-products', companyId],
    queryFn: () => api.getProducts({ companyId, pageSize: '20' }),
    enabled: !!companyId,
  });

  const { data: workforce } = useQuery({
    queryKey: ['company-workforce', companyId],
    queryFn: () => api.getWorkforceData(companyId),
    enabled: !!companyId,
  });

  const { data: talentTrend } = useQuery({
    queryKey: ['company-talent-trend', companyId],
    queryFn: () => api.getTalentTrend(companyId),
    enabled: !!companyId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500/30 border-t-blue-500" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-ink-500">회사를 찾을 수 없습니다.</p>
        <Link href="/companies" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
          회사 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const style = getCategoryStyle(company.category);
  const Icon = getCategoryIcon(company.category);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <Link
        href="/companies"
        className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        회사 목록
      </Link>

      {/* Company Header */}
      <div className="bg-white border border-ink-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-xl ${style.bg} border ${style.border}`}>
            <Icon className={`w-12 h-12 ${style.text}`} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-ink-900">{company.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-ink-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {company.country}
              </span>
              <span className={`px-2 py-1 rounded text-sm ${style.bg} ${style.text} border ${style.border}`}>
                {company.category}
              </span>
            </div>
            {company.description && (
              <p className="mt-4 text-ink-700">{company.description}</p>
            )}
            {company.homepageUrl && (
              <a
                href={company.homepageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Globe className="w-4 h-4" />
                {company.homepageUrl}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Workforce Info */}
      {workforce && (
        <div className="bg-white border border-ink-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-ink-900">
            <Users className="w-5 h-5 text-blue-400" />
            인력 현황
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-ink-200 rounded-lg p-4">
              <p className="text-sm text-ink-500">총 인원</p>
              <p className="text-2xl font-bold text-ink-900">
                {workforce.totalHeadcountMin && workforce.totalHeadcountMax
                  ? `${workforce.totalHeadcountMin.toLocaleString()} - ${workforce.totalHeadcountMax.toLocaleString()}`
                  : '-'}
              </p>
            </div>
            <div className="bg-white border border-ink-200 rounded-lg p-4">
              <p className="text-sm text-ink-500">휴머노이드 팀</p>
              <p className="text-2xl font-bold text-blue-400">
                {workforce.humanoidTeamSize?.toLocaleString() || '-'}
              </p>
            </div>
          </div>

          {/* Job Distribution */}
          {workforce.jobDistribution && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-ink-700 mb-3">직무 분포</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(workforce.jobDistribution as Record<string, number>).map(([key, value]) => (
                  <div key={key} className="bg-white border border-ink-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-ink-400 uppercase">{key}</p>
                    <p className="text-lg font-semibold text-ink-900">{value || 0}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Talent Trend */}
      {talentTrend && talentTrend.length > 0 && (
        <div className="bg-white border border-ink-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-ink-900">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            인력 추이
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200">
                  <th className="text-left py-3 px-3 text-ink-500 font-medium">연도</th>
                  <th className="text-right py-3 px-3 text-ink-500 font-medium">총 인원</th>
                  <th className="text-right py-3 px-3 text-ink-500 font-medium">휴머노이드 팀</th>
                  <th className="text-right py-3 px-3 text-ink-500 font-medium">채용 공고</th>
                </tr>
              </thead>
              <tbody>
                {talentTrend.map((trend: any) => (
                  <tr key={trend.year} className="border-b border-ink-200 hover:bg-ink-100 transition-colors">
                    <td className="py-3 px-3 font-medium text-ink-900">{trend.year}</td>
                    <td className="text-right py-3 px-3 text-ink-700">{trend.totalHeadcount?.toLocaleString() || '-'}</td>
                    <td className="text-right py-3 px-3 text-ink-700">{trend.humanoidTeamSize?.toLocaleString() || '-'}</td>
                    <td className="text-right py-3 px-3 text-ink-700">{trend.jobPostingCount?.toLocaleString() || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products */}
      {products && products.items.length > 0 && (
        <div className="bg-white border border-ink-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-ink-900">
            <Briefcase className="w-5 h-5 text-purple-400" />
            제품 목록 ({products.total}개)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.items.map((product: any) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="bg-white border border-ink-200 rounded-lg p-4 hover:border-info/30 hover:bg-ink-100 transition-all"
              >
                <h3 className="font-medium text-ink-900">{product.name}</h3>
                <div className="mt-2 flex items-center gap-2 text-sm text-ink-500">
                  <span className="px-2 py-0.5 bg-info-soft/50 rounded">{product.type}</span>
                  {product.releaseDate && <span>{product.releaseDate}</span>}
                </div>
                <span className={`mt-2 inline-block px-2 py-0.5 text-xs rounded ${
                  product.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  product.status === 'development' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                }`}>
                  {product.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
