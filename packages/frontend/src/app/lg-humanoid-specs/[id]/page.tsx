'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Edit3 } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';

const API_BASE = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
})();

interface HumanoidModel {
  id: number;
  modelName: string;
  codeName: string | null;
  formFactor: string;
  isPotential: boolean;
  releasePhase: string | null;
  releaseTargetDate: string | null;
  basicInfo: Record<string, unknown>;
  physical: Record<string, unknown>;
  locomotion: Record<string, unknown>;
  manipulation: Record<string, unknown>;
  perception: Record<string, unknown>;
  aiCompute: Record<string, unknown>;
  safety: Record<string, unknown>;
  commercial: Record<string, unknown>;
  eeOptions: Record<string, unknown>;
  notes: string | null;
  updatedAt: string;
}

const SECTIONS: { key: keyof HumanoidModel; title: string }[] = [
  { key: 'basicInfo',     title: '기본 정보' },
  { key: 'physical',      title: '물리 사양' },
  { key: 'locomotion',    title: '이동 능력' },
  { key: 'manipulation',  title: '매니퓰레이션' },
  { key: 'perception',    title: '인지 / 센서' },
  { key: 'aiCompute',     title: 'AI / 컴퓨팅' },
  { key: 'safety',        title: '인증 / 안전' },
  { key: 'commercial',    title: '가격 / 판매' },
  { key: 'eeOptions',     title: 'EE 옵션 (9-카테고리)' },
];

function DetailContent() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [model, setModel] = useState<HumanoidModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/humanoid-specs/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: HumanoidModel) => setModel(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-[14px] text-[#888780]">불러오는 중…</div>;
  if (error || !model) {
    return (
      <div className="p-8 text-[14px] text-[#A50034]">
        모델을 찾을 수 없습니다 {error && `(${error})`}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" style={{ color: '#2C2C2A' }}>
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-6 md:py-8">
        <Link
          href="/lg-humanoid-specs"
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#D3D1C7] text-[#2C2C2A] hover:border-[#A50034] hover:text-[#A50034] text-[12px] font-medium transition-colors mb-6"
          style={{ borderRadius: 4 }}
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          목록으로
        </Link>

        <header className="flex items-start justify-between pb-5 mb-6 border-b border-[#E8E6DD]">
          <div>
            <h1 className="font-medium text-[28px] text-[#2C2C2A] tracking-tight">
              {model.modelName}
              {model.isPotential && (
                <span className="ml-3 font-mono text-[11px] font-medium uppercase tracking-[0.16em] px-2 py-0.5 bg-[#FAEAE7] text-[#A50034] align-middle" style={{ borderRadius: 3 }}>
                  잠재
                </span>
              )}
            </h1>
            <p className="font-mono text-[11px] text-[#888780] uppercase tracking-[0.18em] mt-2">
              {model.formFactor} · {model.releasePhase || '미정'} · 업데이트 {new Date(model.updatedAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <Link
            href={`/lg-humanoid-specs/${model.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#D3D1C7] text-[#2C2C2A] font-medium text-[13px] hover:border-[#A50034] hover:text-[#A50034] transition-colors"
            style={{ borderRadius: 4 }}
          >
            <Edit3 size={14} strokeWidth={1.75} />
            편집
          </Link>
        </header>

        <div className="space-y-6">
          {SECTIONS.map(({ key, title }) => {
            const data = model[key] as Record<string, unknown> | null;
            const entries = data ? Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== '') : [];
            return (
              <section key={key} className="border border-[#E8E6DD] bg-white p-5" style={{ borderRadius: 8 }}>
                <h2 className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.2em] mb-3 font-medium">
                  {title}
                </h2>
                {entries.length === 0 ? (
                  <p className="text-[12.5px] text-[#B8B6AE]">데이터 없음 (편집에서 입력)</p>
                ) : (
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
                    {entries.map(([k, v]) => (
                      <div key={k} className="flex items-baseline gap-2">
                        <dt className="font-mono text-[10.5px] text-[#888780] w-40 shrink-0 tracking-wide">{k}</dt>
                        <dd className="text-[#2C2C2A] flex-1">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            );
          })}

          {model.notes && (
            <section className="border border-[#E8E6DD] bg-[#FAFAF8] p-5" style={{ borderRadius: 8 }}>
              <h2 className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.2em] mb-3 font-medium">
                메모
              </h2>
              <p className="text-[13px] text-[#2C2C2A] leading-relaxed whitespace-pre-wrap">
                {model.notes}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ModelDetailPage() {
  return (
    <AuthGuard>
      <DetailContent />
    </AuthGuard>
  );
}
