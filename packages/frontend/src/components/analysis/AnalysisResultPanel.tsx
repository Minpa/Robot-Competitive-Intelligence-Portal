'use client';

import { Building2, Package, Cpu, Lightbulb, Tag, Globe } from 'lucide-react';

interface ParsedEntity {
  name: string;
  type: string;
  confidence: number;
  context: string;
}

interface ParseResult {
  companies: ParsedEntity[];
  products: ParsedEntity[];
  components: ParsedEntity[];
  applications: ParsedEntity[];
  keywords: { term: string; relevance: number }[];
  summary: string;
  detectedLanguage: string;
}

interface AnalysisResultPanelProps {
  result: ParseResult | null;
}

const ENTITY_CONFIG = {
  companies: { label: '회사', icon: Building2, color: 'blue' },
  products: { label: '제품/로봇', icon: Package, color: 'emerald' },
  components: { label: '부품', icon: Cpu, color: 'purple' },
  applications: { label: '적용 사례', icon: Lightbulb, color: 'amber' },
} as const;

export function AnalysisResultPanel({ result }: AnalysisResultPanelProps) {
  if (!result) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
          <Lightbulb className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-slate-400">기사를 입력하고 분석 버튼을 클릭하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 감지 언어 */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Globe className="w-4 h-4" />
        감지 언어: {result.detectedLanguage === 'ko' ? '한국어' : '영어'}
      </div>

      {/* 요약 */}
      {result.summary && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            요약
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{result.summary}</p>
        </div>
      )}

      {/* 엔티티 카드 */}
      {(Object.keys(ENTITY_CONFIG) as (keyof typeof ENTITY_CONFIG)[]).map(key => {
        const entities = result[key];
        if (!entities || entities.length === 0) return null;
        const config = ENTITY_CONFIG[key];
        const Icon = config.icon;

        return (
          <div key={key} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {config.label} ({entities.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {entities.map((e, i) => (
                <span
                  key={i}
                  className={`px-3 py-1.5 bg-${config.color}-500/20 text-${config.color}-300 rounded-lg text-sm border border-${config.color}-500/30`}
                  title={e.context}
                >
                  {e.name}
                  <span className="ml-1.5 text-xs opacity-60">{Math.round(e.confidence * 100)}%</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {/* 키워드 */}
      {result.keywords.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            키워드 ({result.keywords.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.keywords.map((k, i) => (
              <span key={i} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg text-sm border border-cyan-500/30">
                {k.term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
