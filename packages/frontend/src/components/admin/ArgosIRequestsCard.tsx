'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Inbox, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { ArgosCard } from '@/components/layout/PageHeader';
import { formatKst } from '@/lib/argos-i-export-view';
import {
  APPROVAL_REASON_LABELS,
  STATUS_FILTERS,
  TONE_BADGE_CLASS,
  TONE_TEXT_CLASS,
  TYPE_LABELS,
  budgetGauge,
  canDecide,
  formatUsd,
  lastRunText,
  rejectRows,
  rejectWarning,
  statusBadge,
  summarizeParams,
} from '@/lib/argos-i-requests-view';
import { useArgosIRequests } from './useArgosIRequests';

const GAUGE_BAR: Record<string, string> = { ok: 'bg-pos', warn: 'bg-warn', error: 'bg-neg', info: 'bg-info', none: 'bg-ink-300' };

/**
 * 관리자 "ARGOS_I 요청" 카드 — 오늘 비용·건수, 대기열, 승인 대기 목록(승인·거부), 거부 사유 통계, 서킷 브레이커 배너.
 * note 는 승인 대기 행과 상세에서만 평문 텍스트로 표시한다 (HTML·마크다운 렌더링 없음). 비밀값·해시·거부된 본문은 표시하지 않는다.
 */
