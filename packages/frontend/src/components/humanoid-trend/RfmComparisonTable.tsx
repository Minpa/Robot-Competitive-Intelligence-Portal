import React from 'react';

const companies = [
  { key: 'tesla', name: 'Tesla (Optimus Gen3)' },
  { key: 'figure', name: 'Figure AI (Figure 03)' },
  { key: 'bd', name: 'Boston Dynamics (Atlas)' },
  { key: 'deepmind', name: 'Google DeepMind' },
  { key: 'unitree', name: 'Unitree' },
  { key: 'lg', name: 'LG' },
];

const rows = [
  {
    label: '모델 아키텍처 & 학습 역량',
    values: {
      tesla: 'VLA 전용, FSD 개량, 공장 데이터 중심',
      figure: 'Helix VLA + 3D 센서, 고밀도 제어 모델',
      bd: 'Atlas 전용 Gemini 통합, 56DOF 최적화',
      deepmind: 'Gemini Robotics, 대규모 VLA + 추론 최적화',
      unitree: 'UnifloM-VLA, SDK/오픈 생태계',
      lg: 'KAPEX/CLOiD 통합 플랫폼, 파트너 생태계',
    },
  },
  {
    label: '데이터/실세계 테스트',
    values: {
      tesla: '제조 공장 데이터 기반, 자체 시뮬',
      figure: '3D 센서 대용량 데이터 수집',
      bd: '현장 테스트 중심, Spot 등과 협업',
      deepmind: '대규모 데이터셋+설명가능성 강화',
      unitree: '저비용 시연 중심, 빠른 피드백 루프',
      lg: '가정·산업용 통합 데이터, 파트너 공유',
    },
  },
  {
    label: '엣지 추론 & 하드웨어',
    values: {
      tesla: '온디바이스 VLA, 통합 HW-SW',
      figure: '카메라+센서+핸드 동시 설계',
      bd: 'Atlas 전용 HW, 56DOF 최적화',
      deepmind: 'GPU/TPU 기반 VLA, 클라우드/엣지 혼합',
      unitree: '경량화 플랫폼, 모바일 SOC 기반',
      lg: 'CLOiD KAPEX 플랫폼, 통합 SoC',
    },
  },
  {
    label: '오픈소스·생태계',
    values: {
      tesla: '내부 중심, 제한적 공개',
      figure: '제한적 공개, 산업 파트너 확대',
      bd: 'SDK/오픈 데이터셋 일부 공개',
      deepmind: '논문·SDK 공개, 다양한 파트너',
      unitree: 'SDK 공개, GitHub 생태계',
      lg: '파트너 기반 플랫폼, 제한적 공개',
    },
  },
  {
    label: '상용성 & 설명 가능성',
    values: {
      tesla: '제조용 실증 중심, 비교적 폐쇄',
      figure: '정밀 조작 강조, 설명용 자료 제한',
      bd: '현장 중심, 기능 중심 설명',
      deepmind: '추론 과정 설명 지원 목표',
      unitree: '빠른 시연 중심, 오픈 SDK 강조',
      lg: '파트너 중심, 설명용 도구 개발 중',
    },
  },
];

export default function RfmComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-300">
            <th className="border border-slate-700 px-3 py-2">비교 항목</th>
            {companies.map((company) => (
              <th key={company.key} className="border border-slate-700 px-3 py-2">
                {company.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-slate-700">
              <td className="border border-slate-700 px-3 py-2 font-medium text-slate-200">
                {row.label}
              </td>
              {companies.map((company) => (
                <td key={company.key} className="border border-slate-700 px-3 py-2 text-slate-300">
                  {row.values[company.key as keyof typeof row.values]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
