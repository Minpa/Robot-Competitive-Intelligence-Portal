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
        </div>

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
