'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit3 } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';

const API_BASE = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
})();

interface HumanoidModelListItem {
  id: number;
  modelName: string;
  codeName: string | null;
  formFactor: 'Wheel' | 'Biped' | 'Quadruped' | 'Other';
  isPotential: boolean;
  releasePhase: string | null;
  releaseTargetDate: string | null;
  physical?: { height_mm?: number; weight_kg?: number };
  manipulation?: { payload_single_kg?: number };
  updatedAt: string;
}

const PHASE_COLOR: Record<string, string> = {
  '양산 중': '#3B6D11',
  'Pilot':   '#0C447C',
  '시제품':  '#B8892B',
  '조사 중': '#888780',
  '미정':    '#888780',
};

const FORM_FACTOR_LABEL: Record<string, string> = {
  Wheel: '휠형',
  Biped: '이족',
  Quadruped: '4족',
  Other: '기타',
};

function HumanoidSpecsListContent() {
  const [models, setModels] = useState<HumanoidModelListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/humanoid-specs`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: HumanoidModelListItem[]) => setModels(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <header className="flex items-center justify-between pb-4 mb-6 border-b border-[#E8E6DD]">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#A50034]" />
            <h1 className="font-medium text-[24px] text-[#2C2C2A] tracking-tight">
              LG 휴머노이드 스펙
            </h1>
            <span className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.18em] hidden md:inline">
              모델 {models.length}개 / Lineup
            </span>
          </div>
          <Link
            href="/lg-humanoid-specs/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#A50034] text-white font-medium text-[13px] hover:bg-[#751029] transition-colors"
            style={{ borderRadius: 4 }}
          >
            <Plus size={16} strokeWidth={2} />
            신규 모델 추가
          </Link>
        </header>

        {loading && (
          <p className="text-[14px] text-[#888780]">불러오는 중…</p>
        )}
        {error && (
          <div className="border border-[#FAEAE7] bg-[#FAEAE7]/40 p-4" style={{ borderRadius: 8 }}>
            <p className="text-[13px] text-[#A50034]">데이터 로드 실패: {error}</p>
            <p className="text-[11.5px] text-[#5F5E5A] mt-1">
              backend가 실행 중인지 확인하세요 ({API_BASE}/humanoid-specs)
            </p>
          </div>
        )}

        {!loading && !error && models.length === 0 && (
          <div className="border border-[#E8E6DD] bg-[#FAFAF8] p-8 text-center" style={{ borderRadius: 8 }}>
            <p className="text-[14px] text-[#5F5E5A]">
              등록된 모델이 없습니다. 시드 스크립트를 실행하거나 신규 모델을 추가하세요.
            </p>
            <p className="font-mono text-[10.5px] text-[#888780] mt-2 tracking-wide">
              cd packages/backend && npm run seed:humanoid-models
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((m) => {
            const phaseColor = PHASE_COLOR[m.releasePhase || '미정'] || '#888780';
            return (
              <Link
                key={m.id}
                href={`/lg-humanoid-specs/${m.id}`}
                className="border border-[#E8E6DD] bg-white p-4 hover:border-[#A50034] hover:shadow-sm transition-all flex flex-col gap-2"
                style={{ borderRadius: 8 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-[16px] text-[#2C2C2A] truncate">
                      {m.modelName}
                    </h3>
                    {m.codeName && (
                      <p className="font-mono text-[10.5px] text-[#888780] tracking-wide mt-0.5">
                        {m.codeName}
                      </p>
                    )}
                  </div>
                  {m.isPotential && (
                    <span
                      className="font-mono text-[9px] font-medium uppercase tracking-[0.16em] px-1.5 py-0.5 bg-[#FAEAE7] text-[#A50034] shrink-0"
                      style={{ borderRadius: 3 }}
                    >
                      잠재
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11.5px]">
                  <span className="text-[#5F5E5A]">{FORM_FACTOR_LABEL[m.formFactor] || m.formFactor}</span>
                  {m.releasePhase && (
                    <>
                      <span className="text-[#D3D1C7]">·</span>
                      <span style={{ color: phaseColor }} className="font-medium">
                        {m.releasePhase}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#5F5E5A] mt-1">
                  {m.physical?.height_mm != null && (
                    <span>키 <span className="text-[#2C2C2A] font-medium">{m.physical.height_mm}mm</span></span>
                  )}
                  {m.physical?.weight_kg != null && (
                    <span>무게 <span className="text-[#2C2C2A] font-medium">{m.physical.weight_kg}kg</span></span>
                  )}
                  {m.manipulation?.payload_single_kg != null && (
                    <span>페이로드 <span className="text-[#2C2C2A] font-medium">{m.manipulation.payload_single_kg}kg</span></span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 mt-auto border-t border-[#E8E6DD]">
                  <span className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.16em]">
                    {new Date(m.updatedAt).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })} 업데이트
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#A50034] font-medium">
                    <Edit3 size={11} strokeWidth={2} />
                    상세
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HumanoidSpecsListPage() {
  return (
    <AuthGuard>
      <HumanoidSpecsListContent />
    </AuthGuard>
  );
}
