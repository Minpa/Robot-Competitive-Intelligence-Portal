'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Star,
  ExternalLink,
  ChevronDown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RobotAIEvent, EventType } from '@/types/event-calendar';

const ALL_TYPES: EventType[] = ['전시', '학회', '정책'];
const TYPE_META: Record<EventType, { label: string; badge: string; color: string; dot: string }> = {
  '전시': { label: '전시', badge: 'EXPO', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30', dot: 'bg-blue-500' },
  '학회': { label: '학회', badge: 'CONF', color: 'bg-purple-500/15 text-purple-500 border-purple-500/30', dot: 'bg-purple-500' },
  '정책': { label: '정책', badge: 'POLICY', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30', dot: 'bg-amber-500' },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function monthKey(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${y}년 ${parseInt(m)}월`;
}

function isOngoing(event: RobotAIEvent, now: Date) {
  return new Date(event.date_start) <= now && new Date(event.date_end) >= now;
}

function isPast(event: RobotAIEvent, now: Date) {
  return new Date(event.date_end) < now;
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

// ---------- Event Card ----------

function EventCard({ event, now }: { event: RobotAIEvent; now: Date }) {
  const meta = TYPE_META[event.type];
  const ongoing = isOngoing(event, now);
  const past = isPast(event, now);

  return (
    <div
      className={cn(
        'relative bg-white rounded-xl border p-4 transition-all hover:shadow-md group',
        ongoing
          ? 'border-green-400/50 ring-1 ring-green-400/20'
          : past
            ? 'border-ink-150 opacity-60'
            : 'border-ink-200 hover:border-blue-300/50',
      )}
    >
      {ongoing && (
        <span className="absolute -top-2.5 left-4 text-[10px] font-mono font-semibold bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
          Live Now
        </span>
      )}

      <div className="flex items-start gap-3">
        {/* date block */}
        <div
          className={cn(
            'shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center text-center',
            ongoing ? 'bg-green-50 border border-green-200' : 'bg-ink-50 border border-ink-150',
          )}
        >
          <span className={cn('text-[10px] font-mono uppercase', ongoing ? 'text-green-600' : 'text-ink-400')}>
            {new Date(event.date_start).toLocaleDateString('en', { month: 'short' })}
          </span>
          <span className={cn('text-lg font-bold leading-none', ongoing ? 'text-green-700' : 'text-ink-800')}>
            {new Date(event.date_start).getDate()}
          </span>
        </div>

        {/* content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${meta.color}`}>
              {meta.badge}
            </span>
            <span className="text-[11px] text-ink-400">{event.country}</span>
            <div className="flex items-center gap-px ml-auto">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'w-2.5 h-2.5',
                    i < event.relevance_score ? 'text-amber-400 fill-amber-400' : 'text-ink-200',
                  )}
                />
              ))}
            </div>
          </div>

          <h3 className="text-sm font-semibold text-ink-900 leading-snug mb-1.5 truncate">
            {event.name}
          </h3>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-ink-400" />
              {fmtDate(event.date_start)}
              {event.date_start !== event.date_end && ` – ${fmtDate(event.date_end)}`}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-ink-400" />
              <span className="truncate max-w-[180px]">{event.location}</span>
            </span>
          </div>
        </div>

        {/* link */}
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-ink-50"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
        </a>
      </div>
    </div>
  );
}

// ---------- Main Component ----------

interface EventCalendarProps {
  events: RobotAIEvent[];
}

export function EventCalendar({ events }: EventCalendarProps) {
  const now = useMemo(() => new Date(), []);
  const countries = useMemo(() => Array.from(new Set(events.map(e => e.country))).sort(), [events]);

  const [selectedTypes, setSelectedTypes] = useState<Set<EventType>>(new Set(ALL_TYPES));
  const [country, setCountry] = useState('전체');
  const [minRelevance, setMinRelevance] = useState(1);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (selectedTypes.size > 0 && !selectedTypes.has(e.type)) return false;
      if (country !== '전체' && e.country !== country) return false;
      if (e.relevance_score < minRelevance) return false;
      return true;
    });
  }, [events, selectedTypes, country, minRelevance]);

  const grouped = useMemo(() => {
    const map = new Map<string, RobotAIEvent[]>();
    for (const e of filtered) {
      const key = monthKey(e.date_start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    return sorted;
  }, [filtered]);

  const activeFilters = (selectedTypes.size < ALL_TYPES.length && selectedTypes.size > 0)
    || country !== '전체'
    || minRelevance > 1;

  const resetFilters = () => {
    setSelectedTypes(new Set(ALL_TYPES));
    setCountry('전체');
    setMinRelevance(1);
  };

  const currentMonth = monthKey(now.toISOString());

  return (
    <div className="space-y-6">
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
              className="flex items-center gap-1 text-xs text-ink-400 hover:text-ink-600 transition-colors ml-auto"
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

      {/* ===== Timeline ===== */}
      <div className="relative">
        {/* vertical line */}
        <div className="absolute left-[23px] top-0 bottom-0 w-px bg-ink-150" />

        <div className="space-y-8">
          {grouped.map(([month, items]) => {
            const isCurrent = month === currentMonth;

            return (
              <div key={month} className="relative">
                {/* month header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={cn(
                      'relative z-10 w-[47px] h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold border',
                      isCurrent
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-ink-600 border-ink-200',
                    )}
                  >
                    {month.split('-')[1]}월
                  </div>
                  <span className={cn(
                    'text-sm font-semibold',
                    isCurrent ? 'text-blue-600' : 'text-ink-700',
                  )}>
                    {monthLabel(month)}
                  </span>
                  <span className="text-[11px] text-ink-400 font-mono">{items.length}건</span>
                  {isCurrent && (
                    <span className="text-[10px] font-mono font-semibold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      NOW
                    </span>
                  )}
                </div>

                {/* cards */}
                <div className="ml-[47px] pl-4 space-y-3">
                  {items
                    .sort((a, b) => a.date_start.localeCompare(b.date_start))
                    .map(event => (
                      <EventCard key={event.id} event={event} now={now} />
                    ))}
                </div>
              </div>
            );
          })}
        </div>

        {grouped.length === 0 && (
          <div className="text-center py-20 text-ink-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-ink-200" />
            <p className="text-sm">조건에 맞는 이벤트가 없습니다</p>
            <button onClick={resetFilters} className="mt-2 text-xs text-blue-500 hover:underline">
              필터 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
