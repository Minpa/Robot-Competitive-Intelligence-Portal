'use client';

import { ScoreInfoButton } from '../competitive/ScoreInfoModal';

export function PositioningCardInfo() {
  return (
    <ScoreInfoButton title="LG 종합 포지셔닝 산출 방식">
      <p className="text-argos-muted">LG 로봇의 전체 경쟁 로봇 대비 종합 순위와 점수를 표시합니다.</p>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-2">순위 계산</p>
        <p className="text-xs text-argos-muted">종합 순위 = (LG보다 높은 종합 점수를 가진 로봇 수) + 1</p>
        <p className="text-xs text-argos-muted mt-1">상위 % = (전체 로봇 수 - 순위 + 1) / 전체 로봇 수 × 100</p>
      </div>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-2">점수 구성</p>
        <div className="space-y-1 text-xs">
          <p><span className="text-blue-400">PoC 합계</span> — 6개 PoC 팩터(하드웨어 역량) 점수의 합 (최대 60)</p>
          <p><span className="text-amber-400">RFM 합계</span> — 6개 RFM 팩터(소프트웨어/시장 역량) 점수의 합 (최대 30)</p>
          <p><span className="text-emerald-400">종합 점수</span> — PoC + RFM 합산 (최대 90)</p>
        </div>
      </div>
    </ScoreInfoButton>
  );
}

export function RadarSummaryInfo() {
  return (
    <ScoreInfoButton title="LG 레이더 차트 산출 방식">
      <p className="text-argos-muted">LG 로봇의 PoC 6대 역량을 레이더 차트로 시각화합니다.</p>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-2">6개 축</p>
        <table className="w-full text-xs">
          <tbody className="divide-y divide-argos-border">
            <tr><td className="py-1.5 text-argos-muted w-24">하드웨어</td><td>가반하중, 운용시간 등 물리적 역량</td></tr>
            <tr><td className="py-1.5 text-argos-muted">소프트웨어</td><td>AI/제어 소프트웨어 수준</td></tr>
            <tr><td className="py-1.5 text-argos-muted">배치</td><td>실제 환경 배치/배포 현황</td></tr>
            <tr><td className="py-1.5 text-argos-muted">안전성</td><td>인간 협업 안전 수준</td></tr>
            <tr><td className="py-1.5 text-argos-muted">상호작용</td><td>사람과의 상호작용 능력</td></tr>
            <tr><td className="py-1.5 text-argos-muted">자율성</td><td>자율 판단/행동 수준</td></tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-1">해석</p>
        <p className="text-xs text-argos-muted">면적이 넓을수록 전반적 역량이 우수합니다. 특정 축이 짧으면 해당 영역의 개선이 필요합니다.</p>
      </div>
    </ScoreInfoButton>
  );
}

export function GoalStatusInfo() {
  return (
    <ScoreInfoButton title="전략 목표 상태 산출 방식">
      <p className="text-argos-muted">등록된 전략 목표들의 달성 상태를 4단계로 분류합니다.</p>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-2">상태 분류 기준</p>
        <div className="space-y-1.5 text-xs">
          <p><span className="text-emerald-400">달성</span> — 현재 값 ≥ 목표 값 (target 달성)</p>
          <p><span className="text-blue-400">순조</span> — 현재 진행률이 시간 경과 대비 양호</p>
          <p><span className="text-amber-400">위험</span> — 진행률이 예상 일정 대비 뒤처짐</p>
          <p><span className="text-red-400">지연</span> — 마감일 초과 또는 심각한 지연</p>
        </div>
      </div>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-1">활용</p>
        <p className="text-xs text-argos-muted">위험/지연 목표가 많으면 전략 재조정이 필요합니다. 시뮬레이션 탭에서 What-If 분석으로 대안을 검토할 수 있습니다.</p>
      </div>
    </ScoreInfoButton>
  );
}

export function AlertPanelInfo() {
  return (
    <ScoreInfoButton title="경쟁 동향 알림 안내">
      <p className="text-argos-muted">경쟁사의 주요 변화를 실시간으로 추적하여 알림을 제공합니다.</p>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-2">알림 유형</p>
        <div className="space-y-1.5 text-xs">
          <p><span className="text-orange-400">점수 급등</span> — 경쟁사의 PoC/RFM 점수가 급격히 상승</p>
          <p><span className="text-purple-400">양산</span> — 경쟁사가 양산/대량 생산 단계 진입</p>
          <p><span className="text-green-400">투자</span> — 경쟁사의 주요 투자 유치 또는 자금 확보</p>
          <p><span className="text-blue-400">파트너십</span> — 경쟁사의 새로운 전략적 제휴 체결</p>
        </div>
      </div>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-1">데이터 소스</p>
        <p className="text-xs text-argos-muted">스코어링 파이프라인 실행 시 점수 변동 감지, 또는 수동 등록된 알림이 표시됩니다. 시계열+알림 탭에서 전체 내역을 확인할 수 있습니다.</p>
      </div>
    </ScoreInfoButton>
  );
}

export function PartnerSummaryInfo() {
  return (
    <ScoreInfoButton title="전략 파트너 요약 안내">
      <p className="text-argos-muted">LG 로봇 전략에 등록된 파트너를 카테고리별로 집계합니다.</p>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-2">파트너 카테고리</p>
        <div className="space-y-1.5 text-xs">
          <p><span className="text-argos-inkSoft">부품</span> — 하드웨어 부품 공급 파트너 (모터, 센서, 액추에이터 등)</p>
          <p><span className="text-argos-inkSoft">RFM</span> — 로봇 파운데이션 모델 관련 파트너</p>
          <p><span className="text-argos-inkSoft">데이터</span> — 학습 데이터/실환경 데이터 제공 파트너</p>
          <p><span className="text-argos-inkSoft">플랫폼</span> — 소프트웨어 플랫폼/OS 파트너</p>
          <p><span className="text-argos-inkSoft">통합</span> — 시스템 통합(SI) 파트너</p>
        </div>
      </div>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-1">막대 차트</p>
        <p className="text-xs text-argos-muted">막대 길이는 해당 카테고리 파트너 수의 상대적 비율입니다. 파트너 전략 탭에서 상세 관리가 가능합니다.</p>
      </div>
    </ScoreInfoButton>
  );
}

export function TopDomainsInfo() {
  return (
    <ScoreInfoButton title="사업화 기회 상위 3개 산출 방식">
      <p className="text-argos-muted">등록된 사업 도메인 중 기회 점수가 가장 높은 3개를 표시합니다.</p>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-1">기회 점수 계산</p>
        <p className="text-xs text-argos-muted font-mono">기회 점수 = LG 준비도 × SOM (억 달러)</p>
      </div>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-2">지표 설명</p>
        <div className="space-y-1.5 text-xs">
          <p><span className="text-argos-inkSoft">LG 준비도</span> — LG의 해당 도메인 진입 준비 수준 (0~100%)</p>
          <p><span className="text-argos-inkSoft">SOM</span> — Serviceable Obtainable Market, 실제 획득 가능 시장 규모 (억 달러)</p>
          <p><span className="text-emerald-400">기회 점수</span> — 높을수록 LG에게 유리한 시장 진입 기회</p>
        </div>
      </div>

      <div className="rounded-lg bg-argos-surface p-3">
        <p className="font-medium text-argos-ink mb-1">활용</p>
        <p className="text-xs text-argos-muted">사업 전략 탭에서 전체 도메인 분석과 로봇-도메인 적합도 매트릭스를 확인할 수 있습니다.</p>
      </div>
    </ScoreInfoButton>
  );
}
