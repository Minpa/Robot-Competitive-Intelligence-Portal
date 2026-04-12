'use client';

import { useState, useMemo } from 'react';

type ModelType = 'hardware_sales' | 'raas' | 'b2b2c';

interface ModelConfig {
  label: string;
  fields: { key: string; label: string; defaultValue: number; unit: string }[];
  calculate: (values: Record<string, number>) => number;
}

const MODELS: Record<ModelType, ModelConfig> = {
  hardware_sales: {
    label: '하드웨어 판매',
    fields: [
      { key: 'price', label: '단가 (만원)', defaultValue: 5000, unit: '만원' },
      { key: 'volume', label: '판매량 (대/년)', defaultValue: 100, unit: '대' },
    ],
    calculate: (v) => (v.price ?? 0) * (v.volume ?? 0),
  },
  raas: {
    label: 'RaaS (구독형)',
    fields: [
      { key: 'fee', label: '월 구독료 (만원)', defaultValue: 200, unit: '만원' },
      { key: 'subs', label: '구독자 수', defaultValue: 50, unit: '명' },
      { key: 'months', label: '기간 (개월)', defaultValue: 12, unit: '개월' },
    ],
    calculate: (v) => (v.fee ?? 0) * (v.subs ?? 0) * (v.months ?? 0),
  },
  b2b2c: {
    label: 'B2B2C 플랫폼',
    fields: [
      { key: 'platform_fee', label: '플랫폼 수수료 (만원/월)', defaultValue: 100, unit: '만원' },
      { key: 'commission', label: '거래 수수료 (만원/월)', defaultValue: 50, unit: '만원' },
      { key: 'months', label: '기간 (개월)', defaultValue: 12, unit: '개월' },
    ],
    calculate: (v) => ((v.platform_fee ?? 0) + (v.commission ?? 0)) * (v.months ?? 0),
  },
};

export function RevenueSimulator() {
  const [modelType, setModelType] = useState<ModelType>('hardware_sales');
  const model = MODELS[modelType];

  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const f of model.fields) init[f.key] = f.defaultValue;
    return init;
  });

  const revenue = useMemo(() => model.calculate(values), [model, values]);

  function switchModel(t: ModelType) {
    setModelType(t);
    const init: Record<string, number> = {};
    for (const f of MODELS[t].fields) init[f.key] = f.defaultValue;
    setValues(init);
  }

  return (
    <div className="rounded-lg bg-argos-surface border border-argos-borderSoft p-4">
      <h3 className="text-sm font-semibold text-argos-ink mb-4">수익 모델 시뮬레이터</h3>

      {/* Model selector */}
      <div className="flex gap-1 mb-4">
        {(Object.entries(MODELS) as [ModelType, ModelConfig][]).map(([key, m]) => (
          <button
            key={key}
            onClick={() => switchModel(key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              modelType === key
                ? 'bg-blue-600 text-white'
                : 'bg-argos-bgAlt text-argos-muted hover:bg-argos-bgAlt hover:text-argos-ink'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Input fields */}
      <div className="space-y-3 mb-4">
        {model.fields.map((f) => (
          <div key={f.key}>
            <label className="text-xs text-argos-muted mb-1 block">{f.label}</label>
            <input
              type="number"
              value={values[f.key] ?? 0}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [f.key]: Number(e.target.value) || 0 }))
              }
              className="w-full rounded-md bg-argos-bg border border-argos-border px-3 py-1.5 text-sm text-argos-ink focus:border-blue-500 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Result */}
      <div className="rounded-md bg-argos-bg border border-argos-borderSoft p-3 text-center">
        <p className="text-xs text-argos-muted mb-1">예상 매출</p>
        <p className="text-xl font-bold text-green-400">
          {revenue >= 10000
            ? `${(revenue / 10000).toFixed(1)}억원`
            : `${revenue.toLocaleString()}만원`}
        </p>
      </div>
    </div>
  );
}
