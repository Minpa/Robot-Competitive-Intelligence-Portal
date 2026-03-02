'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, Sparkles, Sun, Moon, Cpu } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { api } from '@/lib/api';

const TEMPLATES = [
  { id: 'market_overview', name: '시장 현황', desc: '시장 현황 및 트렌드 요약', icon: '📊' },
  { id: 'company_deep_dive', name: '기업 심층 분석', desc: '특정 회사 심층 분석', icon: '🏢' },
  { id: 'tech_components', name: '기술 부품 동향', desc: '기술 부품 동향 분석', icon: '⚙️' },
  { id: 'use_case', name: '적용 사례', desc: '적용 사례 및 시연 분석', icon: '🤖' },
] as const;

export default function ReportsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('market_overview');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [title, setTitle] = useState('HRI 산업 분석 리포트');
  const [subtitle, setSubtitle] = useState('');
  const [includeAI, setIncludeAI] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => api.getCompanies({ page: '1', pageSize: '50' }),
  });

  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set());

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      await api.downloadPPTX({
        template: selectedTemplate,
        theme,
        title,
        subtitle: subtitle || undefined,
        companyIds: selectedTemplate === 'company_deep_dive' ? Array.from(selectedCompanyIds) : undefined,
        includeAICommentary: includeAI,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'PPT 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileDown className="w-7 h-7 text-violet-400" />
              PPT 리포트 생성
            </h1>
            <p className="text-sm text-slate-400 mt-1 ml-10">
              템플릿 선택 → AI 코멘터리 포함 → .pptx 다운로드
            </p>
          </div>

          {/* 템플릿 선택 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <p className="text-sm text-slate-400 mb-3">리포트 템플릿</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    selectedTemplate === t.id
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <p className="text-sm font-medium mt-2">{t.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 제목 + 테마 */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">리포트 제목</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">부제목 (선택)</label>
              <input
                type="text"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder={new Date().toLocaleDateString('ko-KR')}
                className="w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-400">테마</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border cursor-pointer ${
                    theme === 'dark' ? 'bg-slate-700 text-white border-slate-600' : 'bg-slate-800/50 text-slate-500 border-slate-700'
                  }`}
                >
                  <Moon className="w-4 h-4" /> 다크
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border cursor-pointer ${
                    theme === 'light' ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-800/50 text-slate-500 border-slate-700'
                  }`}
                >
                  <Sun className="w-4 h-4" /> 라이트
                </button>
              </div>
            </div>
          </div>

          {/* 기업 선택 (company_deep_dive일 때만) */}
          {selectedTemplate === 'company_deep_dive' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <p className="text-sm text-slate-400 mb-3">분석 대상 기업 (최대 5개)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {(companies?.items || []).map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleCompany(c.id)}
                    disabled={!selectedCompanyIds.has(c.id) && selectedCompanyIds.size >= 5}
                    className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-30 ${
                      selectedCompanyIds.has(c.id)
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              {selectedCompanyIds.size === 0 && (
                <p className="text-xs text-slate-500 mt-2">선택하지 않으면 상위 5개 기업이 자동 선택됩니다.</p>
              )}
            </div>
          )}

          {/* AI 코멘터리 토글 */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-violet-400" />
              <div>
                <p className="text-sm text-slate-300">Claude AI 코멘터리</p>
                <p className="text-xs text-slate-500">AI가 데이터 기반 인사이트를 자동 생성합니다</p>
              </div>
            </div>
            <button
              onClick={() => setIncludeAI(!includeAI)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                includeAI ? 'bg-violet-500' : 'bg-slate-600'
              }`}
              role="switch"
              aria-checked={includeAI}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                includeAI ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* 에러/성공 메시지 */}
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2.5">
              PPT 파일이 다운로드되었습니다.
            </p>
          )}

          {/* 생성 버튼 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !title.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-500 text-white"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'PPT 생성 중... (최대 30초)' : 'PPT 리포트 생성 및 다운로드'}
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
