import { POSTER_FOOTER_NOTICE, POSTER_PARTIAL_NOTICE, formatKstDate } from '@/lib/weekly-brief-format';
import { POSTER_DASH } from '../PosterSections';

/** 푸터 — 생성일(KST), 출처 고지(기존 문구), partial 이면 규칙 기반 안내. 모델명은 표기하지 않는다 */
export function ReportFooter({ status, generatedAt }: { status: 'ok' | 'partial'; generatedAt: string }) {
  return (
    <footer className={`report-card ${POSTER_DASH} px-5 pb-[26px] pt-4 text-center text-[11px] text-poster-fg-3`} data-testid="report-footer">
      {status === 'partial' && <p className="m-0 mb-1">{POSTER_PARTIAL_NOTICE}</p>}
      <p className="m-0">
        {POSTER_FOOTER_NOTICE} · ARGOS · {formatKstDate(generatedAt)}
      </p>
    </footer>
  );
}
