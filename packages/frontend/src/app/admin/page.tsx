'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Settings,
  Database,
  BookOpen,
  Github,
  Scale,
  ScrollText,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  Users,
  Shield,
  Mail,
  Plus,
  Trash2,
  UserPlus,
  DollarSign,
  Cpu,
  Key,
  TrendingDown,
  Zap,
  BarChart3,
  Calendar,
  Globe,
} from 'lucide-react';

interface CollectionResult {
  source: string;
  success: boolean;
  count: number;
  items: any[];
  error?: string;
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectingSource, setCollectingSource] = useState<string | null>(null);
  const [results, setResults] = useState<CollectionResult[]>([]);
  const [lastCollected, setLastCollected] = useState<Date | null>(null);
  
  const [newEmail, setNewEmail] = useState('');
  const [newNote, setNewNote] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importUpdateExisting, setImportUpdateExisting] = useState(true);

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await api.getMe();
      } catch (err) {
        return null;
      }
    },
  });

  const { data: allowedEmailsData, refetch: refetchEmails } = useQuery({
    queryKey: ['allowed-emails'],
    queryFn: () => api.getAllowedEmails(),
  });

  const isSuperAdmin = currentUser?.email?.toLowerCase() === 'somewhere010@gmail.com';

  const { data: aiUsageSummary } = useQuery({
    queryKey: ['ai-usage-summary'],
    queryFn: () => api.getAiUsageSummary(),
    enabled: isSuperAdmin,
  });

  const { data: aiUsageLogs } = useQuery({
    queryKey: ['ai-usage-logs'],
    queryFn: () => api.getAiUsageLogs(20),
    enabled: isSuperAdmin,
  });

  const { data: claudeCredit, refetch: refetchClaudeCredit } = useQuery({
    queryKey: ['claude-credit'],
    queryFn: () => api.getClaudeCreditInfo(),
    enabled: isSuperAdmin,
  });

  const addEmailMutation = useMutation({
    mutationFn: ({ email, note }: { email: string; note?: string }) => 
      api.addAllowedEmail(email, note),
    onSuccess: (data) => {
      if (data.success) {
        setEmailSuccess(data.message);
        setNewEmail('');
        setNewNote('');
        refetchEmails();
      } else {
        setEmailError(data.message);
      }
    },
    onError: (error: Error) => {
      setEmailError(error.message);
    },
  });

  const removeEmailMutation = useMutation({
    mutationFn: (email: string) => api.removeAllowedEmail(email),
    onSuccess: (data) => {
      if (data.success) {
        setEmailSuccess(data.message);
        refetchEmails();
      } else {
        setEmailError(data.message);
      }
    },
    onError: (error: Error) => {
      setEmailError(error.message);
    },
  });

  const handleAddEmail = () => {
    setEmailError(null);
    setEmailSuccess(null);
    if (!newEmail.trim()) {
      setEmailError('이메일을 입력해주세요.');
      return;
    }
    addEmailMutation.mutate({ email: newEmail.trim(), note: newNote.trim() || undefined });
  };

  const handleRemoveEmail = (email: string) => {
    setEmailError(null);
    setEmailSuccess(null);
    if (confirm(`${email} 이메일을 삭제하시겠습니까?`)) {
      removeEmailMutation.mutate(email);
    }
  };

  const handleImportExcel = async () => {
    if (!importFile) return;
    setImportResult(null);
    setImporting(true);
    try {
      const result = await api.importArticlesFromExcel(importFile, importUpdateExisting);
      setImportResult(result);
    } catch (error) {
      setImportResult({ error: (error as Error).message });
    } finally {
      setImporting(false);
    }
  };

  const collectAll = async () => {
    setIsCollecting(true);
    setCollectingSource('all');
    try {
      const result = await api.collectPublicData();
      setResults(result.results);
      setLastCollected(new Date());
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    } catch (error) {
      console.error('Collection failed:', error);
    } finally {
      setIsCollecting(false);
      setCollectingSource(null);
    }
  };

  const collectSingle = async (source: string) => {
    setCollectingSource(source);
    try {
      let result;
      switch (source) {
        case 'arxiv': result = await api.collectArxiv(); break;
        case 'github': result = await api.collectGitHub(); break;
        case 'sec_edgar': result = await api.collectSecEdgar(); break;
        case 'patent': result = await api.collectPatents(); break;
        default: return;
      }
      setResults(prev => [...prev.filter(r => r.source !== source), result]);
      setLastCollected(new Date());
    } catch (error) {
      console.error(`Collection failed for ${source}:`, error);
    } finally {
      setCollectingSource(null);
    }
  };

  const getSourceResult = (source: string) => results.find(r => r.source === source);

  const sources = [
    { key: 'arxiv', name: 'arXiv', icon: BookOpen, color: 'red', desc: '로봇/AI 논문' },
    { key: 'github', name: 'GitHub', icon: Github, color: 'gray', desc: '오픈소스 리포' },
    { key: 'sec_edgar', name: 'SEC EDGAR', icon: Scale, color: 'blue', desc: '미국 공시' },
    { key: 'patent', name: 'USPTO', icon: ScrollText, color: 'amber', desc: '특허 데이터' },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">관리</h1>
          <p className="text-slate-400">공개 데이터 수집 및 시스템 관리</p>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-400">회사</p>
            <p className="text-2xl font-bold text-white">{summary?.totalCompanies || 0}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-400">제품</p>
            <p className="text-2xl font-bold text-white">{summary?.totalProducts || 0}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-400">키워드</p>
            <p className="text-2xl font-bold text-white">{summary?.totalKeywords || 0}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-400">수집 데이터</p>
            <p className="text-2xl font-bold text-white">{results.reduce((sum, r) => sum + r.count, 0)}</p>
          </div>
        </div>

        {/* Public Data Collection */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">공개 데이터 수집</h2>
            </div>
            <div className="flex items-center gap-3">
              {lastCollected && (
                <span className="text-sm text-slate-400">
                  마지막: {lastCollected.toLocaleTimeString('ko-KR')}
                </span>
              )}
              <button
                onClick={collectAll}
                disabled={isCollecting}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${collectingSource === 'all' ? 'animate-spin' : ''}`} />
                {collectingSource === 'all' ? '수집 중...' : '전체 수집'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {sources.map(({ key, name, icon: Icon, desc }) => {
              const result = getSourceResult(key);
              const isLoading = collectingSource === key || collectingSource === 'all';

              return (
                <div key={key} className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span className="font-medium text-white">{name}</span>
                    </div>
                    <button
                      onClick={() => collectSingle(key)}
                      disabled={isLoading}
                      className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 disabled:opacity-50 text-slate-300 transition-colors"
                    >
                      {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : '수집'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{desc}</p>
                  {result && (
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-sm ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.success ? `${result.count}건` : '실패'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/admin/robots" className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Settings className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">로봇 관리</h3>
                <p className="text-sm text-slate-400">추가/수정/삭제</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 ml-auto" />
            </div>
          </Link>

          <Link href="/companies" className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-500/20">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">회사 관리</h3>
                <p className="text-sm text-slate-400">{summary?.totalCompanies || 0}개 등록</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 ml-auto" />
            </div>
          </Link>

          <Link href="/admin/components" className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/20">
                <Database className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">부품 관리</h3>
                <p className="text-sm text-slate-400">추가/수정/삭제</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 ml-auto" />
            </div>
          </Link>

          <Link href="/terms" className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/20">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">이용약관</h3>
                <p className="text-sm text-slate-400">데이터 정책 확인</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-500 ml-auto" />
            </div>
          </Link>
        </div>

        {/* Export Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Database className="w-5 h-5 text-slate-400" />
            데이터 내보내기
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={async () => {
                const data = await api.exportCompanies('csv');
                const blob = new Blob([data], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'companies.csv';
                a.click();
              }}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 text-left transition-colors"
            >
              <p className="font-medium text-white">회사 데이터</p>
              <p className="text-sm text-slate-400">CSV 형식으로 다운로드</p>
            </button>
            <button
              onClick={async () => {
                const data = await api.exportProducts('csv', true);
                const blob = new Blob([data], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'products.csv';
                a.click();
              }}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 text-left transition-colors"
            >
              <p className="font-medium text-white">제품 데이터</p>
              <p className="text-sm text-slate-400">스펙 포함 CSV 다운로드</p>
            </button>
            <button
              onClick={async () => {
                const data = await api.exportArticles('csv');
                const blob = new Blob([data], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'articles.csv';
                a.click();
              }}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 text-left transition-colors"
            >
              <p className="font-medium text-white">기사 데이터</p>
              <p className="text-sm text-slate-400">CSV 형식으로 다운로드</p>
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-3">Excel로 기사 업로드</h3>
            <p className="text-sm text-slate-400 mb-4">첫 번째 시트에서 데이터를 읽어서 기사 데이터를 생성/업데이트합니다.</p>
            <div className="flex flex-col md:flex-row gap-3 items-start">
              <div className="flex-1">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-slate-100 file:bg-slate-800 file:border file:border-slate-700 file:px-3 file:py-2 file:rounded-lg file:text-slate-100 file:bg-slate-700"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="updateExisting"
                  type="checkbox"
                  checked={importUpdateExisting}
                  onChange={(e) => setImportUpdateExisting(e.target.checked)}
                  className="h-4 w-4 text-blue-600 bg-slate-800 border-slate-600 rounded"
                />
                <label htmlFor="updateExisting" className="text-sm text-slate-300">
                  기존 기사 업데이트 (중복 URL이 있는 경우)
                </label>
              </div>
              <button
                disabled={!importFile || importing}
                onClick={handleImportExcel}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {importing ? '업로드 중...' : '업로드'}
              </button>
            </div>
            {importResult && (
              <div className="mt-4 rounded-lg bg-slate-800/50 border border-slate-700 p-4">
                {importResult.error ? (
                  <p className="text-sm text-red-400">에러: {importResult.error}</p>
                ) : (
                  <div className="text-sm text-slate-200 space-y-1">
                    <p>생성: {importResult.created}</p>
                    <p>업데이트: {importResult.updated}</p>
                    <p>스킵: {importResult.skipped}</p>
                    {importResult.errors?.length > 0 && (
                      <details className="text-xs text-slate-400">
                        <summary>에러 상세 ({importResult.errors.length})</summary>
                        <ul className="list-disc ml-5 mt-2">
                          {importResult.errors.map((err: any, idx: number) => (
                            <li key={idx}>{`행 ${err.row}: ${err.error}`}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Claude API 크레딧 & 토큰 사용량 (슈퍼 관리자만) */}
        {isSuperAdmin && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-semibold text-white">Claude API 크레딧 & 토큰</h2>
              </div>
              <button
                onClick={() => refetchClaudeCredit()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                새로고침
              </button>
            </div>

            <div className="p-6 space-y-6">
              {claudeCredit ? (
                <>
                  {/* API 키 상태 + 남은 크레딧 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* API 키 상태 */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Key className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400">API 키 상태</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {claudeCredit.apiKeyValid ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`font-semibold ${claudeCredit.apiKeyValid ? 'text-emerald-400' : 'text-red-400'}`}>
                          {claudeCredit.apiKeyValid ? '활성' : '미설정'}
                        </span>
                      </div>
                      {claudeCredit.apiKeyPrefix && (
                        <p className="text-xs text-slate-500 mt-1 font-mono">{claudeCredit.apiKeyPrefix}</p>
                      )}
                    </div>

                    {/* 남은 크레딧 */}
                    <div className={`border rounded-xl p-4 ${
                      claudeCredit.remainingPct <= 0 ? 'bg-red-500/10 border-red-500/30' :
                      claudeCredit.remainingPct <= 20 ? 'bg-amber-500/10 border-amber-500/30' :
                      'bg-emerald-500/10 border-emerald-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400">남은 크레딧</span>
                      </div>
                      <p className={`text-2xl font-bold ${
                        claudeCredit.remainingPct <= 0 ? 'text-red-400' :
                        claudeCredit.remainingPct <= 20 ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>
                        ${claudeCredit.remainingUsd.toFixed(4)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        월 한도 ${claudeCredit.monthlyLimitUsd.toFixed(2)} 중 {claudeCredit.remainingPct.toFixed(1)}% 남음
                      </p>
                    </div>

                    {/* 이번 달 사용량 */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400">이번 달 사용</span>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        ${claudeCredit.currentMonthUsageUsd.toFixed(4)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {claudeCredit.claudeStats.totalCalls}회 호출
                      </p>
                    </div>
                  </div>

                  {/* 사용량 프로그레스 바 */}
                  {(() => {
                    const usedPct = Math.min(100, 100 - claudeCredit.remainingPct);
                    const isNearLimit = usedPct >= 80;
                    const isOverLimit = usedPct >= 100;
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-slate-400">월간 사용량 진행률</span>
                          <span className={`text-xs font-medium ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-slate-300'}`}>
                            ${claudeCredit.currentMonthUsageUsd.toFixed(4)} / ${claudeCredit.monthlyLimitUsd.toFixed(2)} (≈₩10,000)
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-orange-500'}`}
                            style={{ width: `${usedPct}%` }}
                          />
                        </div>
                        {isOverLimit && (
                          <p className="text-xs text-red-400 mt-1.5">한도 초과 — AI 검색이 차단됩니다. 다음 달에 자동 초기화됩니다.</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* 토큰 & 비용 상세 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-500">입력 토큰</p>
                      <p className="text-lg font-bold text-blue-400">{claudeCredit.claudeStats.totalInputTokens.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">${claudeCredit.claudeStats.inputCostUsd.toFixed(4)}</p>
                    </div>
                    <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-500">출력 토큰</p>
                      <p className="text-lg font-bold text-purple-400">{claudeCredit.claudeStats.totalOutputTokens.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">${claudeCredit.claudeStats.outputCostUsd.toFixed(4)}</p>
                    </div>
                    <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-500">총 토큰</p>
                      <p className="text-lg font-bold text-white">
                        {(claudeCredit.claudeStats.totalInputTokens + claudeCredit.claudeStats.totalOutputTokens).toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500">${claudeCredit.claudeStats.totalCostUsd.toFixed(4)}</p>
                    </div>
                    <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-500" />
                        <p className="text-xs text-slate-500">웹 검색</p>
                      </div>
                      <p className="text-lg font-bold text-cyan-400">{claudeCredit.claudeStats.webSearchCalls}회</p>
                      <p className="text-xs text-slate-500">${claudeCredit.claudeStats.webSearchCostUsd.toFixed(4)}</p>
                    </div>
                  </div>

                  {/* 모델별 사용량 */}
                  {claudeCredit.modelBreakdown.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                        <Cpu className="w-4 h-4" />
                        모델별 사용량
                      </h3>
                      <div className="border border-slate-700 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-slate-800/50 text-xs font-medium text-slate-400 grid grid-cols-12 gap-2">
                          <div className="col-span-4">모델</div>
                          <div className="col-span-2">호출</div>
                          <div className="col-span-2">입력 토큰</div>
                          <div className="col-span-2">출력 토큰</div>
                          <div className="col-span-2">비용</div>
                        </div>
                        {claudeCredit.modelBreakdown.map((m) => (
                          <div key={m.model} className="px-4 py-2 grid grid-cols-12 gap-2 text-sm border-t border-slate-700/50 hover:bg-slate-800/30">
                            <div className="col-span-4 text-orange-400 text-xs font-mono truncate">{m.model}</div>
                            <div className="col-span-2 text-white">{m.calls}회</div>
                            <div className="col-span-2 text-blue-400 text-xs">{m.inputTokens.toLocaleString()}</div>
                            <div className="col-span-2 text-purple-400 text-xs">{m.outputTokens.toLocaleString()}</div>
                            <div className="col-span-2 text-emerald-400 text-xs">${m.costUsd.toFixed(4)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 일별 사용량 */}
                  {claudeCredit.dailyUsage.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        일별 사용량
                      </h3>
                      <div className="border border-slate-700 rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-slate-800/50 text-xs font-medium text-slate-400 grid grid-cols-12 gap-2">
                          <div className="col-span-3">날짜</div>
                          <div className="col-span-2">호출</div>
                          <div className="col-span-2">입력 토큰</div>
                          <div className="col-span-2">출력 토큰</div>
                          <div className="col-span-3">비용</div>
                        </div>
                        {claudeCredit.dailyUsage.map((d) => {
                          const barWidth = claudeCredit.monthlyLimitUsd > 0
                            ? Math.min(100, (d.costUsd / claudeCredit.monthlyLimitUsd) * 100 * 10)
                            : 0;
                          return (
                            <div key={d.date} className="px-4 py-2 grid grid-cols-12 gap-2 text-sm border-t border-slate-700/50 hover:bg-slate-800/30">
                              <div className="col-span-3 text-slate-300 text-xs">{d.date}</div>
                              <div className="col-span-2 text-white text-xs">{d.calls}회</div>
                              <div className="col-span-2 text-blue-400 text-xs">{d.inputTokens.toLocaleString()}</div>
                              <div className="col-span-2 text-purple-400 text-xs">{d.outputTokens.toLocaleString()}</div>
                              <div className="col-span-3 flex items-center gap-2">
                                <span className="text-emerald-400 text-xs">${d.costUsd.toFixed(4)}</span>
                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-500/60 rounded-full" style={{ width: `${barWidth}%` }} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Claude API 크레딧 정보를 불러오는 중...
                </div>
              )}
            </div>
          </div>
        )}

        {/* OpenAI 포함 전체 AI API 사용량 (슈퍼 관리자만) */}
        {isSuperAdmin && aiUsageSummary?.summary && aiUsageSummary.summary.some(s => s.provider === 'chatgpt') && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="p-6 border-b border-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">OpenAI (ChatGPT) 사용량</h2>
            </div>
            <div className="p-6">
              {aiUsageSummary.summary.filter(s => s.provider === 'chatgpt').map((s) => (
                <div key={s.provider} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-500">총 호출</p>
                    <p className="text-lg font-bold text-white">{s.totalCalls}회</p>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-500">예상 비용</p>
                    <p className="text-lg font-bold text-emerald-400">${s.totalCostUsd.toFixed(4)}</p>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-500">입력 토큰</p>
                    <p className="text-lg font-bold text-blue-400">{s.totalInputTokens.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-500">출력 토큰</p>
                    <p className="text-lg font-bold text-purple-400">{s.totalOutputTokens.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최근 API 호출 로그 (슈퍼 관리자만) */}
        {isSuperAdmin && aiUsageLogs?.logs && aiUsageLogs.logs.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="p-6 border-b border-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-white">최근 API 호출 로그</h2>
            </div>
            <div className="p-6">
              <div className="border border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-800/50 text-xs font-medium text-slate-400 grid grid-cols-12 gap-2">
                  <div className="col-span-2">Provider</div>
                  <div className="col-span-2">모델</div>
                  <div className="col-span-1">웹검색</div>
                  <div className="col-span-2">토큰 (In/Out)</div>
                  <div className="col-span-2">비용</div>
                  <div className="col-span-3">시간</div>
                </div>
                {aiUsageLogs.logs.map((log) => (
                  <div key={log.id} className="px-4 py-2 grid grid-cols-12 gap-2 text-sm border-t border-slate-700/50 hover:bg-slate-800/30">
                    <div className="col-span-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        log.provider === 'chatgpt' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {log.provider === 'chatgpt' ? 'OpenAI' : 'Claude'}
                      </span>
                    </div>
                    <div className="col-span-2 text-slate-300 truncate text-xs">{log.model}</div>
                    <div className="col-span-1">{log.webSearch ? '🌐' : '—'}</div>
                    <div className="col-span-2 text-slate-400 text-xs">{log.inputTokens}/{log.outputTokens}</div>
                    <div className="col-span-2 text-emerald-400 text-xs">${Number(log.estimatedCostUsd).toFixed(4)}</div>
                    <div className="col-span-3 text-slate-500 text-xs">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 허용 이메일 관리 (슈퍼 관리자만) */}
        {isSuperAdmin && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="p-6 border-b border-slate-800 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">회원가입 허용 이메일 관리</h2>
            </div>
            
            <div className="p-6">
              {/* 알림 메시지 */}
              {emailError && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {emailError}
                </div>
              )}
              {emailSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
                  {emailSuccess}
                </div>
              )}

              {/* 이메일 추가 폼 */}
              <div className="flex gap-3 mb-6">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="이메일 주소"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500"
                />
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="메모 (선택)"
                  className="w-48 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-slate-500"
                />
                <button
                  onClick={handleAddEmail}
                  disabled={addEmailMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>

              {/* 허용된 이메일 목록 */}
              <div className="border border-slate-700 rounded-lg divide-y divide-slate-700">
                <div className="px-4 py-2 bg-slate-800/50 text-sm font-medium text-slate-400 grid grid-cols-12 gap-4">
                  <div className="col-span-5">이메일</div>
                  <div className="col-span-4">메모</div>
                  <div className="col-span-2">등록일</div>
                  <div className="col-span-1"></div>
                </div>
                
                {/* 슈퍼 관리자 (삭제 불가) */}
                <div className="px-4 py-3 grid grid-cols-12 gap-4 items-center bg-indigo-500/10">
                  <div className="col-span-5 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium text-white">somewhere010@gmail.com</span>
                    <span className="px-2 py-0.5 text-xs bg-indigo-600 text-white rounded">슈퍼 관리자</span>
                  </div>
                  <div className="col-span-4 text-slate-500 text-sm">-</div>
                  <div className="col-span-2 text-slate-500 text-sm">-</div>
                  <div className="col-span-1"></div>
                </div>

                {/* DB에서 가져온 이메일 목록 */}
                {allowedEmailsData?.emails
                  ?.filter(e => e.email !== 'somewhere010@gmail.com')
                  .map((item) => (
                    <div key={item.id} className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-slate-800/50 transition-colors">
                      <div className="col-span-5 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="text-white">{item.email}</span>
                      </div>
                      <div className="col-span-4 text-slate-400 text-sm">{item.note || '-'}</div>
                      <div className="col-span-2 text-slate-400 text-sm">
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => handleRemoveEmail(item.email)}
                          disabled={removeEmailMutation.isPending}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                {(!allowedEmailsData?.emails || allowedEmailsData.emails.filter(e => e.email !== 'somewhere010@gmail.com').length === 0) && (
                  <div className="px-4 py-6 text-center text-slate-500 text-sm">
                    추가된 이메일이 없습니다.
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm text-slate-500">
                * 위 목록에 등록된 이메일만 회원가입이 가능합니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
