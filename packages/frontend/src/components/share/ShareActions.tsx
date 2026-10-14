'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, Check, FileDown } from 'lucide-react';
import { api } from '@/lib/api';
import { buildTechTrendReportHtml } from '@/lib/tech-trend-report-html';
import type { TechTrendReport } from '@/types/tech-trend-report';

interface Props {
  report?: TechTrendReport;
  titleKo: string;
  titleEn: string;
}

const BTN =
  'inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * 공유 버튼 — 링크 복사(전원) + HTML 다운로드(admin만).
 * admin 판정은 videos/page.tsx와 동일하게 /auth/me 의 role을 사용한다.
 */
export function ShareActions({ report, titleKo, titleEn }: Props) {
  const meQuery = useQuery({ queryKey: ['me'], queryFn: () => api.getMe() });
  const isAdmin = (meQuery.data as { role?: string } | undefined)?.role === 'admin';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('아래 링크를 복사하세요', url);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const html = buildTechTrendReportHtml(report, { pageUrl: window.location.href, titleKo, titleEn });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARGOS_${titleKo.replace(/\s+/g, '')}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="no-print flex items-center gap-2">
      <button type="button" onClick={handleCopy} className={BTN} title="현재 페이지 링크 복사">
        {copied ? <Check className="w-3.5 h-3.5 text-pos" /> : <Link2 className="w-3.5 h-3.5" />}
        {copied ? '복사됨' : '링크 복사'}
      </button>
      {isAdmin && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={!report}
          className={BTN}
          title="단일 HTML 파일로 저장 (관리자)"
        >
          <FileDown className="w-3.5 h-3.5" />
          HTML 다운로드
        </button>
      )}
    </div>
  );
}
