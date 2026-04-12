'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface CreateRobotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: any) => void;
  isCreating: boolean;
}

const INITIAL_FORM = {
  name: '',
  locomotionType: 'wheeled',
  handType: '',
  purpose: '',
  status: 'concept',
};

export function CreateRobotModal({ isOpen, onClose, onCreate, isCreating }: CreateRobotModalProps) {
  const [form, setForm] = useState({ ...INITIAL_FORM });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onCreate(form);
    setForm({ ...INITIAL_FORM });
  };

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-argos-border bg-argos-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-argos-ink">새 LG 로봇 추가</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-argos-muted hover:bg-argos-bgAlt hover:text-argos-ink transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-argos-muted">로봇 이름 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full rounded-lg border border-argos-border bg-argos-bgAlt px-3 py-2 text-sm text-argos-ink placeholder-argos-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="예: CLOiD v2"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-argos-muted">이동 방식</label>
            <select
              value={form.locomotionType}
              onChange={(e) => handleChange('locomotionType', e.target.value)}
              className="w-full rounded-lg border border-argos-border bg-argos-bgAlt px-3 py-2 text-sm text-argos-ink focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="wheeled">Wheeled</option>
              <option value="bipedal">Bipedal</option>
              <option value="quadruped">Quadruped</option>
              <option value="tracked">Tracked</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-argos-muted">핸드 타입</label>
            <input
              type="text"
              value={form.handType}
              onChange={(e) => handleChange('handType', e.target.value)}
              className="w-full rounded-lg border border-argos-border bg-argos-bgAlt px-3 py-2 text-sm text-argos-ink placeholder-argos-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="예: gripper, dexterous"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-argos-muted">용도</label>
            <input
              type="text"
              value={form.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              className="w-full rounded-lg border border-argos-border bg-argos-bgAlt px-3 py-2 text-sm text-argos-ink placeholder-argos-muted focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="예: Home, Industrial"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-argos-muted">상태</label>
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full rounded-lg border border-argos-border bg-argos-bgAlt px-3 py-2 text-sm text-argos-ink focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="concept">Concept</option>
              <option value="prototype">Prototype</option>
              <option value="development">Development</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-argos-border px-4 py-2 text-sm text-argos-inkSoft hover:bg-argos-bgAlt transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isCreating || !form.name.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
              {isCreating ? '생성 중...' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
