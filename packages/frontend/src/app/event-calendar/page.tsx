'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EventCalendar } from '@/components/event-calendar/EventCalendar';
import type { RobotAIEvent } from '@/types/event-calendar';

function EventCalendarContent() {
  const [events, setEvents] = useState<RobotAIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const url = refresh ? '/api/events?refresh=true' : '/api/events';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const data: RobotAIEvent[] = await res.json();
      setEvents(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[event-calendar] fetch failed:', err);
      setError('데이터를 불러오는 중 문제가 발생했습니다');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="px-4 py-6 max-w-full overflow-hidden">
      <PageHeader
        module="INTELLIGENCE FEED V4.2"
        titleKo="이벤트 캘린더"
        titleEn="EVENT CALENDAR"
        description="로봇·AI 글로벌 전시, 학회, 세미나 이벤트 일정"
        actions={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[11px] text-ink-400 font-mono">
                {lastUpdated.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} 업데이트
              </span>
            )}
            <button
              onClick={() => fetchEvents(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 bg-white hover:bg-ink-50 text-ink-700 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] px-4 py-2.5 border border-ink-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? '업데이트 중...' : '데이터 업데이트'}
            </button>
          </div>
        }
      />
      <EventCalendar events={events} loading={loading} error={error} />
    </div>
  );
}

export default function EventCalendarPage() {
  return (
    <AuthGuard>
      <EventCalendarContent />
    </AuthGuard>
  );
}
