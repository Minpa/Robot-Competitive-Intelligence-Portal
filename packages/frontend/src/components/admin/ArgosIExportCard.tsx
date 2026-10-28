'use client';

import { AlertTriangle, CheckCircle, Loader2, PackageOpen, RefreshCw } from 'lucide-react';
import { ArgosCard } from '@/components/layout/PageHeader';
import { PHASE_LABELS, REASON_LABELS, formatBytes, formatKst, summarizeLastRun } from '@/lib/argos-i-export-view';
import { useArgosIExport } from './useArgosIExport';

const TONE_CLASS = {
  ok: 'text-pos',
  warn: 'text-warn',
  error: 'text-neg',
  none: 'text-ink-500',
} as const;

/** 관리자 "ARGOS_I 연동" 카드 — 최신 번들 상태, 토큰 설정 여부, 마지막 실행 결과, "지금 생성" 버튼 */
export default function ArgosIExportCard() {
  const x = useArgosIExport(true);
  const s = x.status;
  const latest = s?.latest ?? null;
  const last = summarizeLastRun(s?.lastRun);
  const busy = x.running || x.waitingForStart || x.starting;
  const tokenConfigured = s?.config.tokenConfigured ?? null;

  return (
    <ArgosCard>
      <div className="p-6 border-b border-ink-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-info-soft rounded-md flex items-center justify-center">
            <PackageOpen className="w-4 h-4 text-info" />
          </div>
          <h2 className="text-[15px] font-bold text-ink-900">
            ARGOS_I 연동 <span className="text-ink-400 font-semibold">/ Daily Snapshot Export</span>
          </h2>
          {tokenConfigured !== null && (
            <span
              className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                tokenConfigured ? 'bg-pos-soft text-pos' : 'bg-warn-soft text-warn'
              }`}
              data-testid="argos-i-token-badge"
            >
              {tokenConfigured ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {tokenConfigured ? '토큰 설정됨' : '토큰 미설정 — API 비활성'}
            </span>
          )}
        </div>
        <button
          onClick={() => x.start()}
          disabled={busy || x.isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-soft text-ink-900 text-[12px] font-semibold rounded-lg disabled:opacity-50 transition-colors"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {busy ? (x.running ? PHASE_LABELS[x.phase] : '시작하는 중…') : '지금 생성'}
        </button>
      </div>

      <div className="p-6 space-y-4">
        {x.statusError && <div className="text-[12px] text-neg">상태를 불러오지 못했습니다: {x.statusError.message}</div>}
        {x.error && (
          <div className="text-[12px] text-neg">
            {x.error.message === 'already_running' ? '이미 생성이 진행 중입니다.' : `생성을 시작하지 못했습니다: ${x.error.message}`}
          </div>
        )}

        {tokenConfigured === false && (
          <div className="flex items-start gap-2 text-[12px] text-warn bg-warn-soft border border-warn rounded-md p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              백엔드 서비스의 환경변수 <code>ARGOS_I_EXPORT_TOKEN</code>(32자 이상)이 없어 ARGOS_I 가 번들을 가져갈 수 없습니다. 번들 생성 자체는 동작합니다.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="최신 번들 (KST 날짜)" value={latest?.date ?? '없음'} />
          <Stat label="생성 시각 (KST)" value={formatKst(latest?.generatedAt)} />
          <Stat label="상태" value={latest ? (latest.status === 'partial' ? '일부 실패 (partial)' : '정상 (ok)') : '-'} />
          <Stat label="파일 수 / 총 크기" value={latest ? `${latest.fileCount}개 / ${formatBytes(latest.totalBytes)}` : '-'} />
        </div>

        <div className="text-[12px]">
          <span className="font-semibold text-ink-700">마지막 실행: </span>
          <span className={TONE_CLASS[last.tone]} data-testid="argos-i-last-run">{last.text}</span>
          {s?.lastRun && s.lastRun.warnings.length > 0 && (
            <span className="text-ink-500"> · 경고: {s.lastRun.warnings.join(', ')}</span>
          )}
        </div>
        {x.running && s?.current && (
          <div className="text-[12px] text-ink-600">
            진행 중: {PHASE_LABELS[x.phase]} · {REASON_LABELS[s.current.reason] ?? s.current.reason} · 시작 {formatKst(s.current.startedAt)} (KST)
          </div>
        )}
        {x.finishedInSession && !x.running && <div className="text-[12px] text-pos">생성이 끝났습니다.</div>}

        {s && (
          <div className="text-[11px] text-ink-500 leading-relaxed">
            매일 {s.config.cron} (KST) 자동 생성 · 보존 {s.config.retentionDays}일 · 스케줄러 {s.config.schedulerEnabled ? '켜짐' : '꺼짐'} · 기동 캐치업{' '}
            {s.config.startupCatchup ? '켜짐' : '꺼짐'} · 영역 {s.config.areas.length}개. ARGOS_I 서버가 토큰으로 직접 가져가며, 이 화면에서 번들을 내려받는 기능은 없습니다.
          </div>
        )}
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
