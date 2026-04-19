'use client';

import type { Partner } from '@/types/war-room';
import { Building2, Globe, Star } from 'lucide-react';

interface Props {
  partners: Partner[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  selectedId: string | null;
}

const categoryLabel: Record<string, string> = {
  component: '부품',
  rfm: 'RFM',
  data: '데이터/AI',
  platform: '플랫폼',
  integration: '통합',
};

export function PartnerGrid({ partners, isLoading, onSelect, selectedId }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-ink-100" />
        ))}
      </div>
    );
  }

  if (partners.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 text-center text-ink-500">
        해당 조건의 파트너가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {partners.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={`text-left rounded-lg border p-4 transition-colors ${
            selectedId === p.id
              ? 'border-blue-500 bg-ink-100'
              : 'border-ink-100 bg-white hover:border-ink-200 hover:bg-ink-100'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-semibold text-ink-900 truncate">{p.name}</h3>
            {p.techCapability != null && (
              <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                <Star className="h-3 w-3" />
                {p.techCapability}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-ink-500 mb-1">
            <Building2 className="h-3 w-3" />
            <span>{categoryLabel[p.category] ?? p.category}</span>
            {p.subCategory && (
              <span className="text-ink-500">/ {p.subCategory}</span>
            )}
          </div>

          {p.country && (
            <div className="flex items-center gap-1 text-xs text-ink-500 mb-2">
              <Globe className="h-3 w-3" />
              <span>{p.country}</span>
            </div>
          )}

          <div className="flex gap-3 text-xs mt-auto">
            {p.lgCompatibility != null && (
              <span className="text-ink-500">
                LG 호환: <span className="text-blue-400">{p.lgCompatibility}</span>
              </span>
            )}
            {p.marketShare != null && (
              <span className="text-ink-500">
                점유율: <span className="text-green-400">{p.marketShare}%</span>
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
