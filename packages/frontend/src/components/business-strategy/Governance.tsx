'use client';

import { Panel, Kicker, InsightBox } from '@/components/ui';

const QUARTERLY_CYCLE = [
  { month: '3월', label: 'Q1 검증', status: 'done',     desc: '출처 재확인 + 신규 사례 검색' },
  { month: '6월', label: 'Q2 검증', status: 'next',     desc: 'Phase 1 산업 도메인 완료 검증' },
  { month: '9월', label: 'Q3 검증', status: 'planned',  desc: 'Phase 2 가정 도메인 시동' },
  { month: '12월',label: 'Q4 검증', status: 'planned',  desc: '연차 종합 검증 + 차년도 계획' },
];

const ADD_DOMAIN_STEPS = [
  { num: '01', title: '도메인 정의',           desc: 'Task·Sector 목록 초안 작성' },
  { num: '02', title: 'domains 등록',          desc: 'status: PLANNED 로 DB 등록' },
  { num: '03', title: '마스터 데이터',          desc: 'tasks·sectors 마스터 입력' },
  { num: '04', title: '셀 일부 입력',          desc: '검증된 것부터 점진 입력' },
  { num: '05', title: 'ACTIVE 전환',           desc: '검증 완료 후 status 변경' },
];

const NEXT_STEPS = [
  { phase: '즉시',           label: '본 문서 v1.0 배포',                          owner: '로보틱스연구기획팀' },
  { phase: 'Phase 1.1',     label: 'PostgreSQL 스키마 v2.0 구현',                 owner: '백엔드' },
  { phase: 'Phase 1.2',     label: '산업 데이터 마이그레이션 (v9 PPT → DB)',      owner: '데이터팀' },
  { phase: 'Phase 1.3',     label: 'API v2 엔드포인트 구현',                       owner: '백엔드' },
  { phase: 'Phase 1.4',     label: 'UI 도메인 탭 추가',                            owner: '프론트엔드' },
  { phase: 'Phase 1.5',     label: 'Top 5 진입 적합 셀 Deep Dive 페이지',          owner: '연구기획' },
];

