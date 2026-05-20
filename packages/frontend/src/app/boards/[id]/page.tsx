'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Table2, GanttChartSquare, Plus, Download, Loader2, Lock } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { api } from '@/lib/api';
import { pmApi, type BoardData } from '@/lib/pm-api';
import TableView from '@/components/pm/TableView';
import TimelineView from '@/components/pm/TimelineView';
import ItemDetailPanel from '@/components/pm/ItemDetailPanel';
import BoardFilters, { applyFilters, emptyFilters, type BoardFilterState } from '@/components/pm/BoardFilters';

const COLUMN_TYPES = ['text', 'long_text', 'status', 'priority', 'person', 'date', 'timeline', 'number', 'dropdown', 'checkbox', 'reliability'] as const;

// 업무용 추천 컬럼 — 클릭 한 번으로 타입+초기 항목까지 세팅
const PRESET_COLUMNS: Record<string, { label: string; name: string; type: string; settings: any }> = {
  priority: {
    label: '우선순위 (High/Mid/Low)', name: '우선순위', type: 'priority',
    settings: { labels: [
      { id: 1, name: 'High', color: '#C8366E' },
      { id: 2, name: 'Mid', color: '#D4A22F' },
      { id: 3, name: 'Low', color: '#3F8C6E' },
    ] },
  },
  dept: { label: '담당부서 (리스트 관리)', name: '담당부서', type: 'dropdown', settings: { options: [] } },
  owner: { label: '담당자 (리스트 관리)', name: '담당자', type: 'dropdown', settings: { options: [] } },
  activity: {
    label: 'Activity (기획/개발/데모/테스트)', name: 'Activity', type: 'status',
    settings: { labels: [
      { id: 1, name: '기획', color: '#7E5BB5' },
      { id: 2, name: '개발', color: '#3C6FA5' },
      { id: 3, name: '데모', color: '#D4A22F' },
      { id: 4, name: '테스트', color: '#3F8C6E' },
    ] },
  },
};

