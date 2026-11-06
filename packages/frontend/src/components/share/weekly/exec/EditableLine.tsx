'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { editLimitFor } from '@/lib/weekly-brief-exec';
import { useExecEdit } from '../useWeeklyBriefEdit';

interface Props {
  /** 편집 경로 (lib/weekly-brief-exec 의 editPath) */
  path: string;
  /** 서버가 내려준 효과 텍스트 */
  text: string;
  className?: string;
  /** 글자 수 상한을 직접 지정 (기본: 경로 규칙) */
  limit?: number;
}

/**
 * 편집 가능한 문장. 편집 컨텍스트가 없거나 편집 모드가 꺼져 있으면 일반 텍스트만 렌더한다(비관리자 DOM 에는 편집 요소가 없다).
 * 편집 모드: 클릭하면 자동 높이 textarea, 글자 수 카운터(현재/상한), 입력 점검 메시지, "AI 초안으로 되돌리기", 편집된 문장 점 표시.
 */
export function EditableLine({ path, text, className, limit }: Props) {
  const edit = useExecEdit();
  if (!edit || !edit.enabled) return <span className={className}>{text}</span>;
  return <EditableInner path={path} text={text} className={className} limit={limit} />;
}

function EditableInner({ path, text, className, limit }: Props) {
  const edit = useExecEdit()!;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const msgId = useId();
  const value = edit.valueOf(path, text);
  const max = limit ?? editLimitFor(path, edit.limits);
  const problem = edit.problemOf(path, text);
  const edited = edit.isEdited(path, text);
  const count = Array.from(value).length;

  // 자동 높이
  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [open, value]);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  return (
    <span className={`exec-editable relative block ${className ?? ''}`} data-edited={edited ? 'true' : 'false'} data-testid="editable-line">
      {open ? (
        <textarea
          ref={ref}
          value={value}
          rows={2}
          aria-label={`문장 편집 (${count}/${max}자)`}
          aria-describedby={msgId}
          aria-invalid={problem ? true : undefined}
          onChange={(e) => edit.set(path, e.target.value.replace(/[\r\n]+/g, ' '))}
          onBlur={() => setOpen(false)}
          className="block w-full resize-none rounded-none border border-white/60 bg-poster-3 px-2 py-1.5 text-[15px] leading-[1.6] text-poster-fg outline-none focus:border-white focus:ring-2 focus:ring-white/70"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`문장 편집: ${value.slice(0, 40)}`}
          className="block w-full cursor-text rounded-none border border-dashed border-white/40 px-1.5 py-1 text-left text-inherit hover:bg-poster-3/60 focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          {edited && (
            <span className="mr-1 text-[11px] text-yellow-200" aria-label="편집됨" title="AI 초안과 다른 문장">
              ●
            </span>
          )}
          {value}
        </button>
      )}
      <span id={msgId} className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11.5px] text-poster-fg-2" role={problem ? 'alert' : undefined}>
        <span data-testid="edit-counter" className={count > max ? 'font-bold text-red-200' : undefined}>
          {count}/{max}
        </span>
        {problem && <span className="font-semibold text-red-200">{problem}</span>}
        {edited && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => edit.revert(path)}
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-poster-fg focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            AI 초안으로 되돌리기
          </button>
        )}
      </span>
    </span>
  );
}
