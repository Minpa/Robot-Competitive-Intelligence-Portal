'use client';

import { useWarRoomDomains, useWarRoomDomainRobotFit } from '@/hooks/useWarRoom';
import { OpportunityMatrix } from '@/components/war-room/business/OpportunityMatrix';
import { DomainFitHeatmap } from '@/components/war-room/business/DomainFitHeatmap';
import { EntryOrderList } from '@/components/war-room/business/EntryOrderList';
import { RevenueSimulator } from '@/components/war-room/business/RevenueSimulator';

export default function BusinessPage() {
  const { data: domains, isLoading: domainsLoading } = useWarRoomDomains();
  const { data: fitData, isLoading: fitLoading } = useWarRoomDomainRobotFit();

  return (
    <div className="space-y-4">
      {/* Top row: Opportunity Matrix + Entry Order */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <OpportunityMatrix domains={domains ?? []} isLoading={domainsLoading} />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <EntryOrderList domains={domains ?? []} isLoading={domainsLoading} />
        </div>
      </div>

      {/* Bottom row: Domain Fit Heatmap + Revenue Simulator */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <DomainFitHeatmap data={fitData ?? []} isLoading={fitLoading} />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <RevenueSimulator />
        </div>
      </div>
    </div>
  );
}
