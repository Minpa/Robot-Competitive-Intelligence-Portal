'use client';
// 포트폴리오 뷰 (Phase 3 REQ-20) — 사용자가 멤버인 모든 프로젝트의 마일스톤·기간 항목을 단일 타임라인에.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { pmApi, type PmProject } from '@/lib/pm-api';
import CommandPalette from '@/components/pm/CommandPalette';

type Item = { projectId: number; boardId: number; boardName: string; itemId: number; name: string; start: string; end: string; kind: 'range' | 'milestone' };
type Unit = 'month' | 'quarter';

function pad(n: number) { return String(n).padStart(2, '0'); }
function toDate(s?: string | null): Date | null { if (!s) return null; const d = new Date(s); return Number.isNaN(d.getTime()) ? null : d; }
function periodKey(d: Date, u: Unit): string { const y = d.getFullYear(); return u === 'quarter' ? `${y}Q${Math.floor(d.getMonth() / 3) + 1}` : `${y}M${pad(d.getMonth() + 1)}`; }
function label(d: Date, u: Unit): string { const y = d.getFullYear(); return u === 'quarter' ? `${y} Q${Math.floor(d.getMonth() / 3) + 1}` : `${y}.${pad(d.getMonth() + 1)}`; }
function step(d: Date, u: Unit): Date { const n = new Date(d); n.setMonth(n.getMonth() + (u === 'quarter' ? 3 : 1)); return n; }

