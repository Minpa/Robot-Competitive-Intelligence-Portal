'use client';
// 자동화 MVP UI (REQ-21) — 프로젝트의 모든 보드에서 trigger·action 룰을 관리.
// 트리거(MVP): 'cell_changed_to' — status/priority 라벨이 특정 값으로 바뀌면
// 액션(MVP):  'set_cell' — 같은 아이템의 다른 셀을 특정 값으로 설정
import { useEffect, useState } from 'react';
import { Plus, Trash2, Zap, Power, PowerOff } from 'lucide-react';
import { pmApi, type PmBoard, type PmColumn, type BoardData } from '@/lib/pm-api';

interface Props { projectId: number; boards: PmBoard[]; canEdit: boolean; }

export default function AutomationsTab({ boards, canEdit }: Props) {
  const [boardId, setBoardId] = useState<number | null>(boards[0]?.id ?? null);
  const [data, setData] = useState<BoardData | null>(null);
  const [autos, setAutos] = useState<Array<any>>([]);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ name: string; trigCol: number | ''; trigLabel: number | ''; actCol: number | ''; actLabel: number | '' }>({ name: '', trigCol: '', trigLabel: '', actCol: '', actLabel: '' });

  const reload = async (bid: number) => {
    setBusy(true);
    try {
      const d = await pmApi.getBoardData(bid);
      setData(d);
      setAutos((await pmApi.listAutomations(bid)).automations);
    } catch { /* noop */ } finally { setBusy(false); }
  };
  useEffect(() => { if (boardId) reload(boardId); }, [boardId]);

  if (boards.length === 0) return <p className="text-[13px] text-[#888780] py-6">자동화를 설정할 보드가 없습니다.</p>;

  const labelCols: PmColumn[] = (data?.columns ?? []).filter((c) => c.type === 'status' || c.type === 'priority');
  const colName = (id: number | string) => data?.columns.find((c) => c.id === Number(id))?.name ?? `#${id}`;
  const labelName = (colId: number | string, labelId: number | string) => {
    const c = data?.columns.find((x) => x.id === Number(colId));
    return (c?.settings?.labels || []).find((l: any) => l.id === Number(labelId))?.name ?? `#${labelId}`;
  };

  const save = async () => {
    if (!boardId || !canEdit) return;
    if (!draft.trigCol || !draft.trigLabel || !draft.actCol || !draft.actLabel) { alert('트리거·액션 모두 선택해주세요.'); return; }
    setBusy(true);
    try {
      await pmApi.createAutomation(boardId, {
        name: draft.name.trim() || `규칙 ${autos.length + 1}`,
        trigger: { type: 'cell_changed_to', columnId: Number(draft.trigCol), labelId: Number(draft.trigLabel) },
        actions: [{ type: 'set_cell', columnId: Number(draft.actCol), value: { label_id: Number(draft.actLabel) } }],
        enabled: true,
      });
      setAdding(false); setDraft({ name: '', trigCol: '', trigLabel: '', actCol: '', actLabel: '' });
      reload(boardId);
    } catch (e: any) { alert(`실패: ${e.message}`); }
    finally { setBusy(false); }
  };

  const toggle = async (a: any) => {
    if (!canEdit) return;
    await pmApi.updateAutomation(a.id, { enabled: !a.enabled });
    boardId && reload(boardId);
  };
  const remove = async (a: any) => {
    if (!canEdit || !confirm(`'${a.name}' 규칙을 삭제할까요?`)) return;
    await pmApi.deleteAutomation(a.id);
    boardId && reload(boardId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em]">보드</span>
        <select value={boardId ?? ''} onChange={(e) => setBoardId(Number(e.target.value))}
          className="text-[12.5px] border border-[#E2DED4] rounded px-2 py-1 outline-none">
          {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        {canEdit && (
          <button onClick={() => setAdding(true)}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[12px] bg-[#A50034] text-white rounded">
            <Plus size={13} /> 규칙 추가
          </button>
        )}
      </div>

      {adding && canEdit && (
        <div className="bg-white border border-[#A50034] rounded-md p-3 space-y-2 text-[12.5px]">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="규칙 이름 (예: 완료 시 진행률 100%)"
            className="w-full border border-[#E2DED4] rounded px-2 py-1.5 outline-none focus:border-[#A50034]" />
          {labelCols.length < 2 ? (
            <p className="text-[12px] text-[#A0764A]">⚠️ status/priority 컬럼이 2개 이상 필요합니다 (트리거 1 + 액션 1). 보드에 컬럼을 추가하세요.</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em] w-12">트리거</span>
                <select value={draft.trigCol} onChange={(e) => setDraft({ ...draft, trigCol: Number(e.target.value) || '', trigLabel: '' })}
                  className="flex-1 border border-[#E2DED4] rounded px-2 py-1">
                  <option value="">컬럼…</option>
                  {labelCols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <span className="text-[#888780]">→</span>
                <select value={draft.trigLabel} onChange={(e) => setDraft({ ...draft, trigLabel: Number(e.target.value) || '' })}
                  disabled={!draft.trigCol}
                  className="flex-1 border border-[#E2DED4] rounded px-2 py-1 disabled:opacity-50">
                  <option value="">값…</option>
                  {((data?.columns.find((c) => c.id === Number(draft.trigCol))?.settings?.labels) || []).map((l: any) =>
                    <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em] w-12">액션</span>
                <select value={draft.actCol} onChange={(e) => setDraft({ ...draft, actCol: Number(e.target.value) || '', actLabel: '' })}
                  className="flex-1 border border-[#E2DED4] rounded px-2 py-1">
                  <option value="">컬럼…</option>
                  {labelCols.filter((c) => c.id !== Number(draft.trigCol)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <span className="text-[#888780]">←</span>
                <select value={draft.actLabel} onChange={(e) => setDraft({ ...draft, actLabel: Number(e.target.value) || '' })}
                  disabled={!draft.actCol}
                  className="flex-1 border border-[#E2DED4] rounded px-2 py-1 disabled:opacity-50">
                  <option value="">값…</option>
                  {((data?.columns.find((c) => c.id === Number(draft.actCol))?.settings?.labels) || []).map((l: any) =>
                    <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setAdding(false)} className="px-2.5 py-1 text-[#5F5E5A]">취소</button>
            <button onClick={save} disabled={busy} className="px-3 py-1 bg-[#A50034] text-white rounded disabled:opacity-40">저장</button>
          </div>
        </div>
      )}

      {autos.length === 0 && !adding && (
        <p className="text-[13px] text-[#B8B6AE] py-8 text-center">
          <Zap size={18} className="mx-auto mb-2 opacity-40" />
          이 보드에 자동화 규칙이 없습니다. 위에서 추가하세요.
        </p>
      )}
      <div className="space-y-1.5">
        {autos.map((a) => {
          const tr = a.trigger ?? {}; const acts = a.actions ?? [];
          return (
            <div key={a.id} className={`flex items-center gap-3 px-3 py-2 border rounded-md ${a.enabled ? 'bg-white border-[#E2DED4]' : 'bg-[#FAFAF7] border-[#E2DED4] opacity-70'}`}>
              <button onClick={() => toggle(a)} disabled={!canEdit} title={a.enabled ? '비활성화' : '활성화'}
                className={a.enabled ? 'text-[#3F8C6E]' : 'text-[#B8B6AE]'}>
                {a.enabled ? <Power size={15} /> : <PowerOff size={15} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{a.name}</p>
                <p className="text-[11.5px] text-[#5F5E5A] truncate">
                  <span className="font-mono">{colName(tr.columnId)} = {labelName(tr.columnId, tr.labelId)}</span>
                  <span className="mx-1 text-[#888780]">→</span>
                  {acts.map((act: any, i: number) => (
                    <span key={i} className="font-mono">{colName(act.columnId)} ← {labelName(act.columnId, act.value?.label_id)}{i < acts.length - 1 ? ', ' : ''}</span>
                  ))}
                </p>
              </div>
              {canEdit && (
                <button onClick={() => remove(a)} className="text-[#888780] hover:text-[#A50034]"><Trash2 size={14} /></button>
              )}
            </div>
          );
        })}
      </div>
      <p className="font-mono text-[10.5px] text-[#888780] mt-2">
        MVP: 트리거 = status/priority 라벨 변경, 액션 = 다른 라벨형 셀 값 설정. 셀이 저장될 때 즉시 실행.
      </p>
    </div>
  );
}
