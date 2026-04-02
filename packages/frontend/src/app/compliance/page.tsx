'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Shield, AlertTriangle, Bell, CheckSquare, Globe, FileText, Scale, Lock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const CATEGORY_CONFIG = {
  policy: { label: '정책·산업규제', labelEn: 'Policy', color: 'blue', icon: Globe },
  safety: { label: '물리적·기능적 안전', labelEn: 'Safety', color: 'orange', icon: Shield },
  legal: { label: '법적 책임·배상', labelEn: 'Legal', color: 'purple', icon: Scale },
  privacy: { label: '개인정보보호', labelEn: 'Privacy', color: 'green', icon: Lock },
} as const;

const REGION_CONFIG = {
  korea: { label: '한국', flag: '🇰🇷', color: 'blue' },
  us: { label: '미국', flag: '🇺🇸', color: 'red' },
  eu: { label: 'EU', flag: '🇪🇺', color: 'indigo' },
  china: { label: '중국', flag: '🇨🇳', color: 'yellow' },
  international: { label: '국제', flag: '🌐', color: 'gray' },
} as const;

const IMPACT_COLORS: Record<string, string> = {
  critical: 'text-red-400 bg-red-400/10 border-red-400/30',
  high: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  low: 'text-green-400 bg-green-400/10 border-green-400/30',
  none: 'text-slate-400 bg-slate-400/10 border-slate-400/30',
};

const CATEGORY_COLORS: Record<string, string> = {
  blue: 'text-blue-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
  green: 'text-green-400',
};

const CATEGORY_BG: Record<string, string> = {
  blue: 'hover:border-blue-500/50',
  orange: 'hover:border-orange-500/50',
  purple: 'hover:border-purple-500/50',
  green: 'hover:border-green-500/50',
};

const CATEGORY_TEXT_LARGE: Record<string, string> = {
  blue: 'text-blue-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
  green: 'text-green-400',
};

const REGION_BAR_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  indigo: 'bg-indigo-500',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-500',
};

export default function ComplianceDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const data = await api.compliance.getDashboard();
      setDashboard(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">컴플라이언스 대시보드</h1>
            <p className="text-sm text-slate-400">Compliance Dashboard</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl p-5 border border-slate-700 animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-1/2 mb-3" />
              <div className="h-8 bg-slate-700 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">{error}</p>
          <button onClick={loadDashboard} className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const { summary, checklist, recentUpdates } = dashboard;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">컴플라이언스 대시보드</h1>
            <p className="text-sm text-slate-400">LG 휴머노이드 규제 준수 현황</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <FileText className="w-4 h-4" />
            <span>등록 규제</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">{summary.totalRegulations}</div>
          <div className="text-xs text-slate-500 mt-1">4개 카테고리 · 5개 지역</div>
        </div>

        <Link href="/compliance/updates" className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-blue-500/50 transition group">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Bell className="w-4 h-4" />
            <span>미확인 업데이트</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">{summary.unreadUpdates}</div>
          <div className="text-xs text-slate-500 mt-1 group-hover:text-blue-400 transition">클릭하여 확인 →</div>
        </Link>

        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <CheckSquare className="w-4 h-4" />
            <span>체크리스트 진행률</span>
          </div>
          <div className="text-3xl font-bold text-slate-100">{checklist.completionRate}%</div>
          <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${checklist.completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-5 border border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 text-sm mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span>긴급 대응 필요</span>
          </div>
          <div className="text-3xl font-bold text-red-400">
            {checklist.criticalItems?.length || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Critical/High 미완료 항목</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Category & Region */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Overview */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">카테고리별 규제 현황</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const catData = summary.regulationsByCategory?.find((r: any) => r.category === key);
                const count = catData ? Number(catData.count) : 0;
                return (
                  <Link
                    key={key}
                    href={`/compliance/regulations?category=${key}`}
                    className={`p-4 rounded-lg border border-slate-700 ${CATEGORY_BG[config.color] || ''} transition group`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <config.icon className={`w-5 h-5 ${CATEGORY_COLORS[config.color] || ''}`} />
                      <span className="text-sm font-medium text-slate-300">{config.label}</span>
                    </div>
                    <div className={`text-2xl font-bold ${CATEGORY_TEXT_LARGE[config.color] || ''}`}>{count}</div>
                    <div className="text-xs text-slate-500">{config.labelEn}</div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Region Overview */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">지역별 규제 현황</h2>
            <div className="space-y-3">
              {Object.entries(REGION_CONFIG).map(([key, config]) => {
                const regionData = summary.regulationsByRegion?.find((r: any) => r.region === key);
                const count = regionData ? Number(regionData.count) : 0;
                const maxCount = Math.max(...(summary.regulationsByRegion?.map((r: any) => Number(r.count)) || [1]));
                return (
                  <Link
                    key={key}
                    href={`/compliance/regulations?region=${key}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/50 transition group"
                  >
                    <span className="text-lg w-8">{config.flag}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-300">{config.label}</span>
                        <span className="text-sm text-slate-400">{count}건</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div
                          className={`${REGION_BAR_COLORS[config.color] || 'bg-gray-500'} h-1.5 rounded-full transition-all`}
                          style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Updates & Critical Items */}
        <div className="space-y-6">
          {/* Recent Updates */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">최근 규제 업데이트</h2>
              <Link href="/compliance/updates" className="text-xs text-blue-400 hover:text-blue-300">
                전체 보기 →
              </Link>
            </div>
            <div className="space-y-3">
              {recentUpdates?.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">아직 업데이트가 없습니다</p>
              )}
              {recentUpdates?.map((update: any) => (
                <div key={update.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${IMPACT_COLORS[update.lgImpact] || IMPACT_COLORS.medium}`}>
                      {update.lgImpact}
                    </span>
                    <span className="text-xs text-slate-500">
                      {REGION_CONFIG[update.region as keyof typeof REGION_CONFIG]?.flag} {update.region}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2">{update.titleKo || update.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {update.detectedAt ? new Date(update.detectedAt).toLocaleDateString('ko-KR') : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Items */}
          <div className="bg-slate-800 rounded-xl border border-red-500/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-red-400">긴급 대응 항목</h2>
              <Link href="/compliance/checklist?priority=critical" className="text-xs text-red-400 hover:text-red-300">
                전체 보기 →
              </Link>
            </div>
            <div className="space-y-2">
              {checklist.criticalItems?.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">모든 긴급 항목이 완료되었습니다</p>
              )}
              {checklist.criticalItems?.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-slate-900/50 transition">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.priority === 'critical' ? 'bg-red-400' : 'bg-orange-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 line-clamp-1">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">
                        {CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG]?.label}
                      </span>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-500">
                        {REGION_CONFIG[item.region as keyof typeof REGION_CONFIG]?.flag} {REGION_CONFIG[item.region as keyof typeof REGION_CONFIG]?.label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
