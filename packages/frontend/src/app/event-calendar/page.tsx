'use client';

import { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Search,
  ExternalLink,
  Calendar,
  MapPin,
  Tag,
  Star,
  Filter,
} from 'lucide-react';
import type { RobotAIEvent, EventType } from '@/types/event-calendar';

const EVENTS: RobotAIEvent[] = [
  {
    id: '1',
    name: 'CES 2026',
    type: '전시',
    date_start: '2026-01-06',
    date_end: '2026-01-09',
    location: 'Las Vegas Convention Center',
    country: '미국',
    url: 'https://www.ces.tech',
    tags: ['소비자전자', '로봇', 'AI', '자율주행'],
    relevance_score: 5,
  },
  {
    id: '2',
    name: 'ICRA 2025',
    type: '학회',
    date_start: '2025-06-01',
    date_end: '2025-06-05',
    location: 'Georgia World Congress Center, Atlanta',
    country: '미국',
    url: 'https://2025.ieee-icra.org',
    tags: ['로보틱스', '자동화', 'IEEE', '논문발표'],
    relevance_score: 5,
  },
  {
    id: '3',
    name: 'EU AI Act 전면 시행',
    type: '정책',
    date_start: '2026-08-02',
    date_end: '2026-08-02',
    location: 'Brussels',
    country: '유럽(EU)',
    url: 'https://artificialintelligenceact.eu',
    tags: ['AI규제', '컴플라이언스', '고위험AI', 'CE마킹'],
    relevance_score: 5,
  },
  {
    id: '4',
    name: 'IREX 2025 (국제로봇전시회)',
    type: '전시',
    date_start: '2025-10-15',
    date_end: '2025-10-18',
    location: 'Tokyo Big Sight',
    country: '일본',
    url: 'https://irex.nikkan.co.jp',
    tags: ['산업로봇', '서비스로봇', '협동로봇', '일본'],
    relevance_score: 5,
  },
  {
    id: '5',
    name: 'IROS 2025',
    type: '학회',
    date_start: '2025-10-19',
    date_end: '2025-10-23',
    location: 'Hangzhou International Expo Center',
    country: '중국',
    url: 'https://iros2025.org',
    tags: ['지능시스템', 'IEEE', '로보틱스', '논문발표'],
    relevance_score: 4,
  },
  {
    id: '6',
    name: 'AWE 2026 (Augmented World Expo)',
    type: '전시',
    date_start: '2026-06-03',
    date_end: '2026-06-05',
    location: 'Santa Clara Convention Center',
    country: '미국',
    url: 'https://www.awexr.com',
    tags: ['XR', 'AR', '로봇인터페이스', '공간컴퓨팅'],
    relevance_score: 4,
  },
  {
    id: '7',
    name: 'CoRL 2025 (Conference on Robot Learning)',
    type: '학회',
    date_start: '2025-11-04',
    date_end: '2025-11-07',
    location: 'Seoul, COEX',
    country: '한국',
    url: 'https://www.corl2025.org',
    tags: ['로봇학습', '강화학습', '모방학습', 'AI'],
    relevance_score: 5,
  },
  {
    id: '8',
    name: '한국 로봇산업 진흥법 시행령 개정',
    type: '정책',
    date_start: '2025-07-01',
    date_end: '2025-07-01',
    location: 'Seoul',
    country: '한국',
    url: 'https://www.law.go.kr',
    tags: ['로봇진흥법', '규제개선', '안전기준', '한국정책'],
    relevance_score: 4,
  },
  {
    id: '9',
    name: 'RoboCup 2026',
    type: '학회',
    date_start: '2026-07-14',
    date_end: '2026-07-20',
    location: 'TBD, Europe',
    country: '유럽(EU)',
    url: 'https://www.robocup.org',
    tags: ['자율로봇', '축구로봇', '교육', '경진대회'],
    relevance_score: 3,
  },
  {
    id: '10',
    name: '2025 로보월드 (ROBOT WORLD)',
    type: '전시',
    date_start: '2025-10-29',
    date_end: '2025-11-01',
    location: 'KINTEX, Goyang',
    country: '한국',
    url: 'https://www.robotworld.or.kr',
    tags: ['산업로봇', '서비스로봇', '부품', '한국전시'],
    relevance_score: 4,
  },
  {
    id: '11',
    name: 'Automate 2026',
    type: '전시',
    date_start: '2026-05-18',
    date_end: '2026-05-21',
    location: 'Huntington Place, Detroit',
    country: '미국',
    url: 'https://www.automateshow.com',
    tags: ['자동화', '산업로봇', '비전', '모션제어'],
    relevance_score: 4,
  },
  {
    id: '12',
    name: 'RSS 2026 (Robotics: Science and Systems)',
    type: '학회',
    date_start: '2026-06-22',
    date_end: '2026-06-26',
    location: 'TBD, USA',
    country: '미국',
    url: 'https://roboticsconference.org',
    tags: ['로보틱스', '기초연구', '논문발표', '학술'],
    relevance_score: 4,
  },
  {
    id: '13',
    name: 'EU Machinery Regulation 전면 적용',
    type: '정책',
    date_start: '2027-01-14',
    date_end: '2027-01-14',
    location: 'Brussels',
    country: '유럽(EU)',
    url: 'https://ec.europa.eu',
    tags: ['기계규정', '안전인증', 'CE마킹', '산업로봇'],
    relevance_score: 5,
  },
  {
    id: '14',
    name: 'Hannover Messe 2026',
    type: '전시',
    date_start: '2026-04-20',
    date_end: '2026-04-24',
    location: 'Hannover Fairground',
    country: '독일',
    url: 'https://www.hannovermesse.de',
    tags: ['산업자동화', '디지털트윈', '로봇', '스마트팩토리'],
    relevance_score: 4,
  },
  {
    id: '15',
    name: 'HRI 2026 (Human-Robot Interaction)',
    type: '학회',
    date_start: '2026-03-09',
    date_end: '2026-03-12',
    location: 'Melbourne Convention Centre',
    country: '호주',
    url: 'https://humanrobotinteraction.org',
    tags: ['인간로봇상호작용', 'HRI', '사회로봇', 'UX'],
    relevance_score: 3,
  },
  {
    id: '16',
    name: '일본 로봇전략 2030 중간점검',
    type: '정책',
    date_start: '2025-09-01',
    date_end: '2025-09-01',
    location: 'Tokyo',
    country: '일본',
    url: 'https://www.meti.go.jp',
    tags: ['일본정책', '로봇전략', '산업정책', 'Society5.0'],
    relevance_score: 3,
  },
  {
    id: '17',
    name: 'ICRA 2026',
    type: '학회',
    date_start: '2026-05-19',
    date_end: '2026-05-23',
    location: 'TBD',
    country: '미국',
    url: 'https://ieee-icra.org',
    tags: ['로보틱스', '자동화', 'IEEE', '논문발표'],
    relevance_score: 5,
  },
  {
    id: '18',
    name: '한국 지능형로봇법 개정안 시행',
    type: '정책',
    date_start: '2026-03-01',
    date_end: '2026-03-01',
    location: 'Seoul',
    country: '한국',
    url: 'https://www.law.go.kr',
    tags: ['지능형로봇', '한국정책', '안전인증', '규제'],
    relevance_score: 4,
  },
  {
    id: '19',
    name: 'World Robot Summit 2025',
    type: '전시',
    date_start: '2025-08-21',
    date_end: '2025-08-23',
    location: 'Aichi Sky Expo',
    country: '일본',
    url: 'https://wrs.nedo.go.jp',
    tags: ['로봇경진대회', '서비스로봇', '재난로봇', '일본'],
    relevance_score: 3,
  },
  {
    id: '20',
    name: '미국 NIST AI 600-1 로봇 안전 프레임워크 발표',
    type: '정책',
    date_start: '2025-12-15',
    date_end: '2025-12-15',
    location: 'Washington D.C.',
    country: '미국',
    url: 'https://www.nist.gov',
    tags: ['NIST', 'AI안전', '로봇안전', '미국규제'],
    relevance_score: 4,
  },
];

