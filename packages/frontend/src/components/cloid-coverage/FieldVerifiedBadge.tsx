import { MapPin } from 'lucide-react';

interface Props {
  source?: string;
  line?: string;
  size?: 'sm' | 'md';
}

/**
 * v1.3.1 r2 — '현장 확인' 배지.
 * LG·BCG 합동 ES사업부 A2동 (2026-05-10) 직접 관찰된 sub-cell에 노출.
 */
export default function FieldVerifiedBadge({ source, line, size = 'sm' }: Props) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-sm';
  const iconSize = size === 'sm' ? 12 : 14;
  return (
    <div className="inline-flex flex-col gap-0.5">
      <span
        className={`inline-flex items-center gap-1 ${padding} rounded border border-[#A50034] text-[#A50034] font-semibold bg-white`}
      >
        <MapPin size={iconSize} />
        현장 확인
      </span>
      {line && (
        <span className="text-[10px] text-gray-500 max-w-[280px] leading-snug">{line}</span>
      )}
      {source && size === 'md' && (
        <span className="text-[9px] text-gray-400">{source}</span>
      )}
    </div>
  );
}
