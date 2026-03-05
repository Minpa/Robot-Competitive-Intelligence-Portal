'use client';

import { useState } from 'react';
import { useWarRoomPartners, useWarRoomPartnerAdoptions } from '@/hooks/useWarRoom';
import { CategoryTabs } from '@/components/war-room/partners/CategoryTabs';
import { SubCategoryTabs } from '@/components/war-room/partners/SubCategoryTabs';
import { PartnerGrid } from '@/components/war-room/partners/PartnerGrid';
import { CompetitivenessMatrix } from '@/components/war-room/partners/CompetitivenessMatrix';
import { AdoptionHeatmap } from '@/components/war-room/partners/AdoptionHeatmap';
import { ComponentImpactPanel } from '@/components/war-room/partners/ComponentImpactPanel';
import { PartnerCompareTable } from '@/components/war-room/partners/PartnerCompareTable';
import { RoadmapTimeline } from '@/components/war-room/partners/RoadmapTimeline';

export default function PartnersPage() {
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const filters: Record<string, string> = {};
  if (category) filters.category = category;
  if (subCategory) filters.sub_category = subCategory;

  const { data: partners, isLoading: partnersLoading } = useWarRoomPartners(
    Object.keys(filters).length > 0 ? filters : undefined
  );
  const { data: adoptions, isLoading: adoptionsLoading } = useWarRoomPartnerAdoptions();

  const partnerList = partners ?? [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
        <CategoryTabs selected={category} onChange={(c) => { setCategory(c); setSubCategory(''); }} />
        <SubCategoryTabs
          selected={subCategory}
          onChange={setSubCategory}
          visible={category === 'component'}
        />
      </div>

      {/* Top row: Grid + Matrix */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <PartnerGrid
            partners={partnerList}
            isLoading={partnersLoading}
            onSelect={setSelectedPartnerId}
            selectedId={selectedPartnerId}
          />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <CompetitivenessMatrix partners={partnerList} isLoading={partnersLoading} />
        </div>
      </div>

      {/* Middle row: Adoption Heatmap + Component Impact */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <AdoptionHeatmap data={adoptions ?? []} isLoading={adoptionsLoading} />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <ComponentImpactPanel partners={partnerList} isLoading={partnersLoading} />
        </div>
      </div>

      {/* Bottom row: Compare Table + Roadmap */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <PartnerCompareTable partners={partnerList} isLoading={partnersLoading} />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <RoadmapTimeline data={adoptions ?? []} isLoading={adoptionsLoading} />
        </div>
      </div>
    </div>
  );
}