const TYPE_OPTIONS: ('전체' | EventType)[] = ['전체', '전시', '학회', '정책'];
const COUNTRY_OPTIONS = ['전체', ...Array.from(new Set(EVENTS.map(e => e.country)))];

const typeStyle = (type: EventType) => {
  switch (type) {
    case '전시':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case '학회':
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case '정책':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }
};

const typeIcon = (type: EventType) => {
  switch (type) {
    case '전시':
      return 'EXPO';
    case '학회':
      return 'CONF';
    case '정책':
      return 'POLICY';
  }
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function EventCalendarContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'전체' | EventType>('전체');
  const [countryFilter, setCountryFilter] = useState('전체');
  const [sortBy, setSortBy] = useState<'date' | 'relevance'>('date');

  const filtered = useMemo(() => {
    const list = EVENTS.filter(e => {
      const matchSearch =
        searchQuery === '' ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === '전체' || e.type === typeFilter;
      const matchCountry = countryFilter === '전체' || e.country === countryFilter;
      return matchSearch && matchType && matchCountry;
    });
    if (sortBy === 'relevance') {
      list.sort((a, b) => b.relevance_score - a.relevance_score);
    } else {
      list.sort((a, b) => a.date_start.localeCompare(b.date_start));
    }
    return list;
  }, [searchQuery, typeFilter, countryFilter, sortBy]);

  const stats = useMemo(() => ({
    total: EVENTS.length,
    expo: EVENTS.filter(e => e.type === '전시').length,
    conf: EVENTS.filter(e => e.type === '학회').length,
    policy: EVENTS.filter(e => e.type === '정책').length,
  }), []);

  return (
    <div className="px-4 py-6 space-y-6 max-w-full overflow-hidden">
      <PageHeader
        module="INTELLIGENCE FEED V4.2"
        titleKo="이벤트 캘린더"
        titleEn="EVENT CALENDAR"
        description="로봇·AI 글로벌 전시, 학술대회, 정책·규제 이벤트 일정"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-ink-200 p-4 text-center">
          <div className="text-2xl font-bold text-ink-900">{stats.total}</div>
          <div className="text-xs text-ink-400 mt-1">전체 이벤트</div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{stats.expo}</div>
          <div className="text-xs text-ink-400 mt-1">전시 EXPO</div>
        </div>
        <div className="bg-white rounded-xl border border-purple-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-500">{stats.conf}</div>
          <div className="text-xs text-ink-400 mt-1">학회 CONF</div>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">{stats.policy}</div>
          <div className="text-xs text-ink-400 mt-1">정책 POLICY</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            placeholder="이벤트명, 태그, 장소로 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as '전체' | EventType)}
          className="bg-white border border-ink-200 text-ink-700 text-sm rounded-lg px-3 py-2 focus:ring-info focus:border-info"
        >
          {TYPE_OPTIONS.map(t => (
            <option key={t} value={t}>
              {t === '전체' ? '유형: 전체' : t}
            </option>
          ))}
        </select>
        <select
          value={countryFilter}
          onChange={e => setCountryFilter(e.target.value)}
          className="bg-white border border-ink-200 text-ink-700 text-sm rounded-lg px-3 py-2 focus:ring-info focus:border-info"
        >
          {COUNTRY_OPTIONS.map(c => (
            <option key={c} value={c}>
              {c === '전체' ? '국가: 전체' : c}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'date' | 'relevance')}
          className="bg-white border border-ink-200 text-ink-700 text-sm rounded-lg px-3 py-2 focus:ring-info focus:border-info"
        >
          <option value="date">날짜순</option>
          <option value="relevance">중요도순</option>
        </select>
      </div>

      {/* Results Count */}
      <div className="flex items-center gap-2 text-xs text-ink-400">
        <Filter className="w-3 h-3" />
        {filtered.length}건 검색됨
      </div>

      {/* Event List */}
      <div className="space-y-3">
        {filtered.map(event => (
          <div
            key={event.id}
            className="bg-white rounded-xl border border-ink-200 p-4 hover:border-info/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-mono font-semibold ${typeStyle(event.type)}`}
                  >
                    {typeIcon(event.type)}
                  </span>
                  <span className="text-xs text-ink-400">{event.country}</span>
                  <div className="flex items-center gap-0.5 ml-auto">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < event.relevance_score
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-ink-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-ink-900 mb-2">
                  {event.name}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(event.date_start)}
                    {event.date_start !== event.date_end &&
                      ` – ${formatDate(event.date_end)}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {event.tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full bg-info-soft/50 text-ink-500"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <a
                href={event.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                링크
              </a>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-ink-400">
          검색 결과가 없습니다
        </div>
      )}
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
