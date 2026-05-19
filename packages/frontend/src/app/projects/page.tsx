'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { pmApi, type PmProject } from '@/lib/pm-api';

function ProjectsContent() {
  const [projects, setProjects] = useState<PmProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try { setProjects((await pmApi.listProjects()).projects); setErr(null); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    try {
      await pmApi.createProject({ name: name.trim() });
      setName(''); setCreating(false); load();
    } catch (e: any) { setErr(e.message); }
  };

  const visible = projects.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <FolderKanban size={22} className="text-[#A50034]" />
              <h1 className="font-medium text-[24px] text-[#1A1A1A] tracking-tight">ARGOS Projects</h1>
              <span className="font-mono text-[10px] text-[#A50034] tracking-[0.14em] px-2 py-0.5 bg-[#FAEAE7]">v2.1 · Phase 1</span>
            </div>
            <p className="text-[13px] text-[#5F5E5A] mt-1">프로젝트·일정 통합 관리 — 보드 데이터를 LG 포맷 1장으로 내보내기</p>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#A50034] hover:bg-[#8B1538] text-white font-medium text-[13px] rounded-md transition-colors"
          >
            <Plus size={15} /> 새 프로젝트
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 bg-white border border-[#E2DED4] rounded-md px-3 py-2 max-w-sm">
          <Search size={15} className="text-[#888780]" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="프로젝트 검색"
            className="flex-1 text-[13px] outline-none bg-transparent"
          />
        </div>

        {creating && (
          <div className="bg-white border border-[#A50034] rounded-md p-4 mb-4 flex items-center gap-3">
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false); }}
              placeholder="프로젝트 이름 (예: CES 2027 대응)"
              className="flex-1 text-[14px] border border-[#E2DED4] rounded px-3 py-2 outline-none focus:border-[#A50034]"
            />
            <button onClick={create} className="px-4 py-2 bg-[#A50034] text-white text-[13px] rounded-md">생성</button>
            <button onClick={() => setCreating(false)} className="px-3 py-2 text-[#5F5E5A] text-[13px]">취소</button>
          </div>
        )}

        {err && <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-md p-3 mb-4">{err}</div>}
        {loading ? (
          <p className="text-[13px] text-[#888780] py-10 text-center">불러오는 중…</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-[#888780]">
            <FolderKanban size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[14px]">아직 프로젝트가 없습니다. “새 프로젝트”로 시작하세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {visible.map((p) => (
              <Link
                key={p.id} href={`/projects/${p.id}`}
                className="group bg-white border border-[#E2DED4] hover:border-[#A50034] hover:shadow-md rounded-lg p-5 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || '#A50034' }} />
                  {p.code && <span className="font-mono text-[10px] text-[#888780] uppercase tracking-[0.14em]">{p.code}</span>}
                  {p.status === 'archived' && <span className="font-mono text-[10px] text-[#888780]">보관됨</span>}
                </div>
                <p className="font-medium text-[16px] text-[#1A1A1A] group-hover:text-[#A50034]">{p.name}</p>
                {p.description && <p className="text-[12.5px] text-[#5F5E5A] mt-1 line-clamp-2">{p.description}</p>}
                <p className="font-mono text-[10.5px] text-[#888780] mt-3">업데이트 {new Date(p.updatedAt).toLocaleDateString('ko-KR')}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return <AuthGuard><ProjectsContent /></AuthGuard>;
}
