'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Panel, Tag } from '@/components/ui';
import { ExternalLink, Check, X, RefreshCw, Sparkles } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  company?: string | null;
  domain?: string | null;
  firstSeenUrl?: string | null;
  detectedAt?: string;
}

const STAGES = ['concept', 'prototype', 'poc', 'pilot', 'commercial'];

export default function RobotCandidatesPage() {
  const qc = useQueryClient();
  const [overrides, setOverrides] = useState<Record<string, { year: string; stage: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['robot-candidates'],
    queryFn: () => api.getRobotCandidates(),
  });

  const runSync = useMutation({
    mutationFn: () => api.runVideoSync(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['robot-candidates'] }),
  });

  const enrichSpecs = useMutation({
    mutationFn: () => api.enrichRobotSpecs(),
  });

  const approve = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      api.approveRobotCandidate(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['robot-candidates'] }),
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.rejectRobotCandidate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['robot-candidates'] }),
  });

  const candidates: Candidate[] = Array.isArray(data) ? data : [];

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <PageHeader
          module="Admin"
          titleKo="영상 감지 로봇 후보"
          titleEn="Robot Candidates"
          description="영상 채널에서 감지되었으나 카탈로그에 없는 로봇입니다. 승인하면 로봇 리스트·타임라인에 추가되고, 최초 감지 영상이 연결됩니다."
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => enrichSpecs.mutate()}
                disabled={enrichSpecs.isPending}
                className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${enrichSpecs.isPending ? 'animate-pulse' : ''}`} />
                스펙 자동 보강
              </button>
              <button
                onClick={() => runSync.mutate()}
                disabled={runSync.isPending}
                className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runSync.isPending ? 'animate-spin' : ''}`} />
                지금 연동 실행
              </button>
            </div>
          }
        />

        {enrichSpecs.data && (
          <div className="text-[12px] text-ink-600 bg-ink-50 border border-ink-200 rounded-lg px-4 py-2.5">
            스펙 보강 완료 — 로봇 {enrichSpecs.data.robotsScanned}개 검토, {enrichSpecs.data.robotsEnriched}개 보강,{' '}
            필드 {enrichSpecs.data.fieldsFilled}개 채움.
          </div>
        )}

        <Panel kicker="Review Queue" title={`검토 대기 (${candidates.length}건)`}>
          {isLoading ? (
            <div className="py-8 text-center text-ink-400 text-sm">불러오는 중...</div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center text-ink-400 text-sm">
              검토할 후보가 없습니다. 새 영상이 수집·태깅되면 여기에 로봇 후보가 쌓입니다.
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((c) => {
                const ov = overrides[c.id] ?? { year: String(new Date().getFullYear()), stage: 'prototype' };
                return (
                  <div key={c.id} className="border border-ink-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[14px] font-semibold text-ink-900">{c.name}</h3>
                          {c.company && <Tag tone="neutral" size="sm">{c.company}</Tag>}
                          {c.domain && <Tag tone="gold" size="sm">{c.domain}</Tag>}
                        </div>
                        {c.firstSeenUrl && (
                          <a
                            href={c.firstSeenUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-info hover:underline"
                          >
                            최초 감지 영상 <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-end gap-3 flex-wrap">
                      <label className="text-[11px] text-ink-500">
                        발표연도
                        <input
                          type="number"
                          value={ov.year}
                          onChange={(e) =>
                            setOverrides((p) => ({ ...p, [c.id]: { ...ov, year: e.target.value } }))
                          }
                          className="block mt-1 w-24 px-2 py-1.5 text-[12px] border border-ink-200 rounded"
                        />
                      </label>
                      <label className="text-[11px] text-ink-500">
                        단계
                        <select
                          value={ov.stage}
                          onChange={(e) =>
                            setOverrides((p) => ({ ...p, [c.id]: { ...ov, stage: e.target.value } }))
                          }
                          className="block mt-1 px-2 py-1.5 text-[12px] border border-ink-200 rounded bg-white"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => reject.mutate(c.id)}
                          disabled={reject.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium border border-ink-200 text-ink-600 hover:border-neg hover:text-neg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> 반려
                        </button>
                        <button
                          onClick={() =>
                            approve.mutate({
                              id: c.id,
                              body: {
                                announcementYear: Number(ov.year) || undefined,
                                commercializationStage: ov.stage,
                              },
                            })
                          }
                          disabled={approve.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium bg-brand text-white hover:bg-[#111417] transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" /> 승인 · 카탈로그 추가
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <p className="text-[11.5px] text-ink-500">
          승인된 로봇은{' '}
          <Link href="/humanoid-robots" className="text-info hover:underline">로봇 리스트</Link> 및{' '}
          <Link href="/robot-evolution" className="text-info hover:underline">로봇 타임라인</Link>에 즉시 반영됩니다.
        </p>
      </div>
    </AuthGuard>
  );
}
