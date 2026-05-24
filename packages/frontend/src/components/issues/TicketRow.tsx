'use client';

import Link from 'next/link';
import {
  PRIORITY_LABEL, PRIORITY_COLOR, STATUS_LABEL, STATUS_COLOR, TYPE_LABEL, TYPE_COLOR,
  type IssueTicket,
} from '@/lib/issues-api';
import { cn } from '@/lib/utils';
import { AlertCircle, Clock } from 'lucide-react';

interface Props {
  ticket: IssueTicket;
  variant?: 'card' | 'row';
}

function isOverdue(t: IssueTicket): boolean {
  if (!t.dueAt) return false;
  if (t.status === 'done' || t.status === 'cancelled') return false;
  return new Date(t.dueAt).getTime() < Date.now();
}

export function TicketRow({ ticket, variant = 'row' }: Props) {
  const overdue = isOverdue(ticket);
  const due = ticket.dueAt ? new Date(ticket.dueAt) : null;

  if (variant === 'card') {
    return (
      <Link href={`/issues/${ticket.code}`}
        className="block bg-white border border-slate-200 rounded-md p-3 hover:border-slate-400 hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-[10px] text-slate-500">{ticket.code}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', STATUS_COLOR[ticket.status])}>
            {STATUS_LABEL[ticket.status]}
          </span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', PRIORITY_COLOR[ticket.priority])}>
            {PRIORITY_LABEL[ticket.priority]}
          </span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', TYPE_COLOR[ticket.type])}>
            {TYPE_LABEL[ticket.type]}
          </span>
          {overdue && <AlertCircle className="w-3 h-3 text-red-600 ml-auto" />}
        </div>
        <div className="text-sm font-medium text-slate-900 line-clamp-2">{ticket.title}</div>
        {due && (
          <div className={cn(
            'mt-1.5 inline-flex items-center gap-1 text-[10px]',
            overdue ? 'text-red-600' : 'text-slate-500',
          )}>
            <Clock className="w-2.5 h-2.5" />
            {due.toLocaleDateString('ko-KR')}
          </div>
        )}
      </Link>
    );
  }

  return (
    <Link href={`/issues/${ticket.code}`}
      className="flex items-center gap-3 px-3 py-2 bg-white border-b border-slate-100 hover:bg-slate-50">
      <span className="font-mono text-[11px] text-slate-500 w-16 shrink-0">{ticket.code}</span>
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0 w-14 text-center', STATUS_COLOR[ticket.status])}>
        {STATUS_LABEL[ticket.status]}
      </span>
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0 w-10 text-center', PRIORITY_COLOR[ticket.priority])}>
        {PRIORITY_LABEL[ticket.priority]}
      </span>
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0 w-12 text-center', TYPE_COLOR[ticket.type])}>
        {TYPE_LABEL[ticket.type]}
      </span>
      <span className="text-sm text-slate-900 flex-1 truncate">{ticket.title}</span>
      {due && (
        <span className={cn(
          'text-[10px] shrink-0 inline-flex items-center gap-1',
          overdue ? 'text-red-600 font-medium' : 'text-slate-500',
        )}>
          <Clock className="w-2.5 h-2.5" />
          {due.toLocaleDateString('ko-KR')}
        </span>
      )}
    </Link>
  );
}
