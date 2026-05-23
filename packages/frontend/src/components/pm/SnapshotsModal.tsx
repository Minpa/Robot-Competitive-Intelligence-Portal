'use client';
// 보고 스냅샷 UI (§10.3) — 보드 현재 상태 동결 + 두 스냅 비교.
import { useEffect, useState } from 'react';
import { Camera, Trash2, GitCompare, X } from 'lucide-react';
import { pmApi } from '@/lib/pm-api';

interface Props { boardId: number; canEdit: boolean; onClose: () => void; }

export default function SnapshotsModal({ boardId, canEdit, onClose }: Props) {
  const [list, setList] = useState<Array<{ id: number; name: string | null; takenAt: string; takenBy: string | null }>>([]);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [compareA, setCompareA] = useState<number | null>(null);
  const [compareB, setCompareB] = useState<number | null>(null);
  const [diff, setDiff] = useState<any | null>(null);

  const reload = async () => {
    setBusy(true);
    try { setList((await pmApi.listSnapshots(boardId)).snapshots); } catch { /* noop */ } finally { setBusy(false); }
  };
  useEffect(() => { reload(); }, [boardId]);

  const create = async () => {
    if (!canEdit) return;
    setBusy(true);
    try { await pmApi.createSnapshot(boardId, name.trim() || undefined); setName(''); reload(); }
    catch (e: any) { alert(`스냅샷 생성 실패: ${e.message}`); }
    finally { setBusy(false); }
  };
  const remove = async (id: number) => {
    if (!canEdit || !confirm('이 스냅샷을 삭제할까요?')) return;
    await pmApi.deleteSnapshot(id); reload();
  };
  const runDiff = async () => {
    if (!compareA || !compareB || compareA === compareB) return;
    setBusy(true);
    try { setDiff((await pmApi.snapshotDiff(compareA, compareB)).diff); } catch { /* noop */ } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(26,26,26,0.5)' }} onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E2DED4]">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-[#A50034]" />
            <h3 className="font-medium text-[15px] text-[#1A1A1A]">보고 스냅샷</h3>
          </div>
          <button onClick={onClose} className="text-[#888780] hover:text-[#1A1A1A]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {canEdit && (
            <div className="flex items-center gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder={`스냅샷 이름 (예: 주간 보고 ${new Date().toISOString().slice(0, 10)})`}
                className="flex-1 text-[12.5px] border border-[#E2DED4] rounded px-2 py-1.5 outline-none focus:border-[#A50034]" />
              <button onClick={create} disabled={busy}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#A50034] text-white text-[12px] rounded disabled:opacity-40">
                <Camera size={13} /> 지금 스냅
              </button>
            </div>
          )}
          {list.length === 0 ? (
            <p className="text-[13px] text-[#B8B6AE] py-6 text-center">스냅샷이 없습니다.</p>
          ) : (
            <>
              <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em]">목록 — 비교할 두 개를 체크</p>
              <div className="border border-[#E2DED4] rounded divide-y divide-[#EFEDE6]">
                {list.map((s) => {
                  const isA = compareA === s.id, isB = compareB === s.id;
                  return (
                    <div key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[12.5px]">
                      <input type="checkbox" checked={isA || isB}
                        onChange={() => {
                          if (isA) setCompareA(null);
                          else if (isB) setCompareB(null);
                          else if (compareA == null) setCompareA(s.id);
                          else if (compareB == null) setCompareB(s.id);
                          else { setCompareA(s.id); setCompareB(null); } // 두 개 다 차면 새로 시작
                        }}
                        title="비교 대상 선택" />
                      <span className={`w-5 text-center font-mono text-[10px] ${isA ? 'text-[#A50034]' : isB ? 'text-[#3C6FA5]' : 'text-transparent'}`}>{isA ? 'A' : isB ? 'B' : ''}</span>
                      <span className="flex-1 truncate">{s.name || '(이름 없음)'}</span>
                      <span className="font-mono text-[10.5px] text-[#888780]">{new Date(s.takenAt).toLocaleString('ko-KR')}</span>
                      {canEdit && (
                        <button onClick={() => remove(s.id)} className="text-[#888780] hover:text-[#A50034]"><Trash2 size={12} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
              {compareA && compareB && (
                <button onClick={runDiff} disabled={busy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] text-white text-[12px] rounded">
                  <GitCompare size={13} /> A↔B diff 계산
                </button>
              )}
              {diff && (
                <div className="bg-[#FAFAF7] border border-[#E2DED4] rounded p-3 text-[12.5px] space-y-2">
                  <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em]">변경 요약 (A → B)</p>
                  {diff.added.length > 0 && (
                    <div>
                      <p className="text-[#3F8C6E] font-medium">+ 추가 ({diff.added.length})</p>
                      <ul className="text-[#5F5E5A] list-disc list-inside">{diff.added.map((x: any) => <li key={x.id}>{x.name}</li>)}</ul>
                    </div>
                  )}
                  {diff.removed.length > 0 && (
                    <div>
                      <p className="text-[#A50034] font-medium">− 삭제 ({diff.removed.length})</p>
                      <ul className="text-[#5F5E5A] list-disc list-inside">{diff.removed.map((x: any) => <li key={x.id}>{x.name}</li>)}</ul>
                    </div>
                  )}
                  {diff.renamed.length > 0 && (
                    <div>
                      <p className="text-[#D4A22F] font-medium">~ 이름 변경 ({diff.renamed.length})</p>
                      <ul className="text-[#5F5E5A] list-disc list-inside">{diff.renamed.map((x: any) => <li key={x.id}>{x.from} → {x.to}</li>)}</ul>
                    </div>
                  )}
                  {diff.cellChanges.length > 0 && (
                    <div>
                      <p className="text-[#3C6FA5] font-medium">셀 변경 {diff.cellChanges.length}건</p>
                      <p className="font-mono text-[10.5px] text-[#888780]">(아이템·컬럼·값 상세는 콘솔)</p>
                    </div>
                  )}
                  {diff.added.length + diff.removed.length + diff.renamed.length + diff.cellChanges.length === 0 && (
                    <p className="text-[#5F5E5A]">변경 없음.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-5 py-2 bg-[#FAFAF7] border-t border-[#E2DED4] text-[10.5px] font-mono text-[#888780]">
          스냅샷 = 그 시점 보드 전체 JSON 동결. 주간 보고일에 찍어두면 차주 diff 비교에 활용.
        </div>
      </div>
    </div>
  );
}
