'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trello, Users, History, Trash2, LayoutDashboard, AlertCircle } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { pmApi, type PmProject, type PmBoard, type PmMember } from '@/lib/pm-api';

function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [project, setProject] = useState<PmProject | null>(null);
  const [boards, setBoards] = useState<PmBoard[]>([]);
  const [members, setMembers] = useState<PmMember[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [tab, setTab] = useState<'boards' | 'dashboard' | 'members' | 'activity'>('boards');
  const [err, setErr] = useState<string | null>(null);
  const [newBoard, setNewBoard] = useState('');
  const [newMemberId, setNewMemberId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('editor');

  const load = async () => {
    try {
      const r = await pmApi.getProject(id);
      setProject(r.project); setBoards(r.boards);
      setMembers((await pmApi.listMembers(id)).members);
    } catch (e: any) { setErr(e.message); }
  };
  useEffect(() => { if (id) load(); }, [id]);
  useEffect(() => { if (tab === 'activity' && id) pmApi.activity(id).then((r) => setActivity(r.activity)).catch(() => {}); }, [tab, id]);
  useEffect(() => { if (tab === 'dashboard' && id) pmApi.dashboard(id).then(setDashboard).catch(() => {}); }, [tab, id]);

  const addBoard = async () => {
    if (!newBoard.trim()) return;
    await pmApi.createBoard(id, { name: newBoard.trim(), reportCycle: 'weekly' });
    setNewBoard(''); load();
  };
  const addMember = async () => {
    if (!newMemberId.trim()) return;
    try { await pmApi.addMember(id, newMemberId.trim(), newMemberRole); setNewMemberId(''); load(); }
    catch (e: any) { setErr(e.message); }
  };

  if (!project) return <div className="min-h-screen bg-paper p-8 text-[13px] text-[#888780]">{err || '불러오는 중…'}</div>;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[1100px] mx-auto px-6 py-8">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-[12px] text-[#5F5E5A] hover:text-[#A50034] mb-4">
          <ArrowLeft size={14} /> 프로젝트 목록
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: project.color || '#A50034' }} />
          <h1 className="font-medium text-[24px] text-[#1A1A1A] tracking-tight">{project.name}</h1>
        </div>
        {project.description && <p className="text-[13px] text-[#5F5E5A] mb-5">{project.description}</p>}

        <div className="flex gap-1 border-b border-[#E2DED4] mb-5">
          {([['boards', '보드', Trello], ['dashboard', '대시보드', LayoutDashboard], ['members', '멤버', Users], ['activity', '활동 로그', History]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors ${tab === k ? 'border-[#A50034] text-[#A50034]' : 'border-transparent text-[#5F5E5A] hover:text-[#1A1A1A]'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {err && <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-md p-3 mb-4">{err}</div>}

        {tab === 'boards' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <input value={newBoard} onChange={(e) => setNewBoard(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBoard()}
                placeholder="새 보드 이름 (예: 추진 일정)"
                className="text-[13px] border border-[#E2DED4] rounded px-3 py-2 outline-none focus:border-[#A50034] w-72" />
              <button onClick={addBoard} className="inline-flex items-center gap-1 px-3 py-2 bg-[#A50034] text-white text-[12.5px] rounded-md"><Plus size={14} />보드 추가</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {boards.map((b) => (
                <Link key={b.id} href={`/boards/${b.id}`} className="group bg-white border border-[#E2DED4] hover:border-[#A50034] hover:shadow-sm rounded-lg p-4 transition-all">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-[15px] text-[#1A1A1A] group-hover:text-[#A50034]">{b.name}</p>
                    <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.12em]">{b.reportCycle}</span>
                  </div>
                  {b.description && <p className="text-[12px] text-[#5F5E5A] mt-1">{b.description}</p>}
                </Link>
              ))}
              {boards.length === 0 && <p className="text-[13px] text-[#888780] py-6">보드가 없습니다. 위에서 추가하세요.</p>}
            </div>
          </>
        )}

        {tab === 'dashboard' && (
          dashboard == null ? <p className="text-[13px] text-[#888780] py-6">불러오는 중…</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="보드" value={dashboard.boards.length} />
                <StatCard label="아이템" value={dashboard.totalItems} />
                <StatCard label="완료" value={dashboard.completedItems} note={dashboard.totalItems ? `${Math.round(dashboard.completedItems / dashboard.totalItems * 100)}%` : ''} accent />
                <StatCard label="마감 임박 (7일)" value={dashboard.dueSoon.length} />
              </div>
              {Object.keys(dashboard.byStatus).length > 0 && (
                <div className="bg-white border border-[#E2DED4] rounded-lg p-4">
                  <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mb-2">상태 분포</p>
                  <div className="space-y-1.5">
                    {Object.entries<any>(dashboard.byStatus).sort((a, b) => b[1].count - a[1].count).map(([n, info]) => {
                      const pct = dashboard.totalItems ? (info.count / dashboard.totalItems) * 100 : 0;
                      return (
                        <div key={n} className="flex items-center gap-2 text-[12.5px]">
                          <span className="w-20 truncate text-[#1A1A1A]">{n}</span>
                          <div className="flex-1 h-3 bg-[#FAFAF7] rounded overflow-hidden">
                            <div className="h-full" style={{ width: `${pct}%`, backgroundColor: info.color }} />
                          </div>
                          <span className="font-mono text-[11px] text-[#5F5E5A] w-12 text-right">{info.count}</span>
                          <span className="font-mono text-[10.5px] text-[#888780] w-12 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="bg-white border border-[#E2DED4] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-[#A50034]" />
                  <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em]">마감 임박 — 7일 이내</p>
                </div>
                {dashboard.dueSoon.length === 0 ? (
                  <p className="text-[12px] text-[#B8B6AE]">임박한 마감이 없습니다.</p>
                ) : (
                  <ul className="divide-y divide-[#EFEDE6]">
                    {dashboard.dueSoon.map((d: any) => (
                      <li key={d.itemId} className="flex items-center justify-between py-1.5">
                        <Link href={`/boards/${d.boardId}`} className="text-[12.5px] text-[#1A1A1A] hover:text-[#A50034] truncate">{d.name}</Link>
                        <span className="font-mono text-[11px] text-[#A50034] shrink-0 ml-3">{d.end}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        )}

        {tab === 'members' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <input value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)}
                placeholder="사용자 ID (ARGOS user uuid)"
                className="text-[13px] border border-[#E2DED4] rounded px-3 py-2 outline-none focus:border-[#A50034] w-80" />
              <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} className="text-[13px] border border-[#E2DED4] rounded px-2 py-2">
                <option value="owner">owner</option><option value="editor">editor</option><option value="viewer">viewer</option>
              </select>
              <button onClick={addMember} className="inline-flex items-center gap-1 px-3 py-2 bg-[#A50034] text-white text-[12.5px] rounded-md"><Plus size={14} />추가</button>
            </div>
            <div className="bg-white border border-[#E2DED4] rounded-lg divide-y divide-[#EFEDE6]">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                  <span className="font-mono text-[12px] text-[#5F5E5A]">{m.userId}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-[#F0EEE8] rounded">{m.role}</span>
                    <button onClick={async () => { await pmApi.removeMember(m.id); load(); }} className="text-[#888780] hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'activity' && (
          <div className="bg-white border border-[#E2DED4] rounded-lg divide-y divide-[#EFEDE6]">
            {activity.length === 0 && <p className="text-[13px] text-[#888780] p-4">활동 기록이 없습니다.</p>}
            {activity.map((a) => (
              <div key={a.id} className="px-4 py-2.5 text-[12.5px] flex items-center justify-between">
                <span><span className="font-mono text-[11px] text-[#A50034]">{a.action}</span> · {a.entityType}</span>
                <span className="font-mono text-[10.5px] text-[#888780]">{new Date(a.createdAt).toLocaleString('ko-KR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, note, accent }: { label: string; value: number | string; note?: string; accent?: boolean }) {
  return (
    <div className={`p-4 border rounded-lg ${accent ? 'border-[#A50034] bg-[#FAEAE7]/40' : 'border-[#E2DED4] bg-white'}`}>
      <p className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.16em]">{label}</p>
      <p className={`font-medium text-[26px] mt-1 leading-none ${accent ? 'text-[#A50034]' : 'text-[#1A1A1A]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {note && <p className="font-mono text-[10.5px] text-[#888780] mt-1.5">{note}</p>}
    </div>
  );
}

export default function ProjectDetailPage() {
  return <AuthGuard><ProjectDetailContent /></AuthGuard>;
}
