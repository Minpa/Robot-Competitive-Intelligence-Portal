'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface ScoreInfoModalProps {
  title: string;
  children: React.ReactNode;
}

export function ScoreInfoButton({ title, children }: ScoreInfoModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        title="산출 방식 보기"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="text-sm text-slate-300 space-y-3">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function GapAnalysisInfo() {
  return (
    <ScoreInfoButton title="12팩터 GAP 분석 산출 방식">
      <p className="text-slate-400">LG 로봇과 선택된 경쟁사 중 최상위 로봇 간의 점수 차이를 12개 팩터별로 분석합니다.</p>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-white mb-1">GAP 계산</p>
        <p className="text-xs text-slate-400">GAP = LG 점수 - 최상위 경쟁사 점수</p>
        <div className="mt-2 space-y-1 text-xs">
          <p><span className="text-emerald-400">+양수 (초록)</span> = LG가 앞서는 영역</p>
          <p><span className="text-red-400">-음수 (빨강)</span> = LG가 뒤처지는 영역</p>
          <p><span className="text-slate-400">0 (회색)</span> = 동점</p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-blue-400 mb-2">PoC 팩터 (6개) - 하드웨어 역량</p>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-700">
            <tr><td className="py-1.5 text-slate-400 w-32">Payload</td><td>가반하중 0-20kg → 1-10점 (선형)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Operation Time</td><td>연속가동 0-8시간 → 1-10점 (선형)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Finger DOF</td><td>손가락 자유도 0-24 → 1-10점 (선형)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Form Factor</td><td>신장유사도(30%) + DOF(30%) + 손가락수(20%) + 이족보행(20%)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Deployment</td><td>배치 상태 기반 (수동 입력)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Cost Efficiency</td><td>(가반하중 × 가동시간) / 가격 → 정규화</td></tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-amber-400 mb-2">RFM 팩터 (6개) - 소프트웨어/시장 역량</p>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-700">
            <tr><td className="py-1.5 text-slate-400 w-32">Generality</td><td>범용성 (기사/키워드 기반, 수동 입력)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Real-World Data</td><td>실제 환경 데이터 (기사/키워드 기반)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Edge Inference</td><td>TOPS 기준: ≤10→1, ≤50→2, ≤200→3, ≤500→4, &gt;500→5</td></tr>
            <tr><td className="py-1.5 text-slate-400">Multi-Robot</td><td>다중 로봇 협업 (기사/키워드 기반)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Open Source</td><td>오픈소스 기여도 (기사/키워드 기반)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Commercial</td><td>concept→1, prototype→2, poc→3, pilot→4, commercial→5</td></tr>
          </tbody>
        </table>
      </div>
    </ScoreInfoButton>
  );
}

export function RadarChartInfo() {
  return (
    <ScoreInfoButton title="오버레이 레이더 차트 산출 방식">
      <p className="text-slate-400">LG 로봇과 선택된 경쟁사들의 PoC 6개 팩터를 레이더 차트로 비교합니다.</p>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-white mb-1">차트 축 (6개)</p>
        <p className="text-xs text-slate-400">각 축은 PoC 팩터의 원점수(1-10)를 표시합니다.</p>
        <div className="mt-2 space-y-1 text-xs">
          <p><span className="text-blue-400">LG (실선, 파랑)</span> — 면적이 넓을수록 우수</p>
          <p><span className="text-slate-400">경쟁사 (점선)</span> — 각기 다른 색상으로 구분</p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-white mb-2">PoC 6팩터 점수 산출</p>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-slate-700">
            <tr><td className="py-1.5 text-slate-400 w-32">Payload</td><td>가반하중(kg) / 20 × 9 + 1 (최대 10)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Operation Time</td><td>가동시간(h) / 8 × 9 + 1 (최대 10)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Finger DOF</td><td>손가락 자유도 / 24 × 9 + 1 (최대 10)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Form Factor</td><td>복합 지표: 신장(30%) + DOF(30%) + 손가락수(20%) + 보행(20%)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Deployment</td><td>배치 단계 (수동 입력, 1-10)</td></tr>
            <tr><td className="py-1.5 text-slate-400">Cost Efficiency</td><td>(payload × opTime) / price 정규화 (최대 10)</td></tr>
          </tbody>
        </table>
      </div>
    </ScoreInfoButton>
  );
}

export function BubbleChartInfo() {
  return (
    <ScoreInfoButton title="오버레이 버블 차트 산출 방식">
      <p className="text-slate-400">각 로봇의 PoC/RFM 종합 점수를 2D 공간에 배치하여 경쟁 포지션을 시각화합니다.</p>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-white mb-1">축 산출</p>
        <div className="mt-1 space-y-1 text-xs">
          <p><span className="text-blue-400">X축 (PoC 합계)</span> = 6개 PoC 팩터 점수의 합 (최대 60)</p>
          <p><span className="text-amber-400">Y축 (RFM 합계)</span> = 6개 RFM 팩터 점수의 합 (최대 60)</p>
          <p><span className="text-emerald-400">버블 크기</span> = 종합 점수 (PoC + RFM, 최대 120)</p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-white mb-1">포지션 해석</p>
        <div className="mt-1 space-y-1 text-xs">
          <p><span className="text-slate-300">우상단</span> — 하드웨어 + 소프트웨어 모두 강한 리더</p>
          <p><span className="text-slate-300">우하단</span> — 하드웨어(PoC) 중심 강점</p>
          <p><span className="text-slate-300">좌상단</span> — 소프트웨어/시장(RFM) 중심 강점</p>
          <p><span className="text-slate-300">좌하단</span> — 초기 단계 또는 약세</p>
        </div>
      </div>
    </ScoreInfoButton>
  );
}

export function RankingCardInfo() {
  return (
    <ScoreInfoButton title="LG 종합 순위 산출 방식">
      <p className="text-slate-400">전체 로봇(점수가 있는 모든 로봇) 중에서 LG의 순위를 산출합니다.</p>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-white mb-1">순위 계산</p>
        <p className="text-xs text-slate-400">순위 = (LG보다 높은 점수를 가진 로봇 수) + 1</p>
      </div>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-white mb-2">3개 순위 기준</p>
        <div className="space-y-1 text-xs">
          <p><span className="text-blue-400">PoC 순위</span> — 6개 PoC 팩터 합계 기준 (최대 60점)</p>
          <p><span className="text-amber-400">RFM 순위</span> — 6개 RFM 팩터 합계 기준 (최대 60점)</p>
          <p><span className="text-emerald-400">종합 순위</span> — PoC + RFM 합산 기준 (최대 120점)</p>
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/50 p-3">
        <p className="font-medium text-white mb-1">참고</p>
        <p className="text-xs text-slate-400">순위는 비교 대상 선택과 무관하게 전체 로봇 기준으로 산출됩니다.</p>
      </div>
    </ScoreInfoButton>
  );
}
