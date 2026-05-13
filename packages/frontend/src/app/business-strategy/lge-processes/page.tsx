'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wrench, Hand, Package } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import {
  LGE_WASHER_PROCESSES,
  getWasherProcessStats,
  type LgeProcess,
  type EeNeeded,
} from '@/components/cloid-coverage/lge-washer-processes';
import type { TaskCategory } from '@/components/cloid-coverage/data-v13';

const CATEGORY_COLOR: Record<TaskCategory, { bg: string; border: string; text: string }> = {
  '단순 이재': { bg: '#E8F5EE', border: '#3F8C6E', text: '#0F4F32' },
  '정밀 조작': { bg: '#FBEAF0', border: '#C8366E', text: '#7A0F2C' },
  '도구 운용': { bg: '#FBF1D6', border: '#D4A22F', text: '#5A3F0A' },
};

const EE_LABEL: Record<EeNeeded, { ko: string; icon: React.ReactNode }> = {
  gripper: { ko: '그리퍼',  icon: <Package size={12} /> },
  hand:    { ko: '핸드',    icon: <Hand size={12} /> },
  tool:    { ko: '도구',    icon: <Wrench size={12} /> },
};

function Pill({
  bg, border, text, children,
}: { bg: string; border: string; text: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10.5px] font-medium"
      style={{ backgroundColor: bg, color: text, border: `1px solid ${border}`, borderRadius: 3 }}
    >
      {children}
    </span>
  );
}