function BoardContent() {
  const id = Number(useParams().id);
  const [data, setData] = useState<BoardData | null>(null);
  const [view, setView] = useState<'table' | 'timeline'>('table');
  const [canEdit, setCanEdit] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportOpts, setExportOpts] = useState<any>({ view: 'timeline', axis_unit: 'month', confidentiality: 'internal', conclusion: '' });
  const [filters, setFilters] = useState<BoardFilterState>(emptyFilters);
  const filtered = useMemo(() => data ? applyFilters(data, filters) : null, [data, filters]);

  const load = useCallback(async () => {
    try {
      const d = await pmApi.getBoardData(id);
      setData(d); setErr(null);
      // 권한 판정
      try {
        const me = await api.getMe();
        if ((me as any)?.role === 'admin') setCanEdit(true);
        else {
          const { members } = await pmApi.listMembers(d.board.projectId);
          const mine = members.find((m) => m.userId === (me as any)?.id);
          setCanEdit(mine?.role === 'owner' || mine?.role === 'editor');
        }
      } catch { setCanEdit(false); }
    } catch (e: any) { setErr(e.message); }
  }, [id]);
  useEffect(() => { if (id) load(); }, [id, load]);

  const addGroup = async () => { await pmApi.createGroup(id, { name: '새 그룹', color: '#3C6FA5' }); load(); };
  const addColumn = async (type: string) => {
    const settings = (type === 'status' || type === 'priority')
      ? { labels: [{ id: 1, name: '예정', color: '#888780' }, { id: 2, name: '진행중', color: '#3C6FA5' }, { id: 3, name: '완료', color: '#3F8C6E' }] }
      : {};
    await pmApi.createColumn(id, { name: type === 'timeline' ? '기간' : type === 'status' ? '상태' : '새 컬럼', type: type as any, settings });
    load();
  };
  const addPreset = async (key: string) => {
    const p = PRESET_COLUMNS[key]; if (!p) return;
    await pmApi.createColumn(id, { name: p.name, type: p.type as any, settings: p.settings });
    load();
  };

  const runExport = async () => {
    setExporting(true);
    try {
      const { blob, filename, meta } = await pmApi.exportBoard(id, exportOpts);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      if (meta?.warning) alert(`내보냄 (${meta.density_grade}, 레인 ${meta.lane_total}).\n⚠️ ${meta.warning}`);
      setShowExport(false);
    } catch (e: any) { alert(`Export 실패: ${e.message}`); }
    finally { setExporting(false); }
  };

  if (!data) return <div className="min-h-screen bg-paper p-8 text-[13px] text-[#888780]">{err || '불러오는 중…'}</div>;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[1500px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Link href={`/projects/${data.board.projectId}`} className="inline-flex items-center gap-1.5 text-[12px] text-[#5F5E5A] hover:text-[#A50034] mb-1.5">
              <ArrowLeft size={14} /> 프로젝트로
            </Link>
            <div className="flex items-center gap-2.5">
              <h1 className="font-medium text-[22px] text-[#1A1A1A] tracking-tight">{data.board.name}</h1>
              {!canEdit && <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#888780] px-2 py-0.5 bg-[#F0EEE8] rounded"><Lock size={11} /> 읽기전용</span>}
            </div>
          </div>
          <button onClick={() => setShowExport(true)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A50034] hover:bg-[#8B1538] text-white text-[13px] font-medium rounded-md">
            <Download size={15} /> 내보내기 (1장 PPTX)
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1">
            {([['table', 'Table', Table2], ['timeline', 'Timeline', GanttChartSquare]] as const).map(([k, lbl, Icon]) => (
              <button key={k} onClick={() => setView(k)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-medium rounded-md border ${view === k ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#5F5E5A] border-[#D3D1C7] hover:border-[#A50034]'}`}>
                <Icon size={14} /> {lbl}
              </button>
            ))}
            <span className="px-3 py-1.5 text-[11px] text-[#B8B6AE]">Kanban·Calendar (Phase 2)</span>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button onClick={addGroup} className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] text-[#5F5E5A] border border-[#D3D1C7] rounded-md hover:border-[#A50034]"><Plus size={13} /> 그룹</button>
              <select onChange={(e) => { if (e.target.value) { addPreset(e.target.value); e.target.value = ''; } }} defaultValue=""
                className="text-[12px] border border-[#D3D1C7] rounded-md px-2 py-1.5 text-[#5F5E5A]">
                <option value="">+ 추천 컬럼…</option>
                {Object.entries(PRESET_COLUMNS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
              </select>
              <select onChange={(e) => { if (e.target.value) { addColumn(e.target.value); e.target.value = ''; } }} defaultValue=""
                className="text-[12px] border border-[#D3D1C7] rounded-md px-2 py-1.5 text-[#5F5E5A]">
                <option value="">+ 컬럼 추가…</option>
                {COLUMN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        {err && <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-md p-3 mb-3">{err}</div>}

        <BoardFilters data={data} value={filters} onChange={setFilters} />

        {view === 'table'
          ? <TableView data={filtered!} canEdit={canEdit} onChanged={load} onOpenItem={setOpenItem} />
          : <TimelineView data={filtered!} canEdit={canEdit} onChanged={load} />}
      </div>

      {openItem != null && data && (
        <ItemDetailPanel boardData={data} itemId={openItem} canEdit={canEdit} onClose={() => setOpenItem(null)} onChanged={load} onOpenItem={setOpenItem} />
      )}

      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(26,26,26,0.5)' }} onClick={() => setShowExport(false)}>
          <div className="bg-white rounded-lg w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-medium text-[16px] text-[#1A1A1A] mb-1">단일 슬라이드 Export</h3>
            <p className="text-[12px] text-[#5F5E5A] mb-4">모든 그룹·아이템·기간을 누락 없이 LG 포맷 1장에 자동 맞춤(§11).</p>
            <div className="space-y-3 text-[13px]">
              <label className="flex items-center justify-between">뷰
                <select value={exportOpts.view} onChange={(e) => setExportOpts({ ...exportOpts, view: e.target.value })} className="border border-[#D3D1C7] rounded px-2 py-1">
                  <option value="timeline">Timeline</option><option value="table">Table</option>
                </select>
              </label>
              <label className="flex items-center justify-between">축 단위
                <select value={exportOpts.axis_unit} onChange={(e) => setExportOpts({ ...exportOpts, axis_unit: e.target.value })} className="border border-[#D3D1C7] rounded px-2 py-1">
                  <option value="week">주</option><option value="month">월</option><option value="quarter">분기</option>
                </select>
              </label>
              <label className="flex items-center justify-between">기밀등급
                <select value={exportOpts.confidentiality} onChange={(e) => setExportOpts({ ...exportOpts, confidentiality: e.target.value })} className="border border-[#D3D1C7] rounded px-2 py-1">
                  <option value="internal">내부</option><option value="confidential">대외비</option><option value="strict">대외비(엄격)</option>
                </select>
              </label>
              <div>
                <p className="mb-1">결론 박스 (선택)</p>
                <textarea value={exportOpts.conclusion} onChange={(e) => setExportOpts({ ...exportOpts, conclusion: e.target.value })}
                  rows={2} className="w-full border border-[#D3D1C7] rounded px-2 py-1.5 text-[12.5px] outline-none focus:border-[#A50034]" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowExport(false)} className="px-3 py-2 text-[13px] text-[#5F5E5A]">취소</button>
              <button onClick={runExport} disabled={exporting} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A50034] text-white text-[13px] rounded-md disabled:opacity-50">
                {exporting ? <><Loader2 size={14} className="animate-spin" /> 생성 중…</> : <><Download size={14} /> 다운로드</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BoardPage() {
  return <AuthGuard><BoardContent /></AuthGuard>;
}
