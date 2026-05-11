'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trophy, BarChart3 } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { HandImage } from '@/components/hands/HandImage';
import { useHandBenchmarkData } from '@/hooks/useCiUpdate';
import { HAND_COLORS, HAND_STRATEGIES } from '@/lib/hand-config';

const CATEGORY_LABEL: Record<string, string> = {
  dexterous: '다지형',
  'industrial-5f': '산업용 5지형',
};

function HandDetailContent({ slug }: { slug: string }) {
  const { data, isLoading, error } = useHandBenchmarkData();

  const hand = useMemo(() => {
    if (!data) return null;
    return data.competitors.find((c) => c.slug === slug) ?? null;
  }, [data, slug]);

  if (isLoading) {
    return <div className="text-center py-20 text-ink-500">데이터 로딩 중...</div>;
  }

  if (error || !data) {
    return <div className="text-center py-20 text-red-400">데이터 로드 실패</div>;
  }

  if (!hand) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 py-12">
        <Link href="/hand-registry" className="text-info text-sm hover:underline">
          ← 핸드 리스트로
        </Link>
        <div className="text-center py-20 text-ink-500">'{slug}' 핸드를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const accent = HAND_COLORS[hand.slug] || '#94a3b8';
  const totalCurrent = data.axes.reduce((sum, ax) => sum + (hand.scores[ax.key]?.currentScore || 0), 0);
  const totalTarget = data.axes.reduce((sum, ax) => sum + (hand.scores[ax.key]?.targetScore || 0), 0);
  const maxTotal = data.axes.length * 10;
  const strategy = HAND_STRATEGIES[hand.slug];

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/hand-registry"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-info transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        핸드 리스트로
      </Link>

      {/* Header card */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Image column */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-ink-200 overflow-hidden">
          <HandImage
            imageUrl={hand.imageUrl}
            handName={hand.name}
            manufacturer={hand.manufacturer}
            size="lg"
          />
        </div>

        {/* Info column */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-ink-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">{hand.name}</h1>
              <p className="text-base text-ink-500 mt-1">{hand.manufacturer}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-500/10 text-emerald-600">
                {CATEGORY_LABEL[hand.category || 'dexterous']}
              </span>
              {hand.country && (
                <span className="px-2.5 py-1 text-xs font-medium rounded bg-ink-100 text-ink-500">
                  {hand.country}
                </span>
              )}
            </div>
          </div>

          {/* Total score */}
          <div className="bg-ink-100 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-ink-500">Perfect Hand Spec 대비 총점</div>
              <div className="text-3xl font-bold mt-0.5" style={{ color: accent }}>
                {totalCurrent}
                <span className="text-base text-ink-500 ml-1">/{maxTotal}점</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-500">목표 도달까지</div>
              <div className="text-lg font-semibold text-red-400 mt-0.5">
                +{totalTarget - totalCurrent}점
              </div>
            </div>
            <Trophy className="w-10 h-10" style={{ color: accent }} />
          </div>

          {/* Strategy */}
          {strategy && (
            <div className="border border-ink-200 rounded-lg p-3">
              <div className="text-xs text-ink-500 mb-1">전략 포지셔닝</div>
              <p className="text-sm text-ink-700 leading-relaxed">{strategy}</p>
            </div>
          )}

          <Link
            href="/compare/hand-benchmark"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-info hover:underline"
          >
            <BarChart3 className="w-4 h-4" />
            다른 핸드와 비교하기 (6축 레이더)
          </Link>
        </div>
      </div>

      {/* 6-axis breakdown */}
      <div className="bg-white rounded-xl border border-ink-200 p-5">
        <h2 className="text-base font-semibold text-ink-900 mb-1">6축 상세 분석</h2>
        <p className="text-xs text-ink-500 mb-4">Perfect Hand Spec(10점) 기준 정규화 점수와 원본 수치, 근거</p>

        <div className="space-y-3">
          {data.axes.map((axis) => {
            const score = hand.scores[axis.key];
            if (!score) return null;
            const current = score.currentScore;
            const target = score.targetScore;
            return (
              <div key={axis.key} className="border border-ink-100 rounded-lg p-3.5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink-900">{axis.label}</span>
                      {axis.perfectDef && (
                        <span className="text-[10px] text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">
                          Perfect: {axis.perfectDef}
                        </span>
                      )}
                    </div>
                    {axis.description && (
                      <p className="text-xs text-ink-500 mt-1">{axis.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold" style={{ color: accent }}>
                      {current}
                      {target > current && (
                        <span className="text-sm text-green-400 ml-1">→ {target}</span>
                      )}
                      <span className="text-xs text-ink-500 ml-0.5">/10</span>
                    </div>
                    {score.rawValue && (
                      <div className="text-xs text-ink-700 font-medium mt-0.5">{score.rawValue}</div>
                    )}
                  </div>
                </div>

                {/* Bar */}
                <div className="relative h-2 bg-ink-100 rounded-full overflow-hidden mb-2">
                  {target > current && (
                    <div
                      className="absolute h-full rounded-full opacity-30"
                      style={{ width: `${target * 10}%`, backgroundColor: accent }}
                    />
                  )}
                  <div
                    className="absolute h-full rounded-full"
                    style={{ width: `${current * 10}%`, backgroundColor: accent }}
                  />
                </div>

                {score.rationale && (
                  <p className="text-xs text-ink-700 leading-relaxed">{score.rationale}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HandDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  return (
    <AuthGuard>
      <div className="min-h-screen">
        {slug ? <HandDetailContent slug={slug} /> : null}
      </div>
    </AuthGuard>
  );
}
