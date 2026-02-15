'use client';

import Link from 'next/link';
import { 
  Building2, Bot, Brain, Cpu, Cog, GraduationCap, Briefcase,
  ExternalLink, ChevronRight, Package, Wrench, Users
} from 'lucide-react';

interface CompanyCardProps {
  company: {
    id: string;
    name: string;
    country: string;
    category?: string;
    description?: string;
    homepageUrl?: string;
    roles?: string[];
    segment?: string;
    productCount?: number;
    componentCount?: number;
    applicationCaseCount?: number;
    pocCount?: number;
    productionCount?: number;
    talentEstimate?: number;
  };
  onViewProducts?: () => void;
  onViewCases?: () => void;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  robot_oem: { label: '로봇 완제품', color: 'bg-blue-100 text-blue-700', icon: Bot },
  actuator: { label: '액추에이터', color: 'bg-orange-100 text-orange-700', icon: Cog },
  soc: { label: 'SoC/칩', color: 'bg-cyan-100 text-cyan-700', icon: Cpu },
  rfm: { label: 'RFM/AI', color: 'bg-purple-100 text-purple-700', icon: Brain },
  sensor: { label: '센서', color: 'bg-green-100 text-green-700', icon: Wrench },
  research: { label: '연구기관', color: 'bg-yellow-100 text-yellow-700', icon: GraduationCap },
  investor: { label: '투자사', color: 'bg-pink-100 text-pink-700', icon: Briefcase },
  platform: { label: '플랫폼/툴', color: 'bg-indigo-100 text-indigo-700', icon: Package },
};

const COUNTRY_FLAGS: Record<string, string> = {
  'USA': '🇺🇸',
  'China': '🇨🇳',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'UK': '🇬🇧',
  'Switzerland': '🇨🇭',
  'Taiwan': '🇹🇼',
  'Israel': '🇮🇱',
  'Denmark': '🇩🇰',
  'Italy': '🇮🇹',
  'Canada': '🇨🇦',
  'Netherlands': '🇳🇱',
};

// category를 role로 매핑
const categoryToRole = (category?: string): string[] => {
  if (!category) return [];
  switch (category) {
    case 'robot': return ['robot_oem'];
    case 'rfm': return ['rfm'];
    case 'soc': return ['soc'];
    case 'actuator': return ['actuator'];
    default: return [];
  }
};

export function CompanyCard({ company, onViewProducts, onViewCases }: CompanyCardProps) {
  const roles = company.roles?.length ? company.roles : categoryToRole(company.category);
  const flag = COUNTRY_FLAGS[company.country] || '🌐';

  // 기본 아이콘 결정
  const primaryRole = roles[0];
  const PrimaryIcon = primaryRole ? ROLE_CONFIG[primaryRole]?.icon || Building2 : Building2;
  const primaryStyle = primaryRole ? ROLE_CONFIG[primaryRole] : { color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-100">
      {/* 헤더: 로고 + 회사명 + 국가 + 역할 배지 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${primaryStyle.color.split(' ')[0]}`}>
              <PrimaryIcon className={`w-6 h-6 ${primaryStyle.color.split(' ')[1]}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{company.name}</h3>
                <span className="text-lg" title={company.country}>{flag}</span>
              </div>
              {/* 역할 배지 */}
              <div className="flex flex-wrap gap-1 mt-1">
                {roles.slice(0, 2).map((role) => {
                  const config = ROLE_CONFIG[role];
                  if (!config) return null;
                  return (
                    <span
                      key={role}
                      className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${config.color}`}
                    >
                      {config.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <Link href={`/companies/${company.id}`}>
            <ChevronRight className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </Link>
        </div>
      </div>

      {/* 설명 줄 */}
      {company.description && (
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm text-gray-600 line-clamp-2">{company.description}</p>
        </div>
      )}

      {/* 인사이트 줄: 제품 수, 적용 사례, 인력 */}
      <div className="px-4 py-3 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5" title="제품 수">
          <Package className="w-3.5 h-3.5 text-blue-500" />
          <span>
            제품 {company.productCount ?? 0}개
            {(company.componentCount ?? 0) > 0 && (
              <span className="text-gray-400"> (부품 {company.componentCount})</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5" title="적용 사례">
          <Wrench className="w-3.5 h-3.5 text-green-500" />
          <span>
            사례 {company.applicationCaseCount ?? 0}건
            {((company.pocCount ?? 0) > 0 || (company.productionCount ?? 0) > 0) && (
              <span className="text-gray-400">
                {' '}(PoC {company.pocCount ?? 0} / 상용 {company.productionCount ?? 0})
              </span>
            )}
          </span>
        </div>
        {(company.talentEstimate ?? 0) > 0 && (
          <div className="flex items-center gap-1.5" title="관련 인력 추정">
            <Users className="w-3.5 h-3.5 text-purple-500" />
            <span>~{company.talentEstimate}명</span>
          </div>
        )}
      </div>

      {/* 하단 액션 */}
      <div className="px-4 py-3 bg-gray-50 rounded-b-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          {company.homepageUrl && (
            <a
              href={company.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              웹사이트
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/humanoid-robots?companyId=${company.id}`}
            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
            onClick={(e) => e.stopPropagation()}
          >
            제품 보기
          </Link>
          <Link
            href={`/application-cases?companyId=${company.id}`}
            className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
            onClick={(e) => e.stopPropagation()}
          >
            사례 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
