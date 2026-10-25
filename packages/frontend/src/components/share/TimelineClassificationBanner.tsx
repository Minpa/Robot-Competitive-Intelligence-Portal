'use client';

import type { TimelineClassification } from '@/types/tech-trend-timeline';
import { cn } from '@/lib/utils';

/** 분류율 경고 기준 (서버 해설 게이트와 동일한 80%) */
const WARN_RATIO = 0.8;

interface Props {
  classification: TimelineClassification;
  isAdmin: boolean;
  /** "{도메인} 무관" 문구의 도메인 명사 (기본 핸드) */
  domainLabel?: string;
}

/** 분류 진행 안내 — 미완료면 "분류 N/M 완료, 실행 필요". */
export function TimelineClassificationBanner({ classification: c, isAdmin, domainLabel = '핸드' }: Props) {
  const complete = c.total > 0 && c.unclassified === 0;
  const warn = c.ratio < WARN_RATIO;

  if (c.total === 0) return null;

  return (
    <div
      className={cn(
        'rounded-[10px] border px-4 py-3 text-[12.5px] leading-relaxed',
        complete ? 'border-ink-200 bg-ink-50 text-ink-700' : warn ? 'border-warn bg-warn-soft text-ink-900' : 'border-ink-200 bg-ink-50 text-ink-800'
      )}
      role="status"
    >
      {complete ? (
        <p>
          분류 {c.classified}/{c.total} 완료
          {c.offTopic > 0 ? ` · ${domainLabel} 무관 ${c.offTopic}건은 시계열에서 제외` : ''}
        </p>
      ) : (
        <>
          <p className="font-medium">
            분류 {c.classified}/{c.total} 완료, 실행 필요
            {c.offTopic > 0 ? ` · ${domainLabel} 무관 ${c.offTopic}건 제외` : ''}
          </p>
          <p className="text-ink-600 mt-0.5">
            미분류 {c.unclassified}건은 서브토픽별 차트(추이·히트맵)에서 제외됩니다.{' '}
            {isAdmin ? (
              <span className="no-print">상단의 &lsquo;시계열 분류 실행&rsquo; 버튼으로 분류를 실행하세요.</span>
            ) : (
              <span className="no-print">관리자에게 분류 실행을 요청하세요.</span>
            )}
          </p>
        </>
      )}
      {c.failed > 0 && <p className="text-neg mt-0.5">분류 실패 {c.failed}건(재시도 한도 초과)</p>}
    </div>
  );
}
