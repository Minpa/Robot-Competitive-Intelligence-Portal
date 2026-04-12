'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  /** e.g. "INTELLIGENCE MODULE V4.2" */
  module?: string;
  /** Korean title — primary large heading */
  titleKo: string;
  /** English title — displayed after the Korean title, uppercase */
  titleEn?: string;
  /** Optional subtitle / description under the title */
  description?: string;
  /** Right-aligned slot (usually action buttons like Export PDF) */
  actions?: ReactNode;
}

/**
 * ARGOS reference pattern:
 *
 *   INTELLIGENCE MODULE V4.2                               [Actions]
 *   경쟁비교 / COMPETITIVE
 *   COMPARISON
 *   — description line —
 */
export function PageHeader({ module, titleKo, titleEn, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {module && (
            <div className="argos-module-label mb-2">{module}</div>
          )}
          <h1 className="argos-title">
            <span>{titleKo}</span>
            {titleEn && (
              <>
                <span className="text-argos-faint font-bold mx-3">/</span>
                <span className="argos-title-en">{titleEn}</span>
              </>
            )}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-argos-muted max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Primary solid navy button — matches "New Comparison" / "Generate Report" CTAs */
export function PrimaryButton({ children, onClick, icon: Icon }: { children: ReactNode; onClick?: () => void; icon?: any }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 bg-argos-navy hover:bg-argos-navyDark text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-argos-card"
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

/** Secondary outlined button — matches "Export PDF" CTAs */
export function SecondaryButton({ children, onClick, icon: Icon }: { children: ReactNode; onClick?: () => void; icon?: any }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 bg-argos-surface hover:bg-argos-bgAlt text-argos-ink text-[13px] font-semibold px-4 py-2.5 rounded-lg border border-argos-border transition-colors shadow-argos-card"
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

/** White card container — matches reference image surfaces */
export function ArgosCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-argos-surface border border-argos-border rounded-xl shadow-argos-card ${className}`}>
      {children}
    </div>
  );
}

/** Section title used inside cards (e.g. "Certification Matrix") */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-bold text-argos-ink tracking-tight">{children}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}
