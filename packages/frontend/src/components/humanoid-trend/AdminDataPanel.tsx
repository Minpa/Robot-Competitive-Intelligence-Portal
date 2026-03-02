'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  useCreatePocScore, useDeletePocScore,
  useCreateRfmScore, useDeleteRfmScore,
  useCreatePositioningData, useDeletePositioningData,
  usePocScores, useRfmScores,
} from '@/hooks/useHumanoidTrend';
import { Settings, X, Plus, Trash2 } from 'lucide-react';
import ScoringPipelineAdmin from './ScoringPipelineAdmin';

type Tab = 'poc' | 'rfm' | 'positioning' | 'pipeline';

export default function AdminDataPanel() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => api.getMe() });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('poc');

  // Only show for admin-like users (simple check)
  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase() === 'somewhere010@gmail.com';
  if (!isAdmin) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-violet-600 hover:bg-violet-700 text-white rounded-full p-3 shadow-lg transition-colors"
        title="데이터 관리"
      >
        <Settings className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">데이터 관리</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {(['poc', 'rfm', 'positioning', 'pipeline'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-medium ${tab === t ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-500'}`}
                >
                  {t === 'poc' ? 'PoC 점수' : t === 'rfm' ? 'RFM 점수' : t === 'positioning' ? '포지셔닝' : '파이프라인'}
                </button>
              ))}
            </div>

            <div className="p-4">
              {tab === 'poc' && <PocTab />}
              {tab === 'rfm' && <RfmTab />}
              {tab === 'positioning' && <PositioningTab />}
              {tab === 'pipeline' && <ScoringPipelineAdmin />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PocTab() {
  const { data: scores } = usePocScores();
  const createMut = useCreatePocScore();
  const deleteMut = useDeletePocScore();
  const [form, setForm] = useState({ robotId: '', payloadScore: 5, operationTimeScore: 5, fingerDofScore: 5, formFactorScore: 5, pocDeploymentScore: 5, costEfficiencyScore: 5 });

  const handleCreate = () => {
    if (!form.robotId) return;
    createMut.mutate(form, { onSuccess: () => setForm({ ...form, robotId: '' }) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input placeholder="Robot ID" value={form.robotId} onChange={(e) => setForm({ ...form, robotId: e.target.value })}
          className="w-full px-3 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
        <div className="grid grid-cols-3 gap-2">
          {(['payloadScore', 'operationTimeScore', 'fingerDofScore', 'formFactorScore', 'pocDeploymentScore', 'costEfficiencyScore'] as const).map((k) => (
            <label key={k} className="text-xs text-gray-500 dark:text-gray-400">
              {k.replace('Score', '')}
              <input type="number" min={1} max={10} value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
            </label>
          ))}
        </div>
        <button onClick={handleCreate} disabled={createMut.isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50">
          <Plus className="w-4 h-4" /> 추가
        </button>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {scores?.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 py-1 border-b border-gray-100 dark:border-gray-800">
            <span>{s.robotName} ({s.companyName}) — 평균 {s.averageScore}</span>
            <button onClick={() => deleteMut.mutate(s.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RfmTab() {
  const { data: scores } = useRfmScores();
  const createMut = useCreateRfmScore();
  const deleteMut = useDeleteRfmScore();
  const [form, setForm] = useState({ robotId: '', rfmModelName: '', generalityScore: 3, realWorldDataScore: 3, edgeInferenceScore: 3, multiRobotCollabScore: 3, openSourceScore: 3, commercialMaturityScore: 3 });

  const handleCreate = () => {
    if (!form.robotId || !form.rfmModelName) return;
    createMut.mutate(form, { onSuccess: () => setForm({ ...form, robotId: '', rfmModelName: '' }) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input placeholder="Robot ID" value={form.robotId} onChange={(e) => setForm({ ...form, robotId: e.target.value })}
          className="w-full px-3 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
        <input placeholder="RFM 모델명" value={form.rfmModelName} onChange={(e) => setForm({ ...form, rfmModelName: e.target.value })}
          className="w-full px-3 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
        <div className="grid grid-cols-3 gap-2">
          {(['generalityScore', 'realWorldDataScore', 'edgeInferenceScore', 'multiRobotCollabScore', 'openSourceScore', 'commercialMaturityScore'] as const).map((k) => (
            <label key={k} className="text-xs text-gray-500 dark:text-gray-400">
              {k.replace('Score', '')}
              <input type="number" min={1} max={5} value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
            </label>
          ))}
        </div>
        <button onClick={handleCreate} disabled={createMut.isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50">
          <Plus className="w-4 h-4" /> 추가
        </button>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {scores?.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 py-1 border-b border-gray-100 dark:border-gray-800">
            <span>{s.robotName} — {s.rfmModelName}</span>
            <button onClick={() => deleteMut.mutate(s.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PositioningTab() {
  const createMut = useCreatePositioningData();
  const deleteMut = useDeletePositioningData();
  const [form, setForm] = useState({ chartType: 'rfm_competitiveness', robotId: '', label: '', xValue: 0, yValue: 0, bubbleSize: 1, colorGroup: '' });

  const handleCreate = () => {
    if (!form.label) return;
    createMut.mutate({ ...form, robotId: form.robotId || undefined, colorGroup: form.colorGroup || undefined });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <select value={form.chartType} onChange={(e) => setForm({ ...form, chartType: e.target.value })}
          className="w-full px-3 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white">
          <option value="rfm_competitiveness">RFM 경쟁력</option>
          <option value="poc_positioning">PoC 포지셔닝</option>
          <option value="soc_ecosystem">SoC 에코시스템</option>
        </select>
        <input placeholder="Robot ID (선택)" value={form.robotId} onChange={(e) => setForm({ ...form, robotId: e.target.value })}
          className="w-full px-3 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
        <input placeholder="라벨" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
          className="w-full px-3 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-gray-500 dark:text-gray-400">X
            <input type="number" step="0.1" value={form.xValue} onChange={(e) => setForm({ ...form, xValue: Number(e.target.value) })}
              className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
          </label>
          <label className="text-xs text-gray-500 dark:text-gray-400">Y
            <input type="number" step="0.1" value={form.yValue} onChange={(e) => setForm({ ...form, yValue: Number(e.target.value) })}
              className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
          </label>
          <label className="text-xs text-gray-500 dark:text-gray-400">버블
            <input type="number" step="0.1" value={form.bubbleSize} onChange={(e) => setForm({ ...form, bubbleSize: Number(e.target.value) })}
              className="w-full px-2 py-1 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
          </label>
        </div>
        <input placeholder="색상 그룹 (US/CN/KR)" value={form.colorGroup} onChange={(e) => setForm({ ...form, colorGroup: e.target.value })}
          className="w-full px-3 py-2 text-sm border rounded dark:bg-slate-800 dark:border-slate-600 dark:text-white" />
        <button onClick={handleCreate} disabled={createMut.isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50">
          <Plus className="w-4 h-4" /> 추가
        </button>
      </div>
    </div>
  );
}
