'use client';

import { Panel, Kicker, InsightBox } from '@/components/ui';
import { DIFFICULTY_LEVELS } from './data';

export default function ScoringLogic() {
  const maxRaw = 12;

  return (
    <section id="scoring" className="scroll-mt-24">
      <Panel
        kicker="Scoring Logic · Single Pipeline"
        title="셀 8개 정보 → 4Lv 합산 → 10점 환산"
        subtitle="단일 가이드 로직 4도메인 동일. 셀 8개 정보(점유율·등급·작업·장벽·풀이·로봇·그리퍼·태그)를 입력 → 4Lv 합산 (최대 12점) → 10점 환산 → LG 라인업 적합도 등급(★★★ ~ ✗) 산출"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pipeline visual */}
          <div className="lg:col-span-8">
            <Kicker>Score Pipeline</Kicker>
            <h4 className="font-serif text-[14px] font-semibold text-ink-900 mt-1.5 mb-4">
              점수 산출 플로우
            </h4>

            <div className="border border-ink-200 bg-paper p-6">
              {/* Step 1: 8 inputs */}
              <div className="text-center">
                <Kicker>Step 1 · Cell Inputs (8개)</Kicker>
                <div className="mt-2 grid grid-cols-4 gap-1.5 max-w-md mx-auto">
                  {[
                    '점유율',
                    'LG 등급',
                    '대상 작업',
                    '진입 장벽',
                    '풀이',
                    '적합 로봇',
                    '그리퍼',
                    '실배치 태그',
                  ].map((x) => (
                    <span
                      key={x}
                      className="bg-white border border-ink-200 px-2 py-1.5 text-[10.5px] text-ink-700"
                    >
                      {x}
                    </span>
                  ))}
                </div>
              </div>

              <Arrow />

              {/* Step 2: 4Lv */}
              <div className="text-center">
                <Kicker>Step 2 · 4Lv 가중 합산</Kicker>
                <div className="mt-2 inline-flex border border-ink-300">
                  {DIFFICULTY_LEVELS.map((lv, i) => {
                    const colors = ['bg-pos-soft text-pos', 'bg-warn-soft text-warn', 'bg-neg-soft text-neg', 'bg-brand text-white'];
                    return (
                      <div
                        key={lv.level}
                        className={`${colors[i]} px-3 py-2 text-center ${i !== 0 ? 'border-l border-ink-300' : ''}`}
                      >
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] opacity-80">
                          Lv{lv.level}
                        </p>
                        <p className="font-serif text-[16px] font-bold mt-0.5">{lv.weight}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="font-mono text-[10px] text-ink-500 mt-2">
                  Σ Lv1+Lv2+Lv3+Lv4 ≤ <strong className="text-ink-900">{maxRaw}점</strong>
                </p>
              </div>

              <Arrow />

              {/* Step 3: convert */}
              <div className="text-center">
                <Kicker>Step 3 · 10점 환산</Kicker>
                <p className="font-mono text-[11px] text-ink-700 mt-2">
                  raw / 12 × 10 = <strong className="text-ink-900">0 ~ 10.0</strong>
                </p>
              </div>

              <Arrow />

              {/* Step 4: grade */}
              <div className="text-center">
                <Kicker>Step 4 · LG 적합도 등급</Kicker>
                <div className="mt-2 inline-flex gap-1">
                  {[
                    { g: '★★★', range: '8.5+',  bg: 'bg-gold text-white' },
                    { g: '★★',  range: '6.5+',  bg: 'bg-gold-soft text-gold' },
                    { g: '★',   range: '4.5+',  bg: 'bg-warn-soft text-warn' },
                    { g: '✗',   range: '< 4.5', bg: 'bg-ink-100 text-ink-500' },
                  ].map((x) => (
                    <div key={x.g} className={`${x.bg} px-3 py-1.5 text-center`}>
                      <p className="font-bold text-[14px] leading-none">{x.g}</p>
                      <p className="font-mono text-[9px] mt-1 opacity-80">{x.range}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Side notes */}
          <div className="lg:col-span-4 space-y-4">
            <InsightBox label="Why 4Lv?" tone="info" title="난이도가 곧 LG 진입 적합도">
              <p>
                Lv1 (평면·정형)에서는 IR/CR로도 충분 — 휴머노이드 우위 적음.
                Lv4 (비정형·제약多)는 인간형이 가장 유리한 영역이지만 양산 사례 부족.
              </p>
              <p>
                4Lv 합산은 <strong>Lv별 +1·+2·+3·+4 가중치</strong>를 적용해
                고난도 작업에 더 많은 점수를 부여하는 구조입니다.
              </p>
            </InsightBox>

            <InsightBox label="Domain Independence" tone="gold" title="도메인 간 점수는 비교 가능, 합산 불가">
              <p>
                같은 가이드 로직으로 산출되지만 Task·환경이 다르므로 도메인 간 점수
                직접 비교는 가능하되 평균·합산은 의미가 없습니다.
              </p>
            </InsightBox>
          </div>
        </div>
      </Panel>
    </section>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center my-3">
      <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
        <path d="M7 0 L7 16 M2 11 L7 16 L12 11" stroke="#B8892B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
