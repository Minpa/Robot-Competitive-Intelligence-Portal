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
} from 'lucide-react';
import { PageHeader, ArgosCard, SectionTitle, PrimaryButton } from '@/components/layout/PageHeader';

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
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-8">
        <PageHeader
          module="ADMINISTRATION MODULE V4.2"
          titleKo="관리"
          titleEn="ACCESS CONTROL"
          description="Manage organizational hierarchy, data collection, and individual access keys."
        />

        {/* System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: '회사',       labelEn: 'Companies', value: summary?.totalCompanies || 0 },
            { label: '제품',       labelEn: 'Products',  value: summary?.totalProducts  || 0 },
            { label: '키워드',     labelEn: 'Keywords',  value: summary?.totalKeywords  || 0 },
            { label: '수집 데이터', labelEn: 'Collected', value: results.reduce((sum, r) => sum + r.count, 0) },
          ].map((stat) => (
            <ArgosCard key={stat.labelEn} className="p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-argos-faint">{stat.labelEn}</div>
              <div className="text-[12px] font-semibold text-argos-muted mt-1">{stat.label}</div>
              <div className="text-[28px] font-extrabold text-argos-ink mt-2 leading-none">{stat.value}</div>
            </ArgosCard>
          ))}
        </div>

        {/* Public Data Collection */}
        <ArgosCard>
          <div className="p-6 border-b border-argos-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-argos-chip rounded-md flex items-center justify-center">
                <Database className="w-4 h-4 text-argos-blue" />
              </div>
              <h2 className="text-[15px] font-bold text-argos-ink">공개 데이터 수집 <span className="text-argos-faint font-semibold">/ Public Data Collection</span></h2>
            </div>
            <div className="flex items-center gap-3">
              {lastCollected && (
                <span className="text-[11px] text-argos-muted">
                  마지막: {lastCollected.toLocaleTimeString('ko-KR')}
                </span>
              )}
              <button
                onClick={collectAll}
                disabled={isCollecting}
                className="flex items-center gap-2 px-4 py-2 bg-argos-navy hover:bg-argos-navyDark text-argos-ink text-[12px] font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${collectingSource === 'all' ? 'animate-spin' : ''}`} />
                {collectingSource === 'all' ? '수집 중...' : '전체 수집'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-argos-border">
            {sources.map(({ key, name, icon: Icon, desc }) => {
              const result = getSourceResult(key);
              const isLoading = collectingSource === key || collectingSource === 'all';

              return (
                <div key={key} className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-argos-muted" />
                      <span className="text-[13px] font-semibold text-argos-ink">{name}</span>
                    </div>
                    <button
                      onClick={() => collectSingle(key)}
                      disabled={isLoading}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-argos-bg border border-argos-border rounded hover:bg-argos-chipAlt hover:border-argos-blue hover:text-argos-blue disabled:opacity-50 text-argos-inkSoft transition-colors"
                    >
                      {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : '수집'}
                    </button>
                  </div>
                  <p className="text-[11px] text-argos-muted mb-3">{desc}</p>
                  {result && (
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-3.5 h-3.5 text-argos-success" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-argos-danger" />
                      )}
                      <span className={`text-[12px] font-semibold ${result.success ? 'text-argos-successInk' : 'text-argos-dangerInk'}`}>
                        {result.success ? `${result.count}건` : '실패'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ArgosCard>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[
            { href: '/admin/robots',     title: '로봇 관리',  subtitle: '추가/수정/삭제',                        icon: Settings },
            { href: '/companies',        title: '회사 관리',  subtitle: `${summary?.totalCompanies || 0}개 등록`, icon: Users },
            { href: '/admin/components', title: '부품 관리',  subtitle: '추가/수정/삭제',                        icon: Database },
            { href: '/terms',            title: '이용약관',   subtitle: '데이터 정책 확인',                      icon: Shield },
          ].map(({ href, title, subtitle, icon: Icon }) => (
            <Link key={href} href={href} className="group">
              <ArgosCard className="p-5 hover:border-argos-blue transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-argos-chip flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-argos-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-bold text-argos-ink">{title}</h3>
                    <p className="text-[11px] text-argos-muted">{subtitle}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-argos-faint group-hover:text-argos-blue transition" />
                </div>
              </ArgosCard>
            </Link>
          ))}
        </div>

        {/* Export Section */}
        <div className="bg-argos-surface border border-argos-border rounded-xl shadow-argos-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-argos-ink">
            <Database className="w-5 h-5 text-argos-muted" />
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
              className="p-4 bg-argos-bg border border-argos-border rounded-lg hover:bg-argos-chipAlt hover:border-argos-blue text-left transition-colors"
            >
              <p className="font-medium text-argos-ink">회사 데이터</p>
              <p className="text-sm text-argos-muted">CSV 형식으로 다운로드</p>
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
              className="p-4 bg-argos-bg border border-argos-border rounded-lg hover:bg-argos-chipAlt hover:border-argos-blue text-left transition-colors"
            >
              <p className="font-medium text-argos-ink">제품 데이터</p>
              <p className="text-sm text-argos-muted">스펙 포함 CSV 다운로드</p>
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
              className="p-4 bg-argos-bg border border-argos-border rounded-lg hover:bg-argos-chipAlt hover:border-argos-blue text-left transition-colors"
            >
              <p className="font-medium text-argos-ink">기사 데이터</p>
              <p className="text-sm text-argos-muted">CSV 형식으로 다운로드</p>
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-[15px] font-bold text-argos-ink mb-3">Excel로 기사 업로드</h3>
            <p className="text-sm text-argos-muted mb-4">첫 번째 시트에서 데이터를 읽어서 기사 데이터를 생성/업데이트합니다.</p>
            <div className="flex flex-col md:flex-row gap-3 items-start">
              <div className="flex-1">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-argos-ink file:bg-argos-bg file:border file:border-argos-border file:px-3 file:py-2 file:rounded-lg file:text-argos-ink file:bg-argos-bgAlt"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="updateExisting"
                  type="checkbox"
                  checked={importUpdateExisting}
                  onChange={(e) => setImportUpdateExisting(e.target.checked)}
                  className="h-4 w-4 text-blue-600 bg-argos-bg border-argos-border rounded"
                />
                <label htmlFor="updateExisting" className="text-sm text-argos-inkSoft">
                  기존 기사 업데이트 (중복 URL이 있는 경우)
                </label>
              </div>
              <button
                disabled={!importFile || importing}
                onClick={handleImportExcel}
                className="px-4 py-2 bg-emerald-600 text-argos-ink rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {importing ? '업로드 중...' : '업로드'}
              </button>
            </div>
            {importResult && (
              <div className="mt-4 rounded-lg bg-argos-bg border border-argos-border p-4">
                {importResult.error ? (
                  <p className="text-sm text-red-400">에러: {importResult.error}</p>
                ) : (
                  <div className="text-sm text-argos-ink space-y-1">
                    <p>생성: {importResult.created}</p>
                    <p>업데이트: {importResult.updated}</p>
                    <p>스킵: {importResult.skipped}</p>
                    {importResult.errors?.length > 0 && (
                      <details className="text-xs text-argos-muted">
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

        {/* AI API 사용량 (슈퍼 관리자만) */}
        {isSuperAdmin && (
          <div className="bg-argos-surface border border-argos-border rounded-xl shadow-argos-card">
            <div className="p-6 border-b border-argos-border flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h2 className="text-[15px] font-bold text-argos-ink">AI API 사용량</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 월간 비용 한도 */}
              {(() => {
                const totalCost = (aiUsageSummary?.summary || []).reduce((sum, s) => sum + s.totalCostUsd, 0);
                const limitUsd = 7.0;
                const pct = Math.min(100, (totalCost / limitUsd) * 100);
                const isNearLimit = pct >= 80;
                const isOverLimit = pct >= 100;
                return (
                  <div className={`p-4 rounded-xl border ${isOverLimit ? 'bg-red-500/10 border-red-500/30' : isNearLimit ? 'bg-amber-500/10 border-amber-500/30' : 'bg-argos-bg border-argos-border'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-argos-inkSoft">이번 달 사용량</span>
                      <span className={`text-sm font-medium ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ${totalCost.toFixed(4)} / ${limitUsd.toFixed(2)} (≈₩10,000)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-argos-bgAlt rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {isOverLimit && (
                      <p className="text-xs text-red-400 mt-2">한도 초과 — AI 검색이 차단됩니다. 다음 달에 자동 초기화됩니다.</p>
                    )}
                  </div>
                );
              })()}
              {/* Provider별 요약 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(aiUsageSummary?.summary || []).map((s) => (
                  <div key={s.provider} className="bg-argos-bg border border-argos-border rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="w-5 h-5 text-violet-400" />
                      <h3 className="font-semibold text-argos-ink">
                        {s.provider === 'chatgpt' ? 'OpenAI (ChatGPT)' : 'Anthropic (Claude)'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-argos-muted">총 호출</p>
                        <p className="text-lg font-bold text-argos-ink">{s.totalCalls}회</p>
                      </div>
                      <div>
                        <p className="text-xs text-argos-muted">예상 비용</p>
                        <p className="text-lg font-bold text-emerald-400">${s.totalCostUsd.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-argos-muted">입력 토큰</p>
                        <p className="text-sm text-argos-inkSoft">{s.totalInputTokens.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-argos-muted">출력 토큰</p>
                        <p className="text-sm text-argos-inkSoft">{s.totalOutputTokens.toLocaleString()}</p>
                      </div>
                      {s.webSearchCalls > 0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-argos-muted">웹 검색 호출</p>
                          <p className="text-sm text-blue-400">{s.webSearchCalls}회</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!aiUsageSummary?.summary || aiUsageSummary.summary.length === 0) && (
                  <div className="col-span-2 text-center py-8 text-argos-faint">
                    아직 AI API 호출 기록이 없습니다.
                  </div>
                )}
              </div>

              {/* 최근 호출 로그 */}
              {aiUsageLogs?.logs && aiUsageLogs.logs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-argos-muted mb-3">최근 호출 로그</h3>
                  <div className="border border-argos-border rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-argos-bg text-xs font-medium text-argos-muted grid grid-cols-12 gap-2">
                      <div className="col-span-2">Provider</div>
                      <div className="col-span-2">모델</div>
                      <div className="col-span-1">웹검색</div>
                      <div className="col-span-2">토큰 (In/Out)</div>
                      <div className="col-span-2">비용</div>
                      <div className="col-span-3">시간</div>
                    </div>
                    {aiUsageLogs.logs.map((log) => (
                      <div key={log.id} className="px-4 py-2 grid grid-cols-12 gap-2 text-sm border-t border-argos-border hover:bg-argos-bg">
                        <div className="col-span-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            log.provider === 'chatgpt' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {log.provider === 'chatgpt' ? 'OpenAI' : 'Claude'}
                          </span>
                        </div>
                        <div className="col-span-2 text-argos-inkSoft truncate text-xs">{log.model}</div>
                        <div className="col-span-1">{log.webSearch ? '🌐' : '—'}</div>
                        <div className="col-span-2 text-argos-muted text-xs">{log.inputTokens}/{log.outputTokens}</div>
                        <div className="col-span-2 text-emerald-400 text-xs">${Number(log.estimatedCostUsd).toFixed(4)}</div>
                        <div className="col-span-3 text-argos-faint text-xs">
                          {new Date(log.createdAt).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 허용 이메일 관리 (슈퍼 관리자만) */}
        {isSuperAdmin && (
          <div className="bg-argos-surface border border-argos-border rounded-xl shadow-argos-card">
            <div className="p-6 border-b border-argos-border flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <h2 className="text-[15px] font-bold text-argos-ink">회원가입 허용 이메일 관리</h2>
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
                  className="flex-1 px-3 py-2 bg-argos-bg border border-argos-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-argos-ink placeholder:text-argos-faint"
                />
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="메모 (선택)"
                  className="w-48 px-3 py-2 bg-argos-bg border border-argos-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-argos-ink placeholder:text-argos-faint"
                />
                <button
                  onClick={handleAddEmail}
                  disabled={addEmailMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-argos-ink rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>

              {/* 허용된 이메일 목록 */}
              <div className="border border-argos-border rounded-lg divide-y divide-argos-border">
                <div className="px-4 py-2 bg-argos-bg text-sm font-medium text-argos-muted grid grid-cols-12 gap-4">
                  <div className="col-span-5">이메일</div>
                  <div className="col-span-4">메모</div>
                  <div className="col-span-2">등록일</div>
                  <div className="col-span-1"></div>
                </div>
                
                {/* 슈퍼 관리자 (삭제 불가) */}
                <div className="px-4 py-3 grid grid-cols-12 gap-4 items-center bg-indigo-500/10">
                  <div className="col-span-5 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium text-argos-ink">somewhere010@gmail.com</span>
                    <span className="px-2 py-0.5 text-xs bg-indigo-600 text-argos-ink rounded">슈퍼 관리자</span>
                  </div>
                  <div className="col-span-4 text-argos-faint text-sm">-</div>
                  <div className="col-span-2 text-argos-faint text-sm">-</div>
                  <div className="col-span-1"></div>
                </div>

                {/* DB에서 가져온 이메일 목록 */}
                {allowedEmailsData?.emails
                  ?.filter(e => e.email !== 'somewhere010@gmail.com')
                  .map((item) => (
                    <div key={item.id} className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-argos-bg transition-colors">
                      <div className="col-span-5 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-argos-faint" />
                        <span className="text-argos-ink">{item.email}</span>
                      </div>
                      <div className="col-span-4 text-argos-muted text-sm">{item.note || '-'}</div>
                      <div className="col-span-2 text-argos-muted text-sm">
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
                  <div className="px-4 py-6 text-center text-argos-faint text-sm">
                    추가된 이메일이 없습니다.
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm text-argos-faint">
                * 위 목록에 등록된 이메일만 회원가입이 가능합니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