function LgeProcessesContent() {
  const stats = useMemo(getWasherProcessStats, []);
  const [filterCat, setFilterCat] = useState<TaskCategory | 'all'>('all');
  const [filterEe, setFilterEe] = useState<EeNeeded | 'all'>('all');

  const visible = LGE_WASHER_PROCESSES.filter((p) => {
    if (filterCat !== 'all' && p.category !== filterCat) return false;
    if (filterEe !== 'all' && p.ee !== filterEe) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-paper" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-3 text-[12px] text-[#5F5E5A]">
          <Link href="/business-strategy" className="hover:text-[#8B1538]">ARGOS 도메인 확장</Link>
          <span className="text-[#B8B6AE]">/</span>
          <span className="text-[#2C2C2A] font-medium">LGE 세탁기 라인 공정</span>
        </div>

        <Link
          href="/business-strategy"
          className="inline-flex items-center gap-1.5 text-[12px] text-[#5F5E5A] hover:text-[#8B1538] mb-4"
        >
          <ArrowLeft size={14} />
          ARGOS로 돌아가기
        </Link>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-medium text-[26px] text-[#1A1A1A] tracking-tight">LGE 세탁기 라인 공정 분석</h1>
            <span className="font-mono text-[11px] text-[#A50034] font-medium tracking-[0.14em] px-2 py-0.5 bg-[#FAEAE7]">
              LG Captive
            </span>
          </div>
          <p className="text-[13.5px] text-[#5F5E5A] leading-relaxed max-w-[920px]">
            LGE 자사 세탁기 라인의 <strong>{stats.total}개 공정</strong>을 작업 종류 (단순 이재 / 정밀 조작 / 도구 운용)와
            필요 EE (그리퍼 / 핸드 / 도구)로 분류. 매트릭스의 ⑤ 나사 / ⑥ 커넥터 / ⑦ 케이블 셀과 연결되며,
            LGE 라인 PoC 우선 진입 후보를 정하는 1차 근거 데이터.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard label="총 공정" value={stats.total.toString()} note="세탁기 라인" accent />
          <StatCard label="단순 이재" value={stats.byCategory['단순 이재'].toString()} note="그리퍼" />
          <StatCard label="정밀 조작" value={stats.byCategory['정밀 조작'].toString()} note="핸드 필수" />
          <StatCard label="도구 운용" value={stats.byCategory['도구 운용'].toString()} note="드라이버·체결" />
        </div>

        {/* EE breakdown */}
        <div className="bg-white border border-[#E8E6DD] p-4 mb-4" style={{ borderRadius: 8 }}>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mb-2">필요 EE 분포</p>
          <div className="flex flex-wrap gap-4 text-[13px]">
            <span className="inline-flex items-center gap-1.5">
              <Package size={14} className="text-[#1f6647]" />
              <span className="font-medium text-[#1A1A1A]">그리퍼</span>
              <span className="font-mono text-[#5F5E5A]">{stats.byEe.gripper}건</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Hand size={14} className="text-[#7A0F2C]" />
              <span className="font-medium text-[#1A1A1A]">핸드</span>
              <span className="font-mono text-[#5F5E5A]">{stats.byEe.hand}건</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wrench size={14} className="text-[#7a5a14]" />
              <span className="font-medium text-[#1A1A1A]">도구 (드라이버)</span>
              <span className="font-mono text-[#5F5E5A]">{stats.byEe.tool}건</span>
            </span>
            <span className="ml-auto font-mono text-[10.5px] text-[#888780]">
              매트릭스 셀 매핑: ⑤ {stats.byCell['⑤'] || 0} · ⑥ {stats.byCell['⑥'] || 0} · ⑦ {stats.byCell['⑦'] || 0}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em]">필터:</span>
          {(['all', '단순 이재', '정밀 조작', '도구 운용'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilterCat(c as any)}
              className={`px-2.5 py-1 text-[11.5px] font-medium border transition-colors ${
                filterCat === c ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#5F5E5A] border-[#D3D1C7] hover:border-[#8B1538]'
              }`}
              style={{ borderRadius: 3 }}
            >
              {c === 'all' ? '전체' : c}
            </button>
          ))}
          <span className="text-[#B8B6AE]">|</span>
          {(['all', 'gripper', 'hand', 'tool'] as const).map((e) => (
            <button
              key={e}
              onClick={() => setFilterEe(e as any)}
              className={`px-2.5 py-1 text-[11.5px] font-medium border transition-colors ${
                filterEe === e ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-[#5F5E5A] border-[#D3D1C7] hover:border-[#8B1538]'
              }`}
              style={{ borderRadius: 3 }}
            >
              {e === 'all' ? '전체' : EE_LABEL[e as EeNeeded].ko}
            </button>
          ))}
          <span className="ml-auto font-mono text-[10.5px] text-[#888780]">
            {visible.length}/{stats.total} 표시
          </span>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E8E6DD]" style={{ borderRadius: 8, overflow: 'hidden' }}>
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-[#FAFAF7]">
                <th className="text-left p-2.5 border-b border-[#E8E6DD] font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F5E5A] w-10">#</th>
                <th className="text-left p-2.5 border-b border-[#E8E6DD] font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F5E5A]">공정명</th>
                <th className="text-left p-2.5 border-b border-[#E8E6DD] font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F5E5A]">작업 내용</th>
                <th className="text-left p-2.5 border-b border-[#E8E6DD] font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F5E5A] w-28">분류</th>
                <th className="text-left p-2.5 border-b border-[#E8E6DD] font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F5E5A] w-20">EE</th>
                <th className="text-left p-2.5 border-b border-[#E8E6DD] font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F5E5A] w-12">셀</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <ProcessRow key={p.id} p={p} />
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-[13px] text-[#5F5E5A] py-8">
                    필터에 해당하는 공정이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="font-mono text-[10.5px] text-[#888780] mt-4 leading-relaxed">
          ⓘ 셀 컬럼은 진입성 매트릭스의 task 번호 (⑤ 나사 / ⑥ 커넥터 / ⑦ 케이블) — 클릭 시 해당 CLOiD 커버리지 상세로 이동.
        </p>
      </div>
    </div>
  );
}

function ProcessRow({ p }: { p: LgeProcess }) {
  const catColor = CATEGORY_COLOR[p.category];
  const ee = EE_LABEL[p.ee];
  // Map cellNum to coverage page route (only entry-fit cells have details)
  const cellRoute: Record<string, string> = {
    '⑤': '/business-strategy/cloid-coverage/v13/screw-electronics',
    '⑥': '/business-strategy/cloid-coverage/v13/connector-electronics',
    '⑦': '/business-strategy/cloid-coverage/v13/cable-battery', // 가전 케이블은 ⑦ 케이블/배터리와 유사
  };
  return (
    <tr className="hover:bg-[#FAFAF7]/50">
      <td className="p-2.5 border-b border-[#E8E6DD] align-top font-mono text-[11px] text-[#5F5E5A]">{p.id}</td>
      <td className="p-2.5 border-b border-[#E8E6DD] align-top">
        <p className="font-medium text-[#1A1A1A]">{p.name}</p>
        {p.notes && <p className="text-[11px] text-[#5F5E5A] mt-0.5">{p.notes}</p>}
      </td>
      <td className="p-2.5 border-b border-[#E8E6DD] align-top text-[12.5px] text-[#1A1A1A] leading-relaxed">{p.work}</td>
      <td className="p-2.5 border-b border-[#E8E6DD] align-top">
        <Pill bg={catColor.bg} border={catColor.border} text={catColor.text}>
          {p.category}
        </Pill>
      </td>
      <td className="p-2.5 border-b border-[#E8E6DD] align-top">
        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#1A1A1A]">
          {ee.icon} {ee.ko}
        </span>
      </td>
      <td className="p-2.5 border-b border-[#E8E6DD] align-top">
        {p.cellNum && cellRoute[p.cellNum] ? (
          <Link
            href={cellRoute[p.cellNum]}
            className="font-mono text-[13px] text-[#8B1538] hover:underline font-bold"
          >
            {p.cellNum}
          </Link>
        ) : (
          <span className="font-mono text-[11px] text-[#B8B6AE]">{p.cellNum || '—'}</span>
        )}
      </td>
    </tr>
  );
}

function StatCard({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return (
    <div
      className={`p-4 border ${accent ? 'border-[#8B1538] bg-[#FAEAE7]/40' : 'border-[#E8E6DD] bg-white'}`}
      style={{ borderRadius: 8 }}
    >
      <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.2em]">{label}</p>
      <p
        className={`font-medium text-[28px] mt-1 leading-none ${accent ? 'text-[#8B1538]' : 'text-[#2C2C2A]'}`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </p>
      <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mt-1.5">{note}</p>
    </div>
  );
}

export default function LgeProcessesPage() {
  return (
    <AuthGuard>
      <LgeProcessesContent />
    </AuthGuard>
  );
}
