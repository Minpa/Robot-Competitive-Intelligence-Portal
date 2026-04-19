'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Shield, AlertTriangle, Bell, CheckSquare, Globe, FileText, Scale, Lock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { PageHeader, ArgosCard, SectionTitle } from '@/components/layout/PageHeader';

const CATEGORY_CONFIG = {
  policy:  { label: '정책·산업규제',     labelEn: 'Policy',  icon: Globe },
  safety:  { label: '물리적·기능적 안전', labelEn: 'Safety',  icon: Shield },
  legal:   { label: '법적 책임·배상',     labelEn: 'Legal',   icon: Scale },
  privacy: { label: '개인정보보호',        labelEn: 'Privacy', icon: Lock },
} as const;

const REGION_CONFIG = {
  korea:         { label: '한국', flag: '🇰🇷' },
  us:            { label: '미국', flag: '🇺🇸' },
  eu:            { label: 'EU',   flag: '🇪🇺' },
  china:         { label: '중국', flag: '🇨🇳' },
  international: { label: '국제', flag: '🌐' },
} as const;

const IMPACT_BADGE: Record<string, string> = {
  critical: 'text-neg  bg-neg-soft',
  high:     'text-[#B45309]        bg-warn-soft',
  medium:   'text-[#92400E]        bg-[#FEF3C7]',
  low:      'text-pos bg-pos-soft',
  none:     'text-ink-500      bg-ink-100',
};

