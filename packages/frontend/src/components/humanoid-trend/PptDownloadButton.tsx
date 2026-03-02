'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Presentation, Loader2 } from 'lucide-react';

export default function PptDownloadButton() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => api.getMe() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isViewer = user?.role === 'viewer';
  const canExport = user?.role === 'admin' || user?.role === 'analyst' || user?.email?.toLowerCase() === 'somewhere010@gmail.com';

  if (!canExport) {
    if (isViewer) {
      return (
        <p className="text-xs text-gray-400">리포트 다운로드는 Analyst 이상 권한이 필요합니다</p>
      );
    }
    return null;
  }

  const handleDownload = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await api.exportHumanoidTrendPpt({ theme: 'dark' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HRI_HumanoidTrend_${new Date().toISOString().slice(0, 10)}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('PPT 생성에 실패했습니다. 다시 시도해주세요.');
      console.error('PPT download error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
        PPT 다운로드
      </button>
      {error && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-400">{error}</span>
          <button onClick={handleDownload} className="text-xs text-violet-400 hover:underline">재시도</button>
        </div>
      )}
    </div>
  );
}