export default function Governance() {
  return (
    <section id="governance" className="scroll-mt-24 space-y-6">
      <Panel
        kicker="Governance & Verification"
        title="거버넌스 — 데이터 신뢰성 운영 체계"
        subtitle="분기별 검증 + audit log 기반 변경 이력 + 도메인 추가 시 5단계 표준 절차"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Verification cycle */}
          <div className="lg:col-span-7">
            <Kicker>Quarterly Verification Cycle</Kicker>
            <h4 className="font-serif text-[14px] font-semibold text-ink-900 mt-1.5 mb-4">
              분기별 검증 사이클
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {QUARTERLY_CYCLE.map((q, i) => {
                const styles =
                  q.status === 'done'    ? 'border-pos bg-pos-soft/50'
                  : q.status === 'next'  ? 'border-gold bg-gold-soft/40 ring-1 ring-gold'
                  :                        'border-ink-200 bg-white';
                return (
                  <div key={q.month} className={`border ${styles} p-3 relative`}>
                    {q.status === 'done' && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-pos text-white flex items-center justify-center text-[9px] font-bold">
                        ✓
                      </span>
                    )}
                    <p className="font-mono text-[10px] text-ink-400 uppercase tracking-[0.16em]">
                      {q.month}
                    </p>
                    <p className="font-serif text-[13px] font-semibold text-ink-900 mt-1">
                      {q.label}
                    </p>
                    <p className="text-[11px] text-ink-600 mt-1.5 leading-relaxed">
                      {q.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="border border-ink-200 bg-white p-3">
                <Kicker>Verification</Kicker>
                <p className="text-[12px] text-ink-700 leading-relaxed mt-1.5">
                  <strong>분기별</strong> · 출처 재확인 + 신규 사례 검색
                </p>
              </div>
              <div className="border border-ink-200 bg-white p-3">
                <Kicker>Owner</Kicker>
                <p className="text-[12px] text-ink-700 leading-relaxed mt-1.5">
                  <strong>로보틱스연구기획팀</strong> · Task별 담당자 지정
                </p>
              </div>
              <div className="border border-ink-200 bg-white p-3">
                <Kicker>Audit Trail</Kicker>
                <p className="text-[12px] text-ink-700 leading-relaxed mt-1.5">
                  <code className="font-mono text-[10px] bg-ink-100 px-1">matrix_cells.updated_at</code> + audit log 테이블
                </p>
              </div>
            </div>
          </div>

          {/* Add domain procedure */}
          <div className="lg:col-span-5">
            <Kicker>Add-Domain Procedure</Kicker>
            <h4 className="font-serif text-[14px] font-semibold text-ink-900 mt-1.5 mb-4">
              도메인 추가 시 5단계 절차
            </h4>
            <div className="space-y-1.5">
              {ADD_DOMAIN_STEPS.map((s, i) => (
                <div key={s.num} className="flex items-start gap-3 p-2.5 border border-ink-200 bg-white">
                  <span className="font-mono text-[11px] font-bold text-gold tracking-[0.18em] w-6 shrink-0">
                    {s.num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[12.5px] font-semibold text-ink-900">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-ink-500 leading-relaxed mt-0.5">
                      {s.desc}
                    </p>
                  </div>
                  {i !== ADD_DOMAIN_STEPS.length - 1 && (
                    <span className="text-ink-300 text-[14px] font-mono">↓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        kicker="Implementation Sequence"
        title="구현 순서 — 즉시 ~ Phase 1 완료"
        subtitle="현재 ~ 2026 Q3 안에 산업 도메인 v1.0 포털 완성을 목표로 합니다"
      >
        <div className="border border-ink-200">
          <table className="w-full">
            <thead className="bg-ink-50">
              <tr>
                <th className="font-mono text-[9.5px] font-medium text-ink-500 uppercase tracking-[0.18em] text-left px-4 py-2.5 border-b border-ink-200 w-32">
                  Phase
                </th>
                <th className="font-mono text-[9.5px] font-medium text-ink-500 uppercase tracking-[0.18em] text-left px-4 py-2.5 border-b border-ink-200">
                  Task
                </th>
                <th className="font-mono text-[9.5px] font-medium text-ink-500 uppercase tracking-[0.18em] text-left px-4 py-2.5 border-b border-ink-200 w-44">
                  Owner
                </th>
              </tr>
            </thead>
            <tbody>
              {NEXT_STEPS.map((s, i) => {
                const isImmediate = s.phase === '즉시';
                return (
                  <tr key={i} className={`border-b border-ink-100 last:border-0 ${
                    isImmediate ? 'bg-gold-soft/30' : ''
                  }`}>
                    <td className="px-4 py-2.5">
                      <span className={`font-mono text-[10.5px] font-semibold tracking-[0.16em] ${
                        isImmediate ? 'text-gold' : 'text-ink-700'
                      }`}>
                        {s.phase}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[12.5px] text-ink-900">
                      {s.label}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[10.5px] text-ink-500 uppercase tracking-[0.14em]">
                        {s.owner}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <InsightBox label="Executive Ask" tone="gold" title="임원진 결의사항">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>본 v2.0 통합 구조를 산업 도메인의 v9 매트릭스 위에 적용 — 백엔드 스키마 마이그레이션 승인</li>
              <li>Phase 1 종료 (2026 Q3) 시점에 ARGOS 포털 v1.0 정식 배포</li>
              <li>Phase 2 가정 도메인은 LGE 가전 BU와 공동 정의 — 협업 채널 개설</li>
              <li>분기별 검증 사이클을 로보틱스연구기획팀 정규 업무로 편입</li>
            </ul>
          </InsightBox>
        </div>
      </Panel>
    </section>
  );
}
