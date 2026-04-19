'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Search, ExternalLink, Calendar, Building2, Tag } from 'lucide-react';

interface NationalProject {
  id: string;
  title: string;
  organization: string;
  period: string;
  budget: string;
  category: string;
  status: '진행중' | '완료' | '예정';
  url: string;
  keywords: string[];
}

const PROJECTS: NationalProject[] = [
  {
    id: '1',
    title: '지능형 이족보행 로봇 핵심기술 개발',
    organization: '산업통상자원부',
    period: '2023.04 – 2027.12',
    budget: '450억원',
    category: '로봇·자율주행',
    status: '진행중',
    url: 'https://www.ntis.go.kr',
    keywords: ['이족보행', '휴머노이드', '보행제어'],
  },
  {
    id: '2',
    title: '제조 현장 협업 로봇 지능화 기술 개발',
    organization: '과학기술정보통신부',
    period: '2022.06 – 2026.05',
    budget: '320억원',
    category: '로봇·제조',
    status: '진행중',
    url: 'https://www.ntis.go.kr',
    keywords: ['협동로봇', '제조', 'AI'],
  },
  {
    id: '3',
    title: '차세대 서비스 로봇 자율이동 플랫폼 개발',
    organization: '산업통상자원부',
    period: '2024.01 – 2028.12',
    budget: '280억원',
    category: '로봇·서비스',
    status: '진행중',
    url: 'https://www.ntis.go.kr',
    keywords: ['서비스로봇', '자율이동', 'SLAM'],
  },
  {
    id: '4',
    title: '로봇 AI 반도체 및 엣지 컴퓨팅 기술 개발',
    organization: '과학기술정보통신부',
    period: '2023.09 – 2027.08',
    budget: '200억원',
    category: '반도체·AI',
    status: '진행중',
    url: 'https://www.ntis.go.kr',
    keywords: ['AI칩', '엣지컴퓨팅', '로봇반도체'],
  },
  {
    id: '5',
    title: '재난대응 특수목적 로봇 시스템 개발',
    organization: '행정안전부',
    period: '2021.05 – 2025.04',
    budget: '150억원',
    category: '로봇·안전',
    status: '진행중',
    url: 'https://www.ntis.go.kr',
    keywords: ['재난로봇', '특수로봇', '원격조종'],
  },
  {
    id: '6',
    title: '고령자 돌봄 생활지원 로봇 개발',
    organization: '보건복지부',
    period: '2024.03 – 2027.02',
    budget: '180억원',
    category: '로봇·헬스케어',
    status: '진행중',
    url: 'https://www.ntis.go.kr',
    keywords: ['돌봄로봇', '고령자', '생활지원'],
  },
  {
    id: '7',
    title: '로봇 손(Hand) 정밀 조작 기술 개발',
    organization: '산업통상자원부',
    period: '2025.01 – 2029.12',
    budget: '350억원',
    category: '로봇·부품',
    status: '예정',
    url: 'https://www.ntis.go.kr',
    keywords: ['로봇핸드', '매니퓰레이션', '정밀조작'],
  },
  {
    id: '8',
    title: '인간-로봇 상호작용 안전 기술 표준 개발',
    organization: '국가기술표준원',
    period: '2022.01 – 2024.12',
    budget: '45억원',
    category: '표준·안전',
    status: '완료',
    url: 'https://www.ntis.go.kr',
    keywords: ['HRI', '안전표준', '인증'],
  },
];

const CATEGORIES = ['전체', ...Array.from(new Set(PROJECTS.map(p => p.category)))];
const STATUS_OPTIONS = ['전체', '진행중', '완료', '예정'];

const EXTERNAL_LINKS = [
  { name: 'NTIS (국가과학기술지식정보서비스)', url: 'https://www.ntis.go.kr', desc: '국가 R&D 과제 통합 검색' },
  { name: 'IITP (정보통신기획평가원)', url: 'https://www.iitp.kr', desc: 'ICT R&D 과제 정보' },
  { name: 'KIAT (한국산업기술진흥원)', url: 'https://www.kiat.or.kr', desc: '산업기술 R&D 정보' },
  { name: 'KIRIA (한국로봇산업진흥원)', url: 'https://www.kiria.org', desc: '로봇산업 정책·과제 정보' },
  { name: 'NRF (한국연구재단)', url: 'https://www.nrf.re.kr', desc: '기초·원천 연구과제' },
];

function NationalProjectsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState('전체');

  const filtered = PROJECTS.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.title.includes(searchQuery) ||
      p.keywords.some(k => k.includes(searchQuery)) ||
      p.organization.includes(searchQuery);
    const matchesCategory = categoryFilter === '전체' || p.category === categoryFilter;
    const matchesStatus = statusFilter === '전체' || p.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const statusColor = (status: string) => {
    if (status === '진행중') return 'bg-green-500/15 text-green-400 border-green-500/30';
    if (status === '완료') return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  return (
    <div className="px-4 py-6 space-y-6 max-w-full overflow-hidden">
      <PageHeader module="INTELLIGENCE FEED V4.2" titleKo="국내 국책과제 검색" titleEn="NATIONAL R&D PROJECTS" description="로봇 관련 국가 R&D 과제 현황 및 주요 기관 링크" />

      {/* External Links */}
      <div className="bg-white rounded-xl border border-ink-200 p-4">
        <h2 className="text-sm font-semibold text-ink-700 mb-3">주요 검색 사이트</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {EXTERNAL_LINKS.map(link => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 p-3 rounded-lg bg-white border border-ink-200 hover:border-info/30 hover:bg-ink-100 transition-colors group"
            >
              <ExternalLink className="w-4 h-4 text-ink-400 group-hover:text-blue-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-medium text-ink-700 group-hover:text-blue-400">{link.name}</div>
                <div className="text-xs text-ink-400 mt-0.5">{link.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            placeholder="과제명, 키워드, 기관명으로 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-white border border-ink-200 text-ink-700 text-sm rounded-lg px-3 py-2 focus:ring-info focus:border-info"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c === '전체' ? '분야: 전체' : c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-ink-200 text-ink-700 text-sm rounded-lg px-3 py-2 focus:ring-info focus:border-info"
        >
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === '전체' ? '상태: 전체' : s}</option>)}
        </select>
      </div>

      {/* Results */}
      <div className="text-xs text-ink-400 mb-2">{filtered.length}건 검색됨</div>
      <div className="space-y-3">
        {filtered.map(project => (
          <div
            key={project.id}
            className="bg-white rounded-xl border border-ink-200 p-4 hover:border-info/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${statusColor(project.status)}`}>
                    {project.status}
                  </span>
                  <span className="text-xs text-ink-400">{project.category}</span>
                </div>
                <h3 className="text-sm font-semibold text-ink-900 mb-2">{project.title}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {project.organization}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {project.period}
                  </span>
                  <span>예산: {project.budget}</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {project.keywords.map(kw => (
                    <span
                      key={kw}
                      className="flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full bg-info-soft/50 text-ink-500"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                상세
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

export default function NationalProjectsPage() {
  return (
    <AuthGuard>
      <NationalProjectsContent />
    </AuthGuard>
  );
}
