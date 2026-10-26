import type { WeeklyEvidence, WeeklyKeyMessage } from '@/types/weekly-brief';
import { EVIDENCE_TYPE_LABELS, clipText, safeEvidenceHref } from '@/lib/weekly-brief-format';
import { DashShort, ExtLink } from './PosterSections';

export function BigNum({ value, unit, className = '' }: { value: string; unit: string; className?: string }) {
  return (
    <div
      className={`mt-[10px] mb-1 font-black leading-none tracking-[-0.02em] break-words ${
        className || 'text-[38px] sm:text-[46px]'
      }`}
    >
      {value}
      {unit && <small className="ml-1 text-[18px] font-bold">{unit}</small>}
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: WeeklyEvidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <ul className="m-0 mt-[6px] list-none p-0 text-[12px] text-poster-fg-2">
      {evidence.slice(0, 3).map((e) => {
        const href = safeEvidenceHref(e.type, e.url);
        const text = `${EVIDENCE_TYPE_LABELS[e.type] ?? ''} · ${clipText(e.title, 60)}${e.label ? ` (${e.label})` : ''}`;
        return (
          <li key={`${e.type}:${e.id}`} className="my-[2px] break-words">
            {href ? (
              <ExtLink href={href} className="underline decoration-dotted underline-offset-2">
                {text} ↗
              </ExtLink>
            ) : (
              text
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** stat: 헤드라인 → 큰 숫자 → 캡션 → (점선 → 증감 라벨 → 증감 숫자) → 근거 */
export function StatMessage({ m }: { m: WeeklyKeyMessage }) {
  return (
    <div className="px-1 py-[6px] text-center" data-testid="key-message-stat">
      <p className="m-0 text-[14.5px] text-poster-fg-2 break-words">{m.headline}</p>
      <BigNum value={m.bigNumber.value} unit={m.bigNumber.unit} />
      <div className="text-[12px] text-poster-fg-2 break-words">{m.bigNumber.caption}</div>
      {m.delta && (
        <>
          <DashShort />
          <p className="m-0 text-[14.5px] text-poster-fg-2">{m.delta.label}</p>
          <BigNum value={m.delta.value} unit={m.delta.unit} />
        </>
      )}
      {m.note && <div className="mt-[6px] text-[12px] text-poster-fg-2 break-words">{m.note}</div>}
      <div className="mt-2 text-[12px] text-poster-fg-2">{m.basis}</div>
      <EvidenceList evidence={m.evidence} />
    </div>
  );
}

/** cause_effect: 키커(헤드라인) → 화살표 → 큰 결과. 모바일에서는 1열 + 화살표 90도 회전 */
export function CauseEffectMessage({ m }: { m: WeeklyKeyMessage }) {
  return (
    <div data-testid="key-message-cause">
      <div className="grid grid-cols-1 items-center gap-[10px] sm:grid-cols-[1.1fr_36px_1fr]">
        <div>
          <div className="inline-block bg-poster-3 px-[14px] py-2 text-left text-[15px] font-extrabold tracking-[0.02em] break-words">
            {m.headline}
          </div>
          <div className="mt-[6px] text-[12.5px] text-poster-fg-2 break-words">{m.bigNumber.caption}</div>
        </div>
        <div aria-hidden="true" className="rotate-90 text-center text-[26px] text-poster-fg-2 sm:rotate-0">
          →
        </div>
        <div className="text-center text-[24px] font-black leading-[1.15] break-words">
          {m.bigNumber.value}
          {m.bigNumber.unit && <small className="ml-1 text-[16px] font-bold">{m.bigNumber.unit}</small>}
        </div>
      </div>
      {m.note && <div className="mt-[6px] text-center text-[12px] text-poster-fg-2 break-words">{m.note}</div>}
      <div className="mt-3 text-center text-[12px] text-poster-fg-2">{m.basis}</div>
      <div className="text-center">
        <EvidenceList evidence={m.evidence} />
      </div>
    </div>
  );
}