export default function ComplianceDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadDashboard(); }, []);

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
      <div className="space-y-6">
        <PageHeader module="COMPLIANCE PORTAL V4.2" titleKo="규제 준수" titleEn="COMPLIANCE DASHBOARD" description="Real-time regulatory alignment for LG Humanoid Ecosystem." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <ArgosCard key={i} className="p-5">
              <div className="h-4 bg-ink-100 rounded w-1/2 mb-3 animate-pulse" />
              <div className="h-8 bg-ink-100 rounded w-1/3 animate-pulse" />
            </ArgosCard>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ArgosCard className="p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-neg mx-auto mb-2" />
        <p className="text-neg font-medium">{error}</p>
        <button onClick={loadDashboard} className="mt-4 px-4 py-2 bg-neg-soft text-neg rounded-lg hover:bg-neg hover:text-white transition">
          다시 시도
        </button>
      </ArgosCard>
    );
  }

  const { summary, checklist, recentUpdates } = dashboard;
  const completion = checklist?.completionRate ?? 0;
  const criticalCount = checklist?.criticalItems?.length ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        module="COMPLIANCE PORTAL V4.2"
        titleKo="규제 준수"
        titleEn="COMPLIANCE DASHBOARD"
        description="Real-time regulatory alignment for the LG Humanoid Ecosystem. Precision monitoring of global safety standards and ethical operational guidelines."
        actions={
          <div className="flex items-center gap-3 bg-white border border-ink-200 px-4 py-2.5">
            <div className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">Global Status</div>
            <div className="text-[22px] font-extrabold text-info leading-none">{completion}<span className="text-sm">%</span></div>
          </div>
        }
      />

      {/* Top KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ArgosCard className="p-6">
          <div className="flex items-center gap-2 text-ink-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>ISO 13482:2014</span>
          </div>
          <div className="text-[28px] font-extrabold text-ink-900 leading-tight">Fully Compliant</div>
          <div className="text-[11px] text-ink-400 mt-1">Last verified: {new Date().toISOString().slice(0, 10).replace(/-/g, '.')}</div>
        </ArgosCard>

        <ArgosCard className="p-6">
          <div className="flex items-center gap-2 text-ink-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>EU AI Act Alignment</span>
          </div>
          <div className="text-[28px] font-extrabold text-ink-900 leading-tight">85<span className="text-lg text-ink-500">%</span></div>
          <div className="w-full bg-ink-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-info h-1.5 rounded-full" style={{ width: '85%' }} />
          </div>
        </ArgosCard>

        <ArgosCard className="p-6">
          <div className="flex items-center gap-2 text-ink-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-neg" />
            <span>Critical Risk Index</span>
          </div>
          <div className="text-[28px] font-extrabold text-neg leading-tight">
            0.{String(criticalCount).padStart(2, '0')}
          </div>
          <div className="text-[11px] text-ink-400 mt-1">Optimal safety threshold maintained</div>
        </ArgosCard>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Certification Matrix */}
          <ArgosCard className="p-6">
            <SectionTitle action={<button className="text-[11px] font-semibold text-info hover:underline">+ Filter Models</button>}>
              Certification Matrix <span className="text-ink-400 font-semibold">/ 인증 기준 매트릭스</span>
            </SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                const catData = summary.regulationsByCategory?.find((r: any) => r.category === key);
                const count = catData ? Number(catData.count) : 0;
                return (
                  <Link
                    key={key}
                    href={`/compliance/regulations?category=${key}`}
                    className="group p-4 rounded-lg border border-ink-200 bg-paper hover:border-info hover:bg-info-soft transition"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-info-soft rounded-md flex items-center justify-center">
                        <config.icon className="w-4 h-4 text-info" />
                      </div>
                      <span className="text-[13px] font-semibold text-ink-900">{config.label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">{config.labelEn}</div>
                        <div className="text-[24px] font-extrabold text-ink-900 leading-none mt-1">{count}</div>
                      </div>
                      <span className="bg-info-soft text-info font-mono text-[10px] font-medium uppercase tracking-[0.18em] px-2 py-0.5">CERTIFIED</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </ArgosCard>

          {/* Region breakdown */}
          <ArgosCard className="p-6">
            <SectionTitle>
              지역별 규제 현황 <span className="text-ink-400 font-semibold">/ Regional Coverage</span>
            </SectionTitle>
            <div className="space-y-3">
              {Object.entries(REGION_CONFIG).map(([key, config]) => {
                const regionData = summary.regulationsByRegion?.find((r: any) => r.region === key);
                const count = regionData ? Number(regionData.count) : 0;
                const maxCount = Math.max(...(summary.regulationsByRegion?.map((r: any) => Number(r.count)) || [1]));
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <Link
                    key={key}
                    href={`/compliance/regulations?region=${key}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-paper transition group"
                  >
                    <span className="text-xl w-8 text-center">{config.flag}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[13px] font-semibold text-ink-900">{config.label}</span>
                        <span className="text-[12px] text-ink-500 font-medium">{count}건</span>
                      </div>
                      <div className="w-full bg-ink-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-info h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-400 group-hover:text-info transition" />
                  </Link>
                );
              })}
            </div>
          </ArgosCard>

          {/* Audit & Safety Logs */}
          <ArgosCard className="p-6">
            <SectionTitle>
              Audit & Safety Logs <span className="text-ink-400 font-semibold">/ 감사 로그</span>
            </SectionTitle>
            <div className="divide-y divide-ink-100">
              {(checklist.criticalItems?.slice(0, 4) || []).map((item: any) => (
                <div key={item.id} className="flex items-start gap-3 py-3">
                  <div className="w-8 h-8 bg-info-soft rounded-lg flex items-center justify-center shrink-0">
                    <CheckSquare className="w-4 h-4 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ink-900 line-clamp-1">{item.title}</p>
                    <p className="text-[11px] text-ink-500 mt-0.5">
                      {CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG]?.label} ·{' '}
                      {REGION_CONFIG[item.region as keyof typeof REGION_CONFIG]?.label}
                    </p>
                  </div>
                  <FileText className="w-4 h-4 text-ink-400 shrink-0 mt-1" />
                </div>
              ))}
              {(!checklist.criticalItems || checklist.criticalItems.length === 0) && (
                <p className="text-[12px] text-ink-500 text-center py-6">감사 로그가 없습니다.</p>
              )}
            </div>
          </ArgosCard>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-6">
          {/* Upcoming Directives */}
          <ArgosCard className="p-6">
            <SectionTitle>
              Upcoming Directives <span className="text-ink-400 font-semibold">/ 예정 지침</span>
            </SectionTitle>
            <div className="space-y-3">
              {recentUpdates?.length === 0 && (
                <p className="text-[12px] text-ink-500 text-center py-4">업데이트가 없습니다.</p>
              )}
              {(recentUpdates || []).slice(0, 3).map((update: any) => (
                <div key={update.id} className="p-3 rounded-lg bg-paper border border-ink-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${IMPACT_BADGE[update.lgImpact] || IMPACT_BADGE.medium}`}>
                      {update.lgImpact || 'medium'}
                    </span>
                    <span className="text-[10px] text-ink-400">
                      {REGION_CONFIG[update.region as keyof typeof REGION_CONFIG]?.flag} {update.region}
                    </span>
                  </div>
                  <p className="text-[12px] font-semibold text-ink-900 line-clamp-2">{update.titleKo || update.title}</p>
                  <p className="text-[10px] text-ink-400 mt-1">
                    {update.detectedAt ? new Date(update.detectedAt).toLocaleDateString('ko-KR') : ''}
                  </p>
                </div>
              ))}
            </div>
            <Link href="/compliance/updates" className="block mt-4 text-center text-[11px] font-semibold text-info hover:underline">
              View All Regulations →
            </Link>
          </ArgosCard>

          {/* Ethics Compliance */}
          <ArgosCard className="p-6">
            <SectionTitle>
              Ethics Compliance <span className="text-ink-400 font-semibold">/ 윤리 준수</span>
            </SectionTitle>
            <div className="space-y-4">
              {[
                { label: 'Transparency Index', labelKo: '투명성 지수', value: 98 },
                { label: 'Bias Reduction',     labelKo: '편향 감소',   value: 92 },
                { label: 'Human Accountability', labelKo: '책임성',    value: 100 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-ink-900">
                      {row.label} <span className="text-ink-400 font-normal">/ {row.labelKo}</span>
                    </span>
                    <span className="text-[12px] font-bold text-info">{row.value}%</span>
                  </div>
                  <div className="w-full bg-ink-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-info h-1.5 rounded-full" style={{ width: `${row.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 p-3 bg-info-soft rounded-lg">
              <p className="text-[10px] text-ink-700 leading-relaxed">
                The ARGOS Ethics Protocol adheres to the Human-in-the-Loop (HITL) framework, ensuring that authority remains with certified personnel.
              </p>
            </div>
          </ArgosCard>
        </div>
      </div>
    </div>
  );
}
