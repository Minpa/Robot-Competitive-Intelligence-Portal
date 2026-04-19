'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  module?: string;
  titleKo: string;
  titleEn?: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ module, titleKo, titleEn, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {module && (
            <div className="font-mono text-[10px] font-medium text-gold uppercase tracking-[0.22em] mb-2">
              {module}
            </div>
          )}
          <h1 className="font-serif text-[28px] font-semibold text-ink-900 tracking-tight leading-tight">
            <span>{titleKo}</span>
            {titleEn && (
              <>
                <span className="text-ink-300 font-normal mx-3">/</span>
                <span className="uppercase">{titleEn}</span>
              </>
            )}
          </h1>
          {description && (
            <p className="mt-2 text-[13px] text-ink-500 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PrimaryButton({ children, onClick, icon: Icon }: { children: ReactNode; onClick?: () => void; icon?: any }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 bg-brand hover:bg-brand-soft text-white font-mono text-[11px] font-semibold uppercase tracking-[0.18em] px-4 py-2.5 transition-colors"
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, icon: Icon }: { children: ReactNode; onClick?: () => void; icon?: any }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 bg-white hover:bg-ink-50 text-ink-900 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] px-4 py-2.5 border border-ink-200 transition-colors"
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

export function ArgosCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-ink-200 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-serif text-[16px] font-semibold text-ink-900 tracking-tight">{children}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}
