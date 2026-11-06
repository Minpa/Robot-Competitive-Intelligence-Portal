'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Save, Send, Undo2 } from 'lucide-react';
import { publishBadge, publishConfirmModel } from '@/lib/weekly-brief-exec';
import type { WeeklyBriefEditor } from '../useWeeklyBriefEdit';

const BTN =
  'inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold border transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/80';

/** 발행 확인 다이얼로그 — 변경 문장 수, 가드 경고 목록, 우리 위치 미등록 축 안내 */
export function PublishDialog({
  open,
  onCancel,
  onConfirm,
  changedCount,
  warnings,
  missingAxes,
}: {
  open: boolean;
  onCancel(): void;
  onConfirm(): void;
  changedCount: number;
  warnings: { path: string; codes: string[] }[];
  missingAxes: number;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  const m = publishConfirmModel({ changedCount, warnings, missingAxes });
  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="publish-dialog">
      <div role="dialog" aria-modal="true" aria-labelledby="publish-dialog-title" className="w-full max-w-[460px] border border-ink-300 bg-white p-5 text-ink-900 shadow-xl">
        <h2 id="publish-dialog-title" className="m-0 text-[16px] font-bold">
          {m.title}
        </h2>
        <div className="mt-3 grid gap-2 text-[13.5px] leading-relaxed">
          {m.lines.map((l) => (
            <p key={l} className="m-0">
              {l}
            </p>
          ))}
          {m.warnings.length > 0 && (
            <div data-testid="publish-warnings">
              <p className="m-0 font-semibold">가드 경고 {m.warnings.length}건 (발행은 가능합니다)</p>
              <ul className="m-0 mt-1 list-disc pl-5 text-[12.5px] text-ink-700">
                {m.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={`${BTN} border-ink-200 bg-white text-ink-700 hover:border-ink-400 focus:ring-ink-400`}>
            취소
          </button>
          <button ref={confirmRef} type="button" onClick={onConfirm} className={`${BTN} border-ink-900 bg-ink-900 text-poster-fg hover:bg-ink-700 focus:ring-ink-400`}>
            발행
          </button>
        </div>
      </div>
    </div>
  );
}

/** 하단 고정 바 — 변경 문장 수, 저장, 발행(확인 다이얼로그), 내리기. 편집 모드에서만 렌더하고 인쇄에서는 숨긴다 */
export function PublishBar({ editor, missingAxes }: { editor: WeeklyBriefEditor; missingAxes: number }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data } = editor;
  const badge = publishBadge({ publishState: data.publishState, hasUnpublishedChanges: data.hasUnpublishedChanges });
  const busy = editor.saving || editor.publishing;
  const canPublish = !busy && editor.unsavedCount === 0 && (data.publishState === 'draft' || data.hasUnpublishedChanges);
  return (
    <>
      <div
        className="no-print fixed bottom-0 left-0 right-0 z-40 md:left-[264px] border-t border-ink-300 bg-ink-900 px-4 py-3 text-poster-fg shadow-[0_-4px_12px_rgba(0,0,0,0.25)]"
        data-testid="publish-bar"
        role="region"
        aria-label="발행 도구"
      >
        <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 text-[12.5px]">
            <span className="mr-2 inline-block border border-white/60 px-2 py-0.5 font-bold" data-testid="publish-bar-badge">
              {badge.label}
            </span>
            <span data-testid="changed-count">변경 문장 {editor.unsavedCount}개(저장 전) · 편집 {editor.savedCount}개(저장됨)</span>
            <span className="sr-only" aria-live="polite" data-testid="edit-status">
              {editor.saving ? '저장 중' : editor.publishing ? '발행 중' : (editor.notice ?? '')}
            </span>
            {editor.notice && (
              <span className="ml-2 font-semibold text-yellow-200" data-testid="edit-notice">
                {editor.notice}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={editor.save} disabled={busy || editor.unsavedCount === 0} className={`${BTN} border-white/70 bg-transparent text-poster-fg hover:bg-white/10`} data-testid="save-button">
              {editor.saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              저장
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!canPublish}
              title={editor.unsavedCount > 0 ? '먼저 저장하세요' : undefined}
              className={`${BTN} border-white bg-white text-ink-900 hover:bg-ink-100`}
              data-testid="publish-button"
            >
              {editor.publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              발행
            </button>
            {data.publishState === 'published' && (
              <button
                type="button"
                onClick={() => window.confirm('발행을 내릴까요? 일반 사용자 화면과 ARGOS_I 에서 사라지고 초안으로 돌아갑니다.') && editor.unpublish()}
                disabled={busy}
                className={`${BTN} border-white/70 bg-transparent text-poster-fg hover:bg-white/10`}
                data-testid="unpublish-button"
              >
                <Undo2 className="h-3.5 w-3.5" />
                내리기
              </button>
            )}
          </div>
        </div>
      </div>
      <PublishDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          editor.publish();
        }}
        changedCount={editor.savedCount}
        warnings={editor.warnings}
        missingAxes={missingAxes}
      />
    </>
  );
}
