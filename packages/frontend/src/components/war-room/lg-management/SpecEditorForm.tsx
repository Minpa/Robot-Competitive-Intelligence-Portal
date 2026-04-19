'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import type { LgRobotWithSpecs } from '@/types/war-room';

interface SpecEditorFormProps {
  robot: LgRobotWithSpecs;
  onSave: (specs: any) => void;
  isSaving: boolean;
}

type TabKey = 'body' | 'hand' | 'computing' | 'sensor' | 'power';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'body', label: 'Body' },
  { key: 'hand', label: 'Hand' },
  { key: 'computing', label: 'Computing' },
  { key: 'sensor', label: 'Sensor' },
  { key: 'power', label: 'Power' },
];

const BODY_FIELDS = [
  { key: 'heightCm', label: '키 (cm)', type: 'number' },
  { key: 'weightKg', label: '무게 (kg)', type: 'number' },
  { key: 'payloadKg', label: '페이로드 (kg)', type: 'number' },
  { key: 'dofCount', label: 'DoF 수', type: 'number' },
  { key: 'maxSpeedMps', label: '최대 속도 (m/s)', type: 'number' },
  { key: 'operationTimeHours', label: '운용 시간 (h)', type: 'number' },
] as const;

const HAND_FIELDS = [
  { key: 'handType', label: '핸드 타입', type: 'text' },
  { key: 'fingerCount', label: '손가락 수', type: 'number' },
  { key: 'handDof', label: '핸드 DoF', type: 'number' },
  { key: 'gripForceN', label: '그립력 (N)', type: 'number' },
  { key: 'isInterchangeable', label: '교체 가능', type: 'checkbox' },
] as const;

const COMPUTING_FIELDS = [
  { key: 'mainSoc', label: '메인 SoC', type: 'text' },
  { key: 'topsMin', label: 'TOPS (최소)', type: 'number' },
  { key: 'topsMax', label: 'TOPS (최대)', type: 'number' },
  { key: 'architectureType', label: '아키텍처', type: 'text' },
] as const;

const SENSOR_FIELDS = [
  { key: 'sensorType', label: '센서 타입', type: 'text' },
  { key: 'sensorModel', label: '센서 모델', type: 'text' },
  { key: 'sensorResolution', label: '센서 해상도', type: 'text' },
] as const;

const POWER_FIELDS = [
  { key: 'batteryType', label: '배터리 타입', type: 'text' },
  { key: 'capacityWh', label: '용량 (Wh)', type: 'number' },
  { key: 'operationTimeHours', label: '운용 시간 (h)', type: 'number' },
  { key: 'chargingMethod', label: '충전 방식', type: 'text' },
] as const;

const FIELD_MAP: Record<TabKey, readonly { key: string; label: string; type: string }[]> = {
  body: BODY_FIELDS,
  hand: HAND_FIELDS,
  computing: COMPUTING_FIELDS,
  sensor: SENSOR_FIELDS,
  power: POWER_FIELDS,
};

const SPEC_KEY_MAP: Record<TabKey, keyof LgRobotWithSpecs> = {
  body: 'bodySpec',
  hand: 'handSpec',
  computing: 'computingSpec',
  sensor: 'sensorSpec',
  power: 'powerSpec',
};

function getInitialFormData(robot: LgRobotWithSpecs): Record<TabKey, Record<string, any>> {
  const result = {} as Record<TabKey, Record<string, any>>;
  for (const tab of TABS) {
    const specData = robot[SPEC_KEY_MAP[tab.key]] as Record<string, unknown> | null;
    const fields: Record<string, any> = {};
    for (const field of FIELD_MAP[tab.key]) {
      fields[field.key] = specData?.[field.key] ?? '';
    }
    result[tab.key] = fields;
  }
  return result;
}

export function SpecEditorForm({ robot, onSave, isSaving }: SpecEditorFormProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('body');
  const [formData, setFormData] = useState(() => getInitialFormData(robot));

  useEffect(() => {
    setFormData(getInitialFormData(robot));
  }, [robot.id]);

  const handleFieldChange = (tab: TabKey, fieldKey: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [fieldKey]: value },
    }));
  };

  const handleSave = () => {
    const specs: Record<string, Record<string, any>> = {};
    for (const tab of TABS) {
      const fields = formData[tab.key];
      const cleaned: Record<string, any> = {};
      for (const field of FIELD_MAP[tab.key]) {
        const val = fields[field.key];
        if (field.type === 'number') {
          cleaned[field.key] = val === '' ? null : Number(val);
        } else if (field.type === 'checkbox') {
          cleaned[field.key] = Boolean(val);
        } else {
          cleaned[field.key] = val || null;
        }
      }
      specs[tab.key] = cleaned;
    }
    onSave(specs);
  };

  const currentFields = FIELD_MAP[activeTab];
  const currentData = formData[activeTab];

  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">스펙 편집</h3>
          <p className="mt-0.5 text-xs text-ink-500">{robot.name}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-3.5 w-3.5" />
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-ink-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-ink-900'
                : 'text-ink-500 hover:text-ink-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {currentFields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-ink-500">{field.label}</label>
            {field.type === 'checkbox' ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!currentData[field.key]}
                  onChange={(e) => handleFieldChange(activeTab, field.key, e.target.checked)}
                  className="h-4 w-4 rounded border-ink-200 bg-ink-100 text-blue-600"
                />
                <span className="text-sm text-ink-700">{currentData[field.key] ? '예' : '아니오'}</span>
              </label>
            ) : (
              <input
                type={field.type}
                value={currentData[field.key] ?? ''}
                onChange={(e) => handleFieldChange(activeTab, field.key, e.target.value)}
                className="w-full rounded-lg border border-ink-200 bg-ink-100 px-3 py-2 text-sm text-ink-900 placeholder-ink-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={field.label}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
