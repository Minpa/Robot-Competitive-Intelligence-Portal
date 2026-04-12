'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ChartInfoModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function ChartInfoModal({ isOpen, title, children, onClose }: ChartInfoModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-argos-surface border border-argos-border rounded-xl shadow-xl max-h-[90vh] w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-argos-border">
          <h2 className="text-lg font-semibold text-argos-ink">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-argos-inkSoft hover:bg-argos-bgAlt"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-auto text-sm leading-relaxed text-argos-ink">
          {children}
        </div>
      </div>
    </div>
  );
}
