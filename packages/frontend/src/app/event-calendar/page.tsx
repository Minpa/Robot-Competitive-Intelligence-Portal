'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EventCalendar } from '@/components/event-calendar/EventCalendar';
import type { RobotAIEvent } from '@/types/event-calendar';

function EventCalendarContent() {
  const [events, setEvents] = useState<RobotAIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/events')
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: RobotAIEvent[]) => {
        setEvents(data);
        setError(null);
      })
      .catch(err => {
        console.error('[event-calendar] fetch failed:', err);
        setError('데이터를 불러오는 중 문제가 발생했습니다');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-6 max-w-full overflow-hidden">
      <PageHeader
        module="INTELLIGENCE FEED V4.2"
        titleKo="이벤트 캘린더"
        titleEn="EVENT CALENDAR"
        description="로봇·AI 글로벌 전시, 학술대회, 정책·규제 이벤트 일정"
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
