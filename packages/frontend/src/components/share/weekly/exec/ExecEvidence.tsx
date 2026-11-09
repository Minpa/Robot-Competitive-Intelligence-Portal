import type { WeeklyReportEvidence } from '@/types/weekly-brief';
import { EXEC_EVIDENCE_TYPE_LABELS, evidenceMetaParts } from '@/lib/weekly-brief-exec';
import { safeArticleHref, safePaperHref, safeThumbSrc, safeVideoHref } from '@/lib/weekly-brief-format';
import { ExtLink } from '../PosterSections';
import { VideoThumb } from '../VideoThumbGrid';

/**
 * 근거 목록 (주요 내용·차이 카드·기술 흐름·사업 동향·확인 사항 공통).
 * 영상 근거에 썸네일이 있으면 참고 자료 카드처럼 썸네일 + 제목 + 채널·날짜를 보여주고(썸네일은 lazy + no-referrer),
 * 없으면 기존 칩 링크. 논문·기사·CI 근거는 출처·날짜를 함께 표시한다. CI 신뢰도 등급 코드는 쓰지 않는다(D·F 는 "추정치").
 */
export function ExecEvidence({ list }: { list: readonly WeeklyReportEvidence[] }) {
  if (list.length === 0) return null;
  return (
    <ul className="m-0 mt-2.5 flex list-none flex-wrap gap-1.5 p-0" data-testid="evidence-chips">
      {list.slice(0, 3).map((e) => {
        const key = `${e.type}:${e.id}`;
        const meta = evidenceMetaParts(e).join(' · ');
        const href = e.type === 'keyword' ? '' : e.type === 'video' ? safeVideoHref(e.url) : e.type === 'paper' ? safePaperHref(e.url) : safeArticleHref(e.url);
        if (e.type === 'video' && safeThumbSrc(e.thumbnail)) {
          return (
            <li key={key} className="flex w-full min-w-0 items-start gap-3 bg-poster-3 p-2 text-poster-fg" data-testid="evidence-video">
              <div className="w-[120px] shrink-0">
                <VideoThumb thumbnail={e.thumbnail ?? null} title={e.title} url={e.url} durationSec={null} />
              </div>
              <div className="min-w-0 text-[13px] leading-snug">
                <div className="font-bold">{href ? <ExtLink href={href} className="underline underline-offset-2">{e.title}</ExtLink> : e.title}</div>
                <div className="mt-0.5 text-[12px] text-poster-fg-2">{[EXEC_EVIDENCE_TYPE_LABELS.video, meta].filter(Boolean).join(' · ')}</div>
              </div>
            </li>
          );
        }
        const inner = `${EXEC_EVIDENCE_TYPE_LABELS[e.type] ?? ''} · ${e.title}${meta ? ` (${meta})` : ''}`;
        return (
          <li key={key} className="max-w-full break-words rounded-2xl bg-poster-3 px-2.5 py-[3px] text-[12.5px] text-poster-fg" data-testid="evidence-chip">
            {href ? <ExtLink href={href} className="underline underline-offset-2">{`${inner} ↗`}</ExtLink> : inner}
          </li>
        );
      })}
    </ul>
  );
}