function PortfolioContent() {
  const [projects, setProjects] = useState<PmProject[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [unit, setUnit] = useState<Unit>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pmApi.portfolio()
      .then((r) => { setProjects(r.projects); setItems(r.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const model = useMemo(() => {
    let min: Date | null = null, max: Date | null = null;
    for (const it of items) {
      const s = toDate(it.start), e = toDate(it.end);
      if (s && (!min || s < min)) min = s;
      if (e && (!max || e > max)) max = e;
    }
    if (!min) min = new Date();
    if (!max) max = step(new Date(), unit);
    // 기본 6개월/4분기 폭 보장
    const cap = unit === 'month' ? 18 : 12;
    const periods: { key: string; label: string; date: Date }[] = [];
    let cur = new Date(min);
    while (cur <= max && periods.length < cap) {
      periods.push({ key: periodKey(cur, unit), label: label(cur, unit), date: new Date(cur) });
      cur = step(cur, unit);
    }
    if (!periods.length) periods.push({ key: periodKey(min, unit), label: label(min, unit), date: min });
    const idx = (d: Date) => Math.max(0, periods.findIndex((p) => p.key === periodKey(d, unit)));
    return { periods, idx };
  }, [items, unit]);

  const itemsByProject = useMemo(() => {
    const m = new Map<number, Item[]>();
    for (const it of items) { (m.get(it.projectId) ?? m.set(it.projectId, []).get(it.projectId)!).push(it); }
    return m;
  }, [items]);

  const colW = unit === 'month' ? 92 : 140;
  const labelW = 200;
  const todayIdx = useMemo(() => model.periods.findIndex((p) => p.key === periodKey(new Date(), unit)), [model, unit]);

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[1500px] mx-auto px-6 py-6">
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-[12px] text-[#5F5E5A] hover:text-[#A50034] mb-3">
          <ArrowLeft size={14} /> 프로젝트 목록
        </Link>
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <LayoutGrid size={22} className="text-[#A50034]" />
              <h1 className="font-medium text-[24px] text-[#1A1A1A] tracking-tight">포트폴리오</h1>
              <span className="font-mono text-[10px] text-[#A50034] tracking-[0.14em] px-2 py-0.5 bg-[#FAEAE7]">Phase 3 · REQ-20</span>
            </div>
            <p className="text-[13px] text-[#5F5E5A] mt-1">참여 중인 모든 프로젝트의 마일스톤·기간 항목을 한 타임라인에 통합.</p>
          </div>
          <div className="flex items-center gap-1 text-[12px]">
            <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.12em] mr-1">축</span>
            {(['month', 'quarter'] as Unit[]).map((u) => (
              <button key={u} onClick={() => setUnit(u)}
                className={`px-2.5 py-1 rounded border ${unit === u ? 'bg-[#A50034] text-white border-[#A50034]' : 'bg-white text-[#5F5E5A] border-[#D3D1C7]'}`}>
                {u === 'month' ? '월' : '분기'}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="text-[13px] text-[#888780] py-10 text-center">불러오는 중…</p>}
        {!loading && projects.length === 0 && (
          <p className="text-[13px] text-[#888780] py-10 text-center">참여 중인 프로젝트가 없습니다.</p>
        )}
        {!loading && projects.length > 0 && (
          <div className="bg-white border border-[#E2DED4] rounded-lg overflow-auto">
            <div style={{ minWidth: labelW + model.periods.length * colW }}>
              <div className="flex sticky top-0 bg-[#FAFAF7] border-b border-[#E2DED4] z-10">
                <div style={{ width: labelW }} className="shrink-0 border-r border-[#E2DED4] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F5E5A]">프로젝트</div>
                {model.periods.map((p, i) => (
                  <div key={p.key} style={{ width: colW }}
                    className={`shrink-0 text-center py-2 text-[10.5px] text-[#5F5E5A] border-r border-[#EFEDE6] ${p.date.getMonth() % 3 === 0 ? 'font-semibold' : ''}`}>
                    {p.label}
                  </div>
                ))}
              </div>
              {projects.map((proj) => {
                const projItems = itemsByProject.get(proj.id) ?? [];
                const laneH = 30; const padding = 6;
                // 단순 lane-packing (start 기준 정렬, 겹치면 다음 lane)
                const laneEnd: number[] = [];
                const placed = projItems
                  .map((it) => {
                    const s = toDate(it.start), e = toDate(it.end);
                    if (!s) return null;
                    return { it, s: model.idx(s), e: e ? model.idx(e) : model.idx(s) };
                  })
                  .filter(Boolean)
                  .sort((a, b) => (a!.s - b!.s))
                  .map((b) => {
                    let lane = 0;
                    while (lane < laneEnd.length && (laneEnd[lane] ?? -1) >= b!.s) lane++;
                    laneEnd[lane] = b!.e;
                    return { ...b!, lane };
                  });
                const laneCount = Math.max(1, laneEnd.length);
                return (
                  <div key={proj.id} className="flex border-b border-[#E2DED4]">
                    <div style={{ width: labelW, minHeight: laneCount * laneH + padding * 2 }}
                      className="shrink-0 border-r border-[#E2DED4] px-3 py-2 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: proj.color || '#A50034' }} />
                      <Link href={`/projects/${proj.id}`} className="font-medium text-[12.5px] text-[#1A1A1A] hover:text-[#A50034] truncate">{proj.name}</Link>
                    </div>
                    <div className="relative" style={{ width: model.periods.length * colW, height: laneCount * laneH + padding * 2 }}>
                      {model.periods.map((p, i) => (
                        <div key={p.key} className={`absolute top-0 bottom-0 border-r ${p.date.getMonth() % 3 === 0 ? 'border-[#D3D1C7]' : 'border-[#F2F0EA]'}`}
                          style={{ left: i * colW, width: colW }} />
                      ))}
                      {todayIdx >= 0 && (
                        <div className="absolute top-0 bottom-0 w-px bg-[#A50034] z-10" style={{ left: todayIdx * colW + colW / 2 }} />
                      )}
                      {placed.map((b) => {
                        const left = b.s * colW + 4;
                        const w = Math.max(colW - 8, (b.e - b.s + 1) * colW - 8);
                        const top = padding + b.lane * laneH + 5;
                        const color = proj.color || '#A50034';
                        if (b.it.kind === 'milestone') {
                          return (
                            <Link key={b.it.itemId} href={`/boards/${b.it.boardId}`}
                              title={`${b.it.name} (${b.it.boardName})`}
                              className="absolute" style={{ left: left + 4, top: top + 2 }}>
                              <div className="w-3 h-3 rotate-45 hover:scale-125 transition-transform" style={{ backgroundColor: color }} />
                              <span className="absolute left-5 top-0 whitespace-nowrap text-[10.5px] text-[#1A1A1A]">{b.it.name}</span>
                            </Link>
                          );
                        }
                        return (
                          <Link key={b.it.itemId} href={`/boards/${b.it.boardId}`}
                            title={`${b.it.name} (${b.it.boardName})`}
                            className="absolute rounded text-[10.5px] text-white px-2 flex items-center overflow-hidden hover:opacity-90"
                            style={{ left, width: w, top, height: laneH - 10, backgroundColor: color }}>
                            <span className="truncate">{b.it.name}</span>
                          </Link>
                        );
                      })}
                      {placed.length === 0 && (
                        <p className="absolute inset-0 flex items-center justify-center text-[11px] text-[#B8B6AE]">timeline·date 항목 없음</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PortfolioPage() { return <AuthGuard><PortfolioContent /><CommandPalette /></AuthGuard>; }
