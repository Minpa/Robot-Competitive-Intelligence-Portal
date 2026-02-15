'use client';

import Link from 'next/link';
import { 
  Building2, Bot, Brain, Cpu, Cog, GraduationCap, Briefcase,
  ExternalLink, ChevronRight, Package, Wrench, Users
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  type?: string;
}

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
    products?: Product[];
  };
}

const ROLE_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; icon: any }> = {
  robot_oem: { label: '로봇 완제품', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', icon: Bot },
  robot: { label: '로봇 완제품', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', icon: Bot },
  robotics: { label: '로봇 완제품', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', icon: Bot },
  automotive: { label: '자동차/로봇', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', icon: Bot },
  electronics: { label: '전자/로봇', bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400', icon: Cpu },
  actuator: { label: '액추에이터', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400', icon: Cog },
  soc: { label: 'SoC/칩', bgColor: 'bg-cyan-500/20', textColor: 'text-cyan-400', icon: Cpu },
  rfm: { label: 'RFM/AI', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400', icon: Brain },
  sensor: { label: '센서', bgColor: 'bg-green-500/20', textColor: 'text-green-400', icon: Wrench },
  research: { label: '연구기관', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400', icon: GraduationCap },
  investor: { label: '투자사', bgColor: 'bg-pink-500/20', textColor: 'text-pink-400', icon: Briefcase },
  platform: { label: '플랫폼/툴', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400', icon: Package },
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
  return [category];
};

export function CompanyCard({ company }: CompanyCardProps) {
  const roles = company.roles?.length ? company.roles : categoryToRole(company.category);
  const flag = COUNTRY_FLAGS[company.country] || '🌐';

  // 기본 아이콘 결정
  const primaryRole = roles[0];
  const config = primaryRole ? ROLE_CONFIG[primaryRole] : null;
  const PrimaryIcon = config?.icon || Building2;

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-slate-900/50">
      {/* 헤더: 로고 + 회사명 + 국가 + 역할 배지 */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${config?.bgColor || 'bg-slate-700'}`}>
              <PrimaryIcon className={`w-6 h-6 ${config?.textColor || 'text-slate-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">{company.name}</h3>
                <span className="text-lg" title={company.country}>{flag}</span>
              </div>
              {/* 역할 배지 */}
              <div className="flex flex-wrap gap-1 mt-1">
                {roles.slice(0, 2).map((role) => {
                  const roleConfig = ROLE_CONFIG[role];
                  if (!roleConfig) return null;
                  return (
                    <span
                      key={role}
                      className={`px-2 py-0.5 text-[10px] font-medium rounded ${roleConfig.bgColor} ${roleConfig.textColor}`}
                    >
                      {roleConfig.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
          <Link href={`/companies/${company.id}`}>
            <ChevronRight className="w-5 h-5 text-slate-500 hover:text-slate-300 transition-colors" />
          </Link>
        </div>
      </div>

      {/* 설명 줄 */}
      {company.description && (
        <div className="px-4 py-3 border-b border-slate-700/50">
          <p className="text-sm text-slate-400 line-clamp-2">{company.description}</p>
        </div>
      )}

      {/* 제품 목록 */}
      {company.products && company.products.length > 0 && (
        <div className="px-4 py-3 border-b border-slate-700/50">
          <div className="text-xs text-slate-500 mb-2">주요 제품</div>
          <div className="flex flex-wrap gap-2">
            {company.products.slice(0, 4).map((product) => (
              <Link
                key={product.id}
                href={`/humanoid-robots/${product.id}`}
                className="px-2 py-1 text-xs bg-slate-700/50 text-slate-300 rounded hover:bg-slate-600/50 transition-colors flex items-center gap-1"
              >
                <Bot className="w-3 h-3" />
                {product.name}
              </Link>
            ))}
            {company.products.length > 4 && (
              <span className="px-2 py-1 text-xs text-slate-500">
                +{company.products.length - 4}개
              </span>
            )}
          </div>
        </div>
      )}

      {/* 인사이트 줄: 제품 수, 적용 사례, 인력 */}
      <div className="px-4 py-3 flex flex-wrap gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5" title="제품 수">
          <Package className="w-3.5 h-3.5 text-blue-400" />
          <span>
            제품 {company.productCount ?? company.products?.length ?? 0}개
            {(company.componentCount ?? 0) > 0 && (
              <span className="text-slate-500"> (부품 {company.componentCount})</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5" title="적용 사례">
          <Wrench className="w-3.5 h-3.5 text-green-400" />
          <span>
            사례 {company.applicationCaseCount ?? 0}건
            {((company.pocCount ?? 0) > 0 || (company.productionCount ?? 0) > 0) && (
              <span className="text-slate-500">
                {' '}(PoC {company.pocCount ?? 0} / 상용 {company.productionCount ?? 0})
              </span>
            )}
          </span>
        </div>
        {(company.talentEstimate ?? 0) > 0 && (
          <div className="flex items-center gap-1.5" title="관련 인력 추정">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>~{company.talentEstimate}명</span>
          </div>
        )}
      </div>

      {/* 하단 액션 */}
      <div className="px-4 py-3 bg-slate-800/30 rounded-b-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          {company.homepageUrl && (
            <a
              href={company.homepageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              웹사이트
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/humanoid-robots?company=${encodeURIComponent(company.name)}`}
            className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            제품 보기
          </Link>
          <Link
            href={`/application-cases?company=${encodeURIComponent(company.name)}`}
            className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            사례 보기
          </Link>
        </div>
      </div>
    </div>
  );
}
