'use client';

import { useState } from 'react';
import {
  Building2,
  Bot,
  Cpu,
  Briefcase,
  Tag,
  Globe,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Link2,
  Plus,
  Lightbulb,
  Save,
} from 'lucide-react';
import type {
  AnalysisResult,
  EntityItem,
  KeywordItem,
  LinkCandidate,
  SourceReference,
} from '@/types/insight-pipeline';

interface InsightPanelProps {
  result: AnalysisResult | null;
  sourceType: 'manual' | 'ai-agent';
  onSave: (saveRequest: any) => void;
  onLinkEntity: (entityName: string, linkedEntityId: string) => void;
  isSaving: boolean;
  saveSuccess: boolean;
  isDuplicate: boolean;
}

const ENTITY_GROUPS = [
  { key: 'companies' as const, label: '회사/기관', icon: Building2, color: 'blue' },
  { key: 'products' as const, label: '제품·로봇', icon: Bot, color: 'emerald' },
  { key: 'components' as const, label: '부품', icon: Cpu, color: 'purple' },
  { key: 'applications' as const, label: '적용 사례', icon: Briefcase, color: 'amber' },
  { key: 'keywords' as const, label: '키워드', icon: Tag, color: 'cyan' },
] as const;

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-slate-400';
  return <span className={`ml-1.5 text-xs ${color}`}>{pct}%</span>;
}

function EntityCard({
  entity,
  groupKey,
  linkCandidates,
  onLinkEntity,
}: {
  entity: EntityItem;
  groupKey: string;
  linkCandidates: LinkCandidate[];
  onLinkEntity: (entityName: string, linkedEntityId: string) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-slate-200 truncate" title={entity.context}>
          {entity.name}
        </span>
        <ConfidenceBadge confidence={entity.confidence} />
        {entity.linkedEntityId && (
          <Link2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 relative">
        <button
          className="px-2 py-1 text-xs rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors cursor-pointer"
          title="DB에 추가"
        >
          <Plus className="w-3 h-3" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center gap-1 cursor-pointer"
            title="기존 엔티티와 연결"
          >
            <Link2 className="w-3 h-3" />
            <ChevronDown className="w-3 h-3" />
          </button>
          {showDropdown && linkCandidates.length > 0 && (
            <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden">
              {linkCandidates.map((candidate) => (
                <button
                  key={candidate.entityId}
                  onClick={() => {
                    onLinkEntity(entity.name, candidate.entityId);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="text-slate-200 truncate">{candidate.entityName}</span>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">
                    {Math.round(candidate.similarityScore * 100)}%
                    {candidate.isAutoRecommended && ' ★'}
                  </span>
                </button>
              ))}
            </div>
          )}
          {showDropdown && linkCandidates.length === 0 && (
            <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3">
              <p className="text-xs text-slate-400">연결 후보가 없습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function InsightPanel({
  result,
  sourceType,
  onSave,
  onLinkEntity,
  isSaving,
  saveSuccess,
  isDuplicate,
}: InsightPanelProps) {
  // Empty state
  if (!result) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
          <Lightbulb className="w-8 h-8 text-slate-600" />
        </div>
        <p className="text-slate-400">분석 결과가 여기에 표시됩니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Duplicate warning */}
      {isDuplicate && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>이미 저장된 기사와 중복됩니다. 저장이 제한됩니다.</span>
        </div>
      )}

      {/* Save success */}
      {saveSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>DB에 성공적으로 저장되었습니다.</span>
        </div>
      )}

      {/* Summary section */}
      {result.summary && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            요약
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
            {result.summary}
          </p>
        </div>
      )}

      {/* Entity groups */}
      {ENTITY_GROUPS.map((group) => {
        if (group.key === 'keywords') {
          const keywords = result.entities.keywords;
          if (!keywords || keywords.length === 0) return null;
          const Icon = group.icon;
          return (
            <div key={group.key} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Icon className="w-4 h-4 text-cyan-400" />
                {group.label} ({keywords.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg text-sm border border-cyan-500/30"
                  >
                    {kw.term}
                    <span className="ml-1.5 text-xs opacity-60">
                      {Math.round(kw.relevance * 100)}%
                    </span>
                  </span>
                ))}
              </div>
            </div>
          );
        }

        const entities = result.entities[group.key];
        if (!entities || entities.length === 0) return null;
        const Icon = group.icon;

        return (
          <div key={group.key} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Icon className="w-4 h-4" />
              {group.label} ({entities.length})
            </h3>
            <div className="space-y-2">
              {entities.map((entity, i) => (
                <EntityCard
                  key={i}
                  entity={entity}
                  groupKey={group.key}
                  linkCandidates={result.linkCandidates[entity.name] ?? []}
                  onLinkEntity={onLinkEntity}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Source info (AI agent mode only) */}
      {sourceType === 'ai-agent' && result.sources && result.sources.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            참고 출처 ({result.sources.length})
          </h3>
          <ul className="space-y-2">
            {result.sources.map((src, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-400"
              >
                <Globe className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                <span>
                  <span className="text-slate-300">{src.domain}</span>
                  {' — '}
                  {src.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={() => onSave(result)}
        disabled={isSaving || isDuplicate}
        className="w-full py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white"
      >
        <Save className="w-4 h-4" />
        {isSaving ? '저장 중...' : 'DB에 저장'}
      </button>
    </div>
  );
}
