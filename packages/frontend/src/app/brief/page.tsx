'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { FileText, Download, Sparkles } from 'lucide-react';

export default function BriefPage() {
  const [briefData, setBriefData] = useState<any>(null);

  const generateMutation = useMutation({
    mutationFn: () => api.generateMonthlyBrief(),
    onSuccess: (data) => setBriefData(data),
  });

  const handleDownloadPptx = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/insights/monthly-brief`, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (!res.ok) throw new Error('PPTX 다운로드 실패');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'monthly-brief.pptx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('PPTX 다운로드에 실패했습니다.');
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <PageHeader
          titleKo="월간 브리프"
          titleEn="MONTHLY BRIEF"
          description="이번 달 휴머노이드 로봇 산업 동향을 자동으로 생성합니다."
        />

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                브리프 생성
              </>
            )}
          </button>

          {briefData?.hasPptx && (
            <button
              onClick={handleDownloadPptx}
              className="px-6 py-3 bg-white text-ink-900 rounded-lg font-medium hover:bg-ink-100 transition-all flex items-center gap-2 border border-ink-200"
            >
              <Download className="w-4 h-4" />
              PPTX 다운로드
            </button>
          )}
        </div>

        {briefData && (
          <div className="bg-white border border-ink-200 rounded-xl p-8">
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-ink-700 leading-relaxed" dangerouslySetInnerHTML={{
                __html: briefData.markdown
                  ?.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-ink-900 mt-6 mb-3">$1</h1>')
                  .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-ink-900 mt-5 mb-2">$1</h2>')
                  .replace(/^- (.+)$/gm, '<li class="ml-4 text-ink-700">$1</li>')
                  .replace(/\*\*(.+?)\*\*/g, '<strong class="text-ink-900">$1</strong>')
                  .replace(/\n\n/g, '<br/><br/>')
                  || '',
              }} />
            </div>
            <div className="mt-6 pt-4 border-t border-ink-200 text-xs text-ink-400">
              생성: {briefData.generatedAt ? new Date(briefData.generatedAt).toLocaleString('ko-KR') : ''}
            </div>
          </div>
        )}

        {!briefData && !generateMutation.isPending && (
          <div className="bg-white border border-ink-200 rounded-xl p-12 text-center">
            <FileText className="w-12 h-12 text-ink-400 mx-auto mb-4" />
            <p className="text-ink-500">브리프 생성 버튼을 클릭하면 이번 달 동향 보고서가 자동으로 생성됩니다.</p>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
