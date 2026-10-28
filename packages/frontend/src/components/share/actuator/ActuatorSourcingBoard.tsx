'use client';

/**
 * 조달 방식 보드 — 결론 한 줄 → 가로 누적 막대 2개(① 설계 / ② 조달 방식, 같은 폭·같은 스케일) + 범례(회사명·공급사) → ④ 판매 카드 →
 * 상세 표 토글(기본 접힘, 인쇄 제외) → 각주. 집계·문장은 actuator-sourcing-board.ts(buildSourcingBoard), 막대 데이터는 actuator-sourcing-bars.ts 가 만들고
 * 다운로드 HTML(buildSourcingBoardHtml)이 같은 결과를 쓴다. 색은 tailwind 값을 복제한 상수만 쓰고 의미는 텍스트 라벨로도 전달한다.
 */

import { useId, useMemo, useState } from 'react';
import type { ActuatorMapResponse } from '@/types/actuator-map';
import { SubCard } from '../timeline-shared';
import { ActuatorSourcingBars } from './ActuatorSourcingBars';
import { PRINT_EXACT } from './ActuatorSourcingSummary';
import { BOARD_COLUMNS, BOARD_EMPTY_TEXT, buildSourcingBoard, type BoardLine, type SourcingBoard } from './actuator-sourcing-board';
import { buildSourcingBars } from './actuator-sourcing-bars';

const TH = 'text-left align-bottom px-2 py-1.5 text-[11px] font-medium text-ink-600 bg-ink-50 border-b border-ink-200 print:whitespace-normal';
/** 한글은 어절 단위로 줄바꿈하고(keep-all), 긴 영문 토큰만 강제로 끊는다 */
const TD = 'px-2 py-2 text-[12px] leading-relaxed align-top border-b border-ink-100 break-keep [overflow-wrap:anywhere]';

const COL_W = ['w-[104px]', 'w-[26%]', 'w-[88px]', 'w-[26%]', 'w-[24%]'];
/** ActuatorMapSection 의 상세 공급망 그래프 토글과 같은 버튼 */
const TOGGLE_BTN = 'px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors';

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

/** ④ 카드 문장 — "…: 0개사" 의 0개사만 굵게 */
function SalesSentence({ sentence, humanoidSellers }: { sentence: string; humanoidSellers: number }) {
  const m = sentence.match(/^(.*?: )(\d+개사)([\s\S]*)$/);
  if (!m) return <>{sentence}</>;
  return (
    <>
      {m[1]}
      {humanoidSellers === 0 ? <span className="font-bold">{m[2]}</span> : m[2]}
      {m[3]}
    </>
  );
}

function DetailTable({ board, id }: { board: SourcingBoard; id: string }) {
  return (
    <div id={id} className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse">
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
  );
}

export function ActuatorSourcingBoard({ data }: { data: ActuatorMapResponse }) {
  const board = useMemo(() => buildSourcingBoard(data), [data]);
  const bars = useMemo(() => buildSourcingBars(board.tree), [board.tree]);
  // 상세 표 토글 — 기본 접힘(접힌 동안 표를 마운트하지 않음), 상태는 저장하지 않는다
  const [tableOpen, setTableOpen] = useState(false);
  const tableId = useId();

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

      {bars && <ActuatorSourcingBars bars={bars} />}

      {board.salesAnswer && (
        <div className="break-inside-avoid rounded-[10px] border border-ink-200 bg-ink-50 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-900" style={PRINT_EXACT}>
          <span className="font-bold">④ 액추에이터를 남에게 파나?</span> <SalesSentence sentence={board.salesAnswer.sentence} humanoidSellers={board.salesAnswer.humanoidSellers} />
        </div>
      )}

      <div className="no-print flex flex-col gap-3">
        <div>
          <button type="button" aria-expanded={tableOpen} aria-controls={tableId} onClick={() => setTableOpen((v) => !v)} className={TOGGLE_BTN}>
            {tableOpen ? '상세 표 숨기기' : '상세 표 보기'}
          </button>
        </div>
        {tableOpen ? <DetailTable board={board} id={tableId} /> : <div id={tableId} />}
      </div>

      <div className="flex flex-col gap-1 text-[11px] leading-relaxed text-ink-600">
        {board.footnotes.map((f) => (
          <p key={f.id}>{f.text}</p>
        ))}
      </div>
    </SubCard>
  );
}