export default function ArgosIRequestsCard() {
  const [filter, setFilter] = useState<string>('needs_approval');
  const [openId, setOpenId] = useState<string | null>(null);
  const x = useArgosIRequests(filter === 'all' ? undefined : filter, true);
  const s = x.stats;
  const gauge = s ? budgetGauge(s.today) : null;
  const warning = rejectWarning(s);
  const rows = rejectRows(s);

  const confirmAndRun = (kind: 'approve' | 'reject', id: string) => {
    const msg = kind === 'approve' ? '이 요청을 승인합니다. 승인하면 대기열에서 실행됩니다. 계속할까요?' : '이 요청을 거부합니다. 계속할까요?';
    if (typeof window !== 'undefined' && !window.confirm(msg)) return;
    if (kind === 'approve') x.approve(id);
    else x.reject(id);
  };

  return (
    <ArgosCard>
      <div className="p-6 border-b border-ink-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-info-soft rounded-md flex items-center justify-center">
            <Inbox className="w-4 h-4 text-info" />
          </div>
          <h2 className="text-[15px] font-bold text-ink-900">
            ARGOS_I 요청 <span className="text-ink-400 font-semibold">/ Requests</span>
          </h2>
          {s && (
            <span
              className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${s.enabled && s.tokenConfigured ? 'bg-pos-soft text-pos' : 'bg-warn-soft text-warn'}`}
              data-testid="argos-i-requests-enabled-badge"
            >
              {s.enabled && s.tokenConfigured ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {s.enabled && s.tokenConfigured ? '활성' : '비활성 (기본)'}
            </span>
          )}
        </div>
        <button onClick={() => x.refetch()} className="flex items-center gap-2 px-3 py-2 text-[12px] font-semibold text-ink-700 border border-ink-200 rounded-lg hover:bg-ink-50">
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      <div className="p-6 space-y-5">
        {x.error && <div className="text-[12px] text-neg">상태를 불러오지 못했습니다: {x.error.message}</div>}
        {x.actionError && <div className="text-[12px] text-neg">처리하지 못했습니다: {x.actionError.message}</div>}

        {s?.suspended && (
          <div className="flex items-center justify-between gap-3 text-[12px] text-neg bg-neg-soft border border-neg rounded-md p-3" data-testid="argos-i-requests-suspended">
            <span className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              요청 API 가 자동 중지되었습니다 (거부 누적 — 아웃바운드 가드가 뚫렸을 수 있습니다). {s.suspendedSince ? `중지 시각 ${formatKst(s.suspendedSince)} (KST). ` : ''}
              원인을 확인한 뒤 해제하세요.
            </span>
            <button onClick={() => x.resume()} disabled={x.resuming} className="px-3 py-1.5 bg-neg text-white font-semibold rounded-md disabled:opacity-50 shrink-0">
              {x.resuming ? '해제 중…' : '중지 해제'}
            </button>
          </div>
        )}

        {warning && (
          <div className="flex items-start gap-2 text-[12px] text-warn bg-warn-soft border border-warn rounded-md p-3" data-testid="argos-i-requests-reject-warning">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        {s && gauge && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">오늘 비용 / 일 예산</div>
              <div className={`text-[14px] font-semibold mt-1 ${TONE_TEXT_CLASS[gauge.tone]}`}>{gauge.text}</div>
              <div className="h-1.5 bg-ink-100 rounded mt-2 overflow-hidden" role="progressbar" aria-valuenow={gauge.pct} aria-valuemin={0} aria-valuemax={100}>
                <div className={`h-full ${GAUGE_BAR[gauge.tone]}`} style={{ width: `${gauge.pct}%` }} />
              </div>
            </div>
            <Stat label="오늘 분석 건수 / 상한" value={`${s.today.analyzeCount} / ${s.today.maxAnalyze}`} />
            <Stat label="대기열 (대기+승인대기+실행)" value={`${s.queueLength}건`} />
            <Stat label="마지막 처리" value={lastRunText(s.lastRun, formatKst)} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="상태 필터">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 rounded-full text-[12px] font-semibold border ${filter === f.value ? 'bg-brand text-ink-900 border-brand' : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'}`}
            >
              {f.label}
              {f.value === 'needs_approval' && s?.statusCounts.needs_approval ? ` ${s.statusCounts.needs_approval}` : ''}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-ink-400 text-[10px] uppercase tracking-wider">
                <th className="py-2 pr-3">생성 (KST)</th>
                <th className="py-2 pr-3">종류</th>
                <th className="py-2 pr-3">대상</th>
                <th className="py-2 pr-3">상태</th>
                <th className="py-2 pr-3">비용</th>
                <th className="py-2 pr-3">오류 코드</th>
                <th className="py-2 pr-3" />
              </tr>
            </thead>
            <tbody>
              {x.isLoading && (
                <tr>
                  <td colSpan={7} className="py-4 text-ink-500">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    불러오는 중…
                  </td>
                </tr>
              )}
              {!x.isLoading && x.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-ink-500">
                    표시할 요청이 없습니다.
                  </td>
                </tr>
              )}
              {x.items.map((it) => {
                const badge = statusBadge(it.status);
                const decide = canDecide(it);
                const open = openId === it.id;
                return (
                  <FragmentRow key={it.id}>
                    <tr className="border-t border-ink-100 align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatKst(it.createdAt)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{TYPE_LABELS[it.type] ?? it.type}</td>
                      <td className="py-2 pr-3 break-all">{summarizeParams(it.params)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${TONE_BADGE_CLASS[badge.tone]}`}>{badge.label}</span>
                        {decide && it.approvalReason && <div className="text-[11px] text-ink-500 mt-1">{APPROVAL_REASON_LABELS[it.approvalReason] ?? it.approvalReason}</div>}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{it.costUsd > 0 ? formatUsd(it.costUsd) : '-'}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{it.errorCode ?? '-'}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-right">
                        {decide && (
                          <span className="inline-flex gap-2">
                            <button onClick={() => confirmAndRun('approve', it.id)} disabled={x.busyId === it.id} className="px-2.5 py-1 bg-pos text-white font-semibold rounded-md disabled:opacity-50">
                              승인
                            </button>
                            <button onClick={() => confirmAndRun('reject', it.id)} disabled={x.busyId === it.id} className="px-2.5 py-1 border border-neg text-neg font-semibold rounded-md disabled:opacity-50">
                              거부
                            </button>
                          </span>
                        )}
                        {(it.note || it.approvedBy) && (
                          <button onClick={() => setOpenId(open ? null : it.id)} className="ml-2 text-ink-500 underline">
                            {open ? '접기' : '상세'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {(decide ? it.note : open) && (
                      <tr className="bg-ink-50">
                        <td colSpan={7} className="px-3 py-2">
                          {/* note 는 평문 텍스트로만 표시한다 (React 기본 이스케이프, HTML·마크다운 렌더링 없음) */}
                          {it.note ? (
                            <div>
                              <span className="font-semibold text-ink-700">요청 메모(note, 평문): </span>
                              <span className="whitespace-pre-wrap break-words" data-testid="argos-i-request-note">{it.note}</span>
                            </div>
                          ) : (
                            <span className="text-ink-500">메모 없음</span>
                          )}
                          {open && it.approvedBy && (
                            <div className="text-ink-500 mt-1">
                              승인: {it.approvedBy} ({formatKst(it.approvedAt)} KST) · 시도 {it.attempts}회
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                );
              })}
            </tbody>
          </table>
        </div>

        <div>
          <div className="text-[12px] font-semibold text-ink-700 mb-2">최근 7일 거부 사유 통계 (사유 코드별 건수만 — 본문·값은 저장하지 않음)</div>
          {rows.length === 0 ? (
            <div className="text-[12px] text-pos">거부 없음</div>
          ) : (
            <table className="text-[12px]" data-testid="argos-i-reject-table">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code}>
                    <td className="pr-4 py-0.5 font-mono text-ink-700">{r.code}</td>
                    <td className="pr-4 py-0.5 text-ink-500">{r.label}</td>
                    <td className="py-0.5 font-semibold text-ink-900">{r.count}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-[11px] text-ink-500 leading-relaxed">
          ARGOS_I 가 보낸 요청(자료 추가·분석·조회)을 처리합니다. ARGOS 는 사내로 알림을 보내지 않으며 결과는 ARGOS_I 가 폴링하거나 일일 번들의 requests 영역으로 가져갑니다. 이 카드에는 토큰·해시·거부된 본문이 표시되지 않습니다.
        </div>
      </div>
    </ArgosCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</div>
      <div className="text-[14px] font-semibold text-ink-900 mt-1">{value}</div>
    </div>
  );
}

/** tbody 안에서 두 행을 묶기 위한 Fragment 래퍼 */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
