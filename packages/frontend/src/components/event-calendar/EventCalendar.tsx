'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Calendar,
  MapPin,
  Star,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  FileText,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RobotAIEvent, EventType } from '@/types/event-calendar';

const ALL_TYPES: EventType[] = ['전시', '학회', '정책'];
const TYPE_META: Record<EventType, { label: string; badge: string; color: string; dot: string }> = {
  '전시': { label: '전시', badge: 'EXPO', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30', dot: 'bg-blue-500' },
  '학회': { label: '학회', badge: 'CONF', color: 'bg-purple-500/15 text-purple-500 border-purple-500/30', dot: 'bg-purple-500' },
  '정책': { label: '정책', badge: 'POLICY', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30', dot: 'bg-amber-500' },
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isOngoing(event: RobotAIEvent, now: Date) {
  return new Date(event.date_start) <= now && new Date(event.date_end) >= now;
}

function isPast(event: RobotAIEvent, now: Date) {
  return new Date(event.date_end) < now;
}

function getDDayInfo(event: RobotAIEvent, now: Date): { label: string; className: string } | null {
  if (isOngoing(event, now)) return null;
  if (isPast(event, now)) {
    return { label: '종료', className: 'bg-slate-100 text-slate-400 border-slate-200' };
  }
  const diff = Math.ceil((new Date(event.date_start).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 60) return null;
  if (diff <= 7) return { label: `D-${diff}`, className: 'bg-red-50 text-red-600 border-red-200 font-bold' };
  if (diff <= 30) return { label: `D-${diff}`, className: 'bg-orange-50 text-orange-500 border-orange-200' };
  return { label: `D-${diff}`, className: 'bg-yellow-50 text-yellow-600 border-yellow-200' };
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function getEventsForDay(events: RobotAIEvent[], day: Date): RobotAIEvent[] {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
  return events.filter(e => {
    const eStart = new Date(e.date_start);
    const eEnd = new Date(e.date_end);
    return eStart <= dayEnd && eEnd >= dayStart;
  });
}

// ---------- Dropdown for multi-select ----------

function TypeMultiSelect({
  selected,
  onChange,
}: {
  selected: Set<EventType>;
  onChange: (next: Set<EventType>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (t: EventType) => {
    const next = new Set(selected);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onChange(next);
  };

  const label =
    selected.size === 0 || selected.size === ALL_TYPES.length
      ? '유형: 전체'
      : [...selected].map(t => TYPE_META[t].label).join(', ');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm transition-colors min-w-[140px]',
          open ? 'border-blue-400 ring-2 ring-blue-400/20' : 'border-ink-200 hover:border-ink-300',
        )}
      >
        <span className="flex-1 text-left text-ink-700 truncate">{label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-ink-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-ink-200 rounded-lg shadow-lg py-1">
          {ALL_TYPES.map(t => {
            const checked = selected.has(t);
            return (
              <label
                key={t}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-ink-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(t)}
                  className="accent-blue-500 w-3.5 h-3.5"
                />
                <span className={`w-2 h-2 rounded-full ${TYPE_META[t].dot}`} />
                <span className="text-ink-700">{TYPE_META[t].label}</span>
                <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded border ${TYPE_META[t].color}`}>
                  {TYPE_META[t].badge}
                </span>
              </label>
            );
          })}
          <div className="border-t border-ink-100 mt-1 pt-1 px-3 py-1.5 flex gap-2">
            <button
              onClick={() => onChange(new Set(ALL_TYPES))}
              className="text-[11px] text-blue-500 hover:underline"
            >
              전체 선택
            </button>
            <button
              onClick={() => onChange(new Set())}
              className="text-[11px] text-ink-400 hover:underline"
            >
              초기화
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Relevance Slider ----------

function RelevanceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white border border-ink-200 rounded-lg px-3 py-2 min-w-[200px]">
      <span className="text-xs text-ink-500 whitespace-nowrap">중요도</span>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-amber-500 cursor-pointer"
      />
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'w-3 h-3',
              i < value ? 'text-amber-400 fill-amber-400' : 'text-ink-200',
            )}
          />
        ))}
      </div>
      <span className="text-xs font-mono text-ink-500 w-4 text-right">{value}+</span>
    </div>
  );
}

// ---------- Day Cell Popover ----------

function DayCellPopover({
  events,
  now,
  onSelect,
  onClose,
}: {
  events: RobotAIEvent[];
  now: Date;
  onSelect: (e: RobotAIEvent) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-40 bg-white border border-ink-200 rounded-lg shadow-xl p-2 min-w-[220px] max-w-[280px]">
        <div className="space-y-1">
          {events.map(event => {
            const meta = TYPE_META[event.type];
            const ongoing = isOngoing(event, now);
            return (
              <button
                key={event.id}
                onClick={() => onSelect(event)}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-md hover:bg-ink-50 transition-colors',
                  ongoing && 'bg-green-50/50',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                  <span className="text-xs font-medium text-ink-800 truncate">{event.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 ml-4">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${meta.color}`}>
                    {meta.badge}
                  </span>
                  {ongoing && (
                    <span className="text-[9px] font-mono font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                      LIVE
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------- Calendar Day Cell ----------

function CalendarDayCell({
  day,
  events,
  now,
  isCurrentMonth,
  onSelectEvent,
}: {
  day: Date;
  events: RobotAIEvent[];
  now: Date;
  isCurrentMonth: boolean;
  onSelectEvent: (e: RobotAIEvent) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const isToday = isSameDay(day, now);
  const hasEvents = events.length > 0;
  const maxVisible = 3;

  return (
    <div
      className={cn(
        'relative min-h-[100px] border-b border-r border-ink-100 p-1.5 transition-colors',
        !isCurrentMonth && 'bg-ink-50/50',
        hasEvents && isCurrentMonth && 'hover:bg-blue-50/30',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'text-xs font-mono w-6 h-6 flex items-center justify-center rounded-full',
            isToday
              ? 'bg-blue-500 text-white font-bold'
              : isCurrentMonth
                ? 'text-ink-700'
                : 'text-ink-300',
          )}
        >
          {day.getDate()}
        </span>
        {day.getDay() === 0 && isCurrentMonth && (
          <span className="text-[9px] text-red-400 font-mono">SUN</span>
        )}
      </div>

      <div className="space-y-0.5">
        {events.slice(0, maxVisible).map(event => {
          const meta = TYPE_META[event.type];
          const ongoing = isOngoing(event, now);
          const past = isPast(event, now);
          return (
            <button
              key={event.id}
              onClick={() => onSelectEvent(event)}
              className={cn(
                'w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate transition-colors',
                ongoing
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 border-l-2 border-green-500'
                  : past
                    ? 'bg-ink-50 text-ink-400 hover:bg-ink-100'
                    : `${meta.color} hover:opacity-80`,
              )}
              title={event.name}
            >
              {event.name}
            </button>
          );
        })}
        {events.length > maxVisible && (
          <button
            onClick={() => setPopoverOpen(true)}
            className="w-full text-[10px] text-blue-500 hover:text-blue-600 font-medium text-left px-1.5 py-0.5 hover:bg-blue-50 rounded transition-colors"
          >
            +{events.length - maxVisible}건 더보기
          </button>
        )}
      </div>

      {popoverOpen && (
        <DayCellPopover
          events={events}
          now={now}
          onSelect={e => {
            onSelectEvent(e);
            setPopoverOpen(false);
          }}
          onClose={() => setPopoverOpen(false)}
        />
      )}
    </div>
  );
}

// ---------- Month Summary Bar ----------

function MonthSummaryBar({
  year,
  month,
  filtered,
  now,
}: {
  year: number;
  month: number;
  filtered: RobotAIEvent[];
  now: Date;
}) {
  const thisMonthEvents = useMemo(() => {
    return filtered.filter(e => {
      const s = new Date(e.date_start);
      return s.getFullYear() === year && s.getMonth() === month;
    });
  }, [filtered, year, month]);

  const d30Count = useMemo(() => {
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 30);
    return filtered.filter(e => {
      const start = new Date(e.date_start);
      return start >= now && start <= limit;
    }).length;
  }, [filtered, now]);

  const nowMonth = now.getFullYear() === year && now.getMonth() === month;

  return (
    <div className="flex items-center gap-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 p-3 px-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-500" />
        <span className="text-sm text-ink-700">
          {nowMonth ? '이번 달' : `${month + 1}월`} 이벤트{' '}
          <span className="font-bold text-blue-600">{thisMonthEvents.length}</span>건
        </span>
      </div>
      {nowMonth && (
        <>
          <span className="text-ink-300">|</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-ink-700">
              D-30 이내 <span className="font-bold text-orange-600">{d30Count}</span>건
            </span>
          </div>
        </>
      )}
      <div className="ml-auto flex items-center gap-3 text-[10px] text-ink-500">
        {ALL_TYPES.map(t => (
          <span key={t} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${TYPE_META[t].dot}`} />
            {TYPE_META[t].label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Event Side Panel ----------

function EventSidePanel({
  event,
  now,
  onClose,
}: {
  event: RobotAIEvent;
  now: Date;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const meta = TYPE_META[event.type];
  const dday = getDDayInfo(event, now);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/25 z-40 transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[420px] max-w-[90vw] bg-white border-l border-ink-200 shadow-2xl z-50 overflow-y-auto transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
                  {meta.badge}
                </span>
                {dday && (
                  <span className={cn(
                    'text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border',
                    dday.className,
                  )}>
                    {dday.label}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-ink-900 leading-snug">
                {event.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-md hover:bg-ink-100 transition-colors"
            >
              <X className="w-4 h-4 text-ink-400" />
            </button>
          </div>

          <div className="space-y-3 bg-ink-50/50 rounded-lg p-4">
            <div className="flex items-center gap-2.5 text-sm text-ink-600">
              <Calendar className="w-4 h-4 text-ink-400 shrink-0" />
              <span>
                {fmtDate(event.date_start)}
                {event.date_start !== event.date_end && ` – ${fmtDate(event.date_end)}`}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-ink-600">
              <MapPin className="w-4 h-4 text-ink-400 shrink-0" />
              <span>{event.location}, {event.country}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-ink-600">
              <Star className="w-4 h-4 text-ink-400 shrink-0" />
              <span className="mr-1">중요도</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-3.5 h-3.5',
                      i < event.relevance_score ? 'text-amber-400 fill-amber-400' : 'text-ink-200',
                    )}
                  />
                ))}
              </div>
            </div>
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              공식 웹사이트
            </a>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-2.5">태그</h3>
            <div className="flex flex-wrap gap-1.5">
              {event.tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-ink-50 text-ink-600 border border-ink-150"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold text-ink-400 uppercase tracking-wider mb-3">관련 리포트</h3>
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-ink-200 bg-ink-50/50"
                >
                  <FileText className="w-4 h-4 text-ink-300 shrink-0" />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="h-3 w-3/4 bg-ink-150 rounded" />
                    <div className="h-2 w-1/2 bg-ink-100 rounded" />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-ink-400 text-center pt-1">
                Intelligence Feed API 연결 예정
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------- Skeleton ----------

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 p-3 animate-pulse">
        <div className="h-5 w-64 bg-blue-100 rounded" />
      </div>
      <div className="bg-white rounded-xl border border-ink-200 overflow-hidden animate-pulse">
        <div className="grid grid-cols-7 border-b border-ink-100">
          {WEEKDAYS.map(d => (
            <div key={d} className="p-2 text-center">
              <div className="h-4 w-6 bg-ink-100 rounded mx-auto" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-[100px] border-b border-r border-ink-100 p-1.5">
              <div className="h-4 w-4 bg-ink-100 rounded-full mb-2" />
              {i % 5 === 0 && <div className="h-3 w-full bg-ink-50 rounded mb-1" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------

interface EventCalendarProps {
  events: RobotAIEvent[];
  loading?: boolean;
  error?: string | null;
}

export function EventCalendar({ events, loading, error }: EventCalendarProps) {
  const now = useMemo(() => new Date(), []);
  const countries = useMemo(() => Array.from(new Set(events.map(e => e.country))).sort(), [events]);

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(new Set(ALL_TYPES));
  const [country, setCountry] = useState('전체');
  const [minRelevance, setMinRelevance] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<RobotAIEvent | null>(null);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (selectedTypes.size > 0 && !selectedTypes.has(e.type)) return false;
      if (country !== '전체' && e.country !== country) return false;
      if (e.relevance_score < minRelevance) return false;
      return true;
    });
  }, [events, selectedTypes, country, minRelevance]);

  const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const eventsMap = useMemo(() => {
    const map = new Map<string, RobotAIEvent[]>();
    for (const day of calendarDays) {
      if (!day) continue;
      const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      map.set(key, getEventsForDay(filtered, day));
    }
    return map;
  }, [calendarDays, filtered]);

  const goToday = useCallback(() => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  }, [now]);

  const goPrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const goNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isCurrentView = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  const activeFilters = (selectedTypes.size < ALL_TYPES.length && selectedTypes.size > 0)
    || country !== '전체'
    || minRelevance > 1;

  const resetFilters = () => {
    setSelectedTypes(new Set(ALL_TYPES));
    setCountry('전체');
    setMinRelevance(1);
  };

  return (
    <div className="space-y-4">
      {/* ===== Filter Bar ===== */}
      <div className="bg-white rounded-xl border border-ink-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <TypeMultiSelect selected={selectedTypes} onChange={setSelectedTypes} />

          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className="bg-white border border-ink-200 text-ink-700 text-sm rounded-lg px-3 py-2 focus:ring-blue-400 focus:border-blue-400"
          >
            <option value="전체">국가: 전체</option>
            {countries.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <RelevanceSlider value={minRelevance} onChange={setMinRelevance} />

          {activeFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-600 transition-colors"
            >
              <X className="w-3 h-3" />
              필터 초기화
            </button>
          )}

          <div className="ml-auto text-xs text-ink-400">
            <span className="font-mono font-semibold text-ink-600">{filtered.length}</span>
            <span>/{events.length}건</span>
          </div>
        </div>
      </div>

      {/* ===== Loading ===== */}
      {loading && <CalendarSkeleton />}

      {/* ===== Error ===== */}
      {!loading && error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* ===== Calendar ===== */}
      {!loading && !error && (
        <>
          <MonthSummaryBar year={viewYear} month={viewMonth} filtered={filtered} now={now} />

          {/* Month Navigation */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-ink-200 px-4 py-3">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-lg hover:bg-ink-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-ink-600" />
            </button>

            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-ink-900 font-mono">
                {viewYear}년 {viewMonth + 1}월
              </h2>
              {!isCurrentView && (
                <button
                  onClick={goToday}
                  className="text-[11px] font-mono font-semibold bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full hover:bg-blue-200 transition-colors"
                >
                  오늘
                </button>
              )}
            </div>

            <button
              onClick={goNext}
              className="p-1.5 rounded-lg hover:bg-ink-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-ink-600" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-xl border border-ink-200 overflow-hidden">
            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-ink-200 bg-ink-50/80">
              {WEEKDAYS.map((d, i) => (
                <div
                  key={d}
                  className={cn(
                    'text-center py-2.5 text-xs font-semibold tracking-wider',
                    i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-ink-500',
                  )}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return (
                    <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r border-ink-100 bg-ink-50/30" />
                  );
                }

                const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                const dayEvents = eventsMap.get(key) || [];
                const isCurrentMonth = day.getMonth() === viewMonth;

                return (
                  <CalendarDayCell
                    key={key}
                    day={day}
                    events={dayEvents}
                    now={now}
                    isCurrentMonth={isCurrentMonth}
                    onSelectEvent={setSelectedEvent}
                  />
                );
              })}
            </div>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-ink-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-ink-200" />
              <p className="text-sm">조건에 맞는 이벤트가 없습니다</p>
              <button onClick={resetFilters} className="mt-2 text-xs text-blue-500 hover:underline">
                필터 초기화
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== Side Panel ===== */}
      {selectedEvent && (
        <EventSidePanel
          event={selectedEvent}
          now={now}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
