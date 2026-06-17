'use client';

// BCG CEO Biweekly #3 — CLOiD 학습向 공정 Task PoC 로드맵 (원본 출처 데이터 뷰)
// lge-processes 페이지의 추정 매핑을 보정하는 권위 자료로 표시한다.

import { Fragment, useState } from 'react';
import {
  BCG_SOURCE,
  BCG_POC_TASKS,
  TASK_TYPE_PROFILES,
  COMMERCIALIZATION_TRACKS,
  COMPETITOR_BENCHMARK,
  BENCHMARK_INSIGHTS,
  ROADMAP_METHODOLOGY,
  SEMI_HUMANOID_TAM,
  IMPACT_LABEL,
  type ImpactRating,
} from './bcg-poc-roadmap';
import { MOTION_GROUP_LABEL, type MotionGroup } from './lge-washer-processes';

const MOTION_GROUP_COLOR: Record<MotionGroup, { bg: string; border: string; text: string }> = {
  pick_place: { bg: '#E6F1FB', border: '#3B7DB8', text: '#0C447C' },
  grip_push:  { bg: '#EDE7F6', border: '#7E5BB5', text: '#3F2A6E' },
  screw:      { bg: '#FBF1D6', border: '#D4A22F', text: '#5A3F0A' },
  non_fixed:  { bg: '#F0EEE8', border: '#9C9A90', text: '#4A483F' },
  welding:    { bg: '#FCE8E2', border: '#C9633E', text: '#7A2E12' },
  harness:    { bg: '#FBEAF0', border: '#C8366E', text: '#7A0F2C' },
};

const RATING_COLOR: Record<ImpactRating, { bg: string; text: string }> = {
  H: { bg: '#E8F5EE', text: '#0F4F32' },
  M: { bg: '#FBF1D6', text: '#5A3F0A' },
  L: { bg: '#F0EEE8', text: '#6A6860' },
};

function Rating({ value }: { value: ImpactRating }) {
  const c = RATING_COLOR[value];
  return (
    <span
      className="inline-flex items-center justify-center font-mono text-[11px] font-bold w-6 h-5"
      style={{ backgroundColor: c.bg, color: c.text, borderRadius: 3 }}
      title={IMPACT_LABEL[value]}
    >
      {value}
    </span>
  );
}

const LINE_COLOR: Record<string, string> = {
  부품: '#0C447C', 오븐: '#7A2E12', 냉장고: '#0F4F32', 에어컨: '#3F2A6E', 세탁기: '#7A0F2C',
};

