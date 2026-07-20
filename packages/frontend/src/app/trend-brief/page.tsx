'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, Tag, KpiTile } from '@/components/ui';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

type CategoryKey = 'all' | 'product' | 'technology' | 'industry' | 'other';

const CATEGORY_FILTERS: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'product', label: '제품·로봇' },
  { key: 'technology', label: '기술' },
  { key: 'industry', label: '산업·투자' },
  { key: 'other', label: '기타' },
];

const CATEGORY_TONE: Record<string, 'info' | 'gold' | 'pos' | 'neutral'> = {
  product: 'info',
  technology: 'gold',
  industry: 'pos',
};

const CATEGORY_LABEL: Record<string, string> = {
  product: '제품',
  technology: '기술',
  industry: '산업',
};

interface ArticleItem {
  id: string;
  companyId?: string | null;
  title: string;
  source?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  summary?: string | null;
  category?: string | null;
  extractedMetadata?: {
    mentionedRobots?: string[];
    keyPoints?: string[];
  } | null;
}

function formatDate(value?: string | null) {
  if (!value) return '날짜 미상';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '날짜 미상';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function dateKey(value?: string | null) {
  if (!value) return 'unknown';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return d.toISOString().slice(0, 10);
}

export default function TrendBriefPage() {
  const [category, setCategory] = useState<CategoryKey>('all');
  const [companyId, setCompanyId] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(30);

  const articlesQuery = useQuery({
    queryKey: ['trend-brief-articles'],
    queryFn: () =>
      api.getArticles({
        page: '1',
        pageSize: '100',
        sortBy: 'publishedAt',
        sortOrder: 'desc',
      }),
  });

  const companiesQuery = useQuery({
    queryKey: ['trend-brief-companies'],
    queryFn: () => api.getCompanies({ pageSize: '200' }),
  });

  const freshnessQuery = useQuery({
    queryKey: ['trend-brief-freshness'],
    queryFn: () => api.getCompanyFreshness(),
  });

  const companies: { id: string; name: string }[] = useMemo(() => {
    const raw: any = companiesQuery.data;
    const list = Array.isArray(raw) ? raw : raw?.items ?? [];
    return list.map((c: any) => ({ id: c.id, name: c.name }));
  }, [companiesQuery.data]);

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [companies]);

  const allItems: ArticleItem[] = useMemo(
    () => (articlesQuery.data?.items ?? []) as ArticleItem[],
    [articlesQuery.data]
  );

  const filtered = useMemo(() => {
    return allItems.filter((item) => {
      if (companyId !== 'all' && item.companyId !== companyId) return false;
      if (category === 'all') return true;
      if (category === 'other') {
        return !item.category || !['product', 'technology', 'industry'].includes(item.category);
      }
      return item.category === category;
    });
  }, [allItems, category, companyId]);

  const visible = filtered.slice(0, visibleCount);

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; items: ArticleItem[] }[] = [];
    for (const item of visible) {
      const key = dateKey(item.publishedAt);
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.items.push(item);
      } else {
        groups.push({ key, label: formatDate(item.publishedAt), items: [item] });
      }
    }
    return groups;
  }, [visible]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const recent = allItems.filter((a) => {
      const t = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      return t >= weekAgo;
    });
    const companySet = new Set(recent.map((a) => a.companyId).filter(Boolean));
    const latest = allItems[0]?.publishedAt;
    return {
      weekCount: recent.length,
      weekCompanies: companySet.size,
      latestDate: latest ? dateKey(latest) : '—',
    };
  }, [allItems]);

  const coverage = useMemo(() => {
    const rows = freshnessQuery.data ?? [];
    const now = Date.now();
    const withDays = rows.map((r) => ({
      ...r,
      days: r.lastPublishedAt
        ? Math.floor((now - new Date(r.lastPublishedAt).getTime()) / (24 * 60 * 60 * 1000))
        : null,
    }));
    // 오래된 순 정렬 (수집 이력 없는 곳이 가장 위)
    withDays.sort((a, b) => (b.days ?? 9999) - (a.days ?? 9999));
    const stale = withDays.filter((r) => r.days === null || r.days > 14);
    return { all: withDays, stale };
  }, [freshnessQuery.data]);

  return (
    <AuthGuard>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PageHeader
          module="Daily Brief"
          titleKo="동향 브리핑"
          titleEn="Trend Brief"
          description="전세계 경쟁사 로봇 · 기술 · 양산 동향을 최신순으로 모아 보여줍니다. 회사와 카테고리로 필터링할 수 있습니다."
        />

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <KpiTile label="최근 7일 업데이트" value={stats.weekCount} unit="건" />
          <KpiTile label="이번 주 커버 기업" value={stats.weekCompanies} unit="개사" />
          <KpiTile label="최신 업데이트" value={stats.latestDate} />
        </div>

        {/* Coverage Freshness */}
        {coverage.all.length > 0 && (
          <Panel
            kicker="Coverage Monitor"
            title="수집 커버리지 현황"
            subtitle="기업별 마지막 수집 시점입니다. 14일 이상 업데이트가 없으면 커버리지 공백입니다."
            padding="compact"
            className="mb-6"
          >
            <div className="flex flex-wrap gap-1.5">
              {coverage.all.map((c) => {
                const tone =
                  c.days === null || c.days > 14 ? 'neg' : c.days > 7 ? 'warn' : 'pos';
                return (
                  <Link key={c.companyId} href={`/companies/${c.companyId}`}>
                    <Tag tone={tone} size="sm" dot>
                      {c.companyName}
                      {' · '}
                      {c.days === null ? '이력 없음' : c.days === 0 ? '오늘' : `${c.days}일 전`}
                    </Tag>
                  </Link>
                );
              })}
            </div>
            {coverage.stale.length > 0 && (
              <p className="mt-3 text-[11.5px] text-ink-500">
                ⚠ {coverage.stale.length}개 기업이 14일 이상 미수집 상태입니다. 다음 데이터 업데이트에서 우선 보강이 필요합니다.
              </p>
            )}
          </Panel>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setCategory(f.key);
                setVisibleCount(30);
              }}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium border transition-colors',
                category === f.key
                  ? 'bg-brand text-white border-brand'
                  : 'bg-white text-ink-600 border-ink-200 hover:border-ink-400'
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto">
            <select
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setVisibleCount(30);
              }}
              className="px-3 py-1.5 text-[12px] border border-ink-200 bg-white text-ink-700"
            >
              <option value="all">모든 기업</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Feed */}
        {articlesQuery.isLoading && (
          <Panel padding="default">
            <div className="py-12 text-center text-ink-400 text-sm">브리핑을 불러오는 중...</div>
          </Panel>
        )}

        {articlesQuery.isError && (
          <Panel padding="default">
            <div className="py-12 text-center text-neg text-sm">
              데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
            </div>
          </Panel>
        )}

        {!articlesQuery.isLoading && !articlesQuery.isError && grouped.length === 0 && (
          <Panel padding="default">
            <div className="py-12 text-center text-ink-400 text-sm">조건에 맞는 업데이트가 없습니다.</div>
          </Panel>
        )}

        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.key}>
              <h2 className="font-mono text-[10px] font-medium text-gold uppercase tracking-[0.22em] mb-3">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.items.map((item) => {
                  const companyName = item.companyId ? companyNameById.get(item.companyId) : undefined;
                  const robots = item.extractedMetadata?.mentionedRobots?.slice(0, 3) ?? [];
                  const catLabel = item.category ? CATEGORY_LABEL[item.category] : undefined;
                  return (
                    <article
                      key={item.id}
                      className="bg-white border border-ink-200 px-5 py-4 hover:border-ink-400 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {catLabel && (
                          <Tag tone={CATEGORY_TONE[item.category!] ?? 'neutral'} size="sm">
                            {catLabel}
                          </Tag>
                        )}
                        {companyName && item.companyId && (
                          <Link
                            href={`/companies/${item.companyId}`}
                            className="font-mono text-[10px] font-medium text-ink-500 uppercase tracking-[0.18em] hover:text-brand"
                          >
                            {companyName}
                          </Link>
                        )}
                        {robots.map((r) => (
                          <span key={r} className="font-mono text-[10px] text-ink-400">
                            #{r}
                          </span>
                        ))}
                      </div>
                      <h3 className="text-[14px] font-semibold text-ink-900 leading-snug mb-1.5">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-[12.5px] text-ink-600 leading-relaxed line-clamp-3 mb-2">
                          {item.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-ink-400">
                        {item.source && <span className="truncate max-w-[50%]">{item.source}</span>}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-info hover:underline shrink-0"
                          >
                            원문 보기 <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {filtered.length > visibleCount && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setVisibleCount((n) => n + 30)}
              className="px-6 py-2.5 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors"
            >
              더 보기 ({filtered.length - visibleCount}건 남음)
            </button>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
