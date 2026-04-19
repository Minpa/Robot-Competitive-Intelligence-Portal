'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useWarRoomContext } from './WarRoomContext';

export function ExportPptButton() {
  const { selectedRobotId } = useWarRoomContext();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!selectedRobotId || loading) return;

    setLoading(true);
    try {
      // Fetch all data in parallel
      const [dashboard, overlay, alertsRaw] = await Promise.all([
        api.getWarRoomDashboard(selectedRobotId),
        api.getWarRoomCompetitiveOverlay(selectedRobotId),
        api.getWarRoomAlerts(),
      ]);

      const alerts = Array.isArray(alertsRaw) ? alertsRaw : (alertsRaw as any)?.alerts ?? [];

      const { generateOneSheet } = await import('@/lib/ppt-export');
      await generateOneSheet({ dashboard, overlay, alerts });
    } catch (err) {
      console.error('PPT export failed:', err);
      alert('PPT 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading || !selectedRobotId}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-200 text-ink-700 text-sm hover:bg-ink-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>생성 중...</span>
        </>
      ) : (
        <>
          <FileDown className="w-4 h-4" />
          <span>PPT 내보내기</span>
        </>
      )}
    </button>
  );
}