export function BcgPocRoadmap() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <section className="bg-white border border-[#E8E6DD] mb-4" style={{ borderRadius: 8 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#EFEDE5]">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <h2 className="font-medium text-[17px] text-[#1A1A1A] tracking-tight">
            BCG 공정 Task PoC 로드맵
          </h2>
          <span className="font-mono text-[10px] text-[#0C447C] font-medium tracking-[0.12em] px-2 py-0.5 bg-[#E6F1FB]">
            원본 출처
          </span>
          <span className="font-mono text-[10px] text-[#5F5E5A] tracking-[0.1em] px-2 py-0.5 bg-[#F4F2EC]">
            {BCG_SOURCE.author} · {BCG_SOURCE.date}
          </span>
        </div>
        <p className="text-[12.5px] text-[#5F5E5A] leading-relaxed max-w-[980px]">
          <strong>{BCG_SOURCE.title}</strong> — {BCG_SOURCE.chapter}. 검토 대상{' '}
          <strong>{ROADMAP_METHODOLOGY.reviewedTasks}개</strong> 非자동화 공정 Task를 Impact-Feasibility
          평가로 필터링({ROADMAP_METHODOLOGY.shortlistTasks}개 Shortlist → {ROADMAP_METHODOLOGY.roadmapTasks}개
          로드맵), 그 중 <strong>10대 우선순위 Task(Wave I)</strong>. 동작군·난이도·Takt Time·Payload는
          본 보고서 본문 추출 값으로, 좌측 세탁기 라인의 추정 매핑을 보정하는 기준이 된다.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* TAM + 방법론 KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="제조용 Semi-휴머노이드 TAM" value={SEMI_HUMANOID_TAM.label} note="글로벌 제조 비정형 업무" accent />
          <Kpi label="검토 非자동화 Task" value={`${ROADMAP_METHODOLOGY.reviewedTasks}개`} note="창원·평택 공장 기준" />
          <Kpi label="상용화 시작" value={`'${ROADMAP_METHODOLOGY.commercialStartYear % 100}`} note={`전공정 ${ROADMAP_METHODOLOGY.commercialStartPct}% 적용`} />
          <Kpi label="전면 상용화" value={`'${ROADMAP_METHODOLOGY.fullScaleYear % 100}`} note={`전공정 ${ROADMAP_METHODOLOGY.fullScalePct}% 적용`} />
        </div>

        {/* 10대 우선순위 Task 테이블 */}
        <div>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mb-2">
            10대 우선순위 공정 Task (Wave I) — 클릭 시 Impact-Feasibility 상세
          </p>
          <div className="overflow-x-auto border border-[#EFEDE5]" style={{ borderRadius: 6 }}>
            <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="bg-[#FAFAF7] text-[#888780] font-mono text-[10px] uppercase tracking-[0.1em]">
                  <th className="text-left px-2.5 py-2 font-medium">#</th>
                  <th className="text-left px-2.5 py-2 font-medium">라인</th>
                  <th className="text-left px-2.5 py-2 font-medium">공정 Task</th>
                  <th className="text-left px-2.5 py-2 font-medium">동작군</th>
                  <th className="text-center px-2 py-2 font-medium" title="Impact">Imp</th>
                  <th className="text-center px-2 py-2 font-medium" title="Feasibility">Fea</th>
                  <th className="text-center px-2 py-2 font-medium">난이도</th>
                  <th className="text-right px-2.5 py-2 font-medium">Takt</th>
                  <th className="text-right px-2.5 py-2 font-medium">중량</th>
                  <th className="text-right px-2.5 py-2 font-medium" title="자사 全공정 내 동작군 비중">내부확장</th>
                </tr>
              </thead>
              <tbody>
                {BCG_POC_TASKS.map((t) => {
                  const mc = MOTION_GROUP_COLOR[t.motionGroup];
                  const open = expanded === t.rank;
                  return (
                    <Fragment key={t.rank}>
                      <tr
                        onClick={() => setExpanded(open ? null : t.rank)}
                        className="border-t border-[#EFEDE5] cursor-pointer hover:bg-[#FBFBF8]"
                      >
                        <td className="px-2.5 py-2 font-mono text-[#888780] tabular-nums">{t.rank}</td>
                        <td className="px-2.5 py-2">
                          <span className="font-medium" style={{ color: LINE_COLOR[t.line] ?? '#1A1A1A' }}>{t.line}</span>
                        </td>
                        <td className="px-2.5 py-2 text-[#1A1A1A] font-medium">
                          {t.name}
                          {t.isCurrentLgPoc && (
                            <span className="ml-1.5 font-mono text-[9px] text-[#A50034] px-1 py-0.5 bg-[#FAEAE7] align-middle">
                              現 LG PoC
                            </span>
                          )}
                        </td>
                        <td className="px-2.5 py-2">
                          <span
                            className="inline-block font-mono text-[10px] px-1.5 py-0.5"
                            style={{ backgroundColor: mc.bg, color: mc.text, border: `1px solid ${mc.border}`, borderRadius: 3 }}
                          >
                            {MOTION_GROUP_LABEL[t.motionGroup]}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center"><Rating value={t.impact} /></td>
                        <td className="px-2 py-2 text-center"><Rating value={t.feasibility} /></td>
                        <td className="px-2 py-2 text-center font-medium text-[#1A1A1A]">{t.difficulty}</td>
                        <td className="px-2.5 py-2 text-right font-mono text-[#5F5E5A] tabular-nums">
                          {t.taktTimeSec === null ? '간접' : `${t.taktTimeSec}s`}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono text-[#5F5E5A] tabular-nums">
                          {t.weightKg != null ? `${t.weightKg}kg` : '—'}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono text-[#5F5E5A] tabular-nums">{t.internalExpansionPct}%</td>
                      </tr>
                      {open && (
                        <tr className="bg-[#FBFBF8] border-t border-[#EFEDE5]">
                          <td colSpan={10} className="px-4 py-3">
                            <p className="text-[12.5px] text-[#3A3A37] mb-2">{t.work}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-[#5F5E5A]">
                              <DetailRow k="기술 연계성" v={t.techLinkage} />
                              <DetailRow k="외부 판매 잠재성" v={t.externalPotential} />
                              <DetailRow k="폼팩터 대응" v={t.formFactor} />
                              <DetailRow k="유해환경" v={t.hazard ?? '미해당'} />
                              {t.taktNote && <DetailRow k="Takt 비고" v={t.taktNote} />}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="font-mono text-[10px] text-[#A0764A] mt-1.5">
            Imp=Impact · Fea=Feasibility (H 高 / M 中 / L 低) · 내부확장 = 자사 全공정 내 동일 동작군 비중
          </p>
        </div>

        {/* 난이도 7대 유형 */}
        <div>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mb-2">
            난이도 관점 7대 작업 유형 (低→高) — 글로벌社 PoC 집중 영역 대비 LG 테너시 PoC는 개발 難
          </p>
          <div className="flex flex-wrap items-stretch gap-1.5">
            {TASK_TYPE_PROFILES.map((p, i) => (
              <div
                key={p.order}
                className="flex-1 min-w-[120px] border p-2.5"
                style={{
                  borderRadius: 6,
                  borderColor: p.globalFocus ? '#3B7DB8' : '#E8E6DD',
                  backgroundColor: p.globalFocus ? '#F2F8FD' : '#FFFFFF',
                }}
                title={`${p.reason}\n예시: ${p.lgExample}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] text-[#888780]">{i + 1}</span>
                  {p.globalFocus && (
                    <span className="font-mono text-[8.5px] text-[#0C447C] px-1 bg-[#E6F1FB]">글로벌 집중</span>
                  )}
                </div>
                <p className="text-[11.5px] font-medium text-[#1A1A1A] leading-tight">{p.type}</p>
                <p className="text-[10px] text-[#888780] mt-1 leading-snug">{p.lgExample}</p>
              </div>
            ))}
          </div>
        </div>

        {/* RFM 상용화 트랙 */}
        <div>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mb-2">
            RFM 순차 고도화 / 상용화 적용 비중 (동작군 6유형)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {COMMERCIALIZATION_TRACKS.map((tr) => {
              const c = MOTION_GROUP_COLOR[tr.motionGroup];
              return (
                <div key={tr.motionGroup} className="border border-[#EFEDE5] p-2.5" style={{ borderRadius: 6 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="font-mono text-[10px] px-1.5 py-0.5"
                      style={{ backgroundColor: c.bg, color: c.text, borderRadius: 3 }}
                    >
                      {tr.label}
                    </span>
                    <span className="font-medium text-[16px] text-[#1A1A1A] tabular-nums">{tr.coveragePct}%</span>
                  </div>
                  <div className="h-1.5 bg-[#F0EEE8] overflow-hidden" style={{ borderRadius: 2 }}>
                    <div className="h-full" style={{ width: `${tr.coveragePct}%`, backgroundColor: c.border }} />
                  </div>
                  <p className="text-[10.5px] text-[#888780] mt-1.5">
                    {tr.taskCount}개 Task · 후속 예: {tr.futureExample}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 경쟁사 벤치마킹 */}
        <div className="border border-[#EFEDE5] p-3" style={{ borderRadius: 6, backgroundColor: '#FAFAF7' }}>
          <p className="font-mono text-[10.5px] text-[#888780] uppercase tracking-[0.14em] mb-2">
            글로벌 (세미)휴머노이드 PoC 벤치마킹 — 총 {COMPETITOR_BENCHMARK.total}개
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMPETITOR_BENCHMARK.byType.map((b) => (
              <span key={b.type} className="text-[12px] text-[#3A3A37] px-2 py-1 bg-white border border-[#E8E6DD]" style={{ borderRadius: 4 }}>
                {b.type} <strong>{b.count}개</strong>
                <span className="text-[#888780]"> ({b.pct}%)</span>
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            {BENCHMARK_INSIGHTS.map((ins) => (
              <div key={ins.tag} className="bg-white border border-[#E8E6DD] p-2.5" style={{ borderRadius: 5 }}>
                <span className="font-mono text-[10px] font-bold text-[#0C447C]">{ins.tag}</span>
                <p className="text-[11.5px] font-medium text-[#1A1A1A] mt-0.5 leading-snug">{ins.title}</p>
                <p className="text-[10.5px] text-[#888780] mt-1 leading-snug">{ins.body}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#5F5E5A] leading-relaxed">
            <strong>성숙도 (Figure AI · BMW {COMPETITOR_BENCHMARK.maturity.pilot})</strong> — 배치 정확도{' '}
            {COMPETITOR_BENCHMARK.maturity.placeAccuracyPct}%, 인간 대비 속도 PoC 초기{' '}
            {COMPETITOR_BENCHMARK.maturity.speedStartPct}% → 11개월 후 {COMPETITOR_BENCHMARK.maturity.speedAfterPct}%
            (現 기술 수준 Pick &amp; Place 최대 인간 속도 ~{COMPETITOR_BENCHMARK.maturity.industryMaxPct}%).
          </p>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: boolean }) {
  return (
    <div
      className="border p-3"
      style={{ borderRadius: 6, borderColor: accent ? '#A50034' : '#E8E6DD', backgroundColor: accent ? '#FAEAE7' : '#FAFAF7' }}
    >
      <p className="font-mono text-[9.5px] text-[#888780] uppercase tracking-[0.1em] leading-tight">{label}</p>
      <p className="font-medium text-[22px] leading-none mt-1.5" style={{ color: accent ? '#A50034' : '#1A1A1A', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {note && <p className="text-[10.5px] text-[#888780] mt-1">{note}</p>}
    </div>
  );
}

function DetailRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-mono text-[10.5px] text-[#A0764A] whitespace-nowrap min-w-[88px]">{k}</span>
      <span className="text-[#3A3A37]">{v}</span>
    </div>
  );
}
