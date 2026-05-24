'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Activity, Ban, CheckCircle2, Inbox } from 'lucide-react';
import { issuesApi, type DashboardOverview } from '@/lib/issues-api';
import { TicketRow } from '@/components/issues/TicketRow';
import { cn } from '@/lib/utils';

interface KpiProps { label: string; value: number; tone: 'neutral'|'amber'|'red'|'green'|'blue'; icon: any; }
function Kpi({ label, value, tone, icon: Icon }: KpiProps) {
  const palette = {
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  }[tone];
  return (
    <div className={cn('flex items-center gap-3 p-3 border rounded-md', palette)}>
      <Icon className="w-4 h-4 shrink-0" />
      <div>
        <div className="text-[10px] uppercase tracking-wider font-medium">{label}</div>
        <div className="text-xl font-semibold mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function IssuesOverviewPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    issuesApi.overview()
      .then((r) => { setData(r); setErr(null); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">로딩…</div>;
  if (err) return <div className="text-sm text-red-600">에러: {err}</div>;
  if (!data) return null;

  const s = data.summary;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">대시보드</h1>
        <p className="text-xs text-slate-500 mt-1">전체 이슈 현황. /ask 로 빠르게 검색하거나 새 이슈를 발행하세요.</p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Kpi label="전체 미해결" value={Number(s.open) || 0} tone="neutral" icon={Inbox} />
        <Kpi label="진행 중" value={Number(s.inProgress) || 0} tone="amber" icon={Activity} />
        <Kpi label="차단됨" value={Number(s.blocked) || 0} tone="red" icon={Ban} />
        <Kpi label="기한 초과" value={Number(s.overdue) || 0} tone="red" icon={AlertCircle} />
        <Kpi label="이번주 완료" value={Number(s.doneThisWeek) || 0} tone="green" icon={CheckCircle2} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-900">미해결 이슈 (우선순위 · 최신순)</h2>
          <span className="text-[11px] text-slate-500">{data.cards.length}개</span>
        </div>
        {data.cards.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-sm text-slate-500">
            미해결 이슈가 없습니다. <Link href="/issues/ask" className="text-blue-600 hover:underline">Ask 로 새 이슈 만들기</Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            {data.cards.map((t) => <TicketRow key={t.id} ticket={t} variant="row" />)}
          </div>
        )}
      </div>
    </div>
  );
}
