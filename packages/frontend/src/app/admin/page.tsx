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
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{stat.labelEn}</div>
              <div className="text-[12px] font-semibold text-ink-500 mt-1">{stat.label}</div>
              <div className="text-[28px] font-extrabold text-ink-900 mt-2 leading-none">{stat.value}</div>
            </ArgosCard>
          ))}
        </div>

        {/* Public Data Collection */}
        <ArgosCard>
          <div className="p-6 border-b border-ink-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-info-soft rounded-md flex items-center justify-center">
                <Database className="w-4 h-4 text-info" />
              </div>
              <h2 className="text-[15px] font-bold text-ink-900">공개 데이터 수집 <span className="text-ink-400 font-semibold">/ Public Data Collection</span></h2>
            </div>
            <div className="flex items-center gap-3">
              {lastCollected && (
                <span className="text-[11px] text-ink-500">
                  마지막: {lastCollected.toLocaleTimeString('ko-KR')}
                </span>
              )}
              <button
                onClick={collectAll}
                disabled={isCollecting}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-soft text-ink-900 text-[12px] font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${collectingSource === 'all' ? 'animate-spin' : ''}`} />
                {collectingSource === 'all' ? '수집 중...' : '전체 수집'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-ink-200">
            {sources.map(({ key, name, icon: Icon, desc }) => {
              const result = getSourceResult(key);
              const isLoading = collectingSource === key || collectingSource === 'all';

              return (
                <div key={key} className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-ink-500" />
                      <span className="text-[13px] font-semibold text-ink-900">{name}</span>
                    </div>
                    <button
                      onClick={() => collectSingle(key)}
                      disabled={isLoading}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-paper border border-ink-200 rounded hover:bg-info-soft hover:border-info hover:text-info disabled:opacity-50 text-ink-700 transition-colors"
                    >
                      {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : '수집'}
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-500 mb-3">{desc}</p>
                  {result && (
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-3.5 h-3.5 text-pos" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-neg" />
                      )}
                      <span className={`text-[12px] font-semibold ${result.success ? 'text-pos' : 'text-neg'}`}>
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
              <ArgosCard className="p-5 hover:border-info transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-info-soft flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-info" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-bold text-ink-900">{title}</h3>
                    <p className="text-[11px] text-ink-500">{subtitle}</p>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-ink-400 group-hover:text-info transition" />
                </div>
              </ArgosCard>
            </Link>
          ))}
        </div>

        {/* 평가 기준 */}
        <div className="bg-white border border-ink-200 rounded-xl shadow-report">
          <div className="p-6 border-b border-ink-200 flex items-center gap-2">
            <Scale className="w-5 h-5 text-info" />
            <h2 className="text-[15px] font-bold text-ink-900">로봇 평가 기준</h2>
            <span className="text-xs text-ink-500 ml-2">
              사이트에 등록된 모든 휴머노이드 로봇에 적용되는 점수 산정 항목
            </span>
          </div>

          {/* PoC 점수 (하드웨어 경쟁력, 1-10) */}
          <div className="p-6 border-b border-ink-200">
            <h3 className="text-[14px] font-bold text-ink-900 mb-1">
              PoC 점수 — 하드웨어 경쟁력 (1~10점)
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              실물 스펙과 PoC/배치 현황을 기반으로 각 로봇의 물리적 경쟁력을 평가합니다.
            </p>
            <div className="border border-ink-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-paper text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                <div className="col-span-2">항목</div>
                <div className="col-span-1 text-center">범위</div>
                <div className="col-span-5">계산식</div>
                <div className="col-span-4">설명</div>
              </div>
              {[
                {
                  name: '가반하중 점수',
                  key: 'payloadScore',
                  range: '1-10',
                  formula: '(payload_kg / 20) × 9 + 1',
                  desc: '로봇이 운반 가능한 최대 중량. 20kg을 만점 기준으로 선형 스케일링.',
                },
                {
                  name: '작동 시간 점수',
                  key: 'operationTimeScore',
                  range: '1-10',
                  formula: '(operation_hours / 8) × 9 + 1',
                  desc: '1회 충전/가동 기준 연속 작동 시간. 8시간(1근무)을 만점 기준으로 선형 스케일링.',
                },
                {
                  name: '손가락 DOF 점수',
                  key: 'fingerDofScore',
                  range: '1-10',
                  formula: '(hand_dof / 24) × 9 + 1',
                  desc: '양손 손가락 자유도 합계. 사람 손 수준(24 DOF)을 만점 기준으로 선형 스케일링.',
                },
                {
                  name: '폼팩터 점수',
                  key: 'formFactorScore',
                  range: '1-10',
                  formula: 'height×0.3 + dof×0.3 + finger×0.2 + bipedal×0.2',
                  desc: '인간 유사성 종합 지표. 170cm 기준 높이 유사도, 전체 DOF(40 기준), 손가락 수(5 기준), 2족 보행 보너스를 합산.',
                },
                {
                  name: 'PoC 배치 점수',
                  key: 'pocDeploymentScore',
                  range: '1-10',
                  formula: 'Σ(concept=1, pilot=3, production=5)',
                  desc: '등록된 적용 사례의 배치 단계별 가중 합. 실제 상용 배치가 많을수록 높음.',
                },
                {
                  name: '비용 효율 점수',
                  key: 'costEfficiencyScore',
                  range: '1-10',
                  formula: '(payload × op_time) / price_usd, 정규화',
                  desc: '단위 가격당 작업 생산성. 가격 정보가 없으면 기본값 5점으로 추정 처리.',
                },
              ].map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-12 gap-3 px-4 py-3 text-[12px] border-t border-ink-200 hover:bg-ink-100 transition-colors"
                >
                  <div className="col-span-2 font-bold text-ink-900">{row.name}</div>
                  <div className="col-span-1 text-center text-info font-mono">{row.range}</div>
                  <div className="col-span-5 font-mono text-[11px] text-ink-700">{row.formula}</div>
                  <div className="col-span-4 text-ink-500 leading-relaxed">{row.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RFM 점수 (파운데이션 모델 경쟁력, 1-5) */}
          <div className="p-6 border-b border-ink-200">
            <h3 className="text-[14px] font-bold text-ink-900 mb-1">
              RFM 점수 — 로봇 파운데이션 모델 경쟁력 (1~5점)
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              로봇이 탑재·활용하는 AI/파운데이션 모델의 범용성과 성숙도를 평가합니다.
            </p>
            <div className="border border-ink-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-paper text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                <div className="col-span-2">항목</div>
                <div className="col-span-1 text-center">범위</div>
                <div className="col-span-5">계산식</div>
                <div className="col-span-4">설명</div>
              </div>
              {[
                {
                  name: '범용성 점수',
                  key: 'generalityScore',
                  range: '1-5',
                  formula: 'distinct(application_cases.taskType)',
                  desc: '등록된 적용 사례의 서로 다른 작업 유형 수. 여러 태스크를 수행할수록 높음. 최대 5.',
                },
                {
                  name: '실제 환경 데이터',
                  key: 'realWorldDataScore',
                  range: '1-5',
                  formula: 'keywordTier(real-world, deployment, …)',
                  desc: '실제 필드 데이터·배치 사례 관련 키워드 매칭 수를 티어로 환산. 시뮬레이션이 아닌 실환경 학습 수준.',
                },
                {
                  name: '엣지 추론 점수',
                  key: 'edgeInferenceScore',
                  range: '1-5',
                  formula: 'TOPS 티어: ≤10/≤50/≤200/≤500/>500 → 1~5',
                  desc: '온보드 AI 가속기의 연산 성능(TOPS). 클라우드 의존 없이 로컬 추론 가능한 능력.',
                },
                {
                  name: '멀티로봇 협업',
                  key: 'multiRobotCollabScore',
                  range: '1-5',
                  formula: 'keywordTier(multi-robot, fleet, swarm, …)',
                  desc: '여러 로봇이 함께 작업하는 기능(플릿 관리, 분산 제어)의 언급 수준.',
                },
                {
                  name: '오픈소스 생태계',
                  key: 'openSourceScore',
                  range: '1-5',
                  formula: '키워드 수: 0→1, 1→2, 2→3, 3→4, ≥4→5',
                  desc: 'SDK·GitHub·ROS 등 개발자 친화 요소의 개수. 생태계 확장 가능성.',
                },
                {
                  name: '상용화 성숙도',
                  key: 'commercialMaturityScore',
                  range: '1-5',
                  formula: 'concept=1 / prototype=2 / poc=3 / pilot=4 / commercial=5',
                  desc: '제품 수명주기 단계. 상용 출시에 가까울수록 높음.',
                },
              ].map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-12 gap-3 px-4 py-3 text-[12px] border-t border-ink-200 hover:bg-ink-100 transition-colors"
                >
                  <div className="col-span-2 font-bold text-ink-900">{row.name}</div>
                  <div className="col-span-1 text-center text-info font-mono">{row.range}</div>
                  <div className="col-span-5 font-mono text-[11px] text-ink-700">{row.formula}</div>
                  <div className="col-span-4 text-ink-500 leading-relaxed">{row.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 포지셔닝 차트 축 */}
          <div className="p-6">
            <h3 className="text-[14px] font-bold text-ink-900 mb-1">포지셔닝 차트 축 구성</h3>
            <p className="text-xs text-ink-500 mb-4">
              경쟁 지형 시각화에 사용되는 차트별 X/Y/버블 크기 축 매핑.
            </p>
            <div className="border border-ink-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-paper text-[11px] font-bold text-ink-500 uppercase tracking-wider">
                <div className="col-span-3">차트</div>
                <div className="col-span-3">X 축</div>
                <div className="col-span-3">Y 축</div>
                <div className="col-span-3">버블 크기</div>
              </div>
              {[
                {
                  chart: 'RFM 경쟁력',
                  x: '엣지 추론 점수',
                  y: '범용성 점수',
                  size: '상용화 성숙도',
                },
                {
                  chart: 'PoC 포지셔닝',
                  x: '폼팩터 점수',
                  y: '가반하중 × 작동시간 / 10',
                  size: '손가락 DOF 점수',
                },
                {
                  chart: 'SoC 생태계',
                  x: '메인 SoC (카테고리)',
                  y: 'TOPS 최대값',
                  size: '적용 사례 수',
                },
              ].map((row) => (
                <div
                  key={row.chart}
                  className="grid grid-cols-12 gap-3 px-4 py-3 text-[12px] border-t border-ink-200 hover:bg-ink-100 transition-colors"
                >
                  <div className="col-span-3 font-bold text-ink-900">{row.chart}</div>
                  <div className="col-span-3 text-ink-700">{row.x}</div>
                  <div className="col-span-3 text-ink-700">{row.y}</div>
                  <div className="col-span-3 text-ink-700">{row.size}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-ink-400 mt-3 leading-relaxed">
              * 스펙 데이터 누락 시 해당 항목은 추정값(estimated=true)으로 표시되며 최저값 또는 기본값이 부여됩니다.
              계산 로직은 <span className="font-mono">packages/backend/src/services/scoring/</span> 의
              poc-calculator.ts / rfm-calculator.ts 에 정의되어 있습니다.
            </p>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white border border-ink-200 rounded-xl shadow-report p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-ink-900">
            <Database className="w-5 h-5 text-ink-500" />
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
              className="p-4 bg-paper border border-ink-200 rounded-lg hover:bg-info-soft hover:border-info text-left transition-colors"
            >
              <p className="font-medium text-ink-900">회사 데이터</p>
              <p className="text-sm text-ink-500">CSV 형식으로 다운로드</p>
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
              className="p-4 bg-paper border border-ink-200 rounded-lg hover:bg-info-soft hover:border-info text-left transition-colors"
            >
              <p className="font-medium text-ink-900">제품 데이터</p>
              <p className="text-sm text-ink-500">스펙 포함 CSV 다운로드</p>
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
              className="p-4 bg-paper border border-ink-200 rounded-lg hover:bg-info-soft hover:border-info text-left transition-colors"
            >
              <p className="font-medium text-ink-900">기사 데이터</p>
              <p className="text-sm text-ink-500">CSV 형식으로 다운로드</p>
            </button>
          </div>

          <div className="mt-8">
            <h3 className="text-[15px] font-bold text-ink-900 mb-3">Excel로 기사 업로드</h3>
            <p className="text-sm text-ink-500 mb-4">첫 번째 시트에서 데이터를 읽어서 기사 데이터를 생성/업데이트합니다.</p>
            <div className="flex flex-col md:flex-row gap-3 items-start">
              <div className="flex-1">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-ink-900 file:bg-paper file:border file:border-ink-200 file:px-3 file:py-2 file:rounded-lg file:text-ink-900 file:bg-ink-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="updateExisting"
                  type="checkbox"
                  checked={importUpdateExisting}
                  onChange={(e) => setImportUpdateExisting(e.target.checked)}
                  className="h-4 w-4 text-blue-600 bg-paper border-ink-200 rounded"
                />
                <label htmlFor="updateExisting" className="text-sm text-ink-700">
                  기존 기사 업데이트 (중복 URL이 있는 경우)
                </label>
              </div>
              <button
                disabled={!importFile || importing}
                onClick={handleImportExcel}
                className="px-4 py-2 bg-emerald-600 text-ink-900 rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {importing ? '업로드 중...' : '업로드'}
              </button>
            </div>
            {importResult && (
              <div className="mt-4 rounded-lg bg-paper border border-ink-200 p-4">
                {importResult.error ? (
                  <p className="text-sm text-red-400">에러: {importResult.error}</p>
                ) : (
                  <div className="text-sm text-ink-900 space-y-1">
                    <p>생성: {importResult.created}</p>
                    <p>업데이트: {importResult.updated}</p>
                    <p>스킵: {importResult.skipped}</p>
                    {importResult.errors?.length > 0 && (
                      <details className="text-xs text-ink-500">
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
          <div className="bg-white border border-ink-200 rounded-xl shadow-report">
            <div className="p-6 border-b border-ink-200 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h2 className="text-[15px] font-bold text-ink-900">AI API 사용량</h2>
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
                  <div className={`p-4 rounded-xl border ${isOverLimit ? 'bg-red-500/10 border-red-500/30' : isNearLimit ? 'bg-amber-500/10 border-amber-500/30' : 'bg-paper border-ink-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-ink-700">이번 달 사용량</span>
                      <span className={`text-sm font-medium ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ${totalCost.toFixed(4)} / ${limitUsd.toFixed(2)} (≈₩10,000)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
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
                  <div key={s.provider} className="bg-paper border border-ink-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Cpu className="w-5 h-5 text-violet-400" />
                      <h3 className="font-semibold text-ink-900">
                        {s.provider === 'chatgpt' ? 'OpenAI (ChatGPT)' : 'Anthropic (Claude)'}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-ink-500">총 호출</p>
                        <p className="text-lg font-bold text-ink-900">{s.totalCalls}회</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-500">예상 비용</p>
                        <p className="text-lg font-bold text-emerald-400">${s.totalCostUsd.toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-500">입력 토큰</p>
                        <p className="text-sm text-ink-700">{s.totalInputTokens.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-ink-500">출력 토큰</p>
                        <p className="text-sm text-ink-700">{s.totalOutputTokens.toLocaleString()}</p>
                      </div>
                      {s.webSearchCalls > 0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-ink-500">웹 검색 호출</p>
                          <p className="text-sm text-blue-400">{s.webSearchCalls}회</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!aiUsageSummary?.summary || aiUsageSummary.summary.length === 0) && (
                  <div className="col-span-2 text-center py-8 text-ink-400">
                    아직 AI API 호출 기록이 없습니다.
                  </div>
                )}
              </div>

              {/* 최근 호출 로그 */}
              {aiUsageLogs?.logs && aiUsageLogs.logs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-ink-500 mb-3">최근 호출 로그</h3>
                  <div className="border border-ink-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-paper text-xs font-medium text-ink-500 grid grid-cols-12 gap-2">
                      <div className="col-span-2">Provider</div>
                      <div className="col-span-2">모델</div>
                      <div className="col-span-1">웹검색</div>
                      <div className="col-span-2">토큰 (In/Out)</div>
                      <div className="col-span-2">비용</div>
                      <div className="col-span-3">시간</div>
                    </div>
                    {aiUsageLogs.logs.map((log) => (
                      <div key={log.id} className="px-4 py-2 grid grid-cols-12 gap-2 text-sm border-t border-ink-200 hover:bg-paper">
                        <div className="col-span-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            log.provider === 'chatgpt' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                          }`}>
                            {log.provider === 'chatgpt' ? 'OpenAI' : 'Claude'}
                          </span>
                        </div>
                        <div className="col-span-2 text-ink-700 truncate text-xs">{log.model}</div>
                        <div className="col-span-1">{log.webSearch ? '🌐' : '—'}</div>
                        <div className="col-span-2 text-ink-500 text-xs">{log.inputTokens}/{log.outputTokens}</div>
                        <div className="col-span-2 text-emerald-400 text-xs">${Number(log.estimatedCostUsd).toFixed(4)}</div>
                        <div className="col-span-3 text-ink-400 text-xs">
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
          <div className="bg-white border border-ink-200 rounded-xl shadow-report">
            <div className="p-6 border-b border-ink-200 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-400" />
              <h2 className="text-[15px] font-bold text-ink-900">회원가입 허용 이메일 관리</h2>
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
                  className="flex-1 px-3 py-2 bg-paper border border-ink-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-ink-900 placeholder:text-ink-400"
                />
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="메모 (선택)"
                  className="w-48 px-3 py-2 bg-paper border border-ink-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-ink-900 placeholder:text-ink-400"
                />
                <button
                  onClick={handleAddEmail}
                  disabled={addEmailMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-ink-900 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  추가
                </button>
              </div>

              {/* 허용된 이메일 목록 */}
              <div className="border border-ink-200 rounded-lg divide-y divide-ink-200">
                <div className="px-4 py-2 bg-paper text-sm font-medium text-ink-500 grid grid-cols-12 gap-4">
                  <div className="col-span-5">이메일</div>
                  <div className="col-span-4">메모</div>
                  <div className="col-span-2">등록일</div>
                  <div className="col-span-1"></div>
                </div>
                
                {/* 슈퍼 관리자 (삭제 불가) */}
                <div className="px-4 py-3 grid grid-cols-12 gap-4 items-center bg-indigo-500/10">
                  <div className="col-span-5 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium text-ink-900">somewhere010@gmail.com</span>
                    <span className="px-2 py-0.5 text-xs bg-indigo-600 text-ink-900 rounded">슈퍼 관리자</span>
                  </div>
                  <div className="col-span-4 text-ink-400 text-sm">-</div>
                  <div className="col-span-2 text-ink-400 text-sm">-</div>
                  <div className="col-span-1"></div>
                </div>

                {/* DB에서 가져온 이메일 목록 */}
                {allowedEmailsData?.emails
                  ?.filter(e => e.email !== 'somewhere010@gmail.com')
                  .map((item) => (
                    <div key={item.id} className="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-paper transition-colors">
                      <div className="col-span-5 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-ink-400" />
                        <span className="text-ink-900">{item.email}</span>
                      </div>
                      <div className="col-span-4 text-ink-500 text-sm">{item.note || '-'}</div>
                      <div className="col-span-2 text-ink-500 text-sm">
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
                  <div className="px-4 py-6 text-center text-ink-400 text-sm">
                    추가된 이메일이 없습니다.
                  </div>
                )}
              </div>

              <p className="mt-4 text-sm text-ink-400">
                * 위 목록에 등록된 이메일만 회원가입이 가능합니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
