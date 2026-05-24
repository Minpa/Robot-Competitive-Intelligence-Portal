'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { issuesApi, type IssueTicket } from '@/lib/issues-api';
import { TicketRow } from '@/components/issues/TicketRow';

export default function InboxPage() {
  const [items, setItems] = useState<IssueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    issuesApi.inbox()
      .then((r) => { setItems(r.items); setErr(null); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">내 인박스</h1>
        <p className="text-xs text-slate-500 mt-1">내가 담당이거나 멘션된 미해결 이슈.</p>
      </div>
      {loading && <div className="text-sm text-slate-500">로딩…</div>}
      {err && <div className="text-sm text-red-600">에러: {err}</div>}
      {!loading && !err && items.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-md p-8 text-center text-sm text-slate-500">
          인박스가 비어 있습니다. <Link href="/issues" className="text-blue-600 hover:underline">대시보드로</Link>
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          {items.map((t) => <TicketRow key={t.id} ticket={t} variant="row" />)}
        </div>
      )}
    </div>
  );
}
