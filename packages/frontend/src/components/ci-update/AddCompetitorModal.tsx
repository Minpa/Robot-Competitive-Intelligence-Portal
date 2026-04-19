'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const stageOptions = [
  { value: 'concept', label: 'Concept' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'poc', label: 'PoC' },
  { value: 'pilot', label: 'Pilot' },
  { value: 'commercial', label: 'Commercial' },
];

export function AddCompetitorModal({ isOpen, onClose, onSuccess }: AddCompetitorModalProps) {
  const [form, setForm] = useState({
    slug: '',
    name: '',
    manufacturer: '',
    country: '',
    stage: 'prototype',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!form.slug || !form.name || !form.manufacturer) {
      setError('Slug, 이름, 제조사는 필수입니다.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.addCiCompetitor({
        slug: form.slug,
        name: form.name,
        manufacturer: form.manufacturer,
        country: form.country || undefined,
        stage: form.stage,
      });
      setForm({ slug: '', name: '', manufacturer: '', country: '', stage: 'prototype' });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '추가 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleSlugify = () => {
    if (form.name && !form.slug) {
      setForm(prev => ({
        ...prev,
        slug: prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl border border-ink-200 max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-ink-900 mb-4">새 경쟁사 추가</h3>

        {error && (
          <div className="mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-500 mb-1 block">이름 *</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              onBlur={handleSlugify}
              placeholder="Unitree H1"
              className="w-full bg-ink-100 border border-ink-200 rounded px-3 py-2 text-ink-900 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-ink-500 mb-1 block">Slug *</label>
            <input
              value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value })}
              placeholder="unitree-h1"
              className="w-full bg-ink-100 border border-ink-200 rounded px-3 py-2 text-ink-900 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-ink-500 mb-1 block">제조사 *</label>
            <input
              value={form.manufacturer}
              onChange={e => setForm({ ...form, manufacturer: e.target.value })}
              placeholder="Unitree Robotics"
              className="w-full bg-ink-100 border border-ink-200 rounded px-3 py-2 text-ink-900 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-ink-500 mb-1 block">국가</label>
            <input
              value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}
              placeholder="🇨🇳"
              className="w-full bg-ink-100 border border-ink-200 rounded px-3 py-2 text-ink-900 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-ink-500 mb-1 block">단계</label>
            <select
              value={form.stage}
              onChange={e => setForm({ ...form, stage: e.target.value })}
              className="w-full bg-ink-100 border border-ink-200 rounded px-3 py-2 text-ink-900 text-sm focus:outline-none focus:border-blue-500"
            >
              {stageOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[10px] text-ink-500 mt-3">
          추가 시 모든 비교 항목에 빈 셀이 자동 생성됩니다.
        </p>

        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-ink-100 text-ink-700 text-sm hover:bg-ink-100">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? '추가 중...' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
