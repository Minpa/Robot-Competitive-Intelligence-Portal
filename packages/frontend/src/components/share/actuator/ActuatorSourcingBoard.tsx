'use client';

/**
 * 조달 방식 보드 — 결론 한 줄 → 숫자 타일 4개(자체 설계·자체 제조 / 자체 설계·외부 제조/양산 / 외부 모듈 구매 / 확인 불가) → 조달 방식 표 → 각주.
 * 집계·문장은 actuator-sourcing-board.ts(buildSourcingBoard)가 만들고, 다운로드 HTML(buildSourcingBoardHtml)이 같은 결과를 쓴다.
 * 색은 tailwind info/pos/neg/ink-400 값을 복제한 상수(BOARD_COLOR)만 쓰고 의미는 텍스트 라벨로도 전달한다. 인쇄에도 포함된다.
 */

import { useMemo } from 'react';
import type { ActuatorMapResponse } from '@/types/actuator-map';
import { SubCard } from '../timeline-shared';
import { PRINT_EXACT } from './ActuatorSourcingSummary';
import { BOARD_COLUMNS, BOARD_EMPTY_TEXT, buildSourcingBoard, type BoardLine } from './actuator-sourcing-board';

const TH = 'text-left align-bottom px-2 py-1.5 text-[11px] font-medium text-ink-600 bg-ink-50 border-b border-ink-200 print:whitespace-normal';
/** 한글은 어절 단위로 줄바꿈하고(keep-all), 긴 영문 토큰만 강제로 끊는다 */
const TD = 'px-2 py-2 text-[12px] leading-relaxed align-top border-b border-ink-100 break-keep [overflow-wrap:anywhere]';

const COL_W = ['w-[104px]', 'w-[26%]', 'w-[88px]', 'w-[26%]', 'w-[24%]'];

function Lines({ lines, rowMuted }: { lines: BoardLine[]; rowMuted: boolean }) {
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} title={l.title} className={l.muted ? 'text-[11px] text-ink-500' : rowMuted ? 'text-ink-600' : 'text-ink-900'}>
          {l.text}
        </div>
      ))}
    </>
  );
}

export function ActuatorSourcingBoard({ data }: { data: ActuatorMapResponse }) {
  const board = useMemo(() => buildSourcingBoard(data), [data]);

  if (!board.hasData) {
    return (
      <SubCard title={board.title} description={board.description}>
        <p className="py-4 text-center text-[13px] text-ink-500">표시할 회사가 없습니다</p>
      </SubCard>
    );
  }

  return (
    <SubCard title={board.title} description={board.description}>
      <p className="text-[13px] leading-relaxed text-ink-900">
        {board.conclusion.map((s, i) => (
          <span key={i} className={s.strong ? 'font-bold' : undefined}>
            {s.text}
          </span>
        ))}
      </p>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 print:grid-cols-4">
        {board.tiles.map((t) => (
          <div
            key={t.id}
            role="group"
            aria-label={t.ariaLabel}
            className="break-inside-avoid rounded-[10px] border border-ink-200 bg-ink-50 px-3 py-2.5"
            style={PRINT_EXACT}
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] font-bold leading-none tabular-nums" style={{ color: t.color, ...PRINT_EXACT }}>
                {t.count}
              </span>
              <span className="text-[11px] text-ink-600">개사</span>
            </div>
            <div className="mt-1.5 text-[11.5px] leading-snug text-ink-600">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[820px] border-collapse print:min-w-0">
          <caption className="sr-only">{`${board.title} — ${BOARD_COLUMNS.join(', ')}`}</caption>
          <thead>
            <tr>
              {BOARD_COLUMNS.map((c, i) => (
                <th key={c} scope="col" className={`${TH} ${COL_W[i]}`} style={PRINT_EXACT}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {board.rows.map((r) => (
              <tr key={r.id} className="break-inside-avoid">
                <th scope="row" className={`${TD} text-left font-bold`} style={{ color: r.color, ...PRINT_EXACT }}>
                  {r.rowLabel.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </th>
                <td className={`${TD} ${r.muted ? 'text-ink-600' : 'text-ink-900'}`}>
                  {r.empty ? (
                    <span className="text-ink-500">{BOARD_EMPTY_TEXT}</span>
                  ) : (
                    r.companies.map((c, i) => (
                      <span key={c.name} title={c.title}>
                        {i > 0 ? ', ' : ''}
                        {c.label}
                      </span>
                    ))
                  )}
                </td>
                <td className={`${TD} ${r.muted ? 'text-ink-600' : 'text-ink-900'}`}>{r.designMfg}</td>
                <td className={TD}>
                  <Lines lines={r.bought} rowMuted={r.muted} />
                </td>
                <td className={TD}>
                  <Lines lines={r.sold} rowMuted={r.muted} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1 text-[11px] leading-relaxed text-ink-600">
        {board.footnotes.map((f) => (
          <p key={f.id}>{f.text}</p>
        ))}
      </div>
    </SubCard>
  );
}
